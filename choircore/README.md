# ChoirCore v0.1 — Independent media engine scaffold

This is an initial self-hosted **audio-only SFU and browser SDK**, not a validated production replacement for LiveKit. It does not yet contain the master mixer, recording service, TURN service, or a migrated ChoirLive UI.

## Run

Requires Node.js 20+, Linux recommended, a reachable public IP and UDP ports 40000–40100. In `server/`: `npm install`; then `CHOIRCORE_ROOM_SECRET=<strong-random-secret> ANNOUNCED_IP=<server-public-ip> npm start`. In `sdk/`: `npm install`. Use the exported `ChoirCoreClient` from a browser build; `connect({room,name,secret})`, then `publish(audioTrack,section)` and subscribe to `track` events. An HTTPS website must use a secure WSS signaling endpoint. **Do not expose the shared room secret to a public client in production**: this is a development-only handshake. Replace it with short-lived signed, per-user room tokens and enforce roles server-side.

## Migration plan

1. Deploy and validate the engine independently with two browsers on different networks.
2. Add signed join tokens, per-room authorization, TURN, TLS termination, metrics, and rate limits.
3. Replace ChoirLive LiveKit client behind an adapter; keep the legacy implementation until regression tests pass.
4. Connect a dedicated server-side SATB mixer and recording pipeline; do not assume the existing LiveKit Python worker can consume mediasoup streams unchanged.
5. Test 4/20/50+ singers and PA output, then expand capacity based on measured CPU, network and audio quality.

## Limitations

This v0.1 server has one worker, an in-memory room registry, no persistent identity, no multi-node routing, no TURN, no production authentication, no mix-minus, no master mix, no echo control, and no automated integration tests. Unlimited capacity and zero latency are not technically achievable.
