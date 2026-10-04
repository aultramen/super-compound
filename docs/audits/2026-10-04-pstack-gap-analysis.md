# pstack Gap Analysis and Delivery

Date: 2026-10-04. Authority: user-supplied Enhancement Super Compound plan and implementation request.
Delivery: [BRD](../brd/brd-pstack-enhancement.md), [PRD](../prd/prd-pstack-enhancement.md), [FSD](../fsd/fsd-pstack-enhancement.md).
Local source inventory: 50 main skills and 23 Poteto playbooks, re-read from the workspace sibling `pstack/`; source content fingerprints below. MIT notice observed in pstack/LICENSE (2026 Lauren Tan). Adaptations are independently written; no pstack mode or code is installed. Leaf references were inspected for the selected learning, orchestration, reflection, benchmark and arena concepts.

## Baseline and Decisions

Five active Windows retrieval/capture failures were reproduced and fixed by canonical public locators. A broader active run found an additional Windows agent-projection separator failure and stale generated Claude pointers; these were repaired with the existing projector. No retired file is deleted.
The retirement commit `6a130497a146e59a7bf8c8b6a0a517418f449f70` actually deletes 87 exact paths (the commit prose says 84); registry generation uses the Git deletion list. New neighboring paths remain active. Historical token baseline is unchanged. Static weighted context reduction is 98.88%; this is not runtime savings. The /sc-work gate remains near its limit; detail is routed on demand.

## Implementation Status

| Goal | Implementation | Evidence/status |
|---|---|---|
| GOAL-001 P0 | registry/selector, active runner/install/audit/retrieval/fixtures, portable locator and legacy reads | targeted tests GREEN; frozen post-hygiene runtime baseline under workspace .scratch/pstack-runtime-baseline-20261004 |
| GOAL-002 P0/P1 | constraints/provenance/supersession, completion receipt/classification/ack, prevention lifecycle, bounded flush/feedback | focused behavioral tests GREEN; archive/retry suites retained |
| GOAL-003 P1 | repeated evaluator, Codex adapter, recipes, existing router/skill/workflow wiring, Windows CI | evaluator/recipe/skill/static gates GREEN; final suites and static/audit gates PASS; report linked below |
| GOAL-004 P1 | ten Codex Windows attempts and final evidence | result in [pilot/verification report](../eval-results/pstack-20261004.md); ten attempts recorded; runtime INCONCLUSIVE due absent actual work, no benefit claimed |
| P2 | scoped transcript/historical rationale fallback | proposal only; no transcript scan or new public skill/workflow |

The approved plan authorizes these specific skill/workflow enhancements. Future automatic learning changes only knowledge and scoped regression checks; skill/workflow/policy evolution remains a proposal. Generalization requires three independent origins; one evidenced defect can receive one scoped regression. Single scheduler, in-process serialization, strict atomic replacement and version checks remain the runtime model.

## All Skills

Source locators are workspace-relative; hashes are full SHA-256 of local source bytes. REUSE means existing coverage without a new requirement, ADAPT maps to this approved scope, NOT DEFAULT rejects blanket adoption, PROPOSE P2 remains deferred.

| Skill | Source locator | Digest | Decision | Existing target | Rationale |
|---|---|---|---|---|---|
| architect | `../pstack/skills/architect/SKILL.md` | SHA-256 85808e68ed53fb78469fa773f53e8d1a4525eef82151056ca82fd9d7989f0be0 | REUSE | codebase-design; architecture-enforcement | existing module seams |
| arena | `../pstack/skills/arena/SKILL.md` | SHA-256 d2b74ce1ef5b24aad06c3097fb22eeb9780802baff10fa08b4aedaccdd63a76c | ADAPT P1 | eval-harness/paired-experiments | identical prompt and anonymous grading; no required multi-model panel |
| automate-me | `../pstack/skills/automate-me/SKILL.md` | SHA-256 7e6188266b44a3b27c80b74757d9bb576301ff9556e6e2ef776dcc0ebdd0552b | REUSE | executing-plans; checkpoint-protocol | authorized local operations only |
| benchmark-checklist | `../pstack/skills/benchmark-checklist/SKILL.md` | SHA-256 9dfcf7fe716a078d1e6eb5cf45e2e4237268d28b9566562cb2ffafde062679d1 | ADAPT P1 | eval-harness/paired-experiments | actual work, failures, repeated measurement |
| blast-radius | `../pstack/skills/blast-radius/SKILL.md` | SHA-256 52bf8db299453f647f977a1b1688f6eb108f7837cbbe35bae4cbe9f91ffd0da8 | REUSE | integration-checking; git-workflow-operation | affected boundaries/callers |
| bro | `../pstack/skills/bro/SKILL.md` | SHA-256 5803b79e1e6c444e3b3c2705f89a9f4ba98c502f9841fce906e61acf52af35ea | NOT DEFAULT | context-engineering | persona does not add a framework capability |
| correct | `../pstack/skills/correct/SKILL.md` | SHA-256 92f1742b48f38c05e750b7572a04f5614ff8ad6b4f668d8dac80be469f7307e0 | ADAPT P0 | knowledge-compounding/prevention-checks | verified correction becomes check assessment |
| create-verification-skill | `../pstack/skills/create-verification-skill/SKILL.md` | SHA-256 638e0560abfafd0571752930be244eed8cd46750667fe870c99ec6196b9ccebf | ADAPT P1 | verification-before-completion/verification-recipes | maintain recipes without adding public skills |
| figure-it-out | `../pstack/skills/figure-it-out/SKILL.md` | SHA-256 4aa7be613b4478b06dcfd7ca80190b249061e21eec4c5f0710de0725551a5c88 | REUSE | prototyping; systematic-debugging | observe before escalating |
| how | `../pstack/skills/how/SKILL.md` | SHA-256 ba20d3b58fa805e54629a3a70caa6c77c9555e608e4f9d0ac427227bb37ac9ab | REUSE | codebase-design; brainstorming | alternatives grounded in evidence |
| interrogate | `../pstack/skills/interrogate/SKILL.md` | SHA-256 14aa149383eb560ffa133dfe78463875ef14d90239cc145f5b9a69a8527bbc77 | NOT DEFAULT | code-review | review by risk; no mandatory model panel |
| maintain-verification-skill | `../pstack/skills/maintain-verification-skill/SKILL.md` | SHA-256 38553f39e53fdbb1bac7357dd0550e4df1546e819dc9c48387b88d1fbcd5ef5c | ADAPT P1 | knowledge-refresh; verification-recipes | revalidate project harness/evidence |
| make-bot-ui | `../pstack/skills/make-bot-ui/SKILL.md` | SHA-256 c69729dedb2e8cafd924afc2be653770dab00f1fec20406414666b16797923fa | REUSE | interface-design | existing UI-aware contracts |
| no-comments | `../pstack/skills/no-comments/SKILL.md` | SHA-256 7e1f72137e38aa3e1dbbf55c1224b928894751d96b2673003c81e4ba28e2cf96 | NOT DEFAULT | code-review | preserve existing actionable review format |
| poteto-mode | `../pstack/skills/poteto-mode/SKILL.md` | SHA-256 f51bc4dfeee6f8180b2402f4ca6a061308cd3ac6ee1f867b313f2b32aa644e1d | NOT DEFAULT | compact workflow routing | no large mode preload, mandatory Cursor tools or WIP commit |
| principle-attack-the-premise | `../pstack/skills/principle-attack-the-premise/SKILL.md` | SHA-256 cb0ea916a7c5c747e3f32780766b069b39d347808b5fc69731bd913db770f335 | REUSE | brainstorming; codebase-design | inspect goal and premises |
| principle-boundary-discipline | `../pstack/skills/principle-boundary-discipline/SKILL.md` | SHA-256 99c74b6676a4ca8e55f17f5db1264244b97b58c953d32bd305744a193a995305 | REUSE | architecture-enforcement | existing dependency direction |
| principle-build-the-lever | `../pstack/skills/principle-build-the-lever/SKILL.md` | SHA-256 366f8de7377d1ff991edf4d8f135b16cb0c36f573816d4f70e2e52cae33bf57e | REUSE | codebase-design | existing simple reusable seams |
| principle-encode-lessons-in-structure | `../pstack/skills/principle-encode-lessons-in-structure/SKILL.md` | SHA-256 64c2752bfd1eeae654b17b9c87858f9b8503101aa4d0c51279cc182794057605 | ADAPT P0 | knowledge-compounding/prevention-checks | reuse/add check, not repeated prose |
| principle-exhaust-the-design-space | `../pstack/skills/principle-exhaust-the-design-space/SKILL.md` | SHA-256 4f971abbaf668014104985177607ab61a1128dc948d8b944f1f9772ec6afe37c | REUSE | brainstorming; codebase-design | bounded alternatives, no mandatory arena |
| principle-experience-first | `../pstack/skills/principle-experience-first/SKILL.md` | SHA-256 e0ac62b729f0f15d541d4bd3a9b4403b6124d885dd1dd02a0aa4668404c41aad | REUSE | interface-design; agentic-delivery | validated experience baseline |
| principle-explain-the-number | `../pstack/skills/principle-explain-the-number/SKILL.md` | SHA-256 d8bb0c91d8685c06de34c0df02eabfc93705b5303b0c0037daa725b647effe5b | ADAPT P1 | eval-harness/paired-experiments | median/variation/limits and evidence |
| principle-fix-root-causes | `../pstack/skills/principle-fix-root-causes/SKILL.md` | SHA-256 573d363206f66b6a684609125f25543b838e5809debd93df1fc7737383be5a20 | REUSE | systematic-debugging; gap-closure | existing reproducer/root cause |
| principle-foundational-thinking | `../pstack/skills/principle-foundational-thinking/SKILL.md` | SHA-256 db9c5d2cb14e950b52f7b74baaee8e56e548d915ffd22c376f29f39d95e8fa50 | REUSE | codebase-design | existing design judgment |
| principle-guard-the-context-window | `../pstack/skills/principle-guard-the-context-window/SKILL.md` | SHA-256 9d78c0dc559d634d6fc0fb0f9efb30b95258d4b2ddbb0527288be2d258d559d4 | ADAPT P0 | context-engineering/active-context | mandatory standing instructions survive resume |
| principle-laziness-protocol | `../pstack/skills/principle-laziness-protocol/SKILL.md` | SHA-256 16f9bf5ad9ecdfde14a9457a675b117d3846e81face3d1252970dfbf5ce848d4 | REUSE | codebase-design; executing-plans | remove work before adding machinery |
| principle-make-operations-idempotent | `../pstack/skills/principle-make-operations-idempotent/SKILL.md` | SHA-256 ed04e0247cfb4baa0d35d2e9d310f3427502477b72790331880701caca120d6f | ADAPT P1 | work-package completion inbox; maintenance flush | durable completion replay no-op |
| principle-migrate-callers-then-delete-legacy-apis | `../pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md` | SHA-256 295ac6b00c3888c596b53001b01749391ff74620c1066a658fea6495b22adf81 | REUSE | compatibility-check; integration-checking | preserve backward compatibility |
| principle-minimize-reader-load | `../pstack/skills/principle-minimize-reader-load/SKILL.md` | SHA-256 2d29d3494ef4fb0c93583d599f31b5bc5542663ad655994a3fb204c23ce3a79a | REUSE | context-engineering | on-demand references and concise routers |
| principle-model-the-domain | `../pstack/skills/principle-model-the-domain/SKILL.md` | SHA-256 7de67c97fe90d9e9551de333ee8a77a29162c551f55c24b256d0cd422933074d | REUSE | domain-modeling | shared domain language |
| principle-never-block-on-the-human | `../pstack/skills/principle-never-block-on-the-human/SKILL.md` | SHA-256 4c70825c3d01b824f3271b90caa53a60e8a43955e750a9adde99ea33f1525e53 | REUSE | checkpoint-protocol | existing delegated reversible work; explicit authority remains |
| principle-outcome-oriented-execution | `../pstack/skills/principle-outcome-oriented-execution/SKILL.md` | SHA-256 db7d50f932a368dbb926d954c109288373466fe11dc9f3f61b5a1f152850eb4e | ADAPT P1 | knowledge-refresh; prevention report | link check outcomes and effectiveness |
| principle-prove-it-works | `../pstack/skills/principle-prove-it-works/SKILL.md` | SHA-256 06c9fc738540384e78fafc43c251e04d053f4e2dc5acef73245396da6cc8c60f | ADAPT P1 | verification recipes | actual launch/drive evidence survives cleanup |
| principle-redesign-from-first-principles | `../pstack/skills/principle-redesign-from-first-principles/SKILL.md` | SHA-256 2f93203f3f7d2c584d316ba1c9cabd3a922bdb6a94ed4ab45ed045bb250e7a73 | REUSE | codebase-design | no unrelated refactors |
| principle-separate-before-serializing-shared-state | `../pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md` | SHA-256 05cbc073c63c1d61cc3032a6d31b781b0d55337be8d51fa7b1259cbebe85957e | REUSE | parallel-execution; work-package | isolated workers and single scheduler |
| principle-sequence-verifiable-units | `../pstack/skills/principle-sequence-verifiable-units/SKILL.md` | SHA-256 0b4407908c81a3368cc481ae835e04a71295810f918b45d16cbd1dbc2ba5734b | REUSE | writing-plans; goal-waves | dependency-ready bounded goals |
| principle-subtract-before-you-add | `../pstack/skills/principle-subtract-before-you-add/SKILL.md` | SHA-256 efa99ef0169b40e078c8aafada5f484fee65543cad5cf5feb9cd7c89116aa4cd | ADAPT P1 | eval-harness/paired-experiments | useless work -> repeats -> volume -> concurrency |
| principle-test-behavior-not-implementation | `../pstack/skills/principle-test-behavior-not-implementation/SKILL.md` | SHA-256 bd6ecea5b16ce30d79dc5918d80ddf40c681b244e40bdcdf709f821e1ae19c7e | REUSE | test-driven-development | existing public behavioral seam |
| principle-type-system-discipline | `../pstack/skills/principle-type-system-discipline/SKILL.md` | SHA-256 c5a6412532e017a6fbd2625e527711fad57d14a0a57bba3223eb0578036feebe | REUSE | secure-code-patterns; codebase-design | boundary validators, no new language mandate |
| recall | `../pstack/skills/recall/SKILL.md` | SHA-256 3787d00d17c197a6e021c331673d29740fb16d7ec83311bfe2d7f64bebc7c1a7 | PROPOSE P2 | context-engineering/active-context | workspace/topic-scoped fallback only |
| reflect | `../pstack/skills/reflect/SKILL.md` | SHA-256 afed390a2fbb468d6b7d5d2d44aace5df33b3070d31798c6c03254e1ee9fbad8 | ADAPT P1 | knowledge-compounding/prevention-checks | candidate/validated/applied/rejected/deferred; no required panel |
| setup-pstack | `../pstack/skills/setup-pstack/SKILL.md` | SHA-256 6a8d9695a605c607ba904ec53a8c8c1007eeb459e5a8b455b2394f056042432f | NOT DEFAULT | existing installer | no second framework or global skill install |
| show-me-your-work | `../pstack/skills/show-me-your-work/SKILL.md` | SHA-256 53506f873ecb84c111baab64db3bd26ebae1a2721a3b88d8643097bb06b83813 | REUSE | verification-before-completion | existing evidence before claim |
| swarm | `../pstack/skills/swarm/SKILL.md` | SHA-256 4fdc706b72a57ef115f52b79f010b72410b08937dbaa6dc65be2bb46a98b2e21 | NOT DEFAULT | parallel-execution | delegate by risk/cost, not blanket fanout |
| tdd | `../pstack/skills/tdd/SKILL.md` | SHA-256 dc438d0d5e59482d88643eaffc2d85547a248aba2987c79ed74b3b2f280a2f11 | ADAPT P0 | test-driven-development; prevention-checks | verified defect may get additive regression |
| teach | `../pstack/skills/teach/SKILL.md` | SHA-256 5849c4cdb9be7a84cddc8524273c53a1e4a1c09ea9e14592b94bc0ee2d3e0d09 | REUSE | knowledge-compounding | verified knowledge capture |
| technical-writing | `../pstack/skills/technical-writing/SKILL.md` | SHA-256 13a07db41433789c0b615b6601915817dad9ca0505b807f01bd9a696f782fbff | REUSE | context-engineering; output-style | existing documentation contract |
| typescript-best-practices | `../pstack/skills/typescript-best-practices/SKILL.md` | SHA-256 b371e973b788496d4aef5045219b1201909ec0b104a745d42788a80cb1fd2b9c | REUSE | architecture-enforcement | project-specific rather than global language policy |
| unslop | `../pstack/skills/unslop/SKILL.md` | SHA-256 df32a08e7398e65e4458eab368deaad1da8dfc4e10a1f915571e2f243ab966ad | REUSE | output-style | concise source-grounded prose |
| why | `../pstack/skills/why/SKILL.md` | SHA-256 851d4cc92ca1820f8e0dbd9615ca3768f3de86fb5b9a165e06face77a7da524a | PROPOSE P2 | domain-modeling; scoped recall proposal | historical rationale only after current artifacts fail |

## All Playbooks

| Playbook | Source locator | Digest | Decision | Existing target | Rationale |
|---|---|---|---|---|---|
| authoring-a-skill | `../pstack/skills/poteto-mode/playbooks/authoring-a-skill.md` | SHA-256 4ac3baa5fd02e1b7742a5ef96d22c20e3e7667fb12238b984e739f003357545a | REUSE | skill-authoring | proposal then explicit application |
| autonomous-run | `../pstack/skills/poteto-mode/playbooks/autonomous-run.md` | SHA-256 89862866a8c01f083c515c2ca486f79e925e8328415b3784fa088d7487360be6 | REUSE | executing-plans | existing authority and recovery |
| autopilot-full | `../pstack/skills/poteto-mode/playbooks/autopilot-full.md` | SHA-256 f05efa2bb910ecbc9febb79b9a99875e08181863076c52bbf88be5e3207ce397 | REUSE | agentic-delivery | full BRD/PRD/FSD path |
| autopilot-stack | `../pstack/skills/poteto-mode/playbooks/autopilot-stack.md` | SHA-256 9b99dd44fc447e6199a34115065e7e1dd0905882979225003c6757a211b158d6 | NOT DEFAULT | git-workflow-operation | no automatic WIP/PR commits |
| babysit | `../pstack/skills/poteto-mode/playbooks/babysit.md` | SHA-256 df985d061d0c0c4287c443336a434d5a24cf47fd3de4abb8e54672fe84fa42dd | NOT DEFAULT | git-workflow-operation | no GitHub tooling assumption |
| bug-fix | `../pstack/skills/poteto-mode/playbooks/bug-fix.md` | SHA-256 0aba55d737305bc93019eea13652ec837d195a4b62fc1434467e6fc7ce52e82a | ADAPT P0 | systematic-debugging; prevention-checks | reuse/add evidenced regression |
| eval | `../pstack/skills/poteto-mode/playbooks/eval.md` | SHA-256 e119a69781a77e356b03fb72bd959b18bff9955b3259ba91ccfabed79f1bbdad | ADAPT P1 | eval-harness/paired-experiments | external blinded grader |
| feature | `../pstack/skills/poteto-mode/playbooks/feature.md` | SHA-256 d13f1e6a15e742220ef4536d604f0bd41103b269844ff38f3bb0435e50f68cd1 | REUSE | agentic-delivery; executing-plans | existing delivery tiers |
| hillclimb | `../pstack/skills/poteto-mode/playbooks/hillclimb.md` | SHA-256 bcbf22a0296ff45c2ac6bb73234de32ea362d5732916e4e22d06dd560c6ebb36 | ADAPT P1 | adaptive-eval; paired-experiments | one hypothesis and negative outcomes |
| investigation | `../pstack/skills/poteto-mode/playbooks/investigation.md` | SHA-256 c6cf882d483d50243e06977fab28d25ccd25b525b39eb45d6af3e89c1b8dcf52 | REUSE | systematic-debugging | bounded evidence-led reads |
| multi-phase-plan | `../pstack/skills/poteto-mode/playbooks/multi-phase-plan.md` | SHA-256 e1639882bba4f7d80ddd1409c747e9a8bd26f47c492921f71cfb38db15f2d9eb | REUSE | writing-plans; goal-waves | existing packets/DAG |
| opening-a-pr | `../pstack/skills/poteto-mode/playbooks/opening-a-pr.md` | SHA-256 ca9afad46b925448d843a05d6fe3af980245da4b610ddfba26284a50bd43e798 | NOT DEFAULT | git-workflow-operation | PR only on explicit request |
| orchestrate | `../pstack/skills/poteto-mode/playbooks/orchestrate.md` | SHA-256 2431c107efac623dd57acd3c8b54574d99cdb905ff9357233396ea7710f7f04a | ADAPT P0/P1 | active-context; completion-inbox | standing instructions and durable acknowledgement |
| pause-safely | `../pstack/skills/poteto-mode/playbooks/pause-safely.md` | SHA-256 f2c7c53d90a0becde594a7d6d3c152f6ad8069edd6903fe6c2bbd4e5ff4243b4 | ADAPT P0 | state-management; active-context | constraint digest/checkpoint |
| perf-issue | `../pstack/skills/poteto-mode/playbooks/perf-issue.md` | SHA-256 52f5d05eeb71bce042e8416d9bba22a93de5dc3106ce8d708941c94004159155 | ADAPT P1 | eval-harness; adaptive-eval | repeated observed work |
| prototype | `../pstack/skills/poteto-mode/playbooks/prototype.md` | SHA-256 524f466259adff554fec3f60091d80112a530c390a4d37237f0260e877d8fdb5 | REUSE | prototyping | throwaway evidence, not production bypass |
| refactoring | `../pstack/skills/poteto-mode/playbooks/refactoring.md` | SHA-256 1c076f78a4cb05608ae3f38a66c72b79392a87a4fa488a6c850e4d8b9ff4d835 | REUSE | codebase-design; executing-plans | scope and behavioral checks |
| runtime-forensics | `../pstack/skills/poteto-mode/playbooks/runtime-forensics.md` | SHA-256 574b03de2ba1041ac9e49a9a9e977bb978954a1d61fe4970cce57d94a4695102 | REUSE | systematic-debugging | specific runtime evidence |
| session-pickup | `../pstack/skills/poteto-mode/playbooks/session-pickup.md` | SHA-256 b8afdfc469a6208cfa4441732a84019040e56546eac33ed2448296b2091642ef | ADAPT P0 | state-management; active-context | pending receipts and current constraints |
| shipping | `../pstack/skills/poteto-mode/playbooks/shipping.md` | SHA-256 2a1c21f45dff680b917bbabadcff52145c14051cf51bfb8db45df944cf32e78c | NOT DEFAULT | sc-launch; git-workflow-operation | release authority stays explicit |
| trace-forensics | `../pstack/skills/poteto-mode/playbooks/trace-forensics.md` | SHA-256 c55277fd6d72db570a28358851a4637da1128509b7343b0677446698dd0631f2 | REUSE | eval-harness; systematic-debugging | observed action/artifact provenance |
| visual-parity | `../pstack/skills/poteto-mode/playbooks/visual-parity.md` | SHA-256 95a4e5aea48ac667925918e2e2832b13ee1d4dad2a0923a3f8154d3057029d15 | REUSE | interface-design; integration-checking | existing visual/e2e gates |
| worktree-cleanup | `../pstack/skills/poteto-mode/playbooks/worktree-cleanup.md` | SHA-256 9959666e79547a97d0415b91e251ef43412258dd1ac7f0e8c0109f6494f9e7f1 | NOT DEFAULT | git-workflow-operation | preserve user files; no automatic destructive cleanup |

## Acceptance and Limits

Criteria: `.agent/evals/pstack-enhancement.md`; tests and actual attempts are reported in the linked verification report. Ten paired sessions use fixed model/configuration and an external grader. Unknown fields remain unknown, timeouts stay recorded, cached input is not counted twice. KEEP requires >=10% median token reduction beyond paired variation with correctness preserved; incomplete evidence is INCONCLUSIVE. Other hosts have contract parity checks only.

Tools validate bounded formats, repository confinement and byte provenance. Owning workflows establish natural-language truth, instruction authority, independent origins, scope and prevention gaps; hashes do not authenticate arbitrary callers or prove a lesson is universally true. No WIP commits, global skill replacement, required model panel, broad history preload, or Cursor/GitHub dependency is introduced.
