# ChoirLive 0.9 — conductor controls and network diagnostics

Added authenticated conductor role and server-enforced data publication rights; broadcast tempo and rehearsal cues over LiveKit reliable data messages; participant displays cues; five-second browser WebRTC statistics sampling.

Configure `CHOIR_CONDUCTOR_PASSPHRASE` in token server environment, distinct from singer and output credentials. In production all three passphrases must be configured. The conductor token permits microphone publishing and data messages. The singer role cannot publish control messages.

Limitations: browser stats are network indicators, not acoustic end-to-end latency; conductor tempo broadcasts are informational and do not guarantee musical synchronization. No recording library, scheduling, global room moderation, or large-scale validation yet.
