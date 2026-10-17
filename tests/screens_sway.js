// Screenshots for the sway-frame PR → docs/screens/2x_*.png
const puppeteer = require(process.env.PPT || 'puppeteer-core');
const out = __dirname + '/../docs/screens/';
const base = { projName: '2026-07-013 Fish Face II', h: 11.3, gamma: 45, pileType: 'timber', shape: 'square', sawnGrade: 'SP_1', d_trial: 14,
  Dld: 5.9, Lld: 0, Lrld: 0, Wvld: -4.17, Whld: 5.6, Wot: 8.3, WhY: 1.29, qzPile: 39.2, soilType: 'clay', suTop: 400, suGrad: 15, suMax: 1500, dw: 0,
  topCond: 'sway', topFix: 0.5, connMcap: '', zone: 'VE', BFE: 13, Gelev: 6.2, embedMode: 'auto', maxLen: 40, lenMode: 'advisory', Ltip: '' };
const cases = [
  ['20_sway_bolted_14x14_CONNECTION_FAIL', { projName: '2026-07-013 (bolted dropped beam, α 0.5) 14x14' }],
  ['21_sway_full_fixity_moment_conn_16x16_PASS', { topFix: 1, connMcap: 100, d_trial: 16, projName: '2026-07-013 (moment connection, α 1.0) 16x16 debris pile' }],
  ['22_free_top_18x18_DRIFT_FAIL', { topCond: 'free', d_trial: 18, projName: '2026-07-013 (free top) 18x18 debris pile' }]
];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1100, height: 900 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  for (const [name, mod] of cases) {
    await pg.goto('file://' + __dirname + '/../index.html');
    const badge = await pg.evaluate(v => { document.getElementById('advInputs').open = true;
      for (const [k, val] of Object.entries(v)) { const el = document.getElementById(k); if (!el) throw new Error('missing ' + k); el.value = val; }
      document.getElementById('debrisOn').checked = true; togglePileOptions(); calculate(); return document.querySelector('#embedResults .badge').textContent; }, Object.assign({}, base, mod));
    console.log(name, '→', badge);
    await (await pg.$('#embedResults')).screenshot({ path: out + name + '.png' });
    if (name.startsWith('21')) { await pg.emulateMediaType('print'); await pg.screenshot({ path: out + '23_calc_sheet_sway_print_view.png', fullPage: true }); await pg.emulateMediaType('screen'); }
  }
  console.log('page errors:', errs); await b.close();
})();
