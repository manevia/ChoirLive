# ChoirCore on Coolify — first server readiness

Checked 2026-11-15: the connected Coolify browser at https://coolify.manevia.dev/onboarding showed **"Welcome to Coolify — Connect your first server"**. This does not verify any target server for hosting ChoirCore. Do not claim a deployed rehearsal service until a server is connected and health and real-network audio tests pass.

## Required infrastructure

Choose a Linux VPS with a publicly reachable IPv4, SSH administration, Docker support, and provider firewall access. Begin with approximately **4 vCPU / 8 GB RAM / 80 GB SSD** for controlled small-group testing; this is a planning estimate, **not** benchmarked simultaneous-chorister capacity. Check measured CPU/packet loss before scaling. Ensure the provider permits inbound and outbound UDP media ports.

Coolify's management dashboard is separate from the remote application host. If Coolify is self-hosted, its control plane might run on an existing machine but this does not establish that machine is an appropriate UDP media host.

## One-time Coolify dashboard setup (requires authorized admin access)

1. In the Coolify onboarding, select **Continue** and add a Linux server through its supported SSH configuration. Set up an SSH key and validate server connectivity.
2. Verify the server has a real public IPv4, open firewall controls, Docker, sufficient memory and networking. Do not use a private/LAN-only IP for ANNOUNCED_IP.
3. Use a GitHub resource for `manevia/ChoirLive` and a Docker Compose deployment based on `compose.choircore.example.yml` **only if** your Coolify version supports host networking as required. Otherwise deploy the supplied Compose file directly with Docker on the same VPS.
4. Set the three role access codes and allowlisted frontend origin as private Coolify environment variables; never paste role codes into support tickets or source control.
5. Configure a public HTTPS/WSS signaling hostname routed to port 8090. WebSocket signaling uses HTTPS reverse proxy; RTP traffic uses **direct UDP** and cannot be routed through a conventional Cloudflare HTTP proxy.
6. Allow and test incoming UDP 40000–40100 at both the VPS provider firewall and the OS. Avoid exposing port 8090 directly to the public Internet.
7. Build the frontend with `VITE_CHOIRCORE_URL=wss://<your-signaling-host>` at build time, and publish it over HTTPS.

## Read-only preflight (on a securely configured deployment terminal)

Load your private environment without committing it, then run:
```bash
node scripts/choircore-preflight.mjs
```
The preflight reports whether the environment values appear valid but never prints secrets. A successful result **does not** prove DNS, TLS, UDP firewall reachability, successful ICE, RTP traffic or recording quality.

## Controlled rehearsal acceptance

Test two people using different networks and headphones. Confirm microphone publication, reciprocal reception, engineer dual reception, packet counters growing, actual audible sound, conductor cue, mute/rejoin, and optional USB interface output. Measure perceived and recorded one-way end-to-end delay. Add TURN options only after verifying what restrictive networks prevent and validating the Coturn/media configuration.

The platform remains **development-only** until authentication, TURN/fallback, timing, privacy, and recovery testing is satisfactory.
