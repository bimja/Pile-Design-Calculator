// UI label checks (no browser): node tests/ui_labels.test.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { lib, fishFace } = require('./fishface_lib');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('ok   ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n     ', e.message); } }
const notes = html.match(/<strong>Notes &amp; Limitations:<\/strong>[\s\S]*?<\/div>/)[0];
t('notes no longer claim FS 2.0 lateral; state the 2.5 default', () => {
  assert.ok(!/FS = 2\.0 on lateral/.test(notes)); assert.ok(/FS lateral default 2\.5/.test(notes));
  assert.ok(/id="FSlat" value="2\.5"/.test(html));
});
t('notes mention installation method and TPC Broms (not sand-only)', () => {
  assert.ok(/Installation method/.test(notes)); assert.ok(!/free-head pile in cohesionless sand\)\./.test(notes));
});
t('version label shown in UI and on calc sheet', () => {
  const v = html.match(/const TOOL_VERSION = '([^']+)'/); assert.ok(v);
  assert.ok(html.includes('id="toolVersion"'));
  const inp = Object.assign({}, fishFace, { instMethod: 'augerConcrete', instHoleD: 24 });
  const res = lib.pileDesign(inp), sheet = lib.renderCalcSheet(inp, res, null);
  assert.ok(sheet.includes('Tool version:</strong> ' + v[1]));
  assert.ok(/Installation method<\/td><td[^>]*><strong>Augered 24" hole/.test(sheet));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
