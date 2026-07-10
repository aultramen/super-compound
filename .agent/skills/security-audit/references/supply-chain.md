## Dependency And Supply-Chain Checks

For new or risky dependencies:

- Confirm package name, maintainer, repository, license, release history, and download source.
- Prefer official registries and pinned lockfiles.
- Review install scripts and postinstall behavior.
- Check known CVEs with the project's native audit tool.
- Avoid lookalike package names and unnecessary transitive risk.
- Document why the dependency is needed and the fallback if it fails.
