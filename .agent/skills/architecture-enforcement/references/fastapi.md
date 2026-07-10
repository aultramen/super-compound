### Python FastAPI — Clean Architecture

```
app/
├── domain/                  ← Pure business rules (NO framework imports)
│   ├── entities/
│   ├── repositories/        ← Abstract interfaces (ABC)
│   ├── services/
│   └── exceptions.py
├── application/             ← Use cases
│   ├── use_cases/
│   └── interfaces/
├── infrastructure/          ← Implementations
│   ├── database/            ← SQLAlchemy models, concrete repos
│   ├── external/
│   └── security/
├── api/                     ← FastAPI routers, schemas, deps
│   ├── routes/
│   ├── schemas/
│   └── dependencies/
├── core/ (config, exceptions)
└── main.py
```

**Rules:** `domain/` → NOTHING · `application/` → `domain/` only · `api/` NEVER imports `infrastructure/` · DI wires infra at startup

---
