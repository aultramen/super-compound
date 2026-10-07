## Audit Steps

1. Scan manifests, lockfiles, runtime declarations, CI, and deployment config.
2. Build a direct dependency map and note critical transitive dependencies.
3. Check major dependency pairs:
   - Framework and runtime
   - Framework and ORM
   - Library and library
   - Build tool and plugin
   - Test framework and runtime
4. Run ecosystem vulnerability checks where available.
5. Classify findings by severity.
6. Present findings read-only. When remediation is already authorized, return
   internally to its implementation owner; otherwise await an explicit request
   for remediation. Apply the configured risk policy there, without adding a
   second approval for unchanged authorized scope.
