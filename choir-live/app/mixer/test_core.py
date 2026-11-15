import unittest
import numpy as np
from core import ChoirMixer, SAMPLES

class MixerTests(unittest.TestCase):
    def test_silence(self):
        m = ChoirMixer()
        master, stems = m.mix()
        self.assertEqual(len(master), SAMPLES * 2)
        self.assertTrue(all(b == 0 for b in master))
        self.assertEqual(len(stems), 5)

    def test_sections_and_unregister(self):
        m = ChoirMixer()
        m.register('alice', 'Soprano')
        m.register('bob', 'Bass')
        m.push('alice', np.full(SAMPLES, 2000, dtype=np.int16))
        m.push('bob', np.full(SAMPLES, -1000, dtype=np.int16))
        master, stems = m.mix()
        self.assertTrue(any(stems['Soprano']))
        self.assertTrue(any(stems['Bass']))
        self.assertTrue(any(master))
        m.unregister('alice')
        self.assertNotIn('alice', m.queues)

    def test_bounded_queue(self):
        m = ChoirMixer(queue_frames=2)
        m.register('alice', 'Other')
        for _ in range(10):
            m.push('alice', np.ones(SAMPLES, dtype=np.int16))
        self.assertEqual(len(m.queues['alice']), 2)

if __name__ == '__main__':
    unittest.main()
