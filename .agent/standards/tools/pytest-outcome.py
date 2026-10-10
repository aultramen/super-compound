"""Normalize pytest JUnit cases for the standards gate; never infer pass from exit alone."""

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def convert(source: str) -> dict:
    if "<!DOCTYPE" in source or "<!ENTITY" in source:
        raise ValueError("JUnit declarations are not supported")
    document = ET.fromstring(source)
    if document.tag not in {"testsuite", "testsuites"}:
        raise ValueError("expected a JUnit testsuite or testsuites document")
    cases = list(document.iter("testcase"))
    counts = {"total": len(cases), "passed": 0, "failed": 0, "skipped": 0}
    for case in cases:
        if case.find("failure") is not None or case.find("error") is not None:
            counts["failed"] += 1
        elif case.find("skipped") is not None:
            counts["skipped"] += 1
        else:
            counts["passed"] += 1
    for suite in document.iter("testsuite"):
        observed = list(suite.iter("testcase"))
        expected = {"tests": len(observed),
                    "failures": sum(case.find("failure") is not None for case in observed),
                    "errors": sum(case.find("error") is not None for case in observed),
                    "skipped": sum(case.find("skipped") is not None for case in observed)}
        if any(name in suite.attrib and int(suite.attrib[name]) != count
               for name, count in expected.items()):
            raise ValueError("JUnit summary disagrees with observed test cases")
    status = "fail" if not cases or counts["failed"] else "skip" if counts["skipped"] else "pass"
    return {"schema": "standards_check_outcome_v1", "status": status,
            "observed": f"Parsed {len(cases)} testcase outcomes: {counts['passed']} passed, "
                        f"{counts['failed']} failed, {counts['skipped']} skipped",
            "counts": counts}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    source, output = Path(args.input).resolve(), Path(args.output).resolve()
    if source == output:
        parser.error("input and output must be different files")
    try:
        report = convert(source.read_text(encoding="utf-8-sig"))
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, ET.ParseError) as error:
        print(f"pytest outcome error: {error}", file=sys.stderr)
        return 2
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
