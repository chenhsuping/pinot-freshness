# Tasks

## 1. CSV 解析與資料建構（core.js）
- [x] 1.1 新增 `parseCsv`：狀態機處理引號欄位、`""` 轉義、欄內逗號、CRLF、BOM。
- [x] 1.2 新增 `normalizeCsvFields`：以 `COL` 欄索引建共同模型，略過表頭/空白列，`sla`/`delayMin` 轉數值。
- [x] 1.3 新增 `rowsFromCsv`：CSV 全文 → 全部共同模型列（過濾無 checkTime/NaN delay）。
- [x] 1.4 新增 `historyForRow`：由全表篩 `bu/group/table`、映成記錄、新到舊排序、`breached=delayMin>sla`。
- [x] 1.5 四個函式加入 UMD exports。

## 2. 設定（config.js）
- [x] 2.1 各 region 新增 `gid`（HK = `1639789319`）。

## 3. 資料層改寫（app.js）
- [x] 3.1 移除 gviz `gvizUrl`/`gvizQuery`/`gEsc`/`loadSnapshot`/`loadHistory`。
- [x] 3.2 新增 `csvUrl`（含 `&_=` 破壞快取）+ `loadAllRows`（fetch CSV → `rowsFromCsv`）。
- [x] 3.3 `state` 新增 `allRows`；`reload` 改為抓全表 → `selectLatestSnapshot` 取快照。
- [x] 3.4 `openDetail` 改為同步由 `historyForRow(state.allRows,row)` 推導歷史；移除非同步載入與 `currentDetailId`。

## 4. 測試（test/core.test.js）
- [x] 4.1 `parseCsv` BOM/CRLF/引號欄位測試。
- [x] 4.2 `rowsFromCsv` 略過表頭/空白列、共同模型欄位測試。
- [x] 4.3 `historyForRow` 篩選與新到舊排序測試。
- [x] 4.4 CSV 端到端管線：`rowsFromCsv → selectLatestSnapshot → historyForRow → sliceByRange`。

## 5. 驗收
- [x] 5.1 `node --test test/` 全綠（47 測試）。
- [x] 5.2 index.html `?v=` 版號 +1（→ v=7）。
- [x] 5.3 對線上 sheet 實測：單表歷史由殘缺恢復為完整（fact_vip/cxgroup 1→23 筆）。
- [x] 5.4 commit 並 push。
