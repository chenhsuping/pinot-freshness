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
    var line = '', area = 'M0 ' + bottom + ' ', ptsArr = [];
    vals.forEach(function (v, i) {
      var x = (i * step).toFixed(1), yy = y(v).toFixed(1);
      line += (i ? 'L' : 'M') + x + ' ' + yy + ' '; area += 'L' + x + ' ' + yy + ' ';
      ptsArr.push({ x: x, y: yy });
    });
    area += 'L' + W + ' ' + bottom + ' Z';
    return { spark: line.trim(), area: area, threshY: y(sla).toFixed(1), lx: ((n - 1) * step).toFixed(1), ly: y(vals[n - 1]).toFixed(1), pts: ptsArr };
  }

  function mkColors(row) {
    var br = row.status === 'Breached';
    return {
      accent: br ? '#E0584A' : '#EAEDF2',
      dotColor: br ? '#E0584A' : '#34A06B',
      delayColor: br ? '#C53D34' : '#1F8A5B',
      pillBg: br ? '#FCEAE7' : '#E6F4EC',
      pillText: br ? '#C53D34' : '#1F8A5B',
      pillLabel: br ? '逾時' : '正常',
      srcBg: row.source === 'Realtime' ? '#E7F0FE' : '#EEF1F5',
      srcText: row.source === 'Realtime' ? '#2F6FE0' : '#5E6675'
    };
  }

  function filterRows(rows, f) {
    if (f === 'breach') return rows.filter(function (r) { return r.status === 'Breached'; });
    if (f === 'rt') return rows.filter(function (r) { return r.source === 'Realtime'; });
    if (f === 'off') return rows.filter(function (r) { return r.source === 'Offline'; });
    return rows;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function slaHuman(sla) { return sla % 60 === 0 ? (sla / 60) + '小時' : sla + '分'; }

  function human(m) {
    m = Math.max(0, Math.round(m));
    var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return (d ? d + '天' : '') + ((h || d) ? h + '時' : '') + mm + '分';
  }

  function fmtDatetime(d) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function extractRecords(table, sla) {
    return (table.rows || []).map(function (r) {
      var checkTimeStr = cellF(r, 0) || '';
      var maxUpdateRaw = cellF(r, 1);
      var delayMin = Number(cellV(r, 2));
      if (!checkTimeStr || isNaN(delayMin)) return null;
      var breached = delayMin > sla;
      var maxUpdate;
      if (maxUpdateRaw) {
        maxUpdate = String(maxUpdateRaw);
      } else {
        var ct = parseTime({ v: checkTimeStr, f: checkTimeStr });
        maxUpdate = ct ? fmtDatetime(new Date(ct.getTime() - delayMin * 60000)) : '';
      }
      return { checkTime: checkTimeStr, maxUpdate: maxUpdate, delayMin: delayMin, delay: delayMin, breached: breached };
    }).filter(Boolean);
  }

  /* ---- CSV 匯出端點解析（gviz 伺服器快取不可靠，改讀 /export?format=csv） ---- */
  // 正規 CSV 解析：處理引號欄位、欄內逗號、"" 轉義、CRLF。回傳 string[][]。
  function parseCsv(text) {
    text = String(text == null ? '' : text).replace(/^﻿/, ''); // 去除 BOM
    var rows = [], row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += ch;
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // 將 CSV 欄位陣列轉為共同資料模型（欄位索引沿用 COL，與 gviz 一致）
  function normalizeCsvFields(region, f) {
    var bu = f[COL.bu];
    if (bu == null || bu === '' || bu === 'BU') return null; // 空列或表頭
    return {
      region: region,
      bu: String(bu),
      group: String(f[COL.group]),
      table: String(f[COL.table]),
      source: String(f[COL.source]),
      sla: Number(f[COL.sla]),
      checkTime: String(f[COL.checkTime]),
      maxUpdate: String(f[COL.maxUpdate]),
      delayMin: Number(f[COL.delay]),
      delayHuman: String(f[COL.delayHuman]),
      status: String(f[COL.status])
    };
  }

  // CSV 全文 → 全部資料列（共同模型）
  function rowsFromCsv(region, text) {
    return parseCsv(text).map(function (f) {
      return normalizeCsvFields(region, f);
    }).filter(function (r) {
      return r && r.checkTime && r.checkTime !== 'null' && !isNaN(r.delayMin);
    });
  }

  // 從全部資料列中，取某張表（bu/group/table）的歷史記錄，新到舊排序
  function historyForRow(allRows, row) {
    return allRows.filter(function (r) {
      return r.bu === row.bu && r.group === row.group && r.table === row.table;
    }).map(function (r) {
      return { checkTime: r.checkTime, maxUpdate: r.maxUpdate, delayMin: r.delayMin, delay: r.delayMin, breached: r.delayMin > row.sla };
    }).sort(function (a, b) {
      return a.checkTime < b.checkTime ? 1 : a.checkTime > b.checkTime ? -1 : 0;
    });
  }

  function sliceByRange(records, checkTime, rangeKey) {
    var hours = rangeKey === '24h' ? 24 : rangeKey === '3d' ? 72 : 168;
    var ref = parseTime({ v: checkTime, f: checkTime });
    var cutoff = ref ? ref.getTime() - hours * 3600000 : 0;
    return records.filter(function (rec) {
      var t = parseTime({ v: rec.checkTime, f: rec.checkTime });
      return t && t.getTime() >= cutoff;
    }).sort(function (a, b) {
      return a.checkTime < b.checkTime ? 1 : a.checkTime > b.checkTime ? -1 : 0;
    });
  }

  function summarizeRange(slice) {
    return { count: slice.length, breachedCount: slice.filter(function (r) { return r.breached; }).length };
  }

  function fmtRangeLabel(rangeKey) {
    return rangeKey === '24h' ? '近24小時' : rangeKey === '3d' ? '近3天' : '近7天';
  }

  /* ---- 排程空窗偵測（純函式；now 由呼叫端注入以利測試） ---- */
  function snapshotAgeMin(checkTime, now) {
    var d = parseTime({ v: checkTime, f: checkTime });
    if (!d || !now) return null;
    return Math.round((now.getTime() - d.getTime()) / 60000);
  }

  function isStale(checkTime, now, thresholdMin) {
    var age = snapshotAgeMin(checkTime, now);
    return age != null && age >= thresholdMin;
  }

  function detectGaps(records, cadenceMin, tolerance) {
    var cad = cadenceMin || 60;
    var tol = tolerance || 1.5;
    var times = (records || []).map(function (r) {
      var t = parseTime({ v: r.checkTime, f: r.checkTime });
      return t ? t.getTime() : null;
    }).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; });
    var gaps = [];
    for (var i = 1; i < times.length; i++) {
      var deltaMin = (times[i] - times[i - 1]) / 60000;
      if (deltaMin > cad * tol) {
        var missing = Math.round(deltaMin / cad) - 1;
        if (missing > 0) {
          gaps.push({ from: fmtDatetime(new Date(times[i - 1])), to: fmtDatetime(new Date(times[i])), missing: missing });
        }
      }
    }
    return gaps;
  }

  function summarizeGaps(gaps) {
    return {
      gapCount: gaps.length,
      missingCount: gaps.reduce(function (a, g) { return a + g.missing; }, 0)
    };
  }

  function sha256Hex(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function weekTicks(checkTime) {
    var base = parseTime({ v: checkTime });
    if (!base) return ['', '', '', ''];
    var p = function (n) { return String(n).padStart(2, '0'); };
    var lab = function (h) {
      var x = new Date(base.getTime() - h * 3600000);
      return p(x.getMonth() + 1) + '/' + p(x.getDate()) + ' ' + p(x.getHours()) + '時';
    };
    return [lab(144), lab(96), lab(48), lab(0)];
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
    parseTime: parseTime, extractHistory: extractHistory, buildTrend: buildTrend,
    mkColors: mkColors, filterRows: filterRows, escHtml: escHtml,
    slaHuman: slaHuman, human: human, weekTicks: weekTicks, sha256Hex: sha256Hex,
    extractRecords: extractRecords, sliceByRange: sliceByRange,
    parseCsv: parseCsv, normalizeCsvFields: normalizeCsvFields,
    rowsFromCsv: rowsFromCsv, historyForRow: historyForRow,
    summarizeRange: summarizeRange, fmtRangeLabel: fmtRangeLabel,
    snapshotAgeMin: snapshotAgeMin, isStale: isStale,
    detectGaps: detectGaps, summarizeGaps: summarizeGaps
  };
});
