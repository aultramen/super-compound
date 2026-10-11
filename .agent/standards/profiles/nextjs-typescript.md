# Next.js / TypeScript Profile

Candidate `1.0.0`; organization adoption requires review. This profile extends the
shared core; it does not impose an ORM, component library or universal layout.
Default commands are suggestions for configuration, never execution fallbacks.

<a id="format"></a>
## Format

`NEXT-FORMAT`: run a non-mutating formatting check using the project's accepted,
pinned formatter and configuration. Preserve existing formatting; do not mass
reformat during adoption. Prettier is the example default, not a cross-stack rule.

<a id="lint"></a>
## Lint

`NEXT-LINT`: run the pinned linter against the applicable directory using its
recorded config. Preserve relevant Next.js and TypeScript rules. Changes that
disable mandatory controls require the rule owner's approved exception.

<a id="type"></a>
## Type

`NEXT-TYPE`: run a type check using the selected TypeScript compiler and the
project's explicit `tsconfig` scope; do not silently widen/narrow the target.

<a id="architecture"></a>
## Architecture

`NEXT-ARCH`: map the project's actual module/layer paths to declared allowed or
forbidden imports, and run the configured check. A check with no mapped paths is
not architectural proof. Static import checking has declared limits for aliases,
dynamic imports and indirect runtime dependencies; inspect those during review.

<a id="conventions"></a>
## Conventions

Naming, route placement, dependency direction, error handling and testing follow
nearby repository conventions, accepted tool config, and the existing
[Next.js architecture reference](../../skills/architecture-enforcement/references/nextjs.md).
Its layout is a starting point to map, not a demand to relocate an established
application. Use App Router/Pages Router conventions appropriate to the selected
version; validate safe public errors and business behavior with project tests.
The [example](../examples/nextjs-typescript/README.md) exercises an App Router
route, pure service and relevant gates without a database.
