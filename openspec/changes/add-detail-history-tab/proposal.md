## Why

附件「Slate Ops」設計的 `TableDetail` 是**雙頁籤**元件（概覽／歷史），但 v1 只實作了「概覽」——
近七天累積 Downtime 彙總與趨勢。設計中的「歷史」頁籤（可選範圍的逐筆檢查記錄表）尚未存在，
詳情全域頁首也少了設計指定的「來源 chip + SLA」資訊。由於 sheet 本就逐次 append 真實檢查列，
我們可以把設計中原為合成（synthetic）的歷史，直接接上**真實逐筆歷史**，提供可稽核的延遲記錄。

## What Changes

- 詳情頁從單一畫面改為**雙頁籤**：`概覽`（現有近七天彙總，預設）／`歷史`（新增）。
- 新增**歷史頁籤**：日期範圍膠囊（`近24小時` / `近3天` / `近7天`）、摘要列
  「{範圍} · 共 {N} 筆 · {M} 筆逾時」，以及**逐筆檢查記錄表**（四欄：檢查時間、資料更新時間、
  延遲時間、逾時狀態），以**真實歷史**（非合成）渲染；逐筆逾時判定為 `Delay_Time > SLA`。
- **詳情全域頁首**（深藍 sticky bar）的副標增加：來源 chip（深底變體——Realtime
  `rgba(77,163,255,.18)`/`#8CC4FF`、Offline `rgba(255,255,255,.12)`/`#D6DBE4`）＋「SLA {人性化}」。
- **資料層**：詳情歷史查詢由 `select F, I` 擴充為 `select F, G, I`（加入 `Max_Update_Time`），
  並產出含 `checkTime / maxUpdate / delayMin / breached` 的逐筆記錄，供歷史頁籤與既有趨勢共用
  （單次抓取、兩頁籤共享）。
- 範圍篩選於前端對同一份近七天資料切片，不重複打 API。

## Capabilities

### New Capabilities
<!-- 無全新 capability；本變更擴充既有兩個 capability。 -->

### Modified Capabilities
- `dashboard-ui`: 詳情頁新增頁籤切換與「歷史」記錄表畫面；詳情全域頁首副標新增來源 chip 與 SLA。
- `sheet-data-access`: 單表歷史查詢加入 `Max_Update_Time`，並為每筆檢查記錄推導逾時狀態，
  產出供「歷史」記錄表使用的逐筆資料模型。

## Impact

- **修改檔案**：`core.js`（歷史記錄解析／範圍切片／逐筆逾時推導）、`views.js`（詳情頁籤、歷史記錄表）、
  `app.js`（詳情 `tab`／`range` 狀態、擴充 `loadHistory` 取 `G` 欄、詳情頁首來源 chip+SLA）。
- **新增測試**：`test/core.test.js`（記錄解析／範圍切片／逐筆逾時推導）、`test/views.test.js`
  （頁籤、歷史記錄表、空狀態）、`test/integration.test.js`（歷史記錄管線端到端）。
- **外部相依不變**：仍只讀同一 HK Google Sheet 的 gviz 介面；無後端、無新套件、零編譯。
- **不影響**：access-gate、deployment、首頁／群組／資料表清單畫面、概覽頁籤的既有行為。
