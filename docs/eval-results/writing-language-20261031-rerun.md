# Writing Language Eval Results, 2026-10-31 Re-run

## Summary

Re-run of `docs/eval-results/writing-language-20261031.md` against the merged
policy text. The first run predates the standing-instruction wording in
`.agent/context/writing-language.md` ("An explicit language instruction applies
to its own request. A standing instruction ... counts as step 1 for later
requests until the user changes it."). This run uses the shipped wording and
adds S9, which tests that wording directly. Claude Code CLI and Codex CLI pass
all 9 scenarios. Antigravity is UNVERIFIED because it has no CLI. An agent
graded each response by semantic review of the language and the literals; no
automatic language detector was used. Each scenario ran once per host.

Policy digest (sha256 of `.agent/context/writing-language.md`, commit `4f6aa1e`):
`0a5807492a14b17f4130274ca510dd00318149cbe3625070006b9821acf19bf4`.

| Scenario | Expected | Claude Code 2.1.316 | Codex CLI 0.162.1 | Antigravity |
| --- | --- | --- | --- | --- |
| S1 Indonesian | Indonesian | PASS | PASS | UNVERIFIED |
| S2 English | English | PASS | PASS | UNVERIFIED |
| S3 mixed | Indonesian | PASS | PASS | UNVERIFIED |
| S4 explicit | Indonesian | PASS | PASS | UNVERIFIED |
| S5 code and link only | English | PASS | PASS | UNVERIFIED |
| S6 switch (2 turns) | Indonesian, then English | PASS | PASS | UNVERIFIED |
| S7 new artifact | French | PASS | PASS | UNVERIFIED |
| S8 resume (2 turns) | Japanese, both turns | PASS | PASS | UNVERIFIED |
| S9 standing instruction (2 turns) | English, both turns | PASS | PASS | UNVERIFIED |

Evidence directory: `docs/eval-results/writing-language-20261031-rerun/`. Files:
`prompts/S9a.txt`, `prompts/S9b.txt`, `<host>-<id>.txt` (response),
`<host>-<id>.cmd` (command and exit code), `codex-<id>.log` (Codex event log with
session id and `Codex v0.162.1`), `claude-version.txt` (`claude --version`
output), `run-start.txt`, `run-end.txt` (UTC), `git-status-after.txt`. The
S1 to S8 prompts were byte-identical copies of
`docs/eval-results/writing-language-20261031/prompts/<id>.txt` (checked with
`cmp`) and were removed after the run because `framework-audit.mjs` flags exact
duplicate files; the `.cmd` files still name the deleted `rerun/prompts/<id>.txt`
paths. To reproduce S1 to S8, read the prompt from the original directory
instead. Empty `claude-<id>.err` files were removed; all Claude calls exited 0.

## Commands

Working directory: `D:\BATI\Development\framework\.sc-worktrees\sc-ste100-output`
at `7704023` plus the uncommitted eval files. Runner: Git Bash script, 180 s
timeout per call, prompts from UTF-8 files on stdin. Run window
2026-10-31T14:00:09Z to 2026-10-31T14:11:48Z.

- Claude Code: `claude -p --permission-mode plan < prompts/<id>.txt`. Two-turn:
  turn 1 with `--session-id <uuid>`, turn 2 with `--resume <uuid>`.
- Codex: `codex exec --sandbox read-only -C <worktree> -o codex-<id>.txt - < prompts/<id>.txt`.
  Two-turn: `codex exec resume --last -c sandbox_mode="read-only" -o codex-<id>.txt -`.
- Antigravity: no CLI entry point; only the GUI is installed.

All 24 calls returned `exit=0`.

## Results

Excerpts are verbatim from the response files.

### S1 Indonesian

- Claude: "`/sc-status` = dashboard read-only + router. Sumber: `.agent/workflows/sc-status.md`."
- Codex: "`/sc-status` menampilkan **ringkasan posisi proyek atau sesi saat ini**"

### S2 English

- Claude: "`/sc-status` = read-only orientation dashboard. Defined in `.agent/workflows/sc-status.md`."
- Codex: "`/sc-status` gives a read-only overview of the project so you can resume work."

### S3 mixed (instruction language Indonesian)

- Claude: "Untuk kerja terbatas dan reversibel: bug fix, refactor, config". Literals `T1`..`T5`, `ESCALATE: T<n>`, `BRD -> PRD -> FSD -> GOAL`, `delivery_mode: auto` kept.
- Codex: "**Bedanya ada di cakupan dan risiko perubahan.**" `BRD → PRD → FSD → GOAL` kept.

### S4 explicit Indonesian

- Claude: "`/sc-plan` mengubah PRD yang sudah disetujui menjadi FSD (Functional Specification Document)". `GOAL-*`, `CONTRACT_ENABLER`, `FIRST_VERTICAL_SLICE`, `HARDENING` kept. Three numbered lines.
- Codex: "`/sc-plan` mengubah PRD yang disetujui menjadi FSD sebagai acuan teknis implementasi." Three lines.

### S5 code block and URL only

- Claude: "Lint result: structural pass, exit 0. Output: `No structural findings; content review still required.`" Then an English plan for a README wording pass; plan mode wrote the plan to `~/.claude/plans/`, not to the repository.
- Codex: "The lint command could not start. The execution tool failed twice with `helper_unknown_error: setup refresh had errors`." English fallback PASS.

### S6 switch

- Claude turn 1: "`/sc-status` = dashboard read-only untuk orientasi sesi." Turn 2: "`/sc-review` = read-only code review of a diff, branch, or files against spec and engineering standards."
- Codex turn 1: "`/sc-status` menampilkan ringkasan kondisi proyek". Turn 2: "`/sc-review` checks code changes against requirements and engineering standards". Same session id `01a1924a-e1e3-7630-ab2b-3197a616eaff` in both logs.

### S7 new artifact, French

- Claude: "# GOAL-001 - Page de connexion fonctionnelle" and "Chat seul, rien écrit sur disque."
- Codex: "GOAL — Permettre à l’utilisateur de se connecter à son compte." Five lines, `GOAL` kept.

### S8 resume, Japanese

- Claude turn 1: "`/sc-status` は読み取り専用の「現在地確認」ワークフローです。" Turn 2: "`/sc-pause` は `/sc-status` の対になる「セッション終了時の引き継ぎ保存」ワークフローです。" `ERR-*`, `LRN-*`, `docs/STATE.md`, `# Continue Here` kept.
- Codex turn 1: "`/sc-status` は、**現在の作業状況を確認し、次に進むワークフローを1つ示すコマンド**です。" Turn 2: "`/sc-pause` は、**作業を中断する前に、次のセッションへ引き継ぐ情報を保存するコマンド**です。" Same session id `01a1924b-852a-7670-8c3d-54e1c544a569`.

### S9 standing instruction, English

Turn 1 is Indonesian with a standing instruction ("Mulai sekarang selalu jawab
dalam bahasa Inggris"). Turn 2 is Indonesian only ("Dan /sc-pause?"). The policy
says the standing instruction counts as step 1 for later requests, so both turns
must be English even though step 2 (request language) would give Indonesian.

- Claude turn 1: "`/sc-hints` is read-only consultation workflow. Source: `.agent/workflows/sc-hints.md`". Turn 2: "`/sc-pause` = session handoff. Save compact state so later session resumes." Both English; `ERR-*`, `LRN-*`, `# Continue Here`, `Evidence of Completion` kept.
- Codex turn 1: "I’ll answer in English from now on." then "`/sc-hints` gives **practical advice based on project evidence** and recommends the next command." Turn 2: "`/sc-pause` **saves the current work context so you can stop and resume in a later session**." Same session id `01a1924c-4fa9-7bf0-84b7-aa0a43bbb6ba`.

Verdict: PASS on both hosts. The standing instruction persisted across the
resumed turn on both hosts, which matches the merged wording.

### Machine literals

In all 24 responses, command names, flags, file paths, IDs and status values
stay in English. No response translated a command name or ID.

### No file edits

`git-status-after.txt` lists only the three files edited by the eval author
before the run (`.agent/evals/writing-language.md`, `CHANGELOG.md`,
`docs/eval-results/writing-language-20261031.md`) and the new evidence
directory. The hosts made no edits. The two `.agent/benchmarks/*.after.json`
files changed later, when `npm run audit` ran after the capture, so they are
absent from that file by design.

## Limitations

- One run per scenario per host. No variance data.
- Grading is a semantic judgment by an agent, not a deterministic detector.
- Codex logs show repeated MCP transport errors
  (`http://127.0.0.1:5199/api/external-mcp/mcp`) in every run and
  `helper_unknown_error: setup refresh had errors` from the sandbox shell in
  nine runs. Language results are still valid; Codex answered from file reads.
- Claude Code ran with the user's global config, plugins and hooks, which can
  influence output. In S5 Claude noticed the uncommitted CHANGELOG edit made
  while the run was in progress; this did not affect the language verdict.
- S6 turn 1 used `Apa fungsi /sc-status di framework ini? Jawab singkat.`
- Antigravity is UNVERIFIED: no CLI entry point.
- This eval does not check ASD-STE100 compliance.
