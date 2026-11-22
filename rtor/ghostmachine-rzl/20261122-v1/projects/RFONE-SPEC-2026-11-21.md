# RFONE — official specification (Rizal's design, recorded 2026-11-21 23:00 MST)

The owner's RFONE design, as he stated it. This supersedes the placeholder
figures the RINTENDO emulator build first imagined for the RFONE
(12 GB / 512 GB) — where they differ, THIS sheet governs.

## The foundation principle
**"RF is the foundation. Everything else is optional."**
Connectivity is built into the device, not rented from a carrier. The
native RF transport is intended to be free — no mandatory monthly
subscription for the native RF network. Range, bandwidth, permitted
frequencies, power limits, infrastructure, and regulatory requirements
still determine what is technically possible.

## Hardware target specification
| Component | Target |
|---|---|
| Device | RFONE |
| Case | Pure Tektite — superhard, unbreakable · extra-thick reinforced space-grade TANK armor casing, green-marbled, with slotted tektite-head corner screws set in angled corner blocks (per the 2026-11-22 prints; supersedes the earlier "magnetic titanium screw" wording) |
| Side buttons | Pure purple gold (owner's design, added 2026-11-21 23:42 MST) |
| OS | R OS |
| Physical RAM | 32 GB target |
| Storage | 1–4 TB |
| Display | 6.3″ OLED, 1080 × 2400 |
| Screen glass | Bulletproof glass · nano-ceramic · titanium laminate — **R NETWORK SHIELD™** (from the owner's print, 2026-11-22) |
| Processor / CPU | RENJIN R1 · multi-core flagship |
| AI | Local AI engine + agent support · dedicated NPU accelerator |
| Radio | Long-range two-way RF / multi-band SDR |
| Security / Encryption | Hardware-backed encryption |
| Interface | RINTENDO |
| Shell | R Shell |
| Browser | ЯBOWZR |
| Runtime | RTOR |

Design aim (owner's words): exceed commercially available phones in
memory capacity, particularly for running AI agents locally without
relying on cloud servers.

## Universal Connectivity Architecture — R NETWORK
**R NETWORK · NATIVE · RF-BASED · FREE ACCESS** — independent
communications foundation.

| Bearer | Status | Role |
|---|---|---|
| RF | **Native network** | Device-to-device, packet messaging, mesh, relay |
| Wi-Fi | Optional | Local networks and internet access |
| Cellular | Optional | Carrier connectivity |
| Satellite | Optional | Remote connectivity |
| Bluetooth | Optional | Nearby devices and peripherals |
| Ethernet | Optional | Wired gateways and infrastructure |

Operating principles:
- RF is always the primary network.
- No mandatory monthly subscription for the native RF network.
- Other connections can be enabled, disabled, prioritized, or bonded as needed.
- If cellular disappears, R NETWORK continues wherever RF coverage and compatible infrastructure permit.
- If internet disappears, local RF messaging, data exchange, and relaying can continue.
- Gateways can bridge R NETWORK to the internet when available.
- RFONE devices communicate device-to-device without conventional cellular service, relay packets through other RFONE devices, and reach internet gateways when one is available. RFONE is a native endpoint of R NETWORK; cellular, Wi-Fi, and satellite are optional gateways — not its foundation.

## Network hierarchy
| Layer | System | Function |
|---|---|---|
| 1 | RF | Physical wireless transmission |
| 2 | R NETWORK | Native network & routing |
| 3 | R PACKET | Data packets, addressing, delivery |
| 4 | R SECURITY | Encryption, authentication, keys |
| 5 | R OS | Device operating system |
| 6 | RINTENDO | User interface & applications |

"The RF signal carries the data. R NETWORK handles the communication.
R OS operates the phone."

## Architecture stack
- **RFONE** — R OS · Native Hardware
- **R NETWORK** — RF-native communications infrastructure: two-way RF · packet transport · mesh · store-and-forward · encrypted data
- **R OS** — System · security · radio drivers · network management · AI agents
- **RINTENDO** — Chat · Web · Apps · Secure · AI · RF controls

"R OS is the foundation. RINTENDO is its interface, R Shell is its command
environment, and RFONE is the physical device."

## Design prints (owner's, received 2026-11-22 00:29 MST)
Archived at `~/workspace/your_files/rfone/prints/`:
1. **RFONE-PRINT-1-CREST.jpg** — the RFONE crest: green mosaic family
   (parents + seven children holding hands) under an apple tree with a
   single fig on the vine, feather panels either side, RFONE lettering.
2. **RFONE-PRINT-2-FRONT-ARMOR.jpg** — armored front: green marbled
   tektite corner blocks, large slotted corner screws with green stone
   heads, glowing solid-purple keys on BOTH rails.
3. **RFONE-PRINT-3-RNETWORK-SHIELD.jpg** — the glass print: "RFONE ·
   R NETWORK — BULLETPROOF GLASS · NANO-CERAMIC · TITANIUM LAMINATE ·
   R NETWORK SHIELD™".
4. **RFONE-PRINT-4-FRAME.jpg** — frame-only study, darker weathered
   titanium-tektite finish.
