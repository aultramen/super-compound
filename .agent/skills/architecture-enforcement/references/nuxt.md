### Vue / Nuxt 3 — Modular

Nuxt 3 srcDir layout; Nuxt 4 nests `pages/`, `components/`, `composables/`, and `layouts/` under `app/`. Verify against the installed major.

```
├── server/
│   ├── api/
│   ├── middleware/
│   └── utils/
├── pages/
├── components/ (ui/ + features/)
├── composables/
├── stores/
├── services/
├── types/
└── prisma/
```

**Rules:** `services/` NEVER imports `pages/` or `components/` · `server/api/` → `server/utils/`, `services/`, `prisma/`

---
