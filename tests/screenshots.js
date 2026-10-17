// Headless Chrome screenshots of the Embedment Solution panel (needs: npm i puppeteer-core; Chrome at /usr/bin/google-chrome).
// Usage: node tests/screenshots.js  → writes PNGs to /workspace/pile/screens/
const puppeteer = require('puppeteer-core');
const out = '/workspace/pile/screens/';
const base = { projName: '2026-07-013 Fish Face II (interior pile)', P: 0, Hx: 0, Hy: 0, h: 11.3, gamma: 45, phi: 0, pileType: 'timber', shape: 'square', sawnGrade: 'SP_1', species: 'SP', d_trial: 14, dTip: '',
  Dld: 8, Lld: 12.3, Lrld: 2.5, Wvld: 0, Whld: 3, soilType: 'clay', suTop: 400, suGrad: 15, suMax: 1500, dw: 0, topCond: 'braced', KeBr: 1, zone: 'VE', BFE: 13, Gelev: 6.2,
  embedMode: 'auto', maxLen: 40, lenMode: 'advisory', Ltip: '' };
const cases = [
  ['01_square14_base_PASS', {}],
  ['02_square14_soft_AMBER', { suTop: 250, suGrad: 10, projName: '2026-07-013 Fish Face II (interior, soft-clay sensitivity)' }],
  ['03_round14_tapered_base_AMBER', { shape: 'round', dTip: 8.5, projName: '2026-07-013 Fish Face II (interior, 14in round alternate)' }],
  ['04_square14_soft_hardlimit_FAIL', { suTop: 250, suGrad: 10, lenMode: 'hard', projName: '2026-07-013 Fish Face II (soft clay, 40 ft hard limit)' }],
  ['05_manual_20ft_FAIL', { embedMode: 'manual', Ltip: 20, projName: '2026-07-013 Fish Face II (manual 20 ft tip)' }]
];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  for (const [name, mod] of cases) {
    await pg.goto('file:///workspace/pile/repo/index.html');
    const v = Object.assign({}, base, mod);
    const got = await pg.evaluate(v => {
      document.getElementById('advInputs').open = true;
      for (const [k, val] of Object.entries(v)) { const el = document.getElementById(k); if (!el) throw new Error('missing ' + k); el.value = val; }
      togglePileOptions(); calculate();
      return document.querySelector('#embedResults .badge').textContent;
    }, v);
    const el = await pg.$('#embedResults');
    await el.screenshot({ path: out + name + '.png' });
    console.log(name, '→', got);
  }
  // printable calc sheet (print media) for the base case
  await pg.goto('file:///workspace/pile/repo/index.html');
  await pg.evaluate(v => { document.getElementById('advInputs').open = true; for (const [k, val] of Object.entries(v)) document.getElementById(k).value = val; togglePileOptions(); calculate(); }, base);
  await pg.emulateMediaType('print');
  await pg.screenshot({ path: out + '06_calc_sheet_print_view.png', fullPage: true });
  await pg.pdf({ path: out + '06_calc_sheet_print_view.pdf', format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' } });
  // the new inputs section
  await pg.emulateMediaType('screen');
  const h2 = await pg.evaluateHandle(() => [...document.querySelectorAll('h2')].find(h => /Embedment &/.test(h.textContent)));
  const box = await h2.boundingBox();
  await pg.screenshot({ path: out + '00_inputs_embedment_section.png', clip: { x: 0, y: box.y - 10, width: 1100, height: 380 } });
  console.log('page errors:', errs);
  await b.close();
})();
