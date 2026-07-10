const fs = require('fs');
const path = require('path');

const START_MARKER = '<!-- sc:last-compaction:start -->';
const END_MARKER = '<!-- sc:last-compaction:end -->';

function resolveHookProjectRoot(startDir = process.env.SUPER_COMPOUND_PROJECT_ROOT || process.cwd()) {
    const root = path.resolve(startDir);
    const hooksDir = path.join(root, '.agent', 'hooks');
    if (!fs.existsSync(hooksDir) || !fs.statSync(hooksDir).isDirectory()) {
        throw new Error(`Not a Super Compound project root: ${root}`);
    }
    return fs.realpathSync(root);
}

function isInside(parent, child) {
    const relative = path.relative(parent, child);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertNoSymlink(root, target) {
    let current = path.resolve(root);
    const resolvedTarget = path.resolve(target);
    const relative = path.relative(current, resolvedTarget);
    if (relative === '') return;

    for (const part of relative.split(path.sep)) {
        current = path.join(current, part);
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
            throw new Error(`Refusing to use symlinked hook target: ${current}`);
        }
    }
}

function safeProjectFile(projectRoot, parts) {
    const root = fs.realpathSync(path.resolve(projectRoot));
    const target = path.resolve(root, ...parts);
    if (!isInside(root, target)) {
        throw new Error(`Refusing to access path outside project root: ${target}`);
    }
    assertNoSymlink(root, target);
    return target;
}

function atomicWriteFile(target, content) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const temp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(temp, content, 'utf8');
    fs.renameSync(temp, target);
}

function buildCompactionMarker(timestamp) {
    return `${START_MARKER}
## Last Compaction

**When:** ${timestamp}
**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.
**After compaction:** Run /sc-init reload, then /sc-status to restore context.
${END_MARKER}
`;
}

function replaceCompactionMarker(content, marker) {
    const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}\\n?`);
    if (pattern.test(content)) {
        return content.replace(pattern, marker);
    }
    const separator = content.trim() ? '\n\n---\n' : '';
    return `${content}${separator}${marker}`;
}

function redactSensitiveText(text) {
    return String(text).replace(
        /\b(api[_-]?key|secret|token|password|passwd|credential|private[_-]?key)\b(\s*[:=]\s*)(["']?)[^\s"',}]+/gi,
        (_match, key, separator, quote) => `${key}${separator}${quote}[REDACTED]`
    );
}

function readPositiveInteger(name, fallback) {
    const value = Number.parseInt(process.env[name] || '', 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readStdinJson(maxBytes = 1024 * 1024) {
    const chunks = [];
    let total = 0;

    while (true) {
        const buffer = Buffer.alloc(64 * 1024);
        const bytesRead = fs.readSync(0, buffer, 0, buffer.length, null);
        if (bytesRead === 0) break;
        total += bytesRead;
        if (total > maxBytes) {
            throw new Error(`Hook input exceeds ${maxBytes} bytes`);
        }
        chunks.push(buffer.subarray(0, bytesRead));
    }

    const input = Buffer.concat(chunks).toString('utf8').trim();
    return input ? JSON.parse(input) : {};
}

module.exports = {
    END_MARKER,
    START_MARKER,
    atomicWriteFile,
    buildCompactionMarker,
    readPositiveInteger,
    readStdinJson,
    redactSensitiveText,
    replaceCompactionMarker,
    resolveHookProjectRoot,
    safeProjectFile,
};
