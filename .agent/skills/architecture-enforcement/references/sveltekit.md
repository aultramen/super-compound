### SvelteKit — Modular

```
src/
├── routes/
│   ├── (auth)/, (app)/
│   ├── api/
│   └── +layout.svelte
├── lib/
│   ├── components/ (ui/ + features/)
│   ├── server/ (db/, services/, auth/)
│   ├── stores/
│   ├── utils/
│   └── types/
└── drizzle/
```

**Rules:** `lib/server/` NEVER imports `routes/` · `lib/components/` NEVER imports `lib/server/`

---
