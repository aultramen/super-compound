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
export function activeCopyFilter(root) {
  return source => isActiveAsset(path.relative(root, source));
}

export function copyActiveDistribution(root, destination) {
  const sourceRoot=path.resolve(root),target=path.resolve(destination);
  if(fs.existsSync(target)||target===sourceRoot||target.startsWith(sourceRoot+path.sep))throw new Error('distribution requires a new destination outside source');
  const names=['.agent','.codex','.claude','AGENTS.md','CLAUDE.md','SETUP.md','SUPER-COMPOUND.md','README.md','WALKTHROUGH.md','CHANGELOG.md'];
  for(const name of names) {
    const source=path.join(sourceRoot,name);
    if(!fs.existsSync(source))continue;
    fs.cpSync(source,path.join(target,name),{recursive:true,force:false,errorOnExist:true,filter:file=>{
      if(fs.lstatSync(file).isSymbolicLink())throw new Error('distribution rejects symlinks');
      const relative=canonicalLocator(path.relative(sourceRoot,file));
      return isActiveAsset(relative)&&!relative.split('/').some(p=>['__pycache__','.compact-state'].includes(p))&&!/\.(?:pyc|pyo)$/.test(relative);
    }});
  }
  return {destination:target,selection:'exact_retirement_registry'};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if(process.argv[2]==='retired')process.stdout.write(JSON.stringify(retiredPaths));
  else if(process.argv[2]==='copy'&&process.argv[3])process.stdout.write(JSON.stringify(copyActiveDistribution(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),process.argv[3])));
  else throw new Error('usage: active-assets.mjs retired | copy <new-target>');
}
