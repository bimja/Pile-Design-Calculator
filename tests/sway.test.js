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
const N = m => S(Object.assign({ topCond: 'sway', connType: 'notched' }, m));
t('notched + doubled 12x12: M cap ≈ 8.0 k-ft (2 × [3.03 bearing + 0.97 bolts]), k ≈ 600 k-ft/rad, α ≈ 0.35–0.38, 25% notch removal', () => {
  const r = lib.pileDesign(Object.assign({}, base, per, { topCond: 'sway', connType: 'notched', d: 12, Ltip: 20 }));
  assert.ok(Math.abs(r.conn.Mcap - 7.99) < 0.05, r.conn.Mcap); assert.ok(Math.abs(r.conn.kRot - 602) < 5);
  assert.ok(Math.abs(r.conn.removal - 0.25) < 1e-9);
  const row = r.rows.find(x => x.id === '5F-brk'); assert.ok(Math.abs(row.aL - 0.38) < 0.01); assert.ok(row.Mcapped && Math.abs(row.Mtop - r.conn.Mcap) < 1e-6);
});
t('notched seat-only (no top shoulder) falls back to the bolt couple', () => {
  const r = lib.pileDesign(Object.assign({}, base, { topCond: 'sway', connType: 'notched', notchShoulder: 'seat', d: 12, Ltip: 20 }));
  assert.ok(Math.abs(r.conn.Mcap - 2 * 0.965) < 0.01);
});
t('notch deeper than 50% of the section fails the connection check (FEMA P-55)', () => {
  const s = N({ d: 12, notchGeom: '11.25/3/3.5/2', driftN: 1 });
  assert.ok(s.checks.rConn.ratio > 1);
});
t('notched 12x12 perimeter fails Fish Face: bending ≈1.40 and drift ≈3.6 (base + soft)', () => {
  [{}, soft].forEach(p => { const s = N(Object.assign({ d: 12 }, per, p)); assert.ok(!s.ok); assert.ok(s.checks.rStruct.ratio > 1.3 && s.checks.rDrift.ratio > 3); });
});
t('notched: 20x20 is the smallest size passing non-debris piles; 14x14 passes strength if drift is not a criterion', () => {
  assert.ok(!N({ d: 18 }).ok); assert.ok(N({ d: 20 }).ok); assert.ok(N(Object.assign({ d: 20 }, per)).ok);
  assert.ok(N(Object.assign({ d: 14, driftN: 1 }, per)).ok); assert.ok(!N(Object.assign({ d: 14, driftN: 1, debrisOn: true }, per)).ok);
});
t('12x12 perimeter passes only with a full moment connection AND drift relaxed to h/75 (no debris on that pile)', () => {
  const fm = { topCond: 'sway', topFix: 1, connMcap: 999, d: 12 };
  assert.ok(!S(Object.assign({}, fm, per)).ok); assert.ok(S(Object.assign({ driftN: 75 }, fm, per)).ok);
  assert.ok(!S(Object.assign({ driftN: 75, debrisOn: true }, fm, per)).ok);
});
const A = { Wh: 5.10, WhY: 1.96 }, perA = Object.assign({}, per, { WhY: 1.96 });
t('serviceability drift: flood combos excluded, wind-only drift scales with svcF; strength drift kept as driftStr', () => {
  const i = Object.assign({}, base, perA, A, { topCond: 'sway', connType: 'notched', d: 14, Ltip: 20 });
  const rs = lib.pileDesign(Object.assign({}, i, { driftBasis: 'service' }));
  assert.ok(rs.rows.filter(x => /F-/.test(x.id)).every(x => x.rDrift === 0 && x.driftStr > 0));
  const r5 = rs.rows.find(x => x.id === '5'), r5b = lib.pileDesign(Object.assign({}, i, { driftBasis: 'service', svcF: 0.21 })).rows.find(x => x.id === '5');
  assert.ok(r5.drift > 1.8 * r5b.drift && r5.drift < 2.2 * r5b.drift);
});
t('debris shared by the floor diaphragm (N = 18): struck 14x14 bending drops from ≈1.26 to ≈0.88', () => {
  const i = Object.assign({}, base, perA, A, { topCond: 'sway', connType: 'notched', d: 14, debrisOn: true, driftBasis: 'service' });
  assert.ok(!S(i).ok); const s = S(Object.assign({}, i, { debrisShareN: 18 }));
  assert.ok(s.ok, s.maxCheck); assert.ok(Math.abs(s.checks.rStruct.ratio - 0.88) < 0.03);
});
t('recommended 14x14 scheme (rigid-diaphragm wind 5.10 k, notched, service drift h/100, debris shared): every pile passes, ≤ 40 ft except soft-profile interior (axial)', () => {
  const sch = { topCond: 'sway', connType: 'notched', d: 14, driftBasis: 'service', debrisShareN: 18 };
  [[{ WhY: 1.96 }, 39.8, 45.3], [perA, 27.3, 31.3], [Object.assign({}, perA, { Wot: -8.3 }), 27.3, 30.3], [Object.assign({ debrisOn: true }, perA), 28.3, 31.8]].forEach(([m, tb, ts]) => {
    const sb = S(Object.assign({}, A, sch, m)), ss = S(Object.assign({}, A, sch, m, soft));
    assert.ok(sb.ok && ss.ok); assert.ok(Math.abs(sb.tip + 11.3 - tb) < 0.01 && Math.abs(ss.tip + 11.3 - ts) < 0.01, sb.tip + '/' + ss.tip);
  });
});
t('calculator default top condition is the sway frame (bracing is opt-in)', () => {
  assert.ok(/<option value="sway" selected>/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8')));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
