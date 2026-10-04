#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Efficiency and failure-mode regressions for design-system generation."""

import unittest
from unittest.mock import patch

from design_system import DesignSystemGenerator, format_master_md, format_page_override_md


class DesignSystemEfficiencyTests(unittest.TestCase):
    def test_master_starts_with_decisions_and_avoids_unselected_stack_boilerplate(self):
        result = format_master_md({"project_name": "Acme", "style": {"name": "Minimalism"},
                                   "typography": {"heading": "Inter", "body": "Inter"}})
        self.assertIn("## Summary", result)
        self.assertLess(result.index("## Summary"), result.index("## Global Rules"))
        self.assertNotIn(".btn-primary", result)
        self.assertIn("project's selected stack", result)

    def test_page_omits_empty_override_sections_and_inherits_master(self):
        overrides = {"page_type": "Dashboard", "layout": {"Grid": "12 columns"}}
        with patch("design_system._generate_intelligent_overrides", return_value=overrides):
            result = format_page_override_md({"project_name": "Acme"}, "dashboard")
        self.assertIn("## Summary", result)
        self.assertIn("12 columns", result)
        self.assertIn("../MASTER.md", result)
        self.assertNotIn("No overrides", result)
        self.assertNotIn("Typography Overrides", result)
        self.assertNotIn("Page-Specific Components", result)

    def test_generation_searches_the_product_catalog_once(self):
        calls = []

        def fake_search(query, domain, max_results):
            calls.append(domain)
            if domain == "product":
                return {
                    "results": [
                        {
                            "Product Type": "General",
                        }
                    ]
                }
            return {"results": []}

        generator = DesignSystemGenerator()
        with patch("design_system.search", side_effect=fake_search):
            generator.generate("customer portal", "Acme")

        self.assertEqual(calls.count("product"), 1)

    def test_malformed_decision_rules_fail_with_category_and_source_context(self):
        def fake_search(query, domain, max_results):
            if domain == "product":
                return {"results": [{"Product Type": "Broken Category"}]}
            return {"results": []}

        generator = DesignSystemGenerator()
        generator.reasoning_data = [
            {
                "UI_Category": "Broken Category",
                "Decision_Rules": '{"must_have": "traceability"',
            }
        ]

        with patch("design_system.search", side_effect=fake_search):
            with self.assertRaisesRegex(
                ValueError,
                r"Decision_Rules.*Broken Category.*ui-reasoning\.csv",
            ):
                generator.generate("regulated portal", "Acme")


if __name__ == "__main__":
    unittest.main()
