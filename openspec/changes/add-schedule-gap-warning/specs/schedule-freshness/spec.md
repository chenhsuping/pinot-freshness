## ADDED Requirements

### Requirement: 快照過時偵測
系統 SHALL 依「最新快照 `Check_Time`」與「目前時間」計算快照年齡（分鐘），並在年齡 ≥ 過時門檻（`staleThresholdMin`，預設 90）時判定為過時。目前時間 MUST 由呼叫端以參數注入，使偵測為可單元測試的純函式。年齡 MUST 以 `Check_Time` 解析為本地時間後與目前時間相減取分鐘。當 `Check_Time` 缺漏或無法解析時 MUST 回傳年齡為 null 且判定為「未過時」，避免誤報。

#### Scenario: 未過時
- **WHEN** 最新快照年齡小於 `staleThresholdMin`
- **THEN** `isStale` 為 false，不觸發警示

#### Scenario: 已過時
- **WHEN** 最新快照年齡大於或等於 `staleThresholdMin`
- **THEN** `isStale` 為 true，並可取得人性化年齡供警示顯示

#### Scenario: 無有效快照時間
- **WHEN** `Check_Time` 缺漏或無法解析
- **THEN** 年齡回傳 null 且 `isStale` 為 false（不誤報）

### Requirement: 歷史排程空窗偵測
系統 SHALL 依排程節奏（`scheduleCadenceMin`，預設 60 分鐘）與容忍係數（`gapToleranceFactor`，預設 1.5）偵測一組檢查記錄中相鄰整點的缺漏。當相鄰兩筆 `Check_Time` 間隔大於 `cadence × tolerance`（分鐘）時 MUST 視為一個空窗，其缺漏筆數 MUST 為 `round(間隔 / cadence) − 1`。函式 MUST 回傳空窗清單（各含起訖時間與缺漏筆數）並提供彙總（空窗數、總缺漏筆數）。記錄少於 2 筆時 MUST 回傳無空窗。偵測 MUST 與記錄輸入順序無關（內部依時間排序）。

#### Scenario: 連續無空窗
- **WHEN** 每筆相鄰記錄間隔約等於 `scheduleCadenceMin`
- **THEN** 空窗數為 0、總缺漏筆數為 0

#### Scenario: 單一空窗
- **WHEN** 某相鄰兩筆間隔約為 3 倍 `scheduleCadenceMin`
- **THEN** 偵測到 1 個空窗，且該空窗缺漏筆數為 2

#### Scenario: 多空窗彙總
- **WHEN** 記錄中有多處缺漏
- **THEN** 彙總正確加總空窗數與總缺漏筆數

#### Scenario: 記錄不足
- **WHEN** 記錄少於 2 筆
- **THEN** 回傳無空窗（空窗數 0）
