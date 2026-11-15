import asyncio
import unittest
from supervisor import RoomSupervisor

class FakeProcess:
    def __init__(self):
        self.returncode = None
        self.done = asyncio.Event()
    async def wait(self):
        await self.done.wait()
        return self.returncode
    def terminate(self):
        self.returncode = -15
        self.done.set()
    def kill(self):
        self.terminate()

class SupervisorTests(unittest.IsolatedAsyncioTestCase):
    async def test_start_duplicate_stop(self):
        s = RoomSupervisor(launch=lambda room: asyncio.sleep(0, result=FakeProcess()))
        self.assertTrue(await s.start('choir_001'))
        self.assertFalse(await s.start('choir_001'))
        await asyncio.sleep(.01)
        self.assertTrue(s.status()['choir_001']['running'])
        self.assertTrue(await s.stop('choir_001'))
        self.assertFalse(await s.stop('choir_001'))
    async def test_invalid_room_and_capacity(self):
        s = RoomSupervisor(launch=lambda room: asyncio.sleep(0, result=FakeProcess()))
        with self.assertRaises(ValueError):
            await s.start('../bad')
        old = globals()['MAX_ROOMS'] if 'MAX_ROOMS' in globals() else None
        import supervisor
        before = supervisor.MAX_ROOMS
        supervisor.MAX_ROOMS = 1
        try:
            await s.start('room_a')
            with self.assertRaises(RuntimeError):
                await s.start('room_b')
            await s.stop('room_a')
        finally:
            supervisor.MAX_ROOMS = before

if __name__ == '__main__':
    unittest.main()
