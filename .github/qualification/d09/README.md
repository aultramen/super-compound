# D09 source-verification qualification harness

Authority for `contract-local.json` (`D09-SOURCE-VERIFICATION`) and `contract-ci.json`
(`D09-SOURCE-VERIFICATION-CI`). Owner: Aulia Rahman (solo). Status of every check below: NOT-RUN
until the existing completion gate replays the recipes and prints `COMPLETE_ALLOWED`.

## Purpose and scope

Official Sigstore verification, with sigstore-python 4.5.0 (`sigstore verify identity`), of exactly two
files: `Python-3.12.15.tar.xz` (T1, `thomas@python.org`, `https://accounts.google.com`) and
`Python-3.14.8.tar.xz` (T2, `hugo@python.org`, `https://github.com/login/oauth`). The verifier runs in
two frozen capsules on `docker.io/library/python@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1`
(linux/amd64 manifest `sha256:2b4f19da...4ffe`, config `sha256:df18428d...d316`) with the D13 lock, where
only rfc3161-client 1.0.9 is replaced by W: a rebuild of the unchanged official sdist and Cargo.lock
with `OPENSSL_NO_VENDOR=1` against Debian trixie libssl 3.5.7-1~deb13u3.

The harness adds no cryptography of its own and waives no finding. Its declared deviations from the
approved plan are the AC-11 structural-skip rule (pending owner approval in D14) and the all-target
cargo fetch (AC-04). Neither weakens an existing repository control; the AC-11 rule relaxes the plan's
"0 skipped" wording for fixture-absent skips only and was approved by the owner in D14. It depends on a
gate change made in the same
patch: the opt-in `replayRequired` / `--replay` change in
`.agent/tools/verification-recipe.mjs` and `.agent/tools/verified-promise.mjs` (contracts without
`replayRequired` behave as before). That change is disclosed as C10-L below. Removing this harness
does not revert it.

### Non-claims

- A D09 PASS covers authenticity of exactly the two named files. It does not qualify runtime or
  application linkage, the ambient Node runner, Windows, production, or any other artifact.
- D09 makes no G1 decision, involves no independent reviewer and grants no security approval. Owner
  acceptance is owner self-review, not independent approval. AI review is advisory.
- TSA tampering is not rejected by `sigstore verify identity` while the transparency-log integrated
  time is present (CHAR-TSA, AC-12, R-06). D09 never reports CHAR-TSA as a rejection. `tsa-direct`
  (AC-11) exercises the rfc3161-client library API only.
- Offline or cached trust is never used for a positive: every positive refreshes TUF online.

## Acceptance anchors

Criterion `expected` strings live in the contracts and are copied verbatim into outcomes.
`AC-15F`, `AC-16F`, `AC-17F` and `AC-19F` are the fast, PR-free variants of AC-15/16/17/19; they run
inside the e2e recipe with fully forged receipts (no genuine receipt, no git history, no Docker).

<a id="ac-01"></a>**AC-01 Inputs identity.** Every pinned input (both CPython tarballs and bundles, 30
unchanged D13 wheels, W, installer 1.0.1, 5 tool wheels, the sdist, the official rfc3161 wheel, every
.deb) matches its pinned size and sha256 by streaming hash; both locks agree with `inputs.json`; no
`PENDING` slot remains.

<a id="ac-02"></a>**AC-02 Image identity.** The local image has the pinned index digest in RepoDigests,
`Id` equal to the pinned config digest (classic image store) or to the pinned index digest (containerd
image store) and to nothing else (`init` records the store and driver), `RootFS.Layers` equal to the
four pinned diffIds, linux/amd64.

<a id="ac-03"></a>**AC-03 Runtime admission.** `probe-runtime` and `linkage` show CPython 3.12.15,
Debian trixie 13.7, the pinned dpkg versions, `dpkg --verify libc6 libssl3t64` clean apart from files that the image's pinned dpkg path filters
(`/etc/dpkg/dpkg.cfg.d/docker`, cross-checked at runtime) leave uninstalled, all 533 loadable
image files equal to the pinned inventory, libcrypto.so.3/libssl.so.3 equal to the members of the
signed libssl3t64 .deb, and a dead resolver configuration (S7). Every probed verifier process maps
only admitted files (S4), no blocked module or object (S3) and no object that a
`security-dispositions.json` item stops on (S1/S2); exactly one libcrypto.so.3 is mapped; the rebuilt
`_rust.abi3.so` binds `PKCS7_verify` to `/usr/lib/x86_64-linux-gnu/libcrypto.so.3`. AC-03 is
evidence for the probed processes only. S5 and S6 are enforced before it by `init`, `check-inputs`,
`doctor-image` and `check-admission`; AC-03 does not by itself show that every S1-S7 condition holds.

<a id="ac-04"></a>**AC-04 Reproducible rebuild.** Local B1 == B2 == W (CI B1 == W), and W passes the
ELF gate, taken only from the `wheel-audit` step output (pure-Python ELF parse in the official image,
`--network none`): NEEDED a subset of `build.elfNeededAllowed`, no RPATH/RUNPATH, `PKCS7_verify`
undefined at `OPENSSL_3.0.0`, zero defined OpenSSL symbols, none of `build.forbiddenBytes`, no
`*.libs/` directory, WHEEL `Tag` equal to `build.wheelTag` with `Root-Is-Purelib: false`, and every
`.py` byte-equal to its sdist member. Locally, `check-inputs` re-hashes `.scratch/d09/build/report.json`
against `rebuilt.reportSha256` and every W copy (`build/b1`, `build/b2`, `inputs/wheels`) against
`rebuilt.sha256`. In CI, `prepare --ci` builds once, so its `report.json` is new by construction: CI binds
W through the `build/b1` stream hash == `rebuilt.sha256` == the inputs copy and through `wheel-audit`,
and records the fresh report sha256. The exact Cargo.lock fetch set and the build negatives are
`prepare` gates recorded in `report.json`: they stop the run when they fail, but they are not AC-04
outcome evidence, and `report.json` fields are never used as AC-04 or AC-05 evidence. `cargo fetch
--locked` runs without `--target` (spec deviation, review B3: a target-filtered fetch skips the
target-gated lock entries), so the exact-set check covers every checksummed registry entry of the lock.

<a id="ac-05"></a>**AC-05 Regression.** Under the same `wheel-audit` policy, before is the observed
result for the official vendored manylinux wheel (must be fail, with the concrete reasons recorded)
and after is the observed result for W (must be pass). Neither status is hard-coded. Before counts as
fail only when the failing reasons include the linkage checks `NEEDED includes libcrypto.so.3` and
`PKCS7_verify undefined with version OPENSSL_3.0.0`; a FAIL on the wheel tag alone is no regression
evidence. Offline, the frozen official wheel fails on Tag, NEEDED subset, NEEDED libcrypto.so.3 and
PKCS7_verify; it contains no literal `OpenSSL 3.6` bytes, so the byte check is not what rejects it.

<a id="ac-06"></a>**AC-06 Frozen installs.** Two hash-checked, binary-only installs (capsule a, b) by the
official installer with `--validate-record all --no-compile-bytecode` are byte-identical,
RECORD-verified, have exactly the lock's 31 dists, no `.pth`/`__pycache__`/PE files, and satisfy the
Requires-Dist/extras/marker and WHEEL-tag closure for cp312 linux x86_64.

<a id="ac-07"></a>**AC-07 Fresh online TUF.** Each capsule refreshed TUF online from the embedded root into
an empty volume: timestamp version >= 804, every expiry > now+24h, trusted_root.json sha256 equals its
signed targets entry.

<a id="ac-08"></a>**AC-08 Positives 4/4.** Both targets in both capsules: exit 0, `OK: `, and none of
`Unable to verify Timestamp with CA.`, `cert chain is incomplete`, `not in CA time range`.

<a id="ac-09"></a>**AC-09 Required negatives 24/24.** N-ARTIFACT, N-IDENTITY, N-ISSUER, N-CORRUPT,
N-MISSING, N-NEARMATCH per target per capsule, each with the pinned exit code and reason (`cases.json`).

<a id="ac-10"></a>**AC-10 Supplementary trust negatives 4/4.** T-NONET, T-STAGING, L-SET, MAL-TSA.

<a id="ac-11"></a>**AC-11 RFC 3161 library checks.** `tsa-direct` (genuine tokens verify; final-byte
flip, altered message and Fulcio-root-as-TSA-root raise `VerificationError`) and the unmodified
upstream rfc3161-client 1.0.9 pytest suite against installed W. Outcome counts cover non-structural
tests only: total > 0, failed = 0, skipped = 0. A skip is structural only if its reason is exactly one
of `Certificates not found for <dir>`, `Request file not found for <dir>`,
`Response file not found for <dir>` or `Response file not found: <path>`, and the named file is not a
member of the hash-pinned sdist (checked against the tarball member list). Structural skips are
written to a separate evidence artifact (nodeid, reason, absent path) and summarized in `observed`.
Any other skip, xfail, xpass or error, or a structural reason that names a file which exists, fails
AC-11. **Change versus the approved plan, pending owner approval in D14:** the plan requires
"0 skipped" for the upstream suite, but the unmodified suite skips by design where fixture files are
absent (`test/test_verify.py:44-45, 55-56, 66-67, 79-80`; about 21 parametrizations by static count,
review B4). Without that approval the plan wording applies, AC-11 cannot pass and D14 STOPs.

<a id="ac-12"></a>**AC-12 CHAR-TSA characterization.** A final-byte-flipped signedTimestamp still verifies
(exit 0, `OK: `) with DEBUG `Unable to verify Timestamp with CA.`. Accepted by design; not a rejection.

<a id="ac-13"></a>**AC-13 Guard self-test.** Under the guard, `xml.etree.ElementTree.fromstring('<a/>')`,
`import sqlite3`, `import lzma`, `import bz2` and `import pyexpat` raise ImportError, and the seeded
`an-pyexpat-guard` probe is reported as an S3 violation.

<a id="ac-14"></a>**AC-14 Admission negatives.** A changed wheel byte, a missing wheel and an extra wheel are
denied before import; a RECORD mismatch is rejected by `installer --validate-record all`; reinstall
without overwrite raises FileExistsError with bytes unchanged; `--network none` blocks TCP and DNS.

<a id="ac-15"></a>**AC-15 X1 forged receipt (regression).** RED: the base gate at `1ef9c70` with a contract
without `replayRequired` prints `COMPLETE_ALLOWED` for a fully coherent forged receipt (gap evidence).
GREEN: the current gate with `replayRequired` prints `COMPLETE_DENIED ... fresh replay required`.

<a id="ac-16"></a>**AC-16 X2 stale source.** The genuine local receipt is denied (`stale source`) after one
bound source changes.

<a id="ac-17"></a>**AC-17 X3 stale tool/image/lock.** Denied after changing `d09.py`, the inputs.json image
pin, or `requirements-linux-cp312.txt`.

<a id="ac-18"></a>**AC-18 X4 stale security evidence.** `--replay` with `capturedAt` older than
`maxAgeHours` stops at `check-admission` with `D09-STOP S6` and `securityEvidence stale` inside the
step cap and is denied.

<a id="ac-19"></a>**AC-19 X6 failed/skipped/missing/empty.** Receipts derived from the genuine one with a
failed step, failed outcome, skipped outcome, missing outcome or empty outcomes are each denied.

<a id="ac-20"></a>**AC-20 Hosted CI parity and X5.** The `d09-source-verification` job for the PR head
of the pinned pull request passed `contract-ci.json --replay` on ubuntu-24.04 and completed within
72 h. `reconcile` uses only read-only GETs to explicit `repos/aultramen/super-compound/...` endpoints
from `inputs.repository`: the PR's base and head repositories must equal `aultramen/super-compound`,
its base ref `feature/standards-qualification` at the pinned base SHA and its head ref
`feature/d09-source-verification`, and any SHA taken from an artifact must be 40 lowercase hex
characters before use. PR, run, attempt, job, workflow, merge commit (parents exactly [base, head],
tree equal to the head tree) and runner image identities reconcile with the GitHub API; the artifact
zip sha256 equals the API digest and its receipt, outcomes and sources bind the clean head checkout;
CI outcomes, cases, W, capsule manifests and the loaded set match local. X5: the same reconcile
function, called with each substituted identity (the real other run 38017280866, a wrong head,
attempt + 1 and a wrong job), returns its pinned denial reason. The job identity compares
`GITHUB_JOB` (the job id) with the job name from the API; they are equal because the job has no
`name:`. Adding one later makes reconcile deny (fail closed).

## Policy D09-VERIFIER-ADMISSION/1.0.0

Scope: the D09 verifier capsule only (both capsules, the tools venv and every container step that runs
capsule or tool code). Numbering and meaning follow the approved plan (D14 section) exactly. Any STOP
ends the run as failed; a STOP is never waived, re-pinned or converted into a pass. Printed form:
`D09-STOP S<n>: <reason>`.

| ID | STOP condition (approved plan) | Enforced by (fix-round interfaces; NOT-RUN) |
|---|---|---|
| S1 | A fix is available but not applied for a component loaded by the verifier. | Probe evaluation: a mapped file matches an item in `security-dispositions.json` with `fixAvailable: true` or `stopIfMapped: "S1"`. |
| S2 | An advisory of HIGH, CRITICAL or UNKNOWN severity whose affected function is imported by a mapped object (`nm -D -u`) and is reachable from network, bundle or tarball input. | Probe evaluation: severity HIGH, CRITICAL or UNKNOWN, mapped, `reachable` not false, or `stopIfMapped: "S2"`; items with `stop: true` STOP at `check-admission`. |
| S3 | A blocked module or object is loaded: pyexpat, libsqlite3, liblzma, libbz2, libpam*, pam_*, the OpenSSL legacy provider and engines, or any "OpenSSL 3.6" bytes. | The guard (the `BLOCKED` tuple in `d09.py`, set before any verifier import; `probe-runtime` STOPs with S5 unless `runtime.blockedModules` equals it); probe maps against `runtime.blockedObjects` plus the built-in floor and a scan of every mapped file for `build.forbiddenBytes`. The byte check cannot see a vendored 3.6.2 build (its bytes carry only a standalone `3.6.2`); for W the effective controls are `wheel-audit` (NEEDED, `PKCS7_verify@OPENSSL_3.0.0`, zero defined OpenSSL symbols) and S4 (exactly one system libcrypto.so.3). |
| S4 | A mapped file is outside the admitted set (dpkg-owned image files with clean `dpkg --verify`, ignoring only files the slim-image path filters leave uninstalled, wheel RECORD entries, CPython files under /usr/local equal to the D11 layer inventory), or other than exactly one `/usr/lib/x86_64-linux-gnu/libcrypto.so.3` is mapped. | Probe maps against `runtime.files` and the capsule manifests. |
| S5 | Identity drift: image, inputs, lock, tool, Node or capsule differ from their pins. | `init` (Node == `host.nodeVersion`), `check-inputs`, `doctor-image`, `compare`. |
| S6 | securityEvidence older than 168 h, or an invalid ownerAcceptance record. | `check-admission` (see Security evidence and owner acceptance). |
| S7 | Container DNS use, or a resolver configuration that is not dead: nameserver must be exactly 127.0.0.1, no `search` or `domain` entries, `LOCALDOMAIN`, `RES_OPTIONS` and `HOSTALIASES` unset (glibc CVE-2026-8674 guard, R-19). | Docker `--dns 127.0.0.1 --dns-search .`; `probe-runtime` records `/etc/resolv.conf` bytes and sha256 and checks it. |

Besides S1-S7, the D14 STOP list of the approved plan applies unchanged (hash, size, signature or
attestation mismatch; unavailable Debian pin; build failure; B1 != B2; ELF or binding violation;
upstream test fail or skip outside the AC-11 rule; capsule manifest mismatch; an egress negative that
passes; TUF failure or expiry <= run + 24 h; a failed positive, an accepted negative or an unexpected
reason; a challenge that is not denied; any test or audit regression; any need for a waiver, override,
weaker test, changed cap or pin outside a slot).

Anti-drift: `cases.json` expectations were pinned from the sigstore 4.5.0 source before execution and
are never edited after an observation. The `cases.json` sha256 is anchored in the sealed D14 packet
(the review's S6 anti-drift item, non-blocking 19, which used the old numbering), and any change also
makes earlier receipts stale (X2). The anchor is a packet control, not a machine STOP.

### C01-L (limited form of D12 C01)

D12 C01, quoted verbatim from `control/d12-candidate-implementation-20261010-0704/review/review.md`
line 29 (sha256 `480c1427b5430f7ad11206b5d626ede01cb1e30df5e7d09e5bef3ee8d6a7a9df`; spacing as in the source; never executed or adopted, status
BLOCKED):

```text
| C01 | P0 | Reject the known Expat2.8.5 image before Python/module starts. Admit only exact reviewed runtime digest with fresh full applicable native/toolchain disposition. No Linux safety inference. | BLOCKED |
```

C01-L replaces only C01's first clause, "Reject the known Expat2.8.5 image before Python/module
starts.", and only for the D09 verifier capsule. The pinned image is admitted for the two D09 source
verifications only while the S3 import guard is active in every verifier process before any verifier
module is imported, and only with per-process maps proof: every verifier process writes a
`/proc/self/maps` probe that is evaluated under S1-S4. The only deliberate pyexpat load is the seeded
`an-pyexpat-guard` negative (AC-13), which parses nothing, runs with `--network none` and must be
reported as S3.

Retained C01 clauses, in force unchanged:

- "Admit only exact reviewed runtime digest with fresh full applicable native/toolchain disposition."
  (S5 identity pins, `security-dispositions.json`, S6 freshness.)
- "No Linux safety inference." (No safety statement about this image is made outside the D09
  verifier capsule, and no Linux result is extended to another platform.)

The D06 guard and its FAIL are unchanged. The image stays rejected for golden-reference, application
and G1 use. The image's Expat itself is disposed as R-12-EXPAT-PYEXPAT.

### C10-L (limited form of D12 C10)

D12 C10, quoted verbatim from the same file, line 38:

```text
| C10 | P0 | Reuse verification-recipe.mjs and verified-promise.mjs unchanged. Bind recipe/command/environment/source/config/tool/outcomes identities; reject missing/failed/skipped/empty/stale evidence. Test unauthorized complete receipt forgery against existing provenance/transport authority; if origin cannot distinguish fabrication, remain BLOCKED. This review packet and leaf seal are not receipts. | NOT-RUN |
```

C10's first clause, "Reuse verification-recipe.mjs and verified-promise.mjs unchanged.", is superseded
by the approved plan's opt-in replay gate change in those two files. C10's own condition, "if origin
cannot distinguish fabrication, remain BLOCKED", is what that change remedies: X1 RED shows the
unchanged gate allowing a fully coherent forged receipt, and X1 GREEN shows the changed gate denying
it (AC-15). Retained C10 clauses, in force unchanged:

- "Bind recipe/command/environment/source/config/tool/outcomes identities; reject
  missing/failed/skipped/empty/stale evidence."
- "Test unauthorized complete receipt forgery against existing provenance/transport authority; if
  origin cannot distinguish fabrication, remain BLOCKED." (X1, AC-15.)
- "This review packet and leaf seal are not receipts."

## Security evidence and owner acceptance

`inputs.securityEvidence` binds admission to exactly one disposition set:

- `capturedAt` `2026-10-10T20:15:16Z` is the first retrieval of the D14 preparation security research
  (the glibc tracker page in `glibc-s1-version-check.json`); age is measured from it (see Time windows
  for two older inputs).
- `maxAgeHours` must be exactly 168.
- `dispositionsRef` names `security-dispositions.json` and `dispositionsSha256` is the sha256 of its
  exact bytes.
- `residuals` lists every item with `residual: true`, in table order.
- `ownerAcceptance` stays `PENDING` until D14.

`ownerAcceptance` is filled only at D14, and only from the owner's genuine answer to the sealed D14
packet, recorded verbatim; never authored by an agent, a default or a selftest. Silence is not approval. The
record:

```json
{"schema": "genuine_user_decision/1", "decision": "APPROVE D14", "answerVerbatim": "<exact text of the owner's message>",
 "packetSha256": "<64 hex: sealed D14 packet>", "dispositionsSha256": "<same as securityEvidence.dispositionsSha256>",
 "residuals": ["<identical list, same order>"], "label": "owner self-review", "recordedAt": "<ISO 8601 UTC, not in the future>"}
```

`decision` is `APPROVE D14` or `APPROVE ALL`. `check-admission` STOPs with S6 unless the dispositions
file hashes to `dispositionsSha256`, its `capturedAt` equals `securityEvidence.capturedAt`,
`maxAgeHours` is 168, the evidence is at most 168 h old (`D09-STOP S6: securityEvidence stale ...`),
the residual lists of `securityEvidence`, the dispositions file and the record are identical and in the
same order, and the record is structurally valid (`D09-STOP S6: ownerAcceptance ...`). An item with
`stop: true` STOPs with its declared code. This machine check validates structure and binding only: it
cannot establish that a human wrote `answerVerbatim`. Human origin rests on the owner's own message and
the sealed packet that `packetSha256` names. Selftests use clearly synthetic records only.

## Predicted STOPs (front of the D14 packet)

No S1 or S2 STOP is predicted from the static research while the S3 guard holds. These can still stop
D14 and are stated up front:

1. **AC-11 structural skips need the owner's approval in D14** (see AC-11); without it D14 STOPs.
2. **R-11-LIBLZMA is S1 if mapped.** A fix (5.8.1-1+deb13u2) exists and is not applied; non-loading
   depends on the S3 guard covering every verifier process, including venv creation.
3. **S7 depends on the resolv.conf Docker writes for `--dns-search .`.** `d09.py` rejects every
   `search` or `domain` line, including `search .`; if Docker writes one, D14 STOPs with S7. Not relaxed.
4. **Positives exclude `Unable to verify Timestamp with CA.`** sigstore 4.5.0 logs that line for each
   trusted TSA that fails before the one that verifies. If the refreshed production trusted root lists a
   non-matching TSA before the issuing TSA, every positive is INVALID and D14 STOPs; it is never counted
   as a pass.
5. **Time windows** (below): T-STAGING needs the staging root v14 before 2026-10-16T19:39:43Z, AC-07
   needs every TUF expiry > now + 24 h, and securityEvidence lapses at 2026-10-17T20:15:16Z.

R-10-ZLIB is not a predicted STOP. The sealed main-session scan
(`PREP/checks/main-session-zlib-reachability.txt`) finds no importer of the CVE-2026-27171 entry points in
the image layers or the 31 wheels, and only `dpkg-deb` (S4: not in `runtime.files`) and
`libapt-pkg.so.7.0.0` (S3: `runtime.blockedObjects`) importing the CVE-2026-85091 entry points. The item
is `reachable: false`, `stop: false`, `stopIfMapped: null` and stays a residual. This is analysis
evidence, not a waiver; a D14 map of either importer in a probed verifier process STOPs. `probe-runtime`
itself runs the image's `dpkg-deb --fsys-tarfile`, unprobed, on the hash-pinned libssl3t64 .deb to
compare libcrypto.so.3 and libssl.so.3 with its members; that helper imports neither gzprintf, gzvprintf
nor crc32_combine*, and no object in the image or the wheels imports gzprintf or gzvprintf at all. W, the
rebuilt wheel, was not in the static scan; `wheel-audit` requires that W imports no `gz*` or
`crc32_combine*` symbol.

## Residuals (accepted only through `securityEvidence.ownerAcceptance`)

One ID per item, in table order (= `securityEvidence.residuals`). Full text, objects and fields are in
`security-dispositions.json`. Evidence locators are `<path>#<field>` relative to the owner's private
validation root (not published); `PREP/` stands for
`control/d14-preparation-20261010-2004/`. `Lnn` is a line number; `[k=v]` selects a list entry.

| ID | Component (package, version) | Advisories (severity) | Loaded / reachable / STOP | Bound / mitigation | Evidence |
|---|---|---|---|---|---|
| `C01-L` | D12 control C01, clause 1 only (reject the Expat 2.8.5 image before Python starts), limited to the D09 verifier capsule (`control:D12-C01`, D12 review.md line 29) | none (NONE) | loaded no; reachable false; stopIfMapped none | C01-L replaces only C01 clause 1 and only for the D09 verifier capsule: the pinned image is admitted for the two D09 source verifications only while the S3 import guard is active in every verifier process before any verifier module is imported, with a per-process /proc/self/maps probe evaluated under S1-S4. C01 clauses 2 and 3 stay in force. The D06 guard and its FAIL are unchanged; the image stays rejected for golden-reference, application and G1 use. Component disposition: R-12-EXPAT-PYEXPAT. | `control/d12-candidate-implementation-20261010-0704/review/review.md#L29`; `control/d09-python-linux-preflight-20261010/oci/report.json#passiveComponents.Expat`; `PREP/review/advisory-review.md#B5` |
| `C10-L` | D12 control C10, clause 1 only (reuse verification-recipe.mjs and verified-promise.mjs unchanged) (`control:D12-C10`, D12 review.md line 38) | none (NONE) | loaded host-only; reachable false; stopIfMapped none | Superseded by the approved opt-in replay gate change in those two files (replayRequired in validateContract, a digest check in verifyCompletionEvidence, --replay in verified-promise.mjs); contracts without replayRequired behave as before. The condition in C10 itself (if origin cannot distinguish fabrication, remain BLOCKED) is what the change remedies: X1 RED shows the unchanged gate allowing a coherent forged receipt and X1 GREEN the changed gate denying it (AC-15). C10 clauses 2 to 4 stay in force. | `control/d12-candidate-implementation-20261010-0704/review/review.md#L38`; `PREP/review/advisory-review.md#(1) Gate change: no fail-open, no weakening` |
| `R-01-OPENSSL-TRUST` | Debian OpenSSL 3.5.7 (system libcrypto.so.3 and libssl.so.3) (`deb:libssl3t64`, 3.5.7-1~deb13u3) | none (NONE) | loaded yes; reachable true; stopIfMapped none | Trusted through the Debian archive and dpkg: AC-03 requires libcrypto.so.3 and libssl.so.3 byte-equal to the members of the signed libssl3t64 .deb, dpkg --verify clean and exactly one libcrypto.so.3 mapped. Debian tracker: 0 open records for openssl 3.5.7-1~deb13u3 (287 fixed at or before it, 33 not affected). No independent OpenSSL qualification. | `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=openssl].counts`; `PREP/research/debian/debian-report.json#findings[id=DEB-07].fact` |
| `R-02-EGRESS-NAME-ONLY` | Egress control of bridge-network container steps (`harness:docker-network`, --dns 127.0.0.1 --dns-search . plus per-step --add-host) | none (NONE) | loaded yes; reachable false; stopIfMapped none | Bridge-network steps (fetch, TUF refresh, positives) restrict names (dead DNS plus a per-step --add-host allowlist), not raw IP connections. Only --network none steps prove zero egress (N-MISSING, T-NONET, admission negatives). All code that runs in these containers is hash-pinned (R-30). | `PREP/review/advisory-review.md#(2) Harness false-green hunt: what holds / Network`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-8674].reachability.note` |
| `R-03-DOCKER-TCB` | Docker daemon, kernel and host as trusted computing base; build and capture containers not --read-only (`host:docker`, daemon and kernel as recorded by init) | none (NONE) | loaded host-only; reachable false; stopIfMapped none | The daemon, kernel and host are trusted (the host fs.protected_hardlinks value is UNKNOWN). Build and capture containers are not --read-only because dpkg must write the root filesystem; they are ephemeral --rm containers with --cap-drop ALL plus the minimum caps and no-new-privileges, and install only hash-pinned .debs. Verifier containers run --read-only with a private tmpfs /tmp. | `PREP/review/advisory-review.md#(2) Harness false-green hunt: what holds / Read-only mounts`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-86805].reachability.note` |
| `R-04-CONTAINERD-ID` | Image identity as reported by the Docker image store (`host:docker-image-store`, classic or containerd store, recorded by init) | none (NONE) | loaded host-only; reachable false; stopIfMapped none | init records the image-store and driver type. Identity accepts Id == pinned config digest (classic store) or Id == pinned index digest (containerd store), nothing else, plus RepoDigests containing the pinned index digest and RootFS.Layers == the pinned diffIds (AC-02, S5). The metadata reported by the daemon is trusted (R-03). The hosted CI image 20261004.327.1 ships Docker 28.0.4; the local D14 store type is UNKNOWN until init records it. | `PREP/review/raw/fetched-facts.json#facts[id=RF-1].extracted`; `PREP/review/raw/fetched-facts.json#facts[id=RF-2].claim`; `PREP/review/advisory-review.md#Non-blocking / 12` |
| `R-05-CRYPTOGRAPHY-STATIC-OPENSSL` | cryptography 50.0.2 with statically linked OpenSSL 4.0.3 (a second OpenSSL in the verifier process) (`wheel:cryptography`, 50.0.2 (OpenSSL 4.0.3 29 Sep 2026)) | none (NONE) | loaded yes; reachable true; stopIfMapped none | 0 of 43 OpenSSL 4.0 advisories affect 4.0.3 (every 4.0 range ends before 4.0.3). The static copy exports no OpenSSL symbols (ELF check on cryptography/hazmat/bindings/_rust.abi3.so), so it cannot shadow the system libcrypto.so.3 that W binds, and exactly one libcrypto.so.3 is mapped (S4). The basename _rust.abi3.so is shared with W, so it is not used as a probe prefix. | `PREP/research/python/python-report.json#item2_openssl.facts[0]`; `PREP/research/python/python-report.json#item2_openssl.facts[1]`; `PREP/research/python/python-report.json#verdict.item2_openssl_4_0_3` |
| `R-06-TSA-TAMPER-NOT-REJECTED` | sigstore-python RFC 3161 signed-timestamp handling (`wheel:sigstore`, 4.5.0) | none (NONE) | loaded yes; reachable true; stopIfMapped none | By design sigstore verify identity accepts a bundle whose signed timestamp fails to verify while the transparency-log integrated time verifies (verifier.py:146-150). CHAR-TSA (AC-12) records this as a characterization only; it is never counted or described as a rejection. tsa-direct (AC-11) exercises the rfc3161-client library API separately. | `PREP/review/advisory-review.md#(3) cases.json compared with the sigstore 4.5.0 source / Characterization` |
| `R-07-HOST-RUNNER` | Host base: Docker Desktop/WSL2 locally, GitHub-hosted ubuntu-24.04 in CI, Node v24.15.0, gh 2.95.0 (`host:runner`, Node v24.15.0; gh 2.95.0; CI image 20261004.327.1) | none (NONE) | loaded host-only; reachable false; stopIfMapped none | The host OS, Docker Desktop/WSL2 and the hosted runner are outside D09. init requires process.version == inputs.host.nodeVersion (v24.15.0, equal to the ci.yml setup-node pin) or STOPs with S5, and the receipt fingerprint binds platform and Node version. gh (2.95.0 observed) is used only for read-only GETs in reconcile against the pinned repository (inputs.repository). Node and gh themselves are not qualified by D09. | `PREP/review/raw/fetched-facts.json#facts[id=RF-1].extracted`; `control/runtime-compatibility-gh-version.stdout.log#L1`; `PREP/review/advisory-review.md#Non-blocking / 8` |
| `R-08-AI-ADVISORY` | AI-assisted harness authoring and AI advisory review (`process:review`, advisory review 2026-10-10T21:52Z) | none (NONE) | loaded host-only; reachable false; stopIfMapped none | Harness authoring and the Phase A review were AI-assisted; the review is labelled advisory and grants no approval or authority. Owner acceptance is owner self-review (R-38). No independent approval is implied. | `PREP/review/advisory-review.md#Label` |
| `R-10-ZLIB` | zlib (libz.so.1, mapped through zlib, binascii and libcrypto.so.3) (`deb:zlib1g`, 1:1.3.dfsg+really1.3.1-1+b1) | CVE-2026-27171, CVE-2026-85091 (UNKNOWN) | loaded yes; reachable false; stopIfMapped none | Loaded (libz.so.1 through zlib, binascii and libcrypto.so.3); not reachable. CVE-2026-27171 (no-dsa minor, CPU loop in x2nmodp): its entry points crc32_combine, crc32_combine64, crc32_combine_gen and crc32_combine_gen64 are defined only by libz.so.1.3.1 and imported by none of the 753 ELF objects in the four image layers and the 31 wheels; inside libz only the two wrappers reach them (objdump). CVE-2026-85091 (untriaged, gz_vacate overflow through non-blocking gzwrite/gzprintf, stated for 1.3.1.2 through 1.3.2 while the image has 1.3.1): the gz* entry points are imported only by usr/bin/dpkg-deb and libapt-pkg.so.7.0.0, both outside the verifier process closure; mapping dpkg-deb is S4 (not in runtime.files) and mapping libapt-pkg is S3 (runtime.blockedObjects). The version-range reading is recorded, not relied on. No fix in trixie; residual, accepted only through ownerAcceptance. No waiver. | `PREP/research/debian/debian-report.json#findings[id=DEB-07].fact`; `PREP/research/debian/derived/tracker-analysis.json#namedSources[source=zlib].nonClearedItems`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets.zlib`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets.binascii`; `PREP/checks/main-session-zlib-reachability.txt#CVE-2026-27171`; `PREP/checks/main-session-zlib-reachability.txt#CVE-2026-85091`; `PREP/checks/main-session-zlib-import-scan.json#importers`; `PREP/research/debian/raw/tracker/security-tracker.debian.org_tracker_data_json#zlib.CVE-2026-85091.description` |
| `R-11-LIBLZMA` | XZ Utils liblzma (liblzma.so.5 through _lzma) (`deb:liblzma5`, 5.8.1-1+deb13u1) | TEMP-1147318-639065, GHSA-5qpq-xqfv-j9pg, DSA-6549-1 (UNKNOWN; fix: 5.8.1-1+deb13u2) | loaded no; reachable true; stopIfMapped S1 | Present, not loaded. The fix (5.8.1-1+deb13u2 in trixie-security, DSA-6549-1, .deb SHA256 b38acab3...84ec) is not applied because it would change the admitted image identity. _lzma is statically reachable (sigstore._cli -> sigstore.oidc -> webbrowser -> shutil -> lzma; requests.utils -> zipfile -> lzma), so non-loading depends on the S3 guard (lzma and _lzma blocked; shutil and zipfile handle the ImportError) in every verifier process, including venv creation. Any mapping STOPs with S1 (and with S3 through blockedObjects). | `PREP/research/debian/debian-report.json#findings[id=DEB-01].fact`; `PREP/research/debian/debian-report.json#part2_tracker.xzUtilsDetail`; `PREP/checks/main-session-verifications.txt#Debian package versions from saved indexes: liblzma5 5.8.1-1+deb13u2`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets._lzma.chain` |
| `R-12-EXPAT-PYEXPAT` | Expat 2.8.5 bundled in CPython 3.12.15 pyexpat (`cpython:pyexpat`, expat_2.8.5 in pyexpat.cpython-312-x86_64-linux-gnu.so) | CVE-2026-77214 (HIGH) | loaded no; reachable true; stopIfMapped S3 | Present, not loaded. CVE-2026-77214 (XML_ParseBuffer heap over-read, CVSS 3.1 8.2 HIGH, Expat <= 2.8.5) is fixed upstream in Expat 2.9.0 (commit 13c5f63), but no CPython 3.12 release bundles it. pyexpat, xml.parsers.expat and _elementtree are blocked by the S3 guard before any verifier import; the only deliberate load is the seeded an-pyexpat-guard negative (AC-13), which must be reported as S3. Any mapping in a verifier process STOPs with S3. Admission of the image rests on C01-L. | `control/d09-python-linux-preflight-20261010/oci/report.json#passiveComponents.Expat`; `control/d06-runtime-security-checklist-20261010.expat-cve-77214.response#containers.cna.metrics`; `control/d06-runtime-security-checklist-20261010.expat-cve-77214.response#containers.cna.affected`; `PREP/research/python/python-report.json#item5_cpython.facts[0]`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets.pyexpat` |
| `R-13-SQLITE` | SQLite (libsqlite3.so.0 through _sqlite3) (`deb:libsqlite3-0`, 3.46.1-7+deb13u2) | CVE-2021-45346, CVE-2025-70873, CVE-2026-50812, CVE-2026-50813 (UNKNOWN) | loaded no; reachable true; stopIfMapped S3 | Present, not loaded: _sqlite3 is not statically reachable from the verifier, and sqlite3 and _sqlite3 are blocked by the S3 guard; any mapping STOPs with S3. Four open trixie tracker records (2 unimportant, 2 no-dsa minor), none fixed in trixie, no severity scores in the research. | `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=sqlite3].openOrAffecting`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets._sqlite3` |
| `R-14-BZIP2` | bzip2 (libbz2.so.1.0 through _bz2) (`deb:libbz2-1.0`, 1.0.8-6) | CVE-2026-42250 (UNKNOWN) | loaded no; reachable false; stopIfMapped S3 | Present, not loaded. _bz2 is statically reachable (sigstore._cli -> sigstore.oidc -> webbrowser -> shutil -> bz2), so non-loading depends on the S3 guard (bz2 and _bz2 blocked); any mapping STOPs with S3. The open record (no-dsa minor, scope local) is in the bzip2recover utility, which the verifier never runs. | `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=bzip2].openOrAffecting`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets._bz2.chain` |
| `R-15-PAM` | Linux-PAM (libpam.so.0, libpam_misc.so.0, libpamc.so.0 and 44 security/pam_*.so modules) (`deb:libpam0g`, 1.7.0-5) | CVE-2025-8941, CVE-2026-54411 (UNKNOWN) | loaded no; reachable false; stopIfMapped S3 | Present in the admitted inventory, not loaded: no verifier ELF links PAM and the verifier never authenticates users. S3 blockedObjects include the libpam and pam_ prefixes; any mapping STOPs with S3. Open records: CVE-2025-8941 (pam_namespace, undetermined) and CVE-2026-54411 (pam_userdb timing, no-dsa minor). | `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=pam].openOrAffecting`; `PREP/research/debian/debian-report.json#part1_runtime.rows[package=libpam0g].verifierMapping`; `PREP/review/advisory-review.md#B6` |
| `R-16-OPENSSL-LEGACY-ENGINES` | OpenSSL legacy provider (ossl-modules/legacy.so) and engines-3 (afalg, padlock, loader_attic) (`deb:openssl-provider-legacy`, 3.5.7-1~deb13u3) | none (NONE) | loaded no; reachable false; stopIfMapped S3 | Present, not loaded: both are dlopen-only and nothing requests them. /etc/ssl/openssl.cnf (sha256 a65a2cb9...d6b3, frozen layer 75b6a36c) lists only default = default_sect in [provider_sect], so the legacy provider is not activated by configuration. S3 blockedObjects include these four prefixes; any mapping STOPs with S3. Debian tracker: 0 open records for openssl 3.5.7-1~deb13u3. | `PREP/checks/main-session-verifications.txt#openssl.cnf provider sections`; `PREP/research/debian/debian-report.json#part1_runtime.rows[package=openssl-provider-legacy].note`; `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=openssl].counts` |
| `R-17-IMAGE-PIP-URLLIB3` | pip 25.0.1 in the image site-packages, vendoring urllib3 1.26.20 (`wheel:pip`, 25.0.1 (vendored urllib3 1.26.20)) | CVE-2025-66471, CVE-2025-66418, CVE-2026-21441, CVE-2026-97687, CVE-2024-47081, CVE-2026-25645, CVE-2025-8869, CVE-2025-47273 (HIGH; fix: pip 25.3 for CVE-2025-8869; urllib3 2.6.0, 2.6.3 and 2.8.0 upstream (a pip release vendoring them was not researched)) | loaded no; reachable true; stopIfMapped none | Present, not loaded; non-use is enforced, not assumed. Verifier and tool venvs are created --without-pip, run with -I and without system site-packages, so the pip in the image is never on a verifier sys.path, and pip and ensurepip are blocked by the S3 module guard (any import is an S3 violation). The capsule uses the hash-pinned urllib3 2.8.0 wheel. The vendor advisories (four HIGH urllib3 range matches, applicability NOT-RUN) were fetched before capturedAt (HISTORICAL). | `control/runtime-admission-preflight-20261010-0736/os/pip-vendor-disposition.json#advisories`; `control/runtime-admission-preflight-20261010-0736/os/pip-vendor-disposition.json#mandatoryBlocker`; `control/d09-python-linux-preflight-20261010/oci/report.json#pip.version` |
| `R-18-GLIBC-HIGH-OWNER-REVIEW` | GNU C Library: 6 open records with HIGH or CRITICAL scores, not reachable (`deb:libc6`, 2.41-12+deb13u4) | CVE-2019-1010022, CVE-2018-20796, CVE-2019-1010023, CVE-2019-9192, CVE-2026-19499, CVE-2026-5435 (CRITICAL) | loaded yes; reachable false; stopIfMapped none | OWNER REVIEW FLAGGED (research ownerReview true). No newer glibc in trixie, trixie-updates or trixie-security (S1 not triggered). CVE-2019-1010022 (NVD 9.8) is a mitigation bypass without a standalone defect; CVE-2018-20796 and CVE-2019-9192 need attacker regex patterns and no verifier ELF imports glibc regex; CVE-2019-1010023 needs ldd on an attacker ELF, which the verifier never runs; CVE-2026-19499 (strfmon) and CVE-2026-5435 (libresolv debug printers) have no importer in the verifier closure (static .dynsym scan, cross-checked by the main session). Not reachable, so S2 does not apply; the import closure is pinned by S4 and S5. | `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2019-1010022].classificationReason`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2018-20796].classificationReason`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2019-1010023].classificationReason`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2019-9192].classificationReason`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-19499].classificationReason`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-5435].classificationReason`; `PREP/research/glibc/glibc-s1-version-check.json#answer`; `PREP/checks/main-session-symbol-scan.txt#regcomp regexec strfmon ns_sprintrr fp_nquery` |
| `R-19-GLIBC-RESOLVER` | GNU C Library DNS stub resolver initialization with a long search list (`deb:libc6`, 2.41-12+deb13u4) | CVE-2026-8674 (MEDIUM) | loaded yes; reachable true; stopIfMapped none | Conditional: the verifier resolves names through glibc (getaddrinfo is imported by _socket and by the cryptography _rust.abi3.so), and a search or domain entry of about 200 or more characters in /etc/resolv.conf or LOCALDOMAIN aborts the process (availability only; verification fails closed). Guard S7: containers run --dns 127.0.0.1 --dns-search . and probe-runtime records /etc/resolv.conf and STOPs unless nameserver is exactly 127.0.0.1, no search or domain entry exists and LOCALDOMAIN, RES_OPTIONS and HOSTALIASES are unset. Fixed upstream in 2.45; Debian no-dsa for trixie. | `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-8674].reachability`; `PREP/checks/main-session-symbol-scan.txt#getaddrinfo`; `PREP/review/advisory-review.md#Non-blocking / 11` |
| `R-20-GLIBC-OTHER` | GNU C Library: 12 open MEDIUM or LOW records, not reachable (`deb:libc6`, 2.41-12+deb13u4) | CVE-2010-4756, CVE-2019-1010024, CVE-2019-1010025, CVE-2026-18374, CVE-2026-19542, CVE-2026-6238, CVE-2026-6791, CVE-2026-77117, CVE-2026-80489, CVE-2026-86805, CVE-2026-6368, CVE-2026-95818 (MEDIUM) | loaded yes; reachable false; stopIfMapped none | No newer glibc in trixie (S1 not triggered). Per the research: glob, wordexp, tdelete, the libresolv debug printers and the iconv JISX0213 converters have no importer in the verifier closure; no component passes an untrusted ',ccs=' fopen mode; CVE-2019-1010024 and CVE-2019-1010025 are ASLR mitigation bypasses without a standalone defect; CVE-2026-86805 and CVE-2026-95818 need setuid programs and a local attacker, both absent from the container. MEDIUM or LOW, so S2 does not apply. | `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2010-4756].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2019-1010024].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2019-1010025].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-18374].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-19542].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-6238].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-6791].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-77117].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-80489].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-86805].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-6368].reachability.verdict`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-95818].reachability.verdict`; `PREP/research/debian/debian-report.json#findings[id=DEB-07].fact` |
| `R-21-UTIL-LINUX` | util-linux libraries (libuuid, libmount, libblkid, libsmartcols) (`deb-source:util-linux`, 2.41.5-0+deb13u1) | CVE-2022-0563, CVE-2026-3184, CVE-2026-76642, CVE-2026-78408, CVE-2026-78409, CVE-2026-78410 (UNKNOWN) | loaded no; reachable false; stopIfMapped none | Present, not loaded: _uuid is not statically reachable and no verifier ELF links libmount, libblkid or libsmartcols. The open records concern setuid or administrative utilities (chfn and chsh, login -h, mount helpers and mount options, nsenter), which the verifier never runs; no severity scores in the research. | `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=util-linux].openOrAffecting`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets._uuid` |
| `R-22-LIBSTDCXX` | GNU C++ standard library (libstdc++.so.6) (`deb:libstdc++6`, 14.2.0-19) | CVE-2026-102010, CVE-2026-95619 (UNKNOWN) | loaded no; reachable true; stopIfMapped none | Present, not loaded: no verifier ELF links libstdc++. Both open records (no-dsa minor) are libstdc++-specific (priority-queue erase_if, aligned operator new); libgcc_s.so.1 from the same source package is mapped but not named by them (R-41). Reachability is not excluded, so any mapping of libstdc++ raises S2. | `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=gcc-14].openOrAffecting`; `PREP/research/debian/debian-report.json#part1_runtime.rows[package=libstdc++6].verifierMapping` |
| `R-23-NCURSES` | ncurses (libncursesw.so.6, libtinfo.so.6, libtic.so.6) (`deb-source:ncurses`, 6.5+20250216-2) | CVE-2025-6141, CVE-2025-69720 (UNKNOWN) | loaded no; reachable false; stopIfMapped none | Present, not loaded: _curses and readline are not statically reachable. The open records (no-dsa minor) are a local terminfo parsing overflow and an infocmp tool overflow; no network, bundle or tarball input reaches terminfo parsing in the verifier. Taken from the raw tracker JSON (the derived tracker analysis did not list ncurses). | `PREP/research/debian/raw/tracker/security-tracker.debian.org_tracker_data_json#ncurses.CVE-2025-6141.releases.trixie`; `PREP/research/debian/raw/tracker/security-tracker.debian.org_tracker_data_json#ncurses.CVE-2025-69720.releases.trixie`; `PREP/research/debian/debian-report.json#part1_runtime.rows[package=libncursesw6].verifierMapping` |
| `R-24-CPYTHON-TEMPFILE` | CPython stdlib tempfile.TemporaryDirectory cleanup race (`cpython:stdlib`, 3.12.15) | CVE-2026-12345 (MEDIUM) | loaded yes; reachable false; stopIfMapped none | Affects the image: the [3.12] backport was reverted before the tag and the image tempfile.py lacks the fix (the CNA range is wrong). tempfile is imported eagerly, but the only TemporaryDirectory() call on the eager import path of the verifier is importlib.resources._common.as_file, which sigstore does not use, and exploitation needs a local attacker modifying the temporary tree during cleanup. Verifier containers use a private tmpfs /tmp. | `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2026-12345].applicability`; `PREP/research/python/python-report.json#item5_cpython.facts[5]` |
| `R-25-CPYTHON-BASE64` | CPython stdlib base64 and binascii decoding (altchars; stop at the first padded quad) (`cpython:stdlib`, 3.12.15) | CVE-2026-3446, CVE-2025-12781 (MEDIUM) | loaded yes; reachable true; stopIfMapped none | Affects the image (no [3.12] backport; fixed only on newer branches). base64 is imported eagerly and decodes bundle fields, so the lenient decoding is reachable from bundle input. The decoded values are inputs to signature, certificate, transparency-log and digest checks, which N-CORRUPT, L-SET and MAL-TSA exercise; exploitability was not analyzed beyond the static call-site review in the research. MEDIUM, so S2 does not apply. | `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2026-3446]`; `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2025-12781]` |
| `R-26-CPYTHON-HTTP-COOKIES` | CPython stdlib http.cookies BaseCookie.js_output() escaping (`cpython:stdlib`, 3.12.15) | CVE-2026-6019 (LOW) | loaded yes; reachable false; stopIfMapped none | Affects the image; http.cookies is imported eagerly through requests.compat, but js_output() is never called by the frozen wheels (only inside http.cookies itself). | `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2026-6019].applicability` |
| `R-27-CPYTHON-IMAPLIB-POPLIB` | CPython stdlib imaplib and poplib command injection (`cpython:stdlib`, 3.12.15) | CVE-2025-15366, CVE-2025-15367 (MEDIUM) | loaded no; reachable false; stopIfMapped none | Affects the image; imaplib and poplib are not imported by sigstore verification (eager closure or upper bound). | `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2025-15366].applicability`; `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2025-15367].applicability` |
| `R-28-CPYTHON-MIMETYPES-WINDOWS` | CPython stdlib mimetypes default known files writable on Windows (`cpython:stdlib`, 3.12.15) | CVE-2024-3220 (LOW) | loaded yes; reachable false; stopIfMapped none | The CNA range includes 3.12.15, but the defect (a user-writable default mime.types path) is Windows-only; mimetypes is imported (urllib3.fields), and the condition does not exist on the Linux image. | `PREP/research/python/python-report.json#item5_cpython.open_or_non_fixed_cves[cve=CVE-2024-3220].applicability` |
| `R-29-CFFI-LIBFFI` | cffi _cffi_backend with statically linked libffi (3.4.6 inferred) (`wheel:cffi`, 2.1.0 (libffi 3.4.6, inferred)) | none (NONE) | loaded no; reachable false; stopIfMapped none | libffi is statically linked (no cffi.libs/). Version 3.4.6 is inferred from the cffi CI configuration at the v2.1.0 tag plus binary markers, not from authenticated provenance (PyPI provenance HTTP 404). No CVE affects 3.4.6, but later upstream hardening (3.5.2, 3.7.0) is absent. _cffi_backend is not statically reachable from the verifier; the wheel is admitted by hash pin (R-30). | `PREP/research/python/python-report.json#item3_cffi_libffi.facts`; `PREP/research/python/python-report.json#verdict.item3_cffi_libffi`; `PREP/research/debian/derived/verifier-static-import-reachability.json#targets._cffi_backend` |
| `R-30-PYPI-HASH-PINS` | 30 unchanged D13 PyPI wheels (also installer, sdist, official rfc3161 wheel and 5 tool wheels) trusted by hash pins only (`wheel:*`, D13 lock and inputs.json pins) | none (NONE) | loaded yes; reachable false; stopIfMapped none | Every wheel equals its PyPI sha256 for the exact filename and none is yanked; admission (exactly one wheel per pin, size and sha256, inert ZIP and RECORD checks) runs before any import, and installs use --validate-record all without index access. No PyPI provenance or attestation is verified (cffi has none; the sdist gitTag and gitCommit come from an unverified attestation), so trust rests on the PyPI-served bytes at capture time and on the release process of each project. 36 of 37 packages have no known advisory; pytest 9.0.2 is remediated (R-09). | `PREP/pins/d09-harness-facts.json#facts[8]`; `PREP/pins/d09-harness-facts.json#facts[14]`; `PREP/research/python/python-report.json#item1_python_packages.facts[2]`; `PREP/research/python/python-report.json#item3_cffi_libffi.facts[5]` |
| `R-31-CRATE-CHACHA20-YANKED` | Rust crate chacha20 compiled into W (through rand 0.10.2) (`crate:chacha20`, 0.10.0 (yanked)) | none (NONE) | loaded yes; reachable false; stopIfMapped none | Yanked on crates.io (reason not stated) but compiled from the unchanged official Cargo.lock; no RustSec or GHSA advisory for 0.10.x. The only documented later fix (0.10.2 changelog) is a correctness fix for an SSE4.1 intrinsic in the SSE2 backend. The lock is not modified (no patch policy). | `PREP/research/crates/crates-report.json#summary.yanked`; `PREP/research/crates/crates-report.json#followUps.yankedLockedCrate.changelog_0_10_2`; `PREP/research/crates/crates-report.json#followUps.yankedLockedCrate.advisories` |
| `R-32-CRATE-ANYHOW` | Rust crate anyhow in Cargo.lock, not compiled for the target (`crate:anyhow`, 1.0.102) | RUSTSEC-2026-0190 (UNKNOWN; fix: 1.0.103) | loaded no; reachable false; stopIfMapped none | Informational (unsound) advisory for Error::downcast_mut(). anyhow is reached only through wasm-only crates (wit-bindgen*, wasm-metadata, wit-component, wit-parser), so it is not compiled into W for x86_64-unknown-linux-gnu; the all-target cargo fetch (B3) downloads and checksum-verifies its .crate but nothing builds it. The official Cargo.lock is not modified. | `PREP/research/crates/crates-report.json#summary.rustsecAffecting`; `PREP/research/crates/crates-report.json#packages[name=anyhow].notCompiledReasons` |
| `R-33-CRATES-NO-ADVISORY-DB` | Rust code outside advisory-database coverage and without declared MSRV: rfc3161-client and tsp-asn1 (local), cryptography-x509 0.50.1 (git), and the local crates inside cryptography 50.0.2 (`crate:rfc3161-client`, rfc3161-client 0.0.1, tsp-asn1 0.0.1, cryptography-x509 0.50.1 (git ffde75a2)) | none (UNKNOWN) | loaded yes; reachable true; stopIfMapped none | These crates parse bundle timestamp data or certificates, but no advisory database covers them. rfc3161-client and tsp-asn1 declare no rust_version (10 compiled crates declare none; the highest declared is 1.85 against rustc 1.85.1); an MSRV failure fails the build closed (STOP), it cannot weaken it. The git checkout must equal ffde75a2 (prepare). | `PREP/research/crates/crates-report.json#summary.undeclaredRustVersionCompiled`; `PREP/research/crates/crates-report.json#packages[name=rfc3161-client].msrvVerdict`; `PREP/research/python/python-report.json#gaps[6]` |
| `R-34-OPENSSL-SRC-BUILD-DEP` | Rust crate openssl-src (vendored OpenSSL 3.6.2 C sources) (`crate:openssl-src`, 300.6.0+3.6.2) | CVE-2026-84782, CVE-2026-45447 (HIGH) | loaded build-only; reachable false; stopIfMapped none | Compiled as an optional build dependency of openssl-sys, but with OPENSSL_NO_VENDOR=1 its C sources are not built and W links the system libcrypto.so.3; the ELF gate (wheel-audit) proves this later: NEEDED subset, PKCS7_verify undefined at OPENSSL_3.0.0 and zero defined OpenSSL symbols, plus S4 (exactly one system libcrypto.so.3 mapped). The 'OpenSSL 3.6' byte check stays but proves nothing here: the vendored build carries only a standalone '3.6.2'. 41 of 61 OpenSSL 3.6 advisories affect 3.6.2, including HIGH CVE-2026-84782 and CVE-2026-45447 (PKCS7_verify use-after-free), which is why the official vendored wheel is rejected (AC-05). Whether a newer openssl-src fixes all of them was not researched; the official Cargo.lock is not modified. | `PREP/research/crates/crates-report.json#packages[name=openssl-src].activatedVia`; `PREP/research/python/python-report.json#item2_openssl.facts[3]`; `PREP/research/crates/crates-report.json#method.limitations[4]` |
| `R-35-BUILD-TOOLCHAIN` | Debian trixie build closure for W (about 82 packages incl. rustc and cargo 1.85.1, maturin 1.8.3, gcc 14, binutils 2.44, python3.13, libexpat1, libllvm19, curl, gnutls, krb5 and ldap stacks, libgit2, libssh2) (`deb:build-closure`, gcc=4:14.2.0-1, binutils=2.44-3, rustc and cargo 1.85.1+dfsg1-1+deb13u1, python3-maturin 1.8.3-1, libc6-dev 2.41-12+deb13u4, libssl-dev 3.5.7-1~deb13u3) | CVE-2026-77214 (HIGH) | loaded build-only; reachable false; stopIfMapped none | Build-only: installed from hash-pinned .debs into fresh build containers that run --network none on hash-pinned inputs (sdist, Cargo.lock-checksummed crates), and W is reproduced (B1 == B2 == W, CI B1 == W). Open tracker records in the closure include binutils (69), curl (25) and expat 2.8.3 (7, incl. CVE-2026-77214 HIGH); none of these sources has a newer fixed version, and no closure package is loaded by the verifier. maturin --compatibility linux makes --auditwheel check a no-op (audit.rs:297, :484), so the ELF gate (wheel-audit) is the real linkage control. The closure was modelled from the Packages index (apt not run); the signed apt capture in D14 is the authority. | `PREP/research/debian/debian-report.json#findings[id=DEB-05].fact`; `PREP/research/debian/debian-report.json#findings[id=DEB-03].fact`; `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=binutils].counts`; `PREP/research/debian/debian-report.json#part2_tracker.closureSources[source=expat]`; `PREP/pins/d09-harness-debian/fetch-records.json#records`; `PREP/checks/main-session-verifications.txt#Debian package versions from saved indexes` |
| `R-36-IMAGE-PROVENANCE` | Docker Official Image python:3.12.15-slim-trixie build provenance (`image:docker.io/library/python`, index sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1) | none (NONE) | loaded yes; reachable false; stopIfMapped none | Identity is pinned by digest (index, manifest, config, diffIds; S5) and the frozen layers were re-hashed, but the in-toto/SPDX attestations of the image were only matched by subject digest: no signature, issuer, TUF or transparency check was run (cryptographicallyAuthenticated false). Trust rests on the digest-addressed bytes served by Docker Hub and on the Official Images build process. | `control/d09-python-linux-preflight-20261010/oci/report.json#provenance.cryptographicallyAuthenticated`; `control/d09-python-linux-preflight-20261010/oci/report.json#provenance.signatureIssuerTUFTransparencyChecks`; `PREP/pins/d09-harness-facts.json#facts[0]` |
| `R-37-WRITABLE-OUT` | Evidence mount /out writable by every container, including verifier subprocesses (`harness:evidence-mount`, .scratch/d09/evidence) | none (NONE) | loaded yes; reachable false; stopIfMapped none | Bounded: code execution inside a verifier container already defeats the outputs of that container, and all code executed there is hash-pinned (image digest, 31 wheels, W, installer, d09.py bound by the receipt). The fresh replay of the gate (--replay) recomputes every outcome, so evidence from an earlier run cannot be reused. The S4 admitted set (manifest-a and manifest-b) is written under /out; passing its sha256 between steps or mounting it read-only is a recommended hardening. | `PREP/review/advisory-review.md#Non-blocking / 7` |
| `R-38-SOLO-OWNER` | Owner = implementer = reviewer (single principal) (`process:governance`, solo owner) | none (NONE) | loaded host-only; reachable false; stopIfMapped none | Owner acceptance of these residuals is owner self-review, labelled owner self-review in the ownerAcceptance record; it is not independent review and not security-owner approval. Independent G1 rows stay pending; D09 grants no G1 to G4 authority. | `PREP/review/advisory-review.md#(6) G1-SO`; `PREP/review/advisory-review.md#B8` |

## Resolved or not applicable (recorded, not residual)

R-09 is no longer a residual: pytest 9.0.2 (CVE-2025-71176) is remediated by the re-pin to 9.0.3.

| ID | Component (package, version) | Advisories (severity) | Loaded / reachable / STOP | Bound / mitigation | Evidence |
|---|---|---|---|---|---|
| `R-09-PYTEST-CVE-2025-71176` | pytest test-only tool wheel (tools venv only) (`wheel:pytest`, 9.0.3 (was 9.0.2)) | CVE-2025-71176, GHSA-6w46-j5rx-g56g, PYSEC-2026-1845 (MEDIUM; fix: 9.0.3) | loaded yes; reachable false; stopIfMapped none | Remediated, not a residual: toolWheels and requirements-tools.txt are re-pinned to pytest 9.0.3 (pytest-9.0.3-py3-none-any.whl, 375249 bytes, sha256 2c5efc45...d5b9); its PyPI JSON (2026-10-10T22:00:54Z) lists no vulnerabilities and its Requires-Dist equals 9.0.2. pytest runs only in the tools venv, never in a capsule. | `PREP/pins/main-session/pypi-records-20261010T220054Z.json#[version=9.0.3].vulnerabilities`; `PREP/pins/main-session/raw/pypi-pytest-9.0.3.json#urls`; `PREP/research/python/python-report.json#item1_python_packages.affected` |
| `R-39-CPYTHON-TARFILE-ZIPFILE-FIXED` | CPython stdlib tarfile link filter and zipfile overlapped-entry checks (`cpython:stdlib`, 3.12.15) | CVE-2026-11940, CVE-2024-0450 (HIGH; fix: 3.12.15 (fix present)) | loaded yes; reachable false; stopIfMapped none | Resolved, not residual: the research classified both NEEDS-REVIEW; the main session read the frozen stdlib layer 6912e23e and found the CVE-2026-11940 fix in refactored form at tarfile.py:2693-2699 and the CVE-2024-0450 fix at zipfile/__init__.py:1693-1703. | `PREP/research/python/python-report.json#item5_cpython.classification_summary`; `PREP/research/python/item5-cpython.json#cves[id=CVE-2026-11940].cna_severity`; `PREP/research/python/item5-cpython.json#cves[id=CVE-2024-0450].cna_severity`; `PREP/checks/main-session-verifications.txt#CVE-2026-11940 (tarfile) fix presence in image stdlib`; `PREP/checks/main-session-verifications.txt#CVE-2024-0450 (zipfile) fix presence` |
| `R-40-GLIBC-NOT-APPLICABLE` | GNU C Library: 2 open records that do not apply to the image (`deb:libc6`, 2.41-12+deb13u4) | CVE-2026-89092, CVE-2026-97399 (MEDIUM) | loaded no; reachable false; stopIfMapped none | Not applicable, not residual: CVE-2026-89092 is in the nscd daemon, which the image does not contain; CVE-2026-97399 affects only the POWER8 strncasecmp implementation, absent from the linux/amd64 image. | `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-89092].classification`; `PREP/research/glibc/glibc-dispositions.json#[id=CVE-2026-97399].classification` |
| `R-41-MAPPED-NO-OPEN-RECORDS` | Mapped libraries without open trixie records: libzstd.so.1 (through libcrypto.so.3) and libgcc_s.so.1 (`deb:libzstd1`, libzstd1 1.5.7+dfsg-1; libgcc-s1 14.2.0-19) | none (NONE) | loaded yes; reachable false; stopIfMapped none | Recorded for completeness, not residual: the raw tracker JSON lists 4 libzstd records, all resolved at or before 1.5.7+dfsg-1; the two open gcc-14 records name libstdc++ only (R-22), not libgcc_s. | `PREP/research/debian/raw/tracker/security-tracker.debian.org_tracker_data_json#libzstd`; `PREP/research/debian/debian-report.json#part1_runtime.rows[package=libzstd1].note`; `PREP/research/debian/debian-report.json#part2_tracker.namedSources[source=gcc-14].openOrAffecting` |

## Dispositions file

`security-dispositions.json` (`d09_security_dispositions_v1`, `capturedAt` as above) lists every item
with `id`, `residual`, `component`, `package` (`deb:`, `deb-source:`, `wheel:`, `crate:`, `cpython:`,
`image:` or a process kind), `version`, `advisories`, `severity` (LOW, MEDIUM, HIGH, CRITICAL, UNKNOWN or
NONE; UNKNOWN = no severity score in the research, either an advisory without a score or code that no
advisory database covers (R-33), NONE = no advisory), `fixAvailable`,
`fixedIn`, `objects`, `loaded`, `reachable`, `mitigation`, `stopIfMapped`, `stop` and `evidence`, and
records the sha256 of every cited file in `sources`.

- `objects` are basename prefixes matched against every file-backed map of every probed verifier
  process.
- `loaded`: `yes` (inside verifier processes), `no` (present in the image, expected never to load in a
  probed verifier process; see the `dpkg-deb` helper below),
  `build-only` (build and fetch containers only) or `host-only` (outside the containers, or a process
  item). All values are static research results until the D14 probes observe them.
- `reachable`: `true` when the affected behaviour can be triggered from network, bundle or tarball input
  or the research does not exclude it; `false` only when the research excludes it or no input path
  exists.
- Disclosed helper exception: `probe-runtime` runs the image's `dpkg-deb` on the hash-pinned libssl3t64
  .deb (input checked against the signed apt capture) and that unprobed helper maps libz, libzstd,
  liblzma 5.8.1-1+deb13u1 (R-11, fix available, not applied) and libbz2 (R-14). No network, bundle or
  tarball input reaches it. The `loaded` values describe probed verifier processes.
- Probe rules: `stopIfMapped` raises that code; `fixAvailable` plus mapped raises S1; severity HIGH,
  CRITICAL or UNKNOWN plus mapped plus `reachable` not false raises S2. `stop: true` STOPs at
  `check-admission` before any container runs.

Known research gaps: runtime maps were NOT-RUN in Phase A (every `loaded`/`reachable` value is static);
InRelease OpenPGP signatures were not verified in Phase A (hash consistency only; the signed apt capture
in D14 is the authority); tracker records of zlib, sqlite3, bzip2, pam, util-linux, ncurses and gcc-14
carry no severity score; readline and gdbm have no tracker records; the zlib import scan (R-10) is a
static main-session scan of the frozen layers and wheels, not a runtime observation.

## Time windows

| Item | Value | Effect |
|---|---|---|
| TUF timestamp v804 | expires 2026-10-16T19:26:11Z | AC-07 needs every expiry > now + 24 h: unless a newer timestamp is published, AC-07 fails after 2026-10-15T19:26:11Z (rule not relaxed). |
| Staging TUF root v14 (embedded) | expires 2026-10-16T19:39:43Z | T-STAGING (AC-10) depends on it; an online refresh from v14 is required. |
| Production TUF root v15 (embedded) | expires 2026-11-20T13:58:18Z | Hard external deadline for every positive. |
| securityEvidence | capturedAt 2026-10-10T20:15:16Z + 168 h = valid until 2026-10-17T20:15:16Z | Afterwards `check-admission` STOPs (S6). A refresh is new research, a new `security-dispositions.json` and a new `dispositionsSha256` (declared data refresh). |
| Older cited advisory inputs (HISTORICAL) | CVE-2026-77214 record fetched 2026-10-09T19:36Z; image pip vendor advisories fetched 2026-10-10T07:45Z | Both predate `capturedAt` and concern components kept out by S3 (R-12, R-17); their own 168 h bounds end 2026-10-16T19:36Z and 2026-10-17T07:45Z, so re-fetch them if those bounds must also hold. |
| D09 PASS valid-until (approved plan) | min(securityEvidence + 168 h, CI run + 72 h, root v15 expiry) | Upper bound of any D09 PASS. |

## Pin provenance

`inputs.json` values come from frozen local evidence, re-hashed 2026-10-11 (VERIFIED-NOW against local
bytes), plus read-only PyPI JSON GETs for wheel URLs (VERIFIED-NOW, 2026-10-11). Raw responses, URLs,
UTC retrieval times and sha256 are kept outside the repository in the D14 preparation namespace
(`control/d14-preparation-20261010-2004/pins/`).

- `repository` pins the PR target: `aultramen/super-compound`, base `feature/standards-qualification`
  at `1ef9c70bce9c763621ff6e1181c773c294725926`, head `feature/d09-source-verification`;
  `otherRunId` 38017280866 is the real other run used by X5.
- `host.nodeVersion` `v24.15.0` equals the ci.yml setup-node pin; `init` STOPs with S5 on any other
  Node.
- `toolWheels` pytest 9.0.3: PyPI JSON GET 2026-10-10T22:00:54Z
  (`pins/main-session/raw/pypi-pytest-9.0.3.json`, sha256
  `cc591fefe6e4a7b22355e88a83c3b28c6b652b0983db43f19066b9912c57689d`, `vulnerabilities: []`);
  Requires-Dist is identical to 9.0.2.
- `build.packages` are exact, including `gcc=4:14.2.0-1` and `binutils=2.44-3`, confirmed against the
  Debian madison listing and the saved trixie Packages indexes (InRelease signature not verified in
  Phase A). The signed apt capture in D14 is the authority.
- `runtime.blockedObjects` adds `legacy.`, `libpam`, `pam_`, `afalg.`, `padlock.` and
  `loader_attic.` (review B6). They cover `ossl-modules/legacy.so`, `engines-3/{afalg,padlock,loader_attic}.so`,
  `libpam.so.0*`, `libpam_misc.so.0*`, `libpamc.so.0*` and the 44 `security/pam_*.so` in
  `runtime.files`. The image's `/etc/ssl/openssl.cnf` (sha256 `a65a2cb9...d6b3`) activates no legacy
  provider: `[provider_sect]` lists only `default = default_sect` (R-16). `libapt-pkg.` (R-10) covers
  `libapt-pkg.so.7.0` and `libapt-pkg.so.7.0.0`, the only admitted importer of the zlib gz* write
  functions.

`PENDING` slots, filled only in D14: `rebuilt.sha256`, `rebuilt.size`, `rebuilt.reportSha256` (from
`prepare`: B1 == B2 == W and the sha256 of `report.json`), `debs` and `debianSuites.snapshot` (from
`prepare --capture`) and `securityEvidence.ownerAcceptance` (owner). `requirements-linux-cp312.txt` is
the D13 lock (sha256 `10ba0202...edb4`) with only the rfc3161-client hash lines replaced by
`--hash=sha256:PENDING_W`.

## How to run

Prerequisites: Docker (classic or containerd image store; `init` records which), Node `v24.15.0`
exactly (`inputs.host.nodeVersion`), git, and for AC-20 the GitHub CLI (2.95.0 observed). Run every
command from the repository root. Large inputs live in `.scratch/d09/inputs/` (gitignored); only compact
pins are bound into receipts.

1. `node .github/qualification/d09/d09.mjs selftest` and `python -I -B .github/qualification/d09/d09.py selftest` (offline).
2. D14 capture and rebuild (slow, outside the recipe): `node .github/qualification/d09/d09.mjs prepare --capture --builds 2`.
   Then copy `.scratch/d09/build/debs.json` (`debs`, `snapshot`) and `report.json` (`W`, `size`) into
   `inputs.json`, set `rebuilt.reportSha256` to the sha256 of `report.json`, replace `PENDING_W` in the
   lock with W, and record the owner's answer as described above. Any change to these files invalidates
   earlier receipts by design. Build note: with maturin 1.8.3, `--compatibility linux` turns
   `--auditwheel check` into a no-op (the linux tag short-circuits the audit; research DEB-03), so the ELF
   gate (`wheel-audit`, AC-04) is the real linkage control.
3. Local qualification: `node .agent/tools/verified-promise.mjs --contract .github/qualification/d09/contract-local.json --replay`.
   The gate replays `recipe-e2e-local.json`, `recipe-challenges.json`, then `recipe-reconcile.json`.
   Before publication `reconcile check` prints `PREPUBLICATION: ...` and AC-20 stays unmet, so the local
   contract is expected to print `COMPLETE_DENIED` until hosted CI exists.
4. Hosted CI: a pull request from a `feature/d09-*` branch runs job `d09-source-verification`
   (`prepare --ci`, then `contract-ci.json --replay`) and uploads `.scratch/d09/evidence/` and
   `.scratch/d09/build/`.
5. Reconcile: `D09_PR=<number>` then replay the local contract again; `reconcile` uses read-only
   `gh api` GETs against the pinned repository and the downloaded CI artifact. This final replay runs in
   a clean checkout of the PR head (reconcile requires HEAD == PR head and no tracked changes). Copy the
   D14 `.scratch/d09/build/` and `.scratch/d09/inputs/` bytes into it (`.scratch/` is ignored, so the
   checkout stays clean); never re-run `prepare` there, because a new `report.json` no longer matches
   `rebuilt.reportSha256` and `check-inputs` STOPs with S5. D14 cleanup must leave no `d09=1` Docker
   resources: a fresh checkout has no own nonces, so `init` fails closed on any leftover.

Verify-only (`--contract ...` without `--replay`) always ends in `COMPLETE_DENIED ... fresh replay
required` because both contracts set `replayRequired: true`.

## Evidence layout

`.scratch/d09/evidence/`: receipts and outcomes per recipe, `steps/`, `logs/`, `cases/`, `probes/`,
`tuf-*.json`, `manifest-*.json`, `regression/`, `fast/`, `challenges/`, `reconcile/`. Every evidence
file is at most 4 MiB, carries the run nonce, and every outcome writes counts with total > 0. Docker
resources are labelled `d09=1` and `d09.run=<nonce>`; `cleanup` removes only the current nonce, and
`init` deletes leftovers only for nonces this checkout recorded itself, otherwise it fails closed and
lists them.

## Rollback

Delete `.github/qualification/d09/` and the `d09-source-verification` job from
`.github/workflows/ci.yml`, then remove `.scratch/d09/` and only the Docker containers and volumes
labelled with this checkout's own run nonces. This does not revert the opt-in replay gate change in
`.agent/tools/` (`verification-recipe.mjs`, `verified-promise.mjs` and their tests), which the same
patch adds; rolling that back means restoring the five changed `.agent/tools` files to `1ef9c70`.
Contracts without `replayRequired` behave as
before the gate change, and no other CI job depends on this harness.
