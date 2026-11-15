# ChoirLive 1.0 — controlled pilot candidate

## What's new
- Read-only recordings API: authenticated room session listing and WAV/manifest downloads.
- Persistent shared recording volume in the mixer/recording API compose overrides.
- Pilot test checklist, including audio-to-PA and network statistics.

## Launch (requires Docker and a real LiveKit configuration)
1. Set strong LIVEKIT_API_KEY, LIVEKIT_API_SECRET, CHOIR_ROOM_PASSPHRASE, CHOIR_CONDUCTOR_PASSPHRASE, CHOIR_OUTPUT_PASSPHRASE, CHOIR_RECORDINGS_ACCESS_TOKEN.
2. Configure LIVEKIT_PUBLIC_URL and a publicly trusted TLS endpoint, plus TURN connectivity as appropriate.
3. Obtain recording consent. Set CHOIR_RECORDING_ENABLED=true only when authorized.
4. `docker compose -f docker-compose.sfu.yml -f docker-compose.mixer.yml -f docker-compose.recordings.yml up --build`.
5. Do not expose the recordings API directly to the public Internet. Place it behind an authenticated HTTPS reverse proxy. The bearer token grants access to all rooms' recordings: use only with trusted operators until per-room authorization is implemented.
6. The recordings API is intentionally separate from the frontend and has no browser-facing CORS configuration.

## Test plan / acceptance criteria (not yet executed)
- Join with two physical devices on separate networks and verify bidirectional audio.
- Verify master and section stems with real audio and ensure there is no mixer feedback loop.
- Record with explicit consent, stop mixer gracefully, verify WAV duration and download with bearer token.
- Confirm unauthorized download returns 401; malformed names return 404.
- Route output via a USB audio interface into a physical mixer; monitor for acoustic feedback.
- Collect p50/p95 RTT, jitter, packet loss and subjective musical timing ratings on good and weak connections.
- Run a 30-minute rehearsal with 4+ singers; inspect dropouts, CPU, and storage.

## Limitations
- No public deployment or end-to-end real-device tests performed.
- Cross-network zero-latency singing is physically impossible; server mixing cannot eliminate delay.
- No demonstrated large-scale capacity, failover, synchronized performance, or automatic worker startup on room creation.
- Recordings are finalized when the mixer shuts down gracefully. Abrupt termination can leave unfinished files.
- The recordings API uses a single operator bearer token; production requires per-choir authorization, audit logging, and retention controls.
