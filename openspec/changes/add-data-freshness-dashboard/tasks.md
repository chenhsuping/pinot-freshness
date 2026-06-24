## 1. 專案骨架與設定

- [ ] 1.1 在 `dashboard/` 建立 `index.html`、`styles.css`、`app.js`、`config.js` 空骨架
- [ ] 1.2 把附件原型 `Dashboard.dc.html` / `TableDetail.dc.html` / `README.md` / `ThemeOptions.dc.html` 收進 `design-reference/` 供對照
- [ ] 1.3 `config.js` 填入 `regions.HK`（id `1Ti9…3pF4`、tab `HK`）、`defaultRegion:'HK'`、`refreshMs:0`
- [ ] 1.4 產生 `53343286@Di` 的 SHA-256 hex 並填入 `config.password_sha256`
- [ ] 1.5 `index.html` 載入 Google Fonts（Space Grotesk 400/500/600/700、JetBrains Mono 400/500/600）

## 2. 資料層（sheet-data-access）

- [ ] 2.1 寫 gviz 抓取函式：組 `…/gviz/tq?tqx=out:json&sheet=HK&tq=select * order by F desc limit 150`，剝除 `/*O_o*/…setResponse(…)` 包裝後 `JSON.parse`
- [ ] 2.2 寫列解析：時間/文字取 `f`、數值（`sla`/`delayMin`）取 `v`，輸出共同模型 `{region,bu,group,table,source,sla,checkTime,maxUpdate,delayMin,delayHuman,status}`
- [ ] 2.3 過濾出最大 `Check_Time` 批次為目前快照
- [ ] 2.4 動態推導：每 BU 的群組清單與不重複資料表清單（皆首見順序）
- [ ] 2.5 詳情歷史抓取：`select F, I where A='{bu}' and B='{group}' and C='{table}' order by F desc limit 800`，反轉時間序、過濾近七天（`trendDays`）；窗內無點則退回現有全部、皆無則回空陣列
- [ ] 2.6 錯誤處理：gviz/解析失敗回報可辨識錯誤狀態（不靜默吞）

## 3. 密碼閘（access-gate）

- [ ] 3.1 密碼畫面（Slate Ops 風格置中卡）+ 輸入框
- [ ] 3.2 SubtleCrypto SHA-256 雜湊輸入並與 `config` 比對；相符寫 `localStorage` 旗標
- [ ] 3.3 已記住則略過密碼畫面；錯誤顯示提示
- [ ] 3.4 登出鈕清除 `localStorage` 旗標

## 4. UI 狀態與導覽（dashboard-ui 基礎）

- [ ] 4.1 建立應用狀態 `{region:'HK', mode, bu, stack, gFilter}` 與單一 render 函式
- [ ] 4.2 stack push/pop 導覽：`openGroup`（重置 gFilter='all'）、`openTable`、`openDetail`、`back`
- [ ] 4.3 載入中骨架/spinner、讀取錯誤（重試 + 「請確認 sheet 已設為可檢視」提示）、空資料狀態
- [ ] 4.4 首頁重新整理鈕；`refreshMs` 為 0 時不自動刷新

## 5. 畫面實作（dashboard-ui，照 Slate Ops 還原）

- [ ] 5.1 首頁：標題 + 副標「更新 {checkTime} · N 群組 / M 張表」+ 模式切換 + BU 膠囊
- [ ] 5.2 首頁依群組：群組卡（健康度色塊 `round((total-breached)/total*100)` + 名稱 + 逾時/總數 meta）
- [ ] 5.3 首頁依資料表：資料表列（狀態點 + 表名 + 群組數 + 狀態 pill）
- [ ] 5.4 群組→資料表：返回 + 標題 + 篩選膠囊（全部/只看異常/Realtime/Offline）+ 表卡格
- [ ] 5.5 資料表→各群組：標題 + 各群組卡（只列含此表的群組）
- [ ] 5.6 詳情頁：狀態條「近七天累積 Downtime」+ 資訊卡 4 列（檢查時間/資料更新時間/近七天 SLA 總時數/近七天累積 Downtime）
- [ ] 5.7 詳情頁近七天趨勢 SVG：真實歷史折線 + 面積 + y=SLA 虛線門檻 + 端點 + X 軸 4 個 `MM/DD HH時` 日期刻度

## 6. 視覺還原與響應式（dashboard-ui token）

- [ ] 6.1 套用色彩 token：Breached 紅系、Met 綠系、Realtime 藍 chip / Offline 灰 chip、選中 `#232B3D`、頁底 `#EDF0F5`
- [ ] 6.2 字型套用：Space Grotesk（UI）+ JetBrains Mono（數字/表名/時間）
- [ ] 6.3 純內在響應式：`clamp()` + `auto-fill`/`minmax` grid，不用 media query；手機單欄、桌面多欄
- [ ] 6.4 與 `design-reference/` 逐畫面比對，校正間距/圓角/邊框/陰影

## 7. 部署（deployment）

- [ ] 7.1 確認 HK sheet 已設「知道連結者可檢視」並實測 gviz 可讀
- [ ] 7.2 建立 `CNAME`（內容 `hsuping.org`）與 `README.md`（設定與部署步驟）
- [ ] 7.3 確認公開 repo 不含任何 `.R` 腳本或憑證（只追蹤靜態檔與 openspec/docs）
- [ ] 7.4 push 到 GitHub 公開 repo，Settings → Pages → Source = `main` / root
- [ ] 7.5 DNS 設 A 記錄（185.199.108–111.153）；憑證簽發後勾 Enforce HTTPS
- [ ] 7.6 用手機與電腦各驗證一次：密碼閘、四畫面、篩選、詳情真實趨勢、重新整理

## 8. 驗收

- [ ] 8.1 對照 `openspec/changes/add-data-freshness-dashboard/specs/` 各 scenario 逐項驗證
- [ ] 8.2 `openspec validate add-data-freshness-dashboard --strict` 通過
