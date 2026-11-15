# ChoirCore v0.2 + ChoirLive integration (development candidate)

Independent mediasoup-based SFU with a reusable SDK and a ChoirLive rehearsal UI. Existing LiveKit routes remain available during migration.

## Start locally

1. Use Node.js 22 or later. In `choircore/server`, run `npm install`, copy `.env.example` to `.env`, replace all codes and set `ANNOUNCED_IP` to a reachable host IP, then `node --env-file=.env index.mjs`.
2. In `choir-live/app`, run `npm install`, set `VITE_CHOIRCORE_URL=ws://localhost:8090` in `.env.local`, and `npm run dev`.
3. Open the app on two separate browser profiles/devices, select the ChoirCore rehearsal section, join the same room using the singer code, allow microphones, and use headphones.

## Internet deployment

Terminate TLS for HTTPS/WSS at a reverse proxy, expose mediasoup UDP/TCP ports 40000–40100, set `ANNOUNCED_IP` to the public routable IP, use a firewall, and do not expose room access codes in the frontend bundle. Set a separate conductor code. A TURN service is still needed for restrictive networks.

## Limits and known gaps

This is a development implementation, not a production security audit. Room access is via shared role codes (not individual identity). There is no centralized mixer or recording integration yet, no rate limits or abuse controls, and no validated multi-device network performance. SFU sends individual streams; client CPU and bandwidth still limit scale. No zero-latency guarantee.
