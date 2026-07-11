#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Security regression tests for design system persistence paths."""

import tempfile
import unittest
from pathlib import Path

from design_system import persist_design_system


class DesignSystemPersistenceSecurityTests(unittest.TestCase):
    def minimal_design_system(self, project_name="Acme CRM"):
        return {
            "project_name": project_name,
            "category": "CRM",
            "pattern": {"name": "Dashboard", "sections": "Overview > Details"},
            "style": {"name": "Minimalism"},
            "colors": {"primary": "#2563EB", "accent": "#F97316"},
            "typography": {"heading": "Inter", "body": "Inter"},
        }

    def test_valid_project_and_page_slugs_write_under_design_system(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = persist_design_system(
                self.minimal_design_system(),
                page="Account Dashboard",
                output_dir=tmp,
                page_query="account dashboard",
            )

            base = Path(tmp).resolve()
            expected_master = base / "design-system" / "acme-crm" / "MASTER.md"
            expected_page = base / "design-system" / "acme-crm" / "pages" / "account-dashboard.md"

            self.assertEqual(result["design_system_dir"], str(expected_master.parent))
            self.assertIn(str(expected_master), result["created_files"])
            self.assertIn(str(expected_page), result["created_files"])
            self.assertTrue(expected_master.exists())
            self.assertTrue(expected_page.exists())

    def test_rejects_project_name_path_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                persist_design_system(
                    self.minimal_design_system("..\\outside"),
                    output_dir=tmp,
                )

            self.assertFalse((Path(tmp) / "outside").exists())

    def test_rejects_page_name_path_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                persist_design_system(
                    self.minimal_design_system(),
                    page="../../outside",
                    output_dir=tmp,
                    page_query="dashboard",
                )

            self.assertFalse((Path(tmp) / "outside.md").exists())

    def test_refuses_to_overwrite_without_explicit_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            persist_design_system(self.minimal_design_system(), output_dir=tmp)

            with self.assertRaises(FileExistsError):
                persist_design_system(self.minimal_design_system(), output_dir=tmp)

    def test_persisted_links_resolve_within_the_project_scoped_design_system(self):
        with tempfile.TemporaryDirectory() as tmp:
            persist_design_system(
                self.minimal_design_system(),
                page="Account Dashboard",
                output_dir=tmp,
                page_query="account dashboard",
            )

            project_root = Path(tmp) / "design-system" / "acme-crm"
            master_content = (project_root / "MASTER.md").read_text(encoding="utf-8")
            page_content = (
                project_root / "pages" / "account-dashboard.md"
            ).read_text(encoding="utf-8")

            self.assertIn("`pages/[page-name].md`", master_content)
            self.assertNotIn("`design-system/pages/[page-name].md`", master_content)
            self.assertIn("`../MASTER.md`", page_content)
            self.assertNotIn("`design-system/MASTER.md`", page_content)

    def test_project_config_points_to_the_project_scoped_persistence_paths(self):
        repository_root = Path(__file__).resolve().parents[4]
        project_config = (
            repository_root / ".agent" / "rules" / "project-config.md"
        ).read_text(encoding="utf-8")

        self.assertIn(
            'master_path: "design-system/<project-slug>/MASTER.md"',
            project_config,
        )
        self.assertIn(
            'page_overrides_path: "design-system/<project-slug>/pages/"',
            project_config,
        )


if __name__ == "__main__":
    unittest.main()
