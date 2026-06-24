## ADDED Requirements

### Requirement: 首頁（依群組／依資料表 + BU）
系統 SHALL 提供首頁，含模式切換（依群組／依資料表）與 BU 膠囊（MCD／BKW），並顯示標題與副標
「更新 {checkTime} · N 群組 / M 張表」。切換 BU 或模式 MUST 重新推導對應清單。

#### Scenario: 依群組顯示群組卡
- **WHEN** 模式為「依群組」
- **THEN** 顯示該 BU 各群組卡片，含健康度百分比（`round((total-breached)/total*100)`）、群組名、
  以及「{n} 張逾時 · 共 {total} 張」或「全部正常 · 共 {total} 張」

#### Scenario: 依資料表顯示資料表列
- **WHEN** 模式為「依資料表」
- **THEN** 顯示該 BU 不重複資料表列，含狀態點、表名、群組數與狀態 pill

#### Scenario: 切換 BU 重新推導
- **WHEN** 使用者點選另一個 BU
- **THEN** 群組清單與不重複資料表清單依新 BU 重新推導

### Requirement: 群組→資料表畫面與篩選
系統 SHALL 在點選群組後顯示該群組所有資料表的最新狀態，並提供篩選膠囊（全部／只看異常／Realtime／
Offline）。進入此畫面時篩選 MUST 重置為「全部」。

#### Scenario: 開啟群組列出資料表
- **WHEN** 使用者於首頁點選某群組
- **THEN** 推入群組→資料表畫面，列出該群組各表卡（狀態點、表名、來源 chip、人性化 SLA 文字如「4小時」/「15分」、延遲、狀態 pill「逾時／正常」），且篩選為「全部」

#### Scenario: 篩選膠囊生效
- **WHEN** 使用者點選「只看異常 / Realtime / Offline」
- **THEN** 僅顯示符合條件（Breached／Realtime／Offline）的資料表

### Requirement: 資料表→各群組畫面
系統 SHALL 在「依資料表」點選某表後，顯示該表在所選 BU 各群組的最新狀態，且 MUST 只列出該 BU 中
實際含此表的群組。

#### Scenario: 顯示跨群組狀態
- **WHEN** 使用者於「依資料表」模式點選某表
- **THEN** 推入資料表→各群組畫面，每張卡以群組名為標題並顯示來源／SLA／延遲／狀態 pill

#### Scenario: 僅列含此表的群組
- **WHEN** 某群組在此 BU 中不含該表
- **THEN** 該群組不出現在清單中

### Requirement: 資料表詳情（近七天累積 Downtime）
系統 SHALL 提供詳情頁，含狀態條、近七天延遲趨勢卡與資訊卡。狀態條標籤 MUST 固定為
「近七天累積 Downtime」、右側顯示近七天累積延遲（人性化字串，如「14時48分」）。資訊卡 MUST 含四列：
檢查時間、資料更新時間、近七天 SLA 總時數、近七天累積 Downtime（最後一列以狀態色標示）。趨勢圖 MUST
以該表近七天的真實歷史資料點繪製，畫出 y=SLA 的水平虛線門檻與端點，X 軸為依 `Check_Time` 往前推算的
四個日期刻度（格式 `MM/DD HH時`）。

#### Scenario: 顯示近七天彙總數值
- **WHEN** 使用者開啟某表詳情頁且歷史載入完成
- **THEN** 狀態條顯示「近七天累積 Downtime」與累積延遲（人性化）；資訊卡顯示檢查時間、資料更新時間、
  近七天 SLA 總時數（= SLA × 該窗內檢查次數）、近七天累積 Downtime（= Σ Delay_Time，以狀態色標示）

#### Scenario: 趨勢圖用真實七天歷史
- **WHEN** 詳情頁取得該表近七天歷史資料點
- **THEN** 以折線 + 面積繪製真實延遲趨勢，於 y=SLA 畫虛線門檻，X 軸標示四個 `MM/DD HH時` 日期刻度

### Requirement: Stack 式導覽
系統 SHALL 以 push/pop 堆疊管理導覽：首頁為根（空堆疊），開啟群組／資料表／詳情各推入一層，返回鍵彈出一層。

#### Scenario: 開啟與返回
- **WHEN** 使用者開啟一個群組再點返回
- **THEN** 先推入群組→資料表畫面，按返回後回到首頁

### Requirement: 狀態與來源視覺語意（設計還原）
系統 SHALL 依 Slate Ops 設計 token 呈現狀態與來源：Breached 用紅（文字 `#C53D34`／線點 `#E0584A`／
底 `#FCEAE7`），Met 用綠（文字 `#1F8A5B`／線點 `#34A06B`／底 `#E6F4EC`）；Realtime 為藍 chip、
Offline 為灰 chip；選中控制為 `#232B3D`；字型 Space Grotesk（UI）＋ JetBrains Mono（數字/表名/時間）。

#### Scenario: 狀態顏色正確
- **WHEN** 一列為 Breached
- **THEN** 其狀態點/延遲/pill 使用紅色系；Met 則使用綠色系

#### Scenario: 來源 chip 顏色正確
- **WHEN** 一列來源為 Realtime
- **THEN** 來源 chip 為藍底藍字；Offline 則為灰底灰字

### Requirement: 響應式版面（手機與電腦）
系統 SHALL 以純內在響應式（`clamp()` 與 `auto-fill`/`minmax` grid）達成手機單欄、桌面多欄，
不得使用 media query。

#### Scenario: 視窗寬度自適應
- **WHEN** 於窄螢幕（手機）檢視
- **THEN** 卡片格呈單欄；於寬螢幕則自動變多欄，無需 media query

### Requirement: 載入／錯誤／空資料／重新整理狀態
系統 SHALL 處理非理想狀態：載入中顯示骨架或 spinner；讀取失敗顯示錯誤訊息與重試鈕並提示檢查 sheet
共用設定；無資料顯示空狀態；首頁提供重新整理。自動刷新預設 MUST 為關閉。

#### Scenario: 載入中
- **WHEN** 正在抓取資料
- **THEN** 顯示載入指示（骨架或 spinner）

#### Scenario: 讀取失敗
- **WHEN** 資料層回報讀取錯誤
- **THEN** 顯示錯誤訊息、重試鈕，並提示「請確認該 sheet 已設為可檢視」

#### Scenario: 重新整理
- **WHEN** 使用者點重新整理
- **THEN** 重新抓取並更新畫面與副標的 `checkTime`
