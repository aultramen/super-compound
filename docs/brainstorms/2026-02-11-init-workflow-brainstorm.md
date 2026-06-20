# Brainstorm: `/sc-init` Workflow — Codebase Context Initialization

**Date:** 2026-02-11
**Trigger:** Project dikerjakan di Cursor, di-import ke Antigravity → output plan kurang berkonteks karena AI belum punya "memory" tentang codebase.

---

## What We're Building

Workflow `/sc-init` yang melakukan **codebase scanning otomatis** untuk memberikan AI konteks tentang project yang sudah ada. Menghasilkan dua output:

1. **Auto-filled `project-config.md`** — tech stack, commands, architecture terdeteksi otomatis
2. **`docs/codebase-map.md`** — dokumen overview yang menjadi "memory" permanent untuk AI

Ini menyelesaikan masalah utama: ketika project di-import dari IDE lain, AI tidak punya konteks sehingga memperlakukan project sebagai greenfield padahal seharusnya brownfield.

---

## Why This Approach

### Problem Evidence (AG vs Cursor)

| Aspek | Cursor (Berkonteks) | Antigravity (Tanpa Konteks) |
|-------|--------------------|-----------------------------|
| File references | Spesifik: `VideoAnalysis.tsx`, `FileController.php` | Generik, buat dari nol |
| Existing state | "CSS-only preview, Export button tanpa handler" | Tidak tahu kondisi saat ini |
| Architecture | Mengikuti pola existing project | Membuat arsitektur baru |
| Naming/paths | Sesuai konvensi project | Konvensi default |

### Approach yang Dipilih: Codebase Scan + Auto-Config

**Dipilih karena:** Balance antara speed dan thoroughness. Satu langkah, output langsung usable.

**Alternatif yang dipertimbangkan:**
- *Interactive Guided Init* — Terlalu lambat untuk most cases
- *Layered Init (--deep / --guided flags)* — Over-engineering untuk v1, tapi desain workflow dibuat extensible agar bisa di-upgrade nanti

---

## Key Decisions Made

### 1. Scan Strategy

AI akan scan dalam urutan prioritas:

```
1. Package files     → Detect tech stack
   (package.json, composer.json, requirements.txt, go.mod, Cargo.toml, pyproject.toml)

2. Config files      → Detect tools & settings
   (tsconfig.json, next.config.*, vite.config.*, docker-compose.yml, .env.example)

3. Framework markers → Detect framework
   (artisan, manage.py, next.config.js, nuxt.config.ts, angular.json)

4. Directory tree    → Detect architecture & structure
   (top 3 levels, identify source dirs, test dirs, docs)

5. Key source files  → Understand conventions
   (sample controllers, models, routes, components — 2-3 per category)
```

### 2. Output: `project-config.md` Auto-Fill

Setiap field yang bisa dideteksi di-fill otomatis. Contoh:

```yaml
project_name: "omnisocial"
project_type: "fullstack"
monorepo: true
api_style: "rest"

frontend:
  framework: "react"
  language: "typescript"
  styling: "tailwind"
  bundler: "vite"

backend:
  framework: "laravel"
  language: "php"
  orm: "eloquent"

database:
  primary: "mysql"
  cache: "redis"

dev_command: "npm run dev"
docker_command: "docker-compose up -d"
```

### 3. Output: `docs/codebase-map.md`

Dokumen ini menjadi **referensi utama** bagi AI di semua conversation berikutnya.

```markdown
# Codebase Map — [Project Name]

## Overview
[1-2 paragraf: apa yang project ini lakukan]

## Architecture
- Pattern: [MVC/Clean/Layered]
- Monorepo: [yes/no, list services]

## Directory Structure
[Tree dengan deskripsi per folder utama]

## Key Files
| File | Purpose | Notes |
|------|---------|-------|
| src/pages/VideoAnalysis.tsx | Video analysis page | Has export button (no handler yet) |
| ... | ... | ... |

## API Endpoints
[Tabel method + path + description jika applicable]

## Conventions Observed
- Naming: [camelCase/snake_case]
- Import style: [absolute/relative]
- Component pattern: [functional/class]
- State management: [zustand/redux/context]

## Tech Stack Summary
[Auto-generated dari project-config.md]
```

### 4. Workflow Steps

```
/sc-init workflow:

1. Read project-config.md — Check which fields are already filled
2. Scan package files — Detect dependencies and tech stack
3. Scan config files — Detect build tools, Docker, CI/CD
4. Scan directory structure — Map architecture and key directories
5. Sample key source files — Identify conventions and patterns (2-3 files per category)
6. Auto-fill project-config.md — Update empty fields with detected values
7. Generate docs/codebase-map.md — Create comprehensive overview
8. Present results to user — Show what was detected, ask for corrections
```

### 5. Extensibility for Approach 3

Workflow didesain agar nanti bisa ditambahkan:
- `--deep` flag → tambah step: scan ALL source files, generate API docs, analyze dependencies
- `--guided` flag → tambah step: interactive Q&A setelah scan untuk konteks bisnis

Tidak diimplementasi sekarang (YAGNI), tapi structure workflow file-nya tidak menghalangi penambahan ini.

---

## Open Questions

1. **Apakah `codebase-map.md` perlu di-update otomatis** setiap kali ada perubahan besar, atau cukup manual re-run `/sc-init`?
   - Rekomendasi: Manual re-run. Auto-update terlalu complex dan error-prone.

2. **Dimana menyimpan `codebase-map.md`?**
   - Opsi A: `docs/codebase-map.md` (visible, part of project)
   - Opsi B: `.agent/context/codebase-map.md` (hidden, framework-only)
   - Rekomendasi: Opsi A — user bisa review dan edit, juga berguna tanpa framework.
