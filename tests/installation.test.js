// Installation-method tests: node tests/installation.test.js  (exit code 1 on any failure)
// 1) Driven (default) must reproduce the pre-change engine exactly (deep-equal rows/gov) for a spread of inputs.
// 2) Pope & Widner 2026-09-007 (14x14 SP No.1, 18'-6" IFP) cases (a)-(d) reproduce the 11/18/2026 augered-pile check.
const assert = require('assert'), fs = require('fs'), path = require('path');
const { lib, fishFace, perimeter } = require('./fishface_lib');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('ok   ', name); } catch (e) { fail++; console.log('FAIL ', name, '\n     ', e.message); } }
const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'inst' ? undefined : (typeof v === 'number' && !isFinite(v) ? String(v) : v))));
// pre-change engine (git: index.html at the branch base) for the exact-equality check
const basePath = path.join(__dirname, 'fixtures', 'index_pre_installation.html');
const old = (() => { const html = fs.readFileSync(basePath, 'utf8'); const js = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/window\.onload[\s\S]*?};/, '');
  return new Function('document', js + '; return { pileDesign };')({ getElementById: () => null }); })();
const pope = { projName: 'Pope', P: 0, Hx: 0, Hy: 0, h: 9.557, gammaEff: 55, phi: 30, pileType: 'timber', shape: 'square', species: 'SP', sawnGrade: 'SP_1',
  fc_prime: 5000, d: 14, dTip: NaN, pileUnitWt: NaN, Ltip: 18.339, dw: 0, gammaM: 110, delta: NaN, Kc: 1.0, Kt: 0.8, FSc: 2.5, FSt: 3.0, FSlat: 2.5,
  MyBasis: 'nominal', NqOv: NaN, dfix: NaN, Ke: 2.1, Ct: 1.0, zone: 'AE', BFE: 11, G: 6.10, Esw: NaN, V: NaN, erosion: 0, localScour: NaN, dragA: NaN,
  debrisOn: true, debrisW: 1000, topCond: 'sway', connType: 'notched', notchGeom: '11.875/3.5/3.25/2', notchShoulder: 'dado', driftBasis: 'service',
  svcF: 0.42, driftN: 100, debrisShareN: 20, impactCD: 1.6, soilType: 'sand', D: 4.6, L: 5.2, Lr: 1.3, Wv: -6.5, Wh: 4.01, Wot: -4.44, WhY: 2.31,
  qzPile: 41.7, embedMode: 'manual', maxLen: 27.896, lenMode: 'advisory', minEmbed: 5, maxEmbed: 80, embStep: 0.5 };
const variants = [fishFace, Object.assign({}, fishFace, perimeter), Object.assign({}, fishFace, { soilType: 'sand', phi: 30, gammaEff: 55 }),
  Object.assign({}, fishFace, { shape: 'round', dTip: 8.5 }), Object.assign({}, fishFace, { topCond: 'free', soilType: 'sand', phi: 32 }), pope,
  Object.assign({}, pope, { Ltip: 10, d: 12, connType: 'bolted', connGeom: '4/3/2' }), Object.assign({}, pope, { zone: 'VE', NqOv: 30, delta: 20 })];
variants.forEach((v, i) => t(`Driven default reproduces the pre-change engine exactly (variant ${i})`, () => {
  const a = strip(old.pileDesign(Object.assign({}, v))), b = strip(lib.pileDesign(Object.assign({}, v)));
  assert.deepStrictEqual(b, a);
  assert.deepStrictEqual(strip(lib.pileDesign(Object.assign({}, v, { instMethod: 'driven' }))), a);
}));
// Pope 11/18/2026 expected ratios (max over combos), perimeter windward pile B, at 18'-6" IFP
const PB = Object.assign({}, pope), r2 = x => Math.round(x * 100) / 100;
const gov = inp => { const c = lib.checkRatios(lib.pileDesign(inp)); const o = {}; ['rEmbed', 'rLatLong', 'rComp', 'rUplift', 'rConn'].forEach(k => o[k] = r2(c[k].ratio)); return o; };
const cases = {
  a: [{}, { rEmbed: 0.73, rLatLong: 0.73, rComp: 0.53, rUplift: 0.95, rConn: 0.93 }],
  b: [{ instMethod: 'augerSand' }, { rEmbed: 0.87, rLatLong: 0.78, rComp: 1.31, rUplift: 1.52, rConn: 0.93 }],
  c: [{ instMethod: 'augerConcrete', instHoleD: 24 }, { rEmbed: 0.67, rLatLong: 0.74, rComp: 0.85, rUplift: 0.64, rConn: 0.93 }],
  d: [{ instMethod: 'pilot', instPilotD: 10, instPilotDepth: 9 }, { rEmbed: 0.77, rLatLong: 0.75, rComp: 0.54, rUplift: 1.03, rConn: 0.93 }] };
Object.entries(cases).forEach(([k, [m, exp]]) => t(`Pope 2026-09-007 case (${k}) perimeter windward reproduces 11/18 check`, () => assert.deepStrictEqual(gov(Object.assign({}, PB, m)), exp)));
t('concrete hole smaller than pile diagonal + 4" warns', () => {
  const r = lib.pileDesign(Object.assign({}, PB, { instMethod: 'augerConcrete', instHoleD: 18 }));
  assert.ok(r.inst.warn.length === 1 && /minimum 23.8"/.test(r.inst.warn[0]), r.inst.warn.join());
  assert.strictEqual(lib.pileDesign(Object.assign({}, PB, { instMethod: 'augerConcrete', instHoleD: 24 })).inst.warn.length, 0);
});
t('augered sand-packed capacity < driven; concrete adds self-weight', () => {
  const row = r => r.rows.find(x => x.id === '1');
  const a = row(lib.pileDesign(PB)), b = row(lib.pileDesign(Object.assign({}, PB, { instMethod: 'augerSand' }))), c = row(lib.pileDesign(Object.assign({}, PB, { instMethod: 'augerConcrete' })));
  assert.ok(b.Qa_c < a.Qa_c && b.Qa_t < a.Qa_t); assert.ok(c.Wp > a.Wp + 2.5, String(c.Wp));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
