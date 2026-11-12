#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for interface-design search retrieval."""

import csv
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import core

from core import search, search_stack
from search import format_output


def catalog_rows(filename):
    with (Path(__file__).resolve().parents[1] / "data" / filename).open(
        encoding="utf-8-sig", newline=""
    ) as handle:
        return list(csv.DictReader(handle))


class InterfaceDesignSearchRegressionTests(unittest.TestCase):
    def test_repeated_search_caches_index_and_source_change_invalidates(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'rules.csv'
            source.write_text('Guideline\nretry timeout\n', encoding='utf-8')
            with patch.object(core, '_SEARCH_CACHE_ENABLED', True, create=True), patch.object(core, '_load_csv', wraps=core._load_csv) as loader:
                first = core._search_csv(source, ['Guideline'], ['Guideline'], 'retry', 3)
                second = core._search_csv(source, ['Guideline'], ['Guideline'], 'retry', 3)
                self.assertEqual(first, second)
                self.assertEqual(loader.call_count, 1)
                first[0]['Guideline'] = 'caller mutation'
                self.assertEqual(second[0]['Guideline'], 'retry timeout')
                source.write_text('Guideline\nretry backoff changed\n', encoding='utf-8')
                changed = core._search_csv(source, ['Guideline'], ['Guideline'], 'retry', 3)
                self.assertEqual(changed[0]['Guideline'], 'retry backoff changed')
                self.assertEqual(loader.call_count, 2)

    def test_version_sensitive_guidance_exposes_applicability_and_source(self):
        source = next(row for row in catalog_rows('stacks/nextjs.csv') if row['No'] == '13')
        result = search_stack('Configure caching explicitly Next.js 16.2', 'nextjs', max_results=1)
        self.assertNotIn('error', result)
        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['Guideline'], source['Guideline'])
        self.assertEqual(result['results'][0]['Applies To'], source['Applies To'])
        self.assertIn('provenance', result)
        self.assertIn('16.2', result['applicability'][0]['version'])
        self.assertEqual(result['applicability'][0]['source'], source['Docs URL'])
        self.assertEqual(result['provenance']['path'], 'data/stacks/nextjs.csv')
        self.assertIn('source_signature', result['provenance'])

    def test_stack_migration_uses_the_destination_generation(self):
        cases = (
            ("migrate from Svelte 4 to current Svelte using runes", "svelte", "active"),
            ("upgrade Svelte 4 to latest Svelte using runes", "svelte", "active"),
            ("upgrade Svelte 3 to latest Svelte 4 writable stores", "svelte", "deprecated"),
            ("upgrade Svelte 3 to latest version 4 writable stores", "svelte", "deprecated"),
            ("upgrade Svelte 3 to current Svelte 5 using runes", "svelte", "active"),
            ("migrate Svelte 4 to latest release using runes", "svelte", "active"),
            ("migrate Svelte 4 to current release using runes", "svelte", "active"),
            ("migrate Svelte 4 to modern Svelte using runes", "svelte", "active"),
            ("upgrade Next.js 15 to current Next.js caching", "nextjs", "active"),
            ("migrate Svelte 3 -> 4 writable stores", "svelte", "deprecated"),
            ("migrate Svelte 4 -> 5 using runes", "svelte", "active"),
            ("migrate Svelte 5 to Svelte 4 writable stores", "svelte", "deprecated"),
            ("downgrade Svelte 5 to Svelte 4 writable stores", "svelte", "deprecated"),
            ("from Svelte 5 to Svelte 4 writable stores", "svelte", "deprecated"),
            ("downgrade Svelte5 to Svelte4 writable stores", "svelte", "deprecated"),
            ("from Svelte5 to Svelte4 writable stores", "svelte", "deprecated"),
            ("maintain Svelte 4 writable stores", "svelte", "deprecated"),
            ("migrate Svelte 4 stores between legacy components", "svelte", "deprecated"),
            ("migrate Svelte 4 to current Vue 3 components", "svelte", "deprecated"),
            ("compare Svelte 5 to Svelte 4 reactive state", "svelte", "active"),
            ("set Svelte 5 state to 0", "svelte", "active"),
            ("downgrade Svelte5 to SvelteKit4 writable stores", "svelte", "active"),
        )
        for query, stack, status in cases:
            with self.subTest(query=query, stack=stack):
                result = search_stack(query, stack, max_results=3)
                self.assertNotIn("error", result)
                self.assertGreater(result["count"], 0)
                self.assertTrue(
                    all(row["Status"] == status for row in result["results"]),
                    f"Expected {status} target guidance; actual="
                    f"{[(row['Status'], row['Guideline']) for row in result['results']]}",
                )

    def test_threejs_migration_uses_release_destination_and_source_order(self):
        cases = (
            ("migrate from Three.js r185 to r150", False),
            ("migrate from Three.js r150 to r185 ESM imports", True),
            ("migrate from Three.js r185 to Three.js 0.150", False),
            ("migrate from Three.js 0.185 to r150", False),
            ("migrate from Three.js r150 to Three.js 0.185 ESM imports", True),
            ("migrate from Three.js 0.150 to r185 ESM imports", True),
            ("migrate Three.js r150 to current release ESM imports", True),
            ("maintain Three.js r150 ESM imports", False),
            ("maintain Three.js r185 ESM imports", True),
        )
        for query, current in cases:
            with self.subTest(query=query):
                result = search_stack(query, "threejs", max_results=3)
                self.assertNotIn("error", result)
                if current:
                    self.assertGreater(result["count"], 0)
                    self.assertTrue(all(row["Status"] == "active" for row in result["results"]))
                else:
                    self.assertEqual(
                        result["count"], 0,
                        "No older Three.js catalog is available; actual="
                        f"{[(row['Status'], row['Guideline']) for row in result['results']]}",
                    )

    def test_swiftui_compact_older_destination_abstains(self):
        result = search_stack("from SwiftUI iOS16 to iOS15 components", "swiftui", max_results=3)
        self.assertNotIn("error", result)
        self.assertEqual(result["count"], 0, "No older iOS catalog is available")

    def assert_top_style(self, query, expected_style):
        result = search(query, domain="style", max_results=1)

        self.assertNotIn("error", result)
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["Style Category"], expected_style)

    def test_ai_query_retrieves_ai_native_ui(self):
        self.assert_top_style("AI", "AI-Native UI")

    def test_ui_query_retrieves_an_active_canonical_style(self):
        result = search("UI", domain="style", max_results=1)

        self.assertNotIn("error", result)
        self.assertEqual(result["count"], 1)
        row = result["results"][0]
        source = next(item for item in catalog_rows("styles.csv") if item["Style ID"] == row["Style ID"])
        self.assertEqual(source["Status"], "active")
        self.assertEqual(row["Style Category"], source["Style Category"])
        searchable = " ".join(source.get(col, "") for col in core.CSV_CONFIG["style"]["search_cols"])
        self.assertRegex(searchable.lower(), r"\bui\b")

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
        self.assert_top_style("minimal ui for saas", "Minimalism & Swiss Style")
        self.assert_top_style("minimal saas", "Minimalism & Swiss Style")

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
        source = next(row for row in catalog_rows("motion.csv") if "magnetic" in row["Keywords"])
        self.assertEqual(snippet, source["GSAP Snippet"])
        self.assertIn(snippet, format_output(result))

    def test_code_fields_longer_than_the_prose_limit_are_not_truncated(self):
        snippet = "gsap.to(el, { x: 100, duration: 0.4 });\n" * 10
        self.assertGreater(len(snippet), 300)
        result = {
            "domain": "gsap", "query": "motion", "file": "motion.csv",
            "count": 1, "results": [{"GSAP Snippet": snippet}],
        }

        self.assertIn(snippet, format_output(result))

    def test_web_and_app_keep_platform_specific_guidance(self):
        cases = (
            ("web", "icon button accessible labels", "Icon Button Labels", "Web", "aria-label"),
            ("app", "accessibility labels for icon-only buttons", "Icon Button Labels",
             "iOS/Android/React Native", "accessibilityLabel"),
            ("app", "virtualized list FlatList", "Virtualize Long Lists",
             "iOS/Android/React Native", "<FlatList"),
        )
        for domain, query, issue, platform, code in cases:
            with self.subTest(domain=domain, query=query):
                result = search(query, domain=domain, max_results=1)
                self.assertNotIn("error", result)
                self.assertEqual(result["file"], f"{domain}-interface.csv")
                self.assertEqual(result["count"], 1)
                self.assertEqual(result["results"][0]["Issue"], issue)
                self.assertEqual(result["results"][0]["Platform"], platform)
                self.assertIn(code, result["results"][0]["Code Example Good"])

    def test_truncated_human_output_points_to_the_full_json_route(self):
        full_value = "x" * 301
        result = {
            "domain": "ux",
            "query": "accessibility",
            "file": "ux-guidelines.csv",
            "count": 1,
            "results": [{"Description": full_value}],
        }

        formatted = format_output(result)

        self.assertNotIn(full_value, formatted)
        self.assertIn("rerun with --json", formatted)

    def test_search_rejects_unbounded_result_counts(self):
        for max_results in (0, -1, 21, 100_000):
            with self.subTest(max_results=max_results):
                result = search("accessibility", "ux", max_results=max_results)

                self.assertIn("error", result)
                self.assertIn("between 1 and 20", result["error"])

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
