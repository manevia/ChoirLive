# ChoirLive + ChoirCore

This repository contains **ChoirLive** (the React/Vite rehearsal app) and **ChoirCore** (the independent mediasoup-based audio transport prototype and client SDK).

## Project layout

- `choir-live/app/` — ChoirLive web app and legacy services.
- `choircore/server/` — ChoirCore audio signaling + mediasoup SFU development server.
- `choircore/sdk/` — ChoirCore browser client SDK.
- `README_V02.md` — local testing and internet deployment notes.

## Development status

**Not production ready.** Live multi-device operation, secure token-based identity, TURN handling, server-side ChoirCore mixing and recording, and load testing remain incomplete. Legacy LiveKit configuration remains in the project during migration.

## Local start

Read `README_V02.md`. Use Node.js 22+. Configure independent server secrets via `.env` files based on `.env.example` (never commit actual secrets). Start the ChoirCore server and the ChoirLive frontend separately.

## Security notes

Shared role codes are development-only. Do not launch this on the public internet without per-user auth, rate limiting, transport hardening and network tests. Historical LiveKit example configuration contains development credentials and must not be used in production.
