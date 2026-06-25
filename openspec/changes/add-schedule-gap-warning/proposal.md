## Why

監測排程（每小時寫入 Google Sheet 的 R 腳本）一旦中斷或漏跑，儀表板目前只會默默顯示最後一筆快照，使用者**無法察覺資料其實已經過時**，也看不出歷史中有整點缺漏。實際營運已出現此情況：某次快照停在數小時前、歷史中有多個整點沒有資料，但畫面毫無提示，導致誤把過時資料當成最新。本變更讓「排程空窗」一眼可見。

## What Changes

- 新增**整體過時警示橫幅**：當最新快照的 `Check_Time` 距現在超過門檻（預設 90 分鐘，可於 `config.js` 設定）時，於全域 sticky 頁首下方顯示琥珀色警示條，文字為「排程可能中斷 · 資料已 {人性化} 未更新 · 最後更新 {Check_Time}」，於所有畫面皆顯示。
- 新增**歷史空窗偵測**：詳情頁「歷史」頁籤依排程節奏（預設 60 分鐘）偵測相鄰檢查記錄間的整點缺漏，於摘要列後加註「⚠ {K} 個排程空窗（缺 {M} 筆）」；無空窗則不顯示。
- 新增純資料函式（`core.js`）：`snapshotAgeMin`、`isStale`、`detectGaps`、`summarizeGaps`，皆為可單元測試的純函式（時間以參數注入）。
- 新增設定項（`config.js`）：`scheduleCadenceMin`、`staleThresholdMin`、`gapToleranceFactor`。
- 新增琥珀色警示設計 token（有別於逾時紅）。
- 同步調整 `dashboard-ui` 規格以反映附件設計稿已落地的項目（趨勢圖 hover 檢視、峰值／平均／谷值統計磚、卡片 hover/press 與逾時點脈動、頁籤淡入動畫）。

## Capabilities

### New Capabilities
- `schedule-freshness`: 以最新快照時間與歷史記錄推導「排程是否過時／有空窗」的偵測規則（純資料邏輯），供 UI 呈現警示。

### Modified Capabilities
- `dashboard-ui`: 新增整體過時警示橫幅與歷史空窗加註；並補齊附件設計稿已實作的趨勢圖 hover 檢視、統計磚與微互動規格。

## Impact

- `core.js`：新增 4 個純函式與 UMD 匯出；不更動既有函式。
- `views.js`：歷史頁籤摘要列加註空窗；趨勢卡 hover／統計磚規格化（已實作）。
- `app.js`：`renderHeader` 下方插入過時警示條；以瀏覽器時鐘提供 `now`（假設瀏覽器時區＝資料時區 Asia/Taipei，門檻可設定）。
- `config.js`：新增 3 個設定項。
- `styles.css`：新增琥珀色警示條樣式。
- 測試：`core.test.js` 新增偵測函式測試；`views.test.js` 新增空窗加註測試；`MANUAL-TESTS.md` 新增驗收案例。
- 無外部相依、無破壞性變更；R 腳本與憑證不受影響（排程修復屬主機端，超出本儲存庫範圍）。
