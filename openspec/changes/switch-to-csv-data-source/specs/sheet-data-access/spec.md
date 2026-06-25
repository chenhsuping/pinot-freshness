## MODIFIED Requirements

### Requirement: 讀取 HK sheet 最新快照
系統 SHALL 透過 Google Sheets 的 **CSV 匯出端點**（`/export?format=csv&gid={gid}`）一次讀取**完整整張 HK sheet**，解析為共同資料模型後存於記憶體；並從所有列中選出最大 `Check_Time` 的批次作為「目前快照」。請求 MUST 附帶破壞快取參數（如 `&_=<timestamp>`）並以 `cache:'no-store'` 取得，以避免讀到過期資料。

#### Scenario: 成功取得最新快照
- **WHEN** 前端以 CSV 匯出端點讀取 HK sheet 且網路正常
- **THEN** 系統解析全部資料列，找出最大 `Check_Time`，僅保留該批次的列作為目前快照

#### Scenario: 完整讀取不受上游快取影響
- **WHEN** sheet 剛被改寫
- **THEN** 因採 CSV 匯出端點並破壞快取，前端取得完整、即時的整張表（而非 gviz 伺服器端可能回傳的殘缺/過期快照）

#### Scenario: 歷史成長下仍正確選出最新批次
- **WHEN** sheet 已累積遠超過一個批次的歷史列
- **THEN** 系統解析全表後，仍由最大 `Check_Time` 過濾出最新批次作為快照

### Requirement: 正規化為共同資料模型
系統 SHALL 將 CSV 各欄對應到共同模型 `{ region, bu, group, table, source, sla, checkTime,
maxUpdate, delayMin, delayHuman, status }`，欄位索引沿用既有 `COL` 對應（`BU`=0、`group_name`=1、
`table_name`=2、`Source_Type`=3、`SLA`=4、`Check_Time`=5、`Max_Update_Time`=6、`Delay_Time`=8、
`Delay_Status`=9、`SLA_Status`=10）。CSV 解析 MUST 以正規方式處理引號欄位、欄內逗號（如
`Update_Count` 形如 `"1,834,764"`）、`""` 轉義、CRLF 與 BOM；表頭列與空白列 MUST 被略過；
`sla`、`delayMin` MUST 轉為數值。

#### Scenario: 欄位對應正確
- **WHEN** 解析一列 HK CSV 資料
- **THEN** 產生的共同模型物件含正確的 `bu/group/table/source/sla/checkTime/maxUpdate/delayMin/delayHuman/status`

#### Scenario: 引號欄位與欄內逗號不破壞解析
- **WHEN** 某列的 `Update_Count` 為帶千分位逗號的引號字串（如 `"1,834,764"`）
- **THEN** 解析器不因欄內逗號而切錯欄，整列欄數正確，引號內逗號完整保留

#### Scenario: 略過表頭與空白列
- **WHEN** CSV 含表頭列（首格為 `BU`）與結尾空白列
- **THEN** 兩者皆被略過，不產生雜訊資料列

### Requirement: 取得單表近七天延遲歷史
系統 SHALL 於開啟詳情頁時，**由記憶體中已抓取的全表資料**篩出該表（`bu`/`group`/`table` 相符）的
歷史記錄（`historyForRow`），以新到舊排序供詳情頁趨勢、彙總與範圍切片使用；MUST NOT 為每張表
另發遠端請求。每筆歷史記錄含 `{ checkTime, maxUpdate, delayMin, delay, breached }`，其中
`breached = delayMin > sla`。

#### Scenario: 由全表推導單表歷史
- **WHEN** 使用者開啟某表詳情頁
- **THEN** 系統從記憶體全表資料篩出該 `bu/group/table` 的所有記錄，依時間新到舊排序，不再發送逐表查詢

#### Scenario: 無歷史時回空陣列
- **WHEN** 該 `bu/group/table` 在全表資料中無任何列
- **THEN** 回傳空陣列，詳情頁顯示空狀態而不報錯

### Requirement: 資料讀取錯誤需可被偵測
系統 SHALL 在 CSV 讀取（HTTP 失敗）或解析失敗時回傳可辨識的錯誤狀態，供 UI 呈現重試與提示，
而非靜默失敗。

#### Scenario: 讀取失敗回報錯誤
- **WHEN** CSV 匯出請求因網路、權限或格式問題失敗
- **THEN** 資料層回報錯誤狀態（而非回傳空資料假裝成功），使 UI 能顯示重試與「請確認 sheet 已設為可檢視」提示
