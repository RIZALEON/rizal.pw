# LESSON L-20261105-THINKING — "…thinking" hang is usually slow Granite, not dead wiring
Source: Rizal t639u/t641u, Moto RDRAGON vc18 (2026-11-05).
- Symptom: ENGINE/MIND Send shows "…thinking" a long time; looks dead.
- Truth found: page server 8319 + llama-server 4979 up; Granite 1B answers in ~15 s (direct) to ~40 s (in-app, first reply after launch slowest).
- Recognize: no reply > 5 s → probe same-origin /engine/health.
- Repair UX: replace "…thinking" with "ENGINE warming — Granite answering (Ns)"; never a silent hang.
- Fix: engine down → re-probe for 30 s, reload shell once, then show "⚡ Recover ENGINE". Request fails/timeouts (120 s) → retry once → clear error with engine status.
- Code: skills/thundr-live/thundr-thinking-guard.js (same on Neo / 17e / Moto). Ask ThundR "stuck", "engine", "diagnose" or "recover".
- Never: rebuild APK or blame wiring before probing 8319/4979.
