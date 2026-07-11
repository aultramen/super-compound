#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Efficiency and failure-mode regressions for design-system generation."""

import unittest
from unittest.mock import patch

from design_system import DesignSystemGenerator


class DesignSystemEfficiencyTests(unittest.TestCase):
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
