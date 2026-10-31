# Writing Language Eval Results, 2026-10-31 Gemini CLI

## Summary

Third-host attempt for `.agent/evals/writing-language.md`. Target: Gemini CLI
0.47.0 as a scripted stand-in for Antigravity, which has no headless entry
point. The framework ships a `gemini` host adapter in `.agent/tools/setup.mjs`
(GEMINI.md overview block plus `.gemini/commands/*.toml`), so a Gemini CLI run
would exercise that adapter on a real host.

Result: all 9 scenarios are UNVERIFIED. Gemini CLI could not authenticate on
this machine. The auth probe `gemini -p "Reply with OK"` exited 1 before any
prompt reached a model, with `IneligibleTierError` (`reasonCode:
'UNSUPPORTED_CLIENT'`, tier `Gemini Code Assist for individuals`). No scenario
prompt was sent, so there are no response files and no verdicts. Nothing in
this document is a model response.

Policy digest (sha256 of `.agent/context/writing-language.md`, last changed in
`4f6aa1e`): `0a5807492a14b17f4130274ca510dd00318149cbe3625070006b9821acf19bf4`.
Same digest as the re-run document, so the policy text is unchanged.

| Scenario | Expected | Gemini CLI 0.47.0 | Antigravity IDE |
| --- | --- | --- | --- |
| S1 Indonesian | Indonesian | UNVERIFIED (auth) | UNVERIFIED |
| S2 English | English | UNVERIFIED (auth) | UNVERIFIED |
| S3 mixed | Indonesian | UNVERIFIED (auth) | UNVERIFIED |
| S4 explicit | Indonesian | UNVERIFIED (auth) | UNVERIFIED |
| S5 code and link only | English | UNVERIFIED (auth) | UNVERIFIED |
| S6 switch (2 turns) | Indonesian, then English | UNVERIFIED (auth) | UNVERIFIED |
| S7 new artifact | French | UNVERIFIED (auth) | UNVERIFIED |
| S8 resume (2 turns) | Japanese, both turns | UNVERIFIED (auth) | UNVERIFIED |
| S9 standing instruction (2 turns) | English, both turns | UNVERIFIED (auth) | UNVERIFIED |

Claude Code and Codex verdicts stay as recorded in
`docs/eval-results/writing-language-20261031-rerun.md`; this run did not
repeat them.

Evidence directory: `docs/eval-results/writing-language-20261031-gemini/`.
Files: `gemini-version.txt` (`gemini --version`), `gemini-auth-probe.cmd`
(probe command and exit code), `gemini-auth-probe.txt` (full stdout and stderr
of the probe, including the stack trace), `run-start.txt` and `run-end.txt`
(UTC). No `prompts/` directory: no new prompt was written, because no prompt
was sent. No `gemini-S<n>.txt` files exist for the same reason.

## Commands

Working directory: `D:\BATI\Development\framework\.sc-worktrees\sc-eval-gemini`
at `4867df3`. Shell: Git Bash. Run window 2026-10-31T14:38:54Z to
2026-10-31T14:39:05Z.

Planned per-scenario command (not executed):
`gemini -p --approval-mode plan -o text --skip-trust < prompts/<id>.txt`, 180 s
timeout, turn 2 of S6, S8 and S9 with `--resume latest`.

Executed:

- `gemini --version` -> `0.47.0`, exit 0.
- `gemini -p "Reply with OK" --approval-mode plan -o text --skip-trust` -> exit 1.

Auth error, verbatim from `gemini-auth-probe.txt` (stack frames omitted here,
present in the file):

```
Error authenticating: IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals. To continue using Gemini, please migrate to the Antigravity suite of products: https://antigravity.google
  ineligibleTiers: [
    {
      reasonCode: 'UNSUPPORTED_CLIENT',
      reasonMessage: 'This client is no longer supported for Gemini Code Assist for individuals. To continue using Gemini, please migrate to the Antigravity suite of products: https://antigravity.google',
      tierId: 'free-tier',
      tierName: 'Gemini Code Assist for individuals'
    }
  ]
}
```

Alternative credentials checked before stopping: `~/.gemini/settings.json` has
`security.auth.selectedType: "oauth-personal"` only; `GEMINI_API_KEY`,
`GOOGLE_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI` and `GOOGLE_CLOUD_PROJECT` are all
unset. No other auth path was available, and none was added for this run.

## Results

No results. No scenario ran. Excerpt sections, the machine-literal check and
the no-file-edits check cannot be filled from evidence and are therefore
omitted rather than inferred.

## Provisioning Notes

- GEMINI.md: the repository root has no `GEMINI.md`, and Gemini CLI loads
  context from `GEMINI.md` files, not `AGENTS.md`. The plan was to generate a
  root `GEMINI.md` for the run from the `overview` string in
  `.agent/tools/setup.mjs` (host `gemini`), uncommitted, deleted afterwards.
  This step was not reached: the auth error happens in `_doSetupUser` before
  any context file is read. `GEMINI.md` was never created; `git status` shows
  only the eval files.
- Whether Gemini CLI picks up `AGENTS.md` without a `GEMINI.md` is therefore
  also unverified by execution.
- User-level `~/.gemini/GEMINI.md` exists and contains unrelated
  codebase-memory-mcp text; the `SessionStart` hook echo appears in the probe
  output. Neither influenced a model response, because none was produced.

## Limitations

- Gemini CLI 0.47.0 with `oauth-personal` auth is rejected by the Google
  backend (`UNSUPPORTED_CLIENT`, free tier). A paid tier, an API key
  (`GEMINI_API_KEY`) or Vertex AI credentials may unblock it; none were
  available to the eval author. Re-run this document when one is.
- Antigravity IDE itself remains UNVERIFIED by execution: it is a GUI with no
  headless CLI (`which antigravity agy` found nothing in the earlier runs), so
  no scripted, repeatable prompt-in/response-out path exists. The Google error
  message above points users to Antigravity, which confirms the two products
  are now on separate access paths, so a Gemini CLI result would still not
  have been a direct Antigravity result.
- The framework `gemini` adapter output (GEMINI.md block and TOML commands) is
  covered by setup tests only, not by a live host in this run.
- Grading in this eval series is a semantic judgment by an agent; a single run
  per scenario per host. Both caveats are moot here because no response exists.
- This eval does not check ASD-STE100 compliance.
