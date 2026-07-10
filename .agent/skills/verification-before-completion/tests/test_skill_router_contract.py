#!/usr/bin/env python3
"""Contract test for the six progressive-disclosure skill routers."""

from pathlib import Path
import re
import sys


SKILLS_ROOT = Path(__file__).resolve().parents[2]
SKILLS = {
    "verification-before-completion": [
        "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE",
        "goal-backward",
        "integration-checking",
        "exit code",
    ],
    "systematic-debugging": [
        "DO NOT attempt fixes until",
        "root cause",
        "falsifiable",
        "failing test",
        "3+",
    ],
    "code-review": [
        "Spec compliance",
        "STOP",
        "P1",
        "P2",
        "P3",
        "file:line",
    ],
    "test-driven-development": [
        "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST",
        "Delete it. Start over.",
        "RED",
        "GREEN",
        "REFACTOR",
        "balanced",
    ],
    "executing-plans": [
        "approved FSD",
        "OPEN-*",
        "Search symbols, paths, tests, and nearby implementations",
        "/sc-go",
        "test-driven-development",
        "verification-before-completion",
    ],
    "gap-closure": [
        "Gaps only",
        "ORIGINAL verification",
        "max 2",
        "enhancement",
        "test-driven-development",
    ],
}


def frontmatter_value(text: str, key: str) -> str:
    match = re.match(r"\A---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return ""
    field = re.search(rf"(?m)^{re.escape(key)}:\s*[\"']?(.*?)[\"']?\s*$", match.group(1))
    return field.group(1) if field else ""


def main() -> int:
    failures = []
    for name, markers in SKILLS.items():
        skill_dir = SKILLS_ROOT / name
        router = skill_dir / "SKILL.md"
        text = router.read_text(encoding="utf-8")
        words = len(text.split())

        if words > 500:
            failures.append(f"{name}: {words} words exceeds 500")
        if frontmatter_value(text, "name") != name:
            failures.append(f"{name}: frontmatter name mismatch")
        if not frontmatter_value(text, "description").startswith("Use when"):
            failures.append(f"{name}: description must start with 'Use when'")
        for heading in ("## When to Use", "## Red Flags", "## Integration"):
            if heading not in text:
                failures.append(f"{name}: missing {heading}")
        for marker in markers:
            if marker not in text:
                failures.append(f"{name}: missing critical marker {marker!r}")

        for target in re.findall(r"\[[^\]]+\]\(([^)#]+\.md)\)", text):
            if "://" in target:
                continue
            linked = (skill_dir / target).resolve()
            if not linked.is_file():
                failures.append(f"{name}: broken Markdown link {target}")

        reference_links = re.findall(r"\[[^\]]+\]\((references/[^)#]+\.md)\)", text)
        if not reference_links:
            failures.append(f"{name}: no progressive reference links")
        linked_paths = set()
        for target in reference_links:
            linked = (skill_dir / target).resolve()
            linked_paths.add(linked)
            if not linked.is_file():
                failures.append(f"{name}: missing linked reference {target}")

        references_dir = skill_dir / "references"
        reference_files = set(references_dir.glob("*.md")) if references_dir.is_dir() else set()
        unlinked = sorted(path.name for path in reference_files if path.resolve() not in linked_paths)
        if unlinked:
            failures.append(f"{name}: unlinked references: {', '.join(unlinked)}")

    verification = (SKILLS_ROOT / "verification-before-completion" / "SKILL.md").read_text(
        encoding="utf-8"
    )
    if "../integration-checking/SKILL.md" not in verification:
        failures.append("verification-before-completion: must route to integration-checking")
    for duplicate_detail in ("API Contract Verification", "Data Flow Verification", "Event/Message Wiring"):
        if duplicate_detail in verification:
            failures.append(
                "verification-before-completion: duplicated integration detail " + duplicate_detail
            )

    if failures:
        print("skill router contract: FAIL", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print("skill router contract: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
