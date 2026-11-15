# ChoirLive v0.4 — Output Desk

## New feature
A dedicated receive-only output desk connects to an existing SFU room, subscribes to each published audio track, routes the tracks through SATB section gain buses, a master gain, and a safety compressor, and exposes a stereo stream for monitoring, local recording, and output through a connected USB audio interface. The output desk does not publish microphone audio.

## Run
Follow `DEPLOYMENT_V03.md` to configure the LiveKit server and token service. Start the frontend (`npm install && npm run dev`), join the SFU rehearsal on singer devices, and open the Output Desk section on a separate computer with the same room code. Select the USB audio output device if supported by your browser. Connect the interface's line outputs to the sound console. Keep PA microphones isolated from playback to avoid feedback.

## Security and scale limitations
The existing token service uses development credentials and must be protected with authenticated user and role authorization before exposure to the Internet. The output desk is **client-side** and subscribes to all tracks; it is not a scalable server-side mixer. For large rooms, deploy a trusted server-side audio egress/mixer and enforce access control. TURN, HTTPS, regionally hosted servers, performance tests, and load testing remain required. Internet latency cannot be eliminated. Do not assume unlimited simultaneous singing or low latency on unstable connections.

## Validation checklist
- Two separate browsers join the same SFU room and exchange audio
- Output Desk hears both remote tracks, with independently adjustable section volumes
- Mute a section and verify it disappears from the master output
- Record and replay a WebM master recording
- Route audio through a USB interface and verify PA output at safe gain
- Verify disconnections remove stale tracks
- Measure round-trip latency, one-way audio latency, packet loss, and CPU load on actual target networks
