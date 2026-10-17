// Prints the 2026-07-013 Fish Face II embedment solutions: node tests/fishface_report.js
const { lib, fishFace, perimeter, soft, stiff } = require('./fishface_lib');
const rows = [];
const prof = { base: {}, soft, stiff };
const piles = { '14x14 SP No.1 square': { shape: 'square' }, '14" round SP uniform': { shape: 'round' }, '14" round SP tapered (8.5" tip)': { shape: 'round', dTip: 8.5 } };
for (const [loc, lm] of Object.entries({ interior: {}, perimeter })) for (const [pn, pm] of Object.entries(piles)) for (const [sn, sm] of Object.entries(prof)) {
  const i = Object.assign({}, fishFace, lm, pm, sm), s = lib.solveEmbedment(i), st = lib.lengthStatus(s, i);
  rows.push({ pile: loc, type: pn, soil: sn, embed: s.tip, total: +s.total.toFixed(1), controls: s.controls.join('+'), maxRatio: s.checks[s.maxCheck].ratio.toFixed(2) + ' ' + s.maxCheck + ' ' + s.checks[s.maxCheck].id, status: st.text });
}
console.table(rows);
