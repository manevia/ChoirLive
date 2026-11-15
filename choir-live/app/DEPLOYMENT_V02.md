# ChoirLive v0.2 — connectivity and observability increment

## Implemented
- `/healthz` reports active rooms and participants.
- `/ice-config` supplies STUN and optional time-limited TURN REST credentials, signed with HMAC-SHA1 (coturn REST API convention).
- WebSocket heartbeat cleans up dead clients.
- Browser checks ICE configuration before joining; displays whether TURN is configured.
- Browser polls WebRTC stats every four seconds and displays peer RTT and inbound packet loss. **RTT is not end-to-end audio latency**.
- Signaling service Dockerfile and Compose configuration.

## Run
`npm ci && npm run dev:all` (requires Node 22+). Alternatively `docker compose up --build` runs signaling only; frontend is separately built with `npm run build` and served over HTTPS.

## TURN setup
Install coturn on a publicly reachable machine. Set `use-auth-secret`, `static-auth-secret=<strong random secret>`, `realm=<your domain>`, `fingerprint`, `listening-port=3478`, `min-port`/`max-port`, and `external-ip` if behind NAT. Open UDP 3478 and relay UDP port range; add TLS 5349 and valid certificates for restrictive networks. Set `TURN_SECRET` to the same secret and `TURN_URL=turn:turn.example.org:3478,turns:turn.example.org:5349` in the signaling service. Keep the secret on the server only. **Do not deploy a public open relay.** TURN credentials expire after one hour; long sessions need ICE credential refresh/restart handling in a future version.

## Reverse proxy
Serve frontend over HTTPS and proxy WebSocket upgrade traffic to signaling using WSS. Set `VITE_SIGNAL_URL=wss://signal.example.org` at frontend build time. Limit CORS and protect ICE credentials against abuse with rate limits and authenticated room access before public launch.

## Outstanding — NOT implemented
- SFU/MCU or central server-side audio mixing; rooms remain a 12-person WebRTC mesh.
- Authenticated invites, persistent storage, server recording, section stems, true PA master containing every singer.
- Regional edge deployment and latency compensation.
- Tested behavior under packet loss and real-world mobile networks.
- No guarantee of zero delay, unlimited capacity or seamless performance in low coverage.
