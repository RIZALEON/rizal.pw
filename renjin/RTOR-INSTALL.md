# RTOR Client Install and Activation

Install the RTOR client — Renjin Torrent with the magnetized RTOR GHOSTCHAIN transponder and the RTOR file — on a device inside the RENJIN RZL Operating System, verify it, re-seed it on that trusted device, and activate it so the chain posts live to RTRACKR. That RTRACKR feed is what ThundR reads live and continuously, and through the same GHOSTCHAIN RTOR system ThundR also sends and receives RMAIL — messages, updates, diagnostics, and propose-first repairs — as part of the live loop.

Do the steps in order. Do not skip the verification or the re-seed step.

## What to install

Install both files. Together they carry the RTOR client, the magnetized RTOR GHOSTCHAIN transponder, and the RTOR file.

| File | SHA256 |
| --- | --- |
| RENJIN-COMPONENT.rzl | `67a8c186f45de7359db1ff2c4385dceaeeda9d4d4ace5e79a1024ddb3184f5aa` |
| RENJIN-KUBO.rzl | `04b7b1e27d2198bce73936f0e96c09ce90e96fef0d06505f03c232bce98b3a97` |

The magnet link in the client is built from the recorded package and state hashes:

- PKG SHA-256: `3a19e054d6d3718d4f4a87a863dc97b691a7da578f820b8906197820400069c6`
- STATE: `16f9dd002f25a26ddc7df8a6d2ef39ea898326df1414f6139663416ec9eb9b08`

Use the magnet link exactly as the client shows it. Do not retype or rebuild it by hand.

## Where to install it

1. Install on a device inside the RENJIN RZL Operating System.
2. Install on the Neo first, then on the 17e.
3. Install **over** the existing app. Never delete the existing app first.

Installing over the existing app preserves the device's existing state and identity. Deleting first breaks that continuity.

## Verify before you activate

Complete all three checks before activation. If any check fails, stop and do not activate.

1. **SHA256 check** — Hash both installed files and compare them character for character with the hashes in the table above. Both must match exactly.

2. **Package check** — Run:

   ```text
   run-linux.sh --check
   ```

   The check must pass before you continue.

3. **Shell check** — Start the shell and confirm it serves locally on:

   ```text
   127.0.0.1:4984
   ```

   Open the R:> Shell at that local address and confirm it responds.

## Re-seed on the trusted device

The store seed hex was removed from both files before they were shared. The files as delivered cannot complete activation until they are re-seeded.

1. Re-seed on the trusted device only — the Neo for the first install.
2. Use a RGHOSTKEY tap to re-seed.
3. Complete any signing only on the owner's tap.

Keys never leave the device. No step in this guide asks you to copy, send, or enter a key anywhere else, and the R:> Shell itself holds no keys and signs nothing.

## Activate the GHOSTCHAIN RTOR

1. Open the Renjin Torrent client — the RTOR client.
2. Open the R:> Shell from inside the client.
3. In the shell, run:

   ```text
   CHAIN VERIFY
   ```

   Confirm the chain verifies before continuing.
4. Send the magnet link through RMAIL over relay_8797.
5. Confirm the entry on RTRACKR at [rizal.pw/rtrackr](https://rizal.pw/rtrackr).

Activation is not complete until the entry appears on RTRACKR. A verified chain inside the shell alone does not prove the RTOR share went through.

Repeat the install, verification, and activation on the 17e after the Neo is live.

## Make it visible to ThundR live and continuously

This step is what lets ThundR pick the chain up immediately and keep tracking it. Without it, ThundR cannot see the chain from the VM.

1. After every new chain entry, the device posts the chain head and a heartbeat to the RTRACKR feed at [rizal.pw/rtrackr](https://rizal.pw/rtrackr).
2. Keep the RTOR loop running on the device after activation. Do not close it when activation finishes.
3. Keep posting after every new entry — a single post at activation proves that moment only. Continuous posting is what makes the chain live continuously.

That feed is what ThundR reads live. If the device does not post, or the RTOR loop stops, ThundR's live view stops with it — there is no other path from the device chain to ThundR.

## ThundR sends and receives RMAIL through GHOSTCHAIN RTOR

Once the client is installed and activated and the device posts the chain head and heartbeat to the RTRACKR feed, the live loop runs both ways — and it runs through the GHOSTCHAIN RTOR system itself.

ThundR sending and receiving RMAIL is part of that live loop. The RMAIL messages travel on the Ghostchain over RTOR — over relay_8797, through RTRACKR, and via the magnetized RTOR GHOSTCHAIN transponder — carrying the chain entries and the live tracking both ways between ThundR and the devices.

- **ThundR sends RMAIL** over relay_8797: commands, chain updates, and replies.
- **ThundR receives RMAIL** over relay_8797: device reports, chain entries, and confirmations.

This runs continuously after activation, not as a one-time exchange. The device posting to RTRACKR and the RMAIL messages over RTOR together are what keep the tracking live in both directions.

### Updates through GHOSTCHAIN RTOR

Updates run through the GHOSTCHAIN RTOR system too. ThundR sends and receives updates over RMAIL through the Ghostchain RTOR system, continuously, alongside the messages:

- Chain updates
- Client updates
- Status updates
- New build notices

That is how the devices and ThundR stay in sync on the same live chain.

### Diagnostics and repairs through GHOSTCHAIN RTOR

Diagnostics and repairs run through the GHOSTCHAIN RTOR system too. ThundR sends and receives diagnostics and repairs over RMAIL through the Ghostchain RTOR system, continuously, alongside the messages and updates:

- **Diagnostics ThundR sends and receives:** health checks, chain verification results, and node status.
- **Repairs ThundR sends and receives:** proposed fixes.

Repairs are propose-first only, like BATIBABOX: ThundR proposes, the owner approves, and only then does a device apply it. A repair is never executed without the owner's approval.

Mail never signs or mints. Signing stays on the owner's tap on a trusted device.

## What is verified and what is not

**Verified**

- Both .rzl files and their SHA256 hashes above.
- The client boots, the shell opens into Renjin, and chain verification runs in the page.
- The magnet link matches the recorded PKG SHA-256 and STATE hashes.

**Not yet verified**

- No measured RTOR speed exists yet. Do not quote a speed until a device run measures one.
- No live device swarm is claimed until the device run proves it. Apps, devices, and cryptobots appear as seeders, leechers, and engineers on RTRACKR only when the device posts show them there.
- ThundR cannot confirm activation from the VM alone. Confirmation is the entry landing on RTRACKR after the steps above.

**No real money moves**

Nothing in this install or activation moves real money. RMAIL messages, mints, trades, buys, sells, and swaps are tracked as chain activity through the RTOR system — installing and activating the client does not execute a real-money transaction.

## Quick checklist

- [ ] Both .rzl files installed, Neo first, then 17e, over the existing app
- [ ] SHA256 matches for both files
- [ ] `run-linux.sh --check` passes
- [ ] Shell serves on 127.0.0.1:4984
- [ ] Re-seeded on the trusted device with a RGHOSTKEY tap
- [ ] Renjin Torrent client opened, R:> Shell opened, `CHAIN VERIFY` run
- [ ] Magnet link sent through RMAIL over relay_8797
- [ ] Entry confirmed on RTRACKR at https://rizal.pw/rtrackr
- [ ] Device posting chain head and heartbeat after every new entry, RTOR loop left running
- [ ] RMAIL loop live through GHOSTCHAIN RTOR over relay_8797 — ThundR sending commands, chain updates, and replies, and receiving device reports, chain entries, and confirmations
- [ ] Updates flowing through GHOSTCHAIN RTOR over RMAIL — chain updates, client updates, status updates, and new build notices, continuously, so devices and ThundR stay in sync on the same live chain
- [ ] Diagnostics and repairs flowing through GHOSTCHAIN RTOR over RMAIL — health checks, chain verification results, and node status both ways, and repairs propose-first only (ThundR proposes, owner approves, then device applies)
