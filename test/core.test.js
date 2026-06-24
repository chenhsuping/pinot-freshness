const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');

test('parseGvizText strips wrapper and returns table', () => {
  const t = Core.parseGvizText(SNAP);
  assert.equal(t.cols.length, 12);
  assert.equal(t.rows.length, 6);
});

test('parseGvizText throws on gviz error status', () => {
  const errBody = '/*O_o*/google.visualization.Query.setResponse({"status":"error","errors":[{"detailed_message":"boom"}]});';
  assert.throws(() => Core.parseGvizText(errBody), /boom/);
});

test('parseGvizText throws on non-gviz text', () => {
  assert.throws(() => Core.parseGvizText('not gviz at all'));
});

test('cellV and cellF read values', () => {
  const t = Core.parseGvizText(SNAP);
  const r0 = t.rows[0];
  assert.equal(Core.cellV(r0, 0), 'BKW');
  assert.equal(Core.cellF(r0, 4), '240');   // SLA has f
  assert.equal(Core.cellV(r0, 4), 240);
  assert.equal(Core.cellV({ c: [] }, 5), null);
});

test('normalizeRow maps HK columns to common model', () => {
  const t = Core.parseGvizText(SNAP);
  const n = Core.normalizeRow('HK', t.rows[0]);
  assert.deepEqual(n, {
    region: 'HK', bu: 'BKW', group: 'bjgroup', table: 'dim_account',
    source: 'Offline', sla: 240, checkTime: '2026-06-24 12:00:11',
    maxUpdate: '2026-06-24 07:43:02', delayMin: 257, delayHuman: '4時 17分', status: 'Breached'
  });
});

test('normalizeRow returns null when BU missing', () => {
  assert.equal(Core.normalizeRow('HK', { c: [{ v: null }] }), null);
});

test('selectLatestSnapshot keeps only the newest Check_Time batch', () => {
  const t = Core.parseGvizText(SNAP);
  const norm = t.rows.map(function (r) { return Core.normalizeRow('HK', r); });
  const snap = Core.selectLatestSnapshot(norm);
  assert.equal(snap.checkTime, '2026-06-24 12:00:11');
  assert.equal(snap.rows.length, 4);
  assert.deepEqual(snap.rows.map(function (r) { return r.id; }), [0, 1, 2, 3]);
  const breach = snap.rows.filter(function (r) { return r.status === 'Breached'; }).length;
  assert.equal(breach, 2);
});

test('selectLatestSnapshot handles empty input', () => {
  assert.deepEqual(Core.selectLatestSnapshot([]), { rows: [], checkTime: null });
});

function snapRows() {
  const t = Core.parseGvizText(SNAP);
  return Core.selectLatestSnapshot(t.rows.map(function (r) { return Core.normalizeRow('HK', r); })).rows;
}

test('groupsInBU returns first-seen groups for a BU', () => {
  const rows = snapRows();
  assert.deepEqual(Core.groupsInBU(rows, 'MCD'), ['cxgroup', 'segroup']);
  assert.deepEqual(Core.groupsInBU(rows, 'BKW'), ['bjgroup']);
});

test('distinctTables returns first-seen tables for a BU', () => {
  const rows = snapRows();
  assert.deepEqual(Core.distinctTables(rows, 'MCD'), ['dim_account', 'fact_game_transaction']);
});

test('buOf returns the BU owning a group', () => {
  const rows = snapRows();
  assert.equal(Core.buOf(rows, 'segroup'), 'MCD');
  assert.equal(Core.buOf(rows, 'bjgroup'), 'BKW');
  assert.equal(Core.buOf(rows, 'nope'), '');
});

const HIST = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history.gviz.txt'), 'utf8');
const HIST_FGI = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history-fgi.gviz.txt'), 'utf8');

test('parseTime handles Date() and plain string', () => {
  const d1 = Core.parseTime({ v: 'Date(2026,5,24,12,0,11)' });
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 5);   // 0-based, 5 = June
  assert.equal(d1.getDate(), 24);
  assert.equal(d1.getHours(), 12);
  const d2 = Core.parseTime({ v: '2026-06-24 12:00:11' });
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getHours(), 12);
  assert.equal(Core.parseTime(null), null);
});

test('extractHistory filters to last N hours, chronological', () => {
  const t = Core.parseGvizText(HIST);
  const pts = Core.extractHistory(t, 24);
  assert.equal(pts.length, 2); // 23號 11:00 在 24h 視窗外
  assert.deepEqual(pts.map(function (p) { return p.delay; }), [197, 257]);
});

test('buildTrend produces deterministic SVG paths', () => {
  const tr = Core.buildTrend([{ delay: 10 }, { delay: 20 }], 15);
  assert.equal(tr.spark, 'M0.0 42.0 L300.0 6.0');
  assert.equal(tr.area, 'M0 78 L0.0 42.0 L300.0 6.0 L300 78 Z');
  assert.equal(tr.threshY, '24.0');
  assert.equal(tr.lx, '300.0');
  assert.equal(tr.ly, '6.0');
  assert.deepEqual(tr.pts, [{ x: '0.0', y: '42.0' }, { x: '300.0', y: '6.0' }]);
});

test('mkColors maps breach to red and met realtime to green+blue', () => {
  const br = Core.mkColors({ status: 'Breached', source: 'Offline' });
  assert.equal(br.dotColor, '#E0584A');
  assert.equal(br.pillText, '#C53D34');
  assert.equal(br.pillLabel, '逾時');
  assert.equal(br.srcBg, '#EEF1F5');
  const ok = Core.mkColors({ status: 'Met', source: 'Realtime' });
  assert.equal(ok.dotColor, '#34A06B');
  assert.equal(ok.pillLabel, '正常');
  assert.equal(ok.srcBg, '#E7F0FE');
  assert.equal(ok.srcText, '#2F6FE0');
});

test('filterRows filters by breach/rt/off/all', () => {
  const rows = [
    { status: 'Breached', source: 'Offline' },
    { status: 'Met', source: 'Realtime' },
    { status: 'Met', source: 'Offline' }
  ];
  assert.equal(Core.filterRows(rows, 'all').length, 3);
  assert.equal(Core.filterRows(rows, 'breach').length, 1);
  assert.equal(Core.filterRows(rows, 'rt').length, 1);
  assert.equal(Core.filterRows(rows, 'off').length, 2);
});

test('escHtml escapes dangerous chars', () => {
  assert.equal(Core.escHtml('<a>&"'), '&lt;a&gt;&amp;&quot;');
  assert.equal(Core.escHtml(null), '');
});

test('slaHuman / human / weekTicks format correctly', () => {
  assert.equal(Core.slaHuman(240), '4小時');
  assert.equal(Core.slaHuman(15), '15分');
  assert.equal(Core.human(888), '14時48分');
  assert.equal(Core.human(0), '0分');
  assert.deepEqual(Core.weekTicks('2026-06-24 12:00:11'),
    ['06/18 12時', '06/20 12時', '06/22 12時', '06/24 12時']);
});

test('extractRecords parses F,G,I rows with breached flag and G-missing fallback', () => {
  const t = Core.parseGvizText(HIST_FGI);
  const recs = Core.extractRecords(t, 240);
  assert.equal(recs.length, 6);
  // record 0: G present, delay=257 > sla=240 → breached
  assert.equal(recs[0].checkTime, '2026-06-24 12:00:11');
  assert.equal(recs[0].maxUpdate, '2026-06-24 11:55:00');
  assert.equal(recs[0].delayMin, 257);
  assert.equal(recs[0].delay, 257);  // compat alias
  assert.equal(recs[0].breached, true);
  // record 1: G missing → fallback maxUpdate = checkTime - delayMin
  assert.equal(recs[1].checkTime, '2026-06-24 11:00:11');
  assert.equal(recs[1].maxUpdate, '2026-06-24 07:43:11'); // 11:00:11 - 197min
  assert.equal(recs[1].breached, false);
});

test('sliceByRange filters 24h/3d/7d windows and returns newest-first', () => {
  const t = Core.parseGvizText(HIST_FGI);
  const recs = Core.extractRecords(t, 240);
  const ref = '2026-06-24 12:00:11';
  const s24 = Core.sliceByRange(recs, ref, '24h');
  assert.equal(s24.length, 3);
  assert.equal(s24[0].checkTime, '2026-06-24 12:00:11'); // newest first
  const s3d = Core.sliceByRange(recs, ref, '3d');
  assert.equal(s3d.length, 4);
  const s7d = Core.sliceByRange(recs, ref, '7d');
  assert.equal(s7d.length, 5);
});

test('summarizeRange counts total and breached records', () => {
  const slice = [{ breached: true }, { breached: false }, { breached: true }];
  const s = Core.summarizeRange(slice);
  assert.equal(s.count, 3);
  assert.equal(s.breachedCount, 2);
  assert.deepEqual(Core.summarizeRange([]), { count: 0, breachedCount: 0 });
});

test('fmtRangeLabel returns correct Chinese labels', () => {
  assert.equal(Core.fmtRangeLabel('24h'), '近24小時');
  assert.equal(Core.fmtRangeLabel('3d'), '近3天');
  assert.equal(Core.fmtRangeLabel('7d'), '近7天');
});

test('sha256Hex matches the configured password hash', async () => {
  const h = await Core.sha256Hex('53343286@Di');
  assert.equal(h, 'a4cce81663dc5e2bf18dfbf8d4a7c64fc4313b49210831c201d25927afe99c37');
  const wrong = await Core.sha256Hex('wrong');
  assert.notEqual(wrong, h);
});
