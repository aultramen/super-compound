"""Check declared Python import boundaries; static imports only, no runtime proof."""

import argparse
import ast
import json
import re
from pathlib import Path


def contained(root: Path, name: str) -> Path:
    if not isinstance(name, str) or not name or Path(name).is_absolute():
        raise ValueError("paths must be non-empty and relative to the project root")
    result = (root / name).resolve()
    if not result.is_relative_to(root):
        raise ValueError("path escapes the project root")
    return result


def matches(module: str, prefix: str) -> bool:
    return module == prefix or module.startswith(prefix + ".")


def check(root: Path, config: Path) -> dict:
    mapping = json.loads(config.read_text(encoding="utf-8"))
    if not isinstance(mapping, dict) or mapping.get("schema") != "python_boundaries_v1":
        raise ValueError("expected python_boundaries_v1 mapping")
    roots = mapping.get("sourceRoots")
    rules = mapping.get("rules")
    if not isinstance(roots, list) or not roots or not isinstance(rules, list) or not rules:
        raise ValueError("sourceRoots and rules must be non-empty arrays")
    module_pattern = re.compile(r"[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\Z")
    for rule in rules:
        forbidden = rule.get("forbidden") if isinstance(rule, dict) else None
        if not isinstance(forbidden, list) or not forbidden:
            raise ValueError("each rule needs a from module and non-empty forbidden array")
        if any(not isinstance(name, str) or not module_pattern.fullmatch(name)
               for name in [rule.get("from"), *forbidden]):
            raise ValueError("boundary module names must be dotted Python identifiers")
    files = set()
    for name in roots:
        directory = contained(root, name)
        if not directory.is_dir():
            raise ValueError("sourceRoot does not exist")
        for candidate in directory.rglob("*.py"):
            if not candidate.resolve().is_relative_to(root):
                raise ValueError("Python source escapes the project root")
            files.add(candidate)
    if not files:
        raise ValueError("no Python files found in sourceRoots")
    violations = []
    coverage = [{"from": rule["from"], "modules": 0} for rule in rules]
    for source in sorted(files):
        relative = source.relative_to(root)
        module = ".".join(relative.with_suffix("").parts)
        if source.name == "__init__.py":
            module = module.removesuffix(".__init__")
        active_rules = []
        for rule, mapped in zip(rules, coverage):
            if matches(module, rule["from"]):
                mapped["modules"] += 1
                active_rules.append(rule)
        tree = ast.parse(source.read_text(encoding="utf-8-sig"), filename=str(relative))
        for node in ast.walk(tree):
            targets = []
            if isinstance(node, ast.Import):
                targets = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                base = node.module or ""
                if node.level:
                    package = module.split(".") if source.name == "__init__.py" else module.split(".")[:-1]
                    if node.level > len(package):
                        raise ValueError(f"relative import escapes package in {relative}:{node.lineno}")
                    parts = package[:len(package) - node.level + 1]
                    base = ".".join([*parts, *([base] if base else [])])
                targets = [base, *[base + "." + alias.name for alias in node.names]]
            for rule in active_rules:
                for target in targets:
                    if any(matches(target, prefix) for prefix in rule["forbidden"]):
                        violations.append({"file": relative.as_posix(), "line": node.lineno,
                                           "module": module, "import": target, "rule": rule["from"]})
                        break
    unmapped = [mapped["from"] for mapped in coverage if not mapped["modules"]]
    if unmapped:
        raise ValueError(f"Boundary rule {', '.join(unmapped)} matches no discovered Python modules")
    return {"schema": "python_boundary_result_v1", "status": "failed" if violations else "passed",
            "filesChecked": len(files), "mappedRules": coverage, "violations": violations,
            "limitations": ["static imports only; dynamic imports and runtime dependency paths require review"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    try:
        root = Path(args.root).resolve()
        report = check(root, contained(root, args.config))
    except (OSError, ValueError, TypeError, SyntaxError) as error:
        print(json.dumps({"schema": "python_boundary_result_v1", "status": "error", "error": str(error)}))
        return 2
    print(json.dumps(report))
    return 1 if report["violations"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
