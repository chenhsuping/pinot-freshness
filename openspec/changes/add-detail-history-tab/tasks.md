## 1. 資料層（core.js）— 歷史記錄解析與切片

- [ ] 1.1 在 `test/fixtures/` 新增（或擴充）含 `G` 欄（Max_Update_Time）的多筆歷史 gviz fixture，涵蓋逾時與正常、跨 24h/3d/7d 邊界，並含一筆缺 `G` 的列
- [ ] 1.2 寫失敗測試：`extractRecords(table, sla)` 將 `F,G,I` 列解析為 `{checkTime, maxUpdate, delayMin, breached}` 陣列，`breached = delayMin > sla`，缺 `G` 時 `maxUpdate = checkTime − delayMin`
- [ ] 1.3 實作 `extractRecords`，跑測試通過
- [ ] 1.4 寫失敗測試：`sliceByRange(records, checkTime, rangeKey)` 以 24/72/168 小時窗過濾並依 `checkTime` 由新到舊排序（`24h`/`3d`/`7d`）
- [ ] 1.5 實作 `sliceByRange`，跑測試通過
- [ ] 1.6 寫失敗測試：`summarizeRange(slice)` 回 `{count, breachedCount}`；`fmtRangeLabel(rangeKey)` 回「近24小時／近3天／近7天」
- [ ] 1.7 實作 `summarizeRange` 與 `fmtRangeLabel`，跑測試通過
- [ ] 1.8 將 `extractRecords` 加入 `core.js` 的 UMD 匯出；確認既有 `buildTrend`／七天彙總仍可由 records 的 `delay`/`delayMin` 取用（必要時加相容欄位），全測試綠

## 2. 檢視層（views.js）— 詳情頁籤與歷史記錄表

- [ ] 2.1 寫失敗測試：`viewDetail` 接受 `{tab, range}` 並渲染頁籤切換（概覽／歷史，含選中態 `data-action="tab"`）；`tab='overview'` 時維持既有概覽輸出
- [ ] 2.2 實作頁籤切換與 overview 分支，跑測試通過（既有概覽斷言不得回歸）
- [ ] 2.3 寫失敗測試：`tab='history'` 時渲染範圍膠囊（`data-action="range"`，含 24h/3d/7d 與選中態）、摘要列「{範圍} · 共 N 筆 · M 筆逾時」、四欄記錄表（檢查時間／資料更新時間／延遲時間／逾時狀態）
- [ ] 2.4 實作歷史頁籤渲染（記錄列依 `breached` 著色與 pill），跑測試通過
- [ ] 2.5 寫失敗測試：歷史頁籤在 records 為空時顯示空狀態且摘要為「共 0 筆 · 0 筆逾時」
- [ ] 2.6 實作空狀態，跑測試通過

## 3. 應用層（app.js）— 狀態、抓取、頁首

- [ ] 3.1 擴充 `loadHistory` 查詢為 `select F, G, I … order by F desc limit 800`，改用 `Core.extractRecords` 回傳逐筆記錄；確認概覽趨勢／七天彙總仍正確
- [ ] 3.2 在詳情 state 加入 `tab`（預設 `overview`）與 `range`（預設 `24h`）；`openDetail` 時重設兩者
- [ ] 3.3 事件委派處理 `data-action="tab"` 與 `data-action="range"`（只重繪、不重抓）；`render()` 詳情分支把 `tab`/`range` 與切片後 records 傳給 `viewDetail`
- [ ] 3.4 詳情全域頁首（`renderHeader` detail 變體）副標加入來源 chip（深底變體）＋「SLA {人性化}」
- [ ] 3.5 手動驗證：開啟一張 Breached 表 → 概覽如常；切歷史 → 預設近24小時、列出真實逐筆、切 3天/7天即時切片；頁首顯示來源 chip+SLA

## 4. 迴歸與文件

- [ ] 4.1 寫／更新 `test/integration.test.js`：parse → extractRecords → sliceByRange → summarizeRange → `viewDetail(history)` 端到端
- [ ] 4.2 跑 `node --test` 全綠（既有 28 + 新增）
- [ ] 4.3 更新 `docs/MANUAL-TESTS.md` D 區：新增 D5（頁籤切換）、D6（歷史範圍切片與記錄表）、D7（詳情頁首來源/SLA）
- [ ] 4.4 commit；如需部署則 `git push`（沿用既有 repo 與 Pages）
