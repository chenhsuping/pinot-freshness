## Why

資料團隊的 R 腳本已持續把各資料表的「最新資料時間 / 延遲 / SLA 狀態」快照 append 到 Google Sheet，
但目前沒有方便的查詢介面——要看狀態得手動開 sheet。需要一個手機/電腦都能用、能快速查詢、且公開可達
（自有網域 `hsuping.org`）的儀表板，讓營運人員一眼看出哪些表逾時、整體健康度，並能下鑽到單表細節。

## What Changes

- 新增一個**純靜態前端儀表板**（零編譯 vanilla HTML/CSS/JS），部署到 GitHub Pages、接 `hsuping.org`。
- 前端**直接讀 HK Google Sheet 的 gviz 介面**（無後端、無 Apps Script、無 CI build），正規化欄位、
  過濾出最新 `Check_Time` 快照後渲染。
- 重建附件「Slate Ops」設計的四個畫面：首頁（依群組／依資料表 + BU 切換）、群組→資料表、
  資料表→各群組、資料表詳情（近七天累積 Downtime）。導覽為 stack push/pop。
- 詳情頁的「近七天累積 Downtime / SLA 總時數 / 延遲趨勢」**使用真實歷史**（即時抓該表近七天的
  `Check_Time`/`Delay_Time` 加總與繪製）。
- 加上**裝飾性密碼閘**（前端 SHA-256 比對，非真正安全；資料本即公開可接受）。
- **v1 範圍只做 HK**；TW 留待後續擴充（程式預留 `region` 鍵）。
- 安全約束：儀表板放獨立公開 repo，**含真實 DB 憑證的 R 腳本不得進入此 repo**。

## Capabilities

### New Capabilities
- `sheet-data-access`: 從 HK Google Sheet 經 gviz 讀取、剝除 JSONP 包裝、正規化成共同資料模型、
  選出最新快照，以及為詳情頁抓取單表近七天歷史。
- `dashboard-ui`: 四個畫面的版面與互動、stack 式導覽、BU／模式／篩選控制、群組健康度與狀態色彩、
  近七天 Downtime 趨勢 SVG，以及載入／錯誤／空資料狀態，遵循 Slate Ops 設計 token 與響應式規則。
- `access-gate`: 前端裝飾性密碼閘——SHA-256 比對、localStorage 記住、登出清除。
- `deployment`: GitHub Pages 靜態託管、`hsuping.org` apex 網域 DNS 與 HTTPS、以及「R 腳本不入公開 repo」
  的隔離約束。

### Modified Capabilities
<!-- 無；這是全新系統，openspec/specs/ 目前為空。 -->

## Impact

- **新 repo**：`dashboard/`（獨立 git repo，GitHub Pages 來源 = root）。
- **新檔案**：`index.html`、`styles.css`、`app.js`、`config.js`、`CNAME`、`README.md`、
  `design-reference/`（原型 HTML）。
- **外部相依**：HK Google Sheet（`1Ti9…3pF4`，tab `HK`）須設為「知道連結者可檢視」；
  Google Fonts（Space Grotesk / JetBrains Mono）；GitHub Pages；`hsuping.org` DNS。
- **不影響**：現有 R 腳本與 Google Sheet 結構維持原狀。
