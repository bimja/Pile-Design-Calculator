// Unit tests for the auto-embedment solver: node tests/solver.test.js  (exit code 1 on any failure)
const assert = require('assert');
const { lib, fishFace, perimeter, soft, stiff } = require('./fishface_lib');
const S = mod => lib.solveEmbedment(Object.assign({}, fishFace, mod));
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('ok   ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n     ', e.message); } }

t('solved depth passes every check and depth − step fails at least one', () => {
  const s = S({});
  assert.ok(s.ok);
  Object.values(s.checks).forEach(c => assert.ok(c.ratio <= 1, JSON.stringify(c)));
  const prev = lib.checkRatios(lib.pileDesign(Object.assign({}, fishFace, { Ltip: s.tip - s.step })));
  assert.ok(Object.values(prev).some(c => c.ratio > 1));
});
t('Fish Face 14x14 square, base profile: 28.5 ft below LAG, ~39.8 ft total, compression controls, PASS', () => {
  const s = S({});
  assert.strictEqual(s.tip, 28.5);
  assert.ok(Math.abs(s.total - 39.8) < 0.05);
  assert.deepStrictEqual(s.controls, ['rComp']);
  assert.strictEqual(lib.lengthStatus(s, fishFace).cls, 'ok');
});
t('Fish Face 14x14 square, soft profile (250 + 10): 34 ft, 45.3 ft total → amber PASS over 40 ft target', () => {
  const s = S(soft);
  assert.strictEqual(s.tip, 34);
  const st = lib.lengthStatus(s, Object.assign({}, fishFace, soft));
  assert.strictEqual(st.cls, 'amber'); assert.ok(st.over); assert.ok(/PASS — exceeds 40 ft target/.test(st.text));
});
t('hard length limit turns the over-length pass into FAIL', () => {
  const i = Object.assign({}, fishFace, soft, { lenMode: 'hard' });
  assert.strictEqual(lib.lengthStatus(lib.solveEmbedment(i), i).cls, 'fail');
});
t('stiff (1,500 psf) profile needs much less embedment than base', () => {
  const s = S(stiff); assert.ok(s.ok && s.tip < 20, String(s.tip));
});
t('perimeter pile (uplift case) solves shallower than interior', () => {
  const s = S(perimeter); assert.ok(s.ok && s.tip < S({}).tip, String(s.tip));
});
t('tapered 14" round (8.5" tip) needs more embedment than the 14x14 square (memo ≈ 42 / 48 ft)', () => {
  const r = S({ shape: 'round', dTip: 8.5 }), rs = S(Object.assign({ shape: 'round', dTip: 8.5 }, soft));
  assert.ok(r.ok && r.tip >= 39 && r.tip <= 45, 'base ' + r.tip);
  assert.ok(rs.ok && rs.tip >= 45 && rs.tip <= 51, 'soft ' + rs.tip);
});
t('larger pile never needs more embedment (monotonic in size)', () => {
  let last = Infinity; [12, 14, 16, 18].forEach(d => { const s = S({ d }); assert.ok(s.ok); assert.ok(s.tip <= last); last = s.tip; });
});
t('impossible case reports FAIL with the governing check', () => {
  const s = S({ D: 200, maxEmbed: 40 });
  assert.ok(!s.ok); assert.strictEqual(lib.lengthStatus(s, fishFace).cls, 'fail'); assert.ok(s.maxCheck);
});
t('slenderness failure stops the scan early (depth cannot fix it)', () => {
  const s = S({ d: 6, h: 30 }); assert.ok(!s.ok); assert.ok(s.controls.includes('slender')); assert.ok(s.iters < 5);
});
t('no loads → minimum embedment controls', () => {
  const s = S({ D: 0, L: 0, Lr: 0, Wv: 0, Wh: 0, zone: 'none' });
  assert.ok(s.ok); assert.strictEqual(s.tip, 5); assert.deepStrictEqual(s.controls, ['minEmbed']);
});
t('alternatives are solver re-runs: next size up shortens soft case; soil suggestion meets target', () => {
  const i = Object.assign({}, fishFace, soft);
  const alts = lib.embedAlternatives(i);
  const up = alts.find(a => a.label === 'Next size up');
  assert.ok(up.sol.ok && up.sol.tip < 34);
  const soil = alts.find(a => a.label === 'Soil assumption needed');
  assert.ok(soil.sol && soil.sol.total <= 40);
  assert.ok(alts.some(a => /Round alternate/.test(a.label)));
});
t('free top offers the braced-top suggestion', () => {
  assert.ok(lib.embedAlternatives(Object.assign({}, fishFace, { topCond: 'free' })).some(a => /Brace/.test(a.label)));
});
t('manual mode checks the entered depth and reports the auto result for reference', () => {
  const p = lib.runEmbedment(Object.assign({}, fishFace, { embedMode: 'manual', Ltip: 20 }));
  assert.strictEqual(p.sol.tip, 20); assert.ok(!p.sol.ok); assert.strictEqual(p.auto.tip, 28.5);
});
t('uniform round pile unaffected by taper code (dTip blank) and panel/calc sheet render', () => {
  const p = lib.runEmbedment(Object.assign({}, fishFace, { shape: 'round' }));
  assert.ok(!p.res.taper);
  const html = lib.renderEmbedPanel(fishFace, p) + lib.renderCalcSheet(fishFace, p.res, p);
  assert.ok(/Embedment Solution/.test(html) && /Total pile length/.test(html));
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
