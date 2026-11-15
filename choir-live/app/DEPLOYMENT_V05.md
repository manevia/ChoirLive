# ChoirLive v0.5 — access-controlled SFU and output desk

## Implemented
- Access-controlled token issuance with separate singer and output-desk passphrases.
- Output-desk tokens are subscribe-only (cannot publish microphone or data).
- Restricted CORS, token TTL, input validation, and per-IP rate limiting.
- Existing browser-side SATB mixer and external output device routing preserved.

## Development setup
1. Set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in the environment; ensure these **match** the values in `livekit.yaml`.
2. Set `CHOIR_ROOM_PASSPHRASE` and `CHOIR_OUTPUT_PASSPHRASE` to distinct long random secrets.
3. Run `docker compose -f docker-compose.sfu.yml up --build` for the SFU and token service.
4. Run `npm install` then `npm run dev` for the frontend.
5. Join the SFU rehearsal with the singer access code; open Output Desk with the separate output access code.

## Security limitations
Passphrases are shared secrets, not per-user authentication. They do not implement conductor permissions or a real account system. Configure HTTPS/WSS and secure TURN for Internet deployment. Docker's local LiveKit settings and sample keys are development-only. The in-memory rate limiter is not suitable for multi-instance deployment.

## Audio limitations / next engineering milestone
**This release does NOT implement server-side mixing or unlimited participants.** LiveKit SFU forwards streams; the Output Desk still decodes and mixes tracks in the browser. A production master mixer requires a dedicated server subscriber, DSP pipeline, and an encoded outbound stream with independently measured latency, CPU, packet loss, and load tests. No zero-delay claims.
