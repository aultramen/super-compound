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

A/B variants must have distinct effective source digests. A same-source pair
can describe noise; it cannot support KEEP. Optional `gates.controlTrials` supplies
at least six compatible A/A pairs. Their floor is the maximum absolute paired
reduction, `max(abs(1 - B/A))`; candidate median gain must exceed that floor
and the existing thresholds. Missing or incompatible required controls are
INCONCLUSIVE, never an efficiency win (`gates.noiseAware: true` requires controls).

Codex Windows pilot first runs `node .agent/tools/codex-pilot.mjs preflight
--baseline <frozen-root> --enhanced <candidate-root> --out <new-directory>
--fixture debugging --model <fixed-model> --effort low --executable <codex.exe>`;
repeat in a fresh directory with `--fixture multi-goal-resume`. Preflight proves
the selected build marker, actual initial test result, and a bounded write probe
at `.scratch/pilot-write-proof.json` without changing source or acceptance tests.
Debugging deliberately starts RED; resume starts GREEN. A blocked preflight stops
counted sessions and retains its evidence. Read/test success alone does not prove
the worker can implement. Honor a read-only policy; do not bypass it.

Counted runs use the same selected fixture, configuration and proving grader.
Run `node .agent/tools/codex-pilot.mjs run --baseline <frozen-root> --enhanced
<candidate-root> --out <new-directory> --fixture <selected-fixture>
--noise-aware true --model <fixed-model> --effort low --executable <codex.exe>`.
Six A/A pairs precede five A/B pairs. Cold sessions alternate AB/BA and have a
five-minute limit, with no hidden retries. Keep the existing execpolicy rules;
never bypass policy to obtain a measurement. JSONL, stderr, actual artifact
grade and usage remain on disk. Justified trivial closeout can replace learning
capture only when verification and the durable disposition are actually proved.
Stop after the first failed control workflow; preserve its trace and verdict.
An ineligible control cannot establish a noise floor for candidate trials.
Cached input is a subset of input: total = input + output, never + cache again.
Reasoning output is a subset of output; report it separately without adding it
again. Cache-write input is a reported counter, not an extra total. Missing or
inconsistent reasoning fields stay unknown. A failed attempt remains in the dataset.

CLI event fields and flags are checked against the installed CLI and
[official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode).
Results apply only to this fixture and Codex Windows configuration. Claude Code
and Antigravity get contract parity checks; their runtime benefit is unmeasured.
