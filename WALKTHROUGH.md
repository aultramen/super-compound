# Super Compound ⚛️ — Tutorial Lengkap

> **Dari Basic hingga Advanced — Panduan penggunaan framework Super Compound untuk AI-assisted development.**

Tutorial ini akan memandu Anda mulai dari instalasi, konfigurasi dasar, hingga penggunaan fitur-fitur advanced Super Compound. Setiap bagian dilengkapi dengan contoh case nyata agar mudah dipahami.

---

## Daftar Isi

- [Bagian 1: Basic — Instalasi & Konfigurasi](#bagian-1-basic--instalasi--konfigurasi)
  - [1.1 Apa Itu Super Compound?](#11-apa-itu-super-compound)
  - [1.2 Instalasi](#12-instalasi)
  - [1.3 Konfigurasi Project](#13-konfigurasi-project)
  - [1.4 Preset — Quick Start](#14-preset--quick-start)
  - [1.5 Auto-Detect — Smart Suggestion](#15-auto-detect--smart-suggestion)
- [Bagian 2: Intermediate — Workflow & Skills](#bagian-2-intermediate--workflow--skills)
  - [2.1 Core Workflow Pipeline](#21-core-workflow-pipeline)
  - [2.2 Workflow: Brainstorm](#22-workflow-brainstorm)
  - [2.3 Workflow: Plan](#23-workflow-plan)
  - [2.4 Workflow: Work](#24-workflow-work)
  - [2.5 Workflow: Review](#25-workflow-review)
  - [2.6 Workflow: Compound](#26-workflow-compound)
  - [2.7 Workflow: Launch (Full Pipeline)](#27-workflow-launch-full-pipeline)
  - [2.8 Workflow: Debug](#28-workflow-debug)
  - [2.9 Workflow: Reload](#29-workflow-reload)
- [Bagian 3: Advanced — Skills Deep Dive](#bagian-3-advanced--skills-deep-dive)
  - [3.1 Test-Driven Development (TDD)](#31-test-driven-development-tdd)
  - [3.2 Systematic Debugging](#32-systematic-debugging)
  - [3.3 Verification Before Completion](#33-verification-before-completion)
  - [3.4 Architecture Enforcement](#34-architecture-enforcement)
  - [3.5 Knowledge Compounding](#35-knowledge-compounding)
  - [3.6 Code Review](#36-code-review)
- [Bagian 4: Real-World Case Studies](#bagian-4-real-world-case-studies)
  - [Case 1: Membangun REST API dengan FastAPI](#case-1-membangun-rest-api-dengan-fastapi)
  - [Case 2: Debugging Production Bug](#case-2-debugging-production-bug)
  - [Case 3: Full-Stack Feature dengan Next.js (Launch Pipeline)](#case-3-full-stack-feature-dengan-nextjs-launch-pipeline)
- [Bagian 5: Tips & Best Practices](#bagian-5-tips--best-practices)

---

## Bagian 1: Basic — Instalasi & Konfigurasi

### 1.1 Apa Itu Super Compound?

Super Compound adalah framework untuk **AI-assisted development** di **Antigravity IDE** dan **Claude Code**. Super Compound mengajarkan AI assistant Anda untuk bekerja secara disiplin:

- ✅ Menulis test sebelum kode (TDD)
- ✅ Mendiagnosis root cause sebelum fixing bug
- ✅ Memverifikasi sebelum mengklaim selesai
- ✅ Mendokumentasikan solusi untuk referensi masa depan
- ✅ Menegakkan arsitektur yang bersih

**Filosofi utama:**

| Prinsip | Penjelasan |
|---------|------------|
| Evidence > Claims | Jalankan verifikasi, baru klaim selesai |
| Root Cause > Quick Fix | Diagnosis dulu, baru perbaiki |
| Test First > Test After | Test gagal membuktikan test Anda benar |
| YAGNI + DRY | Bangun hanya yang diperlukan, jangan duplikasi |
| Plan > Code | Pikirkan sebelum implementasi |
| Knowledge Compounds | Dokumentasikan solusi untuk masa depan |

### 1.2 Instalasi

Super Compound hidup di dalam folder `.agent/` di root project Anda.

#### Antigravity IDE — Windows (PowerShell)

```powershell
# Masuk ke root project Anda
cd C:\path\to\your-project

# Copy seluruh folder .agent
Copy-Item -Recurse "path\to\SUPER-COMPOUND\.agent" -Destination ".\.agent" -Force
```

#### Antigravity IDE — Linux / macOS (Bash)

```bash
cd /path/to/your-project
cp -r /path/to/SUPER-COMPOUND/.agent ./.agent
```

#### Claude Code

Untuk Claude Code, copy `.agent/` dan juga `SUPER-COMPOUND.md` ke root project:

```bash
cp -r /path/to/SUPER-COMPOUND/.agent ./.agent
cp /path/to/SUPER-COMPOUND/SUPER-COMPOUND.md ./SUPER-COMPOUND.md
```

#### Struktur Setelah Instalasi

```
your-project/
├── .agent/
│   ├── rules/              ← 3 file aturan
│   │   ├── SUPER-COMPOUND.md     ← Filosofi inti, skills, workflows, git
│   │   ├── project-config.md  ← Konfigurasi tech stack + presets
│   │   └── quality-gates.md   ← Verifikasi, knowledge, arsitektur
│   ├── workflows/          ← 6 workflow commands
│   │   ├── brainstorm.md
│   │   ├── plan.md
│   │   ├── work.md
│   │   ├── review.md
│   │   ├── compound.md
│   │   ├── debug.md
│   │   ├── launch.md
│   │   └── reload.md
│   └── skills/             ← 9 development skills
│       ├── architecture-enforcement/
│       ├── brainstorming/
│       ├── writing-plans/
│       ├── executing-plans/
│       ├── test-driven-development/
│       ├── systematic-debugging/
│       ├── verification-before-completion/
│       ├── knowledge-compounding/
│       └── code-review/
└── README.md
```

### 1.3 Konfigurasi Project

Buka file `.agent/rules/project-config.md` dan isi sesuai project Anda.

**Ada 3 cara konfigurasi:**

| Opsi | Cara | Cocok Untuk |
|------|------|-------------|
| **A. Preset** | Pilih salah satu dari 10 preset | Quick start dengan stack populer |
| **B. Auto-Detect** | Biarkan field kosong — AI menyarankan | Project baru, belum yakin stack |
| **C. Manual** | Isi setiap field sendiri | Setup kustom atau unik |

#### Contoh Konfigurasi Manual

```yaml
# ═══ IDENTITY ═══
project_name: "toko-online"
project_type: "fullstack"
api_style: "rest"

# ═══ FRONTEND ═══
frontend:
  framework: "nextjs"
  language: "typescript"
  styling: "tailwind"
  component_library: "shadcn"

# ═══ BACKEND ═══
backend:
  framework: "nextjs"
  language: "typescript"
  orm: "prisma"

# ═══ DATABASE ═══
database:
  primary: "postgresql"
  cache: "none"
  migration_tool: "prisma-migrate"

# ═══ COMMANDS ═══
dev_command: "pnpm dev"
test_command: "pnpm vitest run"
lint_command: "pnpm eslint ."
build_command: "pnpm build"

# ═══ Super Compound BEHAVIOR ═══
git_workflow: "branch"
tdd_mode: "balanced"
default_execution: "sequential"
```

### 1.4 Preset — Quick Start

Super Compound menyediakan **10 preset** siap pakai. Cukup uncomment/copy preset yang sesuai:

| # | Preset | Stack | Arsitektur |
|---|--------|-------|------------|
| 1 | **Next.js Fullstack** | TS + Tailwind + Shadcn + Prisma + PostgreSQL | Modular |
| 2 | **React + Express** | TS + Vite + Prisma + PostgreSQL + Redis | Layered |
| 3 | **Vue / Nuxt** | TS + Tailwind + Prisma + PostgreSQL | Modular |
| 4 | **Python FastAPI** | SQLAlchemy + PostgreSQL + Redis | Clean |
| 5 | **Python Django** | Django ORM + PostgreSQL + Redis | MVC + Service |
| 6 | **Go Gin** | GORM + PostgreSQL + Redis | Standard Go |
| 7 | **PHP Laravel** | Eloquent + MySQL + Redis | MVC + Service |
| 8 | **SvelteKit** | Drizzle + SQLite + Lucia | Modular |
| 9 | **React Native** | Expo + SQLite | Modular |
| 10 | **General (Blank)** | Template kosong | — |

#### Contoh: Menggunakan Preset FastAPI

Copy konfigurasi preset 4 ke `project-config.md`:

```yaml
project_type: "backend"
api_style: "rest"
backend:
  framework: "fastapi"
  language: "python"
  orm: "sqlalchemy"
  api_docs: "swagger"
database:
  primary: "postgresql"
  cache: "redis"
  migration_tool: "alembic"
container: "docker"
package_manager: "uv"
dev_command: "uvicorn app.main:app --reload"
test_command: "pytest -v --cov"
lint_command: "ruff check . && mypy ."
architecture: "clean"
tdd_mode: "balanced"
```

### 1.5 Auto-Detect — Smart Suggestion

Jika Anda biarkan field konfigurasi kosong, Super Compound akan otomatis menyarankan stack yang optimal.

**Proses Auto-Detect:**

1. **ANALYZE** — Analisis requirements dari request Anda
2. **EVALUATE** — Evaluasi berdasarkan 7 kriteria: performance, security, DX, type safety, ecosystem, scalability, deployment
3. **RECOMMEND** — Rekomendasikan stack terbaik dengan alasan
4. **CONFIRM** — Menunggu persetujuan Anda sebelum lanjut

#### Contoh Case: Auto-Detect dalam Aksi

Anda mengetik: *"Buatkan dashboard analytics untuk monitoring penjualan real-time"*

AI akan merespons:

```
📋 Project config kosong. Berdasarkan requirements Anda, saya merekomendasikan:

┌─────────────────────────────────────────────┐
│  Suggested Stack: Next.js Fullstack         │
├─────────────────────────────────────────────┤
│  Frontend  : Next.js + TypeScript           │
│  Backend   : API Routes + Prisma            │
│  Database  : PostgreSQL                     │
│  Auth      : JWT via better-auth            │
├─────────────────────────────────────────────┤
│  Why: Dashboard SaaS → best DX + real-time  │
└─────────────────────────────────────────────┘

1. ✅ Gunakan stack ini
2. 🔄 Sarankan alternatif
3. ✏️  Saya konfigurasi manual
4. 📋 Tampilkan semua preset
```

---

## Bagian 2: Intermediate — Workflow & Skills

### 2.1 Core Workflow Pipeline

Super Compound memiliki **pipeline pengembangan** yang terstruktur:

```
💡 Brainstorm → 📋 Plan → ⚡ Work → 🔍 Review → 📚 Compound
      ↑                                               ↓
      └──────── Knowledge feeds back ──────────────────┘
```

Setiap fase bisa dijalankan secara independen atau sebagai pipeline lengkap via `/launch`.

| Fase | Command | Fungsi |
|------|---------|--------|
| 💡 Brainstorm | `/brainstorm` | Eksplorasi ide, tanya jawab, 2-3 pendekatan |
| 📋 Plan | `/plan` | Research codebase, pilih kedalaman, buat task |
| ⚡ Work | `/work` | Eksekusi task dengan TDD, commit incremental |
| 🔍 Review | `/review` | Review multi-perspektif, klasifikasi severity |
| 📚 Compound | `/compound` | Dokumentasikan solusi di `docs/solutions/` |
| 🚀 Launch | `/launch` | Pipeline penuh dengan approval di setiap gate |

### 2.2 Workflow: Brainstorm

**Kapan digunakan:** Ide fitur baru, requirements belum jelas, keputusan arsitektur.

**Command:** `/brainstorm [deskripsi ide]`

**Proses:**

```
Phase 0: Assess    → Apakah brainstorm diperlukan?
Phase 1: Understand → Research codebase + tanya jawab SATU PER SATU
Phase 2: Explore   → Presentasikan 2-3 pendekatan dengan trade-offs
Phase 3: Design    → Presentasikan desain per bagian (200-300 kata)
Phase 4: Capture   → Simpan ke docs/brainstorms/YYYY-MM-DD-<topic>.md
```

#### 📌 Contoh Case: Brainstorm Fitur Notifikasi

```
Anda: /brainstorm Saya ingin menambahkan sistem notifikasi ke aplikasi

AI: Saya menggunakan brainstorming skill untuk mengeksplorasi ide ini.

    Saya menemukan beberapa pola yang ada di codebase Anda...

    Pertanyaan 1: Jenis notifikasi apa yang Anda butuhkan?
    a) In-app notification saja (bell icon)
    b) Email notification
    c) Push notification (mobile)
    d) Kombinasi

Anda: a) In-app notification saja

AI: Pertanyaan 2: Apakah notifikasi perlu real-time (langsung muncul)
    atau cukup saat user refresh?
    a) Real-time (WebSocket/SSE)
    b) Polling (cek setiap N detik)
    c) Saat refresh saja

Anda: a) Real-time

AI: Berdasarkan jawaban Anda, saya rekomendasikan 2 pendekatan:

    Pendekatan A: Server-Sent Events (SSE) ✅ Rekomendasi
    + Sederhana, unidirectional, HTTP native
    + Cocok untuk notifikasi (server → client)
    - Tidak bisa kirim dari client

    Pendekatan B: WebSocket
    + Bidirectional communication
    - Lebih kompleks, perlu connection management
    - Overkill untuk notifikasi satu arah

    Rekomendasi saya: SSE — lebih sederhana dan cukup untuk use case ini.
    
    Apakah Anda setuju, atau ingin eksplorasi lebih lanjut?
```

**Output:** File `docs/brainstorms/2026-02-10-notification-system-brainstorm.md`

### 2.3 Workflow: Plan

**Kapan digunakan:** Requirements sudah jelas, perlu mendefinisikan HOW.

**Command:** `/plan`

**Proses:**

```
1. Check brainstorm  → Cari dokumen brainstorm terkait
2. Research          → Review codebase + docs/solutions/
3. Choose depth      → Quick / Standard / Comprehensive
4. Write plan        → Task bite-sized (2-5 menit per task)
5. Save & handoff    → Simpan ke docs/plans/ + opsi eksekusi
```

**3 Level Kedalaman:**

| Level | Cocok Untuk | Isi |
|-------|-------------|-----|
| 📄 **Quick** | Bug kecil, fix sederhana | Task list + acceptance criteria |
| 📋 **Standard** | Fitur medium, bug kompleks | + file paths, code snippets, TDD steps |
| 📚 **Comprehensive** | Fitur besar, perubahan arsitektur | + phased plan, risks, alternatives |

#### 📌 Contoh Case: Plan Fitur User Authentication

```
Anda: /plan

AI: Saya menemukan brainstorm dari kemarin tentang authentication.
    Menggunakannya sebagai input.

    Pilih kedalaman plan:
    📄 Quick — Simple tasks
    📋 Standard — Most features
    📚 Comprehensive — Major features

Anda: 📋 Standard

AI: Plan disimpan ke docs/plans/2026-02-10-user-auth-plan.md

    === User Authentication Plan ===

    Goal: Implementasi JWT authentication dengan register, login, logout
    Architecture: Middleware-based auth dengan Prisma user model
    TDD Mode: balanced

    Task 1: Create User Model (3 min)
    Files: prisma/schema.prisma
    - Tambah model User dengan fields: id, email, password, createdAt

    Task 2: Write Auth Service Tests (5 min)
    Files: tests/services/auth.test.ts
    Step 1: Write failing test → register user
    Step 2: Run test → Expected: FAIL
    Step 3: Implement minimal auth service
    Step 4: Run test → Expected: PASS

    Task 3: Implement Auth Service (5 min)
    Files: src/lib/services/auth.ts
    ...

    Bagaimana Anda ingin melanjutkan?
    1. Execute sequentially
    2. Execute with swarm (parallel)
    3. Review and refine
    4. Done for now
```

### 2.4 Workflow: Work

**Kapan digunakan:** Plan sudah disetujui, saatnya eksekusi.

**Command:** `/work`

**Proses:**

```
1. Load plan        → Baca dan konfirmasi pemahaman
2. Setup environment → Branch / Worktree / No-Git
3. Task checklist   → Extract semua task dari plan
4. Swarm decision   → 5+ independent tasks? Tawarkan parallel
5. Execute tasks    → TDD cycle per task + commit incremental
6. Batch checkpoint → Setiap 3 task → progress summary + feedback
7. Quality gate     → Full test + lint + verification
8. Ship it          → Final commit + push
```

#### 📌 Contoh Case: Eksekusi Plan Authentication

```
Anda: /work

AI: Saya menggunakan executing-plans skill.

    📋 Plan loaded: user-auth-plan.md (6 tasks)
    🌿 Git: Creating branch feat/user-authentication

    === Task 1/6: Create User Model ===
    ✅ Added User model to prisma/schema.prisma
    ✅ Run: pnpm prisma migrate dev
    ✅ Committed: "feat(db): add User model with auth fields"

    === Task 2/6: Auth Service Tests ===
    🔴 RED: Test register user → FAIL (expected)
    🟢 GREEN: Implement register → PASS
    ♻️ REFACTOR: Extract password hashing utility
    ✅ Committed: "feat(auth): add register service with tests"

    === Task 3/6: Auth Service Login ===
    🔴 RED: Test login → FAIL (expected)
    🟢 GREEN: Implement login → PASS
    ✅ Committed: "feat(auth): add login service with tests"

    --- Checkpoint (3/6 tasks) ---
    ✅ 3 tasks selesai, semua test pass
    Lanjut ke batch berikutnya, atau ada feedback?

Anda: Lanjut

    ... (Task 4-6 dieksekusi) ...

    === Quality Gate ===
    ✅ Tests: 12/12 pass
    ✅ Linter: 0 errors
    ✅ All acceptance criteria met

    🚀 Shipped! Branch feat/user-authentication ready.
```

### 2.5 Workflow: Review

**Kapan digunakan:** Setelah implementasi selesai, sebelum merge.

**Command:** `/review`

**Proses:**

```
Phase 1: Spec compliance  → Cocokkan dengan plan/spec
Phase 2: Code quality     → 6 perspektif (correctness, design, security, 
                            performance, readability, testing)
Phase 3: Classify         → P1 Critical / P2 Important / P3 Suggestion
Phase 4: Present          → Structured report + action items
Phase 5: Approval         → APPROVE / CHANGES REQUESTED
```

**Severity Classification:**

| Level | Label | Deskripsi | Aksi |
|-------|-------|-----------|------|
| 🔴 P1 | Critical | Bug, security, data loss | HARUS fix sebelum merge |
| 🟡 P2 | Important | Design issues, missing edge cases | Sebaiknya fix |
| 🟢 P3 | Suggestion | Style, naming, minor improvements | Nice to have |

#### 📌 Contoh Case: Review Hasil Implementasi

```
Anda: /review

AI: Saya menggunakan code-review skill.

    ## Review Summary

    Scope: feat/user-authentication (6 files changed)
    Verdict: APPROVE WITH NOTES

    ### ✅ Strengths
    - Clean TDD discipline — all features have tests
    - Good separation of concerns in auth service
    - Proper password hashing with bcrypt

    ### 🟡 P2 — Important (Should Fix)
    1. src/lib/services/auth.ts:45 — JWT secret hardcoded
       → Move to environment variable
    2. src/lib/services/auth.ts:23 — Missing rate limiting on login
       → Add rate limiter to prevent brute force

    ### 🟢 P3 — Suggestions
    1. tests/services/auth.test.ts:12 — Test name bisa lebih deskriptif
       → "rejects empty email during registration"

    No P1 critical issues found ✅
    
    Fix P2 items, atau approve as-is?
```

### 2.6 Workflow: Compound

**Kapan digunakan:** Setelah menyelesaikan masalah non-trivial.

**Command:** `/compound`

**Trigger otomatis:** Ketika Anda mengatakan *"itu berhasil"*, *"sudah fix"*, *"problem solved"*.

**Proses:**

```
1. Detect trigger   → Apakah ada masalah yang baru diselesaikan?
2. Evaluate         → Apakah cukup penting untuk didokumentasikan?
3. Gather context   → Problem, symptoms, root cause, solution, prevention
4. Check existing   → Cari di docs/solutions/ apakah ada yang mirip
5. Classify         → Pilih kategori (build-errors, runtime-errors, dll.)
6. Create doc       → Tulis ke docs/solutions/<category>/<filename>.md
7. Pattern detect   → 3+ masalah mirip? Buat pattern doc
```

#### 📌 Contoh Case: Dokumentasi Solusi Bug

Setelah berhasil fix bug session management yang kompleks:

```
Anda: Akhirnya fix! Ternyata masalahnya di session timeout.

AI: Saya menggunakan knowledge-compounding skill.

    ✓ Solution documented

    File created:
    • docs/solutions/runtime-errors/session-timeout-jwt-20260210.md

    ---
    date: 2026-02-10
    category: runtime-errors
    severity: high
    tags: [jwt, session, authentication, timeout]
    ---
    # JWT Session Timeout Causes Silent Auth Failure

    ## Symptoms
    Users randomly logged out without error message.
    Console shows: "Error: jwt expired" on API calls.

    ## Root Cause
    JWT token lifetime set to 1 hour but refresh token
    logic only triggered on page reload, not on API calls.

    ## Solution
    Added axios interceptor to refresh token when 401 received.

    ## Prevention
    Always implement token refresh in HTTP client interceptor,
    not in page lifecycle hooks.
    ---

    What next?
    1. Continue working
    2. View the documentation
    3. Link related issues
```

### 2.7 Workflow: Launch (Full Pipeline)

**Kapan digunakan:** Development fitur baru dari awal hingga selesai.

**Command:** `/launch [deskripsi fitur]`

Pipeline lengkap yang menjalankan semua workflow secara berurutan:

```
/launch → /brainstorm → /plan → /work → /review → /compound → Ship
```

Setiap tahap menunggu **approval** Anda sebelum lanjut ke tahap berikutnya.

#### 📌 Contoh Case: Launch Pipeline untuk Fitur Baru

```
Anda: /launch Buat fitur shopping cart untuk toko online

AI:   === STAGE 1: BRAINSTORM ===
      Mengeksplorasi ide shopping cart...
      [Tanya jawab → Desain → Dokumen brainstorm]
      ✅ Brainstorm selesai. Lanjut ke planning?

Anda: Ya, lanjut

AI:   === STAGE 2: PLAN ===
      Membuat implementation plan...
      [Research → 8 tasks → Simpan plan]
      ✅ Plan selesai. Mulai eksekusi?

Anda: Ya, lanjut

AI:   === STAGE 3: WORK ===
      Mengeksekusi plan...
      [TDD cycle × 8 tasks → Commits → Quality gate]
      ✅ Implementasi selesai. Mulai review?

Anda: Ya, review

AI:   === STAGE 4: REVIEW ===
      Multi-perspective code review...
      [Result: APPROVE WITH NOTES — 0 P1, 2 P2, 3 P3]
      ✅ Review selesai. Dokumentasikan knowledge?

Anda: Ya

AI:   === STAGE 5: COMPOUND ===
      Mendokumentasikan solusi...
      [2 solution docs created]
      
      === 🚀 SHIPPED ===
      What was built: Shopping cart (add, update, remove, checkout)
      What was tested: 24 tests, all passing
      What was documented: 2 solutions in docs/solutions/
      Follow-up: Payment integration, inventory management
```

### 2.8 Workflow: Debug

**Kapan digunakan:** Bug report, test failure, error, perilaku tidak terduga.

**Command:** `/debug [deskripsi masalah]`

**Proses:**

```
1. Describe    → Klarifikasi: expected vs actual behavior
2. Reproduce   → Temukan langkah exact untuk trigger bug
3. Investigate → Phase 1: error messages, recent changes, isolate layer
4. Analyze     → Phase 2: environment, scale, timing patterns
5. Hypothesize → Phase 3: max 3 hipotesis, test terkecil
6. Fix with TDD → Write failing test → fix root cause → verify
7. Verify      → Full test suite + linter
8. Commit      → fix(scope): description + root cause
9. Compound    → Tawarkan dokumentasi solusi
```

#### 📌 Contoh Case: Debug API Yang Lambat

```
Anda: /debug API endpoint /api/orders response time 10 detik

AI: Saya menggunakan systematic-debugging skill.

    === Step 2: Reproduce ===
    $ curl -w '%{time_total}' http://localhost:3000/api/orders
    → 10.2s konsisten

    === Step 3: Investigate ===
    1. READ logs: No errors, tapi DB query time 9.8s
    2. RECENT CHANGES: "feat(orders): add customer details" (2 hari lalu)
    3. ISOLATE: Database layer — SQL log menunjukkan 201 queries!
    4. TRACE: orders.findAll() → loop → order.customer (LAZY LOAD!)

    === Step 4: Analyze ===
    → Classic N+1 query: 1 query orders + 200 queries customers

    === Step 5: Hypothesize ===
    "N+1 lazy loading pada relasi customer. Fix: eager loading."
    Evidence: SQL log 201 queries vs expected 1-2 queries.

    === Step 6: Fix with TDD ===
    🔴 RED: Test bahwa getOrders hanya menjalankan ≤ 2 queries
    🟢 GREEN: Tambah include: { customer: true } di Prisma query
    ✅ Response time: 10s → 80ms

    === Step 7: Verify ===
    ✅ Tests: 24/24 pass
    ✅ Linter: 0 errors
    ✅ API response: 80ms (was 10s)

    === Step 8: Commit ===
    fix(orders): resolve N+1 query on customer relation
    Root cause: Lazy loading on order.customer caused 201 queries

    === Step 9: Compound ===
    Ini fix non-trivial. Dokumentasikan dengan /compound?
```

### 2.9 Workflow: Reload

**Kapan digunakan:** Setelah mengedit file rules di `.agent/rules/` dan ingin apply perubahan tanpa memulai chat baru.

**Command:** `/reload`

**Proses:**

```
1. Re-read rules → Baca ulang semua file di .agent/rules/
2. Confirm       → Laporan perubahan yang terdeteksi
3. Apply         → Rules berlaku langsung di conversation yang sama
```

#### 📌 Contoh Case: Ubah TDD Mode Mid-Conversation

```
# Anda mengedit .agent/rules/project-config.md:
# tdd_mode: "balanced" → tdd_mode: "relaxed"

Anda: /reload

AI: ✅ Rules reloaded. Changes detected in:
    • project-config.md — tdd_mode changed: "balanced" → "relaxed"
    
    Semua response berikutnya menggunakan relaxed TDD mode.
```

#### Kapan Perlu `/reload`

| Situasi | Perlu Reload? |
|---------|---------------|
| Edit rules mid-conversation | ✅ Ya, `/reload` |
| Edit skill | ❌ Tidak perlu — skills dibaca on-demand |
| Edit workflow | ❌ Tidak perlu — workflows dibaca saat trigger |
| Mulai chat baru | ❌ Tidak perlu — rules otomatis dibaca |

---

## Bagian 3: Advanced — Skills Deep Dive

### 3.1 Test-Driven Development (TDD)

Super Compound menggunakan **Adaptive TDD** dengan 3 mode:

| Mode | Behavior | Kapan |
|------|----------|-------|
| **strict** | SELALU test dulu, tanpa pengecualian | Fitur production, critical bugfix |
| **balanced** | Test-first untuk fitur, relaxed untuk prototyping | Default |
| **relaxed** | Test didorong tapi tidak dipaksakan | Prototyping, throwaway code |

#### Iron Law (strict + balanced)

```
TIDAK ADA KODE PRODUCTION TANPA FAILING TEST TERLEBIH DAHULU
```

Menulis kode sebelum test? **Hapus. Mulai ulang.**

#### Red-Green-Refactor Cycle

```
🔴 RED     → Tulis SATU test yang gagal (menunjukkan apa yang seharusnya terjadi)
   Verify  → Jalankan test, pastikan GAGAL karena fitur belum ada
🟢 GREEN   → Tulis kode MINIMAL yang membuat test lulus
   Verify  → Jalankan test, pastikan LULUS
♻️ REFACTOR → Bersihkan kode, hilangkan duplikasi
   Verify  → Test masih hijau
🔄 REPEAT  → Test gagal berikutnya untuk fitur berikutnya
```

#### 📌 Contoh Case: TDD untuk Fitur Validasi Email

```python
# 🔴 RED — Step 1: Tulis failing test
# tests/test_validators.py
def test_rejects_empty_email():
    with pytest.raises(ValidationError):
        validate_email("")

def test_rejects_invalid_format():
    with pytest.raises(ValidationError):
        validate_email("bukan-email")

def test_accepts_valid_email():
    assert validate_email("user@example.com") == "user@example.com"
```

```bash
# Verify RED: Jalankan test
$ pytest tests/test_validators.py -v
FAILED test_rejects_empty_email — NameError: validate_email not defined
# ✅ Test gagal karena fungsi belum ada — ini yang kita inginkan
```

```python
# 🟢 GREEN — Step 2: Tulis kode MINIMAL
# app/validators.py
import re

class ValidationError(Exception):
    pass

def validate_email(email: str) -> str:
    if not email:
        raise ValidationError("Email cannot be empty")
    if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email):
        raise ValidationError("Invalid email format")
    return email
```

```bash
# Verify GREEN: Jalankan test
$ pytest tests/test_validators.py -v
PASSED test_rejects_empty_email
PASSED test_rejects_invalid_format
PASSED test_accepts_valid_email
# ✅ Semua test lulus!
```

```python
# ♻️ REFACTOR — Step 3: Bersihkan (jika perlu)
# Dalam kasus ini kode sudah bersih, lanjut ke fitur berikutnya
```

#### Balanced Mode — Pengecualian yang Diperbolehkan

Dalam mode balanced, ini boleh TANPA test-first:
- File konfigurasi (JSON, YAML, env)
- Konten statis (README, docs, comments)
- Prototype throwaway (user secara eksplisit bilang "prototype")
- Kode scaffolding/generated

### 3.2 Systematic Debugging

Super Compound menerapkan **4-phase debugging** yang melarang guessing:

```
Phase 1: Root Cause Investigation → WAJIB sebelum fix apapun
Phase 2: Pattern Analysis          → Analisis environment & data flow
Phase 3: Hypothesis and Testing    → Bentuk & uji hipotesis (max 3)
Phase 4: Implementation            → Write failing test → Fix → Verify
```

#### The Non-Negotiable Rule

```
JANGAN mencoba fix sebelum menyelesaikan Phase 1.
Melewati diagnosis menyebabkan kegagalan berantai.
```

#### 📌 Contoh Case: Debugging N+1 Query

**Situasi:** API endpoint `/api/products` membutuhkan 5 detik untuk respond.

```
Phase 1: Root Cause Investigation
─────────────────────────────────
1. READ error/logs:
   → No error, tapi response time 5000ms untuk 100 produk

2. REPRODUCE:
   → Konsisten 5s dengan 100 produk, 500ms dengan 10 produk

3. CHECK recent changes:
   → git log: "feat(products): add seller info to response" (2 hari lalu)

4. ISOLATE the layer:
   → Database query layer — SQL log menunjukkan 101 queries!

5. TRACE data flow:
   → Product.find_all() → loop → product.seller (LAZY LOAD per item!)

Phase 2: Pattern Analysis
─────────────────────────
→ Classic N+1 query: 1 query untuk products + N queries untuk sellers

Phase 3: Hypothesis
───────────────────
"Bug disebabkan oleh lazy loading relasi seller yang menghasilkan 
N+1 queries. Solusinya: eager loading/join."

Evidence: SQL log menunjukkan 101 separate queries.

Phase 4: Implementation
───────────────────────
🔴 RED: Test bahwa get_products hanya menjalankan ≤ 2 queries
🟢 GREEN: Tambah eager loading → Product.includes(:seller).all()
✅ Response time: 5000ms → 50ms
```

#### Red Flags — STOP!

| Pikiran | Realita |
|---------|---------|
| "Coba saya quick fix dulu" | Diagnosis dulu. Quick fix menyembunyikan bug |
| "Saya rasa tahu masalahnya" | Buktikan sebelum fixing |
| "Tidak bisa reproduksi, tapi fix saja" | Reproduksi dulu, selalu |
| "Error message-nya misleading" | Baca lagi. Biasanya benar |
| "Saya tambah try/catch saja" | Catch errors ≠ fix errors |

### 3.3 Verification Before Completion

**Iron Law: TIDAK ADA KLAIM SELESAI TANPA BUKTI VERIFIKASI SEGAR.**

#### The Gate Function

```
SEBELUM mengklaim status apapun:

1. IDENTIFY → Command apa yang membuktikan klaim ini?
2. RUN      → Jalankan command LENGKAP (fresh, complete)
3. READ     → Baca full output, cek exit code
4. VERIFY   → Apakah output mengkonfirmasi klaim?
5. CLAIM    → Baru kemudian buat klaim
```

#### Perbandingan Benar vs Salah

| Klaim | ✅ Benar | ❌ Salah |
|-------|---------|---------|
| Tests pass | Jalankan test → lihat "34/34 pass" | "Harusnya pass sekarang" |
| Build success | Jalankan build → lihat exit 0 | "Linter pass, berarti build juga" |
| Bug fixed | Test symptom asli → PASS | "Kode sudah diubah, pasti fix" |
| Linter clean | Jalankan linter → 0 errors | "Partial check sudah cukup" |

#### 📌 Contoh Case: Verification in Action

```
❌ SALAH:
AI: "Saya sudah menambahkan validasi email. Seharusnya bekerja dengan benar."
    → Menggunakan kata "seharusnya" = RED FLAG

✅ BENAR:
AI: Menjalankan verifikasi sebelum klaim...

    $ pytest tests/test_validators.py -v
    tests/test_validators.py::test_rejects_empty_email PASSED
    tests/test_validators.py::test_rejects_invalid_format PASSED
    tests/test_validators.py::test_accepts_valid_email PASSED
    3 passed in 0.12s

    ✅ Semua 3 test lulus. Validasi email berfungsi dengan benar.
```

### 3.4 Architecture Enforcement

Super Compound mencegah spaghetti code melalui **aturan universal** + **panduan per-framework**.

#### Universal Anti-Spaghetti Rules

| Rule | Limit | Aksi Jika Dilanggar |
|------|-------|---------------------|
| Max baris per file | 1000 | Split ke modules |
| Max baris per fungsi | 50 | Extract sub-functions |
| Max nesting depth | 3 level | Guard clauses, early returns |
| Max parameter fungsi | 4 | Gunakan options object |
| Max module dependencies | 7 | Module terlalu besar → split |
| God class detection | 10+ public methods | Split by responsibility |

#### Dependency Direction

```
DIPERBOLEHKAN:
  presentation → application → domain
  infrastructure → application → domain

DILARANG:
  domain → infrastructure  (business logic ≠ DB)
  domain → presentation    (business logic ≠ UI)
  application → presentation
```

Pelanggaran arsitektur = **P1 Critical** saat code review!

#### 📌 Contoh Case: Architecture Check pada FastAPI

**Struktur yang benar (Clean Architecture):**

```
app/
├── domain/              ← Pure business rules (NO imports dari luar)
│   ├── entities/
│   ├── repositories/    ← Abstract interfaces (ABC)
│   └── services/
├── application/         ← Use cases → hanya import domain/
│   └── use_cases/
├── infrastructure/      ← Implementations (SQLAlchemy, external APIs)
│   └── database/
├── api/                 ← FastAPI routers → TIDAK import infrastructure/
│   ├── routes/
│   └── schemas/
└── main.py
```

**❌ PELANGGARAN — P1 Critical:**

```python
# app/domain/services/user_service.py
from app.infrastructure.database.models import UserModel  # ❌ DILARANG!
# domain/ tidak boleh import infrastructure/!
```

**✅ BENAR — Dependency Injection:**

```python
# app/domain/services/user_service.py
from app.domain.repositories.user_repo import UserRepository  # ✅ ABC interface

class UserService:
    def __init__(self, repo: UserRepository):  # ✅ DI
        self.repo = repo
```

#### Enforcement Checklist

Sebelum menulis kode, cek:

- [ ] File di directory yang benar sesuai architecture guide?
- [ ] Imports mengikuti arah dependency yang benar?
- [ ] File di bawah 1000 baris? Fungsi di bawah 50?
- [ ] Nesting ≤ 3? Tidak ada circular deps?
- [ ] Business logic di service/domain layer saja?

### 3.5 Knowledge Compounding

Setiap masalah non-trivial yang berhasil diselesaikan = **dokumentasi untuk masa depan**.

#### Kapan Dokumentasikan

| Dokumentasikan ✅ | Skip ❌ |
|-------------------|---------|
| Multiple investigation attempts diperlukan | Typo atau syntax error sederhana |
| Root cause tidak obvious | Fix yang obvious langsung benar |
| Session mendatang akan terbantu | Konfigurasi trivial |
| Pattern yang bisa berulang | Hal yang tidak membantu masa depan |

#### Kategori Solusi

| Kategori | Folder | Contoh |
|----------|--------|--------|
| Build errors | `build-errors/` | Kompilasi, bundling, dependency |
| Test failures | `test-failures/` | Flaky tests, setup issues |
| Runtime errors | `runtime-errors/` | Crashes, exceptions |
| Performance | `performance-issues/` | Slow queries, memory leaks |
| Database | `database-issues/` | Migrations, schema, connections |
| Security | `security-issues/` | Vulnerabilities, auth, CORS |
| UI/Frontend | `ui-bugs/` | Layout, rendering |
| Integration | `integration-issues/` | API, third-party services |
| Logic errors | `logic-errors/` | Wrong behavior, calculations |
| Config | `config-issues/` | Environment, settings |

#### Pattern Detection

Ketika 3+ masalah serupa ditemukan di `docs/solutions/`, Super Compound akan membuat **pattern doc**:

```
docs/solutions/patterns/<pattern-name>.md
```

Ini membantu mengidentifikasi masalah sistemis yang perlu dipecahkan di level arsitektur.

### 3.6 Code Review

Review multi-perspektif dengan **6 dimensi** quality check:

| Perspektif | Yang Dicek |
|------------|-----------|
| ✅ Correctness | Logic, error handling, edge cases |
| 🏗️ Design | Patterns, SRP, YAGNI, DRY |
| 🔒 Security | Input validation, secrets, injection |
| ⚡ Performance | N+1, memory, complexity |
| 📖 Readability | Naming, comments, formatting |
| 🧪 Testing | Coverage, edge cases, reliability |

#### Red Flags yang Dicari

| Red Flag | Mengapa Berbahaya |
|----------|-------------------|
| `catch` dengan body kosong | Menyembunyikan errors |
| Magic numbers/strings | Tidak terbaca dan error-prone |
| God functions (50+ baris) | Tidak bisa di-maintain |
| God files (1000+ baris) | Harus di-split ke modules |
| Deep nesting (4+ level) | Refactor dengan guard clauses |
| Copy-paste code | Pelanggaran DRY |
| `console.log` / `print` | Debug artifacts yang tertinggal |
| Business logic di controllers | Pelanggaran arsitektur = P1 |

---

## Bagian 4: Real-World Case Studies

### Case 1: Membangun REST API dengan FastAPI

**Skenario:** Anda ingin membangun API manajemen inventaris untuk toko.

#### Step 1: Setup Super Compound

```bash
# Copy Super Compound ke project
cp -r /path/to/SUPER-COMPOUND/.agent ./.agent

# Edit config: gunakan Preset 4 (FastAPI)
# .agent/rules/project-config.md → paste preset FastAPI
```

#### Step 2: Brainstorm

```
Anda: /brainstorm API inventaris untuk tracking stok produk, 
      supplier, dan purchase orders

AI akan:
1. Tanya scope satu per satu (CRUD saja? Reporting? Alerts?)
2. Presentasikan 2-3 pendekatan arsitektur
3. Simpan keputusan ke docs/brainstorms/
```

#### Step 3: Plan

```
Anda: /plan

AI akan:
1. Read brainstorm document
2. Research: check docs/solutions/ untuk past learnings
3. Tanya depth level (Quick/Standard/Comprehensive)
4. Buat plan dengan tasks:
   - Task 1: Setup project structure (Clean Architecture)
   - Task 2: Create Product entity + repository interface
   - Task 3: Create Product CRUD use cases (test-first)
   - Task 4: Create FastAPI routes + schemas
   - Task 5: Implement SQLAlchemy repository
   - Task 6: Add Supplier entity + relations
   - Task 7: Integration tests
5. Simpan ke docs/plans/
```

#### Step 4: Work

```
Anda: /work

AI akan:
1. git checkout -b feat/inventory-api
2. Execute setiap task dengan TDD:
   🔴 Write failing test
   🟢 Minimal implementation
   ♻️ Refactor
   ✅ Commit
3. Checkpoint setiap 3 task
4. Quality gate: pytest + ruff + mypy
5. Push branch
```

#### Step 5: Review + Compound

```
Anda: /review → fix P2 issues → /compound
```

**Hasil akhir:**
- ✅ Clean Architecture FastAPI app
- ✅ Full test coverage
- ✅ API docs via Swagger
- ✅ Documented solutions for future reference

---

### Case 2: Debugging Production Bug

**Skenario:** User melaporkan *"Data sometimes appears twice in the dashboard."*

#### Step 1: Systematic Debugging Skill Aktif

```
AI: Saya menggunakan systematic-debugging skill.

    Phase 1: Root Cause Investigation
    ═══════════════════════════════════

    1. READ error messages:
       → Tidak ada error di console atau server logs

    2. REPRODUCE:
       → Bisa direproduksi: refresh halaman cepat-cepat 
         saat data sedang loading → data muncul ganda

    3. CHECK recent changes:
       $ git log --oneline -10
       → 3 hari lalu: "feat(dashboard): add real-time data refresh"

    4. ISOLATE the layer:
       → Frontend layer — API response data benar (tidak duplikat)
       → Data menjadi duplikat di React state

    5. TRACE data flow:
       → useEffect fetch data → setState append 
       → useEffect re-runs → fetch lagi → append lagi!
       → ROOT CAUSE: Missing cleanup in useEffect!
```

#### Step 2: Fix dengan TDD

```
    Phase 4: Implementation
    ═══════════════════════

    🔴 RED: Test bahwa component tidak menampilkan data duplikat
            saat di-mount ulang
    🟢 GREEN: Tambah cleanup function + replace instead of append
    ♻️ REFACTOR: Extract data fetching ke custom hook
    ✅ VERIFIED: Test passes, manual verify — no duplicates
```

#### Step 3: Knowledge Compounding

```
    ✓ Solution documented:
    docs/solutions/ui-bugs/duplicate-data-useeffect-20260210.md

    Tags: [react, useEffect, race-condition, state-management]
    Prevention: Always add cleanup function in useEffect 
                that fetches data. Use AbortController.
```

---

### Case 3: Full-Stack Feature dengan Next.js (Launch Pipeline)

**Skenario:** Anda ingin menambahkan fitur komentar pada blog Next.js yang sudah ada.

```
Anda: /launch Tambahkan fitur komentar pada setiap blog post. 
      User bisa membuat, mengedit, dan menghapus komentar mereka sendiri.
```

#### Stage 1: Brainstorm

```
AI: Pertanyaan 1: Apakah komentar perlu nested/threaded (reply to reply)?
Anda: Tidak, flat comments saja.

AI: Pertanyaan 2: Apakah komentar perlu moderasi sebelum tampil?
Anda: Tidak, langsung tampil.

AI: Pertanyaan 3: Apakah perlu fitur like/dislike pada komentar?
Anda: Tidak untuk sekarang. YAGNI.

AI: Pendekatan A (Rekomendasi): Server Actions + Prisma
    + Type-safe, simple, no API routes needed
    + Cocok dengan arsitektur Next.js App Router yang ada

    Pendekatan B: API Routes + fetch
    + Familiar pattern
    - Lebih banyak boilerplate

    ✅ Memilih Pendekatan A
    📄 Saved: docs/brainstorms/2026-02-10-blog-comments.md
```

#### Stage 2: Plan (Standard Depth)

```
AI: 8 tasks, estimated 30 min total:

    Task 1: Add Comment model to Prisma schema
    Task 2: Write comment service tests (create, edit, delete)
    Task 3: Implement comment service (lib/services/comments.ts)
    Task 4: Write server action tests
    Task 5: Create server actions (lib/actions/comments.ts)
    Task 6: Create CommentList + CommentForm components
    Task 7: Integrate into blog post page
    Task 8: E2E flow verification

    📄 Saved: docs/plans/2026-02-10-blog-comments-plan.md
```

#### Stage 3: Work (TDD Execution)

```
AI: 🌿 Branch: feat/blog-comments

    Task 1: ✅ Comment model added, migration applied
    Task 2: 🔴→🟢 3 service tests written and passing
    Task 3: ✅ Comment service implemented
    --- Checkpoint 1/3: All good ---
    Task 4: 🔴→🟢 Server action tests passing  
    Task 5: ✅ Server actions implemented
    Task 6: ✅ Components created following existing patterns
    --- Checkpoint 2/3: Looking good ---
    Task 7: ✅ Integrated into [slug]/page.tsx
    Task 8: ✅ E2E flow verified manually

    === Quality Gate ===
    ✅ vitest: 18/18 pass
    ✅ eslint: 0 errors
    ✅ tsc: 0 errors
    ✅ Architecture: all files in correct dirs,
       dependency direction respected
```

#### Stage 4: Review

```
AI: Verdict: APPROVE ✅

    Strengths:
    - Follows existing codebase patterns perfectly
    - Clean TDD, all features tested
    - Server Actions properly validated with Zod

    🟢 P3 Suggestions:
    1. Consider optimistic updates for better UX (future)
    2. Add aria-labels for accessibility
```

#### Stage 5: Compound

```
AI: No non-trivial problems encountered during this implementation.
    Skipping knowledge compounding (all straightforward).

    === 🚀 SHIPPED ===
    Branch: feat/blog-comments
    Files: 8 changed (+342, -4)
    Tests: 18 new tests, all passing
    Follow-up: Optimistic updates, accessibility improvements
```

---

## Bagian 5: Tips & Best Practices

### 💡 Tips untuk Pemula

1. **Mulai dengan preset** — Jangan konfigurasi manual dulu, gunakan preset yang sesuai
2. **Gunakan `/brainstorm` untuk ide baru** — Jangan langsung coding, eksplorasi dulu
3. **Percaya pada proses TDD** — Terasa lambat di awal, tapi menghemat waktu debugging nanti
4. **Biarkan AI memverifikasi** — Jangan skip verification gate

### 🔧 Tips untuk Intermediate

1. **Pilih depth level yang tepat** — Quick untuk fix kecil, Standard untuk fitur, Comprehensive untuk arsitektur
2. **Manfaatkan `docs/solutions/`** — Semakin banyak knowledge yang terakumulasi, semakin cepat development
3. **Review sebelum merge** — `/review` menangkap bug sebelum sampai ke production
4. **Gunakan batch checkpoints** — Saat `/work`, manfaatkan checkpoint setiap 3 task untuk memberikan feedback

### 🚀 Tips untuk Advanced

1. **Gunakan `/launch` untuk fitur besar** — Full pipeline memastikan kualitas end-to-end
2. **Swarm mode untuk task independen** — 5+ task yang tidak saling bergantung bisa diparalelkan
3. **Pattern detection di knowledge** — Jika Anda melihat 3+ solusi serupa, minta AI membuat pattern doc
4. **Custom presets** — Modifikasi preset agar sesuai exact stack dan convention tim Anda
5. **Architecture enforcement** — Jadikan checker arsitektur sebagai langkah pertama sebelum menulis kode apapun

### ⚠️ Pitfalls yang Harus Dihindari

| Pitfall | Solusi |
|---------|--------|
| Skip brainstorm, langsung coding | Selalu brainstorm/plan dulu untuk fitur baru |
| Menulis test setelah kode | TDD: test dulu, kode kemudian |
| Mengklaim "sudah fix" tanpa verifikasi | Jalankan command verifikasi, BARU klaim |
| Ignore P1 findings dari review | P1 = HARUS fix. Tidak ada pengecualian |
| Tidak mendokumentasikan solusi | Investasi 5 menit sekarang menghemat berjam-jam nanti |
| Business logic di controller/route | Pindahkan ke service/domain layer |
| Lupa cleanup setelah debugging | Hapus `console.log`, temporary fixes, debug flags |

### 🔄 Git Workflow Quick Reference

| Mode | Command | Cocok Untuk |
|------|---------|-------------|
| **Branch** (default) | `git checkout -b feat/<name>` | Single developer, most cases |
| **Worktree** | `git worktree add ../<dir> -b feat/<name>` | Parallel development, swarm mode |
| **No-Git** | Skip git completely | Prototyping, throwaway code |

**Commit Convention:**

```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore, perf, ci

Contoh:
  feat(auth): add JWT refresh token logic
  fix(cart): resolve duplicate item count
  test(user): add edge cases for email validation
  docs(api): update endpoint documentation
```

---

## Penutup

Super Compound bukan hanya tool — ini adalah **disiplin development** yang membuat setiap unit kerja memperkuat unit kerja berikutnya. Semakin Anda menggunakannya, semakin banyak knowledge yang terakumulasi di `docs/solutions/`, dan semakin cepat development Anda ke depannya.

> **"Discipline compounds. Each unit of work makes the next one easier."**

Selamat menggunakan Super Compound! ⚛️
