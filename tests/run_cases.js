// Headless harness: node tests/run_cases.js  — runs pileDesign() from index.html without a browser.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/window\.onload[\s\S]*?};/, '');
const lib = new Function('document', js + '; return { pileDesign, readInputs };')({ getElementById: () => null });
const base = { projName: '2026-07-013 Fish Face II', P: 0, Hx: 0, Hy: 0, h: 11.3, gammaEff: 55, phi: 30,
  pileType: 'timber', shape: 'square', species: 'SP', sawnGrade: 'SP_1', fc_prime: 5000, d: 12,
  pileUnitWt: NaN, Ltip: 12.6, dw: 0, gammaM: 110, delta: NaN, Kc: 1.0, Kt: 0.8, FSc: 2.5, FSt: 3.0, FSlat: 2.0,
  NqOv: NaN, dfix: NaN, Ke: 2.1, Ct: 1.0, zone: 'VE', BFE: 13, G: 6.2, Esw: NaN, V: NaN, erosion: 0,
  localScour: NaN, dragA: NaN, debrisOn: true, debrisW: 1000 };
const cases = [
  { name: 'Interior pile (middle row, H-PSL post)', D: 8.0, L: 12.3, Lr: 2.5, Wv: 0, Wh: 3.0 },
  { name: 'Perimeter pile (N/S row, roof uplift)', D: 5.9, L: 0, Lr: 0, Wv: -4.17, Wh: 3.0 }
];
const out = cases.map(c => { const r = lib.pileDesign(Object.assign({}, base, c)); return { case: c.name, r }; });
const f = x => (typeof x === 'number' ? x.toFixed(2) : x);
out.forEach(({ case: n, r }) => {
  console.log('\n=== ' + n + ' ===');
  if (r.flood) { const F = r.flood; console.log(`flood: Esw ${f(F.Esw)} ds ${f(F.ds)} Hb ${f(F.Hb)} V ${f(F.V)} Fbrk ${f(F.Fbrk)} Fdyn ${f(F.Fdyn)} Fdeb ${f(F.Fdeb)} scour ${f(F.S)}`); }
  r.rows.forEach(x => console.log([x.id.padEnd(8), 'P', f(x.P), 'Wp', f(x.Wp), 'H', f(x.H), 'Mmax', f(x.Mmax), 'Fc\'', f(x.st.FcP), 'Cp', f(x.st.Cp),
    'str', f(x.rStruct), 'Lreq/Lav', f(x.Lreq) + '/' + f(x.Lav), 'emb', f(x.rEmbed), 'Qa_c', f(x.Qa_c), 'comp', f(x.rComp), 'T', f(x.T), 'Qa_t', f(x.Qa_t), 'upl', f(x.rUplift)].join(' ')));
  Object.entries(r.gov).forEach(([k, g]) => console.log('GOV', k, f(g.ratio), g.id));
  console.log('max required tip below LAG:', f(r.tipReqMax));
});
fs.writeFileSync(path.join(__dirname, 'results_2026-07-013.json'), JSON.stringify(out.map(o => ({ case: o.case, gov: o.r.gov, flood: o.r.flood, rows: o.r.rows })), null, 1));
