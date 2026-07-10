## Universal Security Architecture

Every framework MUST implement these security patterns. Placement follows each framework's architecture guide above.

### Security Headers (All Frameworks)

Every HTTP response should include these headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Framework-specific | Prevent XSS, data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leaks |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |

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

| Endpoint Type | Recommended Limit | Purpose |
|---------------|-------------------|---------|
| Login / Auth | 5-10 req/min per IP | Prevent brute force |
| Password Reset | 3 req/hour per email | Prevent abuse |
| API (general) | 100-1000 req/min per user | Prevent abuse |
| File Upload | 10 req/min per user | Prevent storage abuse |
| Public endpoints | 30 req/min per IP | Prevent scraping |

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
RULE: Authentication middleware MUST run BEFORE any controller/handler.
RULE: Authorization checks MUST run AFTER authentication.

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
