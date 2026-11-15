# ChoirLive v0.7: Room lifecycle supervisor and telemetry foundations

This release adds a room-worker supervisor with an authenticated newline-delimited JSON control protocol and a bounded network-metrics accumulator. It is **not** a complete production deployment, a server recording solution, or a proof of large-scale capacity.

## Run locally

Install `mixer/requirements.txt`, set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_INTERNAL_URL`, and a unique random `SUPERVISOR_TOKEN` of at least 32 characters. Run `python mixer/supervisor.py` from the app directory. The control service binds to 127.0.0.1:8097 by default; keep it private. Send one JSON object per line over a local TCP connection:

`{"token":"<your-secret>","action":"start","room":"choir_001"}`

Other actions: `stop` with `room`, and `status`. The supervisor starts one `worker.py` process per room, monitors exit, and restarts with backoff. `MAX_MIXER_ROOMS` bounds the process count. Stop workers before shutting down the service. Room idle detection is **not implemented**; it requires authenticated orchestration events or polling LiveKit room state.

## Test

`cd mixer && python -m unittest discover -p 'test_*.py' -v`

## Important limitations

- The mixer in v0.6 is still subject to packet jitter and inter-singer timing offsets; it does not provide zero-latency singing.
- v0.7 telemetry code is a measurement utility, **not yet connected to browser WebRTC getStats**.
- This supervisor uses local child processes; it does not provision regional nodes or auto-scale across hosts.
- Recording and download, conductor timing dashboard, and 50/100/500-singer load tests remain unimplemented.
- Use private network controls, secret rotation, TLS at any remote control gateway, observability and health probes before production use.
