## ADDED Requirements

### Requirement: 整體過時警示橫幅
當最新快照判定為過時（見 `schedule-freshness`）時，儀表板 SHALL 於全域 sticky 頁首正下方顯示一條警示橫幅，且於所有畫面（menu／groupTables／tableGroups／detail）皆可見。橫幅文字 MUST 含「資料已 {人性化年齡} 未更新」與「最後更新 {Check_Time}」，並以警示圖示前綴。橫幅配色 MUST 採琥珀色系（有別於逾時紅 `#C53D34`），以區分「整體排程問題」與「單表 SLA 逾時」。當快照未過時時 MUST 不顯示橫幅。

#### Scenario: 過時顯示橫幅
- **WHEN** 最新快照年齡達到過時門檻
- **THEN** 頁首下方顯示琥珀色警示橫幅，含人性化年齡與最後更新時間

#### Scenario: 未過時不顯示
- **WHEN** 最新快照年齡未達門檻
- **THEN** 不顯示任何警示橫幅

#### Scenario: 跨畫面可見
- **WHEN** 快照過時且使用者在任一畫面（首頁或詳情）
- **THEN** 警示橫幅在該畫面皆顯示於頁首下方

### Requirement: 歷史頁籤排程空窗加註
詳情頁「歷史」頁籤 SHALL 對目前範圍內的記錄執行空窗偵測（見 `schedule-freshness`），並於摘要列後加註「⚠ {K} 個排程空窗（缺 {M} 筆）」。當該範圍內無空窗時 MUST 不顯示加註。

#### Scenario: 有空窗時加註
- **WHEN** 目前範圍內偵測到至少一個排程空窗
- **THEN** 摘要列後顯示「⚠ {K} 個排程空窗（缺 {M} 筆）」

#### Scenario: 無空窗不加註
- **WHEN** 目前範圍內無排程空窗
- **THEN** 摘要列不顯示空窗加註

### Requirement: 趨勢圖 Hover 檢視
概覽趨勢卡 SHALL 提供 hover 檢視互動：於 SVG 上以每個資料點為範圍鋪設透明感應區，滑入時顯示虛線垂直準星與空心標記點（`fill:#FFFFFF`、`stroke` 為狀態色），並即時更新圖表上方讀數列（左：該點時間 `MM/DD HH:mm`；右：延遲值與逾時／正常 pill，依該點 `Delay_Time > SLA` 著色）。未 hover 時讀數列 MUST 預設顯示最新點並以「最新」前綴；滑出圖表後 MUST 回復為最新點預設。此互動 MUST 以直接 DOM 更新進行，不得觸發整頁重繪。

#### Scenario: 滑入資料點
- **WHEN** 使用者將指標移至趨勢圖某資料點範圍
- **THEN** 顯示準星與空心標記點，讀數列更新為該點時間、延遲與狀態 pill

#### Scenario: 滑出圖表
- **WHEN** 指標移出趨勢圖
- **THEN** 準星與標記點隱藏，讀數列回復為「最新 {時間}」與最新點數值

### Requirement: 趨勢統計磚
概覽趨勢卡 SHALL 於 X 軸刻度下方顯示三格統計磚，分別為峰值（紅 `#C53D34`）、平均（中性 `#3A424C`）、谷值（綠 `#1F8A5B`），數值取自整個窗內延遲序列的最大／平均／最小並以人性化格式顯示。當無資料點時 MUST 不顯示統計磚。

#### Scenario: 有資料時顯示統計磚
- **WHEN** 概覽有至少一個歷史資料點
- **THEN** 顯示峰值／平均／谷值三格，數值為該序列之 max／mean／min

### Requirement: 卡片與狀態微互動
儀表板 SHALL 提供下列純 CSS 微互動：卡片（群組卡、資料表列、群組-資料表卡、資料表-群組卡）hover 時上浮（`translateY(-2px)` + 陰影）、按下時輕微縮小（`scale(.995)`）；逾時（Breached）狀態點 MUST 持續脈動（`dotPulse`），正常點不脈動；畫面與頁籤切換 MUST 以 `scrFade` 位移淡入。動畫 MUST 不阻擋首次繪製。

#### Scenario: 卡片 hover 與 press
- **WHEN** 使用者 hover 或按下任一卡片
- **THEN** 卡片分別上浮加陰影、按下時輕微縮小

#### Scenario: 逾時點脈動
- **WHEN** 某狀態點為逾時（Breached）
- **THEN** 該點持續脈動；正常狀態點不脈動
