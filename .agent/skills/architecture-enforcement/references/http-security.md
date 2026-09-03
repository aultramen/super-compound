## Universal Security Architecture

Placement follows each framework's architecture guide above.

### Security Headers (All Frameworks)

Every HTTP response sets CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.

**Where to implement:**

| Framework | Location |
|-----------|----------|
| Next.js | `next.config.js` → `headers()` or middleware |
| Express | `helmet` middleware in `app.ts` |
| FastAPI | `starlette.middleware` or custom middleware in `main.py` |
| Django | `SECURE_*` settings in `settings.py` + `SecurityMiddleware` |
| Laravel | `App\Http\Middleware` or `config/secure-headers.php` |
| Go Gin | Custom middleware in `internal/handler/middleware/` |
| Nuxt.js | `nuxt.config.ts` → `routeRules` or server middleware |
| SvelteKit | `hooks.server.ts` → `handle` function |

### CORS Configuration

```
ALLOWED: Specific origin whitelist per environment
  - Development: http://localhost:3000
  - Staging: https://staging.example.com
  - Production: https://example.com

FORBIDDEN: Access-Control-Allow-Origin: * (with credentials)
```

**Where to implement:** Same location as security headers — middleware layer.

### Rate Limiting

Set limits per endpoint class (auth, password reset, general API, upload, public) from the product's own abuse model and record them in `project-config`.

**Where to implement:**

| Framework | Package / Location |
|-----------|-------------------|
| Express | `express-rate-limit` middleware |
| FastAPI | `slowapi` or custom middleware |
| Django | `django-ratelimit` decorator |
| Laravel | `throttle` middleware in `routes/api.php` |
| Go Gin | Custom middleware in `internal/handler/middleware/` |
| Next.js | Edge middleware or API route middleware |

### Auth Middleware Placement

```
Flow: Request → Auth Middleware → Authz Check → Controller → Service → Response
```

**Where to implement:**

| Framework | Auth Location | Authz Location |
|-----------|--------------|----------------|
| Next.js | `middleware.ts` (root) | Server Actions / API routes |
| Express | `app.use(authMiddleware)` before routes | Route-level middleware |
| FastAPI | `Depends(get_current_user)` in route | Service layer or dependency |
| Django | `LoginRequiredMixin` / `@login_required` | `@permission_required` / Policies |
| Laravel | `auth` middleware in routes | Policies / Gates |
| Go Gin | `authMiddleware` in router group | Handler-level checks |

### Security Enforcement Checklist

```
□ Security headers configured in middleware layer?
□ CORS restricted to specific origins (not wildcard)?
□ Rate limiting on auth + public endpoints?
□ Auth middleware runs before controllers?
□ Authz checks in place for resource access?
□ Error responses don't leak internals?
□ Secrets accessed via environment variables only?
```

---
