# Evidence-Based DoD - Historical Evidence Archive

## Summary

This curated archive preserves the executed and inspected October 7, 2026
Definition of Done verification. It contains 26 evidence records and the exact
[original verified report](report-as-verified.txt). [manifest.json](manifest.json)
records their original locations, byte sizes and SHA256 digests.

The archived run used the source-equivalent isolated checkout recorded below.
The source snapshot has 658 files and digest
`6b08e4e595f75399b854d14597cf87d59a605057d4c11a8e6ead8dcc96f32cb7`. The original completion
contract pin is `1aef223423737e8114a490f5c1ee1cde4dee8ef45b6c389940f4b769d434c3f5`; the verified
report digest is `00858becfab1eb2e188146420c84b2f70e65fe504ecb6fc1f5b8864e3bef902b`.

## Recorded Execution Scope

- Original workspace: `D:\BATI\Development\framework\super-compound`.
- Tested checkout: `C:\Users\aul\AppData\Local\Temp\sc-evidence-dod-final-Ynwygm`.
- `npm test`: 504 Node tests passed; `npm run test:local`: 498 Node and 36 Python
  tests passed. Both recorded exits are 0, with zero failures or skips.
- The three-repeat benchmark covers 38 repository-owned static scenarios.
- The final recorded completion gate exited 0 and reported all eight criteria.

The records retain their exact historical argv, working directories, source and
artifact pins, timestamps, and original relative references. JSON references
remain historical locators; they were not rewritten into a relocated executable
contract. The original scratch records remain untouched.

## Preservation And Use

Open the [updated report](../evidence-dod-20261007.md) for permanent evidence
links. `report-as-verified.txt` is the document inspected by the archived gate;
its hash remains the one recorded in the coordinator and AC-08 observations.

This archive is historical evidence, not executable proof for future changed
sources. Current completion needs proof bound to the current authoritative
goal, criteria, sources and environment. The original report's limits remain:
the isolated run does not prove an original-root audit against the preserved
stale benchmark, live behavior across every AI host, or volatile external state.

Only the report-linked records, eight AC observations, final gate transcript
and result, coordinator inspection, diff check, and original report are included.
Fixture directories, pilot rollouts, backups, caches and other scratch content
remain outside this archive. Known token and private-key marker patterns were
scanned without exposing values; no matches were found.
