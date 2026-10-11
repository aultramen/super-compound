#!/usr/bin/env python3
"""D09 in-container logic. Python stdlib only; `closure` imports packaging from the tools venv.

Run as `python -I -B /q/d09.py <subcommand> ...`. The first statements below are the S3 guard:
modules the D09 policy never admits are made unimportable before anything else is imported,
so every process started through this file (installer, sigstore, pytest, probes) is guarded.
"""
import sys

BLOCKED = ('pyexpat', 'xml.parsers.expat', '_elementtree', '_sqlite3', 'sqlite3', '_lzma', 'lzma',
           '_bz2', 'bz2', '_tkinter', 'ensurepip', 'pip')
for _m in BLOCKED:
    sys.modules[_m] = None

import atexit  # noqa: E402
import base64  # noqa: E402
import datetime  # noqa: E402
import hashlib  # noqa: E402
import io  # noqa: E402
import json  # noqa: E402
import os  # noqa: E402
import re  # noqa: E402
import time  # noqa: E402

Q, IN, OUT, RUN = '/q', '/in', '/out', '/run'
PY = '/usr/local/bin/python3.12'
TUFQ = 'https%3A%2F%2Ftuf-repo-cdn.sigstore.dev'
POS_EXCLUDES = ['Unable to verify Timestamp with CA.', 'cert chain is incomplete', 'not in CA time range']
MAX_EVIDENCE = 4 * 1024 * 1024
EVIDENCE = '.scratch/d09/evidence/'
HARNESS = '.github/qualification/d09/'
STOP = 'D09-STOP'
# D09-VERIFIER-ADMISSION/1.0.0 codes use the plan numbering (I6): S1 fix available but not applied on a loaded
# component, S2 HIGH/CRITICAL/UNKNOWN advisory mapped and reachable, S3 blocked module/object loaded, S4 map outside
# the admitted set, S5 identity drift, S6 securityEvidence stale or invalid, S7 container resolver not dead.
POLICY = re.compile(r'S[1-7]: ')
RESOLVER_ENV = ('LOCALDOMAIN', 'RES_OPTIONS', 'HOSTALIASES')
PKCS7_PIN = 'PKCS7_verify@OPENSSL_3.0.0'


class Stop(Exception):
    """A policy STOP or admission denial (exit 1, message on stderr)."""


# ---------------------------------------------------------------- helpers

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def iso(t=None):
    return (t or utcnow()).isoformat().replace('+00:00', 'Z')


def parse_iso(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def b64nopad(digest):
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode()


def load(p):
    with open(p, 'rb') as f:
        return json.loads(f.read())


def mkdirs(p):
    os.makedirs(p, exist_ok=True)
    try:
        os.chmod(p, 0o777)  # host (other uid) must read/delete scratch evidence
    except OSError:
        pass


def save(p, obj):
    data = (json.dumps(obj, indent=1) + '\n').encode()
    if len(data) > MAX_EVIDENCE:
        raise Stop(f'evidence file exceeds 4 MiB: {p}')
    mkdirs(os.path.dirname(p))
    tmp = f'{p}.{os.getpid()}.tmp'
    with open(tmp, 'wb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.chmod(tmp, 0o666)
    os.replace(tmp, p)


def clip(s, n=65536):
    return s if len(s) <= n else s[:n] + f'\n[clipped {len(s) - n} chars; full stream sha256 recorded]'


def run(argv, *, env=None, cwd=None, timeout=None, stdin=None):
    import subprocess
    t0 = time.monotonic()
    try:
        p = subprocess.run(argv, env=env, cwd=cwd, timeout=timeout, input=stdin, capture_output=True)
        out, err, code = p.stdout, p.stderr, p.returncode
    except subprocess.TimeoutExpired as e:
        out, err, code = e.stdout or b'', (e.stderr or b'') + b'\n[d09 timeout]', None
    return {'argv': list(argv), 'exit': code, 'durationMs': int((time.monotonic() - t0) * 1000),
            'stdoutSha256': sha_bytes(out), 'stderrSha256': sha_bytes(err),
            'stdout': out.decode('utf-8', 'replace'), 'stderr': err.decode('utf-8', 'replace')}


def slim(r, n=65536):
    return {**r, 'stdout': clip(r['stdout'], n), 'stderr': clip(r['stderr'], n)}


def child_env(extra=None, home='/tmp'):
    env = {'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': home, 'LC_ALL': 'C.UTF-8', 'TZ': 'UTC'}
    env.update(extra or {})
    return env


def sigstore_env(cases):
    env = child_env({'XDG_DATA_HOME': '/state/data', 'XDG_CACHE_HOME': '/state/cache',
                     'XDG_CONFIG_HOME': '/state/config'}, home='/state/home')
    env.update(cases['invocation']['env'])
    return env


def check(name, ok, observed='', stop=None, group=None):
    """On failure, `stop` (a policy code) and every observed issue already in the form 'S<n>: reason' become
    the record's `stops`, which finish() prints as 'D09-STOP S<n>: reason'."""
    c = {'name': name, 'ok': bool(ok), 'observed': str(observed)[:2000]}
    if group:
        c['group'] = group
    if not ok:
        items = observed if isinstance(observed, list) else [observed]
        stops = ([f'{stop}: {name}: {c["observed"]}'] if stop else []) + [str(i) for i in items if POLICY.match(str(i))]
        if stops:
            c['stops'] = stops[:20]
    return c


def print_stops(stops, fallback=None):
    """Policy STOPs print exactly 'D09-STOP S<n>: <reason>'; a failure outside S1-S7 prints 'D09-STOP <reason>'."""
    for line in stops[:10] or ([fallback] if fallback else []):
        print(f'{STOP} {line}', file=sys.stderr)


def opts(argv, flags=(), multi=()):
    """Tiny argv parser: --key value pairs, repeatable keys in `multi`, bare flags, positionals."""
    o, pos, i = {k: [] for k in multi}, [], 0
    while i < len(argv):
        a = argv[i]
        if a in flags:
            o[a[2:]] = True
            i += 1
        elif a.startswith('--'):
            if i + 1 >= len(argv):
                raise Stop(f'missing value for {a}')
            k = a[2:]
            if k in o and isinstance(o[k], list):
                o[k].append(argv[i + 1])
            else:
                o[k] = argv[i + 1]
            i += 2
        else:
            pos.append(a)
            i += 1
    return o, pos


# ---------------------------------------------------------------- locks and wheel admission

PIN = re.compile(r'^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[([^\]]*)\])?==([^\s;\\]+)')


def canon(name):
    return re.sub(r'[-_.]+', '-', name).lower()


def parse_lock(text):
    """pip-compile hashed lock -> {canonical name: {version, extras, hashes}} in file order."""
    pins, cur = {}, None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        m = PIN.match(line)
        if m:
            name = canon(m.group(1))
            if name in pins:
                raise ValueError(f'duplicate pin {name}')
            cur = pins[name] = {'name': name, 'version': m.group(3),
                                'extras': sorted(filter(None, (m.group(2) or '').split(','))), 'hashes': []}
            line = line[m.end():]
        if cur is None:
            raise ValueError(f'hash before any pin: {raw!r}')
        for tok in line.split():
            if tok == '\\':
                continue
            algo, _, val = tok.partition('=')[2].partition(':')
            if not tok.startswith('--hash=') or algo != 'sha256' or not (re.fullmatch(r'[0-9a-f]{64}', val) or val == 'PENDING_W'):
                raise ValueError(f'unexpected lock token {tok!r}')
            cur['hashes'].append(val)
    for p in pins.values():
        if not p['hashes']:
            raise ValueError(f'pin without hash {p["name"]}')
    return pins


def wheel_key(filename):
    parts = filename[:-4].split('-') if filename.endswith('.whl') else []
    if len(parts) not in (5, 6):
        raise Stop(f'S5: unexpected wheel {filename} (not a wheel filename)')
    return canon(parts[0]), parts[1]


def inert_zip(path):
    """Admission before any import: names, entry kinds and exact RECORD bijection with per-row hashes."""
    import csv
    import zipfile
    issues = []
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        names = [i.filename for i in infos]
        if len(set(names)) != len(names):
            issues.append('duplicate member names')
        for i in infos:
            n = i.filename
            parts = n.rstrip('/').split('/')
            if n.startswith('/') or '\\' in n or re.match(r'^[A-Za-z]:', n) or any(p in ('', '.', '..') for p in parts):
                issues.append(f'unsafe path {n!r}')
            kind = (i.external_attr >> 16) & 0o170000
            if kind not in (0, 0o100000, 0o040000):
                issues.append(f'symlink/special entry {n!r}')
            if i.flag_bits & 0x1:
                issues.append(f'encrypted entry {n!r}')
        records = [n for n in names if re.fullmatch(r'[^/]+\.dist-info/RECORD', n)]
        if len(records) != 1:
            return issues + [f'expected exactly one RECORD, found {len(records)}']
        rows = [r for r in csv.reader(io.StringIO(z.read(records[0]).decode('utf-8'))) if r]
        paths = [r[0] for r in rows]
        files = {n for n in names if not n.endswith('/')}
        if len(set(paths)) != len(paths):
            issues.append('duplicate RECORD rows')
        if set(paths) != files:
            issues.append(f'RECORD/ZIP bijection broken: {sorted(set(paths) ^ files)[:5]}')
        for r in rows:
            if len(r) != 3:
                issues.append(f'malformed RECORD row {r!r}')
            elif r[0] == records[0]:
                if r[1] or r[2]:
                    issues.append('RECORD lists its own hash/size')
            elif r[0] in files:
                data = z.read(r[0])
                algo, _, val = r[1].partition('=')
                if algo != 'sha256' or val != b64nopad(hashlib.sha256(data).digest()) or r[2] != str(len(data)):
                    issues.append(f'RECORD hash/size mismatch {r[0]}')
    return issues


def admit(lock_texts, files, expect):
    pins = {}
    for text in lock_texts:
        for k, v in parse_lock(text).items():
            if k in pins:
                raise Stop(f'S5: pin in two locks {k}')
            pins[k] = v
    by_pin = {}
    for f in files:
        bn = os.path.basename(f)
        if os.path.islink(f) or not os.path.isfile(f):
            raise Stop(f'S5: unexpected wheel {bn} (not a regular file)')
        key, ver = wheel_key(bn)
        if key not in pins or pins[key]['version'] != ver:
            raise Stop(f'S5: unexpected wheel {bn}')
        if key in by_pin:
            raise Stop(f'S5: more than one wheel for pin {key}')
        by_pin[key] = f
    missing = [k for k in pins if k not in by_pin]
    if missing:
        raise Stop(f'S5: no wheel for pin {missing}')
    admitted = []
    for key, pin in pins.items():
        f = by_pin[key]
        digest = sha_file(f)
        if digest not in pin['hashes']:
            raise Stop(f'S5: sha256 not in lock hash set: {os.path.basename(f)} {digest}')
        issues = inert_zip(f)
        if issues:
            raise Stop(f'S5: inert ZIP admission failed {os.path.basename(f)}: {issues[:5]}')
        admitted.append({'pin': key, 'version': pin['version'], 'file': f, 'sha256': digest})
    if len(admitted) != expect:
        raise Stop(f'S5: expected {expect} wheels, admitted {len(admitted)}')
    return admitted


def wheel_files(*dirs):
    return [os.path.join(d, n) for d in dirs for n in sorted(os.listdir(d))]


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


# ---------------------------------------------------------------- guard probe and map admission

def scan_file(p, needles=()):
    """sha256 of a file plus which needles occur anywhere in it (chunk overlap keeps boundary hits)."""
    h, found, raw = hashlib.sha256(), set(), [n.encode() for n in needles]
    keep, tail = max(map(len, raw), default=1) - 1, b''
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
            window = tail + chunk
            found.update(n for n, b in zip(needles, raw) if b in window)
            tail = window[-keep:] if keep else b''
    return h.hexdigest(), sorted(found)


def register_probe(name):
    blocked = set(BLOCKED)

    def write():
        try:
            try:  # S3 also covers pinned forbidden bytes (inputs.build.forbiddenBytes) in any mapped file
                needles = load(f'{Q}/inputs.json')['build']['forbiddenBytes']
            except (OSError, ValueError, KeyError, TypeError):
                needles = None
            mods = [{'name': n, 'file': getattr(m, '__file__', None)} for n, m in sorted(list(sys.modules.items())) if m is not None]
            seen = set()
            with open('/proc/self/maps') as f:
                for line in f:
                    parts = line.rstrip('\n').split(None, 5)
                    if len(parts) == 6 and parts[5].startswith('/'):
                        seen.add(parts[5])
            maps = []
            for p in sorted(seen):
                try:
                    digest, hits = scan_file(p, needles or ())
                    maps.append({'path': p, 'sha256': digest, 'forbidden': hits})
                except OSError as e:
                    maps.append({'path': p, 'error': type(e).__name__})
            save(f'{OUT}/probes/{name}.json', {'probe': name, 'argv': list(sys.argv), 'pid': os.getpid(), 'modules': mods, 'forbiddenBytes': needles,
                                                'maps': maps, 'blockedLoaded': sorted(n for n in blocked if sys.modules.get(n) is not None)})
        except Exception as e:  # never mask the verifier's own exit status
            print(f'D09 probe write failed: {e!r}', file=sys.stderr)
    atexit.register(write)


SEVERITIES = ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN', 'NONE')
# S3 object minimum of D09-VERIFIER-ADMISSION/1.0.0 (plan, I6): expat, sqlite, lzma, bz2, PAM, the OpenSSL legacy
# provider and engines. inputs.runtime.blockedObjects is applied too and can only add to this list.
S3_OBJECTS = ('pyexpat.', 'libexpat', 'libsqlite3', 'liblzma', 'libbz2', 'libpam', 'pam_', 'legacy.', 'afalg.', 'padlock.', 'loader_attic.')


def load_dispositions(inputs):
    """I5 security dispositions, bound by sha256 in inputs.securityEvidence. Missing, mismatched or malformed: S6."""
    se = inputs.get('securityEvidence') or {}
    ref = se.get('dispositionsRef')
    name = ref[len(HARNESS):] if isinstance(ref, str) and ref.startswith(HARNESS) else ''
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*\.json', name):
        raise Stop(f'S6: securityEvidence.dispositionsRef is not a JSON file directly under {HARNESS}: {ref!r}')
    try:
        with open(f'{Q}/{name}', 'rb') as f:
            data = f.read()
    except OSError as e:
        raise Stop(f'S6: security dispositions missing: {ref} ({type(e).__name__})')
    if sha_bytes(data) != se.get('dispositionsSha256'):
        raise Stop(f'S6: security dispositions sha256 {sha_bytes(data)} != securityEvidence.dispositionsSha256 {se.get("dispositionsSha256")}')
    try:
        doc = json.loads(data)
    except ValueError as e:
        raise Stop(f'S6: security dispositions are not JSON: {e}')
    items = doc.get('items') if isinstance(doc, dict) and doc.get('schema') == 'd09_security_dispositions_v1' else None
    if not isinstance(items, list):
        raise Stop('S6: security dispositions schema is not d09_security_dispositions_v1 with an items list')
    for it in items:
        if not (isinstance(it, dict) and isinstance(it.get('id'), str) and isinstance(it.get('objects'), list) and all(isinstance(x, str) and x for x in it['objects'])
                and it.get('stopIfMapped') in ('S1', 'S2', 'S3', None) and isinstance(it.get('fixAvailable'), bool) and it.get('severity') in SEVERITIES):
            raise Stop(f'S6: security dispositions item malformed: {json.dumps(it)[:300]}')
    return items


def disposition_issues(item, path):
    """I5 rules for one mapped object matching an item's `objects` prefix."""
    out = [f'{item["stopIfMapped"]}: {item["id"]} mapped {path}'] if item['stopIfMapped'] else []
    if item['fixAvailable']:
        out.append(f'S1: {item["id"]} mapped {path} (fix available, not applied: {item.get("fixedIn")})')
    if item['severity'] in ('HIGH', 'CRITICAL', 'UNKNOWN') and item.get('reachable') is not False:
        out.append(f'S2: {item["id"]} mapped {path} ({item["severity"]}, reachable={item.get("reachable")})')
    return out


def probe_issues(probe, inputs, manifests, require_libcrypto=True, dispositions=()):
    """S3 blocked module/object or pinned forbidden bytes mapped; S4 every file-backed map is an admitted image or
    capsule file and at most the one system libcrypto; S1/S2 (and stopIfMapped) from the bound dispositions (I5)."""
    rt = inputs['runtime']
    image = {f['path']: f['sha256'] for f in rt['files'] if f['type'] == 'file'}
    capsule = {prefix + e['path']: e['sha256'] for prefix, entries in manifests.items() for e in entries if e['type'] == 'file'}
    issues = [f'S3: blocked module loaded: {n}' for n in probe.get('blockedLoaded', [])]
    issues += [f'S3: blocked module present: {m["name"]}' for m in probe.get('modules', []) if m['name'] in BLOCKED]
    if probe.get('forbiddenBytes') != inputs['build']['forbiddenBytes']:
        issues.append(f'S3: probe did not scan its maps for the pinned forbidden bytes (scanned {probe.get("forbiddenBytes")})')
    blocked = tuple(rt['blockedObjects']) + S3_OBJECTS
    for m in probe.get('maps', []):
        p = m['path']
        base = p.rsplit('/', 1)[-1]
        if base.startswith(blocked):
            issues.append(f'S3: blocked object mapped: {p}')
        elif 'sha256' not in m:
            issues.append(f'S4: unreadable map: {p}')
        elif image.get(p, capsule.get(p)) != m['sha256']:
            issues.append(f'S4: map not admitted: {p}')
        if m.get('forbidden'):
            issues.append(f'S3: forbidden bytes {m["forbidden"]} in mapped file: {p}')
        for item in dispositions:
            if any(base.startswith(x) for x in item['objects']):
                issues += disposition_issues(item, p)
    crypto = [m['path'] for m in probe.get('maps', []) if m['path'].rsplit('/', 1)[-1].startswith('libcrypto.so')]
    if crypto != [rt['libcrypto']] and (require_libcrypto or crypto):
        issues.append(f'S4: expected exactly one {rt["libcrypto"]}, mapped {crypto}')
    return issues


def probe_check(name, inputs, manifests, require_libcrypto=True):
    p = f'{OUT}/probes/{name}.json'
    if not os.path.exists(p):
        return [f'probe missing: {name}']
    try:
        dispositions, issues = load_dispositions(inputs), []
    except Stop as e:  # S3/S4 are still evaluated; the S6 issue alone fails the check
        dispositions, issues = [], [str(e)]
    return issues + probe_issues(load(p), inputs, manifests, require_libcrypto, dispositions)


def capsule_manifest(capsule):
    return {'/cap/venv/': load(f'{OUT}/manifest-{capsule}.json')['entries']}


# ---------------------------------------------------------------- exec-module

def cmd_exec_module(argv):
    """exec-module <module> [--path P] [--probe N] [--expect-version V] -- args..."""
    if '--' not in argv:
        raise Stop('exec-module requires -- before module arguments')
    cut = argv.index('--')
    o, pos = opts(argv[:cut])
    module = pos[0]
    if 'probe' in o:
        register_probe(o['probe'])
    if 'path' in o:
        sys.path.insert(0, o['path'])
    if 'expect-version' in o:
        mod = __import__(module)
        where = os.path.abspath(getattr(mod, '__file__', '') or '')
        if getattr(mod, '__version__', None) != o['expect-version'] or not where.startswith(os.path.abspath(o.get('path', '/nonexistent')) + os.sep):
            raise Stop(f'S5: {module} identity mismatch: version={getattr(mod, "__version__", None)} file={where}')
    import runpy
    sys.argv = [module] + argv[cut + 1:]
    runpy.run_module(module, run_name='__main__', alter_sys=True)
    return 0


def cmd_seed_pyexpat(argv):
    """Seeded S3 negative: deliberately un-guard pyexpat and import it (no parsing) so the checker must flag it."""
    o, _ = opts(argv)
    register_probe(o['probe'])
    for m in ('pyexpat', 'xml.parsers.expat'):
        sys.modules.pop(m, None)
    import pyexpat  # noqa: F401
    return 0


# ---------------------------------------------------------------- fetch (inside a container; system OpenSSL)

def cmd_fetch(argv):
    import urllib.parse
    import urllib.request
    o, _ = opts(argv, multi=('host',))
    manifest = load(o['manifest'])
    dest, allow = o['dest'], set(o['host'])

    class Guard(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            u = urllib.parse.urlsplit(newurl)
            if u.scheme != 'https' or u.hostname not in allow:
                raise Stop(f'redirect off allowlist: {newurl}')
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    opener = urllib.request.build_opener(Guard)
    records, failed = [], 0
    for item in manifest['files']:
        target = os.path.join(dest, item['path'])
        rec = {'path': item['path'], 'expectedSize': item['size'], 'expectedSha256': item['sha256'], 'startedAt': iso()}
        if os.path.exists(target) and os.path.getsize(target) == item['size'] and sha_file(target) == item['sha256']:
            records.append({**rec, 'status': 'present', 'finishedAt': iso()})
            continue
        for url in [item['url'], *item.get('fallbackUrls', [])]:
            u = urllib.parse.urlsplit(url)
            rec.update(url=url, error=None)
            if u.scheme != 'https' or u.hostname not in allow:
                rec['error'] = 'url not https on allowlisted host'
                continue
            mkdirs(os.path.dirname(target))
            tmp = f'{target}.{os.getpid()}.part'
            try:
                h, n = hashlib.sha256(), 0
                with opener.open(urllib.request.Request(url, headers={'User-Agent': 'd09-harness/1'}), timeout=60) as resp, open(tmp, 'wb') as f:
                    rec.update(finalUrl=resp.geturl(), httpStatus=resp.status)
                    for chunk in iter(lambda: resp.read(1 << 20), b''):
                        n += len(chunk)
                        if n > item['size']:
                            raise Stop('response larger than pinned size')
                        h.update(chunk)
                        f.write(chunk)
                rec.update(bytes=n, sha256=h.hexdigest())
                if n != item['size'] or h.hexdigest() != item['sha256']:
                    raise Stop('size/sha256 mismatch')
                os.chmod(tmp, 0o644)
                os.replace(tmp, target)
                rec['status'] = 'fetched'
                break
            except Exception as e:
                rec['error'] = f'{type(e).__name__}: {e}'
                if os.path.exists(tmp):
                    os.remove(tmp)
        rec['finishedAt'] = iso()
        rec.setdefault('status', 'failed')
        failed += rec['status'] == 'failed'
        records.append(rec)
    save(o['record'], {'schema': 'd09_fetch_v1', 'records': records, 'failed': failed})
    return 1 if failed else 0


# ---------------------------------------------------------------- sdist extraction

def extract_sdist(sdist, sha256, dest, top, only=None, loosen=False):
    import tarfile
    if sha_file(sdist) != sha256:
        raise Stop('S5: sdist sha256 mismatch (rejected before extraction)')
    with tarfile.open(sdist, 'r:gz') as t:
        members = []
        for m in t.getmembers():
            if m.name != top and not m.name.startswith(top + '/'):
                raise Stop(f'sdist member outside {top}/: {m.name}')
            relname = m.name[len(top) + 1:]
            if relname and (not only or relname == only or relname.startswith(only + '/')):
                members.append(m.replace(name=relname, deep=False))
        mkdirs(dest)
        t.extractall(dest, members=members, filter='data')
    if loosen:  # scratch copy under /run: let the host user delete it (filter='data' strips g/o write)
        for dirpath, dirnames, filenames in os.walk(dest):
            os.chmod(dirpath, 0o777)
            for n in filenames:
                os.chmod(os.path.join(dirpath, n), 0o666)
    return len(members)


def sdist_files(sdist, sha256, top):
    """Regular-file members of the hash-pinned sdist, read in memory after the sha256 check: {path under top/: bytes}."""
    import tarfile
    with open(sdist, 'rb') as f:
        data = f.read()
    if sha_bytes(data) != sha256:
        raise Stop('S5: sdist sha256 mismatch (rejected before reading members)')
    out = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as t:
        for m in t.getmembers():
            if m.name != top and not m.name.startswith(top + '/'):
                raise Stop(f'sdist member outside {top}/: {m.name}')
            if m.isfile():
                out[m.name[len(top) + 1:]] = t.extractfile(m).read()
    return out


def sdist_python(files):
    """sdist src/ .py members keyed by their wheel path (src/rfc3161_client/x.py -> rfc3161_client/x.py)."""
    return {k[4:]: v for k, v in files.items() if k.startswith('src/') and k.endswith('.py')}


# ---------------------------------------------------------------- install / manifest / compare / closure

def venv_argv(name, cap):
    """B11: the capsule venv is created through the S3 guard with its own probe (venv imports shutil, which would
    otherwise load bz2/lzma and map libbz2/liblzma)."""
    return [PY, '-I', '-B', f'{Q}/d09.py', 'exec-module', 'venv', '--probe', f'venv-{name}', '--', '--without-pip', f'{cap}/venv']


def cmd_install(argv):
    o, _ = opts(argv, multi=('lock', 'wheels'))
    name, cap = o['name'], o['cap']
    inputs = load(f'{Q}/inputs.json')
    rec = {'name': name, 'nonce': o['nonce'], 'startedAt': iso(), 'checks': []}
    try:
        if os.listdir(cap):
            raise Stop(f'S5: capsule volume not empty: {os.listdir(cap)[:5]}')
        admitted = admit([read(p) for p in o['lock']], wheel_files(*o['wheels']), int(o['expect']))
        rec['checks'].append(check('admitted before import', True, f'{len(admitted)} wheels'))
        if sha_file(o['installer']) != o['installer-sha256']:
            raise Stop('S5: installer wheel sha256 mismatch')
        venv = run(venv_argv(name, cap), env=child_env(), timeout=40)
        rec['venv'] = slim(venv)
        if venv['exit'] != 0:
            raise Stop('venv creation failed')
        inst = run([f'{cap}/venv/bin/python', '-I', '-B', f'{Q}/d09.py', 'exec-module', 'installer', '--path', o['installer'],
                    '--expect-version', '1.0.1', '--probe', f'install-{name}', '--', '--no-compile-bytecode', '--validate-record', 'all',
                    *[a['file'] for a in admitted]], env=child_env(), timeout=float(o.get('timeout', 45)))
        rec['installer'] = slim(inst)
        rec['checks'].append(check('installer --validate-record all exit 0', inst['exit'] == 0, inst['exit']))
        rec['admitted'] = [{k: a[k] for k in ('pin', 'version', 'sha256')} for a in admitted]
        for probe in (f'venv-{name}', f'install-{name}'):  # neither process runs capsule code: only image files may be mapped
            issues = probe_check(probe, inputs, {}, require_libcrypto=False)
            rec['checks'].append(check(f'{probe} probe: no blocked module/object, every map admitted', not issues, issues))
    except (Stop, ValueError) as e:
        rec['checks'].append(check('install', False, e))
    return finish(f'{OUT}/install-{name}.json', rec)


def finish(path, rec):
    rec['finishedAt'] = iso()
    rec['ok'] = bool(rec['checks']) and all(c['ok'] for c in rec['checks'])
    save(path, rec)
    bad = [c for c in rec['checks'] if not c['ok']]
    print(json.dumps({'evidence': path, 'ok': rec['ok'], 'failed': bad[:3]}))
    print_stops([s for c in bad for s in c.get('stops', [])], bad and f'{bad[0]["name"]}: {bad[0]["observed"]}')
    return 0 if rec['ok'] else 1


def manifest(root):
    entries = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for n in sorted(dirnames + filenames):
            p = os.path.join(dirpath, n)
            relp = os.path.relpath(p, root).replace(os.sep, '/')
            st = os.lstat(p)
            e = {'path': relp, 'mode': oct(st.st_mode & 0o7777)}
            if os.path.islink(p):
                e.update(type='symlink', link=os.readlink(p))
            elif os.path.isdir(p):
                e['type'] = 'dir'
            elif os.path.isfile(p):
                e.update(type='file', size=st.st_size, sha256=sha_file(p))
            else:
                e['type'] = 'special'
            entries.append(e)
    return sorted(entries, key=lambda e: e['path'])


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def site_packages(venv):
    return f'{venv}/lib/python3.12/site-packages'


def dist_infos(venv):
    sp = site_packages(venv)
    return sorted(os.path.join(sp, n) for n in os.listdir(sp) if n.endswith('.dist-info'))


def metadata_fields(text):
    head = text.split('\n\n', 1)[0]
    fields = {}
    for line in head.splitlines():
        if ':' in line and not line.startswith((' ', '\t')):
            k, _, v = line.partition(':')
            fields.setdefault(k.strip(), []).append(v.strip())
    return fields


def record_issues(venv, di):
    import csv
    sp = site_packages(venv)
    issues = []
    with open(os.path.join(di, 'RECORD'), newline='', encoding='utf-8') as f:
        for row in csv.reader(f):
            if not row or not row[1]:
                continue
            p = os.path.normpath(os.path.join(sp, row[0]))
            algo, _, val = row[1].partition('=')
            try:
                with open(p, 'rb') as g:
                    data = g.read()
            except OSError:
                issues.append(f'missing {row[0]}')
                continue
            if algo != 'sha256' or val != b64nopad(hashlib.sha256(data).digest()) or row[2] != str(len(data)):
                issues.append(f'hash/size {row[0]}')
    return issues


def cmd_compare(argv):
    o, _ = opts(argv)
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': []}
    ma, mb = manifest(o['a']), manifest(o['b'])
    save(f'{OUT}/manifest-a.json', {'root': '/cap/venv', 'entries': ma})
    save(f'{OUT}/manifest-b.json', {'root': '/cap/venv', 'entries': mb})
    rec['checks'].append(check('capsule manifests byte-equal', canonical(ma) == canonical(mb), f'a={sha_bytes(canonical(ma))} b={sha_bytes(canonical(mb))} entries={len(ma)}', stop='S5'))
    pins = parse_lock(read(o['lock']))
    for label, venv in (('a', o['a']), ('b', o['b'])):
        found, rec_bad = {}, []
        for di in dist_infos(venv):
            f = metadata_fields(read(os.path.join(di, 'METADATA')))
            found[canon(f['Name'][0])] = f['Version'][0]
            rec_bad += record_issues(venv, di)
        expected = {k: v['version'] for k, v in pins.items()}
        rec['checks'].append(check(f'{label}: dist set == lock', found == expected, f'{len(found)} dists; diff={sorted(set(found.items()) ^ set(expected.items()))[:5]}', stop='S5'))
        rec['checks'].append(check(f'{label}: RECORD re-verified', not rec_bad, rec_bad[:5], stop='S5'))
    for label, entries in (('a', ma), ('b', mb)):
        pth = [e['path'] for e in entries if e['path'].endswith('.pth')]
        cache = [e['path'] for e in entries if '__pycache__' in e['path'].split('/')]
        rec['checks'].append(check(f'{label}: no .pth files', not pth, pth[:5]))
        rec['checks'].append(check(f'{label}: no __pycache__', not cache, cache[:5]))
        pe = []
        for e in entries:
            if e['type'] == 'file':
                with open(os.path.join(o[label], e['path']), 'rb') as f:
                    if f.read(2) == b'MZ':
                        pe.append(e['path'])
        rec['checks'].append(check(f'{label}: no PE (MZ) files', not pe, pe[:5]))
    clo = run([f'{o["tools"]}/bin/python', '-I', '-B', f'{Q}/d09.py', 'closure', '--venv', o['a'], '--lock', o['lock'], '--nonce', o['nonce']], env=child_env(), timeout=40)
    rec['closure'] = slim(clo, 16384)
    rec['checks'].append(check('closure (Requires-Dist markers/extras, WHEEL tags) exit 0', clo['exit'] == 0, clo['exit']))
    return finish(f'{OUT}/compare.json', rec)


def cmd_closure(argv):
    from packaging.requirements import Requirement
    from packaging.tags import sys_tags
    from packaging.utils import canonicalize_name
    from packaging.version import Version
    o, _ = opts(argv)
    pins = parse_lock(read(o['lock']))
    extras = {k: set(v['extras']) for k, v in pins.items()}
    installed, issues, n = {}, [], 0
    for di in dist_infos(o['venv']):
        f = metadata_fields(read(os.path.join(di, 'METADATA')))
        installed[canonicalize_name(f['Name'][0])] = (Version(f['Version'][0]), f.get('Requires-Dist', []), di)
    supported = {str(t) for t in sys_tags()}
    for name, (ver, reqs, di) in installed.items():
        for line in reqs:
            req = Requirement(line)
            wanted = extras.get(name, set()) or {''}
            if req.marker and not any(req.marker.evaluate({'extra': e}) for e in wanted):
                continue
            n += 1
            dep = installed.get(canonicalize_name(req.name))
            if dep is None or (req.specifier and not req.specifier.contains(dep[0], prereleases=True)):
                issues.append(f'{name} requires {line}: have {dep[0] if dep else None}')
        tags = metadata_fields(read(os.path.join(di, 'WHEEL'))).get('Tag', [])
        if not tags or not any(t in supported for t in tags):
            issues.append(f'{name} WHEEL tags {tags} not in sys_tags()')
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': [check('requirements satisfied', not issues, f'{n} active requirements; {issues[:5]}'),
                                                                check('installed == lock', set(installed) == set(pins), sorted(set(installed) ^ set(pins)))]}
    return finish(f'{OUT}/closure.json', rec)


# ---------------------------------------------------------------- runtime probes

def resolver_check(path='/etc/resolv.conf', env=None):
    """S7 (glibc CVE-2026-8674 guard): the container resolver is dead and carries no search list. Docker writes no
    search line for --dns-search ., so any search/domain entry fails. -> (record with bytes and sha256, issues)."""
    env = os.environ if env is None else env
    rec = {'env': {k: env.get(k) for k in RESOLVER_ENV}}
    issues = [f'S7: resolver environment variable {k} is set' for k in RESOLVER_ENV if k in env]
    try:
        with open(path, 'rb') as f:
            raw = f.read()
    except OSError as e:
        rec['resolvConf'] = {'path': path, 'error': type(e).__name__}
        return rec, issues + [f'S7: {path} unreadable ({type(e).__name__})']
    text = raw.decode('utf-8', 'replace')
    rec['resolvConf'] = {'path': path, 'size': len(raw), 'sha256': sha_bytes(raw), 'base64': base64.b64encode(raw[:65536]).decode(), 'text': clip(text, 4096)}
    nameservers = []
    for line in text.splitlines():
        words = line.split()
        if not words or words[0][0] in '#;':
            continue
        if words[0] == 'nameserver':
            nameservers.append(' '.join(words[1:]))
        elif words[0] in ('search', 'domain'):
            issues.append(f'S7: {path} has a {words[0]} entry ({len(line)} chars)')
    if nameservers != ['127.0.0.1']:
        issues.append(f'S7: {path} nameservers {nameservers[:5]} are not exactly [127.0.0.1]')
    return rec, issues


# dpkg path filters of the pinned slim image (/etc/dpkg/dpkg.cfg.d/docker, frozen layer); dpkg leaves matching
# files uninstalled, and dpkg --verify still lists them as missing. The last matching rule wins, as in dpkg.
SLIM_DPKG_CFG = '/etc/dpkg/dpkg.cfg.d/docker'
SLIM_DPKG_FILTERS = (
    ('path-exclude', '/usr/share/doc/*'), ('path-exclude', '/usr/share/doc/kde/HTML/*/*'), ('path-exclude', '/usr/share/gnome/help/*/*'),
    ('path-exclude', '/usr/share/info/*'), ('path-exclude', '/usr/share/linda/*'), ('path-exclude', '/usr/share/lintian/overrides/*'),
    ('path-exclude', '/usr/share/locale/*'), ('path-exclude', '/usr/share/man/*'), ('path-exclude', '/usr/share/omf/*/*-*.emf'),
    ('path-include', '/usr/share/doc/*/copyright'), ('path-include', '/usr/share/doc/kde/HTML/C/*'), ('path-include', '/usr/share/gnome/help/*/C/*'),
    ('path-include', '/usr/share/locale/all_languages'), ('path-include', '/usr/share/locale/currency/*'), ('path-include', '/usr/share/locale/l10n/*'),
    ('path-include', '/usr/share/locale/languages'), ('path-include', '/usr/share/locale/locale.alias'), ('path-include', '/usr/share/omf/*/*-C.emf'))


def dpkg_filter_rules(text):
    return [tuple(line.split(None, 1)) for line in text.splitlines() if line.startswith(('path-exclude ', 'path-include '))]


def dpkg_filtered_out(path):
    from fnmatch import fnmatchcase  # dpkg uses fnmatch(3) without flags: '*' also matches '/'
    out = False
    for kind, pattern in SLIM_DPKG_FILTERS:
        if fnmatchcase(path, pattern):
            out = kind == 'path-exclude'
    return out


def dpkg_verify_deviations(stdout):
    """Every dpkg --verify line except `missing <path>` for a path the slim-image filters leave uninstalled."""
    bad = []
    for line in stdout.splitlines():
        m = re.fullmatch(r'missing +(/\S.*)', line)
        if line.strip() and not (m and dpkg_filtered_out(m.group(1))):
            bad.append(line)
    return bad


def cmd_probe_runtime(argv):
    import platform
    import tarfile
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    rt = inputs['runtime']
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': []}
    rec['checks'].append(check('inputs.json runtime.blockedModules == the d09.py guard', rt['blockedModules'] == list(BLOCKED), rt['blockedModules'], stop='S5'))
    rec['checks'].append(check('python version', platform.python_version() == rt['python'], platform.python_version(), stop='S5'))
    rec['checks'].append(check('python binary', os.path.realpath(sys.executable) == rt['pythonBin'], os.path.realpath(sys.executable), stop='S5'))
    osr = dict(line.split('=', 1) for line in read('/etc/os-release').splitlines() if '=' in line)
    osr = {k: v.strip('"') for k, v in osr.items()}
    for k, v in rt['osRelease'].items():
        rec['checks'].append(check(f'os-release {k}', osr.get(k) == v, osr.get(k), stop='S5'))
    q = run(['dpkg-query', '-W', '-f', '${Package}\t${Version}\n', *rt['packages']], env=child_env(), timeout=20)
    seen = dict(line.split('\t', 1) for line in q['stdout'].splitlines() if '\t' in line)
    for pkg, ver in rt['packages'].items():
        rec['checks'].append(check(f'dpkg {pkg}', seen.get(pkg) == ver, seen.get(pkg), stop='S5'))
    v = run(['dpkg', '--verify', *rt['dpkgVerify']], env=child_env(), timeout=30)
    rules = dpkg_filter_rules(read(SLIM_DPKG_CFG))
    rec['checks'].append(check(f'{SLIM_DPKG_CFG} path filters equal the pinned slim-image rules', rules == list(SLIM_DPKG_FILTERS), rules, stop='S5'))
    deviations = dpkg_verify_deviations(v['stdout'])
    rec['checks'].append(check('dpkg --verify ' + ' '.join(rt['dpkgVerify']) + ': exit 0, no deviation except files the slim-image path filters leave uninstalled',
                               v['exit'] == 0 and not deviations, clip('\n'.join(deviations) or v['stdout'] + v['stderr'], 2000), stop='S5'))
    mism = []
    for f in rt['files']:
        p = f['path']
        try:
            if f['type'] == 'symlink':
                ok = os.path.islink(p) and os.readlink(p) == f['link']
            else:
                ok = not os.path.islink(p) and os.path.isfile(p) and sha_file(p) == f.get('sha256')
        except OSError:
            ok = False
        if not ok:
            mism.append(p)
    rec['checks'].append(check(f'{len(rt["files"])} loadable image files equal pinned inventory', not mism, mism[:10], stop='S5'))
    import subprocess
    want = {rt['libcrypto']: None, rt['libssl']: None}
    for d in inputs['debs'] if isinstance(inputs.get('debs'), list) else []:
        if d['package'] == 'libssl3t64':
            raw = subprocess.run(['dpkg-deb', '--fsys-tarfile', f'{IN}/debs/{d["filename"]}'], capture_output=True, timeout=30, env=child_env()).stdout
            with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as t:
                for m in t.getmembers():
                    p = '/' + m.name.lstrip('./')
                    if p in want and m.isfile():
                        want[p] = sha_bytes(t.extractfile(m).read())
    for p, deb_sha in want.items():
        live = sha_file(p) if os.path.exists(p) else None
        rec['checks'].append(check(f'{p} equals signed .deb member', deb_sha is not None and live == deb_sha, f'live={live} deb={deb_sha}', stop='S5'))
    rec['resolver'], dns = resolver_check()
    rec['checks'].append(check('resolver dead: nameserver exactly 127.0.0.1, no search/domain, LOCALDOMAIN/RES_OPTIONS/HOSTALIASES unset', not dns, dns))
    return finish(f'{OUT}/probe-runtime.json', rec)


def cmd_linkage(argv):
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    cap = o['capsule']
    rec = {'nonce': o['nonce'], 'capsule': cap, 'startedAt': iso(), 'checks': []}
    out = f'{RUN}/ld-{cap}'
    r = run(['/cap/venv/bin/python', '-I', '-B', f'{Q}/d09.py', 'linkage-inner', '--probe', f'linkage-{cap}'],
            env=child_env({'LD_BIND_NOW': '1', 'LD_DEBUG': 'bindings', 'LD_DEBUG_OUTPUT': out}), timeout=40)
    rec['inner'] = slim(r, 8192)
    lines = []
    for n in sorted(os.listdir(RUN)):
        if n.startswith(f'ld-{cap}.'):
            with open(os.path.join(RUN, n), encoding='utf-8', errors='replace') as f:
                lines += [ln.strip() for ln in f if 'PKCS7_verify' in ln]
    rec['pkcs7Bindings'] = lines[:50]
    target = re.compile(r'binding file (\S*/rfc3161_client/_rust\.abi3\.so) \[\d+\] to (\S+) \[\d+\]: normal symbol `PKCS7_verify\'')
    raw = {m.group(2) for m in map(target.search, lines) if m}
    # merged /usr: ld.so.cache lists /lib/x86_64-linux-gnu/..., an alias of /usr/lib/... (/lib -> usr/lib); compare real files.
    bound = {os.path.realpath(p) for p in raw}
    rec['checks'].append(check('inner import exit 0', r['exit'] == 0, r['exit']))
    rec['checks'].append(check('rfc3161 _rust.abi3.so PKCS7_verify bound to system libcrypto', bound == {inputs['runtime']['libcrypto']}, f'{sorted(bound)} (loader-reported {sorted(raw)})'))
    issues = probe_check(f'linkage-{cap}', inputs, capsule_manifest(cap))
    rec['checks'].append(check('linkage probe maps admitted, exactly one libcrypto.so.3', not issues, issues))
    return finish(f'{OUT}/linkage-{cap}.json', rec)


def cmd_linkage_inner(argv):
    o, _ = opts(argv)
    register_probe(o['probe'])
    import cryptography.hazmat.bindings._rust  # noqa: F401
    import rfc3161_client._rust  # noqa: F401
    return 0


# ---------------------------------------------------------------- cases

def target(inputs, tid):
    return next(t for t in inputs['cpython'] if t['id'] == tid)


def flip_last(b):
    return b[:-1] + bytes([b[-1] ^ 0x01])


def mutate_bundle(doc, mutation):
    def edit(obj, key, fn):
        obj[key] = base64.b64encode(fn(base64.b64decode(obj[key], validate=True))).decode()
    vm = doc['verificationMaterial']
    if mutation == 'bundle-messageSignature.signature-last-byte-xor-01':
        edit(doc['messageSignature'], 'signature', flip_last)
    elif mutation == 'bundle-inclusionPromise.signedEntryTimestamp-last-byte-xor-01':
        edit(vm['tlogEntries'][0]['inclusionPromise'], 'signedEntryTimestamp', flip_last)
    elif mutation == 'bundle-signedTimestamp-truncate-1':
        edit(vm['timestampVerificationData']['rfc3161Timestamps'][0], 'signedTimestamp', lambda b: b[:-1])
    elif mutation == 'bundle-signedTimestamp-last-byte-xor-01':
        edit(vm['timestampVerificationData']['rfc3161Timestamps'][0], 'signedTimestamp', flip_last)
    else:
        raise ValueError(f'unknown bundle mutation {mutation}')
    return doc


def materialize(case, inputs, workdir):
    """Mutated copies live under /run only; originals in /in are never touched (read-only mount)."""
    import shutil
    t = target(inputs, case['target'])
    art, bun = f'{IN}/{t["path"]}', f'{IN}/{t["bundle"]["path"]}'
    mutation = case['mutation']
    if mutation == 'none':
        return art, bun
    if mutation == 'bundle-path-absent':
        return art, f'{RUN}/absent.sigstore'
    mkdirs(workdir)
    if mutation == 'artifact-last-byte-xor-01':
        dst = f'{workdir}/{t["file"]}'
        shutil.copyfile(art, dst)
        with open(dst, 'r+b') as f:
            f.seek(-1, 2)
            last = f.read(1)
            f.seek(-1, 2)
            f.write(bytes([last[0] ^ 0x01]))
        return dst, bun
    dst = f'{workdir}/{t["bundle"]["file"]}'
    with open(dst, 'wb') as f:
        f.write(json.dumps(mutate_bundle(load(bun), mutation)).encode())
    return art, dst


def match_expect(expect, exit_code, stderr):
    issues = [] if exit_code == expect['exit'] else [f'exit {exit_code} != pinned {expect["exit"]}']
    issues += [f'pinned substring missing: {s!r}' for s in expect.get('stderrContains', []) if s not in stderr]
    issues += [f'forbidden substring present: {s!r}' for s in expect.get('stderrExcludes', []) if s in stderr]
    issues += [f'STOP marker present: {s!r}' for s in expect.get('stopIf', []) if s in stderr]
    return issues


def sigstore_argv(case, artifact, bundle):
    return [*case['globalArgs'], 'verify', 'identity', *(['-v'] if case['verbose'] else []), '--bundle', bundle,
            '--cert-identity', case['identity'], '--cert-oidc-issuer', case['issuer'], artifact]


def cmd_case(argv):
    o, pos = opts(argv)
    cid, nonce = pos[0], o['nonce']
    cases, inputs = load(f'{Q}/cases.json'), load(f'{Q}/inputs.json')
    case = {c['id']: c for c in cases['cases']}[cid]
    rec = {'id': cid, 'nonce': nonce, 'kind': case['kind'], 'capsule': case['capsule'], 'target': case['target'], 'startedAt': iso(), 'issues': []}
    try:
        if case.get('requiresPositive'):
            pp = f'{OUT}/cases/{case["requiresPositive"]}.json'
            pos_rec = load(pp) if os.path.exists(pp) else {}
            if pos_rec.get('status') != 'pass' or pos_rec.get('nonce') != nonce:
                rec['issues'].append('same-target pristine positive has not passed in this run')
        dns = []
        if case['network'] != 'none':  # a container that can reach the network must have a dead resolver (S7)
            rec['resolver'], dns = resolver_check()
            rec['issues'] += dns
        if not dns:
            for d in ('home', 'data', 'cache', 'config'):
                mkdirs(f'/state/{d}')
            artifact, bundle = materialize(case, inputs, f'{RUN}/{cid}')
            argv_ = ['/cap/venv/bin/python', '-I', '-B', f'{Q}/d09.py', 'exec-module', 'sigstore', '--probe', cid, '--', *sigstore_argv(case, artifact, bundle)]
            r = run(argv_, env=sigstore_env(cases), timeout=float(o.get('timeout', 40)))
            rec.update(slim(r, 262144))
            rec['issues'] += match_expect(case['expect'], r['exit'], r['stderr'])
            probe = probe_check(cid, inputs, capsule_manifest(case['capsule']))
            rec['probeIssues'] = probe
            rec['issues'] += probe
            rec['probe'] = f'probes/{cid}.json'
    except Exception as e:
        rec['issues'].append(f'harness error: {type(e).__name__}: {e}')
    rec['status'] = 'pass' if not rec['issues'] else 'invalid'
    rec['finishedAt'] = iso()
    save(f'{OUT}/cases/{cid}.json', rec)
    print(json.dumps({'case': cid, 'status': rec['status'], 'exit': rec.get('exit'), 'issues': rec['issues'][:4]}))
    print_stops([i for i in rec['issues'] if POLICY.match(i)], rec['issues'] and f'case {cid} invalid: {rec["issues"][0]}')
    return 0 if rec['status'] == 'pass' else 1


# ---------------------------------------------------------------- TUF

def tuf_roles(meta_dir):
    roles = {}
    for role in ('root', 'timestamp', 'snapshot', 'targets'):
        p = f'{meta_dir}/{role}.json'
        if os.path.exists(p):
            with open(p, 'rb') as f:
                b = f.read()
            s = json.loads(b)['signed']
            roles[role] = {'version': s['version'], 'expires': s['expires'], 'sha256': sha_bytes(b), 'bytes': len(b), 'signed': s}
    return roles


def tuf_checks(roles, trusted_root_bytes, cfg, now=None):
    now = now or utcnow()
    horizon = now + datetime.timedelta(hours=cfg['minExpiryHours'])
    out = [check(f'{r}.json present', r in roles) for r in ('root', 'timestamp', 'snapshot', 'targets')]
    if len(roles) == 4:
        out.append(check('root version >= embedded', roles['root']['version'] >= cfg['embeddedRootVersion'], roles['root']['version']))
        out.append(check(f'timestamp version >= {cfg["minTimestampVersion"]}', roles['timestamp']['version'] >= cfg['minTimestampVersion'], roles['timestamp']['version']))
        for r, v in roles.items():
            out.append(check(f'{r} expires > now+{cfg["minExpiryHours"]}h', parse_iso(v['expires']) > horizon, v['expires']))
        entry = roles['targets']['signed']['targets'].get('trusted_root.json', {})
        got = sha_bytes(trusted_root_bytes) if trusted_root_bytes is not None else None
        out.append(check('trusted_root.json sha256 == targets entry', got is not None and got == entry.get('hashes', {}).get('sha256')
                         and len(trusted_root_bytes) == entry.get('length'), f'cache={got} targets={entry.get("hashes", {}).get("sha256")}'))
    return out


def cmd_tuf(argv):
    o, _ = opts(argv)
    cap, nonce = o['capsule'], o['nonce']
    cases, inputs = load(f'{Q}/cases.json'), load(f'{Q}/inputs.json')
    rec = {'capsule': cap, 'nonce': nonce, 'startedAt': iso(), 'checks': []}
    rec['resolver'], dns = resolver_check()
    rec['checks'].append(check('resolver dead: nameserver exactly 127.0.0.1, no search/domain, LOCALDOMAIN/RES_OPTIONS/HOSTALIASES unset', not dns, dns))
    listing = os.listdir('/state')
    rec['checks'].append(check('TUF state volume empty before refresh', not listing, listing[:5]))
    if not listing and not dns:
        for d in ('home', 'data', 'cache', 'config'):
            mkdirs(f'/state/{d}')
        t = inputs['cpython'][0]
        case = {'globalArgs': [], 'verbose': True, 'identity': t['identity'], 'issuer': t['issuer']}
        sig = sigstore_argv(case, f'{IN}/{t["path"]}', f'{IN}/{t["bundle"]["path"]}')
        sig.insert(sig.index('-v'), '-v')
        r = run(['/cap/venv/bin/python', '-I', '-B', f'{Q}/d09.py', 'exec-module', 'sigstore', '--probe', f'tuf-{cap}', '--', *sig],
                env=sigstore_env(cases), timeout=float(o.get('timeout', 45)))
        rec['verify'] = slim(r, 1 << 19)
        rec['requests'] = [ln.strip()[:300] for ln in r['stderr'].splitlines() if 'tuf-repo-cdn' in ln or '"GET /' in ln][:300]
        rec['checks'].append(check('online positive T1 -v -v exit 0 with OK and verified TSA', not match_expect({'exit': 0, 'stderrContains': ['OK: '], 'stderrExcludes': POS_EXCLUDES}, r['exit'], r['stderr']), r['exit']))
        roles = tuf_roles(f'/state/data/sigstore-python/tuf/{TUFQ}')
        trp = f'/state/cache/sigstore-python/tuf/{TUFQ}/trusted_root.json'
        trb = None
        if os.path.exists(trp):
            with open(trp, 'rb') as f:
                trb = f.read()
        rec['roles'] = {k: {kk: vv for kk, vv in v.items() if kk != 'signed'} for k, v in roles.items()}
        rec['trustedRoot'] = {'sha256': sha_bytes(trb) if trb else None, 'bytes': len(trb) if trb else None,
                              'equalsFrozenEmbedded': bool(trb) and sha_bytes(trb) == inputs['tuf']['frozenTrustedRootSha256']}
        rec['checks'] += tuf_checks(roles, trb, inputs['tuf'])
        issues = probe_check(f'tuf-{cap}', inputs, capsule_manifest(cap))
        rec['checks'].append(check('verifier probe maps admitted', not issues, issues))
    return finish(f'{OUT}/tuf-{cap}.json', rec)


# ---------------------------------------------------------------- tsa-direct, upstream tests, negatives, guard

def cmd_tsa_inner(argv):
    o, _ = opts(argv)
    register_probe('tsa-direct')
    from cryptography import x509
    from rfc3161_client import VerificationError, VerifierBuilder, decode_timestamp_response
    inputs = load(f'{Q}/inputs.json')
    tuf = current(load(f'{OUT}/tuf-a.json'), o['nonce'])
    with open(f'/state/cache/sigstore-python/tuf/{TUFQ}/trusted_root.json', 'rb') as f:
        trb = f.read()
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': [check('trusted_root.json is the TUF-refreshed one from tuf a of this run', bool(tuf) and sha_bytes(trb) == tuf['trustedRoot']['sha256'], sha_bytes(trb))]}
    tr = json.loads(trb)
    chain = lambda c: [x509.load_der_x509_certificate(base64.b64decode(x['rawBytes'])) for x in c['certChain']['certificates']]
    tsas = [chain(t) for t in tr.get('timestampAuthorities', [])]
    fulcio_root = chain(tr['certificateAuthorities'][0])[-1]
    rec['checks'].append(check('trusted root lists a TSA chain', bool(tsas), len(tsas)))

    def verifier(c, root=None):
        b = VerifierBuilder().tsa_certificate(c[0]).add_root_certificate(root or c[-1])
        for cert in c[1:-1]:
            b = b.add_intermediate_certificate(cert)
        return b.build()

    def outcome(fn):
        try:
            fn()
            return 'verified'
        except VerificationError as e:
            return f'VerificationError: {e}'
        except Exception as e:
            return f'{type(e).__name__}: {e}'
    for t in inputs['cpython']:
        bundle = load(f'{IN}/{t["bundle"]["path"]}')
        der = base64.b64decode(bundle['verificationMaterial']['timestampVerificationData']['rfc3161Timestamps'][0]['signedTimestamp'])
        msg = base64.b64decode(bundle['messageSignature']['signature'])
        genuine = [outcome(lambda c=c: verifier(c).verify_message(decode_timestamp_response(der), msg)) for c in tsas]
        rec['checks'].append(check(f'{t["id"]} genuine token verifies', 'verified' in genuine, genuine))
        try:
            flipped = decode_timestamp_response(flip_last(der))
        except ValueError as e:
            flipped = None
            rec['checks'].append(check(f'{t["id"]} final-byte-flip still parses (else DER broke: STOP)', False, e))
        if flipped is not None:
            res = [outcome(lambda c=c: verifier(c).verify_message(flipped, msg)) for c in tsas]
            rec['checks'].append(check(f'{t["id"]} final-byte-flip raises VerificationError', all(x.startswith('VerificationError') for x in res), res))
        res = [outcome(lambda c=c: verifier(c).verify_message(decode_timestamp_response(der), flip_last(msg))) for c in tsas]
        rec['checks'].append(check(f'{t["id"]} altered message raises VerificationError', all(x.startswith('VerificationError') for x in res), res))
        res = [outcome(lambda c=c: verifier(c, fulcio_root).verify_message(decode_timestamp_response(der), msg)) for c in tsas]
        rec['checks'].append(check(f'{t["id"]} Fulcio root as TSA root raises VerificationError', all(x.startswith('VerificationError') for x in res), res))
    return finish(f'{OUT}/tsa-direct-inner.json', rec)


def cmd_tsa_direct(argv):
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    r = run(['/cap/venv/bin/python', '-I', '-B', f'{Q}/d09.py', 'tsa-inner', '--nonce', o['nonce']], env=child_env(), timeout=40)
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'inner': slim(r, 16384), 'checks': []}
    inner = current(load(f'{OUT}/tsa-direct-inner.json'), o['nonce']) if os.path.exists(f'{OUT}/tsa-direct-inner.json') else {}
    inner = inner or {'checks': [check('inner evidence of this run', False, 'missing or stale')]}
    rec['checks'] = inner['checks'] + [check('inner evidence carries checks', bool(inner.get('checks')), len(inner.get('checks') or [])),
                                       check('inner exit 0', r['exit'] == 0, r['exit'])]
    issues = probe_check('tsa-direct', inputs, capsule_manifest('a'))
    rec['checks'].append(check('tsa-direct probe maps admitted', not issues, issues))
    return finish(f'{OUT}/tsa-direct.json', rec)


class Recorder:
    """pytest plugin: worst phase outcome per nodeid plus pytest's user-facing skip reason. In-process because the
    repo JUnit converter needs expat, which the S3 guard blocks. Outcomes: passed skipped xfailed xpassed error failed."""
    RANK = {'passed': 0, 'skipped': 1, 'xfailed': 2, 'xpassed': 3, 'error': 4, 'failed': 4}

    def __init__(self):
        self.results = {}

    def note(self, nodeid, outcome, when, reason=None):
        prev = self.results.get(nodeid)
        if prev is None or self.RANK[outcome] > self.RANK[prev['outcome']]:
            self.results[nodeid] = {'outcome': outcome, 'when': when, 'reason': reason}

    def pytest_runtest_logreport(self, report):
        xfail = hasattr(report, 'wasxfail')
        if report.failed:
            self.note(report.nodeid, 'failed' if report.when == 'call' else 'error', report.when)
        elif report.skipped:
            reason = str(report.wasxfail) if xfail else str(report.longrepr[2] if isinstance(report.longrepr, tuple) else report.longrepr)
            self.note(report.nodeid, 'xfailed' if xfail else 'skipped', report.when, reason[len('Skipped: '):] if reason.startswith('Skipped: ') else reason)
        else:
            self.note(report.nodeid, 'xpassed' if xfail and report.when == 'call' else 'passed', report.when)

    def pytest_collectreport(self, report):
        if report.failed:
            self.note(f'collect::{report.nodeid}', 'error', 'collect')


def cmd_pytest_inner(argv):
    cut = argv.index('--')
    o, _ = opts(argv[:cut])
    register_probe('rfc3161-tests')
    import pytest
    import rfc3161_client
    recorder = Recorder()
    code = int(pytest.main(argv[cut + 1:], plugins=[recorder]))
    junit = f'{OUT}/rfc3161-junit.xml'
    save(f'{OUT}/rfc3161-tests-inner.json', {'nonce': o['nonce'], 'exit': code, 'results': recorder.results, 'rfc3161File': rfc3161_client.__file__,
                                            'rustFile': rfc3161_client._rust.__file__, 'junitSha256': sha_file(junit) if os.path.exists(junit) else None})
    return 0


# I8: the unmodified 1.0.9 suite parametrizes tsa_path over test_tsa and sigstage; its fixtures skip when a fixture
# file is absent (rfc3161_client-1.0.9 test/test_verify.py:43-45, 54-56, 65-67, 78-80). Only these four reasons can be
# structural, and only when the file they name is not a member of the hash-pinned sdist.
STRUCTURAL_SKIPS = ((re.compile(r'Certificates not found for (/\S+)'), 'ts_chain.pem'), (re.compile(r'Request file not found for (/\S+)'), 'request.der'),
                    (re.compile(r'Response file not found for (/\S+)'), 'response.tsr'), (re.compile(r'Response file not found: (/\S+)'), None))
STRUCTURAL_RULE = ('I8: a skip is structural only if its reason is one of the four pinned test_verify.py fixture reasons and the file it '
                   'names is not a member of the hash-pinned sdist; counts cover non-structural tests only')


def skip_target(reason, root):
    """The sdist-relative file a pinned structural skip reason names, or None if the reason is not one of them."""
    import posixpath
    for rx, leaf in STRUCTURAL_SKIPS:
        m = rx.fullmatch(reason or '')
        if m:
            path = m.group(1) + (f'/{leaf}' if leaf else '')
            if posixpath.normpath(path) == path and path.startswith(f'{root}/'):
                return path[len(root) + 1:]
    return None


def classify_tests(results, root, members):
    """-> (structural skips [{nodeid, reason, absentPath}], counts over non-structural tests, non-passing tests)."""
    structural, other = [], []
    for nodeid, r in results.items():
        target = skip_target(r.get('reason'), root) if r['outcome'] == 'skipped' else None
        if target is not None and target not in members:
            structural.append({'nodeid': nodeid, 'reason': r['reason'], 'absentPath': target})
        else:
            other.append({'nodeid': nodeid, **r, **({'note': 'structural reason, but the named file is in the sdist'} if target else {})})
    passed = sum(r['outcome'] == 'passed' for r in other)
    skipped = sum(r['outcome'] in ('skipped', 'xfailed') for r in other)
    counts = {'total': len(other), 'passed': passed, 'failed': len(other) - passed - skipped, 'skipped': skipped}
    return structural, counts, [r for r in other if r['outcome'] != 'passed']


def counts_clean(c):
    return c['total'] > 0 and c['failed'] == 0 and c['skipped'] == 0


def cmd_rfc3161_tests(argv):
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    sd = inputs['sdist']
    root = f'{RUN}/sdist-tests'
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': []}
    try:
        n = extract_sdist(f'{IN}/{sd["path"]}', sd['sha256'], root, sd['topDir'], only='test', loosen=True)
        rec['checks'].append(check('sdist test/ extracted with filter=data after sha256 check', n > 0, n))
        r = run(['/tools/venv/bin/python', '-I', '-B', f'{Q}/d09.py', 'pytest-inner', '--nonce', o['nonce'], '--', '-p', 'no:cacheprovider',
                 '--import-mode=importlib', '--junitxml', f'{OUT}/rfc3161-junit.xml', f'{root}/test'], env=child_env(), cwd=root, timeout=45)
        rec['pytest'] = slim(r, 32768)
        inner = load(f'{OUT}/rfc3161-tests-inner.json')
        members = set(sdist_files(f'{IN}/{sd["path"]}', sd['sha256'], sd['topDir']))
        structural, c, nonpassing = classify_tests(inner['results'], root, members)
        save(f'{OUT}/rfc3161-structural-skips.json', {'nonce': o['nonce'], 'rule': STRUCTURAL_RULE, 'sdistSha256': sd['sha256'], 'count': len(structural), 'skips': structural})
        rec.update(counts=c, structuralSkips=len(structural), nonPassing=nonpassing[:50], rfc3161File=inner['rfc3161File'])
        rec['checks'] += [check('pytest exit 0', r['exit'] == 0 and inner['exit'] == 0, r['exit']),
                          check('non-structural tests: total > 0, failed == 0, skipped == 0 (every other skip, xfail, xpass or error fails)', counts_clean(c), {**c, 'nonPassing': nonpassing[:5]}),
                          check('rfc3161_client imported from the tools venv (installed W), not src/', inner['rfc3161File'].startswith('/tools/venv/lib/python3.12/site-packages/rfc3161_client/'), inner['rfc3161File'])]
        issues = probe_check('rfc3161-tests', inputs, {'/tools/venv/': manifest('/tools/venv')})
        rec['checks'].append(check('pytest probe maps admitted', not issues, issues))
    except (Stop, ValueError, OSError, KeyError) as e:
        rec['checks'].append(check('rfc3161-tests', False, e))
    return finish(f'{OUT}/rfc3161-tests.json', rec)


def synthetic_wheel(path, record_ok=True):
    import zipfile
    body = b'VALUE = 1\n'
    meta = b'Metadata-Version: 2.1\nName: d09-synthetic\nVersion: 1.0\n'
    wheel = b'Wheel-Version: 1.0\nGenerator: d09\nRoot-Is-Purelib: true\nTag: py3-none-any\n'
    files = {'d09_synthetic/__init__.py': body, 'd09_synthetic-1.0.dist-info/METADATA': meta, 'd09_synthetic-1.0.dist-info/WHEEL': wheel}
    rows = []
    for name, data in files.items():
        digest = hashlib.sha256(data if record_ok or name.endswith(('METADATA', 'WHEEL')) else data + b'#').digest()
        rows.append(f'{name},sha256={b64nopad(digest)},{len(data)}')
    rows.append('d09_synthetic-1.0.dist-info/RECORD,,')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name, data)
        z.writestr('d09_synthetic-1.0.dist-info/RECORD', '\n'.join(rows) + '\n')
    return path


def synthetic_elf(needed=('libcrypto.so.3', 'libc.so.6'), rpath=(), undefined=(('PKCS7_verify', 'OPENSSL_3.0.0'),), defined=('PyInit__rust',), text=b'\xc3'):
    """Selftest fixture: minimal ELF64 LE shared object (.dynstr .dynsym .gnu.version .gnu.version_r .dynamic .text
    .shstrtab) built with struct. rpath: [('RPATH'|'RUNPATH', value)]; undefined: [(name, version or None)]."""
    import struct
    strs = bytearray(b'\0')

    def s(value):
        strs.extend(value.encode() + b'\0')
        return len(strs) - len(value) - 1
    vers = sorted({v for _, v in undefined if v})
    index = {v: i + 2 for i, v in enumerate(vers)}  # versym 0 = local, 1 = global (unversioned)
    syms, versym = [bytes(24)], [0]
    for name, ver in undefined:
        syms.append(struct.pack('<IBBHQQ', s(name), 0x12, 0, 0, 0, 0))  # STB_GLOBAL|STT_FUNC, SHN_UNDEF
        versym.append(index[ver] if ver else 1)
    for name in defined:
        syms.append(struct.pack('<IBBHQQ', s(name), 0x12, 0, 6, 0, 1))  # defined in .text (section 6)
        versym.append(1)
    verneed = b''
    if vers:
        verneed = struct.pack('<HHIII', 1, len(vers), s('libcrypto.so.3'), 16, 0) + b''.join(
            struct.pack('<IHHII', 0, 0, index[v], s(v), 16 if i + 1 < len(vers) else 0) for i, v in enumerate(vers))
    dyn = b''.join(struct.pack('<qQ', DT_NEEDED, s(n)) for n in needed)
    dyn += b''.join(struct.pack('<qQ', DT_RPATH if tag == 'RPATH' else DT_RUNPATH, s(v)) for tag, v in rpath) + bytes(16)
    shstr = b'\0.dynstr\0.dynsym\0.gnu.version\0.gnu.version_r\0.dynamic\0.text\0.shstrtab\0'
    at = {n: shstr.index(n.encode() + b'\0') for n in ('.dynstr', '.dynsym', '.gnu.version', '.gnu.version_r', '.dynamic', '.text', '.shstrtab')}
    bodies = [b'', bytes(strs), b''.join(syms), struct.pack(f'<{len(versym)}H', *versym), verneed, dyn, text, shstr]
    meta = [(0, 0, 0, 0, 0), (at['.dynstr'], 3, 0, 0, 0), (at['.dynsym'], SHT_DYNSYM, 1, 1, 24), (at['.gnu.version'], SHT_GNU_VERSYM, 2, 0, 2),
            (at['.gnu.version_r'], SHT_GNU_VERNEED, 1, 1 if vers else 0, 0), (at['.dynamic'], SHT_DYNAMIC, 1, 0, 16), (at['.text'], 1, 0, 0, 0),
            (at['.shstrtab'], 3, 0, 0, 0)]
    out, offsets = bytearray(64), []
    for body in bodies:
        out.extend(bytes(-len(out) % 8))
        offsets.append(len(out))
        out.extend(body)
    out.extend(bytes(-len(out) % 8))
    shoff = len(out)
    for (sh_name, kind, link, info, entsize), off, body in zip(meta, offsets, bodies):
        out.extend(struct.pack('<IIQQQQIIQQ', sh_name, kind, 0, 0, off if body else 0, len(body), link, info, 8 if body else 0, entsize))
    out[:64] = struct.pack('<16sHHIQQQIHHHHHH', b'\x7fELF\x02\x01\x01', 3, 62, 1, 0, 0, shoff, 0, 64, 56, 0, 64, len(bodies), 7)
    return bytes(out)


def synthetic_rfc_wheel(path, so, py, tag='cp39-abi3-linux_x86_64', purelib='false', extra=()):
    """Selftest fixture: an rfc3161-client-shaped wheel around the given extension module bytes."""
    import zipfile
    files = {**py, 'rfc3161_client/_rust.abi3.so': so, 'rfc3161_client-1.0.9.dist-info/METADATA': b'Metadata-Version: 2.4\nName: rfc3161-client\nVersion: 1.0.9\n',
             'rfc3161_client-1.0.9.dist-info/WHEEL': f'Wheel-Version: 1.0\nGenerator: d09\nRoot-Is-Purelib: {purelib}\nTag: {tag}\n'.encode(), **dict(extra)}
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, v in files.items():
            z.writestr(n, v)
    return path


def cmd_admission_negatives(argv):
    import shutil
    import socket
    o, _ = opts(argv)
    inputs, cases = load(f'{Q}/inputs.json'), load(f'{Q}/cases.json')
    pins = cases['admissionNegatives']
    lock = read(f'{Q}/requirements-linux-cp312.txt')
    files = wheel_files(f'{IN}/wheels')
    work = f'{RUN}/admission-negatives'
    mkdirs(work)
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': []}

    def denied(name, fn, pinned):
        try:
            fn()
            rec['checks'].append(check(name, False, 'admitted (expected denial)'))
        except Stop as e:
            rec['checks'].append(check(name, pinned in str(e), e))
    victim = min(files, key=os.path.getsize)
    changed = os.path.join(work, os.path.basename(victim))
    shutil.copyfile(victim, changed)
    with open(changed, 'r+b') as f:
        f.seek(-1, 2)
        last = f.read(1)
        f.seek(-1, 2)
        f.write(bytes([last[0] ^ 0x01]))
    denied('changed wheel byte denied before import', lambda: admit([lock], [changed if x == victim else x for x in files], len(files)), pins['changed-byte'])
    denied('missing wheel denied', lambda: admit([lock], files[1:], len(files)), pins['missing-wheel'])
    extra = os.path.join(f'{IN}/tools', sorted(os.listdir(f'{IN}/tools'))[0])
    denied('extra wheel denied', lambda: admit([lock], files + [extra], len(files)), pins['extra-wheel'])
    inst = inputs['installer']
    installer = ['exec-module', 'installer', '--path', f'{IN}/{inst["path"]}', '--expect-version', '1.0.1', '--']
    bad = synthetic_wheel(f'{work}/d09_synthetic-1.0-py3-none-any.whl', record_ok=False)
    r = run([PY, '-I', '-B', f'{Q}/d09.py', *installer, '--no-compile-bytecode', '--validate-record', 'all', '--prefix', f'{work}/prefix-bad', bad], env=child_env(), timeout=20)
    rec['checks'].append(check('RECORD mismatch rejected by installer --validate-record all', r['exit'] not in (0, None) and pins['record-mismatch'] in r['stderr'] and not os.path.exists(f'{work}/prefix-bad/lib'), clip(r['stderr'], 1500)))
    mkdirs(f'{work}/good')
    good = synthetic_wheel(f'{work}/good/d09_synthetic-1.0-py3-none-any.whl', record_ok=True)
    args = [PY, '-I', '-B', f'{Q}/d09.py', *installer, '--no-compile-bytecode', '--validate-record', 'all', '--prefix', f'{work}/prefix', good]
    first = run(args, env=child_env(), timeout=20)
    target_file = f'{work}/prefix/lib/python3.12/site-packages/d09_synthetic/__init__.py'
    before = sha_file(target_file) if os.path.exists(target_file) else None
    second = run(args, env=child_env(), timeout=20)
    after = sha_file(target_file) if os.path.exists(target_file) else None
    rec['checks'].append(check('reinstall without overwrite raises FileExistsError, bytes unchanged',
                               first['exit'] == 0 and second['exit'] not in (0, None) and 'FileExistsError' in second['stderr'] and pins['reinstall'] in second['stderr'] and before is not None and before == after,
                               f'first={first["exit"]} second={second["exit"]} before={before} after={after}'))
    try:
        socket.create_connection(('1.1.1.1', 443), 3).close()
        rec['checks'].append(check('--network none blocks TCP connect', False, 'connected'))
    except OSError as e:
        rec['checks'].append(check('--network none blocks TCP connect', True, f'{type(e).__name__}: {e}'))
    try:
        socket.getaddrinfo('pypi.org', 443)
        rec['checks'].append(check('--network none blocks DNS', False, 'resolved'))
    except OSError as e:
        rec['checks'].append(check('--network none blocks DNS', True, f'{type(e).__name__}: {e}'))
    return finish(f'{OUT}/admission-negatives.json', rec)


def cmd_guard_selftest(argv):
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    rec = {'nonce': o['nonce'], 'startedAt': iso(), 'checks': []}

    def blocked(name, fn):
        try:
            fn()
            rec['checks'].append(check(f'{name} raises ImportError under the guard', False, 'succeeded'))
        except ImportError as e:
            rec['checks'].append(check(f'{name} raises ImportError under the guard', True, e))

    def et():
        import xml.etree.ElementTree as ET
        ET.fromstring('<a/>')
    blocked("xml.etree.ElementTree.fromstring('<a/>')", et)
    blocked('import sqlite3', lambda: __import__('sqlite3'))
    blocked('import lzma', lambda: __import__('lzma'))
    blocked('import bz2', lambda: __import__('bz2'))
    blocked('import pyexpat', lambda: __import__('pyexpat'))
    r = run([PY, '-I', '-B', f'{Q}/d09.py', 'seed-pyexpat', '--probe', 'an-pyexpat-guard'], env=child_env(), timeout=20)
    issues = probe_check('an-pyexpat-guard', inputs, {}, require_libcrypto=False)
    s3 = [i for i in issues if i.startswith('S3: ')]
    rec['checks'].append(check('seeded an-pyexpat-guard probe reported as S3 violation', r['exit'] == 0 and bool(s3), s3[:3]))
    return finish(f'{OUT}/guard-selftest.json', rec)


# ---------------------------------------------------------------- prepare-side (outside the recipe)

def parse_print_uris(text, hashed=True):
    """apt-get --print-uris lines: 'URI' filename size SHA256:hex. hashed=False reads the `install --print-uris` plan
    for package=version names only: apt 3.0 prints MD5Sum:hex there, or no hash (trixie-security). The pinned debs
    come from `download --print-uris`, which prints SHA256 (hashed=True, unchanged)."""
    pat = r"^'([^']+)'\s+(\S+)\s+(\d+)\s+SHA256:([0-9a-f]{64})\s*$" if hashed else r"^'([^']+)'\s+(\S+)\s+(\d+)(?:\s+[A-Za-z0-9]+:[0-9a-f]+)?()\s*$"
    out = []
    for line in text.splitlines():
        m = re.match(pat, line.strip())
        if m:
            uri, fn, size, digest = m.groups()
            pkg, ver, arch = urlunquote(fn[:-4]).split('_') if fn.endswith('.deb') else (fn, '', '')
            out.append({'package': pkg, 'version': ver, 'arch': arch, 'filename': fn, 'uri': uri, 'size': int(size), 'sha256': digest or None})
    return out


def urlunquote(s):
    import urllib.parse
    return urllib.parse.unquote(s)


def snapshot_uri(uri, stamp):
    m = re.match(r'^https?://deb\.debian\.org/(debian(?:-security)?)/(.+)$', uri)
    return f'https://snapshot.debian.org/archive/{m.group(1)}/{stamp}/{m.group(2)}' if m else None


def cmd_capture(argv):
    """Root, bridge network, dead DNS + add-host Debian hosts. Signed apt metadata -> exact deb set."""
    import glob
    o, _ = opts(argv, multi=('pkg', 'extra'))
    apt = ['-o', 'APT::Sandbox::User=root', '-o', 'Acquire::Retries=2']
    rec = {'startedAt': iso(), 'steps': []}
    upd = run(['apt-get', *apt, '-o', 'Debug::Acquire::gpgv=true', 'update'], env=child_env({'DEBIAN_FRONTEND': 'noninteractive'}), timeout=600)
    rec['steps'].append(slim(upd, 1 << 20))
    if upd['exit'] != 0:
        raise Stop('signed apt-get update failed')
    plan = run(['apt-get', *apt, 'install', '--print-uris', '-y', '--no-install-recommends', *o['pkg']], env=child_env(), timeout=600)
    rec['steps'].append(slim(plan, 1 << 20))
    closure = parse_print_uris(plan['stdout'], hashed=False)
    want = [f'{d["package"]}={d["version"]}' for d in closure] + o['extra']
    dl = run(['apt-get', *apt, 'download', '--print-uris', *want], env=child_env(), timeout=600)
    rec['steps'].append(slim(dl, 1 << 20))
    debs = parse_print_uris(dl['stdout'])
    got = run(['apt-get', *apt, 'download', *want], env=child_env(), cwd=o['debs'], timeout=1800)
    rec['steps'].append(slim(got, 1 << 20))
    stamp = utcnow().strftime('%Y%m%dT%H%M%SZ')
    bad = []
    for d in debs:
        p = os.path.join(o['debs'], d['filename'])
        if not os.path.exists(p) or os.path.getsize(p) != d['size'] or sha_file(p) != d['sha256']:
            bad.append(d['filename'])
        d['uri'] = d['uri'].replace('http://deb.debian.org/', 'https://deb.debian.org/')
        d['snapshotUri'] = snapshot_uri(d['uri'], stamp)
    lists = {os.path.basename(p): sha_file(p) for p in sorted(glob.glob('/var/lib/apt/lists/*InRelease'))}
    rec.update(debs=debs, snapshot=stamp, inRelease=lists, mismatched=bad, finishedAt=iso(),
               signatureLines=[ln for ln in upd['stdout'].splitlines() + upd['stderr'].splitlines() if re.search(r'GOODSIG|VALIDSIG|Good signature|sqv|gpgv', ln)][:200])
    save(o['out'], rec)
    return 1 if bad or not debs else 0


def deb_paths(listed, debs_dir):
    """I9: exactly the listed .deb files (no glob), each byte-equal to its pin; any other *.deb present is a STOP."""
    names = [d['filename'] for d in listed]
    present = sorted(n for n in os.listdir(debs_dir) if n.endswith('.deb'))
    if len(set(names)) != len(names) or sorted(names) != present:
        raise Stop(f'S5: {debs_dir} does not hold exactly the listed debs: missing={sorted(set(names) - set(present))[:5]} '
                   f'extra={sorted(set(present) - set(names))[:5]} duplicates={len(names) - len(set(names))}')
    paths = []
    for d in listed:
        p = os.path.join(debs_dir, d['filename'])
        if os.path.islink(p) or not os.path.isfile(p) or os.path.getsize(p) != d['size'] or sha_file(p) != d['sha256']:
            raise Stop(f'S5: {d["filename"]} differs from its pinned size/sha256')
        paths.append(p)
    return paths


def install_debs(inputs):
    """The pinned list is inputs.json debs; before D14 copies it there, the capture run's own debs.json."""
    listed = inputs['debs'] if isinstance(inputs.get('debs'), list) else load(f'{OUT}/debs.json')['debs']
    # dpkg (root) refuses to run unless ldconfig and start-stop-daemon are on PATH: use the standard root PATH.
    env = child_env({'DEBIAN_FRONTEND': 'noninteractive', 'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'})
    paths, passes = deb_paths(listed, f'{IN}/debs'), []
    # dpkg -i does not order Pre-Depends (python3 -> python3-minimal -> python3.13-minimal): pass the same exact list
    # again until it exits 0; each pass configures more packages, while any other failure repeats and STOPs.
    for _ in range(4):
        r = run(['dpkg', '-i', *paths], env=env, timeout=1800)
        passes.append(slim(r, 1 << 18))
        if r['exit'] == 0:
            return passes
    raise Stop(f'dpkg -i failed: {r["stderr"][-2000:]}')


def drop(argv, env, cwd=None, timeout=3600):
    return run(['setpriv', '--reuid', '10001', '--regid', '10001', '--clear-groups', '--', *argv], env=env, cwd=cwd, timeout=timeout)


def cmd_build_env(argv):
    """Build container entry (root): install the pinned debs, then drop to uid 10001 for all source handling."""
    o, pos = opts(argv)
    phase = pos[0]
    rec = {'phase': phase, 'startedAt': iso(), 'dpkg': install_debs(load(f'{Q}/inputs.json'))}
    me = [PY, '-I', '-B', f'{Q}/d09.py']
    mkdirs('/build/home')
    os.chown('/build/home', 10001, 10001)
    if phase == 'cargo-fetch':
        os.chown('/cargo', 10001, 10001)
        r = drop([*me, 'cargo-fetch', '--out', o['out']], child_env(home='/build/home'))
    elif phase == 'build':
        r = drop([*me, 'build', '--n', o['n'], '--out', o['out']], child_env(home='/build/home'))
    elif phase == 'elf':
        r = drop([*me, 'elf-audit', '--out', o['out']], child_env())
    elif phase == 'negatives':
        r = drop([*me, 'build-negatives', '--out', o['out']], child_env(home='/build/home'))
    else:
        raise Stop(f'unknown build phase {phase}')
    rec.update(child=slim(r, 1 << 20), finishedAt=iso())
    save(f'{o["out"]}/build-env-{phase}{o.get("n", "")}.json', rec)
    return r['exit'] or 0


def build_environment(inputs, cargo_home):
    env = child_env(home='/build/home')
    env.update(inputs['build']['env'])
    env['CARGO_HOME'] = cargo_home
    return env


def resolve_git_head(checkout):
    head = read(f'{checkout}/.git/HEAD').strip()
    if head.startswith('ref: '):
        ref = head[5:]
        p = f'{checkout}/.git/{ref}'
        if os.path.exists(p):
            return read(p).strip()
        packed = read(f'{checkout}/.git/packed-refs') if os.path.exists(f'{checkout}/.git/packed-refs') else ''
        return next((ln.split()[0] for ln in packed.splitlines() if ln.endswith(' ' + ref)), None)
    return head


# B3 spec deviation: no --target. A target-filtered fetch skips the 31 target-gated lock entries (wasm/uefi,
# portable-atomic) that the exact-set check below requires, and maturin's offline metadata may need them too.
CARGO_FETCH = ('cargo', 'fetch', '--locked')


def lock_checksums(text):
    """Cargo.lock -> {'<name>-<version>.crate': checksum} for every registry package (git/path packages have none)."""
    want = {}
    for block in text.split('[[package]]')[1:]:
        name = re.search(r'^name = "([^"]+)"', block, re.M).group(1)
        ver = re.search(r'^version = "([^"]+)"', block, re.M).group(1)
        cs = re.search(r'^checksum = "([0-9a-f]{64})"', block, re.M)
        if cs:
            want[f'{name}-{ver}.crate'] = cs.group(1)
    return want


def cmd_cargo_fetch(argv):
    import glob
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    sd, cargo = inputs['sdist'], inputs['cargo']
    rec = {'startedAt': iso(), 'checks': []}
    extract_sdist(f'{IN}/{sd["path"]}', sd['sha256'], '/build/src', sd['topDir'])
    lock_bytes = open('/build/src/Cargo.lock', 'rb').read()
    rec['checks'].append(check('extracted Cargo.lock sha256 == pinned', sha_bytes(lock_bytes) == cargo['lockSha256'], sha_bytes(lock_bytes), stop='S5'))
    env = build_environment(inputs, '/cargo')
    env.pop('CARGO_NET_OFFLINE', None)
    r = run(list(CARGO_FETCH), env=env, cwd='/build/src', timeout=1800)
    rec['fetch'] = slim(r, 1 << 19)
    rec['checks'].append(check(f'{" ".join(CARGO_FETCH)} exit 0', r['exit'] == 0, r['exit']))
    want = lock_checksums(lock_bytes.decode())
    rec['checks'].append(check(f'Cargo.lock has inputs.cargo.registryPackages ({cargo["registryPackages"]}) checksummed registry packages', len(want) == cargo['registryPackages'], len(want)))
    crates = glob.glob('/cargo/registry/cache/*/*.crate')
    have = {os.path.basename(p): sha_file(p) for p in crates}
    rec['checks'].append(check(f'registry .crate set == Cargo.lock checksums ({len(want)})', have == want and len(crates) == len(have),
                               f'missing={sorted(set(want) - set(have))[:5]} extra={sorted(set(have) - set(want))[:5]} bad={[k for k in want if k in have and have[k] != want[k]][:5]} '
                               f'duplicates={len(crates) - len(have)}'))
    rev = cargo['gitCrate']['rev']
    checkouts = glob.glob(f'/cargo/git/checkouts/*/{rev[:7]}')
    head = resolve_git_head(checkouts[0]) if len(checkouts) == 1 else None
    rec['checks'].append(check(f'git checkout HEAD == {rev}', head == rev, f'{checkouts} head={head}'))
    return finish(f'{o["out"]}/cargo-fetch.json', rec)


def cmd_build(argv):
    import shutil
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    sd, b = inputs['sdist'], inputs['build']
    n = o['n']
    rec = {'n': n, 'startedAt': iso(), 'checks': []}
    extract_sdist(f'{IN}/{sd["path"]}', sd['sha256'], '/build/src', sd['topDir'])
    shutil.copytree('/cargo-ro', '/build/cargo', symlinks=True)
    out_dir = f'{o["out"]}/b{n}'
    shutil.rmtree(out_dir, ignore_errors=True)  # a stale wheel from an earlier prepare must not be counted
    mkdirs(out_dir)
    argv_ = [a.replace('/out/bN', out_dir) for a in b['argv']]
    r = run(argv_, env=build_environment(inputs, '/build/cargo'), cwd='/build/src', timeout=3000)
    rec['maturin'] = slim(r, 1 << 20)
    wheels = sorted(f for f in os.listdir(out_dir) if f.endswith('.whl'))
    rec['checks'].append(check('maturin exit 0', r['exit'] == 0, r['exit']))
    rec['checks'].append(check('exactly one wheel named as pinned', wheels == [inputs['rebuilt']['file']], wheels))
    if wheels:
        p = f'{out_dir}/{wheels[0]}'
        rec['wheel'] = {'file': wheels[0], 'sha256': sha_file(p), 'size': os.path.getsize(p)}
    return finish(f'{o["out"]}/b{n}.json', rec)


SHT_DYNAMIC, SHT_DYNSYM, SHT_GNU_VERNEED, SHT_GNU_VERSYM = 6, 11, 0x6ffffffe, 0x6fffffff
DT_NEEDED, DT_RPATH, DT_RUNPATH = 1, 15, 29


def elf_dynamic(data):
    """Pure-Python ELF64 little-endian reader (the runtime image has no binutils): section headers, .dynamic
    (DT_NEEDED, DT_RPATH, DT_RUNPATH), .dynsym/.dynstr, and .gnu.version + .gnu.version_r so undefined symbols carry
    '@<version>' as readelf --dyn-syms prints them. -> (needed, rpath, undefined, defined)."""
    import struct
    if data[:4] != b'\x7fELF' or data[4:6] != b'\x02\x01':
        raise ValueError('not an ELF64 little-endian object')
    shoff, = struct.unpack_from('<Q', data, 0x28)
    shentsize, shnum = struct.unpack_from('<HH', data, 0x3a)
    if shentsize != 64 or not shnum:
        raise ValueError('no ELF64 section header table')
    secs = [struct.unpack_from('<IIQQQQIIQQ', data, shoff + 64 * i) for i in range(shnum)]  # name type flags addr offset size link info align entsize

    def body(i):
        if secs[i][4] + secs[i][5] > len(data):
            raise ValueError(f'section {i} lies outside the file')
        return data[secs[i][4]:secs[i][4] + secs[i][5]]

    def one(kind):
        found = [i for i, s in enumerate(secs) if s[1] == kind]
        if len(found) > 1:
            raise ValueError(f'{len(found)} sections of type {kind:#x}')
        return found[0] if found else None

    def text(tab, off):
        return tab[off:tab.index(b'\0', off)].decode('utf-8', 'replace')
    needed, rpath, und, defined, versions = [], [], [], [], {}
    d = one(SHT_DYNAMIC)
    if d is not None:
        dyn, tab = body(d), body(secs[d][6])
        for off in range(0, len(dyn) - 15, 16):
            tag, val = struct.unpack_from('<qQ', dyn, off)
            if tag == 0:
                break
            if tag == DT_NEEDED:
                needed.append(text(tab, val))
            elif tag in (DT_RPATH, DT_RUNPATH):
                rpath.append(f'{"RPATH" if tag == DT_RPATH else "RUNPATH"}={text(tab, val)}')
    r = one(SHT_GNU_VERNEED)
    if r is not None:
        vn, tab, off = body(r), body(secs[r][6]), 0
        for _ in range(secs[r][7]):  # sh_info = number of Elf64_Verneed records
            _version, cnt, _file, aux, nxt = struct.unpack_from('<HHIII', vn, off)
            a = off + aux
            for _ in range(cnt):
                _hash, _flags, other, vname, anext = struct.unpack_from('<IHHII', vn, a)
                versions[other] = text(tab, vname)
                a += anext
            if not nxt:
                break
            off += nxt
    s, v = one(SHT_DYNSYM), one(SHT_GNU_VERSYM)
    if s is not None:
        syms, tab, vsym = body(s), body(secs[s][6]), body(v) if v is not None else b''
        for i in range(1, len(syms) // 24):
            st_name, _info, _other, shndx = struct.unpack_from('<IBBH', syms, 24 * i)
            name = text(tab, st_name)
            if not name:
                continue
            if shndx == 0:  # SHN_UNDEF
                ver = struct.unpack_from('<H', vsym, 2 * i)[0] & 0x7fff if len(vsym) >= 2 * i + 2 else 0
                und.append(f'{name}@{versions[ver]}' if ver in versions else name)
            else:
                defined.append(name)
    return needed, rpath, und, defined


OPENSSL_PREFIXES = ('OPENSSL_', 'OSSL_', 'EVP_', 'PKCS7_', 'X509', 'SSL_', 'CRYPTO_', 'BIO_', 'ERR_', 'ASN1_', 'BN_', 'RSA_', 'EC_', 'PEM_', 'OBJ_', 'RAND_', 'HMAC', 'SHA256', 'd2i_', 'i2d_')


def openssl_symbols(names):
    return [s for s in names if s.split('@')[0].startswith(OPENSSL_PREFIXES)]


def elf_facts(needed, rpath, und, defined):
    """The facts the ELF policy reads, in one shape whether they come from readelf text or from elf_dynamic()."""
    return {'needed': needed, 'rpath': rpath, 'pkcs7': sorted(s for s in und if s.split('@')[0] == 'PKCS7_verify'),
            'zlib': sorted(s for s in und if s.split('@')[0].startswith(ZLIB_AFFECTED_PREFIXES)),
            'definedOpenSSL': sorted({s.split('@')[0] for s in openssl_symbols(defined)})}


def pure_facts(data):
    import struct
    try:
        return elf_facts(*elf_dynamic(data))
    except (struct.error, IndexError) as e:
        raise ValueError(f'malformed ELF: {e}') from e


def parse_needed(text):
    needed = re.findall(r'\(NEEDED\)\s+Shared library: \[([^\]]*)\]', text)
    rpath = [f'{k}={v}' for k, v in re.findall(r'\((RPATH|RUNPATH)\)\s+Library r(?:un)?path: \[([^\]]*)\]', text)]
    if not rpath and re.search(r'\((?:RPATH|RUNPATH)\)', text):
        rpath = ['unparsed']
    return needed, rpath


def readelf_facts(data):
    """Prepare side only: the build image has binutils. Its output cross-checks the pure-Python reader."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.so', delete=False) as t:
        t.write(data)
    try:
        dyn = run(['readelf', '-d', '-W', t.name], env=child_env(), timeout=60)
        syms = run(['readelf', '--dyn-syms', '-W', t.name], env=child_env(), timeout=60)
    finally:
        os.unlink(t.name)
    if dyn['exit'] != 0 or syms['exit'] != 0:
        raise ValueError(f'readelf failed: -d exit {dyn["exit"]}, --dyn-syms exit {syms["exit"]}')
    return elf_facts(*parse_needed(dyn['stdout']), *parse_dynsyms(syms['stdout']))


LINKAGE_REASONS = ('NEEDED includes libcrypto.so.3', 'PKCS7_verify undefined with version OPENSSL_3.0.0')
# R-10: the zlib entry points of CVE-2026-27171 (crc32_combine*) and CVE-2026-85091 (gz* write side); W must import none.
ZLIB_AFFECTED_PREFIXES = ('gz', 'crc32_combine')


def fails_on_linkage(reasons, label='official'):
    """AC-05 needs the linkage regression itself; a FAIL on the wheel tag alone, or an unparsed ELF, is no regression evidence."""
    return all(f'{label}: {x}' in reasons for x in LINKAGE_REASONS) and f'{label}: ELF dynamic section and symbols parsed' not in reasons


def wheel_policy(label, whl, sdist_py, b, facts_of):
    """The one ELF/zip policy (I3): W must PASS it and the official vendored wheel must FAIL it. -> (checks, facts)."""
    import zipfile
    with zipfile.ZipFile(whl) as z:
        names = z.namelist()
        data = {n: z.read(n) for n in names if not n.endswith('/')}
    libs = [n for n in names if '.libs/' in n]
    wheel = [n for n in names if re.fullmatch(r'[^/]+\.dist-info/WHEEL', n)]
    meta = metadata_fields(data[wheel[0]].decode('utf-8', 'replace')) if len(wheel) == 1 else {}
    py = {n: v for n, v in data.items() if n.endswith('.py')}
    py_bad = sorted(n for n in set(py) | set(sdist_py) if py.get(n) != sdist_py.get(n))
    hits = sorted({x for v in data.values() for x in b['forbiddenBytes'] if x.encode() in v})
    elfs = [n for n, v in data.items() if v[:4] == b'\x7fELF']
    facts, err = None, 'no ELF object'
    if elfs:
        try:
            facts, err = facts_of(data[elfs[0]]), None
        except (ValueError, OSError) as e:
            err = f'{type(e).__name__}: {e}'
    f = facts or {}
    needed = f.get('needed') or []
    checks = [check(f'{label}: no *.libs/ vendored directory', not libs, libs[:5]),
              check(f'{label}: WHEEL Tag == {b["wheelTag"]}', meta.get('Tag') == [b['wheelTag']], meta.get('Tag')),
              check(f'{label}: Root-Is-Purelib: false', meta.get('Root-Is-Purelib') == ['false'], meta.get('Root-Is-Purelib')),
              check(f'{label}: every .py byte-equal to the sdist src/ member (same set)', py and not py_bad, py_bad[:5]),
              check(f'{label}: no forbidden bytes (inputs.build.forbiddenBytes) in any member', not hits, hits),
              check(f'{label}: exactly one ELF object, the abi3 extension module', len(elfs) == 1 and elfs[0].endswith('.abi3.so'), elfs[:5]),
              check(f'{label}: ELF dynamic section and symbols parsed', facts is not None, err),
              check(f'{label}: NEEDED subset of inputs.build.elfNeededAllowed', needed and set(needed) <= set(b['elfNeededAllowed']), needed),
              check(f'{label}: NEEDED includes libcrypto.so.3', 'libcrypto.so.3' in needed, needed),
              check(f'{label}: no RPATH/RUNPATH', facts is not None and not f['rpath'], f.get('rpath')),
              check(f'{label}: PKCS7_verify undefined with version OPENSSL_3.0.0', f.get('pkcs7') == [PKCS7_PIN], f.get('pkcs7')),
              check(f'{label}: no zlib gz*/crc32_combine* imports (R-10)', facts is not None and not f['zlib'], f.get('zlib')),
              check(f'{label}: zero defined OpenSSL symbols', facts is not None and not f['definedOpenSSL'], (f.get('definedOpenSSL') or [])[:5])]
    return checks, facts


def parse_dynsyms(text):
    und, defined = [], []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 8 and parts[0].rstrip(':').isdigit() and parts[3] not in ('SECTION', 'FILE'):  # readelf 2.44 prints IFUNC, not GNU_IFUNC
            name = parts[7]
            (und if parts[6] == 'UND' else defined).append(name)
    return und, defined


def cmd_elf_audit(argv):
    """Prepare side (build image, binutils): the shared policy from readelf output, plus agreement with the pure-Python
    reader on the same bytes. Its elf.json is cross-checked again by wheel-audit when that step is given it."""
    import glob
    import zipfile
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    b, sd = inputs['build'], inputs['sdist']
    sdist_py = sdist_python(sdist_files(f'{IN}/{sd["path"]}', sd['sha256'], sd['topDir']))
    rec = {'startedAt': iso(), 'verdicts': {}, 'parserAgreement': {}}
    for label, pattern in (('W', f'{o["out"]}/b1/*.whl'), ('official', f'{IN}/{inputs["officialRfc3161Wheel"]["path"]}')):
        files = glob.glob(pattern)
        if len(files) == 1:
            checks, facts = wheel_policy(label, files[0], sdist_py, b, readelf_facts)
            pure = wheel_policy(label, files[0], sdist_py, b, pure_facts)[1]
        else:
            checks, facts, pure = [check(f'{label}: wheel present', False, files)], None, None
        rec['parserAgreement'][label] = facts is not None and facts == pure
        rec['verdicts'][label] = {'file': os.path.basename(files[0]) if files else None, 'sha256': sha_file(files[0]) if files else None,
                                  'verdict': 'PASS' if all(c['ok'] for c in checks) else 'FAIL', 'checks': checks, 'facts': facts, 'pureFacts': pure}
    crypto = next(w for w in inputs['wheels'] if w['name'] == 'cryptography')
    with zipfile.ZipFile(f'{IN}/{crypto["path"]}') as z:
        so = [n for n in z.namelist() if n.endswith('_rust.abi3.so')]
        data = z.read(so[0])
    try:
        cf, cp, err = readelf_facts(data), pure_facts(data), None
    except (ValueError, OSError) as e:  # a readelf failure is a FAIL, never an empty symbol list
        cf, cp, err = None, None, f'{type(e).__name__}: {e}'
    rec['parserAgreement']['cryptography'] = cf is not None and cf == cp
    rec['verdicts']['cryptography'] = {'file': so[0], 'exportedOpenSSL': (cf or {}).get('definedOpenSSL', [])[:20], 'error': err,
                                       'verdict': 'PASS' if cf is not None and not cf['definedOpenSSL'] else 'FAIL'}
    rec['ok'] = (rec['verdicts']['W']['verdict'] == 'PASS' and rec['verdicts']['official']['verdict'] == 'FAIL' and rec['verdicts']['cryptography']['verdict'] == 'PASS'
                 and all(rec['parserAgreement'].values()))
    rec['finishedAt'] = iso()
    save(f'{o["out"]}/elf.json', rec)
    return 0 if rec['ok'] else 1


def readelf_crosscheck(path, rec):
    """I3: when the build container's readelf output (prepare elf.json) is given and exists, it must agree."""
    if not path or not os.path.exists(path):
        rec['readelf'] = {'path': path, 'status': 'absent' if path else 'not provided'}
        return []
    ref = load(path).get('verdicts') or {}
    rec['readelf'] = {'path': path, 'status': 'compared', 'sha256': sha_file(path)}
    out = []
    for label in ('W', 'official'):
        theirs, mine = ref.get(label) or {}, rec[label]
        out.append(check(f'readelf output for {label} agrees with the pure-Python reader', mine['facts'] is not None and theirs.get('sha256') == mine['sha256'] and theirs.get('facts') == mine['facts'],
                         f'readelf sha256={theirs.get("sha256")} facts={theirs.get("facts")}; pure sha256={mine["sha256"]} facts={mine["facts"]}', group='W'))
    return out


def cmd_wheel_audit(argv):
    """I3, replayed by both e2e recipes (--network none, read-only mounts):
    wheel-audit --nonce N --mode local|ci --b1 DIR [--b2 DIR] --official WHL --sdist TGZ [--elf prepare-elf.json]
    W from b1 (and b2 locally) must be one byte-identical wheel equal to rebuilt.sha256 and to the installed copy and
    PASS the policy; the official vendored wheel must FAIL the same policy. AC-04/AC-05 derive only from this evidence."""
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    b, sd, rb, off = inputs['build'], inputs['sdist'], inputs['rebuilt'], inputs['officialRfc3161Wheel']
    rec = {'nonce': o['nonce'], 'mode': o.get('mode'), 'startedAt': iso(), 'builds': [], 'checks': []}
    try:
        if o.get('mode') not in ('local', 'ci'):
            raise Stop(f'wheel-audit --mode must be local or ci: {o.get("mode")!r}')
        sdist_py = sdist_python(sdist_files(o['sdist'], sd['sha256'], sd['topDir']))
        for d in [o['b1']] + ([o['b2']] if 'b2' in o else []):
            whls = sorted(n for n in os.listdir(d) if n.endswith('.whl')) if os.path.isdir(d) else []
            rec['builds'].append({'dir': d, 'wheels': whls, 'sha256': sha_file(os.path.join(d, rb['file'])) if whls == [rb['file']] else None})
        shas = [x['sha256'] for x in rec['builds']]
        w = shas[0] if None not in shas and len(set(shas)) == 1 else None
        inst, offp = f'{IN}/{rb["path"]}', o['official']
        have = sha_file(inst) if os.path.isfile(inst) else None
        offsha = sha_file(offp) if os.path.isfile(offp) else None
        want = 2 if o['mode'] == 'local' else 1
        rec['checks'] += [check(f'{want} build dir(s) given for mode {o["mode"]} (local B1 == B2 == W, CI B1 == W)', len(shas) == want, len(shas), group='W'),
                          check(f'every build dir holds exactly {rb["file"]}', all(x['wheels'] == [rb['file']] for x in rec['builds']), [x['wheels'] for x in rec['builds']], group='W'),
                          check('builds byte-identical', w is not None, shas, group='W'),
                          check('W sha256 == inputs.json rebuilt.sha256', w is not None and w == rb['sha256'], f'W={w} pinned={rb["sha256"]}', stop='S5', group='W'),
                          check(f'installed copy {rb["path"]} byte-equal to the audited builds', w is not None and have == w, have, stop='S5', group='W'),
                          check('official wheel sha256 == inputs.json officialRfc3161Wheel.sha256', offsha == off['sha256'], offsha, stop='S5', group='regression')]
        for label, path, sha in (('W', os.path.join(o['b1'], rb['file']) if w else None, w), ('official', offp if offsha else None, offsha)):
            cks, facts = wheel_policy(label, path, sdist_py, b, pure_facts) if path else ([], None)
            verdict = ('PASS' if all(c['ok'] for c in cks) else 'FAIL') if path else 'NOT-AUDITED'  # an absent wheel is no observation
            rec[label] = {'sha256': sha, 'verdict': verdict, 'reasons': [c['name'] for c in cks if not c['ok']], 'checks': cks, 'facts': facts}
        rec['checks'] += [{**c, 'group': 'W'} for c in rec['W']['checks']]
        rec['checks'] += [check('official vendored wheel FAILS the policy on linkage (before; observed reasons)', rec['official']['verdict'] == 'FAIL' and fails_on_linkage(rec['official']['reasons']), rec['official']['reasons'], group='regression'),
                          check('rebuilt W PASSES the same policy (after)', rec['W']['verdict'] == 'PASS', rec['W']['reasons'], group='regression')]
        rec['checks'] += readelf_crosscheck(o.get('elf'), rec)
    except (Stop, ValueError, OSError, KeyError) as e:
        rec['checks'].append(check('wheel-audit', False, e, group='W'))
    return finish(f'{OUT}/wheel-audit.json', rec)


def cmd_build_negatives(argv):
    import shutil
    o, _ = opts(argv)
    inputs = load(f'{Q}/inputs.json')
    sd = inputs['sdist']
    rec = {'startedAt': iso(), 'checks': []}
    bad = '/tmp/bad-sdist.tar.gz'
    shutil.copyfile(f'{IN}/{sd["path"]}', bad)
    with open(bad, 'r+b') as f:
        f.seek(100)
        c = f.read(1)
        f.seek(100)
        f.write(bytes([c[0] ^ 0x01]))
    try:
        extract_sdist(bad, sd['sha256'], '/build/neg-sdist', sd['topDir'])
        rec['checks'].append(check('changed sdist byte rejected before extraction', False, 'extracted'))
    except Stop as e:
        rec['checks'].append(check('changed sdist byte rejected before extraction', not os.path.exists('/build/neg-sdist'), e))
    extract_sdist(f'{IN}/{sd["path"]}', sd['sha256'], '/build/src', sd['topDir'])
    shutil.copytree('/cargo-ro', '/build/cargo', symlinks=True)
    lock = read('/build/src/Cargo.lock')
    m = re.search(r'checksum = "([0-9a-f])', lock)
    with open('/build/src/Cargo.lock', 'w') as f:
        f.write(lock[:m.start(1)] + ('0' if m.group(1) != '0' else '1') + lock[m.end(1):])
    env = build_environment(inputs, '/build/cargo')
    r = run(['cargo', 'build', '--frozen', '--release'], env=env, cwd='/build/src', timeout=600)
    rec['checks'].append(check('altered Cargo.lock checksum -> cargo error', r['exit'] not in (0, None) and 'checksum' in r['stderr'], clip(r['stderr'][-1500:], 1500)))
    with open('/build/src/Cargo.lock', 'w') as f:
        f.write(lock)
    env.pop('OPENSSL_NO_VENDOR')
    out_dir = '/build/neg-vendored'
    mkdirs(out_dir)
    argv_ = [a.replace('/out/bN', out_dir) for a in inputs['build']['argv']]
    r = run(argv_, env=env, cwd='/build/src', timeout=3000)
    vendored = [f for f in os.listdir(out_dir) if f.endswith('.whl')]
    verdict = None
    if r['exit'] == 0 and vendored:  # judged by the whole W policy: the official 3.6.2 build lacks the literal 'OpenSSL 3.6'
        sdist_py = sdist_python(sdist_files(f'{IN}/{sd["path"]}', sd['sha256'], sd['topDir']))
        rec['vendoredPolicy'], _ = wheel_policy('vendored', f'{out_dir}/{vendored[0]}', sdist_py, inputs['build'], readelf_facts)
        verdict = 'ELF gate rejects' if not all(c['ok'] for c in rec['vendoredPolicy']) else 'NOT REJECTED'
    rec['checks'].append(check('OPENSSL_NO_VENDOR unset -> build fails or the ELF gate rejects', r['exit'] != 0 or verdict == 'ELF gate rejects', f'exit={r["exit"]} verdict={verdict}'))
    return finish(f'{o["out"]}/build-negatives.json', rec)


# ---------------------------------------------------------------- outcomes

def ev_load(rel):
    p = f'{OUT}/{rel}'
    return load(p) if os.path.exists(p) else None


def criterion_result(c, parts, nonce):
    """parts: list of (relpath, evidence|None, [checks]). Counts always total > 0."""
    refs, checks, issues = [], [], []
    for rel, ev, cks in parts:
        if ev is None:
            issues.append(f'missing {rel}')
            checks.append(check(f'evidence {rel}', False, 'missing'))
            continue
        if ev.get('nonce') != nonce:
            issues.append(f'stale nonce in {rel}')
            checks.append(check(f'evidence {rel} nonce', False, ev.get('nonce')))
            continue
        refs.append(EVIDENCE + rel)
        checks += cks
    total = max(len(checks), 1)
    passed = sum(1 for k in checks if k['ok'])
    failed = total - passed
    bad = [k['name'] for k in checks if not k['ok']]
    observed = f'{passed}/{total} checks passed' + (f'; failing: {bad[:4]}' if bad else '') + (f'; {issues[:3]}' if issues else '')
    return {'criterionId': c['id'], 'expected': c['expected'], 'observed': observed, 'status': 'pass' if failed == 0 and checks else 'fail',
            'evidenceRefs': refs, 'counts': {'total': total, 'passed': passed, 'failed': failed, 'skipped': 0}, '_issues': issues}


def case_parts(kind):
    cases = load(f'{Q}/cases.json')['cases']
    out = []
    for c in cases:
        if c['kind'] == kind:
            rel = f'cases/{c["id"]}.json'
            ev = ev_load(rel)
            out.append((rel, ev, [check(c['id'], ev is not None and ev.get('status') == 'pass', (ev or {}).get('issues'))]))
    return out


def checks_of(rel, group=None):
    ev = ev_load(rel)
    cks = [] if ev is None else [k for k in ev.get('checks', []) if group is None or k.get('group') == group]
    return rel, ev, cks


def add_regression(res, mode, task, c, before, after):
    """Write before/after assertions; the runner snapshots only evidenceRefs, so both must be listed there too."""
    refs = {}
    for label, (observed, status) in (('before', before), ('after', after)):
        rel = f'regression/{c["id"]}-{label}-{mode}.json'
        save(f'{OUT}/{rel}', {'taskId': task, 'criterionId': c['id'], 'expected': c['expected'], 'observed': observed, 'status': status})
        refs[f'{label}Ref'] = EVIDENCE + rel
    res['regression'] = refs
    res['evidenceRefs'] = res['evidenceRefs'] + [refs['beforeRef'], refs['afterRef']]
    return res


def builds_part(mode):
    """AC-04 comes only from the replayed wheel-audit evidence (I2/I3), plus the build count this mode requires."""
    rel, ev, cks = checks_of('wheel-audit.json', 'W')
    want, n = (1 if mode == 'ci' else 2), len((ev or {}).get('builds') or [])
    return rel, ev, cks + [check(f'{want} build(s) audited for {mode} (local B1 == B2 == W, CI B1 == W)', n == want, n)]


def current(ev, nonce):
    """Evidence of this run only; anything else is no observation."""
    return ev if (ev or {}).get('nonce') == nonce else {}


def structural_summary(ev, nonce):
    from collections import Counter
    ev = current(ev, nonce)
    if not ev:
        return '; structural-skip evidence missing or stale'
    by = Counter(s['absentPath'] for s in ev.get('skips', []))
    return (f'; {sum(by.values())} structural skips excluded from the counts (I8; named file absent from the hash-pinned sdist: '
            + ', '.join(f'{p} x{n}' for p, n in sorted(by.items())) + ')')


def e2e_parts(cid, mode, nonce):
    probes = [(f'cases/{c["id"]}.json', ev_load(f'cases/{c["id"]}.json')) for c in load(f'{Q}/cases.json')['cases']]
    maps = [(rel, ev, [check(f'maps admitted {rel}', ev is not None and not ev.get('probeIssues'), (ev or {}).get('probeIssues'))]) for rel, ev in probes]
    table = {
        'AC-01': [checks_of('steps/check-inputs.json', 'inputs')],
        'AC-02': [checks_of('steps/doctor-image.json')],
        'AC-03': [checks_of('probe-runtime.json'), checks_of('linkage-a.json'), checks_of('linkage-b.json')] + maps,
        'AC-04': [builds_part(mode)],
        'AC-06': [checks_of('install-a.json'), checks_of('install-b.json'), checks_of('install-tools.json'), checks_of('compare.json'), checks_of('closure.json')],
        'AC-07': [checks_of('tuf-a.json'), checks_of('tuf-b.json')],
        'AC-08': case_parts('positive'), 'AC-09': case_parts('negative'), 'AC-10': case_parts('supplementary'),
        'AC-11': [checks_of('tsa-direct.json'), checks_of('rfc3161-tests.json'), ('rfc3161-structural-skips.json', ev_load('rfc3161-structural-skips.json'), [])],
        'AC-12': case_parts('characterization'),
        'AC-13': [checks_of('guard-selftest.json')], 'AC-14': [checks_of('admission-negatives.json')],
        'AC-15F': [checks_of('fast/fast.json', 'X1G')], 'AC-16F': [checks_of('fast/fast.json', 'X2F')],
        'AC-17F': [checks_of('fast/fast.json', 'X3F')], 'AC-19F': [checks_of('fast/fast.json', 'X6F')],
    }
    return table.get(cid)


RECIPES = {'local': 'recipe-e2e-local.json', 'ci': 'recipe-e2e-ci.json', 'challenges': 'recipe-challenges.json', 'reconcile': 'recipe-reconcile.json'}


def build_outcomes(mode, nonce):
    recipe = load(f'{Q}/{RECIPES[mode]}')
    contract = load(f'{Q}/{os.path.basename(recipe["contractPath"])}')
    criteria = []
    for c in contract['criteria']:
        if c['recipeRef'] != recipe['recipeRef']:
            continue
        if c['id'] == 'AC-05':  # before/after statuses are what this run observed, never constants
            rel, ev, cks = checks_of('wheel-audit.json', 'regression')
            res = criterion_result(c, [(rel, ev, cks)], nonce)
            cur = current(ev, nonce)
            off, w = cur.get('official') or {}, cur.get('W') or {}
            add_regression(res, mode, contract['taskId'], c,
                           (f'official vendored wheel sha256 {off.get("sha256")}: policy verdict {off.get("verdict")}; observed reasons {off.get("reasons")}', 'fail' if off.get('verdict') == 'FAIL' and fails_on_linkage(off.get('reasons') or []) else 'pass'),
                           (f'rebuilt W sha256 {w.get("sha256")}: policy verdict {w.get("verdict")}; failing {w.get("reasons")}', 'pass' if w.get('verdict') == 'PASS' else 'fail'))
        elif c['id'] == 'AC-15':
            rel, ev, cks = checks_of('challenges/X1.json')
            res = criterion_result(c, [(rel, ev, cks)], nonce)
            cur, pins = current(ev, nonce), load(f'{Q}/cases.json')['challenges']['X1']
            red, green = cur.get('red') or {}, cur.get('green') or {}
            gap = red.get('exit') == 0 and pins['red'] in (red.get('stdout') or '')
            fixed = green.get('exit') == 1 and all(p in (green.get('stdout') or '') for p in pins['green'])
            add_regression(res, mode, contract['taskId'], c,
                           (f'base gate 1ef9c70 exit {red.get("exit")}: {red.get("verdict")}', 'fail' if gap else 'pass'),
                           (f'current gate exit {green.get("exit")}: {green.get("verdict")}', 'pass' if fixed else 'fail'))
        elif mode in ('local', 'ci'):
            res = criterion_result(c, e2e_parts(c['id'], mode, nonce) or [('missing-evaluator', None, [])], nonce)
            if c['id'] == 'AC-11':
                res['observed'] += structural_summary(ev_load('rfc3161-structural-skips.json'), nonce)
        elif mode == 'challenges':
            res = criterion_result(c, [checks_of({'AC-16': 'challenges/X2.json', 'AC-17': 'challenges/X3.json', 'AC-18': 'challenges/X4.json', 'AC-19': 'challenges/X6.json'}[c['id']])], nonce)
        else:
            res = criterion_result(c, [checks_of('reconcile/run.json'), checks_of('reconcile/x5.json')], nonce)
        issues = res.pop('_issues')
        if not res['evidenceRefs']:  # the runner must be able to snapshot a real file even for a failing outcome
            rel = f'missing/{c["id"]}-{mode}.json'
            save(f'{OUT}/{rel}', {'nonce': nonce, 'criterionId': c['id'], 'issues': issues or ['no evidence']})
            res['evidenceRefs'] = [EVIDENCE + rel]
        criteria.append(res)
    doc = {'schema': 'verification_outcomes_v1', 'taskId': contract['taskId'], 'criteria': criteria}
    return doc, os.path.basename(recipe['outcomesPath'])


def cmd_outcomes(argv):
    o, _ = opts(argv)
    doc, name = build_outcomes(o['mode'], o['nonce'])
    save(f'{OUT}/{name}', doc)
    failed = [c['criterionId'] for c in doc['criteria'] if c['status'] != 'pass']
    print(json.dumps({'outcomes': name, 'criteria': len(doc['criteria']), 'failed': failed}))
    return 0


# ---------------------------------------------------------------- selftest (pure; no Docker, no network)

def selftest():
    import tempfile
    import zipfile
    lock = ('foo-bar[email]==1.0 \\\n    --hash=sha256:' + 'a' * 64 + ' \\\n    --hash=sha256:' + 'b' * 64 + '\n    # via x\n'
            'baz==2.0 \\\n    --hash=sha256:PENDING_W\n')
    pins = parse_lock(lock)
    assert list(pins) == ['foo-bar', 'baz'] and pins['foo-bar']['extras'] == ['email'] and pins['foo-bar']['hashes'] == ['a' * 64, 'b' * 64]
    assert pins['baz']['hashes'] == ['PENDING_W']
    for bad in ('x==1 \\\n    --hash=md5:' + 'a' * 32 + '\n', 'x==1\nx==2 \\\n --hash=sha256:' + 'a' * 64 + '\n', '    --hash=sha256:' + 'a' * 64 + '\n', 'x==1\n'):
        try:
            parse_lock(bad)
            raise AssertionError(f'lock accepted: {bad!r}')
        except ValueError:
            pass
    real = parse_lock(read(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'requirements-linux-cp312.txt')))
    w = load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs.json'))['rebuilt']['sha256']  # PENDING until the D14 slot fill
    assert len(real) == 31 and real['rfc3161-client']['hashes'] == (['PENDING_W'] if w == 'PENDING' else [w]) and real['pydantic']['extras'] == ['email']
    exp = {'exit': 1, 'stderrContains': ['Bundle message digest mismatch'], 'stderrExcludes': ['OK: ']}
    assert match_expect(exp, 1, 'x Bundle message digest mismatch y') == []
    assert len(match_expect(exp, 2, 'OK: file')) == 3
    assert match_expect({'exit': 0, 'stderrContains': ['OK: '], 'stopIf': ['Invalid Timestamp Response']}, 0, 'OK: f Invalid Timestamp Response') == ["STOP marker present: 'Invalid Timestamp Response'"]
    assert canonical({'b': 1, 'a': [1, {'d': 2, 'c': 3}]}) == b'{"a":[1,{"c":3,"d":2}],"b":1}'
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(f'{d}/v/x')
        with open(f'{d}/v/x/f.txt', 'wb') as f:
            f.write(b'hi')
        m = manifest(f'{d}/v')
        assert [e['path'] for e in m] == ['x', 'x/f.txt'] and m[1]['sha256'] == sha_bytes(b'hi') and m[0]['type'] == 'dir'
        good = synthetic_wheel(f'{d}/d09_synthetic-1.0-py3-none-any.whl')
        assert inert_zip(good) == []
        lk = f'd09-synthetic==1.0 \\\n    --hash=sha256:{sha_file(good)}\n'
        assert admit([lk], [good], 1)[0]['pin'] == 'd09-synthetic'
        os.makedirs(f'{d}/bad')
        bad = synthetic_wheel(f'{d}/bad/d09_synthetic-1.0-py3-none-any.whl', record_ok=False)
        assert any('RECORD hash/size mismatch' in i for i in inert_zip(bad))
        for files, lockt, msg in (([good], 'other==1 \\\n    --hash=sha256:' + 'a' * 64 + '\n', 'unexpected wheel'), ([], lk, 'no wheel for pin'),
                                  ([good], lk.replace(sha_file(good), 'c' * 64), 'sha256 not in lock hash set')):
            try:
                admit([lockt], files, 1)
                raise AssertionError(msg)
            except Stop as e:
                assert msg in str(e), (msg, e)
        evil = f'{d}/evil-1.0-py3-none-any.whl'
        with zipfile.ZipFile(evil, 'w') as z:
            z.writestr('../x', b'')
            info = zipfile.ZipInfo('link')
            info.external_attr = 0o120777 << 16
            z.writestr(info, 'target')
            z.writestr('evil-1.0.dist-info/RECORD', '../x,,\n')
        issues = inert_zip(evil)
        assert any('unsafe path' in i for i in issues) and any('symlink' in i for i in issues)
    doc = {'messageSignature': {'signature': base64.b64encode(b'\x30\x01\x02').decode()},
           'verificationMaterial': {'tlogEntries': [{'inclusionPromise': {'signedEntryTimestamp': base64.b64encode(b'\x30\x05').decode()}}],
                                    'timestampVerificationData': {'rfc3161Timestamps': [{'signedTimestamp': base64.b64encode(b'\x30\x03\xaa').decode()}]}}}
    m = mutate_bundle(json.loads(json.dumps(doc)), 'bundle-messageSignature.signature-last-byte-xor-01')
    assert base64.b64decode(m['messageSignature']['signature']) == b'\x30\x01\x03'
    m = mutate_bundle(json.loads(json.dumps(doc)), 'bundle-signedTimestamp-truncate-1')
    assert base64.b64decode(m['verificationMaterial']['timestampVerificationData']['rfc3161Timestamps'][0]['signedTimestamp']) == b'\x30\x03'
    m = mutate_bundle(json.loads(json.dumps(doc)), 'bundle-inclusionPromise.signedEntryTimestamp-last-byte-xor-01')
    assert base64.b64decode(m['verificationMaterial']['tlogEntries'][0]['inclusionPromise']['signedEntryTimestamp']) == b'\x30\x04'
    lib = '/usr/lib/x86_64-linux-gnu/'
    inputs = {'build': {'forbiddenBytes': ['OpenSSL 3.6']}, 'runtime': {'files': [{'path': f'{lib}libcrypto.so.3', 'type': 'file', 'sha256': 'c' * 64}],
                                                                          'libcrypto': f'{lib}libcrypto.so.3', 'blockedObjects': ['pyexpat.', 'libexpat']}}
    probe = {'modules': [{'name': 'json'}], 'blockedLoaded': [], 'forbiddenBytes': ['OpenSSL 3.6'],
             'maps': [{'path': f'{lib}libcrypto.so.3', 'sha256': 'c' * 64, 'forbidden': []}, {'path': '/cap/venv/x.so', 'sha256': 'd' * 64, 'forbidden': []}]}
    assert probe_issues(probe, inputs, {'/cap/venv/': [{'path': 'x.so', 'type': 'file', 'sha256': 'd' * 64}]}) == []
    probe['maps'].append({'path': '/usr/local/lib/python3.12/lib-dynload/pyexpat.cpython-312-x86_64-linux-gnu.so', 'sha256': 'e' * 64})
    probe['maps'].append({'path': '/tmp/other.so', 'sha256': 'f' * 64})
    probe['blockedLoaded'] = ['pyexpat']
    iss = probe_issues(probe, inputs, {'/cap/venv/': [{'path': 'x.so', 'type': 'file', 'sha256': '0' * 64}]})
    assert sum(i.startswith('S3: ') for i in iss) == 2 and sum(i.startswith('S4: ') for i in iss) == 2, iss
    # B6: legacy provider, engines and PAM are S3 even when inputs.runtime.blockedObjects omits them (I6 minimum)
    bad_maps = [f'{lib}ossl-modules/legacy.so', f'{lib}engines-3/padlock.so', f'{lib}libpam.so.0.85.1', f'{lib}security/pam_unix.so', f'{lib}liblzma.so.5.8.1']
    p2 = {'modules': [], 'blockedLoaded': [], 'forbiddenBytes': ['OpenSSL 3.6'], 'maps': [{'path': p, 'sha256': '1' * 64, 'forbidden': []} for p in bad_maps]}
    assert [i for i in probe_issues(p2, inputs, {}, require_libcrypto=False) if i.startswith('S3: ')] == [f'S3: blocked object mapped: {p}' for p in bad_maps]
    p3 = {'modules': [], 'blockedLoaded': [], 'forbiddenBytes': ['OpenSSL 3.6'], 'maps': [{'path': '/cap/venv/v.so', 'sha256': 'd' * 64, 'forbidden': ['OpenSSL 3.6']},
                                                                                           {'path': '/opt/libcrypto.so.3', 'sha256': '2' * 64, 'forbidden': []}]}
    iss = probe_issues(p3, inputs, {'/cap/venv/': [{'path': 'v.so', 'type': 'file', 'sha256': 'd' * 64}]}, require_libcrypto=False)
    assert "S3: forbidden bytes ['OpenSSL 3.6'] in mapped file: /cap/venv/v.so" in iss and any(i.startswith('S4: expected exactly one') for i in iss), iss
    assert any(i.startswith('S3: probe did not scan') for i in probe_issues({**p3, 'forbiddenBytes': None}, inputs, {}, require_libcrypto=False))
    roles = {r: {'version': v, 'expires': '2099-01-01T00:00:00Z', 'signed': {}} for r, v in (('root', 15), ('timestamp', 900), ('snapshot', 1))}
    roles['targets'] = {'version': 1, 'expires': '2099-01-01T00:00:00Z', 'signed': {'targets': {'trusted_root.json': {'length': 2, 'hashes': {'sha256': sha_bytes(b'{}')}}}}}
    cfg = {'minExpiryHours': 24, 'embeddedRootVersion': 15, 'minTimestampVersion': 804}
    assert all(k['ok'] for k in tuf_checks(roles, b'{}', cfg))
    roles['timestamp']['version'] = 803
    roles['snapshot']['expires'] = iso(utcnow() + datetime.timedelta(hours=2))
    assert sorted(k['name'] for k in tuf_checks(roles, b'{x}', cfg) if not k['ok']) == ['snapshot expires > now+24h', 'timestamp version >= 804', 'trusted_root.json sha256 == targets entry']
    uris = parse_print_uris("'http://deb.debian.org/debian/pool/main/g/gcc-14/gcc-14_14.2.0-19_amd64.deb' gcc-14_14.2.0-19_amd64.deb 123 SHA256:" + 'a' * 64 + '\n'
                            "'http://deb.debian.org/debian/pool/main/libz/x_1%3a1.3_amd64.deb' x_1%3a1.3_amd64.deb 5 SHA256:" + 'b' * 64)
    assert uris[0]['package'] == 'gcc-14' and uris[0]['version'] == '14.2.0-19' and uris[1]['version'] == '1:1.3' and uris[0]['size'] == 123
    plan_text = ("'http://deb.debian.org/debian/pool/main/g/gcc-14/gcc-14_14.2.0-19_amd64.deb' gcc-14_14.2.0-19_amd64.deb 123 MD5Sum:" + 'c' * 32 + '\n'
                 "'http://deb.debian.org/debian-security/pool/updates/main/o/openssl/libssl-dev_3.5.7-1%7edeb13u3_amd64.deb' libssl-dev_3.5.7-1~deb13u3_amd64.deb 7 ")
    assert [(u['package'], u['version'], u['sha256']) for u in parse_print_uris(plan_text, hashed=False)] == [('gcc-14', '14.2.0-19', None), ('libssl-dev', '3.5.7-1~deb13u3', None)]
    assert parse_print_uris(plan_text) == []  # pinned debs never come from plan lines (no SHA256)
    assert snapshot_uri('https://deb.debian.org/debian-security/pool/x.deb', '20261011T000000Z') == 'https://snapshot.debian.org/archive/debian-security/20261011T000000Z/pool/x.deb'
    needed, rpath = parse_needed(' 0x0000000000000001 (NEEDED)             Shared library: [libcrypto.so.3]\n 0x000000000000001d (RUNPATH)            Library runpath: [$ORIGIN]\n')
    assert needed == ['libcrypto.so.3'] and rpath == ['RUNPATH=$ORIGIN'] and parse_needed(' 0x1 (RPATH) odd format\n')[1] == ['unparsed']
    und, defined = parse_dynsyms('   12: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND PKCS7_verify@OPENSSL_3.0.0 (3)\n'
                                 '   13: 00000000000a1b20    42 FUNC    GLOBAL DEFAULT   12 PyInit__rust\n   14: 00000000000a1b20    42 FUNC    GLOBAL DEFAULT   12 EVP_DigestInit\n'
                                 '   15: 00000000000a1b40    42 IFUNC   GLOBAL DEFAULT   12 OSSL_x@@OPENSSL_3.0.0\n')
    assert und == ['PKCS7_verify@OPENSSL_3.0.0'] and openssl_symbols(defined) == ['EVP_DigestInit', 'OSSL_x@@OPENSSL_3.0.0']
    assert elf_facts(['libcrypto.so.3'], [], und, defined) == {'needed': ['libcrypto.so.3'], 'rpath': [], 'pkcs7': [PKCS7_PIN], 'zlib': [], 'definedOpenSSL': ['EVP_DigestInit', 'OSSL_x']}
    assert elf_facts([], [], und + ['gzwrite', 'crc32_combine_gen64@ZLIB_1.2.12', 'crc32@ZLIB_1.2.0'], [])['zlib'] == ['crc32_combine_gen64@ZLIB_1.2.12', 'gzwrite']
    ok = criterion_result({'id': 'AC-X', 'expected': 'e'}, [('a.json', {'nonce': 'n', 'checks': [check('c1', True), check('c2', True)]}, [check('c1', True), check('c2', True)])], 'n')
    assert ok['status'] == 'pass' and ok['counts'] == {'total': 2, 'passed': 2, 'failed': 0, 'skipped': 0} and ok['evidenceRefs'] == [EVIDENCE + 'a.json']
    stale = criterion_result({'id': 'AC-X', 'expected': 'e'}, [('a.json', {'nonce': 'old', 'checks': []}, [])], 'n')
    missing = criterion_result({'id': 'AC-X', 'expected': 'e'}, [('a.json', None, [])], 'n')
    assert stale['status'] == missing['status'] == 'fail' and stale['counts']['total'] == missing['counts']['total'] == 1
    env_digest = sha_bytes(json.dumps({'present': True, 'value': '42'}, separators=(',', ':')).encode())
    assert env_digest == sha_bytes(b'{"present":true,"value":"42"}')
    q = os.path.dirname(os.path.abspath(__file__))
    assert load(f'{q}/inputs.json')['runtime']['blockedModules'] == list(BLOCKED)  # probe-runtime STOPs S5 otherwise
    observed = ('missing     /usr/share/doc/libc6/NEWS.Debian.gz\nmissing     /usr/share/lintian/overrides/libc6\n'
                'missing     /usr/share/doc/libssl3t64/changelog.Debian.gz\nmissing     /usr/share/lintian/overrides/libssl3t64\n')
    assert dpkg_verify_deviations(observed) == [] and dpkg_verify_deviations('') == []
    for line in ('??5??????   /usr/lib/x86_64-linux-gnu/libc.so.6', 'missing     /usr/lib/x86_64-linux-gnu/libcrypto.so.3',
                 'missing     /usr/share/doc/libc6/copyright', 'missing   c /etc/ld.so.conf', 'missing     /usr/share/doc/kde/HTML/C/index.docbook'):
        assert dpkg_verify_deviations(observed + line + '\n') == [line], line
    assert dpkg_filter_rules('# c\npath-exclude /usr/share/doc/*\npath-include /usr/share/doc/*/copyright\n') == [('path-exclude', '/usr/share/doc/*'), ('path-include', '/usr/share/doc/*/copyright')]
    cases = load(f'{q}/cases.json')
    ids = [c['id'] for c in cases['cases']]
    assert len(ids) == 33 == len(set(ids)) and sorted(sum(cases['groups'], [])) == sorted(ids) and all(len(g) <= 4 for g in cases['groups'])
    assert sum(c['kind'] == 'positive' for c in cases['cases']) == 4 and sum(c['kind'] == 'negative' for c in cases['cases']) == 24
    first = {g: i for i, grp in enumerate(cases['groups']) for g in grp}
    assert all(first[c['requiresPositive']] < first[c['id']] for c in cases['cases'] if c.get('requiresPositive'))
    import shutil
    for mode, recipe_name in RECIPES.items():
        recipe = load(f'{q}/{recipe_name}')
        contract = load(f'{q}/{os.path.basename(recipe["contractPath"])}')
        saved, tmp = {'Q': globals()['Q'], 'OUT': globals()['OUT']}, tempfile.mkdtemp()
        globals().update(Q=q, OUT=tmp)  # evaluators read module paths at call time
        try:
            doc, name = build_outcomes(mode, 'nonce-x')
            for c in doc['criteria']:  # every ref, even for missing evidence, names a real file the runner can snapshot
                assert c['evidenceRefs'] and all(os.path.isfile(os.path.join(tmp, r[len(EVIDENCE):])) for r in c['evidenceRefs']), c
        finally:
            globals().update(saved)
            shutil.rmtree(tmp, ignore_errors=True)
        want = [c['id'] for c in contract['criteria'] if c['recipeRef'] == recipe['recipeRef']]
        assert [c['criterionId'] for c in doc['criteria']] == want and doc['taskId'] == contract['taskId'] and name == os.path.basename(recipe['outcomesPath'])
        assert all(c['counts']['total'] > 0 and c['status'] == 'fail' for c in doc['criteria'])
        assert all(c['expected'] == next(k['expected'] for k in contract['criteria'] if k['id'] == c['criterionId']) for c in doc['criteria'])
        for c in doc['criteria']:
            if c['criterionId'] in ('AC-05', 'AC-15'):  # runner snapshots only evidenceRefs; assertRegression needs both refs there
                assert {c['regression']['beforeRef'], c['regression']['afterRef']} <= set(c['evidenceRefs']), c
    selftest_fix_round(q)
    print(json.dumps({'selftest': 'd09.py', 'ok': True}))
    return 0


def selftest_fix_round(q):
    """Fix-round (2026-10-11) units: STOP codes, B2/I3 wheel-audit, B3, B4/I8, B6, B11, I5, I6/S7, I9. Pure and offline."""
    import contextlib
    import shutil
    import tarfile
    import tempfile
    from types import SimpleNamespace as NS

    @contextlib.contextmanager
    def paths(**kw):  # evaluators read the module paths at call time
        saved = {k: globals()[k] for k in kw}
        globals().update(kw)
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                yield
        finally:
            globals().update(saved)

    def denied(fn, text):
        try:
            fn()
        except Stop as e:
            assert text in str(e), (text, str(e))
            return str(e)
        raise AssertionError(f'not denied: {text}')
    # I6: policy STOPs print exactly 'D09-STOP S<n>: <reason>'; other failures carry no S-code
    c1, c2 = check('x', False, ['S3: blocked object mapped: /l/legacy.so', 'plain']), check('pin', False, 'drift', stop='S5')
    assert c1['stops'] == ['S3: blocked object mapped: /l/legacy.so'] and c2['stops'] == ['S5: pin: drift'] and 'stops' not in check('ok', True, ['S3: x'], stop='S5')
    assert 'stops' not in check('plain', False, 'no code') and check('install', False, Stop('S5: installer wheel sha256 mismatch'))['stops'] == ['S5: installer wheel sha256 mismatch']
    err = io.StringIO()
    with contextlib.redirect_stderr(err):
        print_stops(c1['stops'] + c2['stops'], 'unused')
        print_stops([], 'case X invalid: reason')
        print_stops([], [])
    assert err.getvalue().splitlines() == ['D09-STOP S3: blocked object mapped: /l/legacy.so', 'D09-STOP S5: pin: drift', 'D09-STOP case X invalid: reason']
    # B2/I3: pure-Python ELF64 reader and the one wheel policy, on in-memory fixtures
    b = {'elfNeededAllowed': ['libcrypto.so.3', 'libssl.so.3', 'libgcc_s.so.1', 'libm.so.6', 'libc.so.6', 'ld-linux-x86-64.so.2'], 'wheelTag': 'cp39-abi3-linux_x86_64', 'forbiddenBytes': ['OpenSSL 3.6']}
    py = {'rfc3161_client/__init__.py': b'from .base import X\n', 'rfc3161_client/base.py': b'X = 1\n'}
    assert elf_dynamic(synthetic_elf()) == (['libcrypto.so.3', 'libc.so.6'], [], [PKCS7_PIN], ['PyInit__rust'])
    assert elf_dynamic(synthetic_elf(rpath=[('RUNPATH', '$ORIGIN')], undefined=[('PKCS7_verify', None), ('X509_free', 'OPENSSL_3.0.0'), ('memcpy', 'GLIBC_2.14')]))[1:3] == (
        ['RUNPATH=$ORIGIN'], ['PKCS7_verify', 'X509_free@OPENSSL_3.0.0', 'memcpy@GLIBC_2.14'])
    for junk in (b'MZ\x90\x00', b'\x7fELF\x01\x01' + bytes(58), synthetic_elf()[:80]):
        try:
            pure_facts(junk)
            raise AssertionError('malformed ELF accepted')
        except ValueError:
            pass
    with tempfile.TemporaryDirectory() as d:
        def failing(elf=None, wheel_py=py, **kw):
            whl = synthetic_rfc_wheel(f'{d}/w.whl', synthetic_elf(**(elf or {})), wheel_py, **kw)
            return [c['name'].split(': ', 1)[1] for c in wheel_policy('W', whl, py, b, pure_facts)[0] if not c['ok']]
        pk = ['PKCS7_verify undefined with version OPENSSL_3.0.0']
        assert failing() == []  # allowed NEEDED, PKCS7_verify@OPENSSL_3.0.0 undefined, no OpenSSL definitions
        assert failing(elf={'needed': ('libcrypto.so.3', 'libc.so.6', 'libfoo.so.1')}) == ['NEEDED subset of inputs.build.elfNeededAllowed']
        assert failing(elf={'rpath': [('RPATH', '/opt/ssl/lib')]}) == ['no RPATH/RUNPATH'] == failing(elf={'rpath': [('RUNPATH', '$ORIGIN')]})
        assert failing(elf={'defined': ('PyInit__rust', 'EVP_DigestInit')}) == ['zero defined OpenSSL symbols']
        assert failing(elf={'undefined': ()}) == pk == failing(elf={'undefined': [('PKCS7_verify', 'OPENSSL_3.6.0')]}) == failing(elf={'undefined': [('PKCS7_verify', None)]})
        zl = ['no zlib gz*/crc32_combine* imports (R-10)']
        assert failing(elf={'undefined': [('PKCS7_verify', 'OPENSSL_3.0.0'), ('gzwrite', None)]}) == zl == failing(elf={'undefined': [('PKCS7_verify', 'OPENSSL_3.0.0'), ('crc32_combine64', 'ZLIB_1.2.3.3')]})
        assert failing(elf={'undefined': [('PKCS7_verify', 'OPENSSL_3.0.0'), ('crc32', 'ZLIB_1.2.0')]}) == []  # only the R-10 entry points
        assert failing(elf={'text': b'\xc3 OpenSSL 3.6.2 1 Jul 2026\0'}) == ['no forbidden bytes (inputs.build.forbiddenBytes) in any member']
        assert failing(extra={'rfc3161_client.libs/README': b'vendored'}) == ['no *.libs/ vendored directory']
        assert failing(tag='cp39-abi3-manylinux_2_17_x86_64') == ['WHEEL Tag == cp39-abi3-linux_x86_64']
        assert failing(purelib='true') == ['Root-Is-Purelib: false']
        dpy = ['every .py byte-equal to the sdist src/ member (same set)']
        assert failing(wheel_py={**py, 'rfc3161_client/base.py': b'X = 2\n'}) == dpy == failing(wheel_py={'rfc3161_client/__init__.py': py['rfc3161_client/__init__.py']})
        assert failing(extra={'rfc3161_client/extra.so': synthetic_elf()}) == ['exactly one ELF object, the abi3 extension module']
        # the wheel-audit step end to end: synthetic inputs, sdist, two builds, the installed copy and an official wheel
        top, wfile = 'rfc3161_client-1.0.9', 'rfc3161_client-1.0.9-cp39-abi3-linux_x86_64.whl'
        tq, tin, tout = (os.path.join(d, x) for x in ('q', 'in', 'out'))
        for p in (tq, f'{tin}/sdist', f'{tin}/wheels', f'{tin}/official', f'{d}/b1', f'{d}/b2', tout):
            os.makedirs(p)
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz') as t:
            for n, v in {**{f'src/{k}': v for k, v in py.items()}, 'test/fixtures/test_tsa/request.der': b'r'}.items():
                ti = tarfile.TarInfo(f'{top}/{n}')
                ti.size = len(v)
                t.addfile(ti, io.BytesIO(v))
        with open(f'{tin}/sdist/s.tar.gz', 'wb') as f:
            f.write(buf.getvalue())
        synthetic_rfc_wheel(f'{d}/b1/{wfile}', synthetic_elf(), py)
        for dst in (f'{d}/b2/{wfile}', f'{tin}/wheels/{wfile}'):
            shutil.copyfile(f'{d}/b1/{wfile}', dst)
        synthetic_rfc_wheel(f'{tin}/official/o.whl', synthetic_elf(needed=('libpthread.so.0', 'libc.so.6'), undefined=()), py, tag='cp39-abi3-manylinux_2_17_x86_64')
        ti = {'build': b, 'sdist': {'path': 'sdist/s.tar.gz', 'sha256': sha_file(f'{tin}/sdist/s.tar.gz'), 'topDir': top},
              'rebuilt': {'file': wfile, 'path': f'wheels/{wfile}', 'sha256': sha_file(f'{d}/b1/{wfile}')},
              'officialRfc3161Wheel': {'path': 'official/o.whl', 'sha256': sha_file(f'{tin}/official/o.whl')}}
        with open(f'{tq}/inputs.json', 'w') as f:
            json.dump(ti, f)
        assert sorted(sdist_files(f'{tin}/sdist/s.tar.gz', ti['sdist']['sha256'], top)) == ['src/rfc3161_client/__init__.py', 'src/rfc3161_client/base.py', 'test/fixtures/test_tsa/request.der']
        assert denied(lambda: sdist_files(f'{tin}/sdist/s.tar.gz', '0' * 64, top), 'sdist sha256 mismatch').startswith('S5: ')
        audit = ['--nonce', 'n1', '--mode', 'local', '--b1', f'{d}/b1', '--b2', f'{d}/b2', '--official', f'{tin}/official/o.whl', '--sdist', f'{tin}/sdist/s.tar.gz']

        def wheel_audit(*extra):
            with paths(Q=tq, IN=tin, OUT=tout):
                code = cmd_wheel_audit(audit + list(extra))
            return code, load(f'{tout}/wheel-audit.json')
        code, wa = wheel_audit()
        assert code == 0 and wa['W']['verdict'] == 'PASS' and wa['official']['verdict'] == 'FAIL' and wa['readelf']['status'] == 'not provided', [c for c in wa['checks'] if not c['ok']]
        assert wa['official']['reasons'] == ['official: WHEEL Tag == cp39-abi3-linux_x86_64', 'official: NEEDED subset of inputs.build.elfNeededAllowed',
                                             'official: NEEDED includes libcrypto.so.3', 'official: PKCS7_verify undefined with version OPENSSL_3.0.0']
        good = dict(wa)
        # AC-04/AC-05 derive only from this evidence; regression statuses are the observation, never constants
        with open(f'{tout}/rfc3161-structural-skips.json', 'w') as f:
            json.dump({'nonce': 'n1', 'skips': [{'absentPath': 'test/fixtures/sigstage/response.tsr'}] * 2 + [{'absentPath': 'test/fixtures/test_tsa/response-sha256.tsr'}]}, f)

        def outcome(mode, cid, nonce='n1'):
            with paths(Q=q, OUT=tout):
                doc, _ = build_outcomes(mode, nonce)
            res = next(c for c in doc['criteria'] if c['criterionId'] == cid)
            regs = [load(os.path.join(tout, res['regression'][k][len(EVIDENCE):]))['status'] for k in ('beforeRef', 'afterRef')] if 'regression' in res else None
            return res, regs
        res, regs = outcome('local', 'AC-05')
        assert res['status'] == 'pass' and regs == ['fail', 'pass'] and EVIDENCE + 'wheel-audit.json' in res['evidenceRefs'], res
        assert outcome('local', 'AC-04')[0]['status'] == 'pass' and outcome('ci', 'AC-04')[0]['status'] == 'fail'  # CI audits exactly one build
        ac11 = outcome('local', 'AC-11')[0]
        assert '3 structural skips' in ac11['observed'] and 'test/fixtures/sigstage/response.tsr x2' in ac11['observed'] and EVIDENCE + 'rfc3161-structural-skips.json' in ac11['evidenceRefs']
        assert outcome('local', 'AC-05', nonce='other')[1] == ['pass', 'fail']  # stale evidence is no observation
        with open(f'{tout}/wheel-audit.json', 'w') as f:
            json.dump({**good, 'official': {**good['official'], 'verdict': 'PASS'}}, f)
        assert outcome('local', 'AC-05')[1] == ['pass', 'pass']  # an official wheel that passes cannot be a 'before' failure
        os.makedirs(f'{tout}/challenges')
        x1 = {'nonce': 'c1', 'checks': [check('red', True), check('green', True)], 'red': {'exit': 0, 'stdout': 'COMPLETE_ALLOWED run=x status=Verified\n', 'verdict': 'COMPLETE_ALLOWED'},
              'green': {'exit': 1, 'stdout': 'COMPLETE_DENIED run=x status=Needs Validation\nUNVERIFIED AC-08: fresh replay required: evidence was not produced\n', 'verdict': 'COMPLETE_DENIED'}}
        for red_exit, want in ((0, ['fail', 'pass']), (1, ['pass', 'pass'])):
            with open(f'{tout}/challenges/X1.json', 'w') as f:
                json.dump({**x1, 'red': {**x1['red'], 'exit': red_exit}}, f)
            assert outcome('challenges', 'AC-15', nonce='c1')[1] == want
        # wheel-audit negatives: builds differ, extra wheel, wrong mode count, official passes, readelf disagrees
        code, wa = wheel_audit('--elf', f'{d}/absent-elf.json')
        assert code == 0 and wa['readelf']['status'] == 'absent'
        with open(f'{d}/elf.json', 'w') as f:
            json.dump({'verdicts': {k: {'sha256': good[k]['sha256'], 'facts': good[k]['facts']} for k in ('W', 'official')}}, f)
        assert wheel_audit('--elf', f'{d}/elf.json')[0] == 0
        with open(f'{d}/elf.json', 'w') as f:
            json.dump({'verdicts': {'W': {'sha256': good['W']['sha256'], 'facts': {**good['W']['facts'], 'needed': ['libc.so.6']}}, 'official': good['official']}}, f)
        code, wa = wheel_audit('--elf', f'{d}/elf.json')
        assert code == 1 and [c['name'] for c in wa['checks'] if not c['ok']] == ['readelf output for W agrees with the pure-Python reader']
        bad = lambda wa: sorted(c['name'] for c in wa['checks'] if not c['ok'])  # noqa: E731
        synthetic_rfc_wheel(f'{d}/b2/{wfile}', synthetic_elf(text=b'\x90'), py)
        code, wa = wheel_audit()
        assert code == 1 and 'builds byte-identical' in bad(wa) and wa['W']['verdict'] == 'NOT-AUDITED'
        shutil.copyfile(f'{d}/b1/{wfile}', f'{d}/b2/{wfile}')
        shutil.copyfile(f'{d}/b1/{wfile}', f'{d}/b2/other.whl')
        assert wheel_audit()[0] == 1
        os.remove(f'{d}/b2/other.whl')
        with paths(Q=tq, IN=tin, OUT=tout):
            assert cmd_wheel_audit([a for a in audit if a not in ('--b2', f'{d}/b2')]) == 1  # local mode needs B1 and B2
            assert cmd_wheel_audit([a if a != 'local' else 'ci' for a in audit]) == 1  # ci mode audits B1 only
        shutil.copyfile(f'{d}/b1/{wfile}', f'{tin}/official/o.whl')
        with open(f'{tq}/inputs.json', 'w') as f:
            json.dump({**ti, 'officialRfc3161Wheel': {'path': 'official/o.whl', 'sha256': sha_file(f'{tin}/official/o.whl')}}, f)
        code, wa = wheel_audit()
        assert code == 1 and bad(wa) == ['official vendored wheel FAILS the policy on linkage (before; observed reasons)']
        assert fails_on_linkage(good['official']['reasons']) and not fails_on_linkage(['official: WHEEL Tag == cp39-abi3-linux_x86_64'])
        assert not fails_on_linkage(good['official']['reasons'] + ['official: ELF dynamic section and symbols parsed'])  # an unparsed ELF proves nothing
        synthetic_rfc_wheel(f'{tin}/official/o.whl', synthetic_elf(), py, tag='cp39-abi3-manylinux_2_17_x86_64')  # FAILs on the tag alone
        with open(f'{tq}/inputs.json', 'w') as f:
            json.dump({**ti, 'officialRfc3161Wheel': {'path': 'official/o.whl', 'sha256': sha_file(f'{tin}/official/o.whl')}}, f)
        code, wa = wheel_audit()
        assert code == 1 and wa['official']['verdict'] == 'FAIL' and bad(wa) == ['official vendored wheel FAILS the policy on linkage (before; observed reasons)']
        # B11: the capsule venv runs through the guarded exec-module path with its own probe
        assert venv_argv('a', '/cap')[3:] == [f'{Q}/d09.py', 'exec-module', 'venv', '--probe', 'venv-a', '--', '--without-pip', '/cap/venv']
        # B6 + I5: dispositions are bound by sha256 (S6), stopIfMapped/S1/S2 come from mapped objects
        disp = {'schema': 'd09_security_dispositions_v1', 'capturedAt': '2026-10-10T20:15:16Z', 'items': [
            {'id': 'R-LZMA', 'residual': True, 'objects': ['liblzma.so'], 'stopIfMapped': 'S1', 'fixAvailable': True, 'fixedIn': '5.8.1-1+deb13u2', 'severity': 'HIGH', 'reachable': False},
            {'id': 'R-GLIBC-A', 'residual': True, 'objects': ['libc.so'], 'stopIfMapped': None, 'fixAvailable': False, 'severity': 'HIGH', 'reachable': False},
            {'id': 'R-GLIBC-B', 'residual': True, 'objects': ['libc.so'], 'stopIfMapped': None, 'fixAvailable': False, 'severity': 'UNKNOWN', 'reachable': 'conditional'}]}
        raw = json.dumps(disp).encode()
        with open(f'{tq}/security-dispositions.json', 'wb') as f:
            f.write(raw)
        lib = '/usr/lib/x86_64-linux-gnu/'
        rin = {'build': b, 'runtime': {'files': [{'path': f'{lib}libc.so.6', 'type': 'file', 'sha256': 'a' * 64}], 'libcrypto': f'{lib}libcrypto.so.3', 'blockedObjects': []},
               'securityEvidence': {'dispositionsRef': f'{HARNESS}security-dispositions.json', 'dispositionsSha256': sha_bytes(raw)}}
        probe = {'modules': [], 'blockedLoaded': [], 'forbiddenBytes': b['forbiddenBytes'], 'maps': [{'path': f'{lib}libc.so.6', 'sha256': 'a' * 64, 'forbidden': []},
                                                                                                      {'path': f'{lib}liblzma.so.5.8.1', 'sha256': 'b' * 64, 'forbidden': []}]}
        os.makedirs(f'{tout}/probes')
        with open(f'{tout}/probes/p.json', 'w') as f:
            json.dump(probe, f)
        with paths(Q=tq, OUT=tout):
            assert len(load_dispositions(rin)) == 3
            assert probe_check('p', rin, {}, require_libcrypto=False) == [  # HIGH but reachable=false (R-GLIBC-A) is no S2
                f'S2: R-GLIBC-B mapped {lib}libc.so.6 (UNKNOWN, reachable=conditional)', f'S3: blocked object mapped: {lib}liblzma.so.5.8.1',
                f'S1: R-LZMA mapped {lib}liblzma.so.5.8.1', f'S1: R-LZMA mapped {lib}liblzma.so.5.8.1 (fix available, not applied: 5.8.1-1+deb13u2)']
            se = rin['securityEvidence']
            for bad_se, text in (({**se, 'dispositionsSha256': '0' * 64}, 'sha256'), ({**se, 'dispositionsRef': f'{HARNESS}../x.json'}, 'dispositionsRef'),
                                 ({**se, 'dispositionsRef': 'elsewhere/security-dispositions.json'}, 'dispositionsRef'), ({**se, 'dispositionsRef': f'{HARNESS}absent.json'}, 'missing')):
                assert denied(lambda: load_dispositions({**rin, 'securityEvidence': bad_se}), text).startswith('S6: ')
            assert probe_check('p', {**rin, 'securityEvidence': {**se, 'dispositionsSha256': '0' * 64}}, {}, require_libcrypto=False)[0].startswith('S6: ')
            assert probe_check('absent', rin, {}) == ['probe missing: absent']
        malformed = {**disp, 'items': [{**disp['items'][0], 'severity': 'High'}]}
        raw = json.dumps(malformed).encode()
        with open(f'{tq}/security-dispositions.json', 'wb') as f:
            f.write(raw)
        with paths(Q=tq):
            assert denied(lambda: load_dispositions({**rin, 'securityEvidence': {**se, 'dispositionsSha256': sha_bytes(raw)}}), 'malformed').startswith('S6: ')
        # S3: forbidden bytes are found across the scan's 1 MiB chunk boundary
        big = f'{d}/big.bin'
        with open(big, 'wb') as f:
            f.write(b'x' * ((1 << 20) - 4) + b'OpenSSL 3.6.2' + b'y' * 10)
        assert scan_file(big, ['OpenSSL 3.6', 'absent']) == (sha_file(big), ['OpenSSL 3.6'])
        # I6/S7: dead resolver only (Docker writes no search line for --dns-search .)
        rc = f'{d}/resolv.conf'

        def resolver(text, env=None):
            with open(rc, 'wb') as f:
                f.write(text.encode())
            return resolver_check(rc, env or {})
        rec, iss = resolver('# Generated by Docker Engine.\n\nnameserver 127.0.0.1\n\n# Overrides: [nameservers search]\n')
        assert iss == [] and rec['resolvConf']['sha256'] == sha_file(rc) and rec['env'] == {k: None for k in RESOLVER_ENV} and base64.b64decode(rec['resolvConf']['base64']).startswith(b'# Generated')
        for text in ('nameserver 127.0.0.1\nsearch ' + 'a' * 250 + '.example\n', 'nameserver 127.0.0.1\ndomain example.com\n', 'nameserver 127.0.0.1\nsearch .\n',
                     'nameserver 192.168.65.7\n', 'nameserver 127.0.0.1\nnameserver 127.0.0.1\n', '# no nameserver\n'):
            assert len(resolver(text)[1]) == 1 and resolver(text)[1][0].startswith('S7: '), text
        assert resolver('nameserver 127.0.0.1\n', {'LOCALDOMAIN': 'x', 'RES_OPTIONS': 'ndots:1'})[1] == ['S7: resolver environment variable LOCALDOMAIN is set', 'S7: resolver environment variable RES_OPTIONS is set']
        assert resolver_check(f'{d}/absent.conf', {})[1][0].startswith('S7: ')
        # B4/I8: structural skips need a pinned reason AND a file absent from the hash-pinned sdist
        root, members = '/run/sdist-tests', {'test/fixtures/test_tsa/request.der', 'test/fixtures/test_tsa/ts_chain.pem', 'test/fixtures/sigstage/ts_chain.pem'}
        results = {'t::ok': {'outcome': 'passed'}, 't::sig': {'outcome': 'skipped', 'reason': f'Response file not found for {root}/test/fixtures/sigstage'},
                   't::algo': {'outcome': 'skipped', 'reason': f'Response file not found: {root}/test/fixtures/test_tsa/response-sha256.tsr'}}
        st, c, nonpass = classify_tests(results, root, members)
        assert [s['absentPath'] for s in st] == ['test/fixtures/sigstage/response.tsr', 'test/fixtures/test_tsa/response-sha256.tsr'] and c == {'total': 1, 'passed': 1, 'failed': 0, 'skipped': 0} and counts_clean(c)
        st, c, nonpass = classify_tests({**results, 't::req': {'outcome': 'skipped', 'reason': f'Request file not found for {root}/test/fixtures/test_tsa'}}, root, members)
        assert len(st) == 2 and c['skipped'] == 1 and not counts_clean(c) and nonpass[0]['note'].startswith('structural reason, but')  # names a file that IS in the sdist
        for outcome_, reason in (('skipped', 'needs network'), ('xfailed', 'reason: known'), ('xpassed', None), ('error', None), ('failed', None)):
            st, c, _ = classify_tests({'t::ok': {'outcome': 'passed'}, 't::x': {'outcome': outcome_, 'reason': reason}}, root, members)
            assert not st and c['total'] == 2 and not counts_clean(c), outcome_
        assert not counts_clean(classify_tests({'t::sig': results['t::sig']}, root, members)[1])  # zero non-structural tests
        for reason in (f'Response file not found: {root}/test/../../etc/passwd', 'Response file not found: /tmp/x.tsr', f'Certificates not found for {root}/test/fixtures/a b',
                       f'Response file not found for {root}//test/fixtures/sigstage', f'Skipped: Response file not found for {root}/test/fixtures/sigstage'):
            assert skip_target(reason, root) is None, reason
        rr = Recorder()
        for r in (NS(nodeid='t::a', when='setup', failed=False, skipped=False), NS(nodeid='t::a', when='call', failed=False, skipped=False),
                  NS(nodeid='t::s', when='setup', failed=False, skipped=True, longrepr=('f.py', 67, 'Skipped: Response file not found for /x')),
                  NS(nodeid='t::s', when='teardown', failed=False, skipped=False), NS(nodeid='t::xf', when='call', failed=False, skipped=True, wasxfail='reason: known', longrepr=None),
                  NS(nodeid='t::xp', when='setup', failed=False, skipped=False), NS(nodeid='t::xp', when='call', failed=False, skipped=False, wasxfail=''),
                  NS(nodeid='t::e', when='setup', failed=True, skipped=False),
                  NS(nodeid='t::f', when='setup', failed=False, skipped=False), NS(nodeid='t::f', when='call', failed=True, skipped=False)):
            rr.pytest_runtest_logreport(r)
        rr.pytest_collectreport(NS(nodeid='t.py', failed=True))
        assert {k: v['outcome'] for k, v in rr.results.items()} == {'t::a': 'passed', 't::s': 'skipped', 't::xf': 'xfailed', 't::xp': 'xpassed', 't::e': 'error', 't::f': 'failed', 'collect::t.py': 'error'}
        assert rr.results['t::s']['reason'] == 'Response file not found for /x'
        # I9: exactly the listed debs, each equal to its pin
        dd = f'{d}/debs'
        os.makedirs(dd)
        listed = []
        for n in ('a_1_amd64.deb', 'b_2%3a1_amd64.deb'):
            with open(f'{dd}/{n}', 'wb') as f:
                f.write(n.encode())
            listed.append({'filename': n, 'size': len(n), 'sha256': sha_bytes(n.encode())})
        assert [os.path.basename(p) for p in deb_paths(listed, dd)] == ['a_1_amd64.deb', 'b_2%3a1_amd64.deb']
        with open(f'{dd}/c_3_amd64.deb', 'wb') as f:
            f.write(b'x')
        assert denied(lambda: deb_paths(listed, dd), "extra=['c_3_amd64.deb']").startswith('S5: ')
        os.remove(f'{dd}/c_3_amd64.deb')
        denied(lambda: deb_paths([listed[0]], dd), "extra=['b_2%3a1_amd64.deb']")
        denied(lambda: deb_paths(listed + [{'filename': 'z_9_amd64.deb', 'size': 1, 'sha256': '0' * 64}], dd), "missing=['z_9_amd64.deb']")
        denied(lambda: deb_paths([listed[0], {**listed[1], 'sha256': '0' * 64}], dd), 'differs from its pinned size/sha256')
        denied(lambda: deb_paths(listed + [listed[0]], dd), 'duplicates=1')
    # B3: all-target fetch, exact registry set from the lock checksums (git/path packages carry none)
    lockt = ('version = 4\n\n[[package]]\nname = "a"\nversion = "1.0.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "' + 'a' * 64 + '"\n\n'
             '[[package]]\nname = "g"\nversion = "0.1.0"\nsource = "git+https://example/g.git?tag=1#' + 'f' * 40 + '"\n\n[[package]]\nname = "p"\nversion = "0.0.1"\n')
    assert lock_checksums(lockt) == {'a-1.0.0.crate': 'a' * 64} and '--target' not in CARGO_FETCH and CARGO_FETCH == ('cargo', 'fetch', '--locked')
    # I9 re-pin and I6 X4 pin in the committed data
    tools = parse_lock(read(f'{q}/requirements-tools.txt'))
    assert list(tools) == ['iniconfig', 'packaging', 'pluggy', 'pretend', 'pytest'] and all(len(p['hashes']) == 1 for p in tools.values())
    assert tools['pytest']['version'] == '9.0.3' and tools['pytest']['hashes'] == ['2c5efc453d45394fdd706ade797c0a81091eccd1d6e4bccfcd476e2b8e0ab5d9']
    ch = load(f'{q}/cases.json')['challenges']
    assert ch['X4']['stderr'] == ['D09-STOP S6', 'securityEvidence stale'] and ch['X4']['failedStep'] == 'check-admission'
    assert all(re.fullmatch(r'(verification-recipe|verified-promise)\.mjs:\d+', v) for v in ch['lines'].values())


COMMANDS = {
    'exec-module': cmd_exec_module, 'seed-pyexpat': cmd_seed_pyexpat, 'fetch': cmd_fetch, 'install': cmd_install, 'compare': cmd_compare,
    'closure': cmd_closure, 'probe-runtime': cmd_probe_runtime, 'linkage': cmd_linkage, 'linkage-inner': cmd_linkage_inner, 'case': cmd_case,
    'tuf': cmd_tuf, 'tsa-direct': cmd_tsa_direct, 'tsa-inner': cmd_tsa_inner, 'rfc3161-tests': cmd_rfc3161_tests, 'pytest-inner': cmd_pytest_inner,
    'admission-negatives': cmd_admission_negatives, 'guard-selftest': cmd_guard_selftest, 'capture': cmd_capture, 'build-env': cmd_build_env,
    'cargo-fetch': cmd_cargo_fetch, 'build': cmd_build, 'elf-audit': cmd_elf_audit, 'build-negatives': cmd_build_negatives, 'outcomes': cmd_outcomes,
    'wheel-audit': cmd_wheel_audit, 'selftest': lambda argv: selftest(),
}


# Capsule/build writes keep the default umask; scratch writes under /out and /run must stay
# deletable by the host user (a different uid on Linux runners), so they use umask 0.
KEEP_UMASK = ('install', 'exec-module', 'build-env', 'build', 'cargo-fetch', 'capture', 'elf-audit', 'build-negatives', 'selftest')


def main(argv):
    if not argv or argv[0] not in COMMANDS:
        print(f'usage: python -I -B d09.py ({"|".join(COMMANDS)}) ...', file=sys.stderr)
        return 2
    if argv[0] not in KEEP_UMASK:
        os.umask(0)
    try:
        return COMMANDS[argv[0]](argv[1:])
    except Stop as e:
        print(f'{STOP} {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
