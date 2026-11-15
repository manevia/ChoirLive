# ChoirLive 0.6 — Server-side audio worker (development preview)

## What changed
A Python LiveKit RTC worker subscribes to each singer, accumulates bounded 20 ms mono PCM blocks, and publishes six audio tracks: a master and five SATB/Other section feeds. The browser Output Desk now defaults to receiving five section feeds, with an explicit individual-track fallback. The server master feed is available to other LiveKit subscribers; the Output Desk intentionally excludes it to avoid double mixing.

## Local setup
1. Install Docker with Compose and Node.js 20+.
2. In `app/`, create `.env` and set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `CHOIR_ROOM_PASSPHRASE`, `CHOIR_OUTPUT_PASSPHRASE`, `ALLOWED_ORIGIN`. Keep the LiveKit key/secret consistent with `livekit.yaml`; the supplied YAML is **development only** and uses placeholder credentials.
3. Set `CHOIR_ROOM=CHOIR-101` or another exact room code.
4. Run `docker compose -f docker-compose.sfu.yml -f docker-compose.mixer.yml up --build`.
5. Run the frontend with `npm install && npm run dev`. Connect a singer through the SFU room and the engineer through Output Desk. Select **Server SATB section feeds**.
6. For Internet deployment, configure valid TLS, public WebSocket URL, TURN/ICE and publicly reachable UDP ports. `localhost` URLs are not usable from remote singers.

## Critical caveats
- No actual multi-device end-to-end live audio test has been performed here. The worker's LiveKit SDK interface must be integration-tested against the installed SDK version; build/launch is not guaranteed.
- This worker supports **one configured room per process**. Multi-room orchestration and automatic worker lifecycle are not yet implemented.
- Bounded buffering does not remove propagation delay, jitter, network loss, or drift. Frames from different remote microphones are **not sample-clock synchronized**. This is a basic choir mixing engine, not a validated synchronous ensemble engine.
- For larger rooms, provision CPU and ingress bandwidth per worker, measure end-to-end latency, and implement admission controls. Capacity is not unlimited.
- The server mixes to mono tracks; the receiving Output Desk routes the section feeds to a browser stereo output. Professional Dante/AVB direct output and server recording are not implemented.
- Publishing both master and section feeds costs extra bandwidth. Singer clients should not monitor the mixer master and their individual peers simultaneously (risk of duplicate audio and feedback).
- Never expose development LiveKit secrets or default access codes to the public.

## Unit checks
`cd mixer && python -m unittest -v test_core.py`

## Next release
Automatic per-room worker management, server master egress/recording, monitoring dashboards, latency benchmarking and real-device field testing.
