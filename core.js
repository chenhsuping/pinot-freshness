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

  return { parseGvizText: parseGvizText, cellV: cellV, cellF: cellF };
});
