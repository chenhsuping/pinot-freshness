## ADDED Requirements

### Requirement: 取得單表歷史檢查記錄（含資料更新時間與逐筆逾時）
系統 SHALL 在開啟詳情頁時，以 gviz 查詢
`select F, G, I where A='{bu}' and B='{group}' and C='{table}' order by F desc limit 800`
取得該表歷史（在既有 `F, I` 之外加入 `Max_Update_Time`／`G`），並產出逐筆記錄模型
`{ checkTime, maxUpdate, delayMin, breached }`，供詳情頁「歷史」記錄表與既有趨勢／彙總共用。
`breached` MUST 以 `delayMin > SLA` 推導。`maxUpdate` MUST 優先採用 `G` 的格式化值（`f`），
缺值時 MUST 回退為「`checkTime` 減去 `delayMin`」。本查詢 MUST 維持
`order by F desc limit 800` 使讀取量有界，且每次開啟詳情只抓取一次、由前端依範圍切片。

#### Scenario: 取得含資料更新時間的逐筆記錄
- **WHEN** 使用者開啟某表詳情頁
- **THEN** 系統取得該 `bu/group/table` 近七天的逐筆記錄，每筆含 `checkTime`、`maxUpdate`、`delayMin`、`breached`

#### Scenario: 逐筆逾時由延遲與 SLA 推導
- **WHEN** 某筆記錄的 `delayMin` 大於該表 `SLA`
- **THEN** 該筆 `breached` 為真；否則為偽

#### Scenario: 資料更新時間缺值時回退
- **WHEN** 某筆記錄缺少 `Max_Update_Time`（`G`）
- **THEN** 該筆 `maxUpdate` 以「`checkTime` 減去 `delayMin`」推算，不致空白

#### Scenario: 單次抓取供多範圍切片
- **WHEN** 使用者在「歷史」頁籤切換近24小時／近3天／近7天
- **THEN** 系統重用同一份已抓取的近七天記錄於前端切片，不再發出新的 gviz 請求
