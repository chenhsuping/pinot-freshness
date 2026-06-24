# 資料觀測儀表板（Data Freshness Dashboard）

手機 / 電腦皆可用的資料新鮮度 + SLA 監測儀表板。純靜態、零編譯，直接讀 Google Sheet，
部署在 GitHub Pages、接自有網域 `hsuping.org`。設計主題 = Slate Ops。

> v1 範圍：**HK only**。TW 留待後續擴充（`config.js` 取消註解 + 首頁加地區切換）。

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 應用外殼：密碼閘 + 容器 + 載入字型/腳本 |
| `styles.css` | 重置、頁面底色、密碼閘、載入/狀態樣式 |
| `app.js` | gviz 讀取、正規化、導覽狀態、四畫面渲染、近七天 Downtime（真實歷史）、密碼閘 |
| `config.js` | **要改的設定都在這**：sheet ID/tab、密碼雜湊、自動刷新 |
| `MobilePreview.html` | iPhone 390×844 手機外框預覽（iframe 套 `index.html`） |
| `CNAME` | 自有網域 `hsuping.org` |

## 資料來源（一次性設定）

1. 開啟 HK Google Sheet（`config.js` 內 `regions.HK.id`）。
2. 共用 → 一般存取權 → **知道連結的人 → 檢視者**。
   gviz 介面才讀得到；否則儀表板會顯示「讀取失敗」。
3. R 腳本維持原本 append 到 tab `HK` 的流程即可，**不需改動**。

> 資料會公開可讀（資料表名稱、延遲、SLA）。本儀表板的密碼閘僅為輕量遮擋、非真正加密。

## 改密碼

`config.js` 內存的是密碼的 SHA-256 雜湊（目前對應 `53343286@Di`）。要換密碼，在瀏覽器
console 執行並把結果貼回 `password_sha256`：

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('新密碼'))
  .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')));
```

## 本機預覽

因為要 `fetch` gviz，需用本機 HTTP server（不能用 `file://` 直接開）：

```bash
cd dashboard
python -m http.server 8080
# 瀏覽器開 http://localhost:8080/            （桌機版）
# 或       http://localhost:8080/MobilePreview.html （手機外框預覽）
```

## 部署到 GitHub Pages + hsuping.org

1. 把 `dashboard/` 這個 repo push 到 GitHub（公開 repo；**不要**包含上層的 `.R` 腳本，內含真實 DB 憑證）。
2. Settings → Pages → Source = `main` 分支 `/ (root)`。
3. `CNAME` 已含 `hsuping.org`。
4. DNS（apex 根網域）設 A 記錄指向 GitHub Pages：
   `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`。
5. 憑證簽發後，Pages 後台勾 **Enforce HTTPS**。

## 規格

設計與需求規格見 `openspec/changes/add-data-freshness-dashboard/`
與 `docs/superpowers/specs/2026-06-24-data-freshness-dashboard-design.md`。
