import json
import tempfile
import unittest
import wave
from pathlib import Path
from core import SECTIONS, SAMPLES
from recording import SessionRecorder

class RecordingTests(unittest.TestCase):
    def test_disabled_does_not_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = SessionRecorder(tmp, 'choir', enabled=False)
            self.assertFalse(r.write(b'', {}))
            r.close()
            self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_recording_writes_six_stems_and_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = SessionRecorder(tmp, '../room?', enabled=True, max_seconds=.04)
            silence = bytes(SAMPLES * 2)
            stems = {s: silence for s in SECTIONS}
            self.assertTrue(r.write(silence, stems))
            self.assertTrue(r.write(silence, stems))
            self.assertFalse(r.write(silence, stems))
            folder = r.directory
            r.close()
            with wave.open(str(folder / 'master.wav'), 'rb') as wav:
                self.assertEqual(wav.getnframes(), SAMPLES * 2)
                self.assertEqual(wav.getframerate(), 48000)
            self.assertEqual(len(list(folder.glob('*.wav'))), 6)
            self.assertAlmostEqual(json.loads((folder / 'manifest.json').read_text())['duration_seconds'], .04)

    def test_rejects_invalid_block(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = SessionRecorder(tmp, 'room', enabled=True)
            with self.assertRaises(ValueError):
                r.write(b'wrong', {s: b'' for s in SECTIONS})
            r.close()

if __name__ == '__main__':
    unittest.main()
