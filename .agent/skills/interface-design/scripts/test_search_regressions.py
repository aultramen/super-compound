#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for interface-design search retrieval."""

import unittest

from core import search, search_stack
from search import format_output


class InterfaceDesignSearchRegressionTests(unittest.TestCase):
    def assert_top_style(self, query, expected_style):
        result = search(query, domain="style", max_results=1)

        self.assertNotIn("error", result)
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["Style Category"], expected_style)

    def test_ai_query_retrieves_ai_native_ui(self):
        self.assert_top_style("AI", "AI-Native UI")

    def test_ui_query_retrieves_voice_first_multimodal(self):
        self.assert_top_style("UI", "Voice-First Multimodal")

    def test_ar_query_retrieves_3d_product_preview(self):
        self.assert_top_style("AR", "3D Product Preview")

    def test_vr_query_retrieves_spatial_ui(self):
        self.assert_top_style("VR", "Spatial UI (VisionOS)")

    def test_3d_query_retrieves_3d_hyperrealism(self):
        self.assert_top_style("3D", "3D & Hyperrealism")

    def test_api_developer_portal_query_retrieves_exact_product(self):
        result = search("API Developer Portal", domain="product", max_results=1)

        self.assertNotIn("error", result)
        self.assertEqual(result["count"], 1)
        self.assertEqual(
            result["results"][0]["Product Type"],
            "API Developer Portal",
        )

    def test_minimal_saas_query_is_not_skewed_by_short_stopwords(self):
        self.assert_top_style("minimal ui for saas", "Minimal & Direct")

    def test_gsap_query_retrieves_scroll_reveal_motion(self):
        result = search("scroll reveal", domain="gsap", max_results=1)

        self.assertNotIn("error", result)
        self.assertEqual(result["file"], "motion.csv")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["Category"], "Scroll Reveal")

    def test_gsap_snippet_is_not_truncated_in_formatted_output(self):
        result = search("magnetic cursor", domain="gsap", max_results=1)

        self.assertNotIn("error", result)
        snippet = result["results"][0]["GSAP Snippet"]
        self.assertGreater(len(snippet), 300)
        self.assertIn(snippet, format_output(result))

    def test_desktop_stacks_retrieve_performance_guidance(self):
        for stack in ("javafx", "wpf", "winui", "avalonia", "uno", "uwp"):
            with self.subTest(stack=stack):
                result = search_stack("performance", stack, max_results=1)

                self.assertNotIn("error", result)
                self.assertEqual(result["file"], f"stacks/{stack}.csv")
                self.assertEqual(result["count"], 1)
                self.assertEqual(result["results"][0]["Category"], "Performance")


if __name__ == "__main__":
    unittest.main()
