# Repeated Paired Experiments

Freeze one hypothesis, correctness predicate, task, fixtures, host, model,
configuration and grader before changes. Optimize in order: remove useless work,
avoid repeated work, reduce volume, then evaluate concurrency/model alternatives.
Keep negative and inconclusive results with evidence; never quietly retry them.

Use five interleaved pairs with identical task prompts and anonymous session
labels. Keep the rubric and variant mapping outside worker fixtures. Grade
observed commands, artifacts and actual results; prompt promises and synthetic
trace tests do not prove real runtime compliance. Check the limiter, production
configuration, physical plausibility, failures, repeatability, end-to-end
relevance and whether work actually ran. Record token input/output/cache,
latency, commands, repetition, constraints, capture and resume success.

`adaptive-eval.mjs paired <input.json>` accepts trials and optional gates.
Trials bind pair, variant, task/fixture/config/grader/source digests, host, model,
metric, basis, value, correctness, errorCount, timestamp and actualWork
{commandCount,evidenceRef,digest}. Default: at least five pairs, median reduction
>=10% and larger than twice paired median absolute deviation, with correctness
preserved. Quality regressions REJECT; absent/incomparable proof is INCONCLUSIVE.
Store every run, median/range/variation and the verdict; source variants may
differ, but tasks/config/grader and fixture must match.

Codex Windows pilot: `node .agent/tools/codex-pilot.mjs run --baseline
<frozen-root> --out <new-directory> --model <fixed-model> --executable <codex.exe>`.
The existing session-baseline seed supplies the fixture. Ten cold sessions have
a five-minute limit, alternating AB/BA by pair and no hidden retries. Each uses
its local adapter. JSONL, stderr, actual artifact grade and usage remain on disk.
Cached input is a subset of input: total = input + output, never + cache again.
Missing fields stay unknown. A failed attempt remains in the dataset.

CLI event fields and flags are checked against the installed CLI and
[official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode).
Results apply only to this fixture and Codex Windows configuration. Claude Code
and Antigravity get contract parity checks; their runtime benefit is unmeasured.
