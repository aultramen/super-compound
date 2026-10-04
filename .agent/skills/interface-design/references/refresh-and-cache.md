# UI Guidance Refresh and Cache

## Selective refresh and cache

Keep UPSTREAM.json pinned. Before refreshing one dataset, inspect its normalized
source hash at the pinned upstream commit and its local transform entry; keep
local rows and transforms. Do not blanket-copy upstream thresholds. Run the
search regression suite and held-out product/stack queries before accepting any
changed row. Without new source evidence, retain the current dataset.
Returned applicability records only versions explicitly present in guidance;
missing versions/revisions remain unknown. Current Next.js 15+ caching guidance
uses its existing version-15 documentation locator.

The bounded 16-index in-process cache keys resolved path, search columns,
mtime/ctime nanoseconds, size, and inode. Source changes invalidate an index;
results are fresh dictionaries. A new CLI process starts cold. Reproduce paired
performance evidence with:

```bash
python3 .agent/skills/interface-design/scripts/benchmark_search.py --output .agent/benchmarks/ui-search-cache.after.json
```

A KEEP requires identical result digests and a lower paired median. This measures
repeated local search latency, never runtime host token or billing savings.
