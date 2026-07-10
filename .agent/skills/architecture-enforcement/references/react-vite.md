### React + Vite — Layered

```
src/
├── pages/                   ← Route-level components
├── components/
│   ├── ui/
│   └── features/
├── services/                ← API calls, business logic
│   ├── api/
│   └── auth/
├── hooks/
├── stores/                  ← State management
├── types/
├── utils/
└── config/
```

**Rules:** `pages/` → everything · `components/` NEVER imports `pages/` · `services/` → no UI imports · `stores/` NEVER imports `components/`

---
