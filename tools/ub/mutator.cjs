// mutator (npm run ub:mutate -- <src> <test>): operator mutations on one source file, runs its test file, lists survivors. node mutator.cjs <repo> <src> <test>
const ts = require('typescript');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const repo = '.';
const [src, test] = process.argv.slice(2);
const file = path.join(repo, src), original = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true);
const swap = { [ts.SyntaxKind.EqualsEqualsEqualsToken]: '!==', [ts.SyntaxKind.ExclamationEqualsEqualsToken]: '===',
  [ts.SyntaxKind.LessThanToken]: '<=', [ts.SyntaxKind.LessThanEqualsToken]: '<', [ts.SyntaxKind.GreaterThanToken]: '>=',
  [ts.SyntaxKind.GreaterThanEqualsToken]: '>', [ts.SyntaxKind.AmpersandAmpersandToken]: '||', [ts.SyntaxKind.BarBarToken]: '&&',
  [ts.SyntaxKind.PlusToken]: '-', [ts.SyntaxKind.MinusToken]: '+', [ts.SyntaxKind.QuestionQuestionToken]: '&&' };
const muts = [];
(function visit(n) {
  if (ts.isBinaryExpression(n) && swap[n.operatorToken.kind]) muts.push([n.operatorToken.getStart(), n.operatorToken.end, swap[n.operatorToken.kind]]);
  if (n.kind === ts.SyntaxKind.TrueKeyword) muts.push([n.getStart(), n.end, 'false']);
  if (n.kind === ts.SyntaxKind.FalseKeyword) muts.push([n.getStart(), n.end, 'true']);
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) muts.push([n.getStart(), n.operand.getStart(), '']);
  if (ts.isNumericLiteral(n)) muts.push([n.getStart(), n.end, String(Number(n.text) + 1)]);
  ts.forEachChild(n, visit);
})(sf);
const run = () => spawnSync('tsx', ['--test', test], { cwd: repo, timeout: 30000 }).status === 0;
if (!run()) { console.log('baseline tests fail'); process.exit(2); }
let killed = 0; const survivors = [];
try {
  for (const [a, b, rep] of muts) {
    fs.writeFileSync(file, original.slice(0, a) + rep + original.slice(b));
    if (run()) { const line = sf.getLineAndCharacterOfPosition(a).line + 1; survivors.push(`${line}: '${original.slice(a, b)}' -> '${rep}'  | ${original.split('\n')[line - 1].trim().slice(0, 90)}`); } else killed++;
  }
} finally { fs.writeFileSync(file, original); }
console.log(`${src}: mutants=${muts.length} killed=${killed} survived=${survivors.length}`);
survivors.forEach((s) => console.log('  SURVIVED ' + s));
