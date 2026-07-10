### Go Gin — Standard Go Layout

```
cmd/server/main.go
internal/
├── handler/                 ← HTTP handlers
│   └── middleware/
├── service/                 ← Business logic
├── repository/              ← Data access
├── model/                   ← Domain structs
├── dto/                     ← Request/Response DTOs
├── config/
└── pkg/                     ← Internal utilities
pkg/                         ← Public shared packages
migrations/
```

**Rules:** `handler/` → `service/`, `dto/` (NEVER `repository/`) · `service/` → `repository/`, `model/` · `model/` → NOTHING

---
