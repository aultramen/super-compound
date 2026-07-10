# Test Design

Load when tests are hard to write, brittle, flaky, or dominated by mocks.

## Public Behavior

Test what the system does, not how modules collaborate. Prefer an API, service interface, command, rendered behavior, or other stable seam. A difficult test often signals an overly broad or shallow interface.

## When Stuck

| Problem | Response |
|---|---|
| Unknown test shape | Write the wished-for API and assertion first. |
| Huge setup | Extract focused helpers; if still large, simplify design. |
| Everything needs mocks | Inject dependencies and create a deeper module boundary. |
| Async flakiness | Wait on conditions/events, not fixed sleeps. |
| No safe seam | Consult `architecture-enforcement`; do not expose internals only for tests. |

## Mocking Boundary

Mock only true system boundaries: external APIs, time/randomness, file systems, and occasionally databases. Prefer local substitutes such as test databases, in-memory adapters, local files, fake clocks, and SDK-style adapters with specific operations.

Avoid:

- mocking your own modules to force a desired call sequence;
- test-only public methods exposing internals;
- hardcoded incomplete mocks that omit realistic errors;
- assertions on private calls instead of outcomes;
- uncontrolled network, clock, randomness, or shared state;
- disabled tests and fixed delays.

Test names describe behavior and conditions. Fixtures should represent realistic success and failure data. Refactoring internals without behavior change should not require rewriting the test.
