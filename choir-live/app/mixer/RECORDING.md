# Server-side recording (v0.8)

Recording is **disabled by default**. Before enabling it, obtain participant consent and publish a recording notice. The worker creates a directory per room/session containing six 48 kHz, 16-bit mono WAV files (master, Soprano, Alto, Tenor, Bass, Other) plus a manifest on graceful shutdown.

Environment variables:

- `CHOIR_RECORDING_ENABLED=true` enables recording.
- `CHOIR_RECORDINGS_DIR=/recordings` specifies a persistent mounted volume.
- `CHOIR_RECORDING_MAX_SECONDS=3600` caps recording duration (roughly 2 GB for six feeds/hour).

Mount `/recordings` as a persistent volume on the mixer worker. Files are not automatically exposed publicly; use a separately authenticated download service with authorization, retention policies, and audit logging before production. Abrupt process termination may leave WAV headers unfinished. This is a bounded development implementation, not yet production archival.

Mixer health is logged every 500 processed blocks (approximately ten seconds) with participant count and scheduling overruns. This is **not** a measurement of end-to-end network latency.

Run: `cd mixer && python -m unittest discover -p 'test_*.py'`.
