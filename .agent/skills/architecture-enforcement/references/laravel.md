### PHP Laravel — MVC + Service Layer

```
app/
├── Http/
│   ├── Controllers/         ← Thin! Only call Services
│   ├── Middleware/
│   ├── Requests/            ← Validation
│   └── Resources/           ← Transformers
├── Models/
├── Services/                ← ALL business logic
├── Repositories/ (optional)
├── Events/, Listeners/, Jobs/, Policies/
routes/ (web.php, api.php)
resources/ (views/, js/, css/)
database/ (migrations/, seeders/)
```

**Rules:** `Controllers/` → `Services/` only · `Controllers/` NEVER contain business logic · `Models/` = relationships, scopes only

---
