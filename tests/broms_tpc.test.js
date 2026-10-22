// node tests/broms_tpc.test.js — Broms short/long classification per TPC Timber Pile Manual 2016 §7.2 (pp.55-63).
// The manual has no lateral worked example (its Appendix examples are axial), so the closed-form Broms (1964a,b)
// equations behind Figs 7-1..7-4 are checked against independent hand calculations.
const assert = require('assert');
const { lib, fishFace, soft } = require('./fishface_lib');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('ok   ', n); };
const sand = { projName: 't', P: 0, Hx: 0, Hy: 0, h: 10, gammaEff: 55, phi: 30, pileType: 'timber', shape: 'round', species: 'SP', sawnGrade: 'SP_1',
  fc_prime: 5000, d: 12, pileUnitWt: NaN, Ltip: 10, dw: 0, gammaM: 110, delta: NaN, Kc: 1, Kt: 0.8, FSc: 2.5, FSt: 3, FSlat: 2.5, NqOv: NaN, dfix: NaN,
  Ke: 2.1, Ct: 1, zone: 'none', BFE: NaN, G: NaN, Esw: NaN, V: NaN, erosion: 0, localScour: NaN, dragA: NaN, debrisOn: false, debrisW: 1000,
  topCond: 'free', KeBr: 1, D: 2, L: 0, Lr: 0, Wv: 0, Wh: 1.0, soilType: 'sand', MyBasis: 'nominal' };
t('defaults: FS lateral 2.5 (TPC §7.2 Step 10), long-pile check on (nominal My)', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert(/id="FSlat" value="2.5"/.test(html)); assert(/value="nominal" selected/.test(html));
});
t('sand short free head: Qu = 0.5 γ b L³ Kp / (e + L) (Fig. 7-3) — hand calc', () => {
  const r = lib.pileDesign(sand), w = r.rows.find(x => x.H > 0);
  const Kp = 3, b = 1, g = 0.055, L = 10, e = w.M0 / w.H, Qu = 0.5 * g * b * L ** 3 * Kp / (e + L);
  assert(Math.abs(w.lat.lamS * w.H - Qu) < 1e-6 * Qu, w.lat.lamS * w.H + ' vs ' + Qu);
});
t('sand long free head: Qu(e + 0.67·0.82√(Qu/γbKp)) = My (Fig. 7-4), My = 2.54 S Fb′/CD', () => {
  const r = lib.pileDesign(sand), w = r.rows.find(x => x.H > 0), Q = w.lat.lamL * w.H;
  const e = w.M0 / w.H, lhs = Q * (e + 0.67 * 0.82 * Math.sqrt(Q / (0.055 * 1 * 3)));
  assert(Math.abs(lhs - w.lat.My) < 1e-4 * w.lat.My);
  assert(Math.abs(w.lat.My - 2.54 * (Math.PI * 12 ** 3 / 32) * w.st.FbP / w.CD / 12000) < 1e-6);
});
t('sand classification ηD with Kh from Table 7-2 (medium, below GW: 35 kcf)', () => {
  const r = lib.pileDesign(sand), w = r.rows.find(x => x.H > 0);
  assert.strictEqual(w.lat.Kh, 35); const EI = r.Esw * (Math.PI * 12 ** 4 / 64) / 1000 / 144;
  assert(Math.abs(w.lat.rel - Math.pow(35 / EI, 0.2) * 10) < 1e-9); assert.strictEqual(w.lat.cls, w.lat.rel > 4 ? 'long' : w.lat.rel < 2 ? 'short' : 'intermediate');
});
t('governing capacity = lower of short and long (Step 9e); rLatLong = FS/λlong', () => {
  const r = lib.pileDesign(sand), w = r.rows.find(x => x.H > 0);
  assert.strictEqual(w.lat.lam, Math.min(w.lat.lamS, w.lat.lamL)); assert(Math.abs(w.rLatLong - 2.5 / w.lat.lamL) < 1e-12);
});
t('clay: Kh = n1 n2 1670 qu / b (Eq. 7-1, Table 7-1, n2 1.30 timber); long Fig. 7-2 hand calc', () => {
  const i = Object.assign({}, fishFace, { MyBasis: 'nominal', FSlat: 2.5, topCond: 'free', Ltip: 25 }), r = lib.pileDesign(i), w = r.rows.find(x => x.H > 0);
  const b = 14 / 12, cu = 0.4 + 0.015 * (1.5 * b + 2), qu = 2 * cu * 1000, n1 = qu < 1000 ? 0.32 : 0.36;
  assert(Math.abs(w.lat.Kh - n1 * 1.3 * 1670 * qu / b / 1000) < 1e-9);
  const Q = w.lat.lamL * w.H, lhs = Q * (w.M0 / w.H + 1.5 * b + 0.5 * Q / (9 * cu * b));
  assert(Math.abs(lhs - w.lat.My) < 1e-3 * w.lat.My);
});
t('long-pile yield cannot be fixed by depth: λlong independent of embedment', () => {
  const a = lib.pileDesign(Object.assign({}, sand, { Ltip: 10 })), b = lib.pileDesign(Object.assign({}, sand, { Ltip: 30 }));
  assert(Math.abs(a.gov.rLatLong.ratio - b.gov.rLatLong.ratio) < 1e-9);
});
t('MyBasis off reproduces the R2 package (no long-pile check)', () => {
  const r = lib.pileDesign(Object.assign({}, sand, { MyBasis: 'off' })); assert.strictEqual(r.gov.rLatLong.ratio, 0);
});
console.log(`\n${pass} passed`);
