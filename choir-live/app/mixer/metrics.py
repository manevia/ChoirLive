"""Lightweight local audio/network measurement helpers (not a latency guarantee)."""
from collections import deque
import statistics
import time

class LatencyWindow:
    def __init__(self, capacity=300):
        self.values = deque(maxlen=capacity)
        self.dropped = 0
        self.received = 0

    def record(self, rtt_ms=None, packets_lost=0, packets_received=0):
        if rtt_ms is not None and 0 <= rtt_ms < 120000:
            self.values.append(float(rtt_ms))
        self.dropped += max(0, int(packets_lost))
        self.received += max(0, int(packets_received))

    def snapshot(self):
        values = sorted(self.values)
        total = self.dropped + self.received
        return {'timestamp': time.time(), 'samples': len(values),
            'rtt_p50_ms': statistics.median(values) if values else None,
            'rtt_p95_ms': values[min(len(values)-1, int(.95 * (len(values)-1)))] if values else None,
            'packet_loss_fraction': self.dropped / total if total else None}
