import unittest
from metrics import LatencyWindow
class MetricTests(unittest.TestCase):
    def test_window(self):
        w = LatencyWindow(3)
        for n in [10, 20, 30, 40]: w.record(n, 1, 9)
        s = w.snapshot()
        self.assertEqual(s['samples'], 3)
        self.assertEqual(s['rtt_p50_ms'], 30)
        self.assertAlmostEqual(s['packet_loss_fraction'], .1)
if __name__ == '__main__': unittest.main()
