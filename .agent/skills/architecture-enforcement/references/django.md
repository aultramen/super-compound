### Python Django — MVC + Service Layer

```
project/
├── apps/<app_name>/
│   ├── models.py
│   ├── views.py             ← HTTP only, no business logic
│   ├── serializers.py
│   ├── services.py          ← ALL business logic here
│   ├── urls.py
│   ├── admin.py
│   ├── tests/
│   └── migrations/
├── core/ (settings/, urls.py, wsgi.py)
└── common/ (mixins, permissions)
```

**Rules:** `views.py` → `services.py` → `models.py` · NEVER put business logic in views · Cross-app imports via `services.py`

---
