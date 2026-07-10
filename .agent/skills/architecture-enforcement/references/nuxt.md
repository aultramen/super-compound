### Vue / Nuxt 3 — Modular

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
