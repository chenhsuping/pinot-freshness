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

test('viewDetail renders 7-day Downtime summary and trend when history ready', () => {
  const s = snap();
  const row = s.rows.find(function (r) { return r.group === 'segroup'; }); // Breached, sla 240
  const html = Views.viewDetail({
    row: row, checkTime: s.checkTime,
    history: { status: 'ready', points: [{ delay: 10 }, { delay: 20 }] }
  });
  assert.match(html, /近七天累積 Downtime/);
  assert.match(html, /近七天 SLA 總時數/);
  assert.match(html, /資料更新時間/);
  assert.match(html, /<svg/);
  assert.match(html, /480 分/);     // slaWeek = 240 × 2 points
  assert.match(html, /30分/);       // downtime human = 10 + 20
  assert.match(html, /06\/18 12時/); // 由 checkTime 2026-06-24 12:00:11 推算的週刻度
});

test('viewDetail shows spinner while history loading', () => {
  const s = snap();
  const row = s.rows[0];
  const html = Views.viewDetail({ row: row, checkTime: s.checkTime, history: { status: 'loading' } });
  assert.match(html, /spinner/);
  assert.doesNotMatch(html, /<svg/);
});
