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

  function parseTime(cell) {
    if (!cell) return null;
    var v = cell.v, f = cell.f;
    if (typeof v === 'string') {
      var m = v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
      if (m) return new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    }
    var s = f || (typeof v === 'string' ? v : null);
    if (s) { var d = new Date(s.replace(/-/g, '/').replace('T', ' ')); if (!isNaN(d)) return d; }
    if (typeof v === 'number') return new Date(v);
    return null;
  }

  function extractHistory(table, hours) {
    var pts = (table.rows || []).map(function (r) {
      return { t: parseTime(r.c && r.c[0]), delay: Number(cellV(r, 1)) };
    }).filter(function (p) { return p.t && !isNaN(p.delay); });
    pts.reverse();
    if (pts.length >= 2) {
      var last = pts[pts.length - 1].t.getTime();
      var cutoff = last - hours * 3600 * 1000;
      var within = pts.filter(function (p) { return p.t.getTime() >= cutoff; });
      if (within.length >= 2) return within;
    }
    return pts;
  }

  function buildTrend(points, sla) {
    var W = 300, top = 6, bottom = 78, plotH = bottom - top;
    var vals = points.map(function (p) { return p.delay; });
    var max = Math.max.apply(null, vals.concat([sla * 1.15, 1]));
    var n = vals.length, step = W / (n > 1 ? (n - 1) : 1);
    var y = function (v) { return bottom - (v / max) * plotH; };
    var line = '', area = 'M0 ' + bottom + ' ';
    vals.forEach(function (v, i) {
      var x = (i * step).toFixed(1), yy = y(v).toFixed(1);
      line += (i ? 'L' : 'M') + x + ' ' + yy + ' '; area += 'L' + x + ' ' + yy + ' ';
    });
    area += 'L' + W + ' ' + bottom + ' Z';
    return { spark: line.trim(), area: area, threshY: y(sla).toFixed(1), lx: ((n - 1) * step).toFixed(1), ly: y(vals[n - 1]).toFixed(1) };
  }

  function rowsOfBU(rows, bu) { return rows.filter(function (r) { return r.bu === bu; }); }

  function groupsInBU(rows, bu) {
    var seen = [];
    rowsOfBU(rows, bu).forEach(function (r) { if (seen.indexOf(r.group) < 0) seen.push(r.group); });
    return seen;
  }

  function distinctTables(rows, bu) {
    var seen = [];
    rowsOfBU(rows, bu).forEach(function (r) { if (seen.indexOf(r.table) < 0) seen.push(r.table); });
    return seen;
  }

  function buOf(rows, group) {
    var r = rows.find(function (x) { return x.group === group; });
    return r ? r.bu : '';
  }

  return {
    parseGvizText: parseGvizText, cellV: cellV, cellF: cellF,
    normalizeRow: normalizeRow, selectLatestSnapshot: selectLatestSnapshot,
    groupsInBU: groupsInBU, distinctTables: distinctTables, buOf: buOf,
    parseTime: parseTime, extractHistory: extractHistory, buildTrend: buildTrend
  };
});
