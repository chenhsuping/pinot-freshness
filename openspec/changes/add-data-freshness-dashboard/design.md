## Context

現有兩支 R 腳本把資料表新鮮度快照 append 到 Google Sheet（HK / TW 各一份，schema 不同）。
v1 只做 HK。HK sheet（`1Ti9…3pF4`，tab `HK`）欄位順序固定：A=BU, B=group_name, C=table_name,
D=Source_Type, E=SLA, F=Check_Time, G=Max_Update_Time, H=max_update_unix_ms, I=Delay_Time,
J=Delay_Status, K=SLA_Status, L=Update_Count。sheet 持續累積歷史（每批共用一個 `Check_Time`）。

附件 `Dashboard.dc.html` / `TableDetail.dc.html` / `README.md` 是像素級設計依據（Slate Ops 主題），
但用的是自製模板 runtime，需以一般 HTML/CSS/JS 重建，不可照搬該 runtime。

限制：使用者要求純靜態、零編譯、公開可達、可接受裝飾性密碼與資料公開；不碰後端/Apps Script/CI。

## Goals / Non-Goals

**Goals:**
- 手機/電腦皆可用、快速查詢的 HK 資料新鮮度儀表板。
- 零編譯純靜態、可直接 push 到 GitHub Pages、接 `hsuping.org`。
- 像素級重現 Slate Ops 四畫面；詳情頁「近七天累積 Downtime」趨勢與彙總用真實歷史。
- 含真實憑證的 R 腳本不進入公開 repo。

**Non-Goals:**
- TW（後續擴充，程式預留 `region` 鍵）。
- 真正的帳號驗證 / 後端 / 資料保護。
- 改動 R 腳本或 Google Sheet 結構。
- CI build / 打包工具。

## Decisions

### D1：資料讀取用 gviz client-side，而非 Apps Script / 發布 CSV / GitHub Actions 烤 JSON
選 `…/gviz/tq?tqx=out:json&tq=select * order by F desc limit 150`，瀏覽器直接抓。
- **為何**：使用者明確要「公開沒關係、不用後端、不用快照、純靜態」。gviz 支援 `order by F desc limit`，
  只抓最近一批，**歷史成長也不會變慢**——比「發布 CSV 抓整份再過濾」快。
- **取捨的替代方案**：Apps Script（可真密碼/私有，但要後端，使用者否決）；發布 CSV（最 CORS 友善但無
  query、payload 隨歷史長大）；GitHub Actions 烤 JSON（最快但有 cron 延遲、會 commit 髒 repo，使用者否決）。
- 回應是 `/*O_o*/google.visualization.Query.setResponse({…});` 包裝，需剝除再 `JSON.parse`；
  時間值優先取 gviz 的 `f`（格式化字串），數值取 `v`。

### D2：零編譯 vanilla（HTML/CSS/JS），而非 React + Vite
- **為何**：使用者選「零編譯純靜態」。四畫面 + stack 狀態用一個 render 函式即可（原型本就是這形式），
  push 到 Pages 即時可用，最易維護。
- **取捨**：React 結構較佳但需 build step；對此規模不划算。

### D3：詳情頁「近七天累積 Downtime」用真實歷史，而非原型的合成值
- **為何**：sheet 本就累積歷史，每個 `Check_Time` 批次即一個資料點；用真實七天彙總比合成更有價值。
- **作法**：開詳情頁時 `select F, I where A='{bu}' and B='{group}' and C='{table}' order by F desc limit 800`，
  反轉為時間序、過濾近七天（`trendDays`）。由窗內資料點計算：累積 Downtime = Σ Delay_Time、
  SLA 總時數 = SLA × 點數；趨勢線用窗內所有點；X 軸 4 個日期刻度（`MM/DD HH時`）由 `Check_Time` 推算。
- **狀態條**：標籤固定「近七天累積 Downtime」，顏色仍依當前列 Breached/Met（紅/綠）。

### D4：BU→群組清單從資料動態推導，而非寫死
- **為何**：以利日後 TW 增站（如 `bj`、`bt`）不需改碼。distinct group 取首見順序。

### D5：裝飾性密碼以 SHA-256 雜湊存 config，而非明碼
- **為何**：雖是裝飾性，至少原始碼裡看不到明碼；用 SubtleCrypto 比對，零相依。
- **限制**：資料公開、雜湊可繞過——明確聲明非真正安全。

### D6：獨立 `dashboard/` 公開 repo，隔離 R 腳本
- **為何**：R 腳本含真實 Trino DB 密碼與 `api.superccp.com` 帳密；公開 repo 不可包含。
  以獨立 repo（root 為 Pages 來源）確保零洩漏。

## Risks / Trade-offs

- **gviz CORS / 格式變動** → 以 text 抓取後剝包裝解析；錯誤時顯示重試與「請確認 sheet 已設為可檢視」提示；
  若 gviz 失效，備援為「發布到網路 CSV」端點（同樣 client-side）。
- **gviz 時間欄位型別**（text vs datetime，影響 `order by` 與解析）→ 同時處理 `v`/`f`；`Check_Time` 為
  `YYYY-MM-DD HH:MM:SS` 文字時 `order by` 仍正確（字典序＝時間序）。
- **sheet 必須公開可檢視** → 資料表名稱/延遲對外可見（使用者已接受）。
- **密碼為裝飾性** → 不可用於真正機密；未來要安全需後端。
- **apex 網域** → 用 A 記錄指向 GitHub Pages IP；憑證簽發後才勾 Enforce HTTPS。

## Migration Plan

1. 在 `dashboard/` 建立靜態檔並本機開啟驗證（可用簡易 static server）。
2. 確認 HK sheet 已設「知道連結者可檢視」。
3. `dashboard/` push 到新的 GitHub 公開 repo。
4. Settings → Pages → Source = `main` / root。
5. `CNAME` 內容 `hsuping.org`；DNS 設 A 記錄 `185.199.108.153 / .109.153 / .110.153 / .111.153`。
6. 憑證簽發後勾 Enforce HTTPS。
- **回滾**：停用 Pages 或移除 DNS 記錄即可；無資料庫狀態需回復。

## Open Questions

- 無阻塞性問題。自動刷新間隔 v1 預設關閉，日後可再開放設定。
