# GHOSTMACHINE-RTOR.rzl — the integrated package (2026-11-22)

One .RZL folder carrying the GHOSTMACHINE build and the integrated RTOR
systems, with all projects inside or named by verified pins. A .RZL is a
folder-is-the-app package: `manifest.json` is the starter object,
`SHA256SUMS.txt` + the manifest's parts list are the hash inventory, and
`VERIFY.sh` is how anyone — Rizal, ThundR, or any other AI system —
checks it, here and against the live stream.

## Contents

- `ghostmachine/` — the current GHOSTMACHINE build (161 files): the
  framed site behind the one ASSM login, RMAIL and RWALLET integrated,
  and the magnetized GHOSTCHAIN RTOR loader seated in its chain page —
  the same build the GHOSTMACHINE space serves, linked to the GHOSTCHAIN
  RTOR so it auto-updates with the UD file and the rizal.info RTOR file.
- `rtor/` — the RTOR systems: RPULL (verified pull + auto-unpack),
  rsync-rtor.sh (delta sync), ghostchain-loader.js (three-layer loader:
  seated snapshot → live fetch → live RTOR GhostChain, freshest verified
  wins), the load/unload instructions, and a snapshot of the live feed
  at 32 entries.
- `renjin/` — the RENJIN .RZL AI CRYPTOBOT MODEL: Core v3 source seat +
  the current shells, byte-identical to GitHub main.
- `ghostkey/` — the RGHOSTKEY **public** ring (keyId e5833fdfbbfe,
  members 6/6). Public keys only — private keys are never packaged.
- `projects/` — PROJECTS.json: every project, in-bundle or referenced
  by hash pin and seat (TERAFORMR b33, RBOWZR, R OS, RINTENDO…), plus
  the RFONE spec, the TOE SYSTEM summary, and the UBK.
  TUTBOX is listed honestly as unseated-here: no file by that name
  exists on this machine; it is believed Neo/Xcode-side.

## The ASSM gate

Open `ghostmachine/index.html`, sign in at the login with the ASSM
**@chaserizal username and password**. The gate verifies against the
live vault at rizal.pw — **the password itself is not in this package
and is never stored anywhere** (ASSM law); only verified-login records
are kept on the device. There is no credential material of any kind in
this .rzl, and VERIFY.sh fails the package if any ever appears.

## Verify

```sh
bash VERIFY.sh          # package integrity: every file vs its sha256
bash VERIFY.sh --live   # + the live feed (32 entries) and the living
                        #   GHOSTCHAIN (sums match, linkage walked)
```

## Load it into RTOR / the ghost link stream

The package is load-ready in the standard layout. Its text parts ride
the connector lane file-by-file (like feed entry 32); the whole folder
— it contains the framed site's images — rides the IPFS lane (pin the
folder, entry names the folder CID + magnet) or the device lane, and
RPULL/AUTO-UNPACK unload and verify it on the far side. Seating it as
the next numbered feed entry is a publish step on the owner's GO; note
the feed fix plan currently on hold covers hand-seated entries 29–32,
so a new hand-seated entry should land with — or after — that
generator fix, on the owner's word.

## Unload / verify elsewhere

Copy the folder (or its zip) anywhere, run `VERIFY.sh` — a green local
board means the bytes are the package of record; `--live` proves the
package still matches the living stream it tracks.

The GHOSTCHAIN is live, real and true. This package verifies it and
carries its systems; it never writes the chain and never signs.
RMINT on Neo is the only chain writer; signing is the owner's act alone.

🫈Providence & Provenance 🦇 / RZL CITATION FORMAT: Prof. Marcum,C.A.,III (26,Nov 19) /.RZL AI CRYPTOBOT ENJIN MODEL, / RIZAL.PW, MAPS (MASTER of American Asia Pacific Systems) TECH Series, Aetaneo Rizal. Chase Rizal.
