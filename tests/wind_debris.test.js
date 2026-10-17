// Native wind-to-soil, pile wind, debris (FEMA P-55 Eq. 8.9) and building-wind helper — reproduces the
// 2026-07-013 R1 hand results (Supplemental Calc S-1, sheets d/e). Run: node tests/wind_debris.test.js
const assert = require('assert');
const { lib, fishFace, soft } = require('./fishface_lib');
// R1 loads: wind share 3.36 k ASD = 5.6 k strength; pile qz 39.2 psf (Exp C, z = 17.75 ft, incl. Kd); brace foot 1 ft
const base = Object.assign({}, fishFace, { Wh: 5.6, qzPile: 39.2, braceFoot: 1, debrisOn: false });
const per = { D: 5.9, L: 0, Lr: 0, Wv: -4.17 };            // roof uplift; overturning ±8.3 k strength (±5.0 ASD) via Wot
const S = m => lib.solveEmbedment(Object.assign({}, base, m));
const latReq = s => Math.max(...s.res.rows.map(r => r.tipReq));
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('ok   ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n     ', e.message); } }
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} ± ${tol}`);

t('debris: FEMA P-55 Eq. 8.9, V zone CD 1.0, CStr 0.2 → 1000 × 11.9 × 0.2 = 2.38 k', () => {
  const f = lib.pileDesign(Object.assign({}, base, { debrisOn: true, Ltip: 28.5 })).flood;
  near(f.Fdeb, 2.38, 0.01, 'Fdeb'); assert.strictEqual(f.CDd, 1.0); assert.strictEqual(f.CStr, 0.2);
});
t('debris is off by default (one critical pile); debris combos default to CD 1.6, 2.0 when entered', () => {
  assert.strictEqual(lib.pileDesign(Object.assign({}, base, { Ltip: 28.5 })).flood.debris, false);
  const r = lib.pileDesign(Object.assign({}, base, { debrisOn: true, Ltip: 28.5 }));
  assert.ok(r.rows.filter(x => /dyn/.test(x.id)).every(x => x.CD === 1.6));
  const r2 = lib.pileDesign(Object.assign({}, base, { debrisOn: true, impactCD: 2.0, Ltip: 28.5 }));
  assert.ok(r2.rows.filter(x => /dyn/.test(x.id)).every(x => x.CD === 2.0));
  assert.ok(r.rows.filter(x => /brk/.test(x.id)).every(x => x.CD === 1.6));
});
t('interior 14x14 braced, base: 28.5 ft (compression), lateral-to-soil needs ≈14.3 ft (S-1)', () => {
  const s = S({}); assert.strictEqual(s.tip, 28.5); assert.deepStrictEqual(s.controls, ['rComp']); near(latReq(s), 14.3, 0.3, 'lateral');
});
t('interior 14x14 braced, soft: lateral-to-soil ≈17.3 ft (S-1)', () => near(latReq(S(soft)), 17.3, 0.3, 'lateral'));
t('braced-mode wind now reaches the soil (Wh changes the lateral demand)', () => {
  assert.ok(latReq(S({})) > latReq(S({ Wh: 0, qzPile: 0 })) + 2);
});
t('perimeter windward uplift (net −3.9 k ASD): R1 14.0 ft → 14.5 ft now that wind reaches soil (lateral 14.2)', () => {
  const s = S(Object.assign({}, per, { Wot: -8.3 }));
  assert.strictEqual(s.tip, 14.5); assert.ok(s.controls.includes('rUplift') || s.controls.includes('rEmbed'));
});
t('perimeter leeward compression: 15.5 ft base / 20.0 ft soft (R1)', () => {
  assert.strictEqual(S(Object.assign({}, per, { Wot: 8.3 })).tip, 15.5);
  assert.strictEqual(S(Object.assign({}, per, { Wot: 8.3 }, soft)).tip, 20);
});
t('debris-struck perimeter pile, lateral: ≈18.3 ft base / ≈22.3 ft soft (S-1)', () => {
  const b = S(Object.assign({}, per, { Wot: 8.3, debrisOn: true })), s = S(Object.assign({}, per, { Wot: 8.3, debrisOn: true }, soft));
  near(latReq(b), 18.3, 0.6, 'base'); near(latReq(s), 22.3, 0.3, 'soft');
  assert.deepStrictEqual(b.controls, ['rEmbed']);
});
t('NOT braced to grade: free cantilever fails in bending at every depth, clearly reported', () => {
  const i = Object.assign({}, base, { topCond: 'free' });
  const s = lib.solveEmbedment(i);
  assert.ok(!s.ok); assert.ok(s.checks.rStruct.ratio > 1.0, String(s.checks.rStruct.ratio));
  const d = lib.solveEmbedment(Object.assign({}, i, { debrisOn: true }));
  assert.ok(d.checks.rStruct.ratio > 1.55, 'debris pile ' + d.checks.rStruct.ratio);   // ≈1.63 at default CD 1.6
  const html = lib.renderEmbedPanel(i, lib.runEmbedment(i));
  assert.ok(/UNBRACED PILE FAILS IN BENDING/.test(html));
});
t('pile wind: F = qz G Cf b Hexp (square Cf 1.3, round 0.7; exposed from brace foot)', () => {
  const r = lib.pileDesign(Object.assign({}, base, { Ltip: 28.5 })); near(r.pw.F, 39.2 * 0.85 * 1.3 * 14 / 12 * 10.3 / 1000, 1e-6, 'F');
  assert.strictEqual(lib.pileDesign(Object.assign({}, base, { shape: 'round', Ltip: 40 })).pw.Cf, 0.7);
  near(lib.pileDesign(Object.assign({}, base, { topCond: 'free', Ltip: 28.5 })).pw.Hexp, 11.3, 1e-9, 'unbraced Hexp');
});
t('building wind helper reproduces the 7-22 lateral memo (wind.py): qh 46.5, V 80.8 k, rigid 4.49, OT ±8.3', () => {
  const r = lib.buildingWind({ V: 143, exp: 'C', h: 41, hB: 10, hF: 11.3, B: 55, L: 25, roof: 'gable', pitch: 5, rows: 3, lines: 6, rowSp: 11.95, method: 'trib', pos: 'windward' });
  near(r.qh, 46.5, 0.1, 'qh'); near(r.V, 80.8, 0.2, 'V'); near(r.Fww, 44.2, 0.1, 'ww'); near(r.Flw, 30.9, 0.1, 'lw'); near(r.Froof, 5.8, 0.1, 'roof');
  near(r.shareRigid, 4.49, 0.01, 'rigid'); near(r.OT, 8.3, 0.3, 'OT'); assert.ok(r.Wot < 0); near(r.qzPile, 39.2, 0.2, 'qz pile');
});
t('default pile shape is square', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(/<option value="square" selected>/.test(html));
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
