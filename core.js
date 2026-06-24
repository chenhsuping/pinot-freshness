/* core.js — 純資料邏輯（瀏覽器 <script> 掛 window.DFCore；Node require 取 module.exports）。
 * 無 DOM、無 fetch、無全域狀態。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.DFCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseGvizText(text) {
    var s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error('gviz 回應格式異常');
    var json = JSON.parse(text.slice(s, e + 1));
    if (json.status === 'error') {
      var er = json.errors && json.errors[0];
      throw new Error((er && (er.detailed_message || er.message)) || 'gviz 查詢錯誤');
    }
    return json.table || { cols: [], rows: [] };
  }

  function cellV(row, i) { return row.c && row.c[i] ? row.c[i].v : null; }
  function cellF(row, i) {
    if (!row.c || !row.c[i]) return null;
    return row.c[i].f != null ? row.c[i].f : row.c[i].v;
  }

  var COL = { bu: 0, group: 1, table: 2, source: 3, sla: 4, checkTime: 5, maxUpdate: 6, delay: 8, delayHuman: 9, status: 10 };

  function normalizeRow(region, r) {
    var bu = cellV(r, COL.bu);
    if (bu == null) return null;
    return {
      region: region,
      bu: String(bu),
      group: String(cellV(r, COL.group)),
      table: String(cellV(r, COL.table)),
      source: String(cellV(r, COL.source)),
      sla: Number(cellV(r, COL.sla)),
      checkTime: String(cellF(r, COL.checkTime)),
      maxUpdate: String(cellF(r, COL.maxUpdate)),
      delayMin: Number(cellV(r, COL.delay)),
      delayHuman: String(cellV(r, COL.delayHuman)),
      status: String(cellV(r, COL.status))
    };
  }

  function selectLatestSnapshot(normRows) {
    var rows = normRows.filter(function (x) { return x && x.checkTime && x.checkTime !== 'null'; });
    if (!rows.length) return { rows: [], checkTime: null };
    var latest = rows.reduce(function (m, r) { return r.checkTime > m ? r.checkTime : m; }, rows[0].checkTime);
    var snap = rows.filter(function (x) { return x.checkTime === latest; });
    snap.forEach(function (x, i) { x.id = i; });
    return { rows: snap, checkTime: latest };
  }

  return {
    parseGvizText: parseGvizText, cellV: cellV, cellF: cellF,
    normalizeRow: normalizeRow, selectLatestSnapshot: selectLatestSnapshot
  };
});
