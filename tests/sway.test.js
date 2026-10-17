// Sway-frame (top fixed by floor framing, no X/knee bracing) mode — node tests/sway.test.js
const assert = require('assert');
const { lib, fishFace, soft } = require('./fishface_lib');
const base = Object.assign({}, fishFace, { Wh: 5.6, qzPile: 39.2, debrisOn: false, impactCD: 1.6 });
const per = { D: 5.9, L: 0, Lr: 0, Wv: -4.17, Wot: 8.3 };
const S = m => lib.solveEmbedment(Object.assign({}, base, m));
let pass = 0, fail = 0;
function t(n, f) { try { f(); pass++; console.log('ok   ', n); } catch (e) { fail++; console.log('FAIL ', n, '\n     ', e.message); } }
t('fixed-guided top moment = H·Lc/2 for a top load; α scales it; α = 0 equals free', () => {
  const i = Object.assign({}, base, { topCond: 'sway', topFix: 1, qzPile: 0, zone: 'none', Ltip: 30 });
  const r = lib.pileDesign(i), row = r.rows.find(x => x.id === '5'), Lc = 11.3 + r.dfix;
  assert.ok(Math.abs(row.Mtop - 0.6 * 5.6 * Lc / 2) < 1e-6);
  const r5 = lib.pileDesign(Object.assign({}, i, { topFix: 0.5 })).rows.find(x => x.id === '5');
  assert.ok(Math.abs(r5.Mtop - row.Mtop / 2) < 1e-6);
  const r0 = lib.pileDesign(Object.assign({}, i, { topFix: 0 })).rows.find(x => x.id === '5'), rf = lib.pileDesign(Object.assign({}, i, { topCond: 'free' })).rows.find(x => x.id === '5');
  assert.ok(Math.abs(r0.drift - rf.drift) < 1e-9 && Math.abs(r0.Mmax - rf.Mmax) < 0.2);
});
t('Ke interpolates 2.1 (free) → 1.2 (fixed-top sway)', () => {
  const k = a => lib.pileDesign(Object.assign({}, base, { topCond: 'sway', topFix: a, Ltip: 30 })).rows[0].st.Kef;
  assert.strictEqual(k(1), 1.2); assert.ok(Math.abs(k(0.5) - 1.65) < 1e-9); assert.strictEqual(k(0), 2.1);
});
t('(2) 3/4" bolts @ 6 in deliver ≈0.97 k-ft — Fish Face 14x14 needs ≈43 k-ft at full fixity → fixity cannot be counted', () => {
  const s = S({ topCond: 'sway', topFix: 1 });
  assert.ok(Math.abs(s.res.conn.Mcap - 0.965) < 0.01); assert.ok(!s.ok); assert.ok(s.checks.rConn.ratio > 40);
  const iS = Object.assign({}, base, { topCond: 'sway', topFix: 1 });
  assert.ok(/CANNOT DEVELOP THE FIXITY MOMENT/.test(lib.renderEmbedPanel(iS, lib.runEmbedment(iS))));
});
t('full fixity with a designed moment connection: 14x14 interior 28.5 ft, bending ≈0.48, drift OK', () => {
  const s = S({ topCond: 'sway', topFix: 1, connMcap: 999 });
  assert.ok(s.ok); assert.strictEqual(s.tip, 28.5); assert.ok(s.checks.rStruct.ratio < 0.6); assert.ok(s.checks.rDrift.ratio < 1);
});
t('debris-struck 14x14 fails drift even fully fixed; 16x16 passes', () => {
  assert.ok(!S(Object.assign({ topCond: 'sway', topFix: 1, connMcap: 999, debrisOn: true }, per)).ok);
  assert.ok(S(Object.assign({ topCond: 'sway', topFix: 1, connMcap: 999, debrisOn: true, d: 16 }, per)).ok);
});
t('partial fixity 0.5: 14x14 fails drift; 20x20 passes all Fish Face piles (base + soft)', () => {
  assert.ok(S({ topCond: 'sway', topFix: 0.5, connMcap: 999 }).checks.rDrift.ratio > 1);
  [{}, per, Object.assign({ debrisOn: true }, per)].forEach(m => [{}, soft].forEach(p =>
    assert.ok(S(Object.assign({ topCond: 'sway', topFix: 0.5, connMcap: 999, d: 20 }, m, p)).ok, JSON.stringify(m)))); 
  assert.ok(!S(Object.assign({ topCond: 'sway', topFix: 0.5, connMcap: 999, d: 18, debrisOn: true }, per)).ok);
});
t('free top: 14x14 fails bending and drift; drift reported in calc sheet columns', () => {
  const s = S({ topCond: 'free' }); assert.ok(!s.ok && s.checks.rStruct.ratio > 1 && s.checks.rDrift.ratio > 1);
  const p = lib.runEmbedment(Object.assign({}, base, { topCond: 'sway' }));
  assert.ok(/Drift \(in\)/.test(lib.renderCalcSheet(base, p.res, p)) && /Sway-frame top fixity/.test(lib.renderCalcSheet(base, p.res, p)));
});
t('braced-to-grade mode unchanged (28.5 ft, no drift / connection checks)', () => {
  const s = S({}); assert.strictEqual(s.tip, 28.5); assert.strictEqual(s.checks.rDrift.ratio, 0); assert.strictEqual(s.checks.rConn.ratio, 0);
});
t('biaxial: Y wind share runs Y alone + ASCE 7 Case 3 (0.75X + 0.75Y), raises the wind-combo ratio, Fish Face X governs', () => {
  const i = Object.assign({}, base, { topCond: 'sway', topFix: 1, connMcap: 999, d: 16, Ltip: 25.5 });
  const u = lib.pileDesign(i), b = lib.pileDesign(Object.assign({}, i, { WhY: 2.58 }));
  const w = b.rows.filter(r => r.biax); assert.ok(w.length > 0);
  w.forEach(r => { assert.ok(r.biax.r3 >= r.st.ratioUni * 0.99); assert.ok(r.st.ratio >= r.biax.r3 - 1e-9); });
  assert.ok(b.gov.rStruct.ratio >= u.gov.rStruct.ratio && b.gov.rStruct.ratio < 1, 'biaxial raises but passes');
  assert.ok(/Case 3/.test(lib.renderCalcSheet(Object.assign({}, i, { WhY: 2.58 }), b)));
});
t('no-brace primary design: 16x16 with full-fixity moment connection passes every Fish Face pile biaxially; 14x14 does not', () => {
  const per2 = Object.assign({}, per, { WhY: 1.29 });
  [Object.assign({ WhY: 2.58 }), per2, Object.assign({ debrisOn: true }, per2)].forEach(m => [{}, soft].forEach(p =>
    assert.ok(S(Object.assign({ topCond: 'sway', topFix: 1, connMcap: 999, d: 16 }, m, p)).ok, JSON.stringify(m))));
  assert.ok(!S(Object.assign({ topCond: 'sway', topFix: 1, connMcap: 999, d: 14, debrisOn: true }, per2)).ok);
});
t('calculator default top condition is the sway frame (bracing is opt-in)', () => {
  assert.ok(/<option value="sway" selected>/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8')));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
