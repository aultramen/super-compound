#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""End-to-end CLI regressions for interface-design search."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SEARCH_SCRIPT = Path(__file__).with_name("search.py")


class InterfaceDesignSearchCliTests(unittest.TestCase):
    def test_cli_help_documents_the_project_scoped_persistence_paths(self):
        completed = subprocess.run(
            [sys.executable, str(SEARCH_SCRIPT), "--help"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        compact_help = "".join(completed.stdout.split())
        self.assertIn("design-system/<project-slug>/MASTER.md", compact_help)
        self.assertIn("design-system/<project-slug>/pages/", compact_help)
        self.assertNotIn("design-system/MASTER.md", completed.stdout)

    def test_cli_rejects_result_counts_above_the_prompt_safe_limit(self):
        completed = subprocess.run(
            [
                sys.executable,
                str(SEARCH_SCRIPT),
                "accessibility",
                "--domain",
                "ux",
                "--max-results",
                "21",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("between 1 and 20", completed.stderr)

    def test_persist_prints_a_compact_manifest_not_the_full_design_system(self):
        with tempfile.TemporaryDirectory() as tmp:
            completed = subprocess.run(
                [
                    sys.executable,
                    str(SEARCH_SCRIPT),
                    "SaaS dashboard",
                    "--design-system",
                    "--persist",
                    "--project-name",
                    "Acme CRM",
                    "--output-dir",
                    tmp,
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )

            master = (
                Path(tmp)
                / "design-system"
                / "acme-crm"
                / "MASTER.md"
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertTrue(master.exists())
            self.assertNotIn("RECOMMENDED DESIGN SYSTEM", completed.stdout)
            self.assertLess(len(completed.stdout), 1_000)
            self.assertIn("design-system/acme-crm/MASTER.md", completed.stdout)


if __name__ == "__main__":
    unittest.main()
