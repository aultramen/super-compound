# FastAPI Profile Example

Minimal service + HTTP boundary; no database or production auth/deployment claim.
Direct application/check dependencies are pinned in `pyproject.toml`. Python 3.12+
is the target. Work from a copy outside the framework source tree; preserve the
application's existing tool configuration when adopting the profile.

From the copied example directory, use uv 0.12.17 and the supplied universal
`uv.lock`: `uv sync --locked --extra checks --python 3.12`. Run commands through
that environment (`uv run --locked --extra checks ...`) locally and in CI.
The reference's runtime target does not override an application's approved
Python version. Review lock upgrades separately, then run:

```sh
python -m ruff format --check .
python -m ruff check .
python -m mypy
python -m pytest -q --junitxml=.pytest-results.xml
python /path/to/.agent/standards/tools/pytest-outcome.py --input .pytest-results.xml --output .test-outcome.json
python /path/to/.agent/standards/tools/python-boundaries.py --root . --config standards-boundaries.json
```

The commands above produce standalone illustrative reports. Active standards
configuration requires a repository-root result reference under `.scratch`, for
example `.scratch/standards/<scope>/test-outcome.json`. Configure tests + adapter
as one fail-fast entrypoint and forward that exact resolved output path to the
adapter's `--output`; `.test-outcome.json` beside the application is not an active
runner result reference. Remove prior reports before a run. The framework runner
clears configured result references. Type and
architecture checks are separate gates. Boundary mapping covers the declared
`app.domain` static imports; other architecture/design/security properties need
review and relevant project checks. Retain/pin the environment lockfile for CI.

Negative exercise: in an isolated copy, insert `from fastapi import FastAPI` into
`app/domain/greeting.py`; the boundary check must fail. Change a typed return to an
integer to exercise mypy; introduce unused imports to exercise Ruff. Do not leave
injected violations in the reference example.

Reference CI audits the actual installed environment with isolated
`uv tool run --python 3.12 --from pip-audit==2.10.1 pip-audit --strict --path <site-packages>`.
Use `.venv/Lib/site-packages` on Windows or
`.venv/lib/python3.12/site-packages` on Linux/macOS. Preserve scanner version,
native report, scan time and skipped-package count. A clean dependency scan is
bounded known-advisory evidence and does not establish deployed security.
