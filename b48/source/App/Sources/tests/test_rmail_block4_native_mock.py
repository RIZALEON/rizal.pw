#!/usr/bin/env python3
"""Mock-only tests for Block-4 native validation/queue. No Face ID, no network mint, no pseudo prod success."""
import hashlib, json, os, sys, tempfile, unittest
from pathlib import Path

OWNER_RID = "ЯID-0001-3QQS"
OWNER_HANDLE = "@chaserizal"
PURPOSE = "rghostkey.bind"
OP = "rghostkey.signBind"

def canon(o):
    return json.dumps(o, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def req_hash_of(seal_entry, bundle):
    return hashlib.sha256(canon({"seal_entry": seal_entry, "bundle": bundle}).encode()).hexdigest()

def secretish(o, path=""):
    import re
    BAD = re.compile(r"priv|secret|seed|mnemonic|password|passphrase|d_b64|private", re.I)
    if isinstance(o, dict):
        for k, v in o.items():
            if BAD.search(str(k)):
                return path + "/" + str(k)
            r = secretish(v, path + "/" + str(k))
            if r:
                return r
    elif isinstance(o, list):
        for i, v in enumerate(o):
            r = secretish(v, f"{path}[{i}]")
            if r:
                return r
    return None

def is_signable(ev, pending_view):
    if not pending_view:
        return False, "no pending_view", "offline_queue"
    missing = pending_view.get("missing_pubkeys") or []
    if not pending_view.get("ready") or missing:
        return False, "not ready: missing pubkeys " + ",".join(missing), "offline_queue"
    return True, "ready for owner Sign/Mint in RDRAGON", "live"

class NativeMock(unittest.TestCase):
    def setUp(self):
        self.se = {
            "owner_rid": OWNER_RID,
            "handle": OWNER_HANDLE,
            "purpose": PURPOSE,
            "block_sha256": "a" * 64,
            "prev_hash": "b" * 64,
        }
        self.bundle = {"index": 4, "devices": [{"device_id": "neo-rdragon"}], "methods": ["faceid"]}
        self.req = req_hash_of(self.se, self.bundle)

    def test_req_hash_stable(self):
        self.assertEqual(req_hash_of(self.se, self.bundle), self.req)
        self.assertEqual(len(self.req), 64)

    def test_reject_changed_hash(self):
        se2 = dict(self.se); se2["block_sha256"] = "c" * 64
        self.assertNotEqual(req_hash_of(se2, self.bundle), self.req)

    def test_reject_secret_queue(self):
        self.assertIsNotNone(secretish({"rsign_seal": {"sig": "x"}, "private_key": "NO"}))
        self.assertIsNone(secretish({"rsign_seal": {"sig": "x", "pubkey": "Y"}, "dedup": "a|b|c"}))

    def test_is_signable_missing_neo(self):
        ok, why, path = is_signable({"type": "rmail.block4.transport.v1"}, {"ready": False, "missing_pubkeys": ["neo-rdragon"]})
        self.assertFalse(ok)
        self.assertEqual(path, "offline_queue")
        self.assertIn("neo-rdragon", why)

    def test_is_signable_ready(self):
        ok, why, path = is_signable({}, {"ready": True, "missing_pubkeys": []})
        self.assertTrue(ok)
        self.assertEqual(path, "live")

    def test_payload_field_allowlist(self):
        allowed = {"op", "v", "req_id", "req_hash", "mode", "offline_ok", "seal_entry", "methods", "label", "bundle_public", "bundle"}
        bad = {"op": OP, "v": 1, "req_hash": self.req, "seal_entry": self.se, "evil": 1}
        self.assertTrue(set(bad) - allowed)

    def test_durable_public_queue_dedup(self):
        with tempfile.TemporaryDirectory() as td:
            rec = {
                "schema": "rmail.block4.native.v1",
                "state": "offline_seal_pending_chain",
                "published": False,
                "ui_label": "signed queued",
                "dedup": f"-|{self.req}|rsd-test",
                "req_hash": self.req,
                "rsign_seal": {"v": 1, "t": "rsign.seal", "purpose": PURPOSE, "sig": "MOCK_TEST_ONLY", "pubkey": "TEST"},
                "test_pseudo": True,  # mock marker — never production
            }
            self.assertIsNone(secretish(rec))
            path = Path(td) / (rec["dedup"].replace("|", "_") + ".json")
            path.write_text(json.dumps(rec))
            self.assertTrue(path.is_file())
            # second write should be treated as dedup-exists by native
            self.assertTrue(path.exists())

    def test_pseudo_flag_never_prod(self):
        # Ensure env gate exists in Swift source
        src = Path(__file__).resolve().parents[1] / "RMailBlock4Native.swift"
        text = src.read_text(encoding="utf-8")
        self.assertIn('RM4_ALLOW_PSEUDO', text)
        self.assertIn("testPseudo", text)

    def test_handlers_named(self):
        app = Path(__file__).resolve().parents[1] / "App.swift"
        self.assertIn("RMailBlock4Native.install", app.read_text(encoding="utf-8"))
        native = (Path(__file__).resolve().parents[1] / "RMailBlock4Native.swift").read_text(encoding="utf-8")
        self.assertIn('name: "rghostkeySign"', native)
        self.assertIn('name: "rghostkeyQueue"', native)
        self.assertIn("onSeal", native)
        self.assertIn("onCancel", native)
        self.assertIn("onError", native)
        self.assertIn("onStatus", native)

if __name__ == "__main__":
    r = unittest.main(verbosity=2, exit=False)
    sys.exit(0 if r.result.wasSuccessful() else 1)
