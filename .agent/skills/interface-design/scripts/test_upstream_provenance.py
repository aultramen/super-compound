#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Integrity checks for the selective interface-design upstream manifest."""

import hashlib
import json
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = SKILL_ROOT / "UPSTREAM.json"
EXPECTED_COMMIT = "3da52ff1cab1be91848072ec1be5f493d730fd5f"


def lf_sha256(path):
    normalized = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class UpstreamProvenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    def test_manifest_pins_expected_upstream_commit(self):
        self.assertEqual(
            self.manifest["upstream"]["commit"],
            EXPECTED_COMMIT,
        )
        self.assertEqual(
            self.manifest["upstream"]["canonical_root"],
            "src/ui-ux-pro-max",
        )

    def test_manifest_local_hashes_match_current_files(self):
        for entry in self.manifest["files"]:
            with self.subTest(path=entry["local_path"]):
                self.assertEqual(
                    lf_sha256(SKILL_ROOT / entry["local_path"]),
                    entry["local_lf_sha256"],
                )

    def test_inactive_upstream_datasets_are_not_copied(self):
        self.assertFalse((SKILL_ROOT / "data" / "design.csv").exists())
        self.assertFalse((SKILL_ROOT / "data" / "draft.csv").exists())


if __name__ == "__main__":
    unittest.main()
