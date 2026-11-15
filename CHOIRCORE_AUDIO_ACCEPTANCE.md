# ChoirCore real-time audio acceptance plan

## Automated browser-to-browser RTP test

GitHub Actions job **browser-media** launches the real ChoirCore signaling/media server, a Vite development server, and three isolated headless Chromium tabs. It:

1. Starts a fake microphone in a singer's browser.
2. Publishes its Opus audio through mediasoup WebRTC transports.
3. Joins another singer and a receive-only sound engineer.
4. Verifies each receiver obtains a remote audio track.
5. Checks the remote singer's inbound RTP packet counter is greater than zero.

The development-only page `choir-live/app/media-test.html` is served by Vite during tests. It is **not part of the default production build**. This test is deliberately local loopback: it does **not** establish public WAN connectivity, audio fidelity, TURN fallback, synchronization, or latency.

Run the full job through GitHub Actions. Do not interpret a build passing while browser-media fails as proof that audio works.

## Acceptance on two separate networks

Before introducing live users:
- Confirm the public HTTPS/WSS host and announced public IPv4. Test RTP UDP 40000–40100 through both hosting and OS firewalls.
- Two devices on **different network providers** must publish and receive audio in both directions, using headphones.
- A sound engineer must receive audio but be unable to publish a microphone.
- Record packet loss, jitter, network RTT, actual measured one-way audio delay and browser type. RTT is **not** one-way audio latency.
- Repeat on a mobile network, an unstable network, and a restrictive network. Document failures and whether TURN/TCP fallback is required.
- Test conductor commands, leave/rejoin, and disconnections while recording. Explicitly verify that browser recording files are saved.
- Test SATB levels and master output to a USB audio interface before routing to a PA.
- Do not claim choir-wide time synchronization: humans singing simultaneously over the Internet experience variable network and audio processing delays. The conductor workflow must account for that.

## Remaining production blockers

Per-user authentication, a rigorously tested TURN relay path, measured end-to-end musical latency, robust server-side audio mixing/recording, and production monitoring/alerts remain open. Do not announce public deployment until these are addressed.
