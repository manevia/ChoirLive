# ChoirLive — runnable prototype

## What is implemented
- Existing visual architecture retained; functional rehearsal room added below hero.
- Microphone capture (music-preserving constraints), WebRTC audio mesh, WebSocket signaling.
- Room codes, section selection, participant roster, automatic conductor election, cues, mute, conductor removal.
- Browser-based remote-audio mix and download recording; output via connected audio interface or computer sound card.
- Up to 12 peers per room enforced by server. This is NOT an unlimited-member architecture.

## Run locally
1. Install Node.js 20+.
2. `npm install`
3. `npm run dev:all`
4. Open `http://localhost:5173` in two different browsers/devices. Use headphones to avoid feedback.
5. On remote devices, use HTTPS for the frontend and WSS for signaling. Set `VITE_SIGNAL_URL` before building.

## Network and safety caveats
- This is a pilot, NOT production-ready. No login, persistence, server-side mix, SFU, or TURN infrastructure.
- ICE uses a public STUN server; some networks require a TURN relay to connect. Add authenticated TURN before public deployment.
- Browser audio mixing outputs *remote* voices only; it excludes local microphone to avoid self-monitoring feedback. A central choir mix, including all singers, requires a dedicated mixer/SFU node.
- Recordings are remote audio captured by the local listener; each browser receives a different mix.
- A mixer can receive browser playback via computer/audio-interface outputs; Dante/AVB and multichannel stems are not implemented.
- Client mesh uses O(N²) connections and cannot scale to hundreds/unlimited singers. A regional SFU with bounded server-side mixers is next.
- Internet delay cannot be zero; test actual musical suitability before public promises.

## Suggested next engineering milestones
1. TLS reverse proxy, WSS, TURN with ephemeral credentials, authenticated invitations and room moderation.
2. SFU-based media plane with section stem mixing and server-side stereo master output.
3. Timing measurements (capture-to-playout), network simulation, load tests, regional edge deployment.
4. Section balance, multitrack recording, PA-safe delay and feedback management.
