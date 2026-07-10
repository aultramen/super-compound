# RED-GREEN-REFACTOR

Load for every feature behavior or regression.

## RED

Write one minimal test with a descriptive behavior name. Use real code through the highest public interface that reaches the behavior; avoid mocks unless an external boundary makes them necessary.

Run it and confirm:

- it fails rather than crashes from setup;
- the message matches the intended missing behavior;
- it did not pass because behavior already exists;
- it asserts outcomes, not collaborator calls or internal shape.

If it passes immediately, correct the test or choose behavior that is actually absent.

## GREEN

Implement the simplest behavior that makes the test pass. Do not add adjacent features, refactor unrelated code, or generalize beyond evidence. Run the new test and relevant existing tests. If failure remains, fix production code rather than weakening a valid test.

## REFACTOR

Only while green:

- remove duplication,
- improve names,
- extract helpers,
- deepen shallow modules when tests expose excessive setup,
- move logic toward the interface or domain owner,
- remove obsolete tests coupled only to old internals.

Keep checks running and add no new behavior during refactoring.

## Vertical Tracer Bullets

Do not create a horizontal batch of imagined tests followed by a batch of implementation. Complete one observable slice:

```text
RED -> GREEN: behavior one
RED -> GREEN: behavior two
RED -> GREEN: behavior three
REFACTOR while green
```

For bugfixes, preserve the initial RED output, pass after the fix, safely remove/disable the fix to prove the regression test fails, then restore and pass again when practical.
