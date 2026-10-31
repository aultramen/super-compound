# Writing Language Eval Results, 2026-10-31

## Summary

Spec: `.agent/evals/writing-language.md`. Policy under test:
`.agent/context/writing-language.md` and the `AGENTS.md` human-output line.
Claude Code CLI and Codex CLI pass all 8 scenarios. Antigravity is UNVERIFIED
because it has no CLI. An agent graded each response by semantic review of the
language and the literals; no automatic language detector was used. Each
scenario ran once per host.

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

Evidence directory: `docs/eval-results/writing-language-20261031/`. Files:
`prompts/<id>.txt`, `<host>-<id>.txt` (response), `<host>-<id>.cmd` (command and
exit code), `claude-<id>.err` (empty stderr files removed before commit; all Claude runs exited 0), `codex-<id>.log` (Codex event log with session id).

## Commands

Working directory: `D:\BATI\Development\framework\.sc-worktrees\sc-ste100-output`.
Runner: Git Bash script, 180 s timeout per call, prompts from UTF-8 files on stdin.

- Claude Code: `claude -p --permission-mode plan < prompts/<id>.txt`. Two-turn:
  turn 1 with `--session-id <uuid>`, turn 2 with `--resume <uuid>`.
- Codex: `codex exec --sandbox read-only -C <worktree> -o codex-<id>.txt - < prompts/<id>.txt`.
  Two-turn: `codex exec resume --last -c sandbox_mode="read-only" -o codex-<id>.txt -`.
- Antigravity: `which antigravity agy` found nothing. Only the GUI
  `Antigravity.exe` is installed, so no scripted run exists.

All 20 calls returned `exit=0`.

## Results

Excerpts are verbatim from the response files.

### S1 Indonesian

- Claude: "`/sc-status` menunjukkan posisi kerja saat ini dan memilih langkah berikutnya. Workflow ini hanya membaca."
- Codex: "`/sc-status` menampilkan **ringkasan kondisi proyek atau sesi**"

### S2 English

- Claude: "`/sc-status` is a read-only workflow that shows where the project and session stand, then names one next workflow to run."
- Codex: "`/sc-status` gives a read-only overview of the current project or session."

### S3 mixed (instruction language Indonesian)

- Claude: "Framework memilih tier sendiri untuk setiap request (`delivery_mode: auto`)." Literals `T1`..`T5`, `ESCALATE: T<n>`, `BRD -> PRD -> FSD -> GOAL` kept.
- Codex: "**Light-tier**: proses ringkas untuk perubahan kecil dengan cakupan jelas." Also: "Pembacaan repo gagal, jadi batas resmi light-tier belum terverifikasi." Language PASS; content is shallow because the sandbox shell failed.

### S4 explicit Indonesian

- Claude: "`/sc-plan` menerima PRD yang sudah disetujui. Hasil utamanya adalah FSD di `docs/fsd/fsd-<feature>.md`". `READY_FOR_SLICE`, `GOAL-*`, `OPEN-*` kept.
- Codex: "`/sc-plan` mengubah PRD yang telah disetujui menjadi FSD sebagai acuan implementasi teknis." Three lines as asked.

### S5 code block and URL only

- Claude: "`doc-lint.mjs` found no problems in `README.md`." Program output quoted verbatim: "No structural findings; content review still required." Says "STE-inspired, not validated".
- Codex: "The lint check could not run. The terminal failed to start on both attempts: `helper_unknown_error: setup refresh had errors`." English fallback PASS.

### S6 switch

- Claude turn 1: "`/sc-status` adalah workflow yang hanya membaca." Turn 2: "`/sc-review` is a read-only workflow that reviews code changes."
- Codex turn 1: "`/sc-status` menampilkan posisi proyek saat ini". Turn 2: "`/sc-review` checks code changes against the requested specification and engineering standards." Same session id `01a19222-dd4c-7991-956a-7df3b31b8362` in both logs.

### S7 new artifact, French

- Claude: "GOAL-001 — Connexion utilisateur par e-mail et mot de passe" and "Je n'ai créé aucun fichier : le squelette reste ici, dans le chat."
- Codex: "GOAL-001 — Permettre à l’utilisateur de se connecter à son compte." Paths `/login`, `/dashboard` and ID `GOAL-001` kept.

### S8 resume, Japanese

- Claude turn 1: "`/sc-status` は**読み取り専用の状況確認ワークフロー**です。" Turn 2: "`/sc-pause` は、**セッションを止めるときに引き継ぎ情報を保存するワークフロー**です。" `ERR-*`, `LRN-*`, `docs/STATE.md` and the `# Continue Here` block kept.
- Codex turn 1: "`/sc-status` は、**プロジェクトの現在地と次の作業を確認するコマンド**です。" Turn 2: "`/sc-pause` は、**作業を中断し、次のセッションで再開するための引き継ぎを保存するコマンド**です。" Same session id `01a19223-8e68-7172-9e47-2861fdded1d4`.

### Machine literals

In all 20 responses, command names, flags, file paths, IDs and status values
stay in English. No response translated a command name or ID.

### No file edits

`git-status-after.txt` lists only files with modification times before the
first run (20:18 +0700) plus the new eval files. The hosts made no edits.

## Limitations

- One run per scenario per host. No variance data.
- Grading is a semantic judgment by an agent, not a deterministic detector.
- Codex logs show repeated MCP transport errors (`http://127.0.0.1:5199`) and,
  in S3 and S5, a sandbox shell failure. Language results are still valid;
  content depth in those two responses is limited.
- Claude Code ran with the user's global config, plugins and hooks, which can
  influence output.
- S6 turn 1 used `Apa fungsi /sc-status di framework ini? Jawab singkat.`
- Antigravity is UNVERIFIED: no CLI entry point.
- This eval does not check ASD-STE100 compliance.

## Fix follow-up

After this run, `.agent/context/writing-language.md` replaced the line "An explicit
language request persists until a new relevant instruction changes it" with: an
explicit instruction applies to its own request; a standing instruction (for
example "always reply in English") counts as step 1 until the user changes it.
This matches the S4 and S6 verdicts above. The scenarios were not re-run.
