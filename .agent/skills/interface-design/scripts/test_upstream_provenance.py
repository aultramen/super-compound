#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Integrity checks for the selective interface-design upstream manifest."""

import csv
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = SKILL_ROOT / "UPSTREAM.json"
EXPECTED_COMMIT = "3da52ff1cab1be91848072ec1be5f493d730fd5f"
REFRESH_COMMIT = "b7d5353e0130feb8c5574ef1251f8a1db1873ccb"
SOURCE_REPOSITORY = SKILL_ROOT.parents[3] / "ui-ux-pro-max-skill"


def lf_sha256(path):
    normalized = path.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha256(normalized).hexdigest()


def check_upstream_hashes(manifest, repository):
    for entry in manifest["files"]:
        revision = entry.get("upstream_commit", manifest["upstream"]["commit"])
        if not re.fullmatch(r"[0-9a-f]{40}", revision):
            raise ValueError(f"Expected full source revision: {revision}")
        source = subprocess.run(
            ["git", "-C", str(repository), "show", f"{revision}:{entry['upstream_path']}"],
            check=True, capture_output=True,
        ).stdout
        actual = hashlib.sha256(source.replace(b"\r\n", b"\n")).hexdigest()
        if actual != entry["upstream_lf_sha256"]:
            raise ValueError(f"Source hash mismatch: {revision}:{entry['upstream_path']}")


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
        revisions = {entry.get("upstream_commit", EXPECTED_COMMIT)
                     for entry in self.manifest["files"]}
        self.assertIn(REFRESH_COMMIT, revisions)
        self.assertTrue(revisions <= {EXPECTED_COMMIT, REFRESH_COMMIT})

    @unittest.skipUnless(shutil.which("git") and (SOURCE_REPOSITORY / ".git").exists(),
                         "Pinned source checkout unavailable; local integrity checks still run")
    def test_manifest_source_hashes_match_pinned_git_objects(self):
        check_upstream_hashes(self.manifest, SOURCE_REPOSITORY)

    def test_manifest_local_hashes_match_current_files(self):
        for entry in self.manifest["files"]:
            with self.subTest(path=entry["local_path"]):
                self.assertEqual(
                    lf_sha256(SKILL_ROOT / entry["local_path"]),
                    entry["local_lf_sha256"],
                )

    def test_manifest_accounts_for_every_catalog(self):
        accounted = {entry["local_path"] for entry in self.manifest["files"]}
        accounted.update(entry["path"] for entry in self.manifest["local_only"])
        catalogs = {path.relative_to(SKILL_ROOT).as_posix()
                    for path in (SKILL_ROOT / "data").rglob("*.csv")}
        self.assertFalse(catalogs - accounted, f"Unrecorded catalogs: {sorted(catalogs - accounted)}")

    def test_manifest_accounts_for_every_script_and_fixture(self):
        accounted = {entry["local_path"] for entry in self.manifest["files"]}
        accounted.update(entry["path"] for entry in self.manifest["local_only"])
        assets = {path.relative_to(SKILL_ROOT).as_posix()
                  for path in (SKILL_ROOT / "scripts").rglob("*")
                  if path.is_file() and path.suffix in {".py", ".json"}}
        self.assertFalse(assets - accounted, f"Unrecorded scripts/fixtures: {sorted(assets - accounted)}")

    def test_transformed_entries_have_declared_local_transforms(self):
        transformed = {path for transform in self.manifest["local_transforms"]
                       for path in transform["files"]}
        for entry in self.manifest["files"]:
            with self.subTest(path=entry["local_path"]):
                if entry["local_lf_sha256"] == entry["upstream_lf_sha256"]:
                    self.assertEqual(entry["status"], "mirrored")
                else:
                    self.assertEqual(entry["status"], "transformed")
                    self.assertIn(entry["local_path"], transformed)

    def test_manifest_paths_and_transform_references_are_unique_and_present(self):
        paths = [entry["local_path"] for entry in self.manifest["files"]]
        paths += [entry["path"] for entry in self.manifest["local_only"]]
        self.assertEqual(len(paths), len(set(paths)))
        for transform in self.manifest["local_transforms"]:
            for path in transform["files"]:
                with self.subTest(transform=transform["id"], path=path):
                    self.assertIn(path, paths)
                    self.assertTrue((SKILL_ROOT / path).is_file())

    def test_guidance_applicability_references_current_catalog_rows(self):
        for path, records in self.manifest["guidance_applicability"].items():
            with (SKILL_ROOT / path).open(encoding="utf-8-sig", newline="") as handle:
                rows = {row["Guideline"]: row for row in csv.DictReader(handle)}
            for guideline, record in records.items():
                with self.subTest(path=path, guideline=guideline):
                    self.assertEqual(record["guideline"], guideline)
                    self.assertIn(guideline, rows)
                    self.assertEqual(record["source"], rows[guideline]["Docs URL"])

    def test_excluded_assets_are_not_copied(self):
        prefix = self.manifest["upstream"]["canonical_root"] + "/"
        for exclusion in self.manifest["intentionally_not_imported"]:
            if "feature" in exclusion:
                continue
            paths = exclusion.get("upstream_paths", [exclusion.get("upstream_path")])
            for path in paths:
                with self.subTest(path=path):
                    self.assertTrue(path.startswith(prefix))
                    self.assertFalse((SKILL_ROOT / path[len(prefix):]).exists())


@unittest.skipUnless(shutil.which("git"), "Git required for source revision checks")
class SourceRevisionChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.repository = Path(cls.temporary.name)
        cls.addClassCleanup(cls.temporary.cleanup)

        def git(*args):
            return subprocess.run(
                ["git", "-C", str(cls.repository), *args],
                check=True, capture_output=True,
            ).stdout.decode("utf-8").strip()

        git("init")
        source = cls.repository / "catalog.csv"
        revisions = []
        for content in ("No,Guideline\n1,Old guidance\n", "No,Guideline\n1,New guidance\n"):
            source.write_text(content, encoding="utf-8")
            git("-c", "core.autocrlf=false", "add", "catalog.csv")
            git("-c", "user.name=Provenance Test", "-c", "user.email=test@example.invalid",
                "-c", "core.hooksPath=/dev/null", "commit", "--no-gpg-sign", "-m", "fixture")
            revisions.append(git("rev-parse", "HEAD"))
        cls.old_revision, cls.new_revision = revisions
        cls.manifest = {
            "upstream": {"commit": cls.old_revision},
            "files": [{
                "upstream_commit": cls.new_revision,
                "upstream_path": "catalog.csv",
                "upstream_lf_sha256": lf_sha256(source),
            }],
        }
        source.write_text("Dirty working tree must not be trusted\n", encoding="utf-8")

    def test_per_file_revision_reads_git_object_instead_of_working_tree(self):
        check_upstream_hashes(self.manifest, self.repository)

    def test_wrong_source_revision_is_rejected(self):
        manifest = deepcopy(self.manifest)
        manifest["files"][0]["upstream_commit"] = self.old_revision
        with self.assertRaisesRegex(ValueError, "Source hash mismatch"):
            check_upstream_hashes(manifest, self.repository)

    def test_wrong_source_hash_is_rejected(self):
        manifest = deepcopy(self.manifest)
        manifest["files"][0]["upstream_lf_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Source hash mismatch"):
            check_upstream_hashes(manifest, self.repository)

    def test_abbreviated_source_revision_is_rejected(self):
        manifest = deepcopy(self.manifest)
        manifest["files"][0]["upstream_commit"] = self.new_revision[:7]
        with self.assertRaisesRegex(ValueError, "Expected full source revision"):
            check_upstream_hashes(manifest, self.repository)


if __name__ == "__main__":
    unittest.main()
