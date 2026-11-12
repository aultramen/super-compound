#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""End-to-end CLI regressions for interface-design search."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SEARCH_SCRIPT = Path(__file__).with_name("search.py")


class InterfaceDesignSearchCliTests(unittest.TestCase):
    def test_rtl_catalog_search_exposes_compatibility_in_json(self):
        for query, domain in (("minimal", "style"), ("SaaS", "product")):
            with self.subTest(domain=domain):
                completed = subprocess.run(
                    [sys.executable, str(SEARCH_SCRIPT), query, "--domain",
                     domain, "--rtl", "all", "--json"],
                    capture_output=True, text=True, encoding="utf-8", check=False,
                )
                self.assertEqual(completed.returncode, 0, completed.stderr)
                result = json.loads(completed.stdout)
                self.assertGreater(result["count"], 0)
                for row in result["results"]:
                    self.assertIn("rtl_level", row)
                    self.assertIn(row["rtl_level"], ("full", "partial", "caveats"))

    def test_rtl_filters_are_honored_before_the_result_limit(self):
        cases = (
            ("minimal", "style", "full"),
            ("dashboard", "style", "partial"),
            ("editorial", "style", "caveats"),
            ("SaaS", "product", "full"),
            ("SaaS", "product", "partial"),
        )
        for query, domain, level in cases:
            with self.subTest(domain=domain, level=level):
                completed = subprocess.run(
                    [sys.executable, str(SEARCH_SCRIPT), query, "--domain", domain,
                     "--rtl", level, "--max-results", "1", "--json"],
                    capture_output=True, text=True, encoding="utf-8", check=False,
                )
                self.assertEqual(completed.returncode, 0, completed.stderr)
                result = json.loads(completed.stdout)
                self.assertEqual(result["count"], 1)
                self.assertEqual(result["results"][0]["rtl_level"], level)

    def test_rtl_all_and_bare_flag_preserve_default_catalog_results(self):
        for query, domain in (("minimal", "style"), ("SaaS", "product")):
            with self.subTest(domain=domain):
                outputs = []
                for options in ([], ["--rtl"], ["--rtl", "all"]):
                    completed = subprocess.run(
                        [sys.executable, str(SEARCH_SCRIPT), query, "--domain",
                         domain, "--json", *options],
                        capture_output=True, text=True, encoding="utf-8", check=False,
                    )
                    self.assertEqual(completed.returncode, 0, completed.stderr)
                    outputs.append(json.loads(completed.stdout))
                self.assertEqual(outputs[0], outputs[1])
                self.assertEqual(outputs[0], outputs[2])

    def test_unsupported_rtl_options_fail_before_persistence(self):
        cases = (
            ([], "--domain style or product"),
            (["--domain", "ux"], "--domain style or product"),
            (["--stack", "react"], "--stack"),
            (["--stack", "react", "--domain", "style"], "--stack"),
            (["--design-system"], "--design-system"),
            (["--design-system", "--persist"], "--design-system"),
        )
        for options, message in cases:
            with self.subTest(options=options), tempfile.TemporaryDirectory() as tmp:
                if "--persist" in options:
                    options = [*options, "--output-dir", tmp]
                completed = subprocess.run(
                    [sys.executable, str(SEARCH_SCRIPT), "dashboard", "--rtl",
                     "all", *options],
                    cwd=tmp, capture_output=True, text=True,
                    encoding="utf-8", check=False,
                )
                self.assertEqual(completed.returncode, 2, completed.stderr)
                self.assertIn(message, completed.stderr)
                self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_retired_style_redirect_is_visible_in_human_output(self):
        completed = subprocess.run(
            [sys.executable, str(SEARCH_SCRIPT), "Conversion-Optimized",
             "--domain", "style"],
            capture_output=True, text=True, encoding="utf-8", check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("--domain landing", completed.stdout)
        self.assertIn("funnel-3-step-conversion", completed.stdout)

    def test_human_catalog_output_includes_rtl_metadata(self):
        completed = subprocess.run(
            [sys.executable, str(SEARCH_SCRIPT), "editorial", "--domain", "style",
             "--rtl", "caveats", "--max-results", "1"],
            capture_output=True, text=True, encoding="utf-8", check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("**rtl_level:** caveats", completed.stdout)

    def test_human_output_preserves_verbatim_style_fields_and_bounds_prose(self):
        command = [sys.executable, str(SEARCH_SCRIPT), "Material 3 Expressive (Mobile)",
                   "--domain", "style", "--max-results", "1"]
        full = subprocess.run(
            [*command, "--json"], capture_output=True, text=True,
            encoding="utf-8", check=False,
        )
        human = subprocess.run(
            command, capture_output=True, text=True, encoding="utf-8", check=False,
        )
        self.assertEqual(full.returncode, 0, full.stderr)
        self.assertEqual(human.returncode, 0, human.stderr)
        row = json.loads(full.stdout)["results"][0]
        for field in ("Implementation Checklist", "Design System Variables"):
            with self.subTest(field=field):
                self.assertGreater(len(row[field]), 300)
                self.assertIn(row[field], human.stdout)
        prose = row["CSS/Technical Keywords"]
        self.assertGreater(len(prose), 300)
        self.assertNotIn(prose, human.stdout)
        self.assertIn(prose[:300], human.stdout)
        self.assertIn("rerun with --json", human.stdout)

    def test_unsupported_design_system_options_fail_before_persistence(self):
        for option in (["--json"], ["--stack", "react"], ["--domain", "ux"]):
            with self.subTest(option=option), tempfile.TemporaryDirectory() as tmp:
                completed = subprocess.run(
                    [sys.executable, str(SEARCH_SCRIPT), "dashboard", "--design-system",
                     "--persist", "--output-dir", tmp, *option],
                    capture_output=True, text=True, encoding="utf-8", check=False,
                )
                self.assertEqual(completed.returncode, 2, completed.stderr)
                self.assertIn("--format markdown", completed.stderr)
                self.assertEqual(list(Path(tmp).iterdir()), [])

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
