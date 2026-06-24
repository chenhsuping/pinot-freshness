/* Pinot 資料新鮮度監測 — app.js（狀態機、事件委派、fetch、密碼閘、DOM 注入）
 * 純資料邏輯在 core.js（DFCore），HTML 產生器在 views.js（DFViews）。 */
(function () {
  'use strict';
  var CONFIG = window.CONFIG;
  var Core = window.DFCore;
  var Views = window.DFViews;
  var AUTH_KEY = 'df_auth_ok';

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
    history: {},         // id -> {status, records}
    tab: 'overview',     // 詳情頁籤：overview | history
    range: '24h',        // 歷史範圍：24h | 3d | 7d
  };

  var app = document.getElementById('app');
  var refreshTimer = null;

  /* ----------------------------- 全域 sticky header ----------------------------- */
  var BRAND_MARK =
    '<div style="width:30px;height:30px;border-radius:9px;background:#8C2F4A;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F2D9E0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M7 3h10l-1 6a4 4 0 0 1-8 0z"></path>' +
        '<line x1="12" y1="13" x2="12" y2="20"></line>' +
        '<line x1="8" y1="20" x2="16" y2="20"></line>' +
      '</svg></div>';

  var HDR_BTN = 'width:36px;height:36px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(255,255,255,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 auto;font-size:15px;color:#FFFFFF;';

  function toolBtnsHdr() {
    return '<div style="display:flex;gap:6px;">' +
      '<button data-action="refresh" title="重新整理" style="' + HDR_BTN + '">↻</button>' +
      '<button data-action="logout" title="登出" style="' + HDR_BTN + '">⎋</button>' +
      '</div>';
  }

  function backBtnHdr() {
    return '<button data-action="back" style="' + HDR_BTN + 'font-size:20px;">‹</button>';
  }

  function renderHeader() {
    var top = state.stack[state.stack.length - 1];
    var screen = top ? top.type : 'menu';
    var esc = Core.escHtml;
    var inner;

    if (screen === 'menu') {
      var nGroups = 0, seen = [];
      state.data.forEach(function (r) { if (seen.indexOf(r.group) < 0) { seen.push(r.group); nGroups++; } });
      var meta = state.checkTime
        ? '更新 ' + esc(state.checkTime) + ' · ' + nGroups + ' 群組 / ' + state.data.length + ' 張表'
        : '載入中…';
      inner = BRAND_MARK +
        '<div style="font:600 clamp(16px,2.4vw,20px) \'Space Grotesk\',sans-serif;color:#FFFFFF;letter-spacing:-.3px;">Pinot 資料新鮮度監測</div>' +
        '<div style="font:500 11px \'JetBrains Mono\',monospace;color:#9AA6B6;margin-left:auto;white-space:nowrap;">' + meta + '</div>' +
        toolBtnsHdr();
    } else if (screen === 'groupTables') {
      var grpRows = state.data.filter(function (r) { return r.group === top.group; });
      var grpBr = grpRows.filter(function (r) { return r.status === 'Breached'; }).length;
      var grpMetaColor = grpBr > 0 ? '#FF9B90' : '#7FE0AE';
      var grpMetaText = grpBr > 0 ? (grpRows.length + ' 張 · ' + grpBr + ' 逾時') : (grpRows.length + ' 張 · 全部正常');
      inner = backBtnHdr() +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:9px;">' +
            '<div style="font:600 clamp(16px,2.4vw,20px) \'Space Grotesk\',sans-serif;color:#FFFFFF;">' + esc(top.group) + '</div>' +
            '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.12);color:#D6DBE4;">' + esc(top.bu) + '</span>' +
          '</div>' +
          '<div style="font:500 11px \'JetBrains Mono\',monospace;color:' + grpMetaColor + ';margin-top:3px;">' + esc(grpMetaText) + '</div>' +
        '</div>' + toolBtnsHdr();
    } else if (screen === 'tableGroups') {
      inner = backBtnHdr() +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:9px;">' +
            '<div style="font:600 clamp(15px,2.2vw,18px) \'JetBrains Mono\',monospace;color:#FFFFFF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(top.table) + '</div>' +
            '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.12);color:#D6DBE4;flex:0 0 auto;">' + esc(top.bu) + '</span>' +
          '</div>' +
          '<div style="font:500 11px \'Space Grotesk\',sans-serif;color:#9AA6B6;margin-top:3px;">此資料表在各 group_name 的最新狀態</div>' +
        '</div>' + toolBtnsHdr();
    } else {
      var detRow = state.data.find(function (r) { return r.id === top.id; }) || {};
      var chipBg = detRow.source === 'Realtime' ? 'rgba(77,163,255,.18)' : 'rgba(255,255,255,.12)';
      var chipText = detRow.source === 'Realtime' ? '#8CC4FF' : '#D6DBE4';
      var slaText = detRow.sla ? 'SLA ' + Core.slaHuman(detRow.sla) : '';
      inner = backBtnHdr() +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font:600 clamp(15px,2.2vw,18px) \'JetBrains Mono\',monospace;color:#FFFFFF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(detRow.table || '') + '</div>' +
          '<div style="display:flex;align-items:center;gap:7px;margin-top:3px;flex-wrap:wrap;">' +
            '<span style="font:500 11px \'Space Grotesk\',sans-serif;color:#9AA6B6;">' + esc((detRow.bu || '') + ' · ' + (detRow.group || '')) + '</span>' +
            (detRow.source ? '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 7px;border-radius:5px;background:' + chipBg + ';color:' + chipText + ';">' + esc(detRow.source) + '</span>' : '') +
            (slaText ? '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA6B6;">' + esc(slaText) + '</span>' : '') +
          '</div>' +
        '</div>' + toolBtnsHdr();
    }

    return '<div style="position:sticky;top:0;z-index:30;background:#232B3D;box-shadow:0 2px 14px rgba(20,28,46,.16);">' +
      '<div style="max-width:1180px;margin:0 auto;padding:clamp(13px,2vw,16px) clamp(16px,4vw,32px);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
      inner +
      '</div></div>';
  }

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
    }).then(function (text) { return Core.parseGvizText(text); });
  }

  function gEsc(s) { return String(s).replace(/'/g, ''); }

  function loadSnapshot() {
    return gvizQuery(state.region, 'select * order by F desc limit 150').then(function (table) {
      var norm = (table.rows || []).map(function (r) { return Core.normalizeRow(state.region, r); });
      return Core.selectLatestSnapshot(norm);
    });
  }

  function loadHistory(row) {
    var tq = "select F, G, I where A = '" + gEsc(row.bu) + "' and B = '" + gEsc(row.group) +
      "' and C = '" + gEsc(row.table) + "' order by F desc limit 800";
    return gvizQuery(row.region, tq).then(function (table) {
      return Core.extractRecords(table, row.sla);
    });
  }

  /* ----------------------------- 渲染 ----------------------------- */
  function wrap(inner) {
    return '<div style="max-width:1180px;margin:0 auto;padding:clamp(18px,3vw,34px) clamp(16px,4vw,32px) 56px;">' + inner + '</div>';
  }
  function centerState(inner) { return '<div class="center-state">' + inner + '</div>'; }

  function render() {
    if (state.status === 'loading') {
      app.innerHTML = renderHeader() + wrap(centerState('<div class="spinner"></div><div class="msg">載入中…</div>'));
      return;
    }
    if (state.status === 'error') {
      app.innerHTML = renderHeader() + wrap(centerState(
        '<div class="msg">讀取失敗：' + Core.escHtml(state.error || '') + '<br>請確認該 Google Sheet 已設為「知道連結的人皆可檢視」。</div>' +
        '<button data-action="refresh">重試</button>'));
      return;
    }
    var top = state.stack[state.stack.length - 1];
    var screen = top ? top.type : 'menu';
    var html;
    if (screen === 'menu') {
      html = Views.viewMenu({ mode: state.mode, bu: state.bu, rows: state.data, checkTime: state.checkTime });
    } else if (screen === 'groupTables') {
      html = Views.viewGroupTables({ group: top.group, bu: top.bu, rows: state.data, gFilter: state.gFilter });
    } else if (screen === 'tableGroups') {
      html = Views.viewTableGroups({ table: top.table, bu: top.bu, rows: state.data });
    } else {
      html = Views.viewDetail({
        row: state.data.find(function (r) { return r.id === top.id; }),
        checkTime: state.checkTime,
        history: state.history[top.id],
        tab: state.tab,
        range: state.range
      });
    }
    app.innerHTML = renderHeader() + wrap(html);
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
    else if (a === 'tab') { state.tab = el.getAttribute('data-val'); render(); }
    else if (a === 'range') { state.range = el.getAttribute('data-val'); render(); }
    else if (a === 'back') { state.stack.pop(); render(); }
    else if (a === 'refresh') { reload(); }
    else if (a === 'logout') { logout(); }
  }

  /* ---- Tier-2 hover patch: mutates only 3 DOM nodes, never calls render() ---- */
  function showHover(rect) {
    var line = document.getElementById('dfHoverLine');
    var dot = document.getElementById('dfHoverDot');
    var readTime = document.getElementById('dfReadTime');
    var readVal = document.getElementById('dfReadVal');
    if (!line || !dot || !readTime || !readVal) return;
    var x = rect.getAttribute('data-x');
    var y = rect.getAttribute('data-y');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    dot.setAttribute('visibility', 'visible');
    readTime.textContent = rect.getAttribute('data-time');
    var dc = rect.getAttribute('data-delay-color');
    var pb = rect.getAttribute('data-pill-bg');
    var pt = rect.getAttribute('data-pill-text');
    var pl = rect.getAttribute('data-pill-label');
    readVal.innerHTML =
      '<span style="font:600 12px \'JetBrains Mono\',monospace;color:' + dc + ';">' + Core.escHtml(rect.getAttribute('data-delay')) + '</span>' +
      ' <span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + pb + ';color:' + pt + ';">' + Core.escHtml(pl) + '</span>';
  }

  function clearHover() {
    var line = document.getElementById('dfHoverLine');
    var dot = document.getElementById('dfHoverDot');
    var readTime = document.getElementById('dfReadTime');
    var readVal = document.getElementById('dfReadVal');
    var readout = document.getElementById('dfReadout');
    if (!line) return;
    line.setAttribute('visibility', 'hidden');
    dot.setAttribute('visibility', 'hidden');
    if (!readout || !readTime || !readVal) return;
    var defPillBg = readout.getAttribute('data-def-pill-bg');
    var defPillTx = readout.getAttribute('data-def-pill-text');
    readTime.textContent = readout.getAttribute('data-def-time');
    readVal.innerHTML =
      '<span style="font:600 12px \'JetBrains Mono\',monospace;color:' + defPillTx + ';">' + Core.escHtml(readout.getAttribute('data-def-delay')) + '</span>' +
      ' <span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + defPillBg + ';color:' + defPillTx + ';">' + Core.escHtml(readout.getAttribute('data-def-pill-label')) + '</span>';
  }

  function onPointerOver(e) {
    var rect = e.target.closest('[data-hover-idx]');
    if (rect) { showHover(rect); return; }
    if (!e.target.closest('#dfTrendSvg')) clearHover();
  }

  function currentDetailId() {
    var top = state.stack[state.stack.length - 1];
    return top && top.type === 'detail' ? top.id : null;
  }

  function openDetail(id) {
    state.tab = 'overview';
    state.range = '24h';
    state.stack.push({ type: 'detail', id: id });
    render();
    if (!state.history[id]) {
      var row = state.data.find(function (r) { return r.id === id; });
      state.history[id] = { status: 'loading' };
      loadHistory(row).then(function (records) {
        state.history[id] = { status: 'ready', records: records };
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
  function logout() { try { localStorage.removeItem(AUTH_KEY); } catch (e) {} location.reload(); }

  function showApp() {
    document.getElementById('gate').setAttribute('hidden', '');
    app.removeAttribute('hidden');
    app.addEventListener('click', onClick);
    app.addEventListener('pointerover', onPointerOver);
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
      Core.sha256Hex(input.value).then(function (h) {
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
