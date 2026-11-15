"""ChoirLive server mixer. One process per room. Requires livekit Python RTC SDK.

Publishes a master feed and five section feeds as separate tracks. This worker
must be deployed close to the LiveKit SFU. It is not a global clock synchronizer.
"""
import asyncio
import json
import logging
import os
import time
import numpy as np
from livekit import rtc, api
from core import ChoirMixer, RATE, SAMPLES, SECTIONS
from recording import SessionRecorder

logging.basicConfig(level=logging.INFO)
log = logging.getLogger('choirlive-mixer')
ROOM = os.environ['CHOIR_ROOM']
URL = os.environ.get('LIVEKIT_INTERNAL_URL', 'ws://livekit:7880')
KEY = os.environ['LIVEKIT_API_KEY']
SECRET = os.environ['LIVEKIT_API_SECRET']

async def main():
    room = rtc.Room()
    mixer = ChoirMixer()
    recorder = SessionRecorder(os.environ.get("CHOIR_RECORDINGS_DIR", "/recordings"), ROOM,
        enabled=os.environ.get("CHOIR_RECORDING_ENABLED", "false").lower() == "true",
        max_seconds=int(os.environ.get("CHOIR_RECORDING_MAX_SECONDS", "3600")))
    mixed_frames = 0
    overruns = 0
    tasks = {}
    sources = {}
    token = (api.AccessToken(KEY, SECRET)
             .with_identity('choirlive-mixer-' + ROOM)
             .with_name('ChoirLive Server Mixer')
             .with_metadata(json.dumps({'role': 'mixer', 'section': 'Other'}))
             .with_grants(api.VideoGrants(room_join=True, room=ROOM,
                                          can_publish=True, can_subscribe=True))
             .to_jwt())

    async def consume(track, participant):
        identity = participant.identity
        try:
            stream = rtc.AudioStream(track, sample_rate=RATE, num_channels=1)
            async for event in stream:
                frame = event.frame
                if identity not in mixer.queues:
                    continue
                data = np.frombuffer(frame.data, dtype=np.int16)
                mixer.push(identity, data)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception('Audio stream failed: %s', identity)

    def on_track(track, publication, participant):
        if track.kind != rtc.TrackKind.KIND_AUDIO or participant.identity.startswith('choirlive-mixer-'):
            return
        try:
            metadata = json.loads(participant.metadata or '{}')
        except ValueError:
            metadata = {}
        mixer.register(participant.identity, metadata.get('section', 'Other'))
        previous = tasks.pop(participant.identity, None)
        if previous:
            previous.cancel()
        tasks[participant.identity] = asyncio.create_task(consume(track, participant))
        log.info('Subscribed to %s', participant.identity)

    def on_unsubscribed(track, publication, participant):
        task = tasks.pop(participant.identity, None)
        if task:
            task.cancel()
        mixer.unregister(participant.identity)

    room.on('track_subscribed', on_track)
    room.on('track_unsubscribed', on_unsubscribed)
    room.on('participant_disconnected', lambda p: on_unsubscribed(None, None, p))
    await room.connect(URL, token)

    for label in ('master', *SECTIONS):
        source = rtc.AudioSource(RATE, 1)
        track = rtc.LocalAudioTrack.create_audio_track('choirlive-' + label.lower(), source)
        await room.local_participant.publish_track(track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        sources[label] = source
    log.info('Mixer online for room %s', ROOM)

    try:
        next_tick = time.monotonic()
        while True:
            master, stems = mixer.mix()
            recorder.write(master, stems)
            mixed_frames += 1
            if mixed_frames % 500 == 0:
                log.info("mixer_health room=%s frames=%d participants=%d overruns=%d recording=%s",
                         ROOM, mixed_frames, len(mixer.queues), overruns, recorder.enabled)
            for label, pcm in [('master', master), *stems.items()]:
                frame = rtc.AudioFrame(data=pcm, sample_rate=RATE, num_channels=1, samples_per_channel=SAMPLES)
                await sources[label].capture_frame(frame)
            next_tick += 0.02
            await asyncio.sleep(max(0, next_tick - time.monotonic()))
            if time.monotonic() - next_tick > 0.2:
                overruns += 1
                next_tick = time.monotonic()
    finally:
        recorder.close()
        for task in tasks.values():
            task.cancel()
        await room.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
