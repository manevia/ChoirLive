"""Bounded server-side WAV recording of the master mix and SATB stems.

Recording is opt-in via CHOIR_RECORDING_ENABLED; callers must obtain consent.
WAV files are finalized on graceful shutdown, with a duration cap to limit disk use.
"""
import json
import os
from pathlib import Path
import re
import time
import wave
from core import RATE, SECTIONS, SAMPLES

LABELS = ('master', *SECTIONS)

class SessionRecorder:
    def __init__(self, root, room, *, max_seconds=3600, enabled=False):
        self.enabled = bool(enabled)
        self.max_frames = max(1, int(max_seconds * RATE / SAMPLES))
        self.frames = 0
        self.writers = {}
        self.started = None
        self.directory = None
        if not self.enabled:
            return
        safe = re.sub(r'[^a-zA-Z0-9_-]', '_', room)[:80] or 'room'
        session = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + str(os.getpid())
        self.directory = Path(root) / safe / session
        self.directory.mkdir(parents=True, exist_ok=False, mode=0o700)
        for label in LABELS:
            wav = wave.open(str(self.directory / (label.lower() + '.wav')), 'wb')
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            self.writers[label] = wav
        self.started = time.time()

    def write(self, master, stems):
        if not self.enabled or self.frames >= self.max_frames:
            return False
        blocks = {'master': master, **stems}
        for label, writer in self.writers.items():
            pcm = blocks[label]
            if len(pcm) != SAMPLES * 2:
                raise ValueError('Expected 20 ms of mono 16-bit PCM')
            writer.writeframesraw(pcm)
        self.frames += 1
        return True

    def close(self):
        if not self.enabled:
            return
        for writer in self.writers.values():
            writer.close()
        self.writers.clear()
        manifest = {'started_unix': self.started, 'ended_unix': time.time(),
                    'duration_seconds': self.frames * SAMPLES / RATE,
                    'sample_rate': RATE, 'channels': 1, 'format': 'pcm_s16le_wav',
                    'files': [label.lower() + '.wav' for label in LABELS]}
        (self.directory / 'manifest.json').write_text(json.dumps(manifest, indent=2))
