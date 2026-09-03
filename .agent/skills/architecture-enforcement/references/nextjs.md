### Next.js (App Router) — Modular

```
prisma/                      ← Schema and migrations (repo root, Prisma default)
src/
├── app/                     ← Routes & layouts (framework convention)
│   ├── (auth)/              ← Route groups
│   ├── (dashboard)/
│   ├── api/                 ← API route handlers
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  ← Reusable (Button, Input, Modal)
│   └── features/            ← Feature-specific (UserCard)
├── lib/
│   ├── actions/             ← Server Actions
│   ├── services/            ← Business logic (pure functions)
│   ├── db/                  ← Prisma client, queries
│   └── validators/          ← Zod schemas
├── hooks/
└── types/
```

**Rules:** `app/` → `components/`, `lib/`, `hooks/` · `lib/services/` NEVER imports `app/` or `components/` · `lib/db/` → `prisma/`, `types/` only

---
