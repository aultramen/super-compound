#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Efficiency and failure-mode regressions for design-system generation."""

import json
import unittest
from unittest.mock import patch

from design_system import (DesignSystemGenerator, format_master_md, format_page_override_md,
                           format_ascii_box, format_markdown)


class DesignSystemEfficiencyTests(unittest.TestCase):
    def test_named_product_and_industry_labels_win_over_ui_and_audience_qualifiers(self):
        cases = [
            ("SaaS dashboard for a B2B cloud product", ["B2B Service", "Micro SaaS", "SaaS (General)"], "SaaS (General)"),
            ("accessible healthcare analytics dashboard for patients", ["Analytics Dashboard", "Healthcare App"], "Healthcare App"),
            ("museum bookings analytics dashboard", ["Analytics Dashboard", "Museum/Gallery"], "Museum/Gallery"),
            ("micro SaaS dashboard", ["SaaS (General)", "Micro SaaS"], "Micro SaaS"),
            ("B2B Service", ["SaaS (General)", "B2B Service"], "B2B Service"),
            ("Analytics Dashboard", ["Healthcare App", "Analytics Dashboard"], "Analytics Dashboard"),
            ("analytics dashboard for administrators", ["Analytics Dashboard", "Healthcare App"], "Analytics Dashboard"),
        ]
        generator = DesignSystemGenerator()
        for query, candidates, expected in cases:
            with self.subTest(query=query):
                calls = []

                def fake_search(query, domain, max_results):
                    calls.append(domain)
                    rows = [{"Product Type": name} for name in candidates] if domain == "product" else []
                    return {"results": rows}

                with patch("design_system.search", side_effect=fake_search):
                    result = generator.generate(query, "Acme")

                self.assertEqual(result["category"], expected)
                self.assertEqual(result["source_identities"]["product"], expected)
                self.assertEqual(result["source_identities"]["reasoning"], expected)
                self.assertEqual(calls.count("product"), 1)

    def test_explicit_mode_with_only_incompatible_styles_abstains_before_defaulting(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "Portal", "Style_Priority": "Dark Mode (OLED)", "Decision_Rules": "{}",
        }]

        def fake_search(query, domain, max_results):
            if domain == "product":
                return {"results": [{"Product Type": "Portal"}]}
            if domain == "style":
                return {"results": [{"Style ID": "dark-mode-oled", "Light Mode ✓": "not-recommended"}]}
            return {"results": []}

        with patch("design_system.search", side_effect=fake_search):
            with self.assertRaisesRegex(ValueError, r"light-compatible style.*query"):
                generator.generate("portal light theme", "Acme")

    def test_explicit_light_skips_incompatible_canonical_style_for_supported_alternative(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "Portal", "Style_Priority": "Dark Mode (OLED) + Data-Dense Dashboard",
            "Decision_Rules": "{}",
        }]

        def fake_search(query, domain, max_results):
            if domain == "product":
                return {"results": [{"Product Type": "Portal"}]}
            if domain == "color":
                return {"results": [{"Product Type": "Portal", "Background": "#020617"}]}
            return {"results": []}

        with patch("design_system.search", side_effect=fake_search):
            result = generator.generate("portal light theme", "Acme")

        self.assertEqual(result["style"]["id"], "data-dense-dashboard")
        self.assertEqual(result["style"]["light_mode"], "supported")
        self.assertEqual(result["source_identities"]["style"], "data-dense-dashboard")
        self.assertEqual(result["colors"]["background"], "#F8FAFC")

    def test_dark_request_without_palette_derives_surfaces_without_claiming_a_source(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = []
        with patch("design_system.search", return_value={"results": []}):
            result = generator.generate("portal dark theme", "Acme")

        self.assertEqual(result["color_mode"], "dark")
        self.assertEqual(result["colors"]["background"], "#0F172A")
        self.assertIsNone(result["source_identities"]["color"])
        self.assertEqual(result["source_derivations"]["color_mode"], "derived-dark")

    def test_explicit_light_request_overrides_dark_rule_and_keeps_palette_origin(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "Portal", "Decision_Rules": '{"if_dashboard":["mode:dark"]}',
        }]

        def fake_search(query, domain, max_results):
            if domain == "product":
                return {"results": [{"Product Type": "Portal"}]}
            if domain == "style":
                return {"results": [{"Preferred Mode": "dark", "Light Mode ✓": "supported"}]}
            if domain == "color":
                return {"results": [{"Product Type": "Portal", "Primary": "#123456",
                                     "Background": "#020617", "Ring": "#FFFFFF"}]}
            return {"results": []}

        with patch("design_system.search", side_effect=fake_search):
            for query in ("customer dashboard light theme", "customer dashboard light mode"):
                with self.subTest(query=query):
                    result = generator.generate(query, "Acme")
                    self.assertEqual(result["color_mode"], "light")
                    self.assertEqual(result["colors"]["background"], "#F8FAFC")
                    self.assertEqual(result["colors"]["foreground"], "#0F172A")
                    self.assertEqual(result["colors"]["primary"], "#123456")
                    self.assertEqual(result["colors"]["ring"], "#123456")
                    self.assertEqual(result["source_identities"]["color"], "Portal")
                    self.assertEqual(result["source_derivations"]["color_mode"], "derived-light")

    def test_review_formats_include_active_constraints_and_source_reasoning(self):
        design_system = {"reasoning": "Stable task comparison", "confidence": "0.94",
                         "constraints": ["keyboard-navigation"], "color_mode": "dark"}
        for formatter in (format_ascii_box, format_markdown, format_master_md):
            with self.subTest(formatter=formatter.__name__):
                result = formatter(design_system)
                self.assertIn("Stable task comparison", result)
                self.assertIn("Confidence: 0.94", result)
                self.assertIn("keyboard-navigation", result)
                self.assertIn("Color mode: dark", result)

    def test_rule_pattern_retrieval_uses_named_pattern_instead_of_prompt_ranking(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "Portal", "Recommended_Pattern": "Hero-Centric + Trust",
            "Decision_Rules": "{}",
        }]

        def fake_search(query, domain, max_results):
            if domain == "product":
                return {"results": [{"Product Type": "Portal"}]}
            if domain == "landing":
                if query == "Hero-Centric + Trust":
                    return {"results": [{"Pattern Name": "Hero-Centric + Trust", "Pattern ID": "hero-trust",
                                         "Section Order": "Hero > Trust > CTA"}]}
                return {"results": [{"Pattern Name": "Unrelated slideshow"}]}
            return {"results": []}

        with patch("design_system.search", side_effect=fake_search):
            result = generator.generate("customer portal dashboard", "Acme")

        self.assertEqual(result["pattern"]["name"], "Hero-Centric + Trust")
        self.assertEqual(result["pattern"].get("id"), "hero-trust")
        self.assertEqual(result["pattern"]["sections"], "Hero > Trust > CTA")

    def test_mode_action_keeps_category_palette_identity_when_deriving_dark_surfaces(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "Portal", "Decision_Rules": '{"if_dashboard":["mode:dark"]}',
            "Anti_Patterns": "Dark mode by default + Hidden errors",
        }]

        def fake_search(query, domain, max_results):
            if domain == "product":
                return {"results": [{"Product Type": "Portal"}]}
            if domain == "color":
                return {"results": [
                    {"Product Type": "Unrelated", "Background": "#000000"},
                    {"Product Type": "Portal", "Primary": "#123456", "Background": "#FFFFFF"},
                ]}
            return {"results": []}

        with patch("design_system.search", side_effect=fake_search):
            dark = generator.generate("customer dashboard", "Acme")
            light = generator.generate("customer portal", "Acme")

        self.assertEqual(dark["colors"]["primary"], "#123456")
        self.assertEqual(dark["colors"]["background"], "#0F172A")
        self.assertEqual(dark.get("source_identities", {}).get("color"), "Portal")
        self.assertEqual(dark.get("source_derivations", {}).get("color_mode"), "derived-dark")
        self.assertEqual(dark["anti_patterns"], "Hidden errors")
        self.assertEqual(light["colors"]["background"], "#FFFFFF")
        self.assertIsNone(light["source_derivations"]["color_mode"])
        self.assertIsNone(light.get("source_identities", {}).get("style"))

    def test_unrelated_partial_category_does_not_activate_reasoning(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "Lawn Care", "Decision_Rules": "{}",
            "Reasoning": "Outdoor service scheduling",
        }]

        def fake_search(query, domain, max_results):
            return {"results": [{"Product Type": "Law"}]} if domain == "product" else {"results": []}

        with patch("design_system.search", side_effect=fake_search):
            result = generator.generate("law office", "Acme")

        self.assertEqual(result.get("reasoning"), "")

    def test_canonical_decision_actions_apply_only_matching_query_conditions(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "General", "Style_Priority": "Glassmorphism",
            "Decision_Rules": json.dumps({
                "must_have": ["constraint:keyboard-navigation"],
                "if_mobile": ["style:flat-design", "pattern:Mobile workflow"],
                "if_dashboard": ["mode:dark"],
            }),
        }]
        with patch("design_system.search", return_value={"results": []}):
            result = generator.generate("mobile customer portal", "Acme")
            unrelated = generator.generate("automobile customer portal", "Acme")

        self.assertEqual(result.get("constraints"), ["keyboard-navigation"])
        self.assertEqual(result["style"]["name"], "Flat Design")
        self.assertEqual(result["pattern"]["name"], "Mobile workflow")
        self.assertEqual([rule["condition"] for rule in result.get("activated_rules", [])],
                         ["must_have", "if_mobile"])
        self.assertEqual(result.get("preferred_mode"), None)
        self.assertEqual(unrelated["style"]["name"], "Glassmorphism")
        self.assertNotEqual(unrelated["pattern"]["name"], "Mobile workflow")

    def test_reasoning_style_alias_selects_canonical_family_over_ranked_variant(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "General", "Style_Priority": "Legacy Swiss",
            "Decision_Rules": "{}",
        }]
        canonical = {"Style ID": "swiss", "Style Category": "Swiss", "Status": "active",
                     "Preferred Mode": "light", "rtl_level": "full"}
        candidates = {"results": [{"Style Category": "Platform Variant", "Style ID": "variant"}]}
        with patch("design_system.search", return_value=candidates), patch(
            "design_system.resolve_style", return_value=canonical
        ):
            result = generator.generate("customer portal", "Acme")

        self.assertEqual(result["style"]["name"], "Swiss")
        self.assertEqual(result["style"].get("id"), "swiss")
        self.assertEqual(result["style"].get("preferred_mode"), "light")
        self.assertEqual(result["style"].get("rtl_level"), "full")

    def test_generation_retains_reasoning_and_confidence_in_review_output(self):
        generator = DesignSystemGenerator()
        generator.reasoning_data = [{
            "UI_Category": "General", "Decision_Rules": "{}",
            "Reasoning": "Dense records need stable comparison columns.",
            "Confidence": "0.94",
        }]
        with patch("design_system.search", return_value={"results": []}):
            result = generator.generate("customer portal", "Acme")

        self.assertEqual(result.get("reasoning"), "Dense records need stable comparison columns.")
        self.assertEqual(result.get("confidence"), "0.94")
        master = format_master_md(result)
        self.assertIn("Dense records need stable comparison columns.", master)
        self.assertIn("0.94", master)

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
