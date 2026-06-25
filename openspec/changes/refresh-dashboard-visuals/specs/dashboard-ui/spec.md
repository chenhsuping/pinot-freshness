## ADDED Requirements

### Requirement: 群組卡健康率與進度條
首頁「依群組」模式的群組卡 SHALL 採用下列版面。左側為健康欄：46×46 圓角磚（`border-radius:13px`、`JetBrains Mono 700 14px`）顯示健康率百分比，磚正下方有「健康率」說明字（`Space Grotesk 600 8.5px #AEB5BE`、`letter-spacing:.4px`）。中段上排為群組名（`Space Grotesk 600 15px #1C2433`）與右對齊「共 {total} 張」（`JetBrains Mono 500 11px #9AA3AF`）；其下為 6px 健康進度條（軌道 `#EEF1F5`、`border-radius:999px`、填色寬度＝健康率百分比）。進度條填色 MUST 依健康率分三段：全部正常 `#34A06B`、有逾時且健康率 ≥ 50% `#E8A23C`、有逾時且健康率 < 50% `#E0584A`。進度條下為狀態文字（`JetBrains Mono 600 11px`）「{n} 張逾時」（`#C53D34`）或「全部正常」（`#1F8A5B`）。最右為 chevron「›」。健康磚底色：有逾時 `#FCEAE7`／字 `#C53D34`，全正常 `#E6F4EC`／字 `#1F8A5B`。

#### Scenario: 有逾時的群組卡
- **WHEN** 某群組含至少一張逾時表
- **THEN** 健康磚為紅色系並顯示健康率%，進度條依健康率呈現琥珀（≥50%）或紅（<50%），狀態文字為「{n} 張逾時」

#### Scenario: 全正常的群組卡
- **WHEN** 某群組所有表皆正常
- **THEN** 健康磚為綠色系顯示 100%，進度條為綠色滿格，狀態文字為「全部正常」

### Requirement: 詳情頁籤視覺改版（深藍選中＋圓點）
詳情頁的頁籤切換 SHALL 採白底容器（`background:#FFFFFF`、`border:1px solid #E6E9EE`、`border-radius:13px`、`padding:5px`、`box-shadow:0 1px 2px rgba(20,30,50,.04)`）。每個頁籤按鈕 `flex:1`、`padding:12px 6px 13px`、`border-radius:9px`、`font:700 14px 'Space Grotesk'`、`letter-spacing:.2px`。選中態 MUST 為深藍底 `#232B3D`、白字、陰影 `0 2px 8px rgba(35,43,61,.26)`；未選為透明底、字 `#7A828C`。每個頁籤標籤前 MUST 有 7px 圓點：選中 `#E8C6CF`、未選 `#C9D2DA`。

#### Scenario: 概覽為選中
- **WHEN** 目前在「概覽」頁籤
- **THEN** 「概覽」按鈕為深藍底白字、其圓點為 `#E8C6CF`，「歷史」為透明底灰字、圓點 `#C9D2DA`

#### Scenario: 切到歷史
- **WHEN** 使用者點「歷史」頁籤
- **THEN** 「歷史」變為深藍底白字選中態，「概覽」回到未選態

### Requirement: 趨勢圖每點圓點標記
概覽趨勢卡的延遲折線 SHALL 在每個資料點繪製小圓點（`r:2.2`、`stroke:#FFFFFF`、`stroke-width:1`），填色依該點是否逾時：逾時 `#E0584A`、正常 `#34A06B`。此每點圓點與 hover 時的較大空心標記點（`r:3.6` 白底彩描邊）並存且樣式不同。

#### Scenario: 每個資料點皆標記
- **WHEN** 概覽趨勢卡有 N 個資料點
- **THEN** 折線上出現 N 個小圓點，逾時點紅色、正常點綠色

### Requirement: 趨勢統計磚標籤（最大值／平均／最小值）
概覽趨勢卡 X 軸下方的三格統計磚標籤 SHALL 為「最大值」（值色 `#C53D34`）、「平均」（值色 `#3A424C`）、「最小值」（值色 `#1F8A5B`），數值分別為該延遲序列的 max／mean／min 並以人性化格式顯示。此要求取代先前以「峰值／谷值」為標籤的用語。

#### Scenario: 統計磚標籤與值
- **WHEN** 概覽有歷史資料點
- **THEN** 三格標籤為「最大值／平均/最小值」，數值對應序列的最大／平均／最小

### Requirement: 全域頁首等高
全域 sticky 頁首的內列 SHALL 設 `min-height:44px`，使單行（首頁）與兩行（內頁標題＋副標）頁首切換時高度一致、不跳動。

#### Scenario: 首頁與內頁頁首等高
- **WHEN** 使用者於首頁與任一內頁（群組／資料表／詳情）之間切換
- **THEN** 頁首列高度維持一致（至少 44px）
