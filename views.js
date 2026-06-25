/* views.js — 純 HTML 產生器（無 DOM）。瀏覽器掛 window.DFViews；Node require 取 module.exports。 */
(function (root, factory) {
  var Core = (typeof require !== 'undefined') ? require('./core.js') : root.DFCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(Core);
  else root.DFViews = factory(Core);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  function cardTable(row) {
    var m = C.mkColors(row);
    return '<button class="df-card" data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:12px 13px;cursor:pointer;">' +
      '<div class="' + (row.status === 'Breached' ? 'df-dot-breach' : '') + '" style="width:8px;height:8px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
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
        var progColor = !bad ? '#34A06B' : (health >= 50 ? '#E8A23C' : '#E0584A');
        return '<button class="df-card" data-action="openGroup" data-group="' + esc(g) + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-radius:16px;padding:15px;cursor:pointer;">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:0 0 auto;">' +
            '<div style="width:46px;height:46px;border-radius:13px;background:' + (bad ? '#FCEAE7' : '#E6F4EC') + ';display:flex;align-items:center;justify-content:center;font:700 14px \'JetBrains Mono\',monospace;color:' + (bad ? '#C53D34' : '#1F8A5B') + ';">' + health + '%</div>' +
            '<div style="font:600 8.5px \'Space Grotesk\',sans-serif;color:#AEB5BE;letter-spacing:.4px;">健康率</div>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<div style="font:600 15px \'Space Grotesk\',sans-serif;color:#1C2433;">' + esc(g) + '</div>' +
              '<span style="font:500 11px \'JetBrains Mono\',monospace;color:#9AA3AF;">共 ' + t.length + ' 張</span>' +
            '</div>' +
            '<div style="height:6px;background:#EEF1F5;border-radius:999px;margin-top:6px;margin-bottom:4px;">' +
              '<div style="height:6px;border-radius:999px;background:' + progColor + ';width:' + health + '%;"></div>' +
            '</div>' +
            '<div style="font:600 11px \'JetBrains Mono\',monospace;color:' + (bad ? '#C53D34' : '#1F8A5B') + ';">' + (bad ? (br + ' 張逾時') : '全部正常') + '</div>' +
          '</div>' +
          '<div style="font-size:19px;color:#C2C8CF;flex:0 0 auto;">›</div></button>';
      }).join('');
      grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(264px,1fr));gap:11px;">' + cards + '</div>';
    } else {
      var tcards = C.distinctTables(rows, p.bu).map(function (tb) {
        var arr = rows.filter(function (r) { return r.bu === p.bu && r.table === tb; });
        var br = arr.filter(function (r) { return r.status === 'Breached'; }).length, bad = br > 0;
        return '<button class="df-card" data-action="openTable" data-table="' + esc(tb) + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-radius:14px;padding:13px 14px;cursor:pointer;">' +
          '<div class="' + (bad ? 'df-dot-breach' : '') + '" style="width:8px;height:8px;border-radius:50%;background:' + (bad ? '#E0584A' : '#34A06B') + ';flex:0 0 auto;"></div>' +
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
      return '<button class="df-card" data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:14px;cursor:pointer;">' +
        '<div class="' + (row.status === 'Breached' ? 'df-dot-breach' : '') + '" style="width:9px;height:9px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
        '<div style="flex:1;min-width:0;"><div style="font:600 15px \'Space Grotesk\',sans-serif;">' + esc(row.group) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;margin-top:6px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + esc(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + C.slaHuman(row.sla) + '</span></div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;"><div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + esc(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span></div></button>';
    }).join('');
    return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:9px;">' + cards + '</div>';
  }

  /* 詳情頁：頁籤（概覽／歷史）+ 概覽內容或歷史記錄表（標題/返回在全域 header） */
  function viewDetail(p) {
    var esc = C.escHtml, row = p.row;
    if (!row) return '<div class="center-state"><div class="msg">找不到資料</div></div>';
    var tab = p.tab || 'overview';
    var range = p.range || '24h';
    var hist = p.history;
    var br = row.status === 'Breached';
    var accentBg = br ? '#FCEAE7' : '#E6F4EC';
    var accentText = br ? '#C53D34' : '#1F8A5B';
    var accentLine = br ? '#E0584A' : '#34A06B';

    // 將 "YYYY-MM-DD HH:mm:ss" 格式化為 "MM/DD HH:mm"（歷史表格顯示用）
    function fmtShort(s) {
      if (!s) return '';
      var m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
      return m ? m[2] + '/' + m[3] + ' ' + m[4] + ':' + m[5] : s;
    }

    // 頁籤切換列：白底外框＋深藍選中＋每頁籤圓點，符合設計規格
    var tabBar = '<div style="display:flex;gap:4px;background:#FFFFFF;border:1px solid #E6E9EE;border-radius:13px;padding:5px;margin-top:14px;margin-bottom:18px;box-shadow:0 1px 2px rgba(20,30,50,.04);">' +
      [['overview', '概覽'], ['history', '歷史']].map(function (pair) {
        var on = tab === pair[0];
        var dotColor = on ? '#E8C6CF' : '#C9D2DA';
        return '<button data-action="tab" data-val="' + pair[0] + '" style="flex:1;border:none;cursor:pointer;padding:12px 6px 13px;border-radius:9px;font:700 14px \'Space Grotesk\',sans-serif;letter-spacing:.2px;background:' +
          (on ? '#232B3D' : 'transparent') + ';color:' + (on ? '#FFFFFF' : '#7A828C') + ';box-shadow:' + (on ? '0 2px 8px rgba(35,43,61,.26)' : 'none') + ';display:flex;align-items:center;justify-content:center;gap:6px;">' +
          '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + dotColor + ';flex:0 0 auto;"></span>' +
          pair[1] + '</button>';
      }).join('') + '</div>';

    function infoRow(label, val, color, last) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;' + (last ? '' : 'border-bottom:1px solid #F2F4F6;') + '">' +
        '<span style="font:500 12px \'Space Grotesk\',sans-serif;color:#7A828C;">' + label + '</span>' +
        '<span style="font:600 12.5px \'JetBrains Mono\',monospace;color:' + (color || '#1C2433') + ';">' + esc(val) + '</span></div>';
    }

    var body;
    if (!hist || hist.status === 'loading') {
      body = '<div style="height:120px;display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div>';
    } else if (hist.status === 'error') {
      body = '<div style="height:120px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">歷史讀取失敗</div>';
    } else if (tab === 'overview') {
      var pts = hist.records || [];
      var downtimeHuman = '—', slaWeekText = '—', downtimeMinText = '—', trendInner, statTiles = '';
      if (!pts.length) {
        trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">尚無歷史資料點</div>';
      } else {
        var delays = pts.map(function (q) { return q.delay; });
        var downtime = delays.reduce(function (a, b) { return a + b; }, 0);
        var slaWeek = row.sla * pts.length;
        var peak = Math.max.apply(null, delays);
        var low = Math.min.apply(null, delays);
        var avg = Math.round(downtime / delays.length);
        downtimeHuman = C.human(downtime);
        downtimeMinText = downtime + ' 分';
        slaWeekText = slaWeek + ' 分';
        // Reverse to chronological (oldest→left) so chart direction matches axis labels
        var chartPts = pts.slice().reverse();
        var tr = C.buildTrend(chartPts, row.sla);
        var ticks = C.weekTicks(p.checkTime);

        // Default readout: newest point (rightmost on chart)
        var newest = chartPts[chartPts.length - 1];
        var newestTime = newest ? fmtShort(newest.checkTime) : '';
        var newestDelay = newest ? C.human(newest.delayMin) : '';
        var newestBr = newest ? newest.breached : false;
        var nPillBg = newestBr ? '#FCEAE7' : '#E6F4EC';
        var nPillTx = newestBr ? '#C53D34' : '#1F8A5B';
        var nPillLb = newestBr ? '逾時' : '正常';
        var readoutHtml = '<div id="dfReadout" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;height:20px;" ' +
          'data-def-time="最新 ' + esc(newestTime) + '" data-def-delay="' + esc(newestDelay) + '" ' +
          'data-def-pill-bg="' + nPillBg + '" data-def-pill-text="' + nPillTx + '" data-def-pill-label="' + esc(nPillLb) + '">' +
          '<span id="dfReadTime" style="font:500 11px \'JetBrains Mono\',monospace;color:#69727F;">最新 ' + esc(newestTime) + '</span>' +
          '<span id="dfReadVal" style="display:flex;align-items:center;gap:5px;">' +
            '<span style="font:600 12px \'JetBrains Mono\',monospace;color:' + nPillTx + ';">' + esc(newestDelay) + '</span>' +
            ' <span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + nPillBg + ';color:' + nPillTx + ';">' + esc(nPillLb) + '</span>' +
          '</span></div>';

        // Hit-rects: one transparent full-height rect per point for pointer events
        var stepW = tr.pts.length > 1 ? 300 / (tr.pts.length - 1) : 300;
        var halfStep = stepW / 2;
        var hitRects = tr.pts.map(function (pt, i) {
          var cp = chartPts[i];
          var px = parseFloat(pt.x);
          var rx = Math.max(0, px - halfStep);
          var rw = Math.min(300, px + halfStep) - rx;
          return '<rect data-hover-idx="' + i + '" data-x="' + pt.x + '" data-y="' + pt.y + '"' +
            ' data-time="' + esc(fmtShort(cp.checkTime)) + '" data-delay="' + esc(C.human(cp.delayMin)) + '"' +
            ' data-delay-color="' + (cp.breached ? '#C53D34' : '#1F8A5B') + '"' +
            ' data-pill-bg="' + (cp.breached ? '#FCEAE7' : '#E6F4EC') + '"' +
            ' data-pill-text="' + (cp.breached ? '#C53D34' : '#1F8A5B') + '"' +
            ' data-pill-label="' + (cp.breached ? '逾時' : '正常') + '"' +
            ' x="' + rx.toFixed(1) + '" y="0" width="' + rw.toFixed(1) + '" height="84"' +
            ' fill="transparent" style="cursor:crosshair;"></rect>';
        }).join('');

        var pointDots = tr.pts.map(function (pt, i) {
          var cp = chartPts[i];
          var fill = cp.breached ? '#E0584A' : '#34A06B';
          return '<circle r="2.2" cx="' + pt.x + '" cy="' + pt.y + '" fill="' + fill + '" stroke="#FFFFFF" stroke-width="1"></circle>';
        }).join('');

        trendInner = readoutHtml +
          '<svg id="dfTrendSvg" viewBox="0 0 300 84" preserveAspectRatio="none" style="width:100%;height:96px;display:block;overflow:visible;">' +
            '<path d="' + tr.area + '" fill="' + accentBg + '" opacity="0.7"></path>' +
            '<line x1="0" y1="' + tr.threshY + '" x2="300" y2="' + tr.threshY + '" stroke="#99A0A8" stroke-width="1.4" stroke-dasharray="4 3"></line>' +
            '<path d="' + tr.spark + '" fill="none" stroke="' + accentLine + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>' +
            pointDots +
            '<line id="dfHoverLine" x1="0" y1="0" x2="0" y2="84" stroke="#B0B6BD" stroke-width="1" stroke-dasharray="3 2" visibility="hidden"></line>' +
            '<circle cx="' + tr.lx + '" cy="' + tr.ly + '" r="3.5" fill="' + accentLine + '"></circle>' +
            '<circle id="dfHoverDot" cx="0" cy="0" r="3.6" fill="#FFFFFF" stroke="' + accentLine + '" stroke-width="1.5" visibility="hidden"></circle>' +
            hitRects +
          '</svg>' +
          '<div style="display:flex;justify-content:space-between;margin-top:8px;font:500 9.5px \'JetBrains Mono\',monospace;color:#B0B6BD;">' +
            ticks.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
        // 最大值 / 平均 / 最小值 統計磚
        statTiles = '<div style="display:flex;gap:8px;margin-top:13px;">' +
          '<div style="flex:1;background:#F7F9FB;border-radius:10px;padding:8px 10px;">' +
            '<div style="font:500 10px \'Space Grotesk\',sans-serif;color:#8A919A;">最大值</div>' +
            '<div style="font:600 13px \'JetBrains Mono\',monospace;color:#C53D34;margin-top:2px;">' + esc(C.human(peak)) + '</div></div>' +
          '<div style="flex:1;background:#F7F9FB;border-radius:10px;padding:8px 10px;">' +
            '<div style="font:500 10px \'Space Grotesk\',sans-serif;color:#8A919A;">平均</div>' +
            '<div style="font:600 13px \'JetBrains Mono\',monospace;color:#3A424C;margin-top:2px;">' + esc(C.human(avg)) + '</div></div>' +
          '<div style="flex:1;background:#F7F9FB;border-radius:10px;padding:8px 10px;">' +
            '<div style="font:500 10px \'Space Grotesk\',sans-serif;color:#8A919A;">最小值</div>' +
            '<div style="font:600 13px \'JetBrains Mono\',monospace;color:#1F8A5B;margin-top:2px;">' + esc(C.human(low)) + '</div></div>' +
          '</div>';
      }
      body = '<div style="animation:scrFade .26s ease both;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;background:' + accentBg + ';border-radius:12px;padding:14px 16px;">' +
          '<div style="display:flex;align-items:center;gap:9px;"><div class="' + (br ? 'df-dot-breach' : '') + '" style="width:9px;height:9px;border-radius:50%;background:' + accentLine + ';"></div>' +
          '<div style="font:600 14px \'Space Grotesk\',sans-serif;color:' + accentText + ';">近七天累積 Downtime</div></div>' +
          '<div style="font:600 16px \'JetBrains Mono\',monospace;color:' + accentText + ';">' + esc(downtimeHuman) + '</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px;">' +
          '<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;padding:16px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font:600 13px \'Space Grotesk\',sans-serif;color:#3A424C;">近七天延遲趨勢</div>' +
            '<div style="display:flex;align-items:center;gap:5px;font:500 10px \'JetBrains Mono\',monospace;color:#9AA1AA;"><span style="display:inline-block;width:14px;height:0;border-top:2px dashed #99A0A8;"></span>近七天 SLA 總時數 ' + esc(slaWeekText) + '</div></div>' +
            trendInner + statTiles +
          '</div>' +
          '<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;overflow:hidden;align-self:start;">' +
            infoRow('檢查時間', p.checkTime) +
            infoRow('資料更新時間', row.maxUpdate) +
            infoRow('近七天 SLA 總時數', slaWeekText) +
            infoRow('近七天累積 Downtime', downtimeMinText, accentText, true) +
          '</div>' +
        '</div></div>';
    } else {
      var records = C.sliceByRange(hist.records || [], p.checkTime, range);
      var summary = C.summarizeRange(records);
      var rangeLabel = C.fmtRangeLabel(range);
      var rangePills = [['24h', '近24小時'], ['3d', '近3天'], ['7d', '近7天']].map(function (pair) {
        var on = range === pair[0];
        return '<button data-action="range" data-val="' + pair[0] + '" style="flex:0 0 auto;border:none;cursor:pointer;padding:8px 14px;border-radius:999px;font:600 12px \'Space Grotesk\',sans-serif;background:' +
          (on ? '#232B3D' : '#EEF1F5') + ';color:' + (on ? '#FFFFFF' : '#555E6B') + ';">' + pair[1] + '</button>';
      }).join('');
      // 排程空窗加註（依排程節奏偵測整點缺漏）
      var gapSum = C.summarizeGaps(C.detectGaps(records, p.cadenceMin, p.gapTolerance));
      var gapNote = gapSum.gapCount
        ? '<span style="color:#B26B07;"> · ⚠ ' + gapSum.gapCount + ' 個排程空窗（缺 ' + gapSum.missingCount + ' 筆）</span>'
        : '';
      // 摘要列：JetBrains Mono 符合設計規格
      var summaryLine = '<div style="font:500 11px \'JetBrains Mono\',monospace;color:#69727F;margin:12px 2px 9px;">' +
        esc(rangeLabel) + ' · 共 ' + summary.count + ' 筆 · ' + summary.breachedCount + ' 筆逾時' + gapNote + '</div>';
      var tableHtml;
      if (!records.length) {
        tableHtml = '<div style="padding:32px;text-align:center;font:500 13px \'Space Grotesk\',sans-serif;color:#9AA3AF;">此範圍尚無檢查記錄</div>';
      } else {
        // 使用 flex layout 符合設計，支援手機橫向捲動
        var theadRow = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F7F9FB;border-bottom:1px solid #ECEFF2;">' +
          '<span style="flex:0 0 84px;font:600 11px \'Space Grotesk\',sans-serif;color:#8A919A;">檢查時間</span>' +
          '<span style="flex:0 0 84px;font:600 11px \'Space Grotesk\',sans-serif;color:#8A919A;">資料更新時間</span>' +
          '<span style="flex:1;text-align:right;font:600 11px \'Space Grotesk\',sans-serif;color:#8A919A;">延遲時間</span>' +
          '<span style="flex:0 0 52px;text-align:right;font:600 11px \'Space Grotesk\',sans-serif;color:#8A919A;">逾時狀態</span>' +
          '</div>';
        var dataRows = records.map(function (rec) {
          var delayColor = rec.breached ? '#C53D34' : '#1F8A5B';
          var pillBg = rec.breached ? '#FCEAE7' : '#E6F4EC';
          var pillText = rec.breached ? '#C53D34' : '#1F8A5B';
          var pillLabel = rec.breached ? '逾時' : '正常';
          return '<div class="hist-row" style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #F4F6F8;transition:background .14s ease;">' +
            '<span style="flex:0 0 84px;font:500 12px \'JetBrains Mono\',monospace;color:#3A424C;">' + esc(fmtShort(rec.checkTime)) + '</span>' +
            '<span style="flex:0 0 84px;font:500 12px \'JetBrains Mono\',monospace;color:#3A424C;">' + esc(fmtShort(rec.maxUpdate)) + '</span>' +
            '<span style="flex:1;text-align:right;font:600 12px \'JetBrains Mono\',monospace;color:' + delayColor + ';">' + esc(C.human(rec.delayMin)) + '</span>' +
            '<span style="flex:0 0 52px;display:flex;justify-content:flex-end;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + pillBg + ';color:' + pillText + ';">' + pillLabel + '</span></span>' +
            '</div>';
        }).join('');
        tableHtml = '<div style="overflow-x:auto;border:1px solid #ECEEF1;border-radius:14px;">' +
          '<div style="min-width:404px;background:#FFFFFF;">' + theadRow + dataRows + '</div></div>';
      }
      body = '<div style="animation:scrFade .26s ease both;">' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;">' + rangePills + '</div>' +
        summaryLine + tableHtml + '</div>';
    }

    return '<div style="max-width:860px;">' + tabBar + body + '</div>';
  }

  return {
    viewMenu: viewMenu, viewGroupTables: viewGroupTables, viewTableGroups: viewTableGroups,
    viewDetail: viewDetail, cardTable: cardTable
  };
});
