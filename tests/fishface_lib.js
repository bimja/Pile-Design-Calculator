// Shared loader + 2026-07-013 Fish Face II inputs for headless tests (no browser needed).
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/window\.onload[\s\S]*?};/, '');
const lib = new Function('document', js + '; return { buildingWind, pileDesign, readInputs, solveEmbedment, lengthStatus, embedAlternatives, runEmbedment, checkRatios, renderEmbedPanel, renderCalcSheet };')({ getElementById: () => null });
// Memo 2026-07-013_soil_pile_memo.md: Surfside clay (CH), water at grade, VE, BFE 13 NAVD88, LAG 6.20,
// braced top (Ke 1.0), debris on, local scour 2D, FS 2.5 / 3.0 / 2.0. Base profile su = 400 + 15 psf/ft (cap 1,500).
const fishFace = {
  projName: '2026-07-013 Fish Face II', P: 0, Hx: 0, Hy: 0, h: 11.3, gammaEff: 45, phi: 0,
  pileType: 'timber', shape: 'square', species: 'SP', sawnGrade: 'SP_1', fc_prime: 5000, d: 14, dTip: NaN,
  pileUnitWt: NaN, Ltip: NaN, dw: 0, gammaM: 110, delta: NaN, Kc: 1.0, Kt: 0.8, FSc: 2.5, FSt: 3.0, FSlat: 2.0,
  NqOv: NaN, dfix: NaN, Ke: 2.1, Ct: 1.0, zone: 'VE', BFE: 13, G: 6.2, Esw: NaN, V: NaN, erosion: 0,
  localScour: NaN, dragA: NaN, debrisOn: true, debrisW: 1000, topCond: 'braced', KeBr: 1.0,
  soilType: 'clay', suTop: 400, suGrad: 15, suMax: 1500,
  D: 8.0, L: 12.3, Lr: 2.5, Wv: 0, Wh: 3.0,                       // interior pile under the H-PSL post
  embedMode: 'auto', maxLen: 40, lenMode: 'advisory', minEmbed: 5, maxEmbed: 80, embStep: 0.5,
  MyBasis: 'off'   // R1/R2 package basis: FS lateral 2.0, short-pile Broms only (pre TPC §7.2 long-pile check)
};
const perimeter = { D: 5.9, L: 0, Lr: 0, Wv: -4.17, Wh: 3.0 };
const soft = { suTop: 250, suGrad: 10 };
const stiff = { suTop: 1500, suGrad: 0, suMax: 1500 };
module.exports = { lib, fishFace, perimeter, soft, stiff };
