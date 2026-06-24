/* 資料觀測儀表板 — app.js（零相依，純 vanilla）
 * 資料：直接讀 Google Sheet gviz；UI：Slate Ops 四畫面 + 真實 24h 趨勢。
 */
(function () {
  'use strict';
  var CONFIG = window.CONFIG;
  var AUTH_KEY = 'df_auth_ok';

  // HK 欄位索引（A..L）
  var COL = { bu: 0, group: 1, table: 2, source: 3, sla: 4, checkTime: 5, maxUpdate: 6, unixms: 7, delay: 8, delayHuman: 9, status: 10, count: 11 };

  var state = {
    region: CONFIG.defaultRegion,
    mode: 'byGroup',
    bu: 'MCD',
    stack: [],
    gFilter: 'all',
    status: 'loading',   // loading | ready | error
    error: null,
    data: [],            // 最新快照（共同模型）
    checkTime: null,
    history: {},         // id -> {status, points}
  };

  var app = document.getElementById('app');
  var refreshTimer = null;

  /* ----------------------------- 資料層 ----------------------------- */
  function gvizUrl(region, tq) {
    var r = CONFIG.regions[region];
    return 'https://docs.google.com/spreadsheets/d/' + r.id +
      '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(r.tab) +
      '&tq=' + encodeURIComponent(tq);
  }

  function gvizQuery(region, tq) {
    return fetch(gvizUrl(region, tq), { credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      var s = text.indexOf('{'), e = text.lastIndexOf('}');
      if (s < 0 || e < 0) throw new Error('gviz 回應格式異常');
      var json = JSON.parse(text.slice(s, e + 1));
      if (json.status === 'error') {
        var msg = json.errors && json.errors[0] && (json.errors[0].detailed_message || json.errors[0].message);
        throw new Error(msg || 'gviz 查詢錯誤');
      }
      return json.table || { cols: [], rows: [] };
    });
  }

  function cellV(row, i) { return row.c && row.c[i] ? row.c[i].v : null; }
  function cellF(row, i) {
    if (!row.c || !row.c[i]) return null;
    return row.c[i].f != null ? row.c[i].f : row.c[i].v;
  }

  function normalize(region, r) {
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
      status: String(cellV(r, COL.status)),
    };
  }

  function loadSnapshot() {
    return gvizQuery(state.region, 'select * order by F desc limit 150').then(function (table) {
      var rows = (table.rows || []).map(function (r) { return normalize(state.region, r); })
        .filter(function (x) { return x && x.checkTime && x.checkTime !== 'null'; });
      if (!rows.length) return { rows: [], checkTime: null };
      var latest = rows[0].checkTime;        // 已 order by F desc，最新批次在前
      var snap = rows.filter(function (x) { return x.checkTime === latest; });
      snap.forEach(function (x, i) { x.id = i; });
      return { rows: snap, checkTime: latest };
    });
  }

  function gEsc(s) { return String(s).replace(/'/g, ''); }

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

  function loadHistory(row) {
    var tq = "select F, I where A = '" + gEsc(row.bu) + "' and B = '" + gEsc(row.group) +
      "' and C = '" + gEsc(row.table) + "' order by F desc limit 800";
    return gvizQuery(row.region, tq).then(function (table) {
      var pts = (table.rows || []).map(function (r) {
        return { t: parseTime(r.c && r.c[0]), delay: Number(cellV(r, 1)) };
      }).filter(function (p) { return p.t && !isNaN(p.delay); });
      pts.reverse(); // 時間序
      if (!pts.length) return [];
      var last = pts[pts.length - 1].t.getTime();
      var cutoff = last - CONFIG.trendDays * 86400 * 1000; // 近七天視窗
      var within = pts.filter(function (p) { return p.t.getTime() >= cutoff; });
      return within.length ? within : pts;
    });
  }

  /* --------------------------- 衍生資料 --------------------------- */
  function rowsOfBU(bu) { return state.data.filter(function (r) { return r.bu === bu; }); }

  function groupsInBU(bu) {
    var seen = [], out = [];
    rowsOfBU(bu).forEach(function (r) { if (seen.indexOf(r.group) < 0) { seen.push(r.group); out.push(r.group); } });
    return out;
  }

  function distinctTables(bu) {
    var seen = [];
    rowsOfBU(bu).forEach(function (r) { if (seen.indexOf(r.table) < 0) seen.push(r.table); });
    return seen;
  }

  function buOf(group) { var r = state.data.find(function (x) { return x.group === group; }); return r ? r.bu : ''; }

  /* ----------------------------- 配色 ----------------------------- */
  function mk(row) {
    var br = row.status === 'Breached';
    return {
      id: row.id, table: row.table, group: row.group, source: row.source, sla: row.sla,
      delayHuman: row.delayHuman,
      accent: br ? '#E0584A' : '#EAEDF2',
      dotColor: br ? '#E0584A' : '#34A06B',
      delayColor: br ? '#C53D34' : '#1F8A5B',
      pillBg: br ? '#FCEAE7' : '#E6F4EC',
      pillText: br ? '#C53D34' : '#1F8A5B',
      pillLabel: br ? '逾時' : '正常',
      srcBg: row.source === 'Realtime' ? '#E7F0FE' : '#EEF1F5',
      srcText: row.source === 'Realtime' ? '#2F6FE0' : '#5E6675',
    };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // SLA 文字人性化：整除 60 → 小時，否則 → 分
  function slaHuman(sla) { return sla % 60 === 0 ? (sla / 60) + '小時' : sla + '分'; }

  // 分鐘 → 「N天N時N分」
  function human(m) {
    m = Math.max(0, Math.round(m));
    var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return (d ? d + '天' : '') + ((h || d) ? h + '時' : '') + mm + '分';
  }

  // 近七天 X 軸 4 個日期刻度（依 checkTime 往前推 144/96/48/0 小時），格式 MM/DD HH時
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

  /* ----------------------------- 渲染 ----------------------------- */
  function render() {
    if (state.status === 'loading') { app.innerHTML = wrap(centerState('<div class="spinner"></div><div class="msg">載入中…</div>')); return; }
    if (state.status === 'error') {
      app.innerHTML = wrap(centerState(
        '<div class="msg">讀取失敗：' + esc(state.error || '') + '<br>請確認該 Google Sheet 已設為「知道連結的人皆可檢視」。</div>' +
        '<button data-action="refresh">重試</button>'));
      return;
    }
    var screen = state.stack.length ? state.stack[state.stack.length - 1].type : 'menu';
    var html;
    if (screen === 'menu') html = renderMenu();
    else if (screen === 'groupTables') html = renderGroupTables(state.stack[state.stack.length - 1]);
    else if (screen === 'tableGroups') html = renderTableGroups(state.stack[state.stack.length - 1]);
    else if (screen === 'detail') html = renderDetail(state.stack[state.stack.length - 1]);
    app.innerHTML = wrap(html);
  }

  function wrap(inner) {
    return '<div style="max-width:1180px; margin:0 auto; padding:clamp(18px,3vw,34px) clamp(16px,4vw,32px) 56px;">' + inner + '</div>';
  }
  function centerState(inner) { return '<div class="center-state">' + inner + '</div>'; }

  function toolbarBtns() {
    return '<button data-action="refresh" title="重新整理" style="width:38px;height:38px;border:1px solid #DCE0E7;border-radius:11px;background:#FFFFFF;cursor:pointer;font-size:15px;color:#3A424C;">↻</button>' +
      '<button data-action="logout" title="登出" style="width:38px;height:38px;border:1px solid #DCE0E7;border-radius:11px;background:#FFFFFF;cursor:pointer;font-size:15px;color:#3A424C;">⎋</button>';
  }

  function renderMenu() {
    var nGroups = 0, seen = [];
    state.data.forEach(function (r) { if (seen.indexOf(r.group) < 0) { seen.push(r.group); nGroups++; } });
    var sub = '更新 ' + esc(state.checkTime || '—') + ' · ' + nGroups + ' 群組 / ' + state.data.length + ' 張表';

    var modeSeg = [['byGroup', '依群組'], ['byTable', '依資料表']].map(function (o) {
      var on = state.mode === o[0];
      return '<button data-action="mode" data-val="' + o[0] + '" style="border:none;cursor:pointer;padding:9px 18px;border-radius:9px;font:600 13px \'Space Grotesk\',sans-serif;background:' +
        (on ? '#FFFFFF' : 'transparent') + ';color:' + (on ? '#1C2433' : '#6B7585') + ';box-shadow:' + (on ? '0 1px 3px rgba(20,30,50,.14)' : 'none') + ';">' + o[1] + '</button>';
    }).join('');

    var buSeg = ['MCD', 'BKW'].map(function (b) {
      var on = state.bu === b;
      return '<button data-action="bu" data-val="' + b + '" style="border:1px solid ' + (on ? '#232B3D' : '#DCE0E7') + ';cursor:pointer;padding:8px 16px;border-radius:999px;font:600 12px \'JetBrains Mono\',monospace;background:' +
        (on ? '#232B3D' : '#FFFFFF') + ';color:' + (on ? '#FFFFFF' : '#5E6675') + ';">' + b + '</button>';
    }).join('');

    var header =
      '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between;margin-bottom:clamp(18px,3vw,26px);">' +
        '<div><div style="font:600 clamp(22px,3.4vw,30px) \'Space Grotesk\',sans-serif;letter-spacing:-.6px;">資料觀測</div>' +
        '<div style="font:500 12px \'JetBrains Mono\',monospace;color:#69727F;margin-top:6px;">' + sub + '</div></div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
          '<div style="display:inline-flex;gap:4px;background:#E5E9F0;border-radius:12px;padding:4px;">' + modeSeg + '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;"><span style="font:500 11px \'Space Grotesk\',sans-serif;color:#8A919A;">BU</span>' + buSeg + '</div>' +
          '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div>' +
        '</div>' +
      '</div>';

    var listLabel = '<div style="font:600 11px \'Space Grotesk\',sans-serif;color:#9AA3AF;letter-spacing:.5px;margin-bottom:11px;">' +
      (state.mode === 'byGroup' ? '群組 GROUP_NAME' : '資料表 TABLE_NAME') + '</div>';

    var grid;
    if (state.mode === 'byGroup') {
      var cards = groupsInBU(state.bu).map(function (g) {
        var t = state.data.filter(function (r) { return r.group === g; });
        var br = t.filter(function (r) { return r.status === 'Breached'; }).length;
        var bad = br > 0, health = Math.round((t.length - br) / t.length * 100);
        return '<button data-action="openGroup" data-group="' + esc(g) + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-radius:16px;padding:15px;cursor:pointer;">' +
          '<div style="width:42px;height:42px;border-radius:12px;background:' + (bad ? '#FCEAE7' : '#E6F4EC') + ';display:flex;align-items:center;justify-content:center;font:600 13px \'JetBrains Mono\',monospace;color:' + (bad ? '#C53D34' : '#1F8A5B') + ';flex:0 0 auto;">' + health + '%</div>' +
          '<div style="flex:1;min-width:0;"><div style="font:600 15px \'Space Grotesk\',sans-serif;">' + esc(g) + '</div>' +
          '<div style="font:500 11.5px \'JetBrains Mono\',monospace;color:' + (bad ? '#C53D34' : '#1F8A5B') + ';margin-top:4px;">' + (bad ? (br + ' 張逾時') : '全部正常') + ' · 共 ' + t.length + ' 張</div></div>' +
          '<div style="font-size:19px;color:#C2C8CF;flex:0 0 auto;">›</div></button>';
      }).join('');
      grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(264px,1fr));gap:11px;">' + cards + '</div>';
    } else {
      var tcards = distinctTables(state.bu).map(function (tb) {
        var arr = rowsOfBU(state.bu).filter(function (r) { return r.table === tb; });
        var br = arr.filter(function (r) { return r.status === 'Breached'; }).length, bad = br > 0;
        return '<button data-action="openTable" data-table="' + esc(tb) + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-radius:14px;padding:13px 14px;cursor:pointer;">' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + (bad ? '#E0584A' : '#34A06B') + ';flex:0 0 auto;"></div>' +
          '<div style="flex:1;min-width:0;font:600 13px \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(tb) + '</div>' +
          '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;flex:0 0 auto;">' + arr.length + ' 群組</span>' +
          '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 9px;border-radius:7px;background:' + (bad ? '#FCEAE7' : '#E6F4EC') + ';color:' + (bad ? '#C53D34' : '#1F8A5B') + ';flex:0 0 auto;">' + (bad ? (br + ' 逾時') : '正常') + '</span>' +
          '<div style="font-size:18px;color:#C2C8CF;flex:0 0 auto;">›</div></button>';
      }).join('');
      grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:9px;">' + tcards + '</div>';
    }
    return header + listLabel + grid;
  }

  function backBtn() {
    return '<button data-action="back" style="width:38px;height:38px;border:1px solid #E3E6EA;border-radius:11px;background:#FFFFFF;cursor:pointer;font-size:19px;color:#3A424C;display:flex;align-items:center;justify-content:center;flex:0 0 auto;">‹</button>';
  }

  function tableCard(row) {
    var m = mk(row);
    return '<button data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:12px 13px;cursor:pointer;">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;">' +
        '<div style="font:600 13px \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(row.table) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + esc(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + slaHuman(row.sla) + '</span></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;">' +
        '<div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + esc(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span>' +
      '</div></button>';
  }

  function renderGroupTables(top) {
    var all = state.data.filter(function (r) { return r.group === top.group; });
    var br = all.filter(function (r) { return r.status === 'Breached'; }).length;
    var meta = br > 0 ? (all.length + ' 張 · ' + br + ' 逾時') : (all.length + ' 張 · 全部正常');
    var chips = [['all', '全部'], ['breach', '只看異常'], ['rt', 'Realtime'], ['off', 'Offline']].map(function (o) {
      var on = state.gFilter === o[0];
      return '<button data-action="gfilter" data-val="' + o[0] + '" style="flex:0 0 auto;border:none;cursor:pointer;padding:8px 15px;border-radius:999px;font:600 12px \'Space Grotesk\',sans-serif;background:' + (on ? '#232B3D' : '#EEF1F5') + ';color:' + (on ? '#FFFFFF' : '#555E6B') + ';">' + o[1] + '</button>';
    }).join('');
    var list = filt(all, state.gFilter).map(tableCard).join('');
    return '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">' + backBtn() +
        '<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:9px;"><div style="font:600 clamp(18px,2.6vw,22px) \'Space Grotesk\',sans-serif;">' + esc(top.group) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 8px;border-radius:6px;background:#EEF1F5;color:#5E6675;">' + esc(buOf(top.group)) + '</span></div>' +
        '<div style="font:500 12px \'JetBrains Mono\',monospace;color:' + (br > 0 ? '#C53D34' : '#1F8A5B') + ';margin-top:4px;">' + meta + '</div></div>' +
        '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div></div>' +
      '<div class="scrollarea" style="display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap;">' + chips + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:9px;">' + list + '</div>';
  }

  function filt(list, f) {
    if (f === 'breach') return list.filter(function (r) { return r.status === 'Breached'; });
    if (f === 'rt') return list.filter(function (r) { return r.source === 'Realtime'; });
    if (f === 'off') return list.filter(function (r) { return r.source === 'Offline'; });
    return list;
  }

  function renderTableGroups(top) {
    var rows = groupsInBU(top.bu).map(function (g) {
      return state.data.find(function (r) { return r.group === g && r.table === top.table; });
    }).filter(Boolean);
    var cards = rows.map(function (row) {
      var m = mk(row);
      return '<button data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:14px;cursor:pointer;">' +
        '<div style="width:9px;height:9px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
        '<div style="flex:1;min-width:0;"><div style="font:600 15px \'Space Grotesk\',sans-serif;">' + esc(row.group) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;margin-top:6px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + esc(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + slaHuman(row.sla) + '</span></div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;"><div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + esc(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span></div></button>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">' + backBtn() +
        '<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:9px;"><div style="font:600 clamp(16px,2.4vw,20px) \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(top.table) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 8px;border-radius:6px;background:#EEF1F5;color:#5E6675;flex:0 0 auto;">' + esc(top.bu) + '</span></div>' +
        '<div style="font:500 12px \'Space Grotesk\',sans-serif;color:#69727F;margin-top:4px;">此資料表在各 group_name 的最新狀態</div></div>' +
        '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:9px;">' + cards + '</div>';
  }

  function buildTrend(points, sla) {
    var W = 300, top = 6, bottom = 78, plotH = bottom - top;
    var vals = points.map(function (p) { return p.delay; });
    var max = Math.max.apply(null, vals.concat([sla * 1.15, 1]));
    var n = vals.length, step = W / (n > 1 ? (n - 1) : 1);
    var y = function (v) { return bottom - (v / max) * plotH; };
    var line = '', area = 'M0 ' + bottom + ' ';
    vals.forEach(function (v, i) { var x = (i * step).toFixed(1), yy = y(v).toFixed(1); line += (i ? 'L' : 'M') + x + ' ' + yy + ' '; area += 'L' + x + ' ' + yy + ' '; });
    area += 'L' + W + ' ' + bottom + ' Z';
    return { spark: line.trim(), area: area, threshY: y(sla).toFixed(1), lx: ((n - 1) * step).toFixed(1), ly: y(vals[n - 1]).toFixed(1) };
  }

  function renderDetail(top) {
    var row = state.data.find(function (r) { return r.id === top.id; });
    if (!row) return centerState('<div class="msg">找不到資料</div>');
    var br = row.status === 'Breached';
    var accentBg = br ? '#FCEAE7' : '#E6F4EC', accentText = br ? '#C53D34' : '#1F8A5B', accentLine = br ? '#E0584A' : '#34A06B';

    var hist = state.history[top.id];
    var downtimeHuman = '—', slaWeekText = '—', downtimeMinText = '—';
    var trendInner;
    if (!hist || hist.status === 'loading') {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div>';
    } else if (hist.status === 'error') {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">歷史讀取失敗</div>';
    } else if (!hist.points || !hist.points.length) {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">尚無歷史資料點</div>';
    } else {
      var pts = hist.points;
      var downtime = pts.reduce(function (a, p) { return a + p.delay; }, 0); // 近七天 Σ Delay_Time
      var slaWeek = row.sla * pts.length;                                    // 近七天 Σ SLA
      downtimeHuman = human(downtime);
      downtimeMinText = downtime + ' 分';
      slaWeekText = slaWeek + ' 分';
      var tr = buildTrend(pts, row.sla);
      var ticks = weekTicks(state.checkTime);
      trendInner = '<svg viewBox="0 0 300 84" preserveAspectRatio="none" style="width:100%;height:96px;display:block;overflow:visible;">' +
        '<path d="' + tr.area + '" fill="' + accentBg + '" opacity="0.7"></path>' +
        '<line x1="0" y1="' + tr.threshY + '" x2="300" y2="' + tr.threshY + '" stroke="#99A0A8" stroke-width="1.4" stroke-dasharray="4 3"></line>' +
        '<path d="' + tr.spark + '" fill="none" stroke="' + accentLine + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>' +
        '<circle cx="' + tr.lx + '" cy="' + tr.ly + '" r="3.5" fill="' + accentLine + '"></circle></svg>' +
        '<div style="display:flex;justify-content:space-between;margin-top:8px;font:500 9.5px \'JetBrains Mono\',monospace;color:#B0B6BD;">' +
          ticks.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
    }

    function infoRow(label, val, color, last) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;' + (last ? '' : 'border-bottom:1px solid #F2F4F6;') + '">' +
        '<span style="font:500 12px \'Space Grotesk\',sans-serif;color:#7A828C;">' + label + '</span>' +
        '<span style="font:600 12.5px \'JetBrains Mono\',monospace;color:' + (color || '#1C2433') + ';">' + esc(val) + '</span></div>';
    }

    return '<div style="max-width:860px;">' +
      '<div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid #ECEFF2;">' + backBtnSmall() +
        '<div style="flex:1;min-width:0;"><div style="font:600 clamp(15px,2.2vw,18px) \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(row.table) + '</div>' +
        '<div style="font:500 12px \'Space Grotesk\',sans-serif;color:#7A828C;margin-top:3px;">' + esc(row.bu) + ' · ' + esc(row.group) + '</div></div>' +
        '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;background:' + accentBg + ';border-radius:12px;padding:14px 16px;margin-top:16px;">' +
        '<div style="display:flex;align-items:center;gap:9px;"><div style="width:9px;height:9px;border-radius:50%;background:' + accentLine + ';"></div>' +
        '<div style="font:600 14px \'Space Grotesk\',sans-serif;color:' + accentText + ';">近七天累積 Downtime</div></div>' +
        '<div style="font:600 16px \'JetBrains Mono\',monospace;color:' + accentText + ';">' + esc(downtimeHuman) + '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px;">' +
        '<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;padding:16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font:600 13px \'Space Grotesk\',sans-serif;color:#3A424C;">近七天延遲趨勢</div>' +
          '<div style="display:flex;align-items:center;gap:5px;font:500 10px \'JetBrains Mono\',monospace;color:#9AA1AA;"><span style="display:inline-block;width:14px;height:0;border-top:2px dashed #99A0A8;"></span>近七天 SLA 總時數 ' + esc(slaWeekText) + '</div></div>' +
          trendInner +
        '</div>' +
        '<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;overflow:hidden;align-self:start;">' +
          infoRow('檢查時間', state.checkTime) +
          infoRow('資料更新時間', row.maxUpdate) +
          infoRow('近七天 SLA 總時數', slaWeekText) +
          infoRow('近七天累積 Downtime', downtimeMinText, accentText, true) +
        '</div>' +
      '</div></div>';
  }

  function backBtnSmall() {
    return '<button data-action="back" style="width:34px;height:34px;border:1px solid #E3E6EA;border-radius:10px;background:#FFFFFF;cursor:pointer;font-size:18px;line-height:1;color:#3A424C;display:flex;align-items:center;justify-content:center;flex:0 0 auto;">‹</button>';
  }

  /* ----------------------------- 互動 ----------------------------- */
  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.getAttribute('data-action');
    if (a === 'mode') { state.mode = el.getAttribute('data-val'); render(); }
    else if (a === 'bu') { state.bu = el.getAttribute('data-val'); render(); }
    else if (a === 'openGroup') { state.gFilter = 'all'; state.stack.push({ type: 'groupTables', bu: state.bu, group: el.getAttribute('data-group') }); render(); }
    else if (a === 'openTable') { state.stack.push({ type: 'tableGroups', bu: state.bu, table: el.getAttribute('data-table') }); render(); }
    else if (a === 'gfilter') { state.gFilter = el.getAttribute('data-val'); render(); }
    else if (a === 'openDetail') { openDetail(Number(el.getAttribute('data-id'))); }
    else if (a === 'back') { state.stack.pop(); render(); }
    else if (a === 'refresh') { reload(); }
    else if (a === 'logout') { logout(); }
  }

  function currentDetailId() {
    var top = state.stack[state.stack.length - 1];
    return top && top.type === 'detail' ? top.id : null;
  }

  function openDetail(id) {
    state.stack.push({ type: 'detail', id: id });
    render();
    if (!state.history[id]) {
      var row = state.data.find(function (r) { return r.id === id; });
      state.history[id] = { status: 'loading' };
      loadHistory(row).then(function (pts) {
        state.history[id] = { status: 'ready', points: pts };
        if (currentDetailId() === id) render();
      }).catch(function () {
        state.history[id] = { status: 'error' };
        if (currentDetailId() === id) render();
      });
    }
  }

  function reload() {
    state.status = 'loading'; render();
    loadSnapshot().then(function (res) {
      state.data = res.rows; state.checkTime = res.checkTime; state.history = {};
      state.status = 'ready'; render();
    }).catch(function (err) {
      state.status = 'error'; state.error = err.message || String(err); render();
    });
  }

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (CONFIG.refreshMs > 0) refreshTimer = setInterval(function () { if (!state.stack.length) reload(); }, CONFIG.refreshMs);
  }

  /* ----------------------------- 密碼閘 ----------------------------- */
  function sha256Hex(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function logout() { try { localStorage.removeItem(AUTH_KEY); } catch (e) {} location.reload(); }

  function showApp() {
    document.getElementById('gate').setAttribute('hidden', '');
    app.removeAttribute('hidden');
    app.addEventListener('click', onClick);
    reload();
    startAutoRefresh();
  }

  function initGate() {
    var gate = document.getElementById('gate');
    var input = document.getElementById('gate-input');
    var errEl = document.getElementById('gate-err');
    var btn = document.getElementById('gate-btn');
    var ok = false;
    try { ok = localStorage.getItem(AUTH_KEY) === '1'; } catch (e) {}
    if (ok) { showApp(); return; }

    function submit() {
      errEl.textContent = '';
      sha256Hex(input.value).then(function (h) {
        if (h === CONFIG.password_sha256) {
          try { localStorage.setItem(AUTH_KEY, '1'); } catch (e) {}
          showApp();
        } else { errEl.textContent = '密碼錯誤'; input.select(); }
      });
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    gate.removeAttribute('hidden');
    input.focus();
  }

  document.addEventListener('DOMContentLoaded', initGate);
})();
