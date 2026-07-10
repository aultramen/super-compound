## Part 1: Input Validation

### Multi-Layer Validation

Validate at every layer — not just one:

```
Client Side (Browser/App)  → UX feedback (not security)
    ↓
API Gateway / Middleware    → Format, size limits, rate limiting
    ↓
Controller / Route Handler → Type, format, required fields
    ↓
Service / Business Layer   → Business rules, relationships, permissions
    ↓
Database Layer             → Constraints, unique checks, foreign keys
```

> **Rule:** Client-side validation is for UX. Server-side validation is for security. Always do both.

### Principle: Allowlist Over Blocklist

❌ **Blocklist (insecure):** Try to block known bad patterns → always incomplete, always bypassable.

✅ **Allowlist (secure):** Define exactly what IS valid → reject everything else.

```
# Blocklist thinking: "Block <script> tags"
# Problem: What about <SCRIPT>, <scr\nipt>, <img onerror=...>, etc.

# Allowlist thinking: "Allow only [a-zA-Z0-9 '-] for names"
# Result: Everything else is automatically rejected
```

### Validation Patterns by Data Type

| Data Type | Validation | Max Length |
|-----------|------------|-----------|
| **Name** | `^[A-Za-zÀ-ÿ\s'-]+$` | 50-100 |
| **Email** | Use library validator (not regex) | 254 |
| **Phone** | `^\+?[0-9\s-()]+$` | 20 |
| **URL** | Parse and validate protocol + domain | 2048 |
| **Integer** | Parse + range check (min/max) | N/A |
| **Date** | Parse to date object + range check | N/A |
| **UUID** | `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` | 36 |
| **Enum** | Check against allowed values set | N/A |
| **Free text** | Sanitize HTML, enforce max length | 1000-10000 |
| **File name** | Strip path chars, generate UUID name | 255 |

### Validation Libraries by Stack

| Stack | Library | Usage |
|-------|---------|-------|
| **Node.js** | Zod, Joi, Yup | Schema validation |
| **Python** | Pydantic, Marshmallow, Cerberus | Model validation |
| **Java** | Bean Validation (JSR-380), Hibernate Validator | Annotation-based |
| **Go** | go-playground/validator | Struct tag validation |
| **PHP** | Laravel Validation, Symfony Validator | Rule-based |
| **Ruby** | ActiveModel Validations, dry-validation | Model/schema |
| **Rust** | validator crate | Derive macro |
| **C#** | DataAnnotations, FluentValidation | Attribute/fluent |

### Fail Securely

When validation fails:
1. **Log** the violation (without the input data if it could be sensitive)
2. **Return** a generic error message (don't reveal validation logic)
3. **Reject** the request entirely (don't partially process)
4. **Never** try to "fix" malicious input — reject it

---

### Context-Specific Output Encoding

Encode output based on WHERE it will be rendered:

| Context | Encoding | Purpose |
|---------|----------|---------|
| **HTML body** | HTML entity encoding (`&lt;`, `&amp;`) | Prevent XSS |
| **HTML attribute** | HTML attribute encoding | Prevent attribute injection |
| **JavaScript** | JavaScript string encoding | Prevent JS injection |
| **URL parameter** | URL encoding (`%20`, `%3C`) | Prevent URL injection |
| **CSS** | CSS encoding | Prevent CSS injection |
| **JSON** | JSON serializer (not string concat) | Prevent JSON injection |
| **SQL** | Parameterized queries (NOT encoding) | Prevent SQL injection |

> **Rule:** Use your framework's built-in encoding. Modern template engines (React, Vue, Jinja2, Blade, Thymeleaf) auto-encode by default. Only use `dangerouslySetInnerHTML` / `{!! !!}` / `|safe` when you've sanitized the content.

### File Upload Validation

```
1. Check file size (enforce max)
2. Check file extension (allowlist only)
3. Check MIME type from content (not just header)
4. Check magic bytes (file signature)
5. Generate new filename (UUID + extension)
6. Store outside webroot (never in public/)
7. Serve via application with auth check
8. Scan for malware (if applicable)
9. Re-process images (strip EXIF, resize)
```

---
