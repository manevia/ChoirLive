"""Authenticated local room-worker supervisor; no public Internet exposure.

Starts one audio worker process per room and restarts crashed workers with
bounded exponential backoff. A production deployment should run this under an
orchestrator and replace the local process model for multi-host scaling.
"""
import asyncio
import hmac
import json
import os
import re
import signal
import time
from pathlib import Path

ROOM_RE = re.compile(r'^[A-Za-z0-9_-]{3,64}$')
TOKEN = os.environ.get('SUPERVISOR_TOKEN', '')
HOST = os.environ.get('SUPERVISOR_HOST', '127.0.0.1')
PORT = int(os.environ.get('SUPERVISOR_PORT', '8097'))
MAX_ROOMS = int(os.environ.get('MAX_MIXER_ROOMS', '20'))
WORKER = str(Path(__file__).with_name('worker.py'))

class RoomSupervisor:
    def __init__(self, launch=None):
        self.rooms = {}
        self.launch = launch or self._launch

    async def _launch(self, room):
        return await asyncio.create_subprocess_exec('python', WORKER,
            env={**os.environ, 'CHOIR_ROOM': room},
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL)

    async def start(self, room):
        if not ROOM_RE.fullmatch(room):
            raise ValueError('Invalid room identifier')
        if room in self.rooms:
            return False
        if len(self.rooms) >= MAX_ROOMS:
            raise RuntimeError('Room worker capacity reached')
        state = {'process': None, 'started': time.time(), 'restarts': 0,
                 'stopping': False, 'task': None}
        self.rooms[room] = state
        state['task'] = asyncio.create_task(self._maintain(room, state))
        return True

    async def _maintain(self, room, state):
        try:
            while not state['stopping']:
                try:
                    state['process'] = await self.launch(room)
                    await state['process'].wait()
                except Exception:
                    pass
                if state['stopping']:
                    break
                state['restarts'] += 1
                await asyncio.sleep(min(30, 2 ** min(state['restarts'], 5)))
        except asyncio.CancelledError:
            pass
        finally:
            process = state['process']
            if process and process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()

    async def stop(self, room):
        state = self.rooms.pop(room, None)
        if not state:
            return False
        state['stopping'] = True
        state['task'].cancel()
        try:
            await state['task']
        except asyncio.CancelledError:
            pass
        return True

    def status(self):
        return {name: {'started': s['started'], 'restarts': s['restarts'],
            'running': bool(s['process'] and s['process'].returncode is None)}
            for name, s in self.rooms.items()}

async def handle(reader, writer, supervisor):
    try:
        raw = await asyncio.wait_for(reader.readline(), timeout=5)
        if len(raw) > 4096:
            raise ValueError('Request too large')
        request = json.loads(raw)
        if not TOKEN or not hmac.compare_digest(str(request.get('token', '')), TOKEN):
            response = {'ok': False, 'error': 'Unauthorized'}
        else:
            action, room = request.get('action'), request.get('room', '')
            if action == 'start':
                response = {'ok': True, 'created': await supervisor.start(room)}
            elif action == 'stop':
                response = {'ok': True, 'stopped': await supervisor.stop(room)}
            elif action == 'status':
                response = {'ok': True, 'rooms': supervisor.status()}
            else:
                response = {'ok': False, 'error': 'Unknown action'}
    except (ValueError, RuntimeError, json.JSONDecodeError, asyncio.TimeoutError) as exc:
        response = {'ok': False, 'error': str(exc)}
    except Exception:
        response = {'ok': False, 'error': 'Internal error'}
    writer.write((json.dumps(response) + '\n').encode())
    await writer.drain()
    writer.close()
    await writer.wait_closed()

async def main():
    if len(TOKEN) < 32:
        raise SystemExit('SUPERVISOR_TOKEN must be at least 32 characters')
    supervisor = RoomSupervisor()
    server = await asyncio.start_server(
        lambda r, w: handle(r, w, supervisor), HOST, PORT, limit=4096)
    async with server:
        await server.serve_forever()

if __name__ == '__main__':
    asyncio.run(main())
