# 資料新鮮度儀表板 — 設計 Spec

> 日期：2026-06-24
> 狀態：設計已確認，待使用者複審 spec 後進入 writing-plans

## 1. 目標（Overview）

做一個**手機 + 電腦都能用**的網頁，快速查詢各資料表「最新資料時間 / 延遲 / SLA 狀態」。
資料來源是現有 R 腳本（`資料新鮮度監測 (CPS)_HK_2.0.R`、`..._TW_2.0.R`）持續 append 到
Google Sheet 的快照。前端純靜態、部署到 GitHub Pages、接自有網域 `hsuping.org`。
UI 完全照附件「Slate Ops」設計（`Dashboard.dc.html` / `TableDetail.dc.html` / `README.md`
為像素級依據）。

**不在範圍內**：改動 R 腳本 / Google Sheet 結構；真正的帳號驗證；後端服務；CI build。

## 2. 已確認的決策（Locked decisions）

| 主題 | 決定 |
|---|---|
| 地區範圍 | **HK + TW 都做**，頂部 HK/TW 切換 |
| 公開性 | **公開可查**沒關係（資料不敏感到需要保護） |
| 密碼 | **簡單裝飾性密碼閘**（前端，SHA-256 雜湊存 `config.js`），非真正安全 |
| 資料讀取 | 前端**直接讀 Google Sheet gviz**，無後端、無 Apps Script、無快照烤製 |
| 技術選型 | **零編譯純靜態**（vanilla HTML/CSS/JS），無 build step |
| 24h 趨勢圖 | **用真實歷史**（詳情頁即時抓該表近 24h 的 Check_Time/延遲） |
| 網域 | `hsuping.org`（apex 根網域） |
| 部署 | GitHub Pages（獨立 `dashboard/` repo，root 為來源） |

## 3. 架構與資料流

```
瀏覽器 (GitHub Pages, hsuping.org)
  │  1. 載入 index.html / styles.css / app.js / config.js
  │  2. 密碼畫面 → SHA-256 比對 → localStorage flag
  │  3. fetch gviz (HK sheet + TW sheet) ─────────────► Google Sheets
  │  4. 正規化兩種 schema → 共同模型 → 過濾最新 Check_Time 快照
  │  5. 渲染四個畫面（Slate Ops）
  │  6. 進詳情頁 → fetch gviz 該表近 24h 歷史 → 畫真實趨勢
  ▼
（無後端；所有運算在前端）
```

純前端、stack 式導覽（push/pop），地區/BU/模式切換只在首頁作用。

## 4. 資料來源與正規化

### 4.1 兩份 sheet

| 地區 | Spreadsheet ID | Tab |
|---|---|---|
| HK | `1Ti9iywMTyd7mEvnz47NvfQUsIruuhrxyWwFQx1L3pF4` | `HK` |
| TW | `1htrpPIl9U62rwzLg5UmGui38-8KBMMRhRSIYH11VNus` | `TW` |

**一次性設定**：兩份 sheet 須設為「知道連結的人皆可檢視」，gviz 才讀得到（公開可接受）。

### 4.2 欄位對照（兩份 schema 不同，欄位字母在兩份中一致）

| 共同模型欄位 | HK 欄（字母） | TW 欄（字母） | 備註 |
|---|---|---|---|
| `bu` | `BU` (A) | `BU` (A) | `MCD` / `BKW`，直接讀 sheet |
| `group` | `group_name` (B) | `SITE` (B) | TW 的 SITE 對應設計的「群組」 |
| `table` | `table_name` (C) | `TABLE_NAME` (C) | |
| `source` | `Source_Type` (D) | `SOURCE_TYPE` (D) | `Realtime` / `Offline` |
| `sla` | `SLA` (E) | `SLA_LIMIT` (E) | 分鐘（Realtime=15, Offline=240） |
| `checkTime` | `Check_Time` (F) | `CHECK_TIME` (F) | 快照批次時間 |
| `maxUpdate` | `Max_Update_Time` (G) | `MAX_UPDATE_TIME` (G) | 最後更新時間 |
| `delayMin` | `Delay_Time` (I) | `DELAY_MINS` (I) | 分鐘（數值） |
| `delayHuman` | `Delay_Status` (J) | `DELAY_STATUS` (J) | 例：`19時 4分` |
| `status` | `SLA_Status` (K) | `SLA_STATUS` (K) | `Breached` / `Met` |

- HK 第 H 欄 = `max_update_unix_ms`、第 L 欄 = `Update_Count`；TW 第 H 欄 = `MAX_UPDATE_UNIX_MS`、**無 Update_Count**。兩者 UI 皆不使用。
- BU → 群組清單**從資料動態推導**（distinct group，首見順序），不寫死，以利 TW 日後增站（如 `bj`、`bt`）。
  - 預期 HK：`BKW=[bjgroup]`、`MCD=[cxgroup, segroup, mcwgroup]`。
  - 預期 TW：`BKW=[bj]`、`MCD=[cx, se, bt, mcw]`。

### 4.3 gviz 查詢

**首頁最新快照**（只抓最近一批，歷史成長也不變慢）：
```
https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:json&sheet={TAB}&tq=select%20*%20order%20by%20F%20desc%20limit%20150
```
- 回應是 `/*O_o*/google.visualization.Query.setResponse({...});` 包裝 → 前端剝除包裝再 `JSON.parse`。
- 解析後找出最大 `checkTime`，過濾出該批所有列 = 目前快照。
- 時間值優先用 gviz 的 `f`（格式化字串），數值（delay、sla）用 `v`。

**詳情頁真實歷史**（單表近 24h）：
```
tq = select F, I where A = '{bu}' and B = '{group}' and C = '{table}' order by F desc limit 200
```
- 取回後反轉為時間順序，過濾 `checkTime >= now - 24h` 的點；若不足 2 點則用現有全部點。
- 以這些 (時間, 延遲) 畫線，SLA 門檻虛線在 y = sla，x 軸標 `−24h … 現在`。

## 5. 共同資料模型

```js
{
  region: 'HK' | 'TW',
  bu:     'MCD' | 'BKW',
  group:  string,   // HK group_name / TW SITE
  table:  string,
  source: 'Realtime' | 'Offline',
  sla:    number,   // 分鐘
  checkTime: string,
  maxUpdate: string,
  delayMin:  number,
  delayHuman: string,
  status: 'Breached' | 'Met',
}
```

衍生值（每次渲染算）：群組健康度 = `round((total - breached)/total*100)`；
distinct 表清單（依 BU 首見順序）；某表跨群組 = 該 BU 含此表的群組。

## 6. 畫面（四畫面 + 地區切換）

像素級依據 = 附件 `Dashboard.dc.html` / `TableDetail.dc.html` / `README.md`（實作期會把這些原型
HTML 收進 `dashboard/design-reference/` 供對照）。導覽為 stack push/pop。

1. **首頁 Menu**：標題「資料觀測」+ 副標「更新 {checkTime} · N 群組 / M 張表」（依地區）。
   控制列：**HK/TW 地區切換**（segmented，新增）+ 模式切換「依群組/依資料表」+ BU 膠囊「MCD/BKW」。
   內容：依群組 → 群組卡片（健康度色塊 + 名稱 + 「{n} 張逾期 · 共 {total} 張」）；
   依資料表 → 資料表列（狀態點 + 表名 + 群組數 + 狀態 pill）。
2. **群組 → 資料表**：返回鍵 + 標題（群組名 + BU badge + meta）+ 篩選膠囊（全部/只看異常/Realtime/Offline，
   進入時重置為「全部」）+ 表卡格（狀態點/表名/來源 chip/SLA/延遲/pill）。
3. **資料表 → 各群組**：標題（表名 + BU badge）+ 各群組卡（群組名為標題，右側來源/SLA/延遲/pill）；
   只列該 BU 中含此表的群組。
4. **資料表詳情（24h）**：返回 + 標題（表名、`{BU} · {group}`）+ 狀態條 + **真實 24h 趨勢卡**
   （SVG 折線 + 面積 + SLA 虛線 + 端點）+ 資訊卡（最後更新時間/檢查時間/資料來源/SLA 門檻/實際延遲）。

設計 token（摘要，細節以原型為準）：頁底 `#EDF0F5`、白卡、卡邊 `#EAEDF2`；
Breached 文字 `#C53D34`、線/點 `#E0584A`、底 `#FCEAE7`；Met 文字 `#1F8A5B`、線/點 `#34A06B`、底 `#E6F4EC`；
Realtime chip 藍 `#E7F0FE`/`#2F6FE0`、Offline 灰 `#EEF1F5`/`#5E6675`；選中控制 `#232B3D`。
字型 Space Grotesk（UI）+ JetBrains Mono（數字/表名/時間），由 Google Fonts 載入。
響應式：純 `clamp()` + `auto-fill`/`minmax` grid，無 media query；手機單欄、桌面多欄。

## 7. 狀態管理

```
region:  'HK' | 'TW'                 // 首頁地區切換
mode:    'byGroup' | 'byTable'        // 首頁模式
bu:      'MCD' | 'BKW'               // 首頁 BU
stack:   Array<{type:'groupTables',bu,group} | {type:'tableGroups',bu,table} | {type:'detail',id}>
gFilter: 'all' | 'breach' | 'rt' | 'off'   // 群組→表 篩選
```
切換 region 重新抓對應 sheet 並重置 stack；切 BU/mode 重新推導清單。

## 8. 密碼閘

- 首次載入顯示置中密碼卡（Slate Ops 風格）。
- 輸入值做 **SHA-256（SubtleCrypto）** → 與 `config.js` 內存的雜湊比對。
- 相符則寫 `localStorage` flag，之後直接進主畫面；提供「登出」清除 flag。
- **明確聲明**：此為裝飾性，非真正安全（資料公開、雜湊可被繞過）。

## 9. 載入 / 錯誤 / 重新整理

- 載入中：骨架或 spinner。
- 錯誤：顯示訊息 + 重試鈕，並提示「請確認該 sheet 已設為可檢視」。
- 空資料：空狀態提示。
- 首頁一個「重新整理」鈕；自動刷新預設**關**（避免干擾），保留設定點。
- 首頁副標的 `checkTime` 即資料本身的新鮮度指標。

## 10. 檔案結構（零編譯，獨立 repo）

```
dashboard/                     ← GitHub Pages repo（root 為來源）
  index.html                   外殼 + 密碼畫面 + app 容器
  styles.css                   Slate Ops tokens 與版面
  app.js                       抓取 / 正規化 / 狀態 / 四畫面渲染
  config.js                    sheet ID、tab、密碼雜湊、SLA 預設、地區設定
  CNAME                        內容：hsuping.org
  README.md                    設定與部署步驟
  design-reference/            原型 HTML（對照用，可不部署）
  docs/superpowers/specs/      本 spec
```

`config.js` 範例：
```js
const CONFIG = {
  password_sha256: '<53343286@Di 的 SHA-256 hex>',
  regions: {
    HK: { id: '1Ti9iywMTyd7mEvnz47NvfQUsIruuhrxyWwFQx1L3pF4', tab: 'HK' },
    TW: { id: '1htrpPIl9U62rwzLg5UmGui38-8KBMMRhRSIYH11VNus', tab: 'TW' },
  },
  refreshMs: 0, // 0 = 不自動刷新
};
```

## 11. 部署

1. `dashboard/` 內 `git init` → 推到 GitHub（**公開** repo）。
2. Settings → Pages → Source 設 `main` 分支 `/ (root)`。
3. `CNAME` 檔內容 `hsuping.org`。
4. DNS（apex 根網域）設 A 記錄指向：`185.199.108.153`、`185.199.109.153`、
   `185.199.110.153`、`185.199.111.153`（可另加對應 AAAA）。
5. Pages 後台勾 **Enforce HTTPS**（憑證簽發後）。

## 12. 安全性考量（重要）

- **R 腳本含真實憑證**（Trino DB 密碼、`api.superccp.com` 帳密、Google 帳號）。
  GitHub Pages repo 為公開，故儀表板放**獨立 `dashboard/` repo**，**R 腳本絕不進該 repo**。
- Google Sheet 將設為公開可檢視 → 資料表名稱/延遲/SLA 對外可見（使用者已接受）。
- 前端密碼為裝飾性，無法真正保護資料。

## 13. 開工前所需（已取得）

- 網域：`hsuping.org`
- 密碼：`53343286@Di`（將以 SHA-256 雜湊存入 `config.js`）

## 14. 未來可擴充

- 真正帳號驗證（需後端）。
- TW 補 `Update_Count` 後可在 UI 顯示更新筆數。
- 自動刷新預設開啟 / 可調間隔。
- 趨勢圖加更多統計（平均延遲、達標率）。
