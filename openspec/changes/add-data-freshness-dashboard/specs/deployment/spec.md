## ADDED Requirements

### Requirement: GitHub Pages 靜態託管於自有 apex 網域
系統 SHALL 以 GitHub Pages 靜態託管，並透過 `CNAME` 檔與 apex 網域 `hsuping.org` 綁定。
網域 MUST 以 A 記錄指向 GitHub Pages IP（`185.199.108.153`、`185.199.109.153`、
`185.199.110.153`、`185.199.111.153`），並 MUST 於憑證簽發後啟用 Enforce HTTPS。

#### Scenario: 綁定自有網域
- **WHEN** repo 部署到 GitHub Pages 且 `CNAME` 內容為 `hsuping.org`
- **THEN** 網站可於 `https://hsuping.org` 經 HTTPS 存取

### Requirement: 零編譯部署
系統 SHALL 為零編譯純靜態（vanilla HTML/CSS/JS），不得需要 build step；推送靜態檔即可由 Pages 提供服務。

#### Scenario: 無 build 即可服務
- **WHEN** 將 `index.html`、`styles.css`、`app.js`、`config.js` 等靜態檔推送到 Pages 來源
- **THEN** 網站直接可用，無需任何打包或編譯步驟

### Requirement: 憑證隔離（R 腳本不入公開 repo）
系統 SHALL 確保含真實憑證的 R 腳本（Trino DB 密碼、`api.superccp.com` 帳密）不進入此公開 repo；
公開 repo MUST 僅含靜態儀表板檔案與規格文件。

#### Scenario: R 腳本被排除
- **WHEN** 檢視公開 repo 的追蹤檔案
- **THEN** 不存在任何 `.R` 腳本或其中的憑證，只有靜態儀表板與 openspec/docs 檔案
