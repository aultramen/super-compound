# Wave 4 Session Baseline

Headless sessions per label (`.agent/tools/session-baseline.mjs`; raw data in .scratch/baseline-2026-09-03/runs). ks/mm = knowledge-search/memory-maintenance calls; STATE = STATE.md or .continue-here.md changed; s = wall seconds. n=1 per cell: read deltas as direction, not proof.

| Label | Route | In | Out | Cache read | Contract reads | ks | mm | STATE | ERR+LRN | Stop | s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | status | 12 | 762 | 232993 | 1 | 0 | 0 | no | 0 | - | 21 |
| baseline | debug | 10 | 891 | 135803 | 1 | 1 | 0 | no | 0 | /sc-compound OPEN-LOOP-AUTHORITY | 21 |
| baseline | work | 617 | 2725 | 264794 | 1 | 1 | 0 | yes | 0 | /sc-compound OPEN-001 OPEN-002 | 49 |
| after-A | status | 16 | 1054 | 323372 | 1 | 0 | 1 | no | 0 | - | 27 |
| after-A | debug | 10 | 645 | 138869 | 1 | 1 | 0 | no | 0 | /sc-compound | 18 |
| after-A | work | 617 | 3148 | 261678 | 1 | 0 | 0 | no | 0 | OPEN-001 | 56 |
| after-B | status | 14 | 954 | 279201 | 1 | 0 | 0 | no | 0 | - | 22 |
| after-B | debug | 10 | 803 | 138641 | 1 | 1 | 0 | no | 0 | /sc-compound | 23 |
| after-B | work | 439 | 2282 | 181125 | 1 | 1 | 0 | no | 0 | OPEN-001 OPEN-002 | 55 |
| after-C | status | 10 | 745 | 192293 | 1 | 0 | 0 | no | 0 | - | 30 |
| after-C | debug | 10 | 622 | 140352 | 1 | 1 | 0 | no | 0 | - | 26 |
| after-C | work | 611 | 2878 | 264536 | 1 | 0 | 0 | no | 0 | OPEN-001 | 54 |
