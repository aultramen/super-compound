# FastAPI / Python Profile

Candidate `1.0.0`; organization adoption requires review. This profile extends the
shared core without requiring SQLAlchemy, clean architecture or a new layout.
Default commands are suggestions for configuration, never execution fallbacks.

<a id="format"></a>
## Format

`FASTAPI-FORMAT`: run a non-mutating format check with the project's accepted,
pinned formatter and config. Ruff is the example default; retain an accepted
existing formatter rather than rewriting the repository on adoption.

<a id="lint"></a>
## Lint

`FASTAPI-LINT`: run the pinned linter for the applicable module/directory using
recorded config. Owner review is needed to disable mandatory controls.

<a id="type"></a>
## Type

`FASTAPI-TYPE`: run the project's selected type checker for its explicit scope
and Python target. Mypy is the example default; accepted alternatives require
an equivalent configured check and version/config identity.

<a id="architecture"></a>
## Architecture

`FASTAPI-ARCH`: declare the actual module prefixes and forbidden imports, then
run the configured boundary check. The bundled Python AST checker examines static
imports, including relative imports, in declared source roots. It does not resolve
dynamic imports, `sys.path` mutations, namespace-package roots outside the declared
project or runtime DI. Those need review or a stronger project checker.

<a id="conventions"></a>
## Conventions

Follow repository naming, accepted formatter config, error boundaries and tests;
reuse the existing
[FastAPI reference](../../skills/architecture-enforcement/references/fastapi.md)
when its architecture has been selected. Map its dependency direction to actual
folders rather than moving user code to match an illustration. Framework schemas
validate transport input; keep business behavior testable and translate failures
to safe HTTP responses. The
[example](../examples/fastapi-python/README.md) supplies a service, route, tests and
a declared boundary map without a database.
