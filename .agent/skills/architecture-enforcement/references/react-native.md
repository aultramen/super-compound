### React Native (Expo) — Modular

```
src/
├── app/                     ← Expo Router
│   ├── (tabs)/
│   ├── (auth)/
│   └── _layout.tsx
├── components/ (ui/ + features/)
├── services/ (api/ + storage/)
├── hooks/
├── stores/
├── types/
├── constants/
└── assets/
```

**Rules:** `components/` NEVER imports `app/` · `services/` → no UI imports

---
