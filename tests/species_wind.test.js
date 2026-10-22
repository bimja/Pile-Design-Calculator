// node tests/species_wind.test.js — species design values + wind speed input
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/window\.onload[\s\S]*?};/, '');
const lib = new Function('document', js + '; return { timberRef, buildingWind };')({ getElementById: () => null });
const sq = g => lib.timberRef({ shape: 'square', sawnGrade: g, d: 12 });
// NDS Supp. Table 4D timbers: SP values already wet service (CM = 1); DF-L CM_Fc = 0.91
['SP_SS', 'SP_1', 'SP_2'].forEach(g => assert.strictEqual(sq(g).CM_Fc, 1.0, g));
['DF_1', 'DF_2'].forEach(g => assert.strictEqual(sq(g).CM_Fc, 0.91, g));
assert.deepStrictEqual([sq('SP_1').Fb, sq('SP_1').Fc, sq('SP_1').E, sq('SP_1').Emin], [1350, 825, 1500000, 550000]);
assert.deepStrictEqual([sq('DF_2').Fb, sq('DF_2').Fc, sq('DF_2').E, sq('DF_2').Emin], [750, 700, 1300000, 470000]);
const rd = s => lib.timberRef({ shape: 'round', species: s, d: 12 });
assert.deepStrictEqual([rd('SP').Fc, rd('SP').Fb, rd('DF').Fc, rd('DF').Fb], [1200, 2400, 1250, 2450]);
// wind: qh scales with V^2
const o = { exp: 'C', h: 30, hB: 10, hF: 10, qh: NaN, Kd: 0.85, Kzt: 1, Ke: 1, B: 55, L: 25, roof: 'gable', pitch: 5, rows: 3, lines: 6, rowSp: 11.95, method: 'trib', pos: 'interior' };
const a = lib.buildingWind(Object.assign({ V: 143 }, o)), b = lib.buildingWind(Object.assign({ V: 160 }, o));
assert(Math.abs(b.qh / a.qh - (160 / 143) ** 2) < 1e-6, 'qh ~ V^2');
assert(Math.abs(b.share / a.share - (160 / 143) ** 2) < 1e-6, 'Wh ~ V^2');
assert(/id="wind" value="143"[^>]*onchange/.test(html) && !/id="wind"[^>]*disabled/.test(html), 'wind input enabled');
console.log('species_wind tests passed; Wh 143 mph', a.share.toFixed(2), 'k -> 160 mph', b.share.toFixed(2), 'k');
// TPC Timber Pile Design & Construction Manual 2016: Table 3-1 (p.9), Table 3-10 (p.17), Eq. 3-5
const t = (o) => lib.timberRef(Object.assign({ shape: 'round', species: 'SP', d: 12 }, o));
assert.deepStrictEqual([t({ roundBasis: 'TPC' }).Fc, t({ roundBasis: 'TPC' }).Fb], [1250, 1950]);
assert.deepStrictEqual([t({ species: 'RP' }).Fc, t({ species: 'RP' }).Fb, t({ species: 'RP' }).E], [850, 1350, 1300000]);
assert.strictEqual(t({ conditioning: 'air' }).Cu_Fc, 1.18); assert.strictEqual(t({ species: 'DF', conditioning: 'air' }).Cu_Fb, 1.11);
assert.deepStrictEqual([t({ loadShare: 'single' }).Cls_Fc, t({ loadShare: 'single' }).Cls_Fb], [0.8, 0.77]);
assert.strictEqual(t({}).Cu_Fc * t({}).Cls_Fc, 1, 'defaults unchanged');
console.log('TPC manual tests passed');
