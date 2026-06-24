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
