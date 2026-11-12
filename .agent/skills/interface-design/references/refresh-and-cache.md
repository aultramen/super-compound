# UI Guidance Refresh and Cache

## Summary

Refresh pinned source assets through documented local transforms, regression and
relevance checks. Runtime retrieval keeps a bounded, source-sensitive index cache.

## Selective refresh

`UPSTREAM.json` records each refreshed file's `upstream_commit`; entries without
one inherit the historical `upstream.commit`. Check that revision's normalized
source hash, local hash, mirrored/transformed status, and local transform before
accepting a replacement. Keep the local web/app split, product enrichments, strict
CSV validation, bounded retrieval, GSAP routing, and persistence protections.
Unlisted assets and excluded upstream features remain outside the mirror claim.

The catalog refresh uses source revision `b7d5353e0130feb8c5574ef1251f8a1db1873ccb`.
Its style taxonomy and RTL fields require a mapped schema and ranking checks;
reasoning rules retain the source grammar while local generation keeps safe
persistence and retrieves stack guidance separately. Design dials, generic CSS
kits, and RTL design-system generation remain excluded.

Run old-query regressions and the relevance adapter before accepting changed data:

```bash
python -m unittest discover -s .agent/skills/interface-design/scripts -p "test_*.py"
python .agent/skills/interface-design/scripts/evaluate_relevance.py
```

The adapter retains the original 90-case oracle and unchanged numeric floors,
maps source `web` to the local `app` domain, and reports local fingerprints and
supplemental checks separately. Review calibration and held-out results and any
delta from the recorded local baseline. A source floor alone does not approve
the transformed runtime or prove project UI correctness. Do not rewrite oracle
judgments or lower thresholds to accept a regression.

Returned source signatures identify the local data used. Applicability records
only versions explicitly recorded in guidance; missing versions/revisions remain
unknown. A dataset refresh is not verification of every external documentation link.

## Index cache

The bounded 16-index in-process cache keys resolved path, search columns,
current/legacy row eligibility, mtime/ctime nanoseconds, size, and inode. Source changes invalidate an index;
results are fresh dictionaries. A new CLI process starts cold. Reproduce paired
performance evidence with:

```bash
python3 .agent/skills/interface-design/scripts/benchmark_search.py --output .agent/benchmarks/ui-search-cache.after.json
```

A KEEP requires identical result digests and a lower paired median. This measures
repeated local search latency, never runtime host token or billing savings.
