#!/usr/bin/env python3
"""Evaluate the pinned upstream oracle against local runtime/data semantics.

Source: UI UX Pro Max b7d5353, scripts/evaluate-relevance.py (MIT).
Source web searches app-interface.csv; the local split exposes that data as app.
The unchanged source thresholds are provisional numeric regression floors, not
an approval of this transformed runtime. Local fingerprints are reported apart.
"""

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
runtime_parser = argparse.ArgumentParser(add_help=False)
runtime_parser.add_argument("--runtime-root", type=Path, default=SCRIPT_DIR.parent)
runtime_args, _ = runtime_parser.parse_known_args()
ROOT = runtime_args.runtime_root.resolve()
RUNTIME_DIR = ROOT / "scripts"
FIXTURE_DIR = SCRIPT_DIR / "tests/fixtures"
sys.path.insert(0, str(RUNTIME_DIR))
import core as local_core  # noqa: E402
from core import AVAILABLE_STACKS, DATA_DIR, STACK_CONFIG  # noqa: E402
from design_system import DesignSystemGenerator  # noqa: E402
from relevance_metrics import (REQUIRED_METRICS, check_thresholds, grades_for_results, ndcg_at_k,
                               precision_at_k, reciprocal_rank, validate_fixture,
                               validate_manifest)  # noqa: E402

SOURCE_REVISION = "b7d5353e0130feb8c5574ef1251f8a1db1873ccb"
SOURCE_RUNTIME_FINGERPRINT = "986ebb10ad9b09b905d263811b6693d52449fadd0ef4145bb3848c0916c16a33"
SOURCE_ORACLE_FINGERPRINT = "02e7226428c64a995ec24ae104ce4d186f5f91bf0f062556e90ef9b0fcb6d67a"
SOURCE_FIXTURE_HASHES = {
    "relevance-cases.json": "e77d36eebbf6ddc2860946a02cdb659351da6c09f2688f1ed30939a418099646",
    "relevance-thresholds.json": "331197e8644c751d433183ada0a9979fb2ae251efa0d77000bafdcbddc88d0e7",
    "relevance-baseline.json": "0df200fc54c1cb97a52d6775e7f501509163cea8f8b73fd7268429bc1f835afe",
}
SOURCE_DOMAIN_MAP = {"web": "app"}
SOURCE_DOMAINS = ("style", "color", "chart", "landing", "product", "ux", "typography",
                  "icons", "gsap", "react", "web", "google-fonts")
CSV_CONFIG = {domain: local_core.CSV_CONFIG[SOURCE_DOMAIN_MAP.get(domain, domain)]
              for domain in SOURCE_DOMAINS}


def search(query, domain=None, max_results=3, diagnostics=False):
    effective_domain = SOURCE_DOMAIN_MAP.get(domain, domain)
    result = dict(local_core.search(query, effective_domain, max_results))
    if result.get("error"):
        raise RuntimeError(result["error"])
    actual = result.get("domain")
    result["domain"] = next((source for source, local in SOURCE_DOMAIN_MAP.items()
                             if actual == local), actual)
    result["effectiveLocalDomain"] = actual
    return result


def search_stack(query, stack, max_results=3, diagnostics=False):
    result = local_core.search_stack(query, stack, max_results)
    if result.get("error"):
        raise RuntimeError(result["error"])
    return result


def _palette_is_dark(palette):
    value = (palette.get("Background") or "").strip().lstrip("#")
    if len(value) == 3:
        value = "".join(channel * 2 for channel in value)
    if len(value) != 6:
        return False
    try:
        channels = [int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    except ValueError:
        return False
    linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
              for channel in channels]
    return sum(weight * channel for weight, channel in zip((0.2126, 0.7152, 0.0722), linear)) < 0.18


def load_json(path):
    def reject_constant(value):
        raise ValueError(f"non-RFC JSON numeric constant: {value}")
    try:
        return json.loads(path.read_text(encoding="utf-8"), parse_constant=reject_constant)
    except (json.JSONDecodeError, OSError, ValueError) as error:
        raise SystemExit(f"Invalid JSON file {path}: {error}") from error


def runtime_fingerprint():
    paths = sorted(path for path in RUNTIME_DIR.glob("*.py") if not path.name.startswith("test_"))
    paths += sorted(DATA_DIR.rglob("*.csv"))
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(ROOT).as_posix().encode() + b"\0")
        digest.update(path.read_bytes() + b"\0")
    return digest.hexdigest()


def oracle_fingerprint(cases_path=None):
    """Bind approvals to the judgments and the code that grades them."""
    paths = [
        (Path(__file__), "scripts/evaluate_relevance.py"),
        (SCRIPT_DIR / "relevance_metrics.py", "scripts/relevance_metrics.py"),
        (cases_path or FIXTURE_DIR / "relevance-cases.json", "relevance-cases.json"),
    ]
    digest = hashlib.sha256()
    for path, logical_name in paths:
        digest.update(logical_name.encode() + b"\0")
        digest.update(path.read_bytes() + b"\0")
    return digest.hexdigest()


def validate_identities(fixture):
    errors, cache = [], {}
    for case in fixture["cases"]:
        if not case.get("judgments"):
            continue
        mode = case["mode"]
        domain = (case.get("domain") if mode == "domain" else case.get("expectedRoute"))
        if mode == "stack":
            path = DATA_DIR / STACK_CONFIG[case["stack"]]["file"]
        else:
            path = DATA_DIR / CSV_CONFIG[domain if mode != "design-system" else "product"]["file"]
        if path not in cache:
            with path.open(encoding="utf-8") as handle:
                cache[path] = list(csv.DictReader(handle))
        for judgment in case["judgments"]:
            identity = judgment["identity"]
            matches = [row for row in cache[path]
                       if all(str(row.get(key, "")) == str(value) for key, value in identity.items())]
            if len(matches) != 1:
                errors.append(f"{case['id']}: identity resolves to {len(matches)} rows in {path.name}: {identity}")
    return errors


def _result_identity(result):
    fields = ("Style Category", "Product Type", "Data Type", "Pattern Name",
              "Font Pairing Name", "Family", "Category", "Issue", "Icon Name",
              "Intensity Tier", "Trigger", "Guideline")
    return {field: result[field] for field in fields if result.get(field)}


def _mean(values):
    return sum(values) / len(values) if values else 0.0


def _design_coherence(case, result):
    expected = case.get("coherence", {})
    checks = []
    if expected.get("productCategory"):
        checks.append(result.get("category") == expected["productCategory"])
    if expected.get("styleNames"):
        checks.append(result.get("style", {}).get("name") in expected["styleNames"])
    if expected.get("patternNames"):
        checks.append(result.get("pattern", {}).get("name") in expected["patternNames"])
    if expected.get("colorMode"):
        actual = "dark" if _palette_is_dark(
            {"Background": result.get("colors", {}).get("background", "")}) else "light"
        checks.append(actual == expected["colorMode"])
    if expected.get("colorProductTypes"):
        checks.append(
            result.get("source_identities", {}).get("color")
            in expected["colorProductTypes"]
        )
    return checks


def _stats():
    return {"retrieval": [], "routes": [], "typo": [], "coherence": [],
            "negativePasses": 0, "negativeChecks": 0, "cases": 0}


def _summarize(stats):
    retrieval = stats["retrieval"]
    metrics = {
        "routingAccuracy": _mean(stats["routes"]),
        "precisionAt1": _mean([item["p1"] for item in retrieval]),
        "precisionAt3": _mean([item["p3"] for item in retrieval]),
        "mrrAt3": _mean([item["mrr3"] for item in retrieval]),
        "ndcgAt3": _mean([item["ndcg3"] for item in retrieval]),
        "negativeAbstention": (stats["negativePasses"] / stats["negativeChecks"]
                                if stats["negativeChecks"] else 0.0),
        "typoRecoveryAt3": _mean(stats["typo"]),
        "designSystemCoherence": _mean(stats["coherence"]),
    }
    samples = {"cases": stats["cases"], "retrieval": len(retrieval),
               "routing": len(stats["routes"]), "negativeChecks": stats["negativeChecks"],
               "typo": len(stats["typo"]), "designSystem": len(stats["coherence"])}
    return {"metrics": metrics, "samples": samples}


def evaluate(fixture, oracle=None):
    records, coverage = [], {}
    buckets = {name: _stats() for name in ("all", "calibration", "held_out")}
    applicability = fixture.get("globalNegativeApplicability")
    global_negatives = applicability == "all-domains-and-stacks" or isinstance(applicability, dict)
    for case in fixture["cases"]:
        targets = (buckets["all"], buckets[case["split"]])
        for stats in targets:
            stats["cases"] += 1
        mode, query = case["mode"], case["query"]
        judgments, tags = case.get("judgments", []), case.get("tags", [])
        if "hard-negative" in tags and global_negatives:
            labels = [f"domain:{domain}" for domain in CSV_CONFIG]
            labels += [f"stack:{stack}" for stack in AVAILABLE_STACKS]
            outputs = [search(query, domain, 3) for domain in CSV_CONFIG]
            outputs += [search_stack(query, stack, 3) for stack in AVAILABLE_STACKS]
            counts = [output.get("count", 0) for output in outputs]
            for stats in targets:
                stats["negativeChecks"] += len(counts)
                stats["negativePasses"] += sum(count == 0 for count in counts)
            records.append({"id": case["id"], "negativeChecks": len(counts),
                            "falsePositives": sum(count > 0 for count in counts),
                            "domainTargets": [{"sourceDomain": domain,
                                               "effectiveLocalDomain": SOURCE_DOMAIN_MAP.get(domain, domain)}
                                              for domain in CSV_CONFIG],
                            "falsePositiveTargets": [label for label, count in zip(labels, counts) if count]})
            continue
        if mode == "design-system":
            result = DesignSystemGenerator().generate(query)
            checks = _design_coherence(case, result)
            for stats in targets:
                stats["coherence"].append(_mean(checks))
            records.append({"id": case["id"], "coherence": checks,
                            "actual": {"category": result.get("category"),
                                       "style": result.get("style", {}).get("name"),
                                       "pattern": result.get("pattern", {}).get("name")}})
            continue
        if mode == "stack":
            output = search_stack(query, case["stack"], 3, diagnostics=True)
            coverage[f"stack:{case['stack']}"] = coverage.get(f"stack:{case['stack']}", 0) + 1
        else:
            output = search(query, None if mode == "auto" else case["domain"], 3,
                            diagnostics=True)
            if mode == "domain":
                coverage[f"domain:{case['domain']}"] = coverage.get(f"domain:{case['domain']}", 0) + 1
        if case.get("expectedRoute"):
            actual_route = output.get("domain")
            for stats in targets:
                stats["routes"].append(actual_route == case["expectedRoute"])
        grades = grades_for_results(output.get("results", []), judgments)
        if judgments:
            ideal = [item["grade"] for item in judgments]
            scores = {"p1": precision_at_k(grades, 1), "p3": precision_at_k(grades, 3),
                      "mrr3": reciprocal_rank(grades), "ndcg3": ndcg_at_k(grades, ideal)}
            for stats in targets:
                stats["retrieval"].append(scores)
            if "typo" in tags:
                for stats in targets:
                    stats["typo"].append(any(grade > 0 for grade in grades[:3]))
        records.append({"id": case["id"], "route": output.get("domain"),
                        "expectedRoute": case.get("expectedRoute"), "grades": grades,
                        "sourceDomain": case.get("domain", case.get("expectedRoute")),
                        "effectiveLocalDomain": output.get("effectiveLocalDomain", output.get("domain")),
                        "scores": scores if judgments else {},
                        "diagnostics": output.get("diagnostics", {}),
                        "actual": [_result_identity(item) for item in output.get("results", [])]})
    summary = _summarize(buckets["all"])
    samples = summary["samples"]
    samples.update(coverage)
    splits = {name: _summarize(buckets[name]) for name in ("calibration", "held_out")}
    return {"schemaVersion": 1, "sourceRevision": SOURCE_REVISION,
            "sourceThresholdRuntimeFingerprint": SOURCE_RUNTIME_FINGERPRINT,
            "sourceThresholdOracleFingerprint": SOURCE_ORACLE_FINGERPRINT,
            "domainMapping": SOURCE_DOMAIN_MAP,
            "scope": "Original 90-case source oracle, 12 source domains and 22 stacks; local web/app hard negatives are supplemental.",
            "runtimeFingerprint": runtime_fingerprint(),
            "oracleFingerprint": oracle or oracle_fingerprint(),
            "metrics": summary["metrics"], "samples": samples,
            "splits": splits, "cases": records}


def supplemental_local_checks(fixture):
    records = []
    for case in fixture["cases"]:
        if "hard-negative" in case.get("tags", []):
            for domain in ("web", "app"):
                output = local_core.search(case["query"], domain, 3)
                records.append({"id": case["id"], "localDomain": domain,
                                "count": output.get("count", 0), "error": output.get("error")})
    return {"scope": "Local web and app hard negatives only; no invented positive judgments.",
            "checks": len(records), "passes": sum(not row["count"] and not row["error"] for row in records),
            "cases": records}


def compare_local_baseline(report, baseline):
    comparison = {"status": "diagnostic-only", "splits": {},
                  "scope": "Catalog changes may raise or lower these metrics; source thresholds and behavioral regression tests own acceptance. Deltas alone are not an improvement claim."}
    for split in ("all", "calibration", "held_out"):
        current = report if split == "all" else report["splits"][split]
        original = baseline if split == "all" else baseline["splits"][split]
        comparison["splits"][split] = {
            "metrics": {metric: {"baseline": original["metrics"][metric],
                                 "current": current["metrics"][metric],
                                 "delta": current["metrics"][metric] - original["metrics"][metric]}
                        for metric in sorted(REQUIRED_METRICS)},
            "samplesUnchanged": current["samples"] == original["samples"],
            "baselineSamples": original["samples"], "currentSamples": current["samples"],
        }
    return comparison


def main():
    parser = argparse.ArgumentParser(parents=[runtime_parser], description=__doc__)
    parser.add_argument("--cases", type=Path, default=FIXTURE_DIR / "relevance-cases.json")
    parser.add_argument("--thresholds", type=Path, default=FIXTURE_DIR / "relevance-thresholds.json")
    parser.add_argument("--baseline", type=Path, default=FIXTURE_DIR / "relevance-baseline.json")
    parser.add_argument("--split", choices=("all", "calibration", "held_out"), default="all")
    parser.add_argument("--write-baseline", type=Path)
    parser.add_argument("--compare-local-baseline", type=Path)
    args = parser.parse_args()
    if args.compare_local_baseline and args.split != "all":
        parser.error("--compare-local-baseline requires --split all")
    fixture = load_json(args.cases)
    oracle = oracle_fingerprint(args.cases)
    errors = validate_fixture(fixture, CSV_CONFIG, AVAILABLE_STACKS)
    if errors:
        raise SystemExit("Invalid relevance fixture:\n- " + "\n- ".join(errors))
    selected_split = args.split
    if selected_split != "all":
        fixture = {**fixture, "cases": [case for case in fixture["cases"]
                                        if case["split"] == selected_split]}
    report = evaluate(fixture, oracle)
    report["identityErrors"] = validate_identities(fixture)
    report["supplementalLocal"] = supplemental_local_checks(fixture)
    manifest = load_json(args.thresholds)
    manifest_errors = validate_manifest(manifest, SOURCE_RUNTIME_FINGERPRINT, SOURCE_ORACLE_FINGERPRINT)
    for path in (args.cases, args.thresholds, args.baseline):
        expected = SOURCE_FIXTURE_HASHES.get(path.name)
        if expected is None or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            manifest_errors.append(f"Source fixture bytes changed: {path.name}")
    failures = manifest_errors + report["identityErrors"] + check_thresholds(report, manifest, selected_split)
    if args.compare_local_baseline:
        report["localBaselineComparison"] = compare_local_baseline(report, load_json(args.compare_local_baseline))
    report["failures"] = failures
    report["decision"] = "PASS" if not failures else "FAIL"
    if args.write_baseline:
        if args.write_baseline.resolve().is_relative_to(FIXTURE_DIR.resolve()):
            raise SystemExit("Refusing to overwrite frozen source fixtures")
        if args.write_baseline.exists():
            raise SystemExit("Refusing to overwrite an existing evidence report")
        args.write_baseline.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("decision", "metrics", "samples", "splits", "supplementalLocal", "localBaselineComparison") if key in report},
                     indent=2, sort_keys=True))
    if failures:
        baseline = load_json(args.baseline)
        old = {record["id"]: record for record in baseline["cases"]}
        compared_fields = ("actual", "grades", "route", "coherence", "falsePositives")
        suspect = [record for record in report["cases"]
                   if any(old.get(record["id"], {}).get(key) != record.get(key)
                          for key in compared_fields)]
        if not suspect:
            suspect = [record for record in report["cases"]
                       if (record.get("grades") and record["grades"][0] < 2)
                       or record.get("falsePositives", 0)
                       or ("coherence" in record and not all(record["coherence"]))]
        detail = "\n".join(f"  {item['id']}: {item.get('actual', item)}"
                           for item in suspect)
        raise SystemExit("Relevance gate failed:\n- " + "\n- ".join(failures)
                         + ("\nProblem cases:\n" + detail if detail else ""))


if __name__ == "__main__":
    main()
