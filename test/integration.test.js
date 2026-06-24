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

const HIST_FGI = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history-fgi.gviz.txt'), 'utf8');

test('new history pipeline: parse → extractRecords → sliceByRange → summarizeRange → viewDetail(history)', () => {
  const snapTable = Core.parseGvizText(SNAP);
  const snap = Core.selectLatestSnapshot(snapTable.rows.map(function (r) { return Core.normalizeRow('HK', r); }));
  const row = snap.rows.find(function (r) { return r.group === 'segroup'; }); // sla=240

  const histTable = Core.parseGvizText(HIST_FGI);
  const records = Core.extractRecords(histTable, row.sla);
  assert.equal(records.length, 6);

  const slice24 = Core.sliceByRange(records, snap.checkTime, '24h');
  assert.equal(slice24.length, 3);
  const summary = Core.summarizeRange(slice24);
  assert.equal(summary.breachedCount, 1);

  const html = Views.viewDetail({
    row: row, checkTime: snap.checkTime,
    history: { status: 'ready', records: records },
    tab: 'history', range: '24h'
  });
  assert.match(html, /共 3 筆/);
  assert.match(html, /1 筆逾時/);
  assert.match(html, /逾時/);
});

test('overview tab still renders SVG trend after records migration', () => {
  const snapTable = Core.parseGvizText(SNAP);
  const snap = Core.selectLatestSnapshot(snapTable.rows.map(function (r) { return Core.normalizeRow('HK', r); }));
  const row = snap.rows.find(function (r) { return r.group === 'segroup'; });

  const histTable = Core.parseGvizText(HIST_FGI);
  const records = Core.extractRecords(histTable, row.sla);

  const html = Views.viewDetail({
    row: row, checkTime: snap.checkTime,
    history: { status: 'ready', records: records },
    tab: 'overview', range: '24h'
  });
  assert.match(html, /近七天累積 Downtime/);
  assert.match(html, /<svg/);
});
