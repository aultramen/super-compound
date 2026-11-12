#!/usr/bin/env python3
"""Behavioral coverage for style identities and RTL metadata search."""

import csv
import inspect
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import core


class RtlSearchTests(unittest.TestCase):
    def write_catalog(self, directory, domain, rows):
        # Score floors are calibrated for the shipped corpus, not these tiny fixtures.
        self.enterContext(patch.object(core, "_DOMAIN_SCORE_FLOORS", {}))
        path = Path(directory) / core.CSV_CONFIG[domain]["file"]
        columns = list(dict.fromkeys(key for row in rows for key in row))
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)
        return path

    def test_deprecated_alias_resolves_to_canonical_style(self):
        rows = [
            {"Style ID": "prism", "Style Category": "Prism", "Status": "active",
             "Keywords": "glass", "rtl_level": "full"},
            {"Style ID": "old-prism", "Style Category": "Old Prism",
             "Aliases": "Legacy Prism|Prism Classic", "Status": "deprecated",
             "Parent Style ID": "prism", "Keywords": "legacy prism",
             "rtl_level": "partial"},
        ]
        with tempfile.TemporaryDirectory() as directory:
            self.write_catalog(directory, "style", rows)
            with patch.object(core, "DATA_DIR", Path(directory)):
                result = core.search("Legacy Prism", "style", 1)
        self.assertNotIn("error", result)
        self.assertEqual("Prism", result["results"][0]["Style Category"])

    def test_rtl_filter_does_not_starve_the_result_limit(self):
        self.assertIn("rtl", inspect.signature(core.search).parameters)
        rows = [
            {"Product Type": "Dashboard", "Keywords": "dashboard dashboard dashboard",
             "rtl_level": "partial"},
            {"Product Type": "Compatible Dashboard", "Keywords": "dashboard",
             "rtl_level": "full"},
        ]
        with tempfile.TemporaryDirectory() as directory:
            self.write_catalog(directory, "product", rows)
            with patch.object(core, "DATA_DIR", Path(directory)):
                result = core.search("dashboard", "product", 1, rtl="full")
        self.assertNotIn("error", result)
        self.assertEqual(1, result["count"])
        self.assertEqual("Compatible Dashboard", result["results"][0]["Product Type"])
        self.assertEqual("full", result["results"][0]["rtl_level"])

    def test_rtl_modes_reuse_scores_and_do_not_poison_cached_results(self):
        rows = [
            {"Product Type": "Full Dashboard", "Keywords": "dashboard",
             "rtl_level": "full"},
            {"Product Type": "Partial Dashboard", "Keywords": "dashboard",
             "rtl_level": "partial"},
            {"Product Type": "Caveated Dashboard", "Keywords": "dashboard",
             "rtl_level": "caveats"},
        ]
        with tempfile.TemporaryDirectory() as directory:
            self.write_catalog(directory, "product", rows)
            with patch.object(core, "DATA_DIR", Path(directory)):
                core._cached_index.cache_clear()
                with patch.object(core, "_load_csv", wraps=core._load_csv) as loader:
                    unfiltered = core.search("dashboard", "product", 20)
                    cached_results = []
                    for level in ("full", "partial", "caveats", "all", None, "full"):
                        with self.subTest(level=level):
                            cached = core.search("dashboard", "product", 20, rtl=level)
                            cached_results.append((level, cached))
                            expected = [row for row in unfiltered["results"]
                                        if level in (None, "all") or row["rtl_level"] == level]
                            self.assertEqual(expected, cached["results"])
                    self.assertEqual(1, loader.call_count)
                with patch.object(core, "_SEARCH_CACHE_ENABLED", False):
                    for level, cached in cached_results:
                        self.assertEqual(cached, core.search("dashboard", "product", 20, rtl=level))
                first = core.search("dashboard", "product", 1, rtl="full")
                first["results"][0]["Product Type"] = "caller mutation"
                fresh = core.search("dashboard", "product", 1, rtl="full")
                self.assertEqual("Full Dashboard", fresh["results"][0]["Product Type"])

    def test_rtl_requires_an_explicit_supported_domain_and_level(self):
        for domain in (None, "color", "ux", "chart", "app", "unknown"):
            with self.subTest(domain=domain):
                result = core.search("dashboard", domain, rtl="all")
                self.assertIn("error", result)
                self.assertIn("style or --domain product", result["error"])
        for level in ("", "unsupported", True, 3):
            with self.subTest(level=level):
                result = core.search("dashboard", "style", rtl=level)
                self.assertIn("unsupported rtl level", result["error"])

    def test_rtl_is_metadata_and_catalog_fields_remain_available(self):
        for domain in core.RTL_DOMAINS:
            self.assertIn("rtl_level", core.CSV_CONFIG[domain]["output_cols"])
            self.assertNotIn("rtl_level", core.CSV_CONFIG[domain]["search_cols"])
        self.assertIn("Accessibility Grade", core.CSV_CONFIG["chart"]["output_cols"])
        self.assertIn("Accessibility Risk", core.CSV_CONFIG["chart"]["output_cols"])
        self.assertIn("app", core.CSV_CONFIG)

    def test_explicit_variants_redirects_and_canonical_rows_stay_distinct(self):
        rows = [
            {"Style ID": "prism", "Style Category": "Prism", "Status": "active",
             "Keywords": "dashboard", "rtl_level": "full"},
            {"Style ID": "prism-mobile", "Style Category": "Prism Mobile",
             "Aliases": "Pocket Prism", "Status": "supplemental",
             "Parent Style ID": "prism", "Keywords": "dashboard",
             "rtl_level": "caveats"},
            {"Style ID": "retired", "Style Category": "Retired Layout",
             "Status": "deprecated", "Replacement Domain": "landing",
             "Replacement ID": "conversion", "Keywords": "dashboard",
             "rtl_level": "partial"},
        ]
        with tempfile.TemporaryDirectory() as directory:
            self.write_catalog(directory, "style", rows)
            with patch.object(core, "DATA_DIR", Path(directory)):
                generic = core.search("dashboard", "style", 20)
                self.assertEqual(["prism"], [row["Style ID"] for row in generic["results"]])
                variant = core.search("Pocket Prism", max_results=1)
                self.assertEqual("prism-mobile", variant["results"][0]["Style ID"])
                self.assertEqual("caveats", variant["results"][0]["rtl_level"])
                filtered = core.search("Pocket Prism", "style", rtl="full")
                self.assertTrue(all(row["rtl_level"] == "full" for row in filtered["results"]))
                redirect = core.search("Retired Layout", max_results=1)
                self.assertEqual([], redirect["results"])
                self.assertEqual({"domain": "landing", "id": "conversion"}, redirect["redirect"])
                self.assertEqual({}, core.resolve_style("retired"))
                row = core.resolve_style("prism")
                row["Style Category"] = "caller mutation"
                self.assertEqual("Prism", core.resolve_style("prism")["Style Category"])
                exact = core.search("prism", "style", 1)
                exact["results"][0]["Style Category"] = "caller mutation"
                self.assertEqual("Prism", core.search("prism", "style", 1)["results"][0]["Style Category"])

    def test_alias_cache_invalidates_when_source_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            self.write_catalog(directory, "style", [
                {"Style ID": "prism", "Style Category": "Prism", "Aliases": "Legacy Prism",
                 "Status": "active", "Keywords": "glass", "rtl_level": "full"},
            ])
            with patch.object(core, "DATA_DIR", Path(directory)):
                self.assertEqual("Prism", core.resolve_style("Legacy Prism")["Style Category"])
                self.write_catalog(directory, "style", [
                    {"Style ID": "prism", "Style Category": "Refreshed Prism", "Aliases": "Legacy Prism",
                     "Status": "active", "Keywords": "glass", "rtl_level": "full"},
                ])
                self.assertEqual("Refreshed Prism", core.resolve_style("Legacy Prism")["Style Category"])

    def test_malformed_style_csv_returns_the_existing_error_envelope(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "styles.csv"
            path.write_text("Style ID,Style Category\nprism,Prism,unexpected\n", encoding="utf-8")
            with patch.object(core, "DATA_DIR", Path(directory)):
                result = core.search("prism", "style")
        self.assertIn("Malformed CSV", result["error"])
        self.assertEqual("styles.csv", result["file"])

    def test_catalog_names_aliases_and_ids_have_deterministic_destinations(self):
        with (core.DATA_DIR / "styles.csv").open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        for row in rows:
            identities = [row["Style ID"], row["Style Category"]]
            identities.extend(alias for alias in row["Aliases"].split("|") if alias)
            for identity in identities:
                with self.subTest(identity=identity):
                    result = core.search(identity, max_results=1)
                    self.assertNotIn("error", result)
                    if row["Status"] == "deprecated" and row["Replacement Domain"] == "landing":
                        self.assertEqual([], result["results"])
                        self.assertEqual({"domain": "landing", "id": row["Replacement ID"]}, result["redirect"])
                    else:
                        expected_id = row["Replacement ID"] if row["Status"] == "deprecated" else row["Style ID"]
                        self.assertEqual(expected_id, result["results"][0]["Style ID"])

    def test_calibrated_search_abstains_from_sparse_unrelated_overlap(self):
        query = "sourdough starter feeding schedule at room temperature"
        result = core.search_stack(query, "react", 3)
        self.assertNotIn("error", result)
        self.assertEqual([], result["results"])

    def test_specific_routing_phrases_outrank_generic_product_words(self):
        self.assertEqual("typography", core.detect_domain("font pairing for a SaaS app"))
        self.assertEqual("chart", core.detect_domain("time series forecast"))

    def test_unsupported_icon_library_does_not_return_another_library(self):
        result = core.search("Lucide warning danger icon", "icons", 3)
        self.assertNotIn("error", result)
        self.assertEqual([], result["results"])

    def test_provenance_uses_each_file_revision_before_the_historical_default(self):
        with tempfile.TemporaryDirectory() as directory:
            skill_root = Path(directory)
            data_dir = skill_root / "data"
            data_dir.mkdir()
            self.write_catalog(data_dir, "style", [
                {"Style ID": "prism", "Style Category": "Prism", "Status": "active"},
            ])
            entry = {"local_path": "data/styles.csv", "status": "transformed",
                     "upstream_commit": "file-revision"}
            manifest = {"upstream": {"commit": "historical-default"}, "files": [entry]}
            manifest_path = skill_root / "UPSTREAM.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            with patch.object(core, "DATA_DIR", data_dir), patch.object(core, "__file__", str(skill_root / "scripts/core.py")):
                result = core.search("prism", "style", 1)
                self.assertEqual("file-revision", result["provenance"]["upstream_revision"])
                entry.pop("upstream_commit")
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                fallback = core.search("prism", "style", 1)
                self.assertEqual("historical-default", fallback["provenance"]["upstream_revision"])

    def test_stack_guideline_intent_outranks_incidental_code_mentions(self):
        result = core.search_stack("Uno Platform WinUI XAML API surface", "uno", 1)
        self.assertNotIn("error", result)
        self.assertEqual("Use WinUI XAML API surface", result["results"][0]["Guideline"])

    def test_installation_query_prefers_the_setup_guideline(self):
        result = core.search_stack("install shadcn components with the CLI", "shadcn", 1)
        self.assertEqual("Use CLI for installation", result["results"][0]["Guideline"])

    def test_stack_queries_keep_current_and_requested_legacy_generations_separate(self):
        current = core.search_stack("Svelte 5 $state rune for reactive state", "svelte", 3)
        self.assertEqual("Use $state in Svelte 5", current["results"][0]["Guideline"])
        self.assertTrue(all(row["Status"] == "active" for row in current["results"]))
        legacy = core.search_stack("Svelte 4 writable store", "svelte", 3)
        self.assertGreater(legacy["count"], 0)
        self.assertTrue(all(row["Status"] == "deprecated" for row in legacy["results"]))

    def test_explicit_rtl_all_excludes_missing_and_unknown_metadata(self):
        rows = [
            {"Product Type": "Full Dashboard", "Keywords": "dashboard", "rtl_level": "full"},
            {"Product Type": "Unknown Dashboard", "Keywords": "dashboard", "rtl_level": "unknown"},
            {"Product Type": "Legacy Dashboard", "Keywords": "dashboard"},
        ]
        with tempfile.TemporaryDirectory() as directory:
            self.write_catalog(directory, "product", rows)
            with patch.object(core, "DATA_DIR", Path(directory)):
                self.assertEqual(3, core.search("dashboard", "product", 20)["count"])
                filtered = core.search("dashboard", "product", 20, rtl="all")
                self.assertEqual(["full"], [row["rtl_level"] for row in filtered["results"]])

    def test_optional_style_read_error_does_not_break_an_unrelated_auto_route(self):
        loader = core._load_csv

        def read_csv(filepath):
            if filepath.name == "styles.csv":
                raise PermissionError("style catalog denied")
            return loader(filepath)

        core._cached_index.cache_clear()
        with patch.object(core, "_load_csv", side_effect=read_csv):
            try:
                unrelated = core.search("color palette")
            except PermissionError as exc:
                self.fail(f"Optional style routing must tolerate an unrelated read failure: {exc}")
            self.assertNotIn("error", unrelated)
            self.assertEqual("color", unrelated["domain"])
            related = core.search("minimal style", "style")
            self.assertIn("style catalog denied", related["error"])

    def test_product_titles_keep_requested_booking_intent_above_generic_service_keywords(self):
        result = core.search("salon massage skincare booking and wellness service", "product", 3)
        self.assertEqual("Beauty/Spa/Wellness Service", result["results"][0]["Product Type"])
        self.assertIn("Booking & Appointment App", [row["Product Type"] for row in result["results"]])

    def test_named_motion_libraries_opt_in_without_rerouting_generic_motion(self):
        for query in ("GSAP ScrollTrigger stagger reveal animation", "GSAP scroll animation",
                      "ScrollTrigger viewport animation"):
            with self.subTest(query=query):
                self.assertEqual("gsap", core.search(query)["domain"])
        for query in ("scroll reveal", "scroll reveal animation"):
            with self.subTest(query=query):
                self.assertEqual("ux", core.search(query)["domain"])

    def test_new_legacy_stack_projects_choose_a_successor_while_existing_apps_get_migration(self):
        for query in ("which Windows UI framework should a brand new app choose instead of legacy UWP",
                      "choose a framework for a new application instead of UWP",
                      "choose a framework for a new application for an existing portal instead of UWP"):
            with self.subTest(query=query):
                result = core.search_stack(query, "uwp", 1)
                self.assertEqual("Prefer WinUI 3 for new projects", result["results"][0]["Guideline"])
        for query in ("migrate an existing UWP application to WinUI 3",
                      "migrate an existing UWP app into a new project using WinUI 3"):
            with self.subTest(query=query):
                result = core.search_stack(query, "uwp", 1)
                self.assertEqual("Plan migration to Windows App SDK", result["results"][0]["Guideline"])


if __name__ == "__main__":
    unittest.main()
