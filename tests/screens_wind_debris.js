// Headless Chrome screenshots for the wind/debris PR → docs/screens/ (needs puppeteer-core; Chrome at /usr/bin/google-chrome)
const puppeteer = require(process.env.PPT || 'puppeteer-core');
const out = __dirname + '/../docs/screens/';
const base = { projName: '2026-07-013 Fish Face II (interior pile)', h: 11.3, gamma: 45, pileType: 'timber', shape: 'square', sawnGrade: 'SP_1', d_trial: 14, dTip: '',
  Dld: 8, Lld: 12.3, Lrld: 2.5, Wvld: 0, Whld: 5.6, Wot: 0, qzPile: 39.2, soilType: 'clay', suTop: 400, suGrad: 15, suMax: 1500, dw: 0, topCond: 'braced', braceFoot: 1,
  KeBr: 1, zone: 'VE', BFE: 13, Gelev: 6.2, embedMode: 'auto', maxLen: 40, lenMode: 'advisory', Ltip: '' };
const cases = [
  ['10_interior_braced_to_grade_PASS', {}, false],
  ['11_unbraced_cantilever_FAIL', { topCond: 'free', projName: '2026-07-013 Fish Face II (NOT braced to grade)' }, false],
  ['12_perimeter_debris_struck_lateral', { Dld: 5.9, Lld: 0, Lrld: 0, Wvld: -4.17, Wot: 8.3, projName: '2026-07-013 Fish Face II (perimeter, debris-struck)' }, true],
  ['13_perimeter_windward_uplift', { Dld: 5.9, Lld: 0, Lrld: 0, Wvld: -4.17, Wot: -8.3, projName: '2026-07-013 Fish Face II (perimeter windward)' }, false]
];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1100, height: 900 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const set = async (v, deb) => pg.evaluate((v, deb) => { document.getElementById('advInputs').open = true;
    for (const [k, val] of Object.entries(v)) { const el = document.getElementById(k); if (!el) throw new Error('missing ' + k); el.value = val; }
    document.getElementById('debrisOn').checked = deb; togglePileOptions(); calculate(); return document.querySelector('#embedResults .badge').textContent; }, v, deb);
  for (const [name, mod, deb] of cases) {
    await pg.goto('file://' + __dirname + '/../index.html');
    console.log(name, '→', await set(Object.assign({}, base, mod), deb));
    await (await pg.$('#embedResults')).screenshot({ path: out + name + '.png' });
  }
  // building wind helper + new inputs
  await pg.goto('file://' + __dirname + '/../index.html');
  await set(base, false);
  await pg.evaluate(() => { document.getElementById('h').value = 11.3; document.getElementById('bwPos').value = 'leeward'; applyBuildingWind(); });
  const h3 = await pg.evaluateHandle(() => [...document.querySelectorAll('h3')].find(h => /Building Wind Helper/.test(h.textContent)));
  const bx = await h3.boundingBox();
  await pg.screenshot({ path: out + '14_building_wind_helper.png', clip: { x: 0, y: bx.y - 10, width: 1100, height: 560 } });
  // calc sheet (print view) for the debris-struck perimeter case
  await pg.goto('file://' + __dirname + '/../index.html');
  await set(Object.assign({}, base, cases[2][1]), true);
  await pg.emulateMediaType('print');
  await pg.screenshot({ path: out + '15_calc_sheet_print_view.png', fullPage: true });
  console.log('page errors:', errs);
  await b.close();
})();
