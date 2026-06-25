## Context

儀表板讀取每小時寫入的 Google Sheet（`Group_Table_Status`）。實地查核發現：監測 R 腳本是 06/24 早上才建置（腳本最後存檔 10:14、首筆資料 09:57），且有整夜空窗（06/24 00:00–09:57、06/25 01:00–08:00 皆無資料），但畫面僅顯示最後一筆快照、毫無提示。現有純資料層（`core.js`）已具 `extractRecords`／`sliceByRange`／`parseTime`／`human` 等可重用函式;UI 為 zero-build 原生 HTML/JS,以 `window.DFCore`／`window.DFViews` UMD 模式同時供瀏覽器與 Node 測試使用。

## Goals / Non-Goals

**Goals:**
- 讓「整體過時」與「歷史空窗」一眼可見,降低把過時資料誤當最新的風險。
- 偵測邏輯為純函式、可單元測試(時間以參數注入)。
- 視覺與既有「Slate Ops」設計語彙一致,並以琥珀色區分「排程問題」與「單表逾時」。
- 不新增相依、不破壞既有行為、不改動 R 腳本與憑證。

**Non-Goals:**
- 不負責修復排程本身(屬主機端 Windows 工作排程器／cron,超出本儲存庫)。
- 不做跨時區自動校正(預設假設瀏覽器時區＝資料時區 Asia/Taipei,門檻可設定)。
- 不做主動推播／通知(僅畫面內警示)。

## Decisions

- **過時判定以注入的 `now` 計算**:`snapshotAgeMin(checkTime, now)` 回傳分鐘,`isStale(checkTime, now, thresholdMin)` 比較門檻。`app.js` 傳入 `new Date()`;測試傳入固定時間。`Check_Time` 解析沿用既有 `parseTime`(本地時間)。
- **門檻可設定,預設值取自排程節奏**:`scheduleCadenceMin: 60`(每小時)、`staleThresholdMin: 90`(允許一次稍遲;>90 分鐘代表至少漏一次整點)、`gapToleranceFactor: 1.5`。集中於 `config.js`,不寫死於邏輯。
- **空窗偵測純由資料推導(時區穩健)**:`detectGaps(records, cadenceMin, tolerance)` 內部依時間排序,相鄰間隔 > `cadence × tolerance` 即記一個空窗,缺漏筆數 = `round(間隔/cadence) − 1`;`summarizeGaps` 彙總。不需 `now`,故不受瀏覽器時鐘影響。
- **過時橫幅置於全域頁首正下方、所有畫面可見**:`renderHeader()` 之後輸出一條 sticky 橫幅(過時才輸出)。因屬「整體」訊號,放頁首層級而非單一畫面內。
- **琥珀色新 token**:bg `#FEF4E5`、text `#B26B07`、line/icon `#E08A1E`。刻意不重用逾時紅,讓「排程中斷(meta)」與「單表 SLA 逾時」可區分。
- **空窗加註附加於既有摘要列**:歷史頁籤摘要「{範圍} · 共 N 筆 · M 筆逾時」後接「· ⚠ K 個排程空窗(缺 P 筆)」,無空窗則略。重用既有 `sliceByRange` 結果,不另打 API。

## Risks / Trade-offs

- **瀏覽器時區假設**:`now` 來自瀏覽器,若使用者時區非 Asia/Taipei,過時年齡會偏移。緩解:門檻可設定;空窗偵測(主要的細緻訊號)完全不依賴 `now`。
- **節奏假設固定為每小時**:`scheduleCadenceMin` 寫在設定;若未來改節奏,調設定即可。容忍係數 1.5 避免把正常的秒級抖動(09:57 vs 11:00)誤判。
- **誤報/漏報平衡**:門檻 90 分鐘對「每小時」節奏允許一次稍遲;過嚴會吵、過鬆會慢。預設值可後續依實際抖動調整。
- **新 token 擴充調色盤**:增加一組琥珀色;已限定僅用於排程警示,不擴散到其他語意。
