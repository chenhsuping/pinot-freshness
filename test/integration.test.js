const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');
const Views = require('../views.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');
const HIST = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history.gviz.txt'), 'utf8');

test('snapshot pipeline: parse -> normalize -> latest -> menu render', () => {
  const t = Core.parseGvizText(SNAP);
  const snap = Core.selectLatestSnapshot(t.rows.map(function (r) { return Core.normalizeRow('HK', r); }));
  assert.equal(snap.rows.length, 4);
  const html = Views.viewMenu({ mode: 'byGroup', bu: 'BKW', rows: snap.rows, checkTime: snap.checkTime });
  assert.match(html, /bjgroup/);
  assert.match(html, /0%/); // bjgroup 1 列 1 逾時
});

test('history pipeline: parse -> extractHistory -> buildTrend', () => {
  const t = Core.parseGvizText(HIST);
  const pts = Core.extractHistory(t, 24);
  const tr = Core.buildTrend(pts, 240);
  assert.equal(pts.length, 2);
  assert.match(tr.spark, /^M0\.0 /);
  assert.ok(tr.area.endsWith('Z'));
});
