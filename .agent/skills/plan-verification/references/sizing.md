### 7. Complexity And Sizing

For each goal or issue:

- Is it too broad? A focused task should fit one session.
- Is it too narrow? Tiny mechanical changes should be merged.
- Does it mix unrelated domains or user outcomes?
- Can it be described in two or three sentences?
- Is it completable in one context window?
- If it crosses database, API, UI, and tests, is it a coherent tracer bullet for one behavior?
- If it is layer-only, is that layer task independently verifiable and necessary?

Flag oversized, incoherent, or horizontal work. Do not flag a task merely because a valid vertical slice crosses multiple layers.

| Right-Sized | Too Big Or Wrongly Sliced |
|---|---|
| Add a DB column and rollback check | Build the entire dashboard |
| Add one UI state and browser verification | Add authentication |
| Update one server action with tests | Refactor the API |
| Add one usage metric path from query to chart with tests | Build all analytics backend, then all analytics UI |
