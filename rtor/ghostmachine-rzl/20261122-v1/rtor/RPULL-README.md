# RPULL — independent verified pull (RZL SYSTEMS, built 2026-11-21)

One job: get content OUT of IPFS without trusting any single door.
The CID is the trust anchor; doors are interchangeable and every payload is
hash-checked before it is accepted.

## Lanes
- **A · Peer-to-peer.** If a local Kubo daemon is running, pull through the
  swarm itself (`ipfs get`) — verified by the node by construction.
  NOTE: from the Muse VM this lane is PROVEN blocked (daemon bootstrap:
  "no peers found" — the sandbox allows no raw peer connections). On a phone
  or any normal network the same lane is the real independent path.
- **B · Verified gateway race.** Pinata → Filebase → ipfs.io → dweb.link.
  Handles a bare file and the wrapped shape (a folder holding one archive).
  The payload's CID is recomputed locally and its sha256 printed — a door
  serving wrong bytes is caught by the hash, not trusted by reputation.
- **C · Unpack.** A wrapped archive is unpacked on the spot and the tree's
  root CID is computed and reported.

## Usage
    rpull.sh <CID | ipfs://CID | magnet:?xt=urn:ipfs:CID> [outdir]
Needs: bash, curl, unzip, and Kubo at ~/workspace/projects/tools/kubo/ipfs
(KUBO / IPFS_PATH overridable). Kubo is only used offline (hashing) unless a
daemon is already running for Lane A.

## Proof run (2026-11-21 21:44 MST, the UD wrapped pin)
    rpull.sh QmYfsPeLtgTguSVHkHwNVUh7j3y4FUtXGWW2WpRKy2LNh8
    Lane A: no peer path from the VM (expected, see above)
    Lane B: Pinata served the lone archive
      bytes 3,779,490 · sha256 1b30d5ffcb6cc0c016e… (= the verified UD ZIP)
      payload CID QmREKBj2h1QYCm5giRTVigwtqesz2ujpzJaqgjF7ZfUMr8 (= the recorded inner CID)
    Lane C: 129 files unpacked · tree root CID
      QmTKiBqnbB42Ww2s6sNmUTkUp1naW6rX3t28MAxiTLJRso (= the Link Website CID)
Every number reproduced the record exactly, through a door the method does
not have to trust.
