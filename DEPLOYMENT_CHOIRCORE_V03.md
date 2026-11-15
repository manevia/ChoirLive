# ChoirCore v0.3 deployment readiness

ChoirCore is a self-hosted mediasoup SFU. It is **not production-ready** and **does not yet replace the legacy LiveKit recording and mixing pipeline**.

## Deployment boundary

* Frontend: build `choir-live/app` with Node.js 22 (`npm ci && npm run build`), publish the static `dist` directory behind HTTPS.
* Media server: run `choircore/server` on a UDP-capable VPS. Supply a real public `ANNOUNCED_IP`, `PORT`, and unique secrets from a private environment file. Never check these into Git.
* Signaling: reverse-proxy `/socket` or a dedicated signaling hostname to port 8090, with WebSocket upgrade support and HTTPS/WSS. Set `VITE_CHOIRCORE_URL=wss://your-signaling-host` **at frontend build time**.
* Open UDP ports 40000-40100 to the media server in provider and OS firewalls. TCP fallback uses the same range; do not proxy RTP media through a standard HTTP-only proxy.
* For testing across mobile carriers or restrictive networks, add a TURN relay and ICE-compatible configuration. TURN is **not implemented** in this release.
* Coolify can manage the static frontend and media container, but UDP and announced address settings must be verified at the underlying host. Cloudflare HTTP proxy should not be used to proxy raw RTP/UDP media.

## New safeguards in v0.3

The server has configurable MAX_CONNECTIONS (default 100), MAX_MESSAGES_PER_10S (default 80), MAX_PEERS_PER_ROOM (default 32), WebSocket heartbeat, transport/producer/consumer limits. These are initial safeguards, not a substitute for user authentication, per-IP limits, deployment firewalling, or penetration testing.

## Acceptance checklist — must all pass before testers are invited

1. GitHub Actions frontend build and media-server syntax jobs pass.
2. Site is served over HTTPS; signaling over WSS; browser grants mic permission.
3. Real singers on two independent networks can publish, receive, mute and disconnect cleanly while wearing headphones.
4. Browser WebRTC stats show measured jitter, loss and audio latency; record observed values.
5. Conductor cue permissions verified; wrong access codes rejected.
6. Server isolation, secrets, capacity and process restarts are tested.
7. TURN, server-side mixer, and recording migration completed **before** declaring LiveKit-free parity.
8. External USB audio interface and PA routing are verified without feedback.

Do not claim unlimited simultaneous participants or zero network delay. This is a staged migration.
