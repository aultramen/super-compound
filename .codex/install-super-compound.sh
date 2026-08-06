#!/usr/bin/env bash
# POSIX shell port of install-super-compound.ps1 (same directory), which is
# the source of feature parity for this script. Installs the super-compound
# Codex skill bundle into <codex-home>/skills/super-compound with a SHA-256
# hash manifest, staged transactional promotion, rollback on failure, and
# symlink (reparse-point analogue) confinement checks.
#
# Deviations from the .ps1 (documented, deliberate):
# - Path prefix confinement is case-sensitive (POSIX filesystems), whereas
#   the .ps1 uses OrdinalIgnoreCase for Windows semantics.
# - manifest.json is parsed with a line-based extractor instead of a full
#   JSON parser; file paths containing double quotes, backslash escapes
#   beyond \\ and \", tabs, or newlines are not supported (none exist in
#   this repository).
# - Adds --dry-run (no equivalent in the .ps1): prints what would be copied
#   without writing anything.

set -euo pipefail

SKILL_NAME="super-compound"
CANONICAL_DIRECTORIES=(context workflows skills templates rules agents evals hooks tools)

EXPECTED_PATHS=()
EXPECTED_SOURCES=()
EXPECTED_HASHES=()
MANIFEST_JSON=""
VERIFY_ERROR=""
HASH_CMD=""

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

usage() {
    cat <<EOF
Usage: install-super-compound.sh [options]

Installs the $SKILL_NAME Codex skill bundle into <codex-home>/skills/$SKILL_NAME.

Options:
  --codex-home <path>  Codex home directory (default: \$CODEX_HOME, else \$HOME/.codex)
  --verify-only        Verify the installed bundle against canonical sources; no writes
  --dry-run            Print what would be copied without writing anything
  -h, --help           Show this help and exit

Environment:
  CODEX_HOME                                 Default Codex home directory
  SUPER_COMPOUND_INSTALL_FAIL_AFTER_STAGE=1  Test hook: inject failure after staging
EOF
}

is_blank() {
    [[ ${1-} =~ ^[[:space:]]*$ ]]
}

resolve_hash_cmd() {
    if command -v sha256sum >/dev/null 2>&1; then
        HASH_CMD="sha256sum"
    elif command -v shasum >/dev/null 2>&1; then
        HASH_CMD="shasum"
    else
        die "No SHA-256 tool found: need sha256sum or shasum on PATH."
    fi
}

hash_file() {
    local file=$1 line
    if [ "$HASH_CMD" = "sha256sum" ]; then
        line=$(sha256sum -- "$file") || return 1
    else
        line=$(shasum -a 256 -- "$file") || return 1
    fi
    line=${line%% *}
    printf '%s' "${line,,}"
}

# Lexical absolute-path normalization; mirrors Get-NormalizedFullPath
# (does not resolve symlinks, collapses . and .., trims trailing slashes).
normalize_full_path() {
    local input=$1
    case $input in
        /*) : ;;
        *) input="$PWD/$input" ;;
    esac
    local -a parts=() stack=()
    local IFS='/'
    read -r -a parts <<<"$input"
    local part
    for part in "${parts[@]}"; do
        case $part in
            '' | '.') ;;
            '..')
                if [ "${#stack[@]}" -gt 0 ]; then
                    stack=("${stack[@]:0:${#stack[@]}-1}")
                fi
                ;;
            *) stack+=("$part") ;;
        esac
    done
    if [ "${#stack[@]}" -eq 0 ]; then
        printf '/'
        return 0
    fi
    local out=""
    for part in "${stack[@]}"; do
        out="$out/$part"
    done
    printf '%s' "$out"
}

# Non-fatal core check; prints the error and returns 1 (used by the cleanup
# trap so a failed guard skips one removal without aborting the "finally").
check_child_path() {
    local parent child prefix
    parent=$(normalize_full_path "$1")
    child=$(normalize_full_path "$2")
    prefix="$parent/"
    if [[ $child != "$prefix"* ]]; then
        printf '%s\n' "Refusing path outside managed root: $child" >&2
        return 1
    fi
}

assert_child_path() {
    check_child_path "$1" "$2" || exit 1
}

get_relative_path() {
    local root path
    root=$(normalize_full_path "$1")
    path=$(normalize_full_path "$2")
    assert_child_path "$root" "$path"
    printf '%s' "${path#"$root"/}"
}

assert_not_symlink() {
    local path=$1
    if [ -L "$path" ]; then
        die "Path confinement failed: reparse point is not allowed at $path"
    fi
}

check_tree_has_no_symlink() {
    local root=$1 bad
    if [ ! -e "$root" ] && [ ! -L "$root" ]; then
        return 0
    fi
    bad=$(find "$root" -type l -print 2>/dev/null | head -n 1) || bad=""
    if [ -n "$bad" ]; then
        printf '%s\n' "Path confinement failed: reparse point is not allowed at $bad" >&2
        return 1
    fi
}

assert_tree_has_no_symlink() {
    check_tree_has_no_symlink "$1" || exit 1
}

json_escape() {
    local s=$1
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    printf '%s' "$s"
}

json_unescape() {
    local s=$1
    s=${s//\\\"/\"}
    s=${s//\\\\/\\}
    printf '%s' "$s"
}

join_comma() {
    local out=$1
    shift
    local item
    for item in "$@"; do
        out="$out, $item"
    done
    printf '%s' "$out"
}

# Populates EXPECTED_PATHS/SOURCES/HASHES, sorted ordinally by bundle path.
# Mirrors Get-ExpectedFiles: adapter SKILL.md plus every file under each
# canonical .agent/<dir>, excluding __pycache__ directories and *.pyc/*.pyo.
compute_expected_files() {
    local repo_root=$1
    EXPECTED_PATHS=()
    EXPECTED_SOURCES=()
    EXPECTED_HASHES=()

    local adapter_skill="$repo_root/.codex/SKILL.md"
    if [ ! -f "$adapter_skill" ]; then
        die "Missing Codex adapter skill: $adapter_skill"
    fi
    EXPECTED_PATHS+=("SKILL.md")
    EXPECTED_SOURCES+=("$adapter_skill")
    EXPECTED_HASHES+=("$(hash_file "$adapter_skill")")

    local directory source_root file rel
    for directory in "${CANONICAL_DIRECTORIES[@]}"; do
        source_root="$repo_root/.agent/$directory"
        if [ ! -d "$source_root" ]; then
            die "Missing canonical directory: $source_root"
        fi
        assert_tree_has_no_symlink "$source_root"

        while IFS= read -r file; do
            [ -n "$file" ] || continue
            rel=$(get_relative_path "$source_root" "$file")
            if [[ $rel =~ (^|/)__pycache__(/|$) ]] || [[ $rel =~ \.(pyc|pyo)$ ]]; then
                continue
            fi
            EXPECTED_PATHS+=("references/$directory/$rel")
            EXPECTED_SOURCES+=("$file")
            EXPECTED_HASHES+=("$(hash_file "$file")")
        done < <(find "$source_root" -type f | LC_ALL=C sort)
    done

    sort_expected_files
}

sort_expected_files() {
    local count=${#EXPECTED_PATHS[@]}
    [ "$count" -gt 1 ] || return 0
    local -a order=() new_paths=() new_sources=() new_hashes=()
    local line idx i
    while IFS= read -r line; do
        order+=("${line##*$'\t'}")
    done < <(
        for ((i = 0; i < count; i++)); do
            printf '%s\t%s\n' "${EXPECTED_PATHS[i]}" "$i"
        done | LC_ALL=C sort
    )
    for idx in "${order[@]}"; do
        new_paths+=("${EXPECTED_PATHS[idx]}")
        new_sources+=("${EXPECTED_SOURCES[idx]}")
        new_hashes+=("${EXPECTED_HASHES[idx]}")
    done
    EXPECTED_PATHS=("${new_paths[@]}")
    EXPECTED_SOURCES=("${new_sources[@]}")
    EXPECTED_HASHES=("${new_hashes[@]}")
}

new_manifest_json() {
    local out i
    out=$'{\n  "schemaVersion": 1,\n  "algorithm": "SHA256",\n  "files": ['
    for ((i = 0; i < ${#EXPECTED_PATHS[@]}; i++)); do
        if [ "$i" -gt 0 ]; then
            out="$out,"
        fi
        out="$out"$'\n    {\n      "path": "'
        out="$out$(json_escape "${EXPECTED_PATHS[i]}")"
        out="$out"$'",\n      "sha256": "'
        out="$out${EXPECTED_HASHES[i]}"
        out="$out"$'"\n    }'
    done
    out="$out"$'\n  ]\n}'
    printf '%s' "$out"
}

# Mirrors Assert-InstalledBundle, but reports through VERIFY_ERROR and a
# nonzero return so the caller decides whether the failure is fatal.
verify_installed_bundle() {
    local target=$1
    VERIFY_ERROR=""

    if [ ! -d "$target" ]; then
        VERIFY_ERROR="Verification failed: installed skill directory is missing."
        return 1
    fi
    local manifest_path="$target/manifest.json"
    if [ ! -f "$manifest_path" ]; then
        VERIFY_ERROR="Verification failed: manifest.json is missing."
        return 1
    fi

    local -a expected_sorted=() actual_sorted=()
    mapfile -t expected_sorted < <(
        {
            printf '%s\n' "${EXPECTED_PATHS[@]}"
            printf 'manifest.json\n'
        } | LC_ALL=C sort
    )
    mapfile -t actual_sorted < <(
        cd "$target" && find . -type f | sed 's|^\./||' | LC_ALL=C sort
    )

    local -A expected_set=() actual_set=()
    local p
    for p in "${expected_sorted[@]}"; do
        expected_set["$p"]=1
    done
    for p in "${actual_sorted[@]}"; do
        actual_set["$p"]=1
    done

    local -a unexpected=() missing=()
    for p in "${actual_sorted[@]}"; do
        [ -n "${expected_set[$p]:-}" ] || unexpected+=("$p")
    done
    if [ "${#unexpected[@]}" -gt 0 ]; then
        VERIFY_ERROR="Verification failed: unexpected stale files: $(join_comma "${unexpected[@]}")"
        return 1
    fi
    for p in "${expected_sorted[@]}"; do
        [ -n "${actual_set[$p]:-}" ] || missing+=("$p")
    done
    if [ "${#missing[@]}" -gt 0 ]; then
        VERIFY_ERROR="Verification failed: missing files: $(join_comma "${missing[@]}")"
        return 1
    fi

    local schema_version algorithm
    schema_version=$(sed -n 's/^[[:space:]]*"schemaVersion"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*$/\1/p' "$manifest_path" | head -n 1) || schema_version=""
    algorithm=$(sed -n 's/^[[:space:]]*"algorithm"[[:space:]]*:[[:space:]]*"\([^"]*\)".*$/\1/p' "$manifest_path" | head -n 1) || algorithm=""
    if [ -z "$schema_version" ] || [ -z "$algorithm" ]; then
        VERIFY_ERROR="Verification failed: manifest.json is invalid JSON."
        return 1
    fi
    if [ "$schema_version" != "1" ] || [ "$algorithm" != "SHA256" ]; then
        VERIFY_ERROR="Verification failed: unsupported manifest metadata."
        return 1
    fi

    local -a manifest_paths=() manifest_hashes=()
    mapfile -t manifest_paths < <(sed -n 's/^[[:space:]]*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*$/\1/p' "$manifest_path")
    mapfile -t manifest_hashes < <(sed -n 's/^[[:space:]]*"sha256"[[:space:]]*:[[:space:]]*"\([^"]*\)".*$/\1/p' "$manifest_path")
    if [ "${#manifest_paths[@]}" -ne "${#manifest_hashes[@]}" ]; then
        VERIFY_ERROR="Verification failed: manifest.json is invalid JSON."
        return 1
    fi
    if [ "${#manifest_paths[@]}" -ne "${#EXPECTED_PATHS[@]}" ]; then
        VERIFY_ERROR="Verification failed: manifest file count mismatch."
        return 1
    fi

    local index record_path installed_path actual_hash
    for ((index = 0; index < ${#EXPECTED_PATHS[@]}; index++)); do
        record_path=$(json_unescape "${manifest_paths[index]}")
        if [ "$record_path" != "${EXPECTED_PATHS[index]}" ]; then
            VERIFY_ERROR="Verification failed: manifest path mismatch at index $index."
            return 1
        fi
        if [ "${manifest_hashes[index]}" != "${EXPECTED_HASHES[index]}" ]; then
            VERIFY_ERROR="Verification failed: manifest hash mismatch for ${EXPECTED_PATHS[index]}."
            return 1
        fi
        installed_path="$target/${EXPECTED_PATHS[index]}"
        actual_hash=$(hash_file "$installed_path") || actual_hash=""
        if [ "$actual_hash" != "${EXPECTED_HASHES[index]}" ]; then
            VERIFY_ERROR="Verification failed: hash mismatch for ${EXPECTED_PATHS[index]}."
            return 1
        fi
    done
    return 0
}

write_installed_bundle() {
    local target=$1
    mkdir -p -- "$target"
    local i destination
    for ((i = 0; i < ${#EXPECTED_PATHS[@]}; i++)); do
        destination="$target/${EXPECTED_PATHS[i]}"
        assert_child_path "$target" "$destination"
        mkdir -p -- "$(dirname -- "$destination")"
        cp -- "${EXPECTED_SOURCES[i]}" "$destination"
    done
    printf '%s\n' "$MANIFEST_JSON" >"$target/manifest.json"
    verify_installed_bundle "$target" || die "$VERIFY_ERROR"
}

new_transaction_id() {
    local id=""
    if [ -r /dev/urandom ] && command -v od >/dev/null 2>&1; then
        id=$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n') || id=""
    fi
    if [ -z "$id" ]; then
        id="$(date +%s)$$${RANDOM}"
    fi
    printf '%s' "$id"
}

# ---------------------------------------------------------------------------
# Argument parsing (mirrors the .ps1 parameters: -CodexHome, -VerifyOnly).
# ---------------------------------------------------------------------------
codex_home="${CODEX_HOME:-}"
verify_only=0
dry_run=0

while [ $# -gt 0 ]; do
    case $1 in
        --codex-home)
            shift
            [ $# -gt 0 ] || die "--codex-home requires a value."
            codex_home=$1
            ;;
        --codex-home=*)
            codex_home=${1#--codex-home=}
            ;;
        --verify-only)
            verify_only=1
            ;;
        --dry-run)
            dry_run=1
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *)
            die "Unknown option: $1 (use --help)"
            ;;
    esac
    shift
done

resolve_hash_cmd

if is_blank "$codex_home"; then
    if is_blank "${HOME:-}"; then
        die "Codex home is required. Pass --codex-home or set CODEX_HOME."
    fi
    codex_home="$HOME/.codex"
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(normalize_full_path "$script_dir/..")
codex_root=$(normalize_full_path "$codex_home")
if [ "$codex_root" = "/" ]; then
    die "Path confinement failed: Codex home cannot be a filesystem root."
fi
skills_root="$codex_root/skills"
target="$skills_root/$SKILL_NAME"
assert_child_path "$codex_root" "$skills_root"
assert_child_path "$skills_root" "$target"
assert_not_symlink "$codex_root"
assert_not_symlink "$skills_root"
assert_tree_has_no_symlink "$target"

if [ "$(basename -- "$target")" != "$SKILL_NAME" ]; then
    die "Refusing unexpected skill target: $target"
fi

compute_expected_files "$repository_root"
MANIFEST_JSON=$(new_manifest_json)

verification_failure=""
if ! verify_installed_bundle "$target"; then
    verification_failure=$VERIFY_ERROR
fi

if [ "$verify_only" -eq 1 ]; then
    if [ -n "$verification_failure" ]; then
        die "$verification_failure"
    fi
    printf '%s\n' "Verified $SKILL_NAME at $target against its canonical sources and hash manifest."
    exit 0
fi

if [ "$dry_run" -eq 1 ]; then
    if [ -z "$verification_failure" ]; then
        printf '%s\n' "$SKILL_NAME is already current at $target. Nothing to copy."
        exit 0
    fi
    printf '%s\n' "Dry run: would install $SKILL_NAME into $target with ${#EXPECTED_PATHS[@]} hashed files:"
    for ((i = 0; i < ${#EXPECTED_PATHS[@]}; i++)); do
        printf '  %s <- %s\n' "${EXPECTED_PATHS[i]}" "${EXPECTED_SOURCES[i]}"
    done
    printf '  %s\n' "manifest.json <- (generated)"
    exit 0
fi

if [ -z "$verification_failure" ]; then
    printf '%s\n' "$SKILL_NAME is already current at $target."
    exit 0
fi

# ---------------------------------------------------------------------------
# Transactional install: stage, back up existing target, promote, verify.
# The EXIT trap plays the roles of the .ps1 catch (rollback) and finally
# (cleanup of staging and backup) blocks.
# ---------------------------------------------------------------------------
mkdir -p -- "$skills_root"
assert_not_symlink "$skills_root"
transaction_id=$(new_transaction_id)
staging="$skills_root/.$SKILL_NAME.stage-$transaction_id"
backup="$skills_root/.$SKILL_NAME.backup-$transaction_id"
assert_child_path "$skills_root" "$staging"
assert_child_path "$skills_root" "$backup"
target_moved=0
stage_promoted=0
completed=0

transaction_cleanup() {
    local status=$?
    if [ "$status" -ne 0 ]; then
        if [ "$stage_promoted" -eq 1 ] && { [ -e "$target" ] || [ -L "$target" ]; }; then
            if check_child_path "$skills_root" "$target" &&
                check_tree_has_no_symlink "$target"; then
                rm -rf -- "$target"
            else
                status=1
            fi
        fi
        if [ "$target_moved" -eq 1 ] && { [ -e "$backup" ] || [ -L "$backup" ]; }; then
            mv -- "$backup" "$target" || status=1
        fi
    fi
    if [ -e "$staging" ] || [ -L "$staging" ]; then
        if check_child_path "$skills_root" "$staging" &&
            check_tree_has_no_symlink "$staging"; then
            rm -rf -- "$staging"
        else
            status=1
        fi
    fi
    if [ "$completed" -eq 1 ] && { [ -e "$backup" ] || [ -L "$backup" ]; }; then
        if check_child_path "$skills_root" "$backup" &&
            check_tree_has_no_symlink "$backup"; then
            rm -rf -- "$backup"
        else
            status=1
        fi
    fi
    exit "$status"
}
trap transaction_cleanup EXIT

write_installed_bundle "$staging"
if [ "${SUPER_COMPOUND_INSTALL_FAIL_AFTER_STAGE:-}" = "1" ]; then
    die "Injected failure after stage verification."
fi

if [ -e "$target" ] || [ -L "$target" ]; then
    mv -- "$target" "$backup"
    target_moved=1
fi
mv -- "$staging" "$target"
stage_promoted=1
verify_installed_bundle "$target" || die "$VERIFY_ERROR"
completed=1

printf '%s\n' "Installed $SKILL_NAME into $target with ${#EXPECTED_PATHS[@]} hashed files."
