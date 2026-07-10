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
6. Present a report and wait for approval before applying fixes.
