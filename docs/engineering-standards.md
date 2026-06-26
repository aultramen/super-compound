# Engineering Standards Reference

> **Purpose:** This reference preserves the long-form engineering standards that used to live in a monolithic `CLAUDE.md`. It is for on-demand consultation, not automatic startup memory. The concise operational rules now live in `AGENTS.md`, `CLAUDE.md`, and `.claude/rules/`.

> **How to read this file:** Rules are written as imperatives. `MUST` = non-negotiable. `PREFER` = default choice unless context demands otherwise. `AVOID` = anti-pattern. Code blocks show `✅ DO` vs `❌ DON'T` side by side.

---

## Table of Contents

1. [Non-Negotiable Rules](#1-non-negotiable-rules)
2. [SOLID Principles](#2-solid-principles)
3. [General Design Principles](#3-general-design-principles)
4. [Clean Code](#4-clean-code)
5. [Error Handling](#5-error-handling)
6. [Security](#6-security)
7. [API & Integration Design](#7-api--integration-design)
8. [Data & Database](#8-data--database)
9. [Architecture Patterns](#9-architecture-patterns)
10. [Testing](#10-testing)
11. [Performance & Scalability](#11-performance--scalability)
12. [DevOps & Operations](#12-devops--operations)
13. [Distributed Systems](#13-distributed-systems)
14. [Agile & Delivery Process](#14-agile--delivery-process)
15. [Quality Standards Reference](#15-quality-standards-reference)
16. [DORA Metrics & Targets](#16-dora-metrics--targets)
17. [Master Principle Index](#17-master-principle-index)

---

## 1. Non-Negotiable Rules

Apply these in every session, every codebase, no exceptions.

**Security**
- NEVER concatenate user input directly into SQL, shell commands, HTML, or file paths.
- NEVER store passwords as plain text or using MD5/SHA1. Use bcrypt, Argon2, or scrypt.
- NEVER expose stack traces, internal paths, or DB errors to end users.
- NEVER commit secrets, API keys, or credentials to version control.
- ALWAYS deny access by default on auth errors (fail closed, not open).

**Code Quality**
- NEVER swallow exceptions silently. Always log or re-raise with context.
- NEVER use magic numbers or strings in logic. Always use named constants.
- NEVER write functions longer than ~20 lines without a clear justification.
- ALWAYS write code for the reader, not the machine. Readability beats cleverness.

**Design**
- NEVER duplicate business logic. Extract to shared functions/modules (DRY).
- NEVER build features that are not currently required (YAGNI).
- ALWAYS separate concerns: UI, business logic, and data access must not mix in one class.

**Data**
- ALWAYS use parameterized queries or ORMs. Never raw string SQL with interpolation.
- ALWAYS wrap multi-step DB operations in a transaction.
- NEVER expose internal IDs directly in public APIs without validation.

**Operations**
- ALWAYS load config from environment variables. Never hardcode URLs, credentials, or env-specific values.
- ALWAYS emit structured logs to stdout/stderr. Never manage log files inside the application.

---

## 2. SOLID Principles

### 2.1 Single Responsibility (SRP)
Each class or module must have exactly one reason to change.

```python
# ✅ DO — one class, one job
class UserRepository:
    def save(self, user): ...

class EmailService:
    def send_welcome(self, user): ...

class UserRegistrationService:
    def __init__(self, repo: UserRepository, email: EmailService):
        self.repo, self.email = repo, email

    def register(self, user):
        self.repo.save(user)
        self.email.send_welcome(user)

# ❌ DON'T — one class doing DB, email, logging, and reporting
class UserService:
    def register(self, user):
        db.execute("INSERT INTO users ...", user)
        smtp.send("welcome", user.email)
        log.write(f"registered {user.id}")
        report.generate_csv(user)
```

### 2.2 Open/Closed (OCP)
Open for extension, closed for modification. Add behavior via new classes, not by editing existing ones.

```python
# ✅ DO — add new payment provider without touching existing code
from abc import ABC, abstractmethod

class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: float): ...

class StripeGateway(PaymentGateway):
    def charge(self, amount): ...

class MidtransGateway(PaymentGateway):   # new provider — zero changes above
    def charge(self, amount): ...

# ❌ DON'T — edit the processor every time a provider is added
class PaymentProcessor:
    def process(self, amount, provider):
        if provider == "stripe": ...
        elif provider == "midtrans": ...
        # every new provider = modify this class
```

### 2.3 Liskov Substitution (LSP)
Subtypes must be substitutable for their base types without breaking the program.

```python
# ✅ DO — all shapes honor the contract
class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

# ❌ DON'T — subclass breaks the contract
class Bird:
    def fly(self): print("flying")

class Penguin(Bird):
    def fly(self):
        raise NotImplementedError("Penguins can't fly")
        # callers expecting Bird.fly() to work will crash
```

### 2.4 Interface Segregation (ISP)
Clients must not be forced to depend on methods they don't use. Split fat interfaces.

```python
# ✅ DO — small, focused interfaces
class IReadable(ABC):
    @abstractmethod
    def read(self, id): ...

class IWritable(ABC):
    @abstractmethod
    def write(self, data): ...

class ReadOnlyRepo(IReadable):     # implements only what it needs
    def read(self, id): ...

# ❌ DON'T — one giant interface forces useless implementations
class IRepository(ABC):
    def read(self): ...
    def write(self, data): ...
    def export_pdf(self): ...       # ReadOnlyRepo must implement this?
    def send_email_report(self): ...
```

### 2.5 Dependency Inversion (DIP)
Depend on abstractions, not concretions. Inject dependencies.

```python
# ✅ DO — depend on interface; easy to mock, easy to swap
class INotificationService(ABC):
    @abstractmethod
    def notify(self, message: str): ...

class OrderService:
    def __init__(self, notif: INotificationService):
        self.notif = notif

    def place_order(self, order):
        self.notif.notify(f"Order {order.id} placed")

# ❌ DON'T — hard-coded concrete dependency; untestable
class OrderService:
    def place_order(self, order):
        WhatsAppNotification().send(f"Order placed")  # can't mock; can't swap
```

---

## 3. General Design Principles

| Principle | Rule |
|---|---|
| **DRY** | Every piece of knowledge must have a single, authoritative representation. Extract shared logic. |
| **KISS** | Prefer the simplest solution that works. Complexity must be justified. |
| **YAGNI** | Don't implement something until it's actually needed. |
| **Separation of Concerns** | UI, business logic, and data access must live in separate layers/modules. |
| **Law of Demeter** | A module must not know about the internal structure of objects it manipulates. Avoid train wrecks. |
| **Composition over Inheritance** | Build behavior by composing small objects. Avoid deep inheritance hierarchies. |
| **Program to Interface** | Depend on abstractions. Use protocols, ABCs, or interfaces, not concrete classes. |
| **Encapsulation** | Hide internal state. Expose only what is necessary through controlled interfaces. |
| **High Cohesion** | Related code belongs together. A module should have one clearly defined purpose. |
| **Low Coupling** | Modules must not know each other's internals. Communicate via interfaces or APIs. |

```python
# ✅ DO — DRY: single source of validation logic
import re

def is_valid_email(email: str) -> bool:
    return bool(re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email))

# ❌ DON'T — copy-pasted validation in every service
class UserService:
    def register(self, email):
        if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email): ...  # duplicated

class InviteService:
    def invite(self, email):
        if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email): ...  # duplicated again
```

```python
# ✅ DO — Law of Demeter: talk to direct neighbors only
class OrderService:
    def get_city(self, customer_id):
        customer = self.customer_repo.find(customer_id)
        return customer.city

# ❌ DON'T — train wreck: fragile chaining across multiple objects
class OrderService:
    def get_city(self, order):
        return order.customer.address.location.city  # breaks if any part is None
```

---

## 4. Clean Code

### Naming
- Use intention-revealing names. The name must answer: what is this, why does it exist, how is it used.
- AVOID abbreviations, single-letter names (except loop counters), or vague words like `data`, `info`, `manager`, `handler`.

```python
# ✅ DO
elapsed_time_seconds = end_time - start_time
is_eligible_for_discount = user.total_purchases > DISCOUNT_THRESHOLD

def get_active_users_by_subscription(subscription_type: str) -> list[User]: ...

# ❌ DON'T
e = et - st
fl = up > 1000
def get(t): ...
```

### Functions
- PREFER functions under 20 lines. One function = one task.
- Functions with side effects MUST be clearly named to reveal the mutation (`save_user`, not `process_user`).
- AVOID output arguments. Return values; don't pass objects in to mutate them.

```python
# ✅ DO — small, focused, single-purpose
def validate_order(order) -> None:
    _assert_items_not_empty(order.items)
    _assert_positive_total(order.total)
    _assert_valid_address(order.address)

# ❌ DON'T — god function: validates, persists, sends email, updates inventory
def process(o):
    if not o['i']: return False
    if o['t'] <= 0: return False
    db.execute("INSERT INTO orders ...", o)
    smtp.send(o['email'], "received")
    inv.update(o['i'])
    return True
```

### Constants
- NEVER use magic numbers or magic strings. Name every non-trivial literal.

```python
# ✅ DO
MAX_LOGIN_ATTEMPTS = 5
SESSION_TIMEOUT_SECONDS = 3600
FREE_SHIPPING_THRESHOLD_IDR = 100_000

if user.failed_attempts >= MAX_LOGIN_ATTEMPTS:
    lock_account(user)

# ❌ DON'T
if user.failed_attempts >= 5:       # why 5? where is this documented?
    lock_account(user)
if total >= 100000:                  # 100000 what? threshold for what?
```

---

## 5. Error Handling

### Rules
- NEVER use empty `except` / `catch` blocks.
- ALWAYS catch specific exception types, not the base `Exception`.
- PREFER domain-specific exception classes over generic `RuntimeError`.
- ALWAYS include context (what failed, with what values) in error messages.
- ALWAYS log with stack trace before re-raising or translating exceptions.
- Implement **graceful degradation**: if a non-critical service fails, return safe defaults — don't crash the entire request.

```python
# ✅ DO — explicit, contextual, domain-specific
class InsufficientBalanceError(Exception):
    def __init__(self, available: float, required: float):
        super().__init__(f"Balance {available:.2f} < required {required:.2f}")
        self.available, self.required = available, required

def load_config(path: str) -> dict:
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError as e:
        logger.error("Config file missing", path=path, error=str(e))
        raise ConfigurationError(f"Missing config: {path}") from e
    except json.JSONDecodeError as e:
        logger.error("Config parse error", path=path, error=str(e))
        raise ConfigurationError(f"Invalid JSON in {path}") from e

# ❌ DON'T — silent failure; hidden bugs
def load_config(path: str) -> dict:
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        pass       # caller has no idea this failed
    return {}
```

```python
# ✅ DO — graceful degradation with fallback
def get_recommendations(user_id: str) -> list:
    try:
        return recommendation_service.get(user_id, timeout=2.0)
    except (TimeoutError, ConnectionError) as e:
        logger.warning("Recommendation service unavailable", error=str(e))
        return get_bestsellers(limit=10)   # safe fallback

# ❌ DON'T — one service down = full page 500
def get_recommendations(user_id: str) -> list:
    return recommendation_service.get(user_id)  # no timeout, no fallback
```

```python
# ✅ DO — fail closed (secure default)
def authorize(user, resource) -> bool:
    try:
        return permission_service.check(user.id, resource.id).is_allowed
    except Exception:
        logger.error("Permission check failed", exc_info=True)
        return False   # deny on error

# ❌ DON'T — fail open (security hole)
def authorize(user, resource) -> bool:
    try:
        return permission_service.check(user.id, resource.id).is_allowed
    except Exception:
        return True    # allow on error?! dangerous
```

---

## 6. Security

### OWASP Top 10 (2025) — Mandatory Mitigations

| # | Risk | MUST DO |
|---|---|---|
| A01 | Broken Access Control | Verify ownership on every resource access. Deny by default. Use RBAC/ABAC. |
| A02 | Cryptographic Failures | bcrypt/Argon2 for passwords. TLS 1.2+ everywhere. KMS for key management. |
| A03 | Injection | Parameterized queries always. Never interpolate user input into SQL/shell/HTML. |
| A04 | Insecure Design | Threat model before coding. Define abuse cases. Security requirements in PRD. |
| A05 | Security Misconfiguration | Harden all defaults. Disable debug in production. Minimal permissions. |
| A06 | Supply Chain Failures | Pin dependency versions. Maintain SBOM. Run SCA scanning in CI. |
| A07 | Authentication Failures | Enforce MFA. Set session expiry. Rate-limit login. |
| A08 | Data Integrity Failures | Sign artifacts. Verify provenance. Verified builds only. |
| A09 | Security Logging Failures | Centralized structured logging. Alert on anomalous access patterns. |
| A10 | Exceptional Conditions | Never expose stack traces. Return safe error messages to clients. |

```python
# ✅ DO — parameterized query; input never touches SQL
def get_user(db, user_id: int):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cursor.fetchone()

# ❌ DON'T — SQL injection waiting to happen
def get_user(db, user_id):
    cursor = db.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")  # exploitable
    return cursor.fetchone()
```

```python
# ✅ DO — check ownership before returning resource
@app.route("/orders/<int:order_id>")
@login_required
def get_order(order_id):
    order = Order.find(order_id)
    if order.user_id != current_user.id:
        abort(403)
    return jsonify(order)

# ❌ DON'T — authenticated but not authorized
@app.route("/orders/<int:order_id>")
@login_required
def get_order(order_id):
    return jsonify(Order.find(order_id))  # any logged-in user can see any order
```

```python
# ✅ DO — strong password hashing
import bcrypt

def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

def verify_password(password: str, hashed: bytes) -> bool:
    return bcrypt.checkpw(password.encode(), hashed)

# ❌ DON'T — weak or plain-text storage
import hashlib
def hash_password(password: str) -> str:
    return hashlib.md5(password.encode()).hexdigest()  # crackable with rainbow tables
```

### NIST SSDF — Secure Development Practices

| Practice | Action |
|---|---|
| **PO — Prepare Org** | Establish secure coding policy. Mandatory security training. Define security roles. |
| **PS — Protect Software** | Enforce repo access control. Sign commits and artifacts. |
| **PW — Produce Secure Software** | Threat modeling before coding. SAST in CI. Security in code review checklist. |
| **RV — Respond to Vulnerabilities** | CVE triage SLA: critical < 24h. Post-patch RCA required. |

### Core Security Principles

| Principle | Rule |
|---|---|
| **Least Privilege** | Grant minimum permissions required. No wildcard or admin roles for application services. |
| **Defense in Depth** | Layer controls: input validation + WAF + AuthN + AuthZ + encryption at rest + audit log. |
| **Secure by Default** | Default configuration must be safe. HTTPS on, cookies HttpOnly + Secure, CSRF active. |
| **Zero Trust** | Verify every request regardless of source. Mutual TLS for service-to-service. |
| **Fail Securely** | On error, deny access. Never allow access as a fallback. |

---

## 7. API & Integration Design

| Rule | Detail |
|---|---|
| **Contract-First** | Define OpenAPI/Swagger spec before implementation. Generate stubs from spec. |
| **Backward Compatibility** | Never remove or rename existing fields. Add new fields as optional. Version breaking changes as `/v2/`. |
| **Idempotency** | PUT and DELETE must be idempotent. Payment and mutation APIs must accept idempotency keys. |
| **Statelessness** | Servers must not store client session state in memory. Use JWT or external session store. |
| **Semantic Versioning** | `MAJOR.MINOR.PATCH` — breaking changes → major; new features → minor; bug fixes → patch. |

```python
# ✅ DO — idempotent payment: same key = same result, no double charge
def charge_payment(idempotency_key: str, amount: float):
    existing = cache.get(f"payment:{idempotency_key}")
    if existing:
        return existing  # return previous result; don't charge again

    result = gateway.charge(amount)
    cache.set(f"payment:{idempotency_key}", result, ttl=86400)
    return result

# ❌ DON'T — retry on timeout = double charge
def charge_payment(amount: float):
    return gateway.charge(amount)  # idempotency key missing
```

```python
# ✅ DO — backward-compatible: add optional field, keep old field
class UserResponse:
    id: int
    name: str                       # v1 field — keep it
    email: Optional[str] = None     # v2 addition — optional, non-breaking

# ❌ DON'T — rename existing field = breaking change for all consumers
# Before: {"user_name": "Alice"}
# After:  {"name": "Alice"}  ← v1 consumers crash immediately
```

---

## 8. Data & Database

### Integrity Rules
- ALWAYS define database-level constraints: `NOT NULL`, `FOREIGN KEY`, `UNIQUE`, `CHECK`.
- ALWAYS wrap multi-step mutations in a single transaction. Partial writes must never persist.
- NEVER normalize beyond the point where joins become unmanageable (3NF as default; relax with explicit justification).

```sql
-- ✅ DO — constraints enforced at DB level
CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status      VARCHAR(20) NOT NULL CHECK (status IN ('pending','paid','cancelled')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ❌ DON'T — no constraints; data validity depends entirely on application
CREATE TABLE orders (
    id      INT,
    user_id INT,       -- can be NULL or point to non-existent user
    amount  DECIMAL,   -- can be negative
    status  VARCHAR    -- can be anything
);
```

```python
# ✅ DO — atomic transaction; both sides succeed or both rollback
def transfer_funds(from_id, to_id, amount):
    with db.transaction():
        src = Account.find(from_id)
        dst = Account.find(to_id)
        if src.balance < amount:
            raise InsufficientBalanceError(src.balance, amount)
        src.balance -= amount
        dst.balance += amount
        db.save(src)
        db.save(dst)

# ❌ DON'T — no transaction; second save can fail, leaving money in limbo
def transfer_funds(from_id, to_id, amount):
    src = Account.find(from_id)
    src.balance -= amount
    db.save(src)          # persisted
    dst = Account.find(to_id)
    dst.balance += amount
    db.save(dst)          # if this fails → money is gone
```

### Query Performance
- ALWAYS index foreign keys and columns used in `WHERE`, `ORDER BY`, or `JOIN` conditions.
- ALWAYS use eager loading to prevent N+1 queries. Profile with query logger before shipping.
- ALWAYS paginate queries that return potentially unbounded result sets.

```python
# ✅ DO — eager loading eliminates N+1
orders = db.query(Order).options(joinedload(Order.items)).all()
for order in orders:
    print(order.items)   # no additional queries

# ❌ DON'T — 1 query for orders + N queries for items = N+1
orders = Order.find_all()
for order in orders:
    items = OrderItem.find_by_order(order.id)   # 1 query per order
# 100 orders = 101 DB round-trips
```

### Schema Migrations
- ALWAYS use a migration tool (Flyway, Liquibase, Alembic). Never modify schema by hand in production.
- Migration files MUST be committed to version control.
- PREFER backward-compatible migrations: add nullable columns, then backfill, then add constraints in a later migration.

### Immutability
- PREFER immutable value objects. Represent state changes as new objects, not mutations.

```python
# ✅ DO — frozen dataclass; update produces a new object
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: float
    currency: str

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

# ❌ DON'T — in-place mutation; hard to trace who changed what
class Money:
    def add(self, other):
        self.amount += other.amount   # mutates; original lost
```

---

## 9. Architecture Patterns

### Layered Architecture (Default)
PREFER a clear layer separation unless complexity justifies another pattern:

```
Presentation Layer   → HTTP handlers, CLI, GraphQL resolvers
Business Logic Layer → Services, use cases, domain models
Data Access Layer    → Repositories, ORMs, external API clients
```

Rules:
- Each layer MUST communicate only with the layer directly below it.
- Business logic MUST NOT import HTTP frameworks or ORM models directly.
- Data access MUST NOT contain business rules.

### Hexagonal Architecture (Ports & Adapters)
Use when the core domain must be isolated from infrastructure concerns (frameworks, DBs, queues).

```python
# ✅ DO — core domain knows nothing about infrastructure
# domain/ports.py
class IOrderRepository(ABC):
    @abstractmethod
    def save(self, order: Order) -> None: ...

# domain/services.py — pure business logic; no imports of Flask, SQLAlchemy, etc.
class OrderService:
    def __init__(self, repo: IOrderRepository):
        self.repo = repo

    def create_order(self, items: list) -> Order:
        order = Order(items=items)
        self.repo.save(order)
        return order

# adapters/postgres_repo.py — infrastructure detail, implements the port
class PostgresOrderRepository(IOrderRepository):
    def save(self, order: Order):
        db.execute("INSERT INTO orders ...", ...)
```

### CQRS (Command Query Responsibility Segregation)
Use when read and write workloads have significantly different performance or scalability needs.

```python
# ✅ DO — separate models for writes and reads
class CreateOrderCommand:
    user_id: str
    items: list

class OrderCommandHandler:
    def handle(self, cmd: CreateOrderCommand):
        order = Order.create(cmd.user_id, cmd.items)
        write_db.save(order)
        event_bus.publish(OrderCreatedEvent(order.id))

class OrderQueryService:
    def get_user_orders(self, user_id: str) -> list:
        return read_db.query(
            "SELECT * FROM order_summaries WHERE user_id = ?", user_id
        )
```

### Event Sourcing
Use when full audit history is required or state must be reconstructible from events.

### DDD — Domain-Driven Design
Apply when the domain is complex. Key building blocks:
- **Ubiquitous Language** — use domain terms in code. No technical synonyms.
- **Bounded Context** — define explicit boundaries between subdomains.
- **Aggregate** — group of entities with one root that enforces invariants.
- **Value Object** — immutable, identified by value not identity.
- **Domain Event** — something that happened in the domain; past tense naming (`OrderPlaced`).

---

## 10. Testing

### Test Pyramid

```
        /‾‾‾‾‾‾‾\
       /  E2E 10% \      slow, few, critical paths only
      /‾‾‾‾‾‾‾‾‾‾‾‾\
     / Integration 20%\   test layer interactions
    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
   /    Unit Tests 70%   \  fast, isolated, comprehensive
  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

### Rules
- MUST write tests before merging to main (TDD or test-alongside).
- MUST keep tests deterministic — no random data, no real clocks, no external services.
- MUST isolate tests — each test must clean up its own state.
- PREFER mocking at the boundary (repository, external API) not inside business logic.
- AVOID testing implementation details; test observable behavior.
- AVOID shared mutable state between test cases.

```python
# ✅ DO — isolated, deterministic, mocked
from unittest.mock import patch, MagicMock
from datetime import datetime

def test_order_creates_with_timestamp():
    fixed_time = datetime(2024, 1, 15, 10, 0, 0)
    mock_repo = MagicMock()

    with patch('myapp.services.datetime') as mock_dt:
        mock_dt.now.return_value = fixed_time
        service = OrderService(repo=mock_repo)
        order = service.create_order({"product": "A"})

    assert order.created_at == fixed_time
    mock_repo.save.assert_called_once_with(order)

# ❌ DON'T — depends on real DB, real clock; non-deterministic
def test_order_creates():
    service = OrderService(repo=RealDatabase())
    order = service.create_order({"product": "A"})
    assert order.created_at is not None   # fails if DB is down; not a unit test
```

### Shift Left
- QA must be involved from requirements phase, not just at release.
- Security testing (SAST, DAST) must run in CI, not only before production.
- Performance baselines must be captured in CI, not only after incidents.

---

## 11. Performance & Scalability

| Rule | Detail |
|---|---|
| **Profile before optimizing** | Never optimize code that isn't measured to be slow. Find the real bottleneck first. |
| **Cache at the right layer** | Use Redis/Memcached for query results; CDN for static assets; HTTP cache headers for APIs. |
| **Design for horizontal scale** | Processes must be stateless. State lives in external stores (DB, cache, queue). |
| **Lazy load** | Load data only when it's needed. Paginate by default. Use `select_related` / `joinedload`. |
| **Set timeouts always** | Every outbound HTTP/DB call must have an explicit timeout. Never use the default (often infinite). |

```python
# ✅ DO — cache-aside with TTL
def get_product(product_id: int):
    key = f"product:{product_id}"
    cached = redis.get(key)
    if cached:
        return json.loads(cached)
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    redis.setex(key, 300, json.dumps(product))
    return product

# ❌ DON'T — hit DB every request for rarely-changing data
def get_product(product_id: int):
    return db.query("SELECT * FROM products WHERE id = %s", product_id)
```

```python
# ✅ DO — stateless process; session in external store
def set_session(session_id, user_id):
    redis.setex(f"session:{session_id}", 3600, user_id)

# ❌ DON'T — in-process state; breaks horizontal scaling
sessions = {}  # pod A sets session; pod B doesn't know about it

def set_session(session_id, user_id):
    sessions[session_id] = user_id
```

---

## 12. DevOps & Operations

### Twelve-Factor App — Mandatory Compliance

| Factor | Rule |
|---|---|
| **Config** | All config via env vars. Never hardcode URLs, credentials, or feature flags. |
| **Dependencies** | Declare all dependencies explicitly. Commit lockfiles. |
| **Processes** | Stateless and share-nothing. Store session/state externally. |
| **Logs** | Emit to stdout/stderr as event streams. Never manage log files inside the app. |
| **Build/Release/Run** | Separate stages. Docker images are immutable — never SSH to patch production. |
| **Dev/Prod Parity** | Dev, staging, and production must use the same OS, runtime versions, and services. |
| **Disposability** | Fast startup. Graceful shutdown on SIGTERM. Health probes for readiness. |
| **Port Binding** | App exposes its own port. No special web server configuration required to run. |

```python
# ✅ DO — config from environment
import os
DATABASE_URL = os.environ["DATABASE_URL"]
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"

# ❌ DON'T — hardcoded environment-specific config
DATABASE_URL = "postgresql://prod-db:5432/myapp"
SECRET_KEY = "super_secret_key_123"  # committed to git?!
```

```python
# ✅ DO — structured logs to stdout
import structlog, sys
log = structlog.get_logger()

def process_order(order_id: str):
    log.info("order.processing.started", order_id=order_id)
    try:
        result = do_process(order_id)
        log.info("order.processing.done", order_id=order_id, duration_ms=result.ms)
    except Exception as e:
        log.error("order.processing.failed", order_id=order_id, error=str(e), exc_info=True)
        raise

# ❌ DON'T — print statements, unstructured, no levels
def process_order(order_id):
    print(f"Processing {order_id}")      # no level, no structured fields
    do_process(order_id)
    print("Done!")                        # no duration, no correlation ID
```

### Observability — Three Pillars

| Pillar | Tool Examples | Must Include |
|---|---|---|
| **Logs** | ELK, Loki, CloudWatch | Structured JSON. Request ID. User/Tenant ID. Duration. |
| **Metrics** | Prometheus, Grafana, Datadog | Latency p50/p95/p99. Error rate. Throughput. Saturation. |
| **Traces** | Jaeger, Zipkin, OpenTelemetry | Distributed trace ID propagated across all service boundaries. |

### Infrastructure as Code
- MUST define all infrastructure as code (Terraform, Pulumi, CDK).
- MUST version control all IaC, CI/CD pipelines, Helm charts, and migration scripts.
- NEVER manually provision or configure production infrastructure.

---

## 13. Distributed Systems

### CAP Theorem — Mandatory Decision
Before choosing a data store, explicitly decide between:
- **CP** (Consistency + Partition Tolerance): PostgreSQL cluster, CockroachDB — use for financial data, inventory.
- **AP** (Availability + Partition Tolerance): Cassandra, DynamoDB — use for shopping carts, social feeds, analytics.

### Core Patterns

| Pattern | When to Use |
|---|---|
| **Circuit Breaker** | Any synchronous call to an external service. Trip on high error rate. Fallback to safe default. |
| **Bulkhead** | Isolate thread pools and resource limits per downstream dependency. |
| **Idempotent Consumer** | All message handlers must be safe to execute multiple times. |
| **Outbox Pattern** | Ensure DB write and event publish are atomic. Never publish events outside a transaction. |
| **Saga** | Long-running distributed transactions. Use choreography (events) or orchestration (workflow engine). |

```python
# ✅ DO — circuit breaker protects against cascade failure
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.state = "CLOSED"
        self.failures = 0
        self.threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise ServiceUnavailableError("Circuit open")
        try:
            result = func(*args, **kwargs)
            self.failures = 0
            self.state = "CLOSED"
            return result
        except Exception:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.threshold:
                self.state = "OPEN"
            raise

# ❌ DON'T — no protection; one slow service blocks all threads
def get_profile(user_id):
    return requests.get(f"http://profile-svc/users/{user_id}", timeout=30).json()
    # if service degrades → 30s × N concurrent requests → thread pool exhausted
```

```python
# ✅ DO — async event publishing; loose coupling
def place_order(order_data):
    order = Order.create(order_data)
    db.save(order)
    kafka_producer.send("order.placed", {
        "order_id": str(order.id),
        "user_id": str(order.user_id),
        "amount": order.amount
    })
    return order  # notification service subscribes independently

# ❌ DON'T — synchronous coupling; notification down = order fails
def place_order(order_data):
    order = Order.create(order_data)
    db.save(order)
    notification_service.send_email(order.user_id, order.id)  # direct call
    inventory_service.reserve(order.items)                     # another direct call
    return order
```

---

## 14. Agile & Delivery Process

### Agile Manifesto — Values to Prioritize

| Over | Prefer |
|---|---|
| Processes and tools | **Individuals and interactions** |
| Comprehensive documentation | **Working software** |
| Contract negotiation | **Customer collaboration** |
| Following a plan | **Responding to change** |

### SDLC Phases — Required Activities

| Phase | Must-Have Artifacts |
|---|---|
| **Requirements** | PRD or User Stories with Acceptance Criteria; Traceability Matrix |
| **Architecture** | HLD, LLD, Architecture Decision Records (ADR); C4 diagram |
| **Construction** | Coding standards enforced in CI; mandatory code review before merge |
| **Testing** | Test plan; automated regression suite; security scan in CI |
| **Release** | Rollback plan; release notes; smoke test checklist |
| **Operations** | Runbook; on-call rotation; SLA/SLO documented |
| **Maintenance** | Defect tracking; patch cycle defined; deprecation process |

### Delivery Rules
- MUST deliver working software in iterations of 2 weeks or less.
- MUST use feature flags to decouple deploy from release.
- MUST not skip retrospectives. Document action items and follow up.
- MUST define and track Definition of Done per team — done means deployable.
- AVOID technical debt accumulation without a paydown plan. Track debt explicitly.

---

## 15. Quality Standards Reference

### ISO 25010 — Quality Characteristics (Non-Negotiable Minimums)

| Characteristic | Minimum Standard |
|---|---|
| **Functional Suitability** | All acceptance criteria pass. No regression from previous release. |
| **Performance Efficiency** | API p95 latency < 500ms under expected load. |
| **Reliability** | SLA > 99.9% for customer-facing services. Retry + failover implemented. |
| **Security** | All OWASP Top 10 mitigated. Secrets never in code. |
| **Maintainability** | Test coverage > 80%. Cyclomatic complexity < 10 per function. |
| **Usability** | Core user flows validated with real users before release. |
| **Portability** | Containerized. Runs identically in dev, staging, and production. |

### SWEBOK v4 — Knowledge Areas Engineers Must Apply

| Area | Practical Application |
|---|---|
| Requirements | User stories with ACs; traceability to test cases |
| Architecture | ADR for every significant decision; C4 for system documentation |
| Construction | Coding standards; linting in CI; refactoring as part of feature work |
| Testing | Automated at all pyramid levels; performance baseline in CI |
| Security | Threat model per feature; SAST/DAST in pipeline |
| Configuration Management | Git with branching strategy; all config versioned |
| SE Management | Velocity tracked; risk log maintained; KPIs reviewed per sprint |

---

## 16. DORA Metrics & Targets

Use these to measure delivery health. MUST track for any production system.

| Metric | Definition | Elite | High | Medium | Low |
|---|---|---|---|---|---|
| **Deployment Frequency** | How often you deploy to production | On-demand (multiple/day) | Daily–weekly | Weekly–monthly | < Monthly |
| **Lead Time for Changes** | Commit → production | < 1 hour | 1 day | 1 week | > 1 month |
| **Change Failure Rate** | % of deployments causing incidents | < 5% | 5–10% | 10–15% | > 15% |
| **MTTR** | Time to restore from failure | < 1 hour | < 1 day | < 1 week | > 1 week |
| **Reliability** | SLO attainment rate | > 99.9% | 99–99.9% | 95–99% | < 95% |

### How to Improve Each Metric
- **Deployment Frequency** → Smaller batch sizes. Feature flags. Automated release pipeline.
- **Lead Time** → Trunk-based development. Fast CI (< 10 min). Automated approval gates.
- **Change Failure Rate** → More unit/integration tests. Canary deployments. Better code review.
- **MTTR** → Runbooks for top incident types. Chaos engineering. Automated rollback.

---

## 17. Master Principle Index

Complete reference covering 163 principles across 27 categories.

| # | Category | Principle | Source | Priority |
|---|---|---|---|---|
| 1 | Lifecycle | Requirements Management | IEEE 12207 | P1 |
| 2 | Lifecycle | Architecture & Design | IEEE 12207 | P1 |
| 3 | Lifecycle | Construction / Development | IEEE 12207 | P1 |
| 4 | Lifecycle | Verification & Validation | IEEE 12207 | P1 |
| 5 | Lifecycle | Release & Deployment | IEEE 12207 | P1 |
| 6 | Lifecycle | Operations | IEEE 12207 | P1 |
| 7 | Lifecycle | Maintenance | IEEE 12207 | P1 |
| 8 | Lifecycle | Configuration Management | IEEE 12207 | P1 |
| 9 | Lifecycle | Quality Assurance | IEEE 12207 | P2 |
| 10 | Lifecycle | Documentation & Knowledge | IEEE 12207 | P2 |
| 11 | SWEBOK | Software Requirements | SWEBOK v4 | P1 |
| 12 | SWEBOK | Software Architecture | SWEBOK v4 | P1 |
| 13 | SWEBOK | Software Design | SWEBOK v4 | P1 |
| 14 | SWEBOK | Software Construction | SWEBOK v4 | P1 |
| 15 | SWEBOK | Software Testing | SWEBOK v4 | P1 |
| 16 | SWEBOK | SE Operations | SWEBOK v4 | P1 |
| 17 | SWEBOK | Software Maintenance | SWEBOK v4 | P1 |
| 18 | SWEBOK | Configuration Management | SWEBOK v4 | P1 |
| 19 | SWEBOK | SE Management | SWEBOK v4 | P1 |
| 20 | SWEBOK | SE Process | SWEBOK v4 | P1 |
| 21 | SWEBOK | Software Quality | SWEBOK v4 | P1 |
| 22 | SWEBOK | Software Security | SWEBOK v4 | P1 |
| 23 | SWEBOK | SE Models & Methods | SWEBOK v4 | P2 |
| 24 | SWEBOK | SE Professional Practice | SWEBOK v4 | P2 |
| 25 | SWEBOK | SE Economics | SWEBOK v4 | P2 |
| 26 | SWEBOK | Computing Foundations | SWEBOK v4 | P2 |
| 27 | SWEBOK | Engineering Foundations | SWEBOK v4 | P2 |
| 28 | SWEBOK | Mathematical Foundations | SWEBOK v4 | P3 |
| 29 | Agile Values | Individuals & Interactions | Agile Manifesto | P1 |
| 30 | Agile Values | Working Software | Agile Manifesto | P1 |
| 31 | Agile Values | Customer Collaboration | Agile Manifesto | P1 |
| 32 | Agile Values | Responding to Change | Agile Manifesto | P1 |
| 33 | Agile Principles | Early & Continuous Delivery | Agile Manifesto | P1 |
| 34 | Agile Principles | Welcome Change | Agile Manifesto | P1 |
| 35 | Agile Principles | Frequent Delivery | Agile Manifesto | P1 |
| 36 | Agile Principles | Business & Dev Collaboration | Agile Manifesto | P1 |
| 37 | Agile Principles | Working Software as Progress | Agile Manifesto | P1 |
| 38 | Agile Principles | Sustainable Pace | Agile Manifesto | P1 |
| 39 | Agile Principles | Technical Excellence | Agile Manifesto | P1 |
| 40 | Agile Principles | Simplicity | Agile Manifesto | P1 |
| 41 | Agile Principles | Build Around Motivated Individuals | Agile Manifesto | P2 |
| 42 | Agile Principles | Face-to-Face Communication | Agile Manifesto | P2 |
| 43 | Agile Principles | Self-Organizing Teams | Agile Manifesto | P2 |
| 44 | Agile Principles | Reflect & Adjust | Agile Manifesto | P1 |
| 45 | SOLID | Single Responsibility (SRP) | R.C. Martin | P1 |
| 46 | SOLID | Open/Closed (OCP) | R.C. Martin | P1 |
| 47 | SOLID | Liskov Substitution (LSP) | R.C. Martin | P2 |
| 48 | SOLID | Interface Segregation (ISP) | R.C. Martin | P2 |
| 49 | SOLID | Dependency Inversion (DIP) | R.C. Martin | P1 |
| 50 | General Design | DRY | Pragmatic Programmer | P1 |
| 51 | General Design | KISS | General | P1 |
| 52 | General Design | YAGNI | XP | P1 |
| 53 | General Design | Separation of Concerns | General | P1 |
| 54 | General Design | Law of Demeter | LoD / GRASP | P2 |
| 55 | General Design | Composition over Inheritance | GoF | P1 |
| 56 | General Design | Program to Interface | GoF | P1 |
| 57 | General Design | Encapsulation | OOP | P1 |
| 58 | General Design | High Cohesion | GRASP | P1 |
| 59 | General Design | Low Coupling | GRASP | P1 |
| 60 | General Design | Boy Scout Rule | Clean Code | P2 |
| 61 | ISO 25010 | Functional Suitability | ISO/IEC 25010 | P1 |
| 62 | ISO 25010 | Performance Efficiency | ISO/IEC 25010 | P1 |
| 63 | ISO 25010 | Usability | ISO/IEC 25010 | P1 |
| 64 | ISO 25010 | Reliability | ISO/IEC 25010 | P1 |
| 65 | ISO 25010 | Security | ISO/IEC 25010 | P1 |
| 66 | ISO 25010 | Maintainability | ISO/IEC 25010 | P1 |
| 67 | ISO 25010 | Compatibility | ISO/IEC 25010 | P2 |
| 68 | ISO 25010 | Portability | ISO/IEC 25010 | P2 |
| 69 | ISO 25010 QiU | Effectiveness | ISO/IEC 25010 | P1 |
| 70 | ISO 25010 QiU | Efficiency | ISO/IEC 25010 | P1 |
| 71 | ISO 25010 QiU | Freedom from Risk | ISO/IEC 25010 | P1 |
| 72 | ISO 25010 QiU | Satisfaction | ISO/IEC 25010 | P2 |
| 73 | ISO 25010 QiU | Context Coverage | ISO/IEC 25010 | P2 |
| 74 | NIST SSDF | Prepare the Organization (PO) | NIST SP 800-218 | P1 |
| 75 | NIST SSDF | Protect the Software (PS) | NIST SP 800-218 | P1 |
| 76 | NIST SSDF | Produce Well-Secured Software (PW) | NIST SP 800-218 | P1 |
| 77 | NIST SSDF | Respond to Vulnerabilities (RV) | NIST SP 800-218 | P1 |
| 78 | OWASP | Broken Access Control | OWASP 2025 | P1 |
| 79 | OWASP | Security Misconfiguration | OWASP 2025 | P1 |
| 80 | OWASP | Supply Chain Failures | OWASP 2025 | P1 |
| 81 | OWASP | Cryptographic Failures | OWASP 2025 | P1 |
| 82 | OWASP | Injection | OWASP 2025 | P1 |
| 83 | OWASP | Insecure Design | OWASP 2025 | P1 |
| 84 | OWASP | Authentication Failures | OWASP 2025 | P1 |
| 85 | OWASP | Data Integrity Failures | OWASP 2025 | P1 |
| 86 | OWASP | Security Logging Failures | OWASP 2025 | P1 |
| 87 | OWASP | Mishandling Exceptional Conditions | OWASP 2025 | P2 |
| 88 | 12-Factor | Codebase | 12factor.net | P1 |
| 89 | 12-Factor | Dependencies | 12factor.net | P1 |
| 90 | 12-Factor | Config | 12factor.net | P1 |
| 91 | 12-Factor | Backing Services | 12factor.net | P1 |
| 92 | 12-Factor | Build / Release / Run | 12factor.net | P1 |
| 93 | 12-Factor | Processes (Stateless) | 12factor.net | P1 |
| 94 | 12-Factor | Port Binding | 12factor.net | P1 |
| 95 | 12-Factor | Concurrency | 12factor.net | P1 |
| 96 | 12-Factor | Disposability | 12factor.net | P1 |
| 97 | 12-Factor | Dev/Prod Parity | 12factor.net | P1 |
| 98 | 12-Factor | Logs as Streams | 12factor.net | P1 |
| 99 | 12-Factor | Admin Processes | 12factor.net | P2 |
| 100 | DORA | Deployment Frequency | Google DORA | P1 |
| 101 | DORA | Lead Time for Changes | Google DORA | P1 |
| 102 | DORA | Change Failure Rate | Google DORA | P1 |
| 103 | DORA | MTTR | Google DORA | P1 |
| 104 | DORA | Reliability (SLO) | Google DORA | P1 |
| 105 | Security | Principle of Least Privilege | NIST | P1 |
| 106 | Security | Defense in Depth | NIST | P1 |
| 107 | Security | Secure by Default | OWASP | P1 |
| 108 | Security | Zero Trust | NIST | P1 |
| 109 | Security | Fail Securely | OWASP | P1 |
| 110 | API Design | Contract-First | OpenAPI | P1 |
| 111 | API Design | Backward Compatibility | REST | P1 |
| 112 | API Design | Idempotency | REST | P1 |
| 113 | API Design | Statelessness | REST | P1 |
| 114 | API Design | Semantic Versioning | SemVer | P1 |
| 115 | Data | Data Integrity | General | P1 |
| 116 | Data | Data Normalization | DB Theory | P1 |
| 117 | Data | Immutability | FP / DDD | P2 |
| 118 | Data | Single Source of Truth | General | P1 |
| 119 | Database | ACID Properties | DB Theory | P1 |
| 120 | Database | Index Strategically | DB Theory | P1 |
| 121 | Database | Avoid N+1 Query | ORM best practice | P1 |
| 122 | Database | Schema Migration Strategy | DevOps | P1 |
| 123 | Performance | Caching Strategy | General | P1 |
| 124 | Performance | Lazy Loading | General | P2 |
| 125 | Performance | Horizontal Scaling | Cloud | P1 |
| 126 | Performance | No Premature Optimization | Knuth | P1 |
| 127 | Testing | Test Pyramid | Martin Fowler | P1 |
| 128 | Testing | Shift Left Testing | DevOps | P1 |
| 129 | Testing | Deterministic Tests | General | P1 |
| 130 | Testing | Test Isolation | General | P1 |
| 131 | DevOps | Infrastructure as Code | DevOps | P1 |
| 132 | DevOps | Observability (Logs/Metrics/Traces) | Google SRE | P1 |
| 133 | DevOps | Immutable Infrastructure | DevOps | P1 |
| 134 | DevOps | Everything as Code | DevOps | P1 |
| 135 | Team | Documentation as Code | General | P1 |
| 136 | Team | Collective Code Ownership | XP | P2 |
| 137 | Team | Conway's Law | M. Conway | P2 |
| 138 | OO Design | Composition over Inheritance | GoF | P1 |
| 139 | OO Design | Program to Interface | GoF | P1 |
| 140 | OO Design | Favor Immutability | FP | P2 |
| 141 | Distributed | CAP Theorem | Brewer | P1 |
| 142 | Distributed | BASE vs ACID | General | P1 |
| 143 | Distributed | Event-Driven Architecture | General | P1 |
| 144 | Distributed | Circuit Breaker | M. Fowler | P1 |
| 145 | Distributed | Eventual Consistency | General | P2 |
| 146 | Distributed | Bulkhead Pattern | General | P2 |
| 147 | Distributed | Idempotent Consumer | General | P1 |
| 148 | Distributed | Outbox Pattern | General | P1 |
| 149 | Distributed | Saga Pattern | General | P2 |
| 150 | Clean Code | Meaningful Naming | R.C. Martin | P1 |
| 151 | Clean Code | Small Functions | R.C. Martin | P1 |
| 152 | Clean Code | Avoid Side Effects | FP / Clean Code | P1 |
| 153 | Clean Code | Readability over Cleverness | R.C. Martin | P1 |
| 154 | Clean Code | No Magic Numbers/Strings | R.C. Martin | P1 |
| 155 | Error Handling | Explicit over Implicit Errors | General | P1 |
| 156 | Error Handling | Never Swallow Exceptions | General | P1 |
| 157 | Error Handling | Domain-Specific Exceptions | DDD | P1 |
| 158 | Error Handling | Graceful Degradation | SRE | P2 |
| 159 | Error Handling | Fail Securely | Security | P1 |
| 160 | Architecture | Layered Architecture | General | P1 |
| 161 | Architecture | Hexagonal Architecture | A. Cockburn | P2 |
| 162 | Architecture | CQRS | G. Young | P2 |
| 163 | Architecture | Event Sourcing | General | P2 |
| 164 | Architecture | Domain-Driven Design | E. Evans | P2 |
| 165 | Dependency | Inversion of Control | General | P1 |
| 166 | Dependency | Explicit Dependencies | 12-Factor | P1 |

---

## References

| Source | Coverage |
|---|---|
| IEEE 12207 | SDLC phases and processes |
| SWEBOK v4 | 18 knowledge areas of software engineering |
| Agile Manifesto | 4 values, 12 principles |
| SOLID — R.C. Martin | 5 OO design principles |
| Clean Code — R.C. Martin | Code readability and naming |
| Pragmatic Programmer — Hunt & Thomas | DRY, KISS, YAGNI |
| ISO/IEC 25010:2023 | Product quality model |
| NIST SP 800-218 | Secure software development framework |
| OWASP Top 10 (2025) | Web application security risks |
| 12factor.net | Cloud-native app methodology |
| Google DORA Research | Software delivery performance metrics |
| Designing Data-Intensive Applications — M. Kleppmann | Distributed systems, data patterns |
| Accelerate — Forsgren, Humble, Kim | Engineering effectiveness research |
| Google SRE Book | Site reliability engineering practices |

---

*CLAUDE.md · 166 Principles · 17 Sections · ~99.5 percentile industry coverage*
*Sources: IEEE · SWEBOK v4 · Agile Manifesto · SOLID · ISO 25010 · NIST SSDF · OWASP 2025 · 12-Factor · DORA · SRE*
