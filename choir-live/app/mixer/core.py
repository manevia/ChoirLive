"""Deterministic PCM choir mixer. 48 kHz, mono, 20 ms frames."""
from collections import deque
import numpy as np

RATE = 48000
SAMPLES = 960
SECTIONS = ('Soprano', 'Alto', 'Tenor', 'Bass', 'Other')

class ChoirMixer:
    def __init__(self, queue_frames=3):
        self.queues = {}
        self.sections = {}
        self.gains = {s: 1.0 for s in SECTIONS}
        self.queue_frames = queue_frames

    def register(self, identity, section):
        self.sections[identity] = section if section in SECTIONS else 'Other'
        self.queues[identity] = deque(maxlen=self.queue_frames)

    def unregister(self, identity):
        self.sections.pop(identity, None)
        self.queues.pop(identity, None)

    def push(self, identity, samples):
        if identity not in self.queues:
            return
        a = np.asarray(samples, dtype=np.int16).reshape(-1)
        for offset in range(0, len(a), SAMPLES):
            block = a[offset:offset + SAMPLES]
            if len(block) == SAMPLES:
                self.queues[identity].append(block.copy())

    def mix(self):
        buses = {s: np.zeros(SAMPLES, dtype=np.float32) for s in SECTIONS}
        counts = {s: 0 for s in SECTIONS}
        for identity, q in tuple(self.queues.items()):
            if not q:
                continue
            section = self.sections.get(identity, 'Other')
            buses[section] += q.popleft().astype(np.float32) / 32768.0
            counts[section] += 1
        # Divide by sqrt(n) to retain choir presence without linear clipping.
        for section in SECTIONS:
            if counts[section]:
                buses[section] *= self.gains[section] / np.sqrt(counts[section])
            buses[section] = np.tanh(buses[section])
        master = np.tanh(sum(buses.values()) / max(1, np.sqrt(sum(counts.values()))))
        return self._pcm(master), {s: self._pcm(v) for s, v in buses.items()}

    @staticmethod
    def _pcm(a):
        return np.clip(a * 32767, -32768, 32767).astype(np.int16).tobytes()
