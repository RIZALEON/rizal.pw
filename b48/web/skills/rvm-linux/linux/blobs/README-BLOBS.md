# DRAGON SKULL iOS · RVM blobs slot (all-in-one 2026-10-19)

Copied by SCOUT (APFS clone, byte-identical) from the live ЯBOWZR overlay
`EGGS/OVERLAY/rbowzr/ShellResources.20261017-195450-587/skills/rvm-linux/` (rvm-linux 0.1.2):

| file | role |
|---|---|
| `bbl64.bin.js` | RISC-V boot loader |
| `kernel-riscv64.bin.js` | Linux 4.15 kernel |
| `riscvemu64-wasm.wasm.js` | TinyEMU wasm |
| `root-riscv64.cfg.js` | VM config — 128 MB, `console=hvc0 root=/dev/vda`, **no eth device** |
| `root-riscv64__blk.txt.js` | root disk geometry (256 KB × 16) |
| `index.js` | blob index (lists the 16 root blocks) |

**Not here yet — ЯBAT's:** `root-riscv64__blk000000000.bin.js` … `root-riscv64__blk000000015.bin.js`,
the guest root with the Linux ЯSCRIBE spine (`rtoken`, `rcounter`, `rscribe`) and `dgshim-riscv64` (DRAGONGATE RVM adapter v0.1.2, fail closed).
Until they land, boot.html loads and the kernel starts, but the root mount fails. Marker: `ROOT-DISK-PENDING-FROM-RBAT.txt`.

**Never bundled:** `rlab-data.img` (guest `/data` → `/data/rlab/rtoken/`, `/data/rlab/dragongate/`) is created once on the device and
never shipped in the app or any OTA root. Do not put it in this folder.

**Network:** the guest has no network device. Its only way out is the rvmget OSC bridge → `rvm-host.html` → `fetch` wrapped by
DRAGONGATE (`../../dg-web.js`). With online:false (default), kill, or no policy, every off-device URL is denied and logged.

## sealfix-20261019 (SCOUT)
Root blocks now = `STAGING/rtoken-sealfix-20261019/root-implanted-spine-dg-20261019c-sealfix.img` (ЯBAT 20261019b + fixed rtoken/rcounter: unsigned utc_iso, works around the wasm MULH bug). Previous blocks: `DRAGONSKULL/backups/sealfix-20261019/app-blobs-before/`.
