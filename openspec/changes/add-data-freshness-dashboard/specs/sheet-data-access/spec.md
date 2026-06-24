## ADDED Requirements

### Requirement: 讀取 HK sheet 最新快照
系統 SHALL 透過 Google Sheets gviz 介面（`/gviz/tq?tqx=out:json`）以查詢
`select * order by F desc limit 150` 從瀏覽器端讀取 HK sheet，並從回傳列中選出
最大 `Check_Time` 的批次作為「目前快照」。查詢 MUST 以 `order by F desc limit` 限制回傳量，
使歷史持續累積時讀取量仍維持有界。

#### Scenario: 成功取得最新快照
- **WHEN** 前端以 gviz 查詢 HK sheet 且網路正常
- **THEN** 系統取得最近批次的列，找出最大 `Check_Time`，僅保留該批次的列作為目前快照

#### Scenario: 剝除 gviz JSONP 包裝
- **WHEN** gviz 回傳 `/*O_o*/google.visualization.Query.setResponse({…});` 形式的字串
- **THEN** 系統先剝除外層包裝再 `JSON.parse`，成功解析出資料列

#### Scenario: 歷史成長不影響查詢量
- **WHEN** sheet 已累積遠超過一個批次的歷史列
- **THEN** 因 `order by F desc limit 150`，回傳列數仍維持有界，前端再過濾出最新批次

### Requirement: 正規化為共同資料模型
系統 SHALL 將 HK 的欄位對應到共同模型 `{ region, bu, group, table, source, sla, checkTime,
maxUpdate, delayMin, delayHuman, status }`，其中 `group`=`group_name`、`sla`=`SLA`、
`delayMin`=`Delay_Time`、`status`=`SLA_Status` 等。時間/文字欄位 MUST 優先採用 gviz 的格式化值
（`f`），數值欄位（`sla`、`delayMin`）MUST 採用數值（`v`）。

#### Scenario: 欄位對應正確
- **WHEN** 解析一列 HK 資料
- **THEN** 產生的共同模型物件含正確的 `bu/group/table/source/sla/checkTime/maxUpdate/delayMin/delayHuman/status`

#### Scenario: 數值與格式化值分別取用
- **WHEN** 某欄同時有數值 `v` 與格式化字串 `f`
- **THEN** `delayMin`、`sla` 取 `v` 數值；`checkTime`、`maxUpdate` 取 `f` 格式化字串

### Requirement: 動態推導 BU 群組與資料表清單
系統 SHALL 從目前快照資料動態推導每個 BU 的群組清單與不重複資料表清單，皆以「首見順序」排序，
不得寫死群組或站點名稱。

#### Scenario: 群組依資料推導
- **WHEN** 使用者在某 BU（MCD 或 BKW）瀏覽
- **THEN** 該 BU 的群組清單由資料中 `bu` 相符的 distinct `group` 依首見順序組成

#### Scenario: 不重複資料表依首見順序
- **WHEN** 使用者切到「依資料表」模式
- **THEN** 系統列出該 BU 內 distinct `table`，順序為跨該 BU 群組的首見順序

### Requirement: 取得單表近 24 小時延遲歷史
系統 SHALL 在開啟詳情頁時，以 gviz 查詢
`select F, I where A='{bu}' and B='{group}' and C='{table}' order by F desc limit 200`
取得該表歷史，反轉為時間順序並過濾近 24 小時的資料點供趨勢圖使用。

#### Scenario: 取得真實歷史資料點
- **WHEN** 使用者開啟某表詳情頁
- **THEN** 系統取得該 `bu/group/table` 近 24 小時的 (`Check_Time`, 延遲分鐘) 資料點，依時間順序排列

#### Scenario: 歷史點不足時退回現有點
- **WHEN** 該表近 24 小時內可用資料點少於 2 個
- **THEN** 系統改用現有的全部歷史點繪製，不致報錯

### Requirement: 資料讀取錯誤需可被偵測
系統 SHALL 在 gviz 讀取或解析失敗時回傳可辨識的錯誤狀態，供 UI 呈現重試與提示，而非靜默失敗。

#### Scenario: 讀取失敗回報錯誤
- **WHEN** gviz 請求因網路、權限或格式問題失敗
- **THEN** 資料層回報錯誤狀態（而非回傳空資料假裝成功），使 UI 能顯示重試與「請確認 sheet 已設為可檢視」提示
