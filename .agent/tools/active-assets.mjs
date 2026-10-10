import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const registry = JSON.parse(fs.readFileSync(new URL('../context/retired-assets.json', import.meta.url), 'utf8'));
if (registry.schema !== 'retired_assets_v1' || !Array.isArray(registry.paths)
  || registry.paths.some(p => typeof p !== 'string' || !p || p.includes('\\') || p.startsWith('/') || p.split('/').includes('..'))
  || new Set(registry.paths).size !== registry.paths.length) throw new Error('Invalid exact retirement registry');
export const retiredPaths = Object.freeze(registry.paths);
const retired = new Set(retiredPaths);
export const canonicalLocator = value => String(value).replaceAll('\\', '/').replace(/^\.\//, '');
export const isActiveAsset = value => !retired.has(canonicalLocator(value));
export const selectActiveAssets = files => files.filter(isActiveAsset);
const exampleGeneratedDirs=new Set(['node_modules','.venv','venv','__pycache__','.next','.pytest_cache','.mypy_cache','.ruff_cache','.turbo','.cache','.tox','.nox','dist','build','coverage','.scratch','.debug','.git']);
const exampleGeneratedReports=new Set(['.vitest-results.json','.pytest-results.xml','.test-outcome.json','.pip-audit.json','.coverage','coverage.xml','coverage.json']);
export function isDistributionAsset(value) {
  const relative=canonicalLocator(value);
  if(!isActiveAsset(relative))return false;
  if(!relative.startsWith('.agent/standards/examples/'))return true;
  const parts=relative.slice('.agent/standards/examples/'.length).split('/'),name=parts.at(-1);
  return !parts.some(part=>exampleGeneratedDirs.has(part))&&!exampleGeneratedReports.has(name)&&!name.startsWith('.coverage.')&&!/\.tsbuildinfo$/.test(name);
}
export function activeCopyFilter(root) {
  return source => isDistributionAsset(path.relative(root, source));
}

export function missingLocalModules(file, text, fileSet) {
  if (!/\.(?:mjs|cjs|js)$/.test(file) || /(?:^|\/)(?:test-[^/]+|[^/]+\.test)\.(?:mjs|cjs|js)$/.test(file)) return [];
  // ponytail: static literal imports only; the bundle smoke test covers executable entry points.
  const imports = /^\s*(?:(?:import|export)\s+(?:[^;'"`]*?\bfrom\s*)?|(?:(?:const|let|var)\s+[^;=]+?=\s*(?:await\s+)?|(?:await\s+)?)(?:import|require)\s*\()\s*['"](\.[^'"\n]+)['"]/gm;
  return [...text.matchAll(imports)].flatMap(match => {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));
    return [resolved,`${resolved}.js`,`${resolved}.json`,`${resolved}/index.js`].some(p=>fileSet.has(p)) ? [] : [resolved];
  });
}

export function assertLocalModuleClosure(assets) {
  const fileSet = new Set(assets.keys());
  for (const [file, value] of assets) {
    for (const missing of missingLocalModules(file, (value.bytes ?? value).toString('utf8'),fileSet)) {
      throw new Error(`Missing local runtime dependency: ${file} -> ${missing}`);
    }
  }
}

export function copyActiveDistribution(root, destination) {
  const sourceRoot=path.resolve(root),target=path.resolve(destination);
  if(fs.existsSync(target)||target===sourceRoot||target.startsWith(sourceRoot+path.sep))throw new Error('distribution requires a new destination outside source');
  const names=['.agent','.codex','.claude','AGENTS.md','CLAUDE.md','SETUP.md','SUPER-COMPOUND.md','README.md','OFFLINE-SETUP.md','WALKTHROUGH.md','CHANGELOG.md'];
  const runtime = new Map();
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const full=path.join(directory,entry.name),relative=canonicalLocator(path.relative(sourceRoot,full));
      if(!isDistributionAsset(relative)||['__pycache__','.compact-state'].includes(entry.name))continue;
      if(fs.lstatSync(full).isSymbolicLink())throw new Error('distribution rejects symlinks');
      if(entry.isDirectory())inspect(full);
      else if(entry.isFile())runtime.set(relative,fs.readFileSync(full));
    }
  }
  if(fs.existsSync(path.join(sourceRoot,'.agent')))inspect(path.join(sourceRoot,'.agent'));
  assertLocalModuleClosure(runtime);
  for(const name of names) {
    const source=path.join(sourceRoot,name==='README.md'&&fs.existsSync(path.join(sourceRoot,'OFFLINE-SETUP.md'))?'OFFLINE-SETUP.md':name);
    if(!fs.existsSync(source))continue;
    fs.cpSync(source,path.join(target,name),{recursive:true,force:false,errorOnExist:true,filter:file=>{
      const relative=canonicalLocator(path.relative(sourceRoot,file));
      if(!isDistributionAsset(relative))return false;
      if(fs.lstatSync(file).isSymbolicLink())throw new Error('distribution rejects symlinks');
      return !relative.split('/').some(p=>['__pycache__','.compact-state'].includes(p))&&!/\.(?:pyc|pyo)$/.test(relative);
    }});
  }
  return {destination:target,selection:'exact_retirement_registry'};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if(process.argv[2]==='retired')process.stdout.write(JSON.stringify(retiredPaths));
  else if(process.argv[2]==='copy'&&process.argv[3])process.stdout.write(JSON.stringify(copyActiveDistribution(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),process.argv[3])));
  else throw new Error('usage: active-assets.mjs retired | copy <new-target>');
}
