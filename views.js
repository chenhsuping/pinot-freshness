/* views.js — 純 HTML 產生器（無 DOM）。瀏覽器掛 window.DFViews；Node require 取 module.exports。 */
(function (root, factory) {
  var Core = (typeof require !== 'undefined') ? require('./core.js') : root.DFCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(Core);
  else root.DFViews = factory(Core);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  function cardTable(row) {
    var m = C.mkColors(row);
    return '<button data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:12px 13px;cursor:pointer;">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;">' +
        '<div style="font:600 13px \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + C.escHtml(row.table) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + C.escHtml(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + C.slaHuman(row.sla) + '</span></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;">' +
        '<div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + C.escHtml(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span>' +
      '</div></button>';
  }

  /* 首頁：mode segmented + BU pills + 卡片格 */
  function viewMenu(p) {
    var rows = p.rows, esc = C.escHtml;
    var modeSeg = [['byGroup', '依群組'], ['byTable', '依資料表']].map(function (o) {
      var on = p.mode === o[0];
      return '<button data-action="mode" data-val="' + o[0] + '" style="border:none;cursor:pointer;padding:9px 18px;border-radius:9px;font:600 13px \'Space Grotesk\',sans-serif;background:' +
        (on ? '#FFFFFF' : 'transparent') + ';color:' + (on ? '#1C2433' : '#6B7585') + ';box-shadow:' + (on ? '0 1px 3px rgba(20,30,50,.14)' : 'none') + ';">' + o[1] + '</button>';
    }).join('');
    var buSeg = ['MCD', 'BKW'].map(function (b) {
      var on = p.bu === b;
      return '<button data-action="bu" data-val="' + b + '" style="border:1px solid ' + (on ? '#232B3D' : '#DCE0E7') + ';cursor:pointer;padding:8px 16px;border-radius:999px;font:600 12px \'JetBrains Mono\',monospace;background:' +
        (on ? '#232B3D' : '#FFFFFF') + ';color:' + (on ? '#FFFFFF' : '#5E6675') + ';">' + b + '</button>';
    }).join('');
    var controls = '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:clamp(18px,3vw,26px);">' +
      '<div style="display:inline-flex;gap:4px;background:#E5E9F0;border-radius:12px;padding:4px;">' + modeSeg + '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;"><span style="font:500 11px \'Space Grotesk\',sans-serif;color:#8A919A;">BU</span>' + buSeg + '</div>' +
      '</div>';
    var listLabel = '<div style="font:600 11px \'Space Grotesk\',sans-serif;color:#9AA3AF;letter-spacing:.5px;margin-bottom:11px;">' +
      (p.mode === 'byGroup' ? '群組 GROUP_NAME' : '資料表 TABLE_NAME') + '</div>';
    var grid;
    if (p.mode === 'byGroup') {
      var cards = C.groupsInBU(rows, p.bu).map(function (g) {
        var t = rows.filter(function (r) { return r.group === g; });
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
      var tcards = C.distinctTables(rows, p.bu).map(function (tb) {
        var arr = rows.filter(function (r) { return r.bu === p.bu && r.table === tb; });
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
    return controls + listLabel + grid;
  }

  /* 群組資料表列表：篩選 chips + 卡片格（標題/返回在全域 header） */
  function viewGroupTables(p) {
    var all = p.rows.filter(function (r) { return r.group === p.group; });
    var chips = [['all', '全部'], ['breach', '只看異常'], ['rt', 'Realtime'], ['off', 'Offline']].map(function (o) {
      var on = p.gFilter === o[0];
      return '<button data-action="gfilter" data-val="' + o[0] + '" style="flex:0 0 auto;border:none;cursor:pointer;padding:8px 15px;border-radius:999px;font:600 12px \'Space Grotesk\',sans-serif;background:' + (on ? '#232B3D' : '#EEF1F5') + ';color:' + (on ? '#FFFFFF' : '#555E6B') + ';">' + o[1] + '</button>';
    }).join('');
    var list = C.filterRows(all, p.gFilter).map(cardTable).join('');
    return '<div class="scrollarea" style="display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap;">' + chips + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:9px;">' + list + '</div>';
  }

  /* 資料表跨群組列表（標題/返回在全域 header） */
  function viewTableGroups(p) {
    var esc = C.escHtml;
    var rows = C.groupsInBU(p.rows, p.bu).map(function (g) {
      return p.rows.find(function (r) { return r.group === g && r.table === p.table; });
    }).filter(Boolean);
    var cards = rows.map(function (row) {
      var m = C.mkColors(row);
      return '<button data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:14px;cursor:pointer;">' +
        '<div style="width:9px;height:9px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
        '<div style="flex:1;min-width:0;"><div style="font:600 15px \'Space Grotesk\',sans-serif;">' + esc(row.group) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;margin-top:6px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + esc(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + C.slaHuman(row.sla) + '</span></div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;"><div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + esc(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span></div></button>';
    }).join('');
    return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:9px;">' + cards + '</div>';
  }

  /* 詳情頁：狀態條 + 趨勢卡 + 資訊卡（標題/返回在全域 header） */
  function viewDetail(p) {
    var esc = C.escHtml, row = p.row;
    if (!row) return '<div class="center-state"><div class="msg">找不到資料</div></div>';
    var br = row.status === 'Breached';
    var accentBg = br ? '#FCEAE7' : '#E6F4EC', accentText = br ? '#C53D34' : '#1F8A5B', accentLine = br ? '#E0584A' : '#34A06B';
    var hist = p.history;
    var downtimeHuman = '—', slaWeekText = '—', downtimeMinText = '—', trendInner;
    if (!hist || hist.status === 'loading') {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div>';
    } else if (hist.status === 'error') {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">歷史讀取失敗</div>';
    } else if (!hist.points || !hist.points.length) {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">尚無歷史資料點</div>';
    } else {
      var pts = hist.points;
      var downtime = pts.reduce(function (a, q) { return a + q.delay; }, 0);
      var slaWeek = row.sla * pts.length;
      downtimeHuman = C.human(downtime);
      downtimeMinText = downtime + ' 分';
      slaWeekText = slaWeek + ' 分';
      var tr = C.buildTrend(pts, row.sla);
      var ticks = C.weekTicks(p.checkTime);
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
      '<div style="display:flex;align-items:center;justify-content:space-between;background:' + accentBg + ';border-radius:12px;padding:14px 16px;">' +
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
          infoRow('檢查時間', p.checkTime) +
          infoRow('資料更新時間', row.maxUpdate) +
          infoRow('近七天 SLA 總時數', slaWeekText) +
          infoRow('近七天累積 Downtime', downtimeMinText, accentText, true) +
        '</div>' +
      '</div></div>';
  }

  return {
    viewMenu: viewMenu, viewGroupTables: viewGroupTables, viewTableGroups: viewTableGroups,
    viewDetail: viewDetail, cardTable: cardTable
  };
});
