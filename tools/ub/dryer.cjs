// dryer (npm run ub:dry): finds duplicated blocks (>= N normalized lines) across files. Usage: node dryer.cjs <repo> [minLines]
const fs = require('fs'), path = require('path');
const repo = '.', N = Number(process.argv[2] ?? 8);
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p); } return out; }
const files = walk(path.join(repo, 'src')).map((f) => {
  const lines = fs.readFileSync(f, 'utf8').split('\n').map((l, i) => ({ t: l.trim().replace(/\s+/g, ' '), n: i + 1 })).filter((l) => l.t.length > 3 && !/^(import |export \{|\}|\)|\]|\/\/|\*|\/\*)/.test(l.t));
  return { f: path.relative(repo, f), lines };
});
const map = new Map();
for (const file of files) for (let i = 0; i + N <= file.lines.length; i++) {
  const key = file.lines.slice(i, i + N).map((l) => l.t).join('\n');
  (map.get(key) ?? map.set(key, []).get(key)).push({ f: file.f, a: file.lines[i].n, b: file.lines[i + N - 1].n });
}
const seen = new Set(), out = [];
for (const occ of map.values()) {
  if (occ.length < 2) continue;
  const id = occ.map((o) => `${o.f}:${o.a}`).join('|');
  if ([...seen].some((s) => occ.every((o) => s.includes(`${o.f}:`) && Math.abs(0) === 0) && occ.some((o) => s.includes(`${o.f}:${o.a - 1}`)))) continue;
  seen.add(id); out.push(occ);
}
console.log(`duplicate blocks (>=${N} lines): ${out.length}`);
for (const occ of out.slice(0, 40)) console.log('- ' + occ.map((o) => `${o.f}:${o.a}-${o.b}`).join('  <->  '));
