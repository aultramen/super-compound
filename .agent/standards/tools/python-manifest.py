"""Read literal Python dependency evidence without installing or evaluating config."""

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path


def dependencies(document: dict) -> dict:
    found = {}

    def add(name: str, version: str) -> None:
        key = re.sub(r"[-_.]+", "-", name).lower()
        if key in found and found[key] != version:
            raise ValueError(f"conflicting dependency evidence for {key}")
        found[key] = version

    declared = document.get("project", {}).get("dependencies", [])
    if not isinstance(declared, list):
        raise ValueError("project.dependencies must be an array")
    for entry in declared:
        if not isinstance(entry, str):
            raise ValueError("dependencies must be literal strings")
        requirement = entry.split(";", 1)[0].strip()
        match = re.fullmatch(r"([A-Za-z0-9][A-Za-z0-9_.-]*)(?:\[[A-Za-z0-9_,. -]+\])?\s*(.*)", requirement)
        if not match:
            raise ValueError("unsupported dependency declaration")
        add(match[1], match[2].strip())
    poetry = document.get("tool", {}).get("poetry", {}).get("dependencies", {})
    if not isinstance(poetry, dict):
        raise ValueError("Poetry dependencies must be a table")
    for name, entry in poetry.items():
        if name.lower() == "python":
            continue
        version = entry if isinstance(entry, str) else entry.get("version") if isinstance(entry, dict) else None
        if not isinstance(version, str):
            raise ValueError(f"unsupported Poetry dependency declaration for {name}")
        add(name, version)
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    try:
        with Path(args.input).open("rb") as source:
            result = dependencies(tomllib.load(source))
    except (OSError, ValueError, TypeError, AttributeError) as error:
        print(f"Python manifest error: {error}", file=sys.stderr)
        return 2
    print(json.dumps({"dependencies": result}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
