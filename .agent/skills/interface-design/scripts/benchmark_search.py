#!/usr/bin/env python3
"""Paired local repeated-query benchmark; no host/model token claims."""
import argparse
import hashlib
import json
import statistics
import time
from pathlib import Path
import core


def run(repeat=5, searches=200):
    samples = {"before": [], "after": []}
    digests = {}
    queries = [("performance trackBy", "angular"), ("caching explicitly", "nextjs")]
    for attempt in range(repeat):
        for label in (("before", "after") if attempt % 2 == 0 else ("after", "before")):
            core._SEARCH_CACHE_ENABLED = label == "after"
            core._cached_index.cache_clear()
            start = time.perf_counter()
            outputs = [core.search_stack(*queries[i % len(queries)]) for i in range(searches)]
            samples[label].append(time.perf_counter() - start)
            value = hashlib.sha256(json.dumps(outputs, sort_keys=True).encode()).hexdigest()
            digests.setdefault(label, value)
            if digests[label] != value:
                raise RuntimeError("Nondeterministic result within benchmark")
    core._SEARCH_CACHE_ENABLED = True
    quality_equal = digests["before"] == digests["after"]
    medians = {key: statistics.median(value) for key, value in samples.items()}
    return {"basis": "local_perf_counter_seconds", "tasks": queries, "searches_per_attempt": searches,
            "independent_pairs": repeat, "samples": samples, "medians": medians,
            "quality_equal": quality_equal, "result_digests": digests,
            "decision": "KEEP" if quality_equal and medians["after"] < medians["before"] else "REJECT",
            "reduction": 1 - medians["after"] / medians["before"],
            "runtime_tokens": "unknown", "scope": "in-process repeated search only"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run()
    text = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    print(text)
    raise SystemExit(0 if result["decision"] == "KEEP" else 1)
