// crapper (npm run ub:crap): CRAP score per function = cc^2 * (1 - cov)^3 + cc. Usage: node crapper.cjs <repo> [threshold]
const ts = require('typescript');
const fs = require('fs'), path = require('path');
const repo = '.', threshold = Number(process.argv[2] ?? 10);
const lcovPath = path.join(repo, 'coverage', 'lcov.info');
const lcov = fs.existsSync(lcovPath) ? fs.readFileSync(lcovPath, 'utf8') : '';
const cov = {};
for (const rec of lcov.split('end_of_record')) {
  const sf = /^SF:(.*)$/m.exec(rec); if (!sf) continue;
  const lines = {};
  for (const m of rec.matchAll(/^DA:(\d+),(\d+)/gm)) lines[+m[1]] = +m[2] > 0;
  cov[path.resolve(repo, sf[1])] = lines;
}
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const rows = [];
for (const file of walk(path.join(repo, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const isFn = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n);
  function complexity(fn) {
    let cc = 1;
    (function visit(n) {
      if (n !== fn && isFn(n)) return; // nested functions are scored on their own
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement: case ts.SyntaxKind.ForStatement: case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement: case ts.SyntaxKind.WhileStatement: case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CatchClause: case ts.SyntaxKind.ConditionalExpression: case ts.SyntaxKind.CaseClause: cc++; break;
        case ts.SyntaxKind.BinaryExpression: {
          const k = n.operatorToken.kind;
          if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) cc++;
        }
      }
      ts.forEachChild(n, visit);
    })(fn);
    return cc;
  }
  const fileCov = cov[path.resolve(file)];
  (function visit(n) {
    if (isFn(n) && n.body) {
      const cc = complexity(n);
      const a = lineOf(n.getStart()), b = lineOf(n.end);
      let exec = 0, hit = 0;
      if (fileCov) for (let l = a; l <= b; l++) if (l in fileCov) { exec++; if (fileCov[l]) hit++; }
      const c = fileCov ? (exec ? hit / exec : 1) : 0;
      const name = n.name?.getText() ?? (ts.isVariableDeclaration(n.parent) ? n.parent.name.getText() : (ts.isPropertyAssignment(n.parent) ? n.parent.name.getText() : '<anon>'));
      rows.push({ file: path.relative(repo, file), name, line: a, cc, cov: c, crap: cc * cc * (1 - c) ** 3 + cc });
    }
    ts.forEachChild(n, visit);
  })(sf);
}
rows.sort((x, y) => y.crap - x.crap);
const bad = rows.filter((r) => r.crap >= threshold);
if (process.argv[3] === '--json') console.log(JSON.stringify(bad));
else {
  console.log(`functions: ${rows.length}, CRAP >= ${threshold}: ${bad.length}`);
  for (const r of bad.slice(0, Number(process.argv[3] ?? 40))) console.log(`${r.crap.toFixed(1).padStart(7)} cc=${String(r.cc).padStart(2)} cov=${(r.cov * 100).toFixed(0).padStart(3)}%  ${r.file}:${r.line} ${r.name}`);
  const byFile = {};
  for (const r of bad) byFile[r.file] = (byFile[r.file] ?? 0) + 1;
  console.log('\nfiles with offenders:', Object.keys(byFile).length);
}
