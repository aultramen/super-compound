#!/usr/bin/env bash
set -euo pipefail
codex_home="${CODEX_HOME:-$HOME/.codex}"
operation=install
dry_run=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --codex-home) [ "$#" -ge 2 ] || { echo 'Missing --codex-home value' >&2; exit 2; }; codex_home="$2"; shift 2 ;;
    --verify-only) operation=doctor; shift ;;
    --dry-run) dry_run=true; shift ;;
    -h|--help) echo 'Usage: install-super-compound.sh [--codex-home PATH] [--verify-only] [--dry-run]'; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
engine="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/.agent/tools/setup.mjs"
args=("$engine" "$operation" --codex-home "$codex_home")
if [ "$dry_run" = true ]; then args+=(--dry-run); fi
exec node "${args[@]}"
