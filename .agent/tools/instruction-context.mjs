import {createHash} from 'node:crypto';

export const contextDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateConstraints(value = []) {
  if (!Array.isArray(value) || value.length > 40) throw new Error('constraints must contain at most 40 instructions');
  const ids = new Set();
  for (const item of value) {
    if (!item || Object.keys(item).some(k => !['id','instruction','source','scope','supersedes'].includes(k))) throw new Error('invalid constraint field');
    for (const key of ['id','instruction','source']) if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > (key === 'instruction' ? 2000 : 300) || /[\r\n\0]/.test(item[key])) throw new Error(`invalid constraint ${key}`);
    if (!/^[A-Za-z0-9_-]+$/.test(item.id) || ids.has(item.id)) throw new Error('duplicate/invalid constraint id');
    ids.add(item.id);
    for (const key of ['scope','supersedes']) if (!Array.isArray(item[key]) || item[key].length > 40 || item[key].some(s => typeof s !== 'string' || !s.trim() || s.length > 300 || /[\r\n\0]/.test(s)) || new Set(item[key]).size !== item[key].length) throw new Error(`invalid constraint ${key}`);
    if (!item.scope.length) throw new Error('constraint scope required; use * for all goals');
  }
  const byId = new Map(value.map(item => [item.id,item]));
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error('constraint supersession cycle');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prior of byId.get(id).supersedes) {
      if (!byId.has(prior)) throw new Error('constraint supersedes unknown instruction');
      visit(prior);
    }
    visiting.delete(id); visited.add(id);
  }
  value.forEach(item => visit(item.id));
  return structuredClone(value);
}
export function relevantConstraints(value, goalId) {
  const constraints = validateConstraints(value);
  const relevant = constraints.filter(c => c.scope.includes('*') || c.scope.includes(goalId));
  const superseded = new Set(relevant.flatMap(c => c.supersedes));
  return relevant.filter(c => !superseded.has(c.id));
}
export function constraintBlock(value, goalId) {
  const active = relevantConstraints(value,goalId);
  if (!active.length) return '';
  return `\n\n<!-- sc-constraints:start -->\nActive instructions (mandatory):\n${active.map(c => `- ${c.id}: ${c.instruction} [source: ${c.source}; scope: ${c.scope.join(', ')}]`).join('\n')}\n<!-- sc-constraints:end -->`;
}
