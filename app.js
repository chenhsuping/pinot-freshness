/* 資料觀測儀表板 — app.js（狀態機、事件委派、fetch、密碼閘、DOM 注入）
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
    var tq = "select F, I where A = '" + gEsc(row.bu) + "' and B = '" + gEsc(row.group) +
      "' and C = '" + gEsc(row.table) + "' order by F desc limit 800";
    return gvizQuery(row.region, tq).then(function (table) {
      return Core.extractHistory(table, CONFIG.trendDays * 24);
    });
  }

  /* ----------------------------- 渲染 ----------------------------- */
  function wrap(inner) {
    return '<div style="max-width:1180px;margin:0 auto;padding:clamp(18px,3vw,34px) clamp(16px,4vw,32px) 56px;">' + inner + '</div>';
  }
  function centerState(inner) { return '<div class="center-state">' + inner + '</div>'; }

  function render() {
    if (state.status === 'loading') { app.innerHTML = wrap(centerState('<div class="spinner"></div><div class="msg">載入中…</div>')); return; }
    if (state.status === 'error') {
      app.innerHTML = wrap(centerState(
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
        history: state.history[top.id]
      });
    }
    app.innerHTML = wrap(html);
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
