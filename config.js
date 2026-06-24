/* 資料觀測儀表板 — 設定檔
 * 修改這裡即可，不需動 app.js。
 */
window.CONFIG = {
  // 密碼閘（裝飾性，非真正安全）：存的是密碼的 SHA-256 雜湊，不是明碼。
  // 目前對應密碼：53343286@Di
  // 要換密碼：在瀏覽器 console 執行
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('新密碼'))
  //     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  password_sha256: 'a4cce81663dc5e2bf18dfbf8d4a7c64fc4313b49210831c201d25927afe99c37',

  // 資料來源：Google Sheet（須設為「知道連結的人皆可檢視」，gviz 才讀得到）
  // v1 只做 HK；日後加 TW 把下面那行取消註解、並在首頁加地區切換即可。
  defaultRegion: 'HK',
  regions: {
    HK: { id: '1Ti9iywMTyd7mEvnz47NvfQUsIruuhrxyWwFQx1L3pF4', tab: 'HK' },
    // TW: { id: '1htrpPIl9U62rwzLg5UmGui38-8KBMMRhRSIYH11VNus', tab: 'TW' },
  },

  // 自動刷新毫秒數；0 = 關閉（預設）。例如 5 分鐘 = 300000
  refreshMs: 0,

  // 詳情頁趨勢圖回看時數
  trendHours: 24,
};
