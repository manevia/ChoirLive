# ChoirCore — first live rehearsal deployment (controlled testing)

This is an independent mediasoup-based audio relay and is **not** a zero-latency system. Do not invite public users until a real audio test passes.

## Required services and addresses
- Public site: e.g. `https://choirlive.example.org` (your own domain)
- Signaling: `wss://signal.example.org` via reverse proxy to `127.0.0.1:8090`.
- Real-time media: direct inbound **UDP 40000–40100** (and optionally TCP 40000–40100) to the ChoirCore VPS public address. These are **not HTTP traffic**; do not send them through a normal Cloudflare proxy.
- The media server should run on a host with a publicly reachable IPv4 address and UDP support. A domain name alone or a Coolify dashboard account does not supply a media host.

## 1. Host preparation (Ubuntu 24.04)
Install Docker Engine and the Docker Compose plugin using Docker's official instructions. Confirm the machine owns the IPv4 address you will announce. Allow TCP 22 only for your administration, TCP 80/443 for your TLS proxy, and the media ranges required above. Restrict 8090 to localhost or to the private reverse proxy; do not expose it openly.

## 2. Secrets and environment
Copy `choircore/server/.env.example` to a **private** deployment environment file that is never committed to Git. Set:
```dotenv
ANNOUNCED_IP=<YOUR_PUBLIC_IPV4>
CHOIRCORE_SINGER_CODE=<LONG_RANDOM_SINGER_ACCESS_SECRET>
CHOIRCORE_CONDUCTOR_CODE=<DIFFERENT_LONG_RANDOM_CONDUCTOR_SECRET>
CHOIRCORE_ENGINEER_CODE=<THIRD_DIFFERENT_LONG_RANDOM_ENGINEER_SECRET>
CHOIRCORE_ALLOWED_ORIGINS=https://choirlive.example.org
PORT=8090
MAX_PEERS_PER_ROOM=12
MAX_CONNECTIONS=100
```
Use separate credentials for each role: singer, conductor, and receive-only sound engineer. These are still role-shared passwords and are inadequate for untrusted public users.

## 3. Deploy the server
From the repository root:
```bash
docker compose --env-file /path/to/private.env -f compose.choircore.example.yml up --build -d
docker compose --env-file /path/to/private.env -f compose.choircore.example.yml logs -f choircore
curl -fsS http://127.0.0.1:8090/health
```
`network_mode: host` requires a Linux host. Coolify Docker Compose support and host networking must be validated on your installation; use plain Docker Compose on the host if Coolify cannot support it.

## 4. HTTPS + secure WebSockets
Configure your HTTPS reverse proxy to route `signal.example.org` to `127.0.0.1:8090`, with WebSocket upgrade and certificate renewal. Allow WebSocket Origin only from the production frontend through `CHOIRCORE_ALLOWED_ORIGINS`. Test browser signaling over `wss://`.

The frontend is built from `choir-live/app`:
```bash
cd choir-live/app
npm ci
VITE_CHOIRCORE_URL=wss://signal.example.org npm run build
```
Serve `dist/` as HTTPS static files. These values are examples, not deployed domain names.

## 5. Two-device controlled verification
Use headphones on both devices and different Internet connections.

1. Confirm the public HTTPS site opens on each device.
2. Join the same room as separate singers and reject a wrong passcode.
3. Confirm each microphone publishes; each participant hears the other and can mute and leave.
4. Check browser network measurements and note jitter/loss; capture actual one-way audio delay using a loopback/timestamp test if possible.
5. Join a conductor, verify a conductor cue reaches singers, and verify a singer cannot send conductor-only messages.
6. Restart the server and check safe reconnect/error handling.
7. Connect the **Native ChoirCore Sound Desk** using the engineer access code; verify it receives remote tracks without publishing a microphone. Adjust Soprano/Alto/Tenor/Bass levels and the master level. Connect a dedicated USB output interface and test feedback suppression.
8. Recordings and server-generated master mixes are not yet implemented in ChoirCore.

## Known blockers before public launch
- No independent ChoirCore master-mix or recording pipeline
- No per-user accounts or database-backed authorization; role-specific shared secrets are for controlled testing only
- No TURN relay/fallback validated across mobile networks
- No measured music latency or 50+ singer load test
- Current default room limit 32 is a **configurable cap**, not a performance promise

## Troubleshooting
- `WebSocket failed`: inspect DNS, TLS certificate, reverse proxy upgrade and origin allowlist.
- `Connected but no audio`: check announced public IPv4, both firewalls, UDP media range, browser mic permission, headphones and ICE connection statistics.
- `Room at capacity`: lower participant load or benchmark before raising the configured limit.
- `Cannot hear remote audio`: browser autoplay restrictions may require user interaction to enable playback.
