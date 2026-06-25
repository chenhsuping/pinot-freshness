## Why

儀表板原本透過 Google Sheets 的 gviz 介面（`/gviz/tq?tqx=out:json`）讀取資料。實測發現 gviz 的**伺服器端快取極不可靠**：即使每次請求帶唯一 `reqId` 並設 `cache:'no-store'`，仍會回傳一份嚴重過期、殘缺的快照——曾出現整張表只剩 64 列、單表歷史只剩 1 列，而同一時刻 sheet 實際有 976 列、該表有 23 列。這讓使用者反覆看到「歷史只有零星幾筆」的假象。

同一刻並排查詢證實：gviz 對 `fact_vip_point_earned_record/cxgroup` 回 1 列，CSV 匯出端點回正確的 23 列。CSV 匯出端點（`/export?format=csv`）穩定回傳完整、即時的整張表。

## What Changes

- **讀取端點改為 CSV 匯出**：以 `/export?format=csv&gid={gid}` 一次抓回完整整張表，取代逐查詢的 gviz JSON。
- **單次抓取、記憶體推導**：最新快照（`selectLatestSnapshot`）與各表歷史（`historyForRow`）皆由記憶體中的全表資料推導，**消除逐表 gviz 查詢**與其快取問題。
- **新增正規 CSV 解析**：`parseCsv` 處理引號欄位、欄內逗號（如 `Update_Count` 的 `"1,834,764"`）、BOM、CRLF。
- **設定新增 `gid`**：CSV 匯出端點需要分頁的數字 `gid`（非分頁名稱），加入 `config.js` 各區域設定。

## Capabilities

### Modified Capabilities
- `sheet-data-access`: 讀取來源由 gviz 改為 CSV 匯出端點；快照與單表歷史改由單次抓取的全表資料於記憶體推導（取代先前 gviz 查詢與 JSONP 剝除等描述）。

## Impact

- `app.js`：移除 gviz fetch/query/loadSnapshot/loadHistory，改為 `loadAllRows`（CSV）+ `reload`/`openDetail` 由 `state.allRows` 推導。
- `core.js`：新增 `parseCsv`、`normalizeCsvFields`、`rowsFromCsv`、`historyForRow`。
- `config.js`：各 region 新增 `gid`。
- `test/core.test.js`：新增 CSV 解析/建構/歷史/管線測試（共 47 測試全綠）。
- 純前端讀取路徑變更，無資料模型破壞性變更；R 腳本與憑證不受影響。
