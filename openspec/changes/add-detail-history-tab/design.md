## Context

v1 詳情頁只有「概覽」（近七天累積 Downtime 彙總 + 趨勢 SVG + 資訊卡），對應附件 `TableDetail.dc.html`
的 `overview` 頁籤。附件設計其實是**雙頁籤**元件，另有 `history` 頁籤——可選日期範圍的逐筆檢查記錄表。
附件原型的歷史是**合成的**（依表名決定性產生），但我們的來源 sheet 是 append-only，每次檢查都新增一列，
所以可改接**真實逐筆歷史**。現況下 `app.js` 開啟詳情時已呼叫 `loadHistory(row)` 抓 `select F, I … limit 800`
供趨勢與七天彙總使用；本變更在同一條資料路徑上擴充欄位與衍生模型，避免新增 API 往返。

技術約束沿用 v1：零編譯 vanilla JS、UMD（`core.js`/`views.js` 可在 Node 測試）、純函式產生 HTML 字串、
事件委派、僅讀同一 HK gviz 介面、無新套件。

## Goals / Non-Goals

**Goals:**
- 詳情頁支援 `概覽` / `歷史` 雙頁籤，預設 `概覽`，行為與既有概覽完全相同。
- `歷史` 頁籤提供 `近24小時 / 近3天 / 近7天` 範圍切換、摘要列與逐筆記錄表（檢查時間／資料更新時間／
  延遲時間／逾時狀態），資料為**真實逐筆歷史**。
- 詳情全域頁首副標加上來源 chip（深底變體）與「SLA {人性化}」。
- 單次抓取、兩頁籤與三種範圍共享同一份近七天資料（前端切片）。

**Non-Goals:**
- 不做 TW 區（仍只 HK）。
- 不依附件原型的固定取樣節奏（每小時×24／每3小時×24／每6小時×28）產生「漂亮」列；改顯示**真實**檢查列。
- 不做記錄表分頁；視窗內所有記錄一次呈現（必要時表格內捲動）。
- 不改概覽頁籤、首頁、群組／資料表清單、access-gate、deployment 的既有行為。

## Decisions

**D1：單次抓取、兩頁籤共享。** 將 `loadHistory` 的查詢由 `select F, I` 擴充為 `select F, G, I`
（加入 `Max_Update_Time`），維持 `order by F desc limit 800` 與近七天窗。回傳一份逐筆記錄陣列，
概覽（趨勢 + Σ Downtime）與歷史（記錄表）皆由此切片。
*替代方案*：每切一次範圍打一次 API——否決，資料已在記憶體、且會放大讀取量。

**D2：接真實歷史，不用合成。** 原型因 sheet 為單點快照而合成歷史；我們的 sheet 已逐次累積，故用真實列。
*理由*：可稽核、與概覽趨勢同源一致。

**D3：範圍於前端切片。** `近24小時/近3天/近7天` 對同一份近七天資料以 `checkTime` 窗過濾（24h/72h/168h）。
記錄依 `checkTime` **新到舊**排序（最新在上），符合附件表格。

**D4：逐筆逾時 = `Delay_Time > SLA`。** 每筆記錄的逾時狀態由該筆延遲與此表 SLA 即時推導，
不依賴 `SLA_Status`（K 欄）字串，與附件「a record is breach when its delay > SLA」一致。

**D5：資料更新時間優先用真實 `G` 欄，缺值時回退 `checkTime − delay`。** 原型用「檢查時間−延遲」推算；
我們有真實 `Max_Update_Time` 就用真值，更準確；少數列缺 `G` 時才回退，不致空白。

**D6：頁籤／範圍狀態置於 `app.js` 詳情層 state（`tab`、`range`），開啟新詳情時重設為
`overview` / `24h`。** 對應附件元件本地狀態，最簡單；點頁籤／範圍只重繪、不重抓。

**D7：core.js 純函式拆分以便測試。** 新增 `extractRecords(table, sla)`（解析逐筆 + 衍生 maxUpdate/breached）、
`sliceByRange(records, checkTime, rangeKey)`（範圍切片 + 新到舊）、`summarizeRange(slice)`（共 N / M 逾時）、
`fmtRangeLabel(rangeKey)`。`buildTrend` / 七天彙總改吃 `extractRecords` 的輸出（沿用 `delay` 欄位）。

## Risks / Trade-offs

- **七天記錄列數可能偏多**（每小時檢查 → 近七天約 168 列）→ 表格過長。
  → 緩解：表格容器固定高度內捲；摘要列先給出總數讓使用者有預期。若日後過載再加分頁/取樣，並於 UI 標示。
- **部分列缺 `Max_Update_Time`（G）** → 顯示空白或不一致。
  → 緩解：D5 回退 `checkTime − delay`。
- **範圍內無記錄**（新表或稀疏）→ 空表。
  → 緩解：歷史頁籤顯示「此範圍尚無檢查記錄」空狀態，摘要列顯示「共 0 筆」。
- **趨勢與記錄共用切片但窗不同**（趨勢固定七天、記錄隨範圍）→ 須確保概覽永遠用七天窗、歷史用所選窗，
  兩者由同一份 `extractRecords` 結果各自切片，互不影響。
