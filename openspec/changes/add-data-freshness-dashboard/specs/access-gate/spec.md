## ADDED Requirements

### Requirement: 進入前的密碼閘
系統 SHALL 在首次進入時顯示密碼畫面，將使用者輸入以 SHA-256（SubtleCrypto）雜湊後與 `config.js`
內存的雜湊比對；相符 MUST 放行並於 `localStorage` 記住，不符 MUST 拒絕進入。已記住的訪客 MUST
略過密碼畫面，並提供登出以清除記住狀態。

#### Scenario: 密碼正確放行並記住
- **WHEN** 使用者輸入正確密碼（雜湊與設定相符）
- **THEN** 進入主畫面，並於 `localStorage` 寫入通過旗標

#### Scenario: 密碼錯誤拒絕
- **WHEN** 使用者輸入錯誤密碼（雜湊不符）
- **THEN** 停留在密碼畫面並提示錯誤，不顯示主畫面

#### Scenario: 已記住的訪客略過
- **WHEN** `localStorage` 已有通過旗標
- **THEN** 載入後直接顯示主畫面，不再要求輸入密碼

#### Scenario: 登出清除狀態
- **WHEN** 使用者點選登出
- **THEN** 清除 `localStorage` 旗標，下次進入重新要求密碼

### Requirement: 密碼以雜湊儲存且聲明為裝飾性
系統 SHALL 僅於原始碼中儲存密碼的 SHA-256 雜湊，不得儲存明碼；並於文件中明確聲明此密碼閘為裝飾性、
非真正安全（資料公開、雜湊可被繞過）。

#### Scenario: 原始碼不含明碼
- **WHEN** 檢視 `config.js`
- **THEN** 只見到 SHA-256 雜湊字串，看不到明碼密碼
