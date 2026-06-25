# Tasks

## 1. 設定項（config.js）
- [x] 1.1 於 `window.CONFIG` 新增 `scheduleCadenceMin: 60`、`staleThresholdMin: 90`、`gapToleranceFactor: 1.5`，並加註解說明。

## 2. 偵測純函式（core.js）
- [x] 2.1 新增 `snapshotAgeMin(checkTime, now)`：以 `parseTime` 解析 `checkTime`，回傳與 `now` 相差的分鐘（四捨五入）；無法解析回傳 `null`。
- [x] 2.2 新增 `isStale(checkTime, now, thresholdMin)`：年齡為 null 回傳 false；否則 `age >= thresholdMin`。
- [x] 2.3 新增 `detectGaps(records, cadenceMin, tolerance)`：內部依 `Check_Time` 升冪排序，相鄰間隔 > `cadenceMin × tolerance` 記一個空窗 `{from, to, missing}`，`missing = round(間隔/cadenceMin) − 1`；少於 2 筆回傳 `[]`。
- [x] 2.4 新增 `summarizeGaps(gaps)`：回傳 `{gapCount, missingCount}`。
- [x] 2.5 將 4 個函式加入 UMD 匯出。

## 3. 偵測函式測試（test/core.test.js）
- [x] 3.1 `snapshotAgeMin`：正常分鐘差、無效時間回傳 null。
- [x] 3.2 `isStale`：低於／達到門檻、無效時間（false）。
- [x] 3.3 `detectGaps`：連續無空窗、單一空窗（缺 2 筆）、多空窗彙總、記錄 <2 筆。
- [x] 3.4 `summarizeGaps`：空陣列與多筆彙總。

## 4. 過時警示橫幅（styles.css + app.js）
- [x] 4.1 styles.css 新增 `.stale-banner` 琥珀樣式（bg `#FEF4E5`／text `#B26B07`／line `#E08A1E`），sticky 接在頁首下方。
- [x] 4.2 app.js `renderHeader()` 後依 `Core.isStale(state.checkTime, new Date(), CONFIG.staleThresholdMin)` 條件輸出橫幅，文字含 `Core.human(age)` 與 `state.checkTime`；未過時不輸出。

## 5. 歷史頁籤空窗加註（views.js + test/views.test.js）
- [x] 5.1 `viewDetail` 歷史頁籤：對 `records` 執行 `C.detectGaps`，於摘要列後接「· ⚠ {K} 個排程空窗（缺 {M} 筆）」；無空窗不加。
- [x] 5.2 views.test.js：有空窗時摘要含加註；無空窗時不含。

## 6. 驗收與整合
- [x] 6.1 `node --test test/` 全綠。
- [x] 6.2 MANUAL-TESTS.md 新增：過時橫幅顯示/隱藏（H 段）、歷史空窗加註。
- [x] 6.3 index.html `?v=` 版號 +1（破快取）。
- [x] 6.4 commit 並 push 到 GitHub。
