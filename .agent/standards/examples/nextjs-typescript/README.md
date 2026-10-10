# Next.js Profile Example

Minimal App Router service + HTTP boundary; no database or production deployment
claim. Direct application/check dependencies are pinned in `package.json`, with
Node 24 as the tested target. These versions were verified against official npm
metadata; they are example pins, not automatic application upgrades.
This bounded example loads TypeScript recommended rules and preserves all 22
Next.js 16.4.0 recommended rule IDs and their warning/error severities through
the licensed source closure in `checks/next-rule-bridge`. It does not claim the
full React/hooks/accessibility rule set of `eslint-config-next`; preserve a real
application's accepted lint config.

## Scoped reference contract and source identities

The bridge is maintained by Aulia Rahman for this golden reference only. Run
checks from the reference's scope directory. Its first-party root helper accepts
the default absolute `context.cwd` directory and fails on any **defined**
`settings.next.rootDir` value, including literals, arrays and globs. It does not
provide upstream root-glob compatibility. This restriction does not become a
mandatory Next.js profile convention or replace an application's accepted linter.
Monorepo applications continue using their declared directory scopes and tooling.

`checks/next-rule-bridge/PROVENANCE.json` records the upstream npm tarball identity,
Git tag commit, MIT license, exact 25 copied publisher-source hashes and separate
first-party index/package/root-helper hashes. The Git tag is repository provenance,
not a tarball attestation. The approved frozen package description and helper
comments retain their earlier SANDBOX/PROPOSAL wording byte-for-byte; the source
manifest records the subsequent bounded D03 approval. They do not authorize
application adoption, production qualification or organization enforcement.

`package.json` and `package-lock.json` remain authoritative for tool identities:
ESLint 10.12.0, Prettier 3.9.9, TypeScript 6.0.2, typescript-eslint 8.71.1,
Vitest 5.0.3 and eslint-utils 4.9.1. Configure the actual trimmed version-command
output in project `checks.*.tool.version`; do not guess a version string from
this list. Include the consumed package/lock/linter configuration and bridge
source manifest/files in `configRefs` so existing snapshot freshness detects
changes. Node 22 framework/helper checks do not qualify this example's Node 24
engine range. Browser-global bindings and cross-platform execution require
their own validation; the reference does not establish full application coverage.

## Running the example

Work from an isolated copy outside framework source. The supplied
`package-lock.json` freezes transitive dependencies; use `npm ci --ignore-scripts`
locally and in CI. Review lock upgrades separately from application adoption.
Then run:

```sh
npm run format
npm run lint
npm run type
npm run architecture
npm test
node /path/to/.agent/standards/tools/vitest-outcome.mjs --input .vitest-results.json --output .test-outcome.json
```

The commands above produce standalone illustrative reports. Active standards
configuration requires a repository-root result reference under `.scratch`, for
example `.scratch/standards/<scope>/test-outcome.json`. Configure tests + adapter
as one fail-fast entrypoint and forward that exact resolved output path to the
adapter's `--output`; `.test-outcome.json` beside the application is not an active
runner result reference. Clear previous reports before each run. The framework
runner clears configured result references. The native
framework test also exercises the service/route without a Next.js server; this
does not replace a production integration check.

`eslint.architecture.config.mjs` maps this example's service directory and static
imports; aliases outside its patterns and dynamic/indirect imports require review
or stronger project rules. The profile does not require this folder layout.

Negative exercise: in an isolated copy, import the route from the service with
`../../app/api/greeting/route.ts`; the architecture gate must fail. Change the
service's typed string return to an integer to exercise type checking; introduce
formatting drift or unused variables to exercise formatting/lint checks. Restore
the copy after each exercise. `npm run dev` serves the example locally.

Dependency security uses the same frozen lock locally and in reference CI:
`npm audit --audit-level=low --include=dev --include=optional --package-lock-only --ignore-scripts --json`.
The historical October 9 scan found the former npm Next lint plugin's transitive `braces` dependency
affected by [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The approved reference closure removes that npm plugin/root-glob dependency
chain while retaining the licensed recommended rules. Use the command above
against the exact frozen lock and retain the actual outcome; neither source
inspection nor functional tests establish security clearance. Original
application lockfiles and the historical failed scans remain unchanged.

## Migration and rollback

This is an explicit, bounded reference-tooling change. Existing projects keep
their pinned profiles, conventions and lint configuration. Before opting into
this reference bridge, review its cwd-only limitation, source manifest and exact
package/lock/config diff, bind all required checks, and re-resolve standards and
rerun the affected gates. A project needing defined rootDir settings must retain
its accepted tooling or remain unsupported by this bridge; do not drop settings
to manufacture a pass.

Rollback restores the previous complete reference manifest/lock/config/source
closure and its pinned identities, then re-resolves and reruns the affected
checks. Old receipts become stale. Restoring the old vulnerable dependency chain
restores its security NO-GO; rollback does not waive that finding or activate
enforcement. No mass reformat or application framework downgrade is required.
