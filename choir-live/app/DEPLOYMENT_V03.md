# ChoirLive 0.3 — SFU development preview

This release adds an **optional LiveKit SFU room** alongside the original peer-to-peer room. The SFU forwards individual audio tracks; a browser receiving the tracks produces a local mix. **A central server-side choir master mixer, distributed regional routing, persistent authentication, synchronized performance and unlimited participants are NOT implemented.**

## Local development
1. Install Node 20+ and Docker. In `app`, run `npm install`.
2. Start `docker compose -f docker-compose.sfu.yml up -d --build` (development credentials only).
3. Run `npm run dev`; open `http://localhost:5173` on two browser profiles or computers. For remote devices, serve over HTTPS and set `VITE_TOKEN_URL` to a reachable HTTPS endpoint and `LIVEKIT_PUBLIC_URL` to a reachable WSS endpoint.
4. Join the SFU rehearsal using the same room code from each device. Allow microphone access and wear wired headphones.
5. Use the playback output of a dedicated listening device connected to a USB audio interface and external mixer. This is **not** a centrally generated master mix.

## Security and production work
- The token endpoint is deliberately **unauthenticated** for a local pilot. Do not expose it publicly without identity, choir membership, authorization, rate limiting at gateway, and secure conductor permissions.
- Replace all dev credentials and configure TLS/WSS, a public hostname, appropriate TURN/ICE, firewall rules, backups and monitoring.
- LiveKit UDP port range and host addressing must be configured for the actual deployment. Docker localhost settings are not production settings.
- Load-test room size and music quality, including RTT, packet loss, jitter, jitter-buffer delay, and end-to-end acoustic latency.
- Add a server-side mixing participant/bot and authenticated broadcast output to meet the central-master-mix requirement.
- Test the entire build and multi-device audio path before public launch.
