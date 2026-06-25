## Context

先前資料層以 gviz `/gviz/tq` 查詢（最新快照 `select * order by F desc limit 150`；單表歷史 `select F,G,I where A/B/C order by F desc limit 800`）。實測 gviz 對此 sheet 的伺服器端快取不可靠且 `reqId`/`cache:no-store` 無法破壞，導致殘缺快照。本變更改用 CSV 匯出端點並調整資料流，純前端讀取路徑變更。

## Goals / Non-Goals

**Goals:**
- 讀取永遠取得完整、即時的整張表，消除 gviz 快取造成的殘缺。
- 維持既有共同資料模型 `{ region, bu, group, table, source, sla, checkTime, maxUpdate, delayMin, delayHuman, status }` 不變，下游 views/core 函式不需改動。

**Non-Goals:**
- 不更動資料模型、UI、導覽、排程偵測邏輯。
- 不處理 R 腳本的排程穩定性（隔夜空窗、scope 擴張屬 R/ops 議題，另案處理）。

## Decisions

- **端點：`/export?format=csv&gid={gid}`**。CSV 匯出回傳完整 sheet（實測 976 列即時、含最新整點），不受 gviz 快取影響。需數字 `gid`（非分頁名稱），故 `config.js` 各 region 增列 `gid`。仍加 `&_=<timestamp>` 破壞瀏覽器/代理快取。
- **單次抓取 + 記憶體推導**。一次取回全表存入 `state.allRows`；`reload` 以 `selectLatestSnapshot` 取最新批次為快照；`openDetail` 以 `historyForRow(allRows,row)` 同步推導該表歷史，**不再逐表 fetch**（移除非同步載入與 loading/error 競態）。
- **欄位索引沿用 `COL`**。CSV 欄序與 gviz 欄索引一致（BU=0…SLA_Status=10），`normalizeCsvFields` 直接用既有 `COL` 對應，與 gviz 路徑共用下游。
- **正規 CSV 解析**。`parseCsv` 以狀態機處理引號欄位、`""` 轉義、欄內逗號（`Update_Count` 形如 `"1,834,764"`）、CRLF 與 BOM；不可用 `split(',')`。

## Risks / Trade-offs

- **整張表抓取量隨歷史成長**：`sheet_append` 持續累積，CSV 會越來越大（目前 ~976 列 ~100KB）。對內部、每小時級的監測工具可接受；日後若過大可改抓近 N 天或請 R 端裁切。先前 gviz 的 `limit` 有界性換成「完整性優先」。
- **CSV 匯出也有快取**：實測回傳完整即時資料，且加了 `&_=` 破壞；風險遠低於 gviz。
- **既有 gviz 函式保留未用**：`parseGvizText`/`normalizeRow`/`extractRecords` 仍在 core.js 與其測試中（供既有測試與潛在備援），不影響執行期。
