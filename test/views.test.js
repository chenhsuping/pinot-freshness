const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');
const Views = require('../views.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');
function snap() {
  const t = Core.parseGvizText(SNAP);
  return Core.selectLatestSnapshot(t.rows.map(function (r) { return Core.normalizeRow('HK', r); }));
}

test('viewMenu byGroup shows health % and group cards', () => {
  const s = snap();
  const html = Views.viewMenu({ mode: 'byGroup', bu: 'MCD', rows: s.rows, checkTime: s.checkTime });
  assert.match(html, /cxgroup/);
  assert.match(html, /segroup/);
  assert.match(html, /100%/);                // cxgroup: 2 列 0 逾時
  assert.match(html, /0%/);                  // segroup: 1 列 1 逾時
});

test('viewMenu byTable lists distinct tables with pills', () => {
  const s = snap();
  const html = Views.viewMenu({ mode: 'byTable', bu: 'MCD', rows: s.rows, checkTime: s.checkTime });
  assert.match(html, /dim_account/);
  assert.match(html, /fact_game_transaction/);
});

test('viewGroupTables filters breach-only and shows filter chips', () => {
  const s = snap();
  const all = Views.viewGroupTables({ group: 'cxgroup', bu: 'MCD', rows: s.rows, gFilter: 'all' });
  assert.match(all, /只看異常/);
  assert.match(all, /dim_account/);
  assert.match(all, /fact_game_transaction/);
  const breach = Views.viewGroupTables({ group: 'cxgroup', bu: 'MCD', rows: s.rows, gFilter: 'breach' });
  assert.doesNotMatch(breach, /fact_game_transaction/); // cxgroup 兩列都 Met -> 篩後皆消失
});

test('viewTableGroups lists only groups containing the table', () => {
  const s = snap();
  const html = Views.viewTableGroups({ table: 'fact_game_transaction', bu: 'MCD', rows: s.rows });
  assert.match(html, /cxgroup/);
  assert.doesNotMatch(html, />segroup</); // segroup 沒有這張表
});

test('viewDetail renders tab switcher and overview content when tab=overview', () => {
  const s = snap();
  const row = s.rows.find(function (r) { return r.group === 'segroup'; }); // Breached, sla 240
  const records = [
    { delay: 10, delayMin: 10, breached: false, checkTime: '2026-06-24 12:00:11', maxUpdate: '' },
    { delay: 20, delayMin: 20, breached: false, checkTime: '2026-06-24 11:00:11', maxUpdate: '' }
  ];
  const html = Views.viewDetail({
    row: row, checkTime: s.checkTime,
    history: { status: 'ready', records: records },
    tab: 'overview', range: '24h'
  });
  assert.match(html, /data-action="tab"/);
  assert.match(html, /data-val="overview"/);
  assert.match(html, /data-val="history"/);
  assert.match(html, /近七天累積 Downtime/);
  assert.match(html, /近七天 SLA 總時數/);
  assert.match(html, /資料更新時間/);
  assert.match(html, /<svg/);
  assert.match(html, /480 分/);      // slaWeek = 240 × 2 points
  assert.match(html, /30分/);        // downtime human = 10 + 20
  assert.match(html, /06\/18 12時/); // 由 checkTime 2026-06-24 12:00:11 推算的週刻度
});

test('viewDetail shows spinner while history loading', () => {
  const s = snap();
  const row = s.rows[0];
  const html = Views.viewDetail({ row: row, checkTime: s.checkTime, history: { status: 'loading' }, tab: 'overview', range: '24h' });
  assert.match(html, /spinner/);
  assert.doesNotMatch(html, /<svg/);
});

test('viewDetail tab=history renders range pills, summary, and records table', () => {
  const s = snap();
  const row = s.rows.find(function (r) { return r.group === 'segroup'; }); // sla=240
  const records = [
    { checkTime: '2026-06-24 12:00:11', maxUpdate: '2026-06-24 11:55:00', delayMin: 257, delay: 257, breached: true },
    { checkTime: '2026-06-24 11:00:11', maxUpdate: '2026-06-24 07:43:11', delayMin: 197, delay: 197, breached: false }
  ];
  const html = Views.viewDetail({
    row: row, checkTime: s.checkTime,
    history: { status: 'ready', records: records },
    tab: 'history', range: '24h'
  });
  assert.match(html, /data-action="tab"/);
  assert.match(html, /data-action="range"/);
  assert.match(html, /data-val="24h"/);
  assert.match(html, /近24小時/);
  assert.match(html, /共 2 筆 · 1 筆逾時/);
  assert.match(html, /逾時/);   // breach pill
  assert.match(html, /正常/);   // ok pill
  assert.match(html, /4時17分/); // human(257)
  assert.match(html, /3時17分/); // human(197)
  assert.doesNotMatch(html, /近七天累積 Downtime/); // overview not shown
});

test('viewDetail tab=history empty state shows 共 0 筆 and placeholder', () => {
  const s = snap();
  const row = s.rows[0];
  const html = Views.viewDetail({
    row: row, checkTime: s.checkTime,
    history: { status: 'ready', records: [] },
    tab: 'history', range: '24h'
  });
  assert.match(html, /此範圍尚無檢查記錄/);
  assert.match(html, /共 0 筆 · 0 筆逾時/);
});
