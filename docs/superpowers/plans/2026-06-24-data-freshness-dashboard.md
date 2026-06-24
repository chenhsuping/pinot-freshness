# 資料新鮮度儀表板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把現有可運作的儀表板 spike，硬化成「邏輯與 DOM 分離、且有自動化測試覆蓋」的模組化實作。

**Architecture:** 把純邏輯抽到 `core.js`（資料：gviz 解析、正規化、最新快照、衍生清單、趨勢數學、雜湊），把純 HTML 字串產生器抽到 `views.js`，`app.js` 只留狀態、事件、fetch、DOM 注入。三者都用同一個 UMD 風格包裝，使瀏覽器 `<script>` 與 Node `require` 都能載入，讓純函式可在 Node 內測試。測試用 Node 內建 `node:test`／`node:assert`，零相依、不需打包，維持 app 的「零編譯」。

**Tech Stack:** Vanilla HTML/CSS/JS（ES5 風格、無框架）、Google Sheets gviz、`crypto.subtle`（瀏覽器與 Node 20 皆有）、Node 20 內建測試執行器。

## Global Constraints

> 以下為 spec（`openspec/changes/add-data-freshness-dashboard/` 與 `docs/superpowers/specs/2026-06-24-data-freshness-dashboard-design.md`）的全域約束，每個 task 都隱含適用。

- **零編譯**：出貨的 app（`index.html`/`styles.css`/`app.js`/`core.js`/`views.js`/`config.js`）不得需要 build step；GitHub Pages 直接服務。測試僅為開發用，不部署、不影響 Pages。
- **無第三方相依**：測試只用 Node 內建 `node:test`／`node:assert`，**不得** `npm install` 任何套件（不得新增 `node_modules`）。
- **資料範圍 v1 = HK only**；程式保留 `region` 鍵以利日後加 TW。
- **資料來源**：HK Google Sheet `1Ti9iywMTyd7mEvnz47NvfQUsIruuhrxyWwFQx1L3pF4`，tab `HK`，欄位順序固定 A=BU, B=group_name, C=table_name, D=Source_Type, E=SLA, F=Check_Time, G=Max_Update_Time, H=max_update_unix_ms, I=Delay_Time, J=Delay_Status, K=SLA_Status, L=Update_Count。
- **狀態語意**：`Breached`→紅（文字 `#C53D34`／線點 `#E0584A`／底 `#FCEAE7`），`Met`→綠（文字 `#1F8A5B`／線點 `#34A06B`／底 `#E6F4EC`）；`Realtime`→藍 chip（`#E7F0FE`/`#2F6FE0`），`Offline`→灰 chip（`#EEF1F5`/`#5E6675`）；選中控制 `#232B3D`。
- **密碼**：裝飾性，`config.js` 只存 SHA-256 雜湊（明碼 `53343286@Di` 的雜湊 = `a4cce81663dc5e2bf18dfbf8d4a7c64fc4313b49210831c201d25927afe99c37`），不得存明碼。
- **憑證隔離**：公開 repo 不得含任何 `.R` 腳本或其中憑證。
- **網域**：apex `hsuping.org`，`CNAME` 內容即該網域。
- 所有 commit 訊息結尾加：`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

| 檔案 | 職責 | 狀態 |
|---|---|---|
| `core.js` | 純資料邏輯（無 DOM、無 fetch）：`parseGvizText`、`cellV`/`cellF`、`normalizeRow`、`selectLatestSnapshot`、`groupsInBU`、`distinctTables`、`buOf`、`parseTime`、`extractHistory`、`buildTrend`、`mkColors`、`filterRows`、`escHtml`、`slaHuman`、`human`、`weekTicks`、`sha256Hex` | 新增（從 `app.js` 抽出） |
| `views.js` | 純 HTML 字串產生器（無 DOM）：`viewMenu`、`viewGroupTables`、`viewTableGroups`、`viewDetail`、`cardTable` | 新增（從 `app.js` 抽出） |
| `app.js` | 狀態機、事件委派、fetch、密碼閘、DOM 注入；呼叫 `DFCore`／`DFViews` | 改寫（瘦身） |
| `index.html` | 依序載入 `config.js`→`core.js`→`views.js`→`app.js` | 修改 script 順序 |
| `styles.css` | 不變 | 不動 |
| `config.js` | 不變（已含雜湊與 sheet 設定） | 不動 |
| `package.json` | 只放 `"scripts": { "test": "node --test" }`，無 dependencies | 新增 |
| `test/fixtures/hk-snapshot.gviz.txt` | 手寫的快照 gviz 回應（2 個 Check_Time 批次、4 群組） | 新增 |
| `test/fixtures/hk-history.gviz.txt` | 手寫的歷史 gviz 回應（F、I 兩欄、3 點） | 新增 |
| `test/core.test.js` | `core.js` 全部純函式的單元測試 | 新增 |
| `test/views.test.js` | `views.js` HTML 子字串斷言 | 新增 |
| `test/integration.test.js` | fixture → 解析→正規化→快照→衍生→趨勢 全流程 | 新增 |
| `docs/MANUAL-TESTS.md` | UI／部署的人工驗收案例（無法在零編譯下自動化的部分） | 新增 |

執行測試：`node --test`（在 `dashboard/` 目錄）。

---

## Task 1: 測試骨架 + 確定性 fixtures

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/test/fixtures/hk-snapshot.gviz.txt`
- Create: `dashboard/test/fixtures/hk-history.gviz.txt`
- Create: `dashboard/test/smoke.test.js`

**Interfaces:**
- Consumes: 無
- Produces: `node --test` 可執行；兩個 fixture 檔可被 `fs.readFileSync` 讀到。

- [ ] **Step 1: 建立 `package.json`**

```json
{
  "name": "data-freshness-dashboard",
  "private": true,
  "version": "1.0.0",
  "description": "HK data freshness dashboard (zero-build static app + node:test suite)",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: 建立快照 fixture `test/fixtures/hk-snapshot.gviz.txt`**

內容（含 gviz 包裝；最新批次 `2026-06-24 12:00:11` 有 4 列、較舊批次 `2026-06-24 11:00:11` 有 2 列）：

```
/*O_o*/
google.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","sig":"1","table":{"cols":[{"id":"A","label":"BU","type":"string"},{"id":"B","label":"group_name","type":"string"},{"id":"C","label":"table_name","type":"string"},{"id":"D","label":"Source_Type","type":"string"},{"id":"E","label":"SLA","type":"number"},{"id":"F","label":"Check_Time","type":"string"},{"id":"G","label":"Max_Update_Time","type":"string"},{"id":"H","label":"max_update_unix_ms","type":"string"},{"id":"I","label":"Delay_Time","type":"number"},{"id":"J","label":"Delay_Status","type":"string"},{"id":"K","label":"SLA_Status","type":"string"},{"id":"L","label":"Update_Count","type":"number"}],"rows":[
{"c":[{"v":"BKW"},{"v":"bjgroup"},{"v":"dim_account"},{"v":"Offline"},{"v":240,"f":"240"},{"v":"2026-06-24 12:00:11"},{"v":"2026-06-24 07:43:02"},{"v":"1"},{"v":257,"f":"257"},{"v":"4時 17分"},{"v":"Breached"},{"v":1,"f":"1"}]},
{"c":[{"v":"MCD"},{"v":"cxgroup"},{"v":"dim_account"},{"v":"Offline"},{"v":240,"f":"240"},{"v":"2026-06-24 12:00:11"},{"v":"2026-06-24 10:20:00"},{"v":"1"},{"v":100,"f":"100"},{"v":"1時 40分"},{"v":"Met"},{"v":1,"f":"1"}]},
{"c":[{"v":"MCD"},{"v":"cxgroup"},{"v":"fact_game_transaction"},{"v":"Realtime"},{"v":15,"f":"15"},{"v":"2026-06-24 12:00:11"},{"v":"2026-06-24 11:55:00"},{"v":"1"},{"v":5,"f":"5"},{"v":"5分"},{"v":"Met"},{"v":1,"f":"1"}]},
{"c":[{"v":"MCD"},{"v":"segroup"},{"v":"dim_account"},{"v":"Offline"},{"v":240,"f":"240"},{"v":"2026-06-24 12:00:11"},{"v":"2026-06-24 07:00:00"},{"v":"1"},{"v":300,"f":"300"},{"v":"5時 0分"},{"v":"Breached"},{"v":1,"f":"1"}]},
{"c":[{"v":"BKW"},{"v":"bjgroup"},{"v":"dim_account"},{"v":"Offline"},{"v":240,"f":"240"},{"v":"2026-06-24 11:00:11"},{"v":"2026-06-24 07:43:02"},{"v":"1"},{"v":197,"f":"197"},{"v":"3時 17分"},{"v":"Met"},{"v":1,"f":"1"}]},
{"c":[{"v":"MCD"},{"v":"cxgroup"},{"v":"dim_account"},{"v":"Offline"},{"v":240,"f":"240"},{"v":"2026-06-24 11:00:11"},{"v":"2026-06-24 10:20:00"},{"v":"1"},{"v":40,"f":"40"},{"v":"40分"},{"v":"Met"},{"v":1,"f":"1"}]}
]}});
```

- [ ] **Step 3: 建立歷史 fixture `test/fixtures/hk-history.gviz.txt`**

```
/*O_o*/
google.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","sig":"2","table":{"cols":[{"id":"F","label":"Check_Time","type":"string"},{"id":"I","label":"Delay_Time","type":"number"}],"rows":[
{"c":[{"v":"2026-06-24 12:00:11"},{"v":257,"f":"257"}]},
{"c":[{"v":"2026-06-24 11:00:11"},{"v":197,"f":"197"}]},
{"c":[{"v":"2026-06-23 11:00:11"},{"v":50,"f":"50"}]}
]}});
```

- [ ] **Step 4: 寫骨架 smoke 測試 `test/smoke.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('fixtures load and contain gviz wrapper', () => {
  const snap = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');
  const hist = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history.gviz.txt'), 'utf8');
  assert.match(snap, /google\.visualization\.Query\.setResponse/);
  assert.match(hist, /google\.visualization\.Query\.setResponse/);
});
```

- [ ] **Step 5: 執行測試確認可跑且通過**

Run: `cd dashboard && node --test`
Expected: 1 test pass（`fixtures load and contain gviz wrapper`），exit code 0。

- [ ] **Step 6: Commit**

```bash
git add dashboard/package.json dashboard/test/
git commit -m "test: add node:test harness and deterministic gviz fixtures

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `core.js` 骨架 + gviz 解析

**Files:**
- Create: `dashboard/core.js`
- Test: `dashboard/test/core.test.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - `DFCore.parseGvizText(text: string): {cols: Array, rows: Array}` — 剝除 `/*O_o*/…setResponse(…);` 包裝、`JSON.parse`、`status==='error'` 時 throw、格式不符 throw。
  - `DFCore.cellV(row, i): any` — `row.c[i].v` 或 `null`。
  - `DFCore.cellF(row, i): any` — `row.c[i].f`（若有）否則 `.v`，否則 `null`。

- [ ] **Step 1: 寫失敗測試 `test/core.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');

test('parseGvizText strips wrapper and returns table', () => {
  const t = Core.parseGvizText(SNAP);
  assert.equal(t.cols.length, 12);
  assert.equal(t.rows.length, 6);
});

test('parseGvizText throws on gviz error status', () => {
  const errBody = '/*O_o*/google.visualization.Query.setResponse({"status":"error","errors":[{"detailed_message":"boom"}]});';
  assert.throws(() => Core.parseGvizText(errBody), /boom/);
});

test('parseGvizText throws on non-gviz text', () => {
  assert.throws(() => Core.parseGvizText('not gviz at all'));
});

test('cellV and cellF read values', () => {
  const t = Core.parseGvizText(SNAP);
  const r0 = t.rows[0];
  assert.equal(Core.cellV(r0, 0), 'BKW');
  assert.equal(Core.cellF(r0, 4), '240');   // SLA has f
  assert.equal(Core.cellV(r0, 4), 240);
  assert.equal(Core.cellV({ c: [] }, 5), null);
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/core.test.js`
Expected: FAIL — `Cannot find module '../core.js'`。

- [ ] **Step 3: 建立 `core.js`（UMD 包裝 + 三個函式）**

```js
/* core.js — 純資料邏輯（瀏覽器 <script> 掛 window.DFCore；Node require 取 module.exports）。
 * 無 DOM、無 fetch、無全域狀態。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.DFCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseGvizText(text) {
    var s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error('gviz 回應格式異常');
    var json = JSON.parse(text.slice(s, e + 1));
    if (json.status === 'error') {
      var er = json.errors && json.errors[0];
      throw new Error((er && (er.detailed_message || er.message)) || 'gviz 查詢錯誤');
    }
    return json.table || { cols: [], rows: [] };
  }

  function cellV(row, i) { return row.c && row.c[i] ? row.c[i].v : null; }
  function cellF(row, i) {
    if (!row.c || !row.c[i]) return null;
    return row.c[i].f != null ? row.c[i].f : row.c[i].v;
  }

  return { parseGvizText: parseGvizText, cellV: cellV, cellF: cellF };
});
```

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/core.test.js`
Expected: 4 個 `parseGvizText`/`cellV` 相關 test PASS。

- [ ] **Step 5: Commit**

```bash
git add dashboard/core.js dashboard/test/core.test.js
git commit -m "feat: extract gviz parsing into core.js with tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 正規化 + 最新快照選擇

**Files:**
- Modify: `dashboard/core.js`（在 `return` 前加函式、加入匯出）
- Test: `dashboard/test/core.test.js`（append）

**Interfaces:**
- Consumes: `DFCore.parseGvizText`、`cellV`、`cellF`
- Produces:
  - `DFCore.normalizeRow(region: string, row): NormRow | null`，`NormRow = {region, bu, group, table, source, sla:number, checkTime:string, maxUpdate:string, delayMin:number, delayHuman:string, status}`。`bu` 為 null 時回 `null`。
  - `DFCore.selectLatestSnapshot(normRows: NormRow[]): {rows: NormRow[], checkTime: string|null}` — 以字串比較取最大 `checkTime`，過濾出該批次，並依序設 `row.id = 0..n-1`。空輸入回 `{rows:[], checkTime:null}`。

- [ ] **Step 1: 寫失敗測試（append 到 `test/core.test.js`）**

```js
test('normalizeRow maps HK columns to common model', () => {
  const t = Core.parseGvizText(SNAP);
  const n = Core.normalizeRow('HK', t.rows[0]);
  assert.deepEqual(n, {
    region: 'HK', bu: 'BKW', group: 'bjgroup', table: 'dim_account',
    source: 'Offline', sla: 240, checkTime: '2026-06-24 12:00:11',
    maxUpdate: '2026-06-24 07:43:02', delayMin: 257, delayHuman: '4時 17分', status: 'Breached'
  });
});

test('normalizeRow returns null when BU missing', () => {
  assert.equal(Core.normalizeRow('HK', { c: [{ v: null }] }), null);
});

test('selectLatestSnapshot keeps only the newest Check_Time batch', () => {
  const t = Core.parseGvizText(SNAP);
  const norm = t.rows.map(function (r) { return Core.normalizeRow('HK', r); });
  const snap = Core.selectLatestSnapshot(norm);
  assert.equal(snap.checkTime, '2026-06-24 12:00:11');
  assert.equal(snap.rows.length, 4);
  assert.deepEqual(snap.rows.map(function (r) { return r.id; }), [0, 1, 2, 3]);
  const breach = snap.rows.filter(function (r) { return r.status === 'Breached'; }).length;
  assert.equal(breach, 2);
});

test('selectLatestSnapshot handles empty input', () => {
  assert.deepEqual(Core.selectLatestSnapshot([]), { rows: [], checkTime: null });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/core.test.js`
Expected: FAIL — `Core.normalizeRow is not a function`。

- [ ] **Step 3: 在 `core.js` 加入函式（放在 `cellF` 之後、`return` 之前）**

```js
  var COL = { bu: 0, group: 1, table: 2, source: 3, sla: 4, checkTime: 5, maxUpdate: 6, delay: 8, delayHuman: 9, status: 10 };

  function normalizeRow(region, r) {
    var bu = cellV(r, COL.bu);
    if (bu == null) return null;
    return {
      region: region,
      bu: String(bu),
      group: String(cellV(r, COL.group)),
      table: String(cellV(r, COL.table)),
      source: String(cellV(r, COL.source)),
      sla: Number(cellV(r, COL.sla)),
      checkTime: String(cellF(r, COL.checkTime)),
      maxUpdate: String(cellF(r, COL.maxUpdate)),
      delayMin: Number(cellV(r, COL.delay)),
      delayHuman: String(cellV(r, COL.delayHuman)),
      status: String(cellV(r, COL.status))
    };
  }

  function selectLatestSnapshot(normRows) {
    var rows = normRows.filter(function (x) { return x && x.checkTime && x.checkTime !== 'null'; });
    if (!rows.length) return { rows: [], checkTime: null };
    var latest = rows.reduce(function (m, r) { return r.checkTime > m ? r.checkTime : m; }, rows[0].checkTime);
    var snap = rows.filter(function (x) { return x.checkTime === latest; });
    snap.forEach(function (x, i) { x.id = i; });
    return { rows: snap, checkTime: latest };
  }
```

並把 `return { ... }` 改成包含新函式：

```js
  return {
    parseGvizText: parseGvizText, cellV: cellV, cellF: cellF,
    normalizeRow: normalizeRow, selectLatestSnapshot: selectLatestSnapshot
  };
```

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/core.test.js`
Expected: 全部 PASS（含新增 4 個）。

- [ ] **Step 5: Commit**

```bash
git add dashboard/core.js dashboard/test/core.test.js
git commit -m "feat: add normalizeRow and selectLatestSnapshot to core

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: BU 群組 / 資料表衍生

**Files:**
- Modify: `dashboard/core.js`
- Test: `dashboard/test/core.test.js`（append）

**Interfaces:**
- Consumes: `NormRow[]`
- Produces:
  - `DFCore.groupsInBU(rows: NormRow[], bu: string): string[]` — 該 BU 的 distinct group，首見順序。
  - `DFCore.distinctTables(rows: NormRow[], bu: string): string[]` — 該 BU 的 distinct table，首見順序。
  - `DFCore.buOf(rows: NormRow[], group: string): string` — 該 group 第一筆的 bu；找不到回 `''`。

- [ ] **Step 1: 寫失敗測試（append）**

```js
function snapRows() {
  const t = Core.parseGvizText(SNAP);
  return Core.selectLatestSnapshot(t.rows.map(function (r) { return Core.normalizeRow('HK', r); })).rows;
}

test('groupsInBU returns first-seen groups for a BU', () => {
  const rows = snapRows();
  assert.deepEqual(Core.groupsInBU(rows, 'MCD'), ['cxgroup', 'segroup']);
  assert.deepEqual(Core.groupsInBU(rows, 'BKW'), ['bjgroup']);
});

test('distinctTables returns first-seen tables for a BU', () => {
  const rows = snapRows();
  assert.deepEqual(Core.distinctTables(rows, 'MCD'), ['dim_account', 'fact_game_transaction']);
});

test('buOf returns the BU owning a group', () => {
  const rows = snapRows();
  assert.equal(Core.buOf(rows, 'segroup'), 'MCD');
  assert.equal(Core.buOf(rows, 'bjgroup'), 'BKW');
  assert.equal(Core.buOf(rows, 'nope'), '');
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/core.test.js`
Expected: FAIL — `Core.groupsInBU is not a function`。

- [ ] **Step 3: 在 `core.js` 加入函式並匯出**

```js
  function rowsOfBU(rows, bu) { return rows.filter(function (r) { return r.bu === bu; }); }

  function groupsInBU(rows, bu) {
    var seen = [];
    rowsOfBU(rows, bu).forEach(function (r) { if (seen.indexOf(r.group) < 0) seen.push(r.group); });
    return seen;
  }

  function distinctTables(rows, bu) {
    var seen = [];
    rowsOfBU(rows, bu).forEach(function (r) { if (seen.indexOf(r.table) < 0) seen.push(r.table); });
    return seen;
  }

  function buOf(rows, group) {
    var r = rows.find(function (x) { return x.group === group; });
    return r ? r.bu : '';
  }
```

加入匯出（在 `return` 物件補上）：`groupsInBU: groupsInBU, distinctTables: distinctTables, buOf: buOf`。

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/core.test.js`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add dashboard/core.js dashboard/test/core.test.js
git commit -m "feat: add BU group/table derivations to core

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 時間解析 + 歷史擷取 + 趨勢數學

**Files:**
- Modify: `dashboard/core.js`
- Test: `dashboard/test/core.test.js`（append）

**Interfaces:**
- Consumes: `DFCore.cellV`、`cellF`、`parseGvizText`
- Produces:
  - `DFCore.parseTime(cell): Date | null` — 支援 `Date(y,m,d,h,mi,s)` 字串與 `YYYY-MM-DD HH:MM:SS` 字串。
  - `DFCore.extractHistory(table, hours: number): {t: Date, delay: number}[]` — table 為 gviz `{cols, rows}`（兩欄 F、I），轉成時間序、過濾「最後一點往前 `hours` 小時」；若過濾後 < 2 點則回全部點。
  - `DFCore.buildTrend(points: {delay:number}[], sla: number): {spark, area, threshY, lx, ly}`（皆字串）。

- [ ] **Step 1: 寫失敗測試（append）**

```js
const HIST = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history.gviz.txt'), 'utf8');

test('parseTime handles Date() and plain string', () => {
  const d1 = Core.parseTime({ v: 'Date(2026,5,24,12,0,11)' });
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 5);   // 0-based, 5 = June
  assert.equal(d1.getDate(), 24);
  assert.equal(d1.getHours(), 12);
  const d2 = Core.parseTime({ v: '2026-06-24 12:00:11' });
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getHours(), 12);
  assert.equal(Core.parseTime(null), null);
});

test('extractHistory filters to last N hours, chronological', () => {
  const t = Core.parseGvizText(HIST);
  const pts = Core.extractHistory(t, 24);
  assert.equal(pts.length, 2); // 23號 11:00 在 24h 視窗外
  assert.deepEqual(pts.map(function (p) { return p.delay; }), [197, 257]);
});

test('buildTrend produces deterministic SVG paths', () => {
  const tr = Core.buildTrend([{ delay: 10 }, { delay: 20 }], 15);
  assert.equal(tr.spark, 'M0.0 42.0 L300.0 6.0');
  assert.equal(tr.area, 'M0 78 L0.0 42.0 L300.0 6.0 L300 78 Z');
  assert.equal(tr.threshY, '24.0');
  assert.equal(tr.lx, '300.0');
  assert.equal(tr.ly, '6.0');
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/core.test.js`
Expected: FAIL — `Core.parseTime is not a function`。

- [ ] **Step 3: 在 `core.js` 加入函式並匯出**

```js
  function parseTime(cell) {
    if (!cell) return null;
    var v = cell.v, f = cell.f;
    if (typeof v === 'string') {
      var m = v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
      if (m) return new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    }
    var s = f || (typeof v === 'string' ? v : null);
    if (s) { var d = new Date(s.replace(/-/g, '/').replace('T', ' ')); if (!isNaN(d)) return d; }
    if (typeof v === 'number') return new Date(v);
    return null;
  }

  function extractHistory(table, hours) {
    var pts = (table.rows || []).map(function (r) {
      return { t: parseTime(r.c && r.c[0]), delay: Number(cellV(r, 1)) };
    }).filter(function (p) { return p.t && !isNaN(p.delay); });
    pts.reverse();
    if (pts.length >= 2) {
      var last = pts[pts.length - 1].t.getTime();
      var cutoff = last - hours * 3600 * 1000;
      var within = pts.filter(function (p) { return p.t.getTime() >= cutoff; });
      if (within.length >= 2) return within;
    }
    return pts;
  }

  function buildTrend(points, sla) {
    var W = 300, top = 6, bottom = 78, plotH = bottom - top;
    var vals = points.map(function (p) { return p.delay; });
    var max = Math.max.apply(null, vals.concat([sla * 1.15, 1]));
    var n = vals.length, step = W / (n > 1 ? (n - 1) : 1);
    var y = function (v) { return bottom - (v / max) * plotH; };
    var line = '', area = 'M0 ' + bottom + ' ';
    vals.forEach(function (v, i) {
      var x = (i * step).toFixed(1), yy = y(v).toFixed(1);
      line += (i ? 'L' : 'M') + x + ' ' + yy + ' '; area += 'L' + x + ' ' + yy + ' ';
    });
    area += 'L' + W + ' ' + bottom + ' Z';
    return { spark: line.trim(), area: area, threshY: y(sla).toFixed(1), lx: ((n - 1) * step).toFixed(1), ly: y(vals[n - 1]).toFixed(1) };
  }
```

匯出補上：`parseTime: parseTime, extractHistory: extractHistory, buildTrend: buildTrend`。

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/core.test.js`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add dashboard/core.js dashboard/test/core.test.js
git commit -m "feat: add time parsing, history extraction, trend math to core

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 配色映射 + 篩選 + HTML escape

**Files:**
- Modify: `dashboard/core.js`
- Test: `dashboard/test/core.test.js`（append）

**Interfaces:**
- Consumes: `NormRow`
- Produces:
  - `DFCore.mkColors(row: NormRow): {accent, dotColor, delayColor, pillBg, pillText, pillLabel, srcBg, srcText}`（`pillLabel` = `逾時`/`正常`）。
  - `DFCore.filterRows(rows: NormRow[], f: 'all'|'breach'|'rt'|'off'): NormRow[]`。
  - `DFCore.escHtml(s): string`。
  - `DFCore.slaHuman(sla: number): string` — 整除 60 → 「N小時」否則「N分」。
  - `DFCore.human(min: number): string` — 分鐘 → 「N天N時N分」。
  - `DFCore.weekTicks(checkTime: string): string[]` — 依 `checkTime` 往前推 144/96/48/0 小時的 4 個 `MM/DD HH時`。

- [ ] **Step 1: 寫失敗測試（append）**

```js
test('mkColors maps breach to red and met realtime to green+blue', () => {
  const br = Core.mkColors({ status: 'Breached', source: 'Offline' });
  assert.equal(br.dotColor, '#E0584A');
  assert.equal(br.pillText, '#C53D34');
  assert.equal(br.pillLabel, '逾時');
  assert.equal(br.srcBg, '#EEF1F5');
  const ok = Core.mkColors({ status: 'Met', source: 'Realtime' });
  assert.equal(ok.dotColor, '#34A06B');
  assert.equal(ok.pillLabel, '正常');
  assert.equal(ok.srcBg, '#E7F0FE');
  assert.equal(ok.srcText, '#2F6FE0');
});

test('filterRows filters by breach/rt/off/all', () => {
  const rows = [
    { status: 'Breached', source: 'Offline' },
    { status: 'Met', source: 'Realtime' },
    { status: 'Met', source: 'Offline' }
  ];
  assert.equal(Core.filterRows(rows, 'all').length, 3);
  assert.equal(Core.filterRows(rows, 'breach').length, 1);
  assert.equal(Core.filterRows(rows, 'rt').length, 1);
  assert.equal(Core.filterRows(rows, 'off').length, 2);
});

test('escHtml escapes dangerous chars', () => {
  assert.equal(Core.escHtml('<a>&"'), '&lt;a&gt;&amp;&quot;');
  assert.equal(Core.escHtml(null), '');
});

test('slaHuman / human / weekTicks format correctly', () => {
  assert.equal(Core.slaHuman(240), '4小時');
  assert.equal(Core.slaHuman(15), '15分');
  assert.equal(Core.human(888), '14時48分');
  assert.equal(Core.human(0), '0分');
  assert.deepEqual(Core.weekTicks('2026-06-24 12:00:11'),
    ['06/18 12時', '06/20 12時', '06/22 12時', '06/24 12時']);
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/core.test.js`
Expected: FAIL — `Core.mkColors is not a function`。

- [ ] **Step 3: 在 `core.js` 加入函式並匯出**

```js
  function mkColors(row) {
    var br = row.status === 'Breached';
    return {
      accent: br ? '#E0584A' : '#EAEDF2',
      dotColor: br ? '#E0584A' : '#34A06B',
      delayColor: br ? '#C53D34' : '#1F8A5B',
      pillBg: br ? '#FCEAE7' : '#E6F4EC',
      pillText: br ? '#C53D34' : '#1F8A5B',
      pillLabel: br ? '逾時' : '正常',
      srcBg: row.source === 'Realtime' ? '#E7F0FE' : '#EEF1F5',
      srcText: row.source === 'Realtime' ? '#2F6FE0' : '#5E6675'
    };
  }

  function filterRows(rows, f) {
    if (f === 'breach') return rows.filter(function (r) { return r.status === 'Breached'; });
    if (f === 'rt') return rows.filter(function (r) { return r.source === 'Realtime'; });
    if (f === 'off') return rows.filter(function (r) { return r.source === 'Offline'; });
    return rows;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function slaHuman(sla) { return sla % 60 === 0 ? (sla / 60) + '小時' : sla + '分'; }

  function human(m) {
    m = Math.max(0, Math.round(m));
    var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return (d ? d + '天' : '') + ((h || d) ? h + '時' : '') + mm + '分';
  }

  function weekTicks(checkTime) {
    var base = parseTime({ v: checkTime });
    if (!base) return ['', '', '', ''];
    var p = function (n) { return String(n).padStart(2, '0'); };
    var lab = function (h) {
      var x = new Date(base.getTime() - h * 3600000);
      return p(x.getMonth() + 1) + '/' + p(x.getDate()) + ' ' + p(x.getHours()) + '時';
    };
    return [lab(144), lab(96), lab(48), lab(0)];
  }
```

匯出補上：`mkColors: mkColors, filterRows: filterRows, escHtml: escHtml, slaHuman: slaHuman, human: human, weekTicks: weekTicks`。

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/core.test.js`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add dashboard/core.js dashboard/test/core.test.js
git commit -m "feat: add color mapping, row filter, html escape to core

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 密碼雜湊

**Files:**
- Modify: `dashboard/core.js`
- Test: `dashboard/test/core.test.js`（append）

**Interfaces:**
- Consumes: 全域 `crypto.subtle`（Node 20 與瀏覽器皆有）
- Produces: `DFCore.sha256Hex(str: string): Promise<string>` — 回 64 字小寫 hex。

- [ ] **Step 1: 寫失敗測試（append）**

```js
test('sha256Hex matches the configured password hash', async () => {
  const h = await Core.sha256Hex('53343286@Di');
  assert.equal(h, 'a4cce81663dc5e2bf18dfbf8d4a7c64fc4313b49210831c201d25927afe99c37');
  const wrong = await Core.sha256Hex('wrong');
  assert.notEqual(wrong, h);
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/core.test.js`
Expected: FAIL — `Core.sha256Hex is not a function`。

- [ ] **Step 3: 在 `core.js` 加入函式並匯出**

```js
  function sha256Hex(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
```

匯出補上：`sha256Hex: sha256Hex`。

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/core.test.js`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add dashboard/core.js dashboard/test/core.test.js
git commit -m "feat: add sha256Hex to core with password-hash test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `views.js` — 純 HTML 產生器

**Files:**
- Create: `dashboard/views.js`
- Test: `dashboard/test/views.test.js`

**Interfaces:**
- Consumes: `DFCore`（`escHtml`、`mkColors`、`groupsInBU`、`distinctTables`、`buOf`、`filterRows`、`buildTrend`）
- Produces（皆回 HTML 字串、無 DOM）：
  - `DFViews.viewMenu({mode, bu, rows, checkTime}): string`
  - `DFViews.viewGroupTables({group, bu, rows, gFilter}): string`
  - `DFViews.viewTableGroups({table, bu, rows}): string`
  - `DFViews.viewDetail({row, checkTime, history}): string` — `history` 為 `{status:'loading'|'error'|'ready', points?}`。
  - `DFViews.cardTable(row): string`

> 說明：把目前 `app.js` 裡的 `renderMenu`/`renderGroupTables`/`renderTableGroups`/`renderDetail`/`tableCard` 原樣搬過來，差別是改成**接參數**（不要讀模組層 `state`），並改用 `DFCore` 的 `escHtml`/`mkColors`/衍生函式。`toolbarBtns`/`backBtn`/`backBtnSmall` 等小工具也一併搬入 `views.js`。視覺字串（顏色、字型、padding）逐字保留，確保像素不變。

- [ ] **Step 1: 寫失敗測試 `test/views.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');
const Views = require('../views.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');
function snap() {
  const t = Core.parseGvizText(SNAP);
  return Core.selectLatestSnapshot(t.rows.map(function (r) { return Core.normalizeRow('HK', r); }));
}

test('viewMenu byGroup shows health % and subtitle counts', () => {
  const s = snap();
  const html = Views.viewMenu({ mode: 'byGroup', bu: 'MCD', rows: s.rows, checkTime: s.checkTime });
  assert.match(html, /更新 2026-06-24 12:00:11/);
  assert.match(html, /3 群組 \/ 4 張表/);   // 3 distinct groups, 4 rows
  assert.match(html, /cxgroup/);
  assert.match(html, /segroup/);
  assert.match(html, /100%/);                // cxgroup: 2 列 0 逾時
  assert.match(html, /0%/);                  // segroup: 1 列 1 逾時
});

test('viewMenu byTable lists distinct tables with pills', () => {
  const s = snap();
  const html = Views.viewMenu({ mode: 'byTable', bu: 'MCD', rows: s.rows, checkTime: s.checkTime });
  assert.match(html, /dim_account/);
  assert.match(html, /fact_game_transaction/);
});

test('viewGroupTables filters breach-only and shows back/filter chips', () => {
  const s = snap();
  const all = Views.viewGroupTables({ group: 'cxgroup', bu: 'MCD', rows: s.rows, gFilter: 'all' });
  assert.match(all, /data-action="back"/);
  assert.match(all, /只看異常/);
  assert.match(all, /dim_account/);
  assert.match(all, /fact_game_transaction/);
  const breach = Views.viewGroupTables({ group: 'cxgroup', bu: 'MCD', rows: s.rows, gFilter: 'breach' });
  assert.doesNotMatch(breach, /fact_game_transaction/); // cxgroup 兩列都 Met -> 篩後皆消失
});

test('viewTableGroups lists only groups containing the table', () => {
  const s = snap();
  const html = Views.viewTableGroups({ table: 'fact_game_transaction', bu: 'MCD', rows: s.rows });
  assert.match(html, /cxgroup/);
  assert.doesNotMatch(html, />segroup</); // segroup 沒有這張表
});

test('viewDetail renders 7-day Downtime summary and trend when history ready', () => {
  const s = snap();
  const row = s.rows.find(function (r) { return r.group === 'segroup'; }); // Breached, sla 240
  const html = Views.viewDetail({
    row: row, checkTime: s.checkTime,
    history: { status: 'ready', points: [{ delay: 10 }, { delay: 20 }] }
  });
  assert.match(html, /近七天累積 Downtime/);
  assert.match(html, /近七天 SLA 總時數/);
  assert.match(html, /資料更新時間/);
  assert.match(html, /<svg/);
  assert.match(html, /480 分/);     // slaWeek = 240 × 2 points
  assert.match(html, /30分/);       // downtime human = 10 + 20
  assert.match(html, /06\/18 12時/); // 由 checkTime 2026-06-24 12:00:11 推算的週刻度
});

test('viewDetail shows spinner while history loading', () => {
  const s = snap();
  const row = s.rows[0];
  const html = Views.viewDetail({ row: row, checkTime: s.checkTime, history: { status: 'loading' } });
  assert.match(html, /spinner/);
  assert.doesNotMatch(html, /<svg/);
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd dashboard && node --test test/views.test.js`
Expected: FAIL — `Cannot find module '../views.js'`。

- [ ] **Step 3: 建立 `views.js`**

UMD 包裝（取得 `DFCore`），並把 `app.js` 現有的 render 函式搬入、改為接參數。骨架如下（內文字串從 `app.js` 對應函式逐字搬，僅把 `state.xxx` 換成參數、`esc`→`C.escHtml`、`mk`→`C.mkColors`、`groupsInBU(bu)`→`C.groupsInBU(rows,bu)` 等）：

```js
/* views.js — 純 HTML 產生器（無 DOM）。瀏覽器掛 window.DFViews；Node require 取 module.exports。 */
(function (root, factory) {
  var Core = (typeof require !== 'undefined') ? require('./core.js') : root.DFCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(Core);
  else root.DFViews = factory(Core);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  function toolbarBtns() {
    return '<button data-action="refresh" title="重新整理" style="width:38px;height:38px;border:1px solid #DCE0E7;border-radius:11px;background:#FFFFFF;cursor:pointer;font-size:15px;color:#3A424C;">↻</button>' +
      '<button data-action="logout" title="登出" style="width:38px;height:38px;border:1px solid #DCE0E7;border-radius:11px;background:#FFFFFF;cursor:pointer;font-size:15px;color:#3A424C;">⎋</button>';
  }
  function backBtn() {
    return '<button data-action="back" style="width:38px;height:38px;border:1px solid #E3E6EA;border-radius:11px;background:#FFFFFF;cursor:pointer;font-size:19px;color:#3A424C;display:flex;align-items:center;justify-content:center;flex:0 0 auto;">‹</button>';
  }
  function backBtnSmall() {
    return '<button data-action="back" style="width:34px;height:34px;border:1px solid #E3E6EA;border-radius:10px;background:#FFFFFF;cursor:pointer;font-size:18px;line-height:1;color:#3A424C;display:flex;align-items:center;justify-content:center;flex:0 0 auto;">‹</button>';
  }

  function cardTable(row) {
    var m = C.mkColors(row);
    return '<button data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:12px 13px;cursor:pointer;">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;">' +
        '<div style="font:600 13px \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + C.escHtml(row.table) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + C.escHtml(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + C.slaHuman(row.sla) + '</span></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;">' +
        '<div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + C.escHtml(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span>' +
      '</div></button>';
  }

  function viewMenu(p) {
    var rows = p.rows, esc = C.escHtml;
    var seen = [], nGroups = 0;
    rows.forEach(function (r) { if (seen.indexOf(r.group) < 0) { seen.push(r.group); nGroups++; } });
    var sub = '更新 ' + esc(p.checkTime || '—') + ' · ' + nGroups + ' 群組 / ' + rows.length + ' 張表';
    var modeSeg = [['byGroup', '依群組'], ['byTable', '依資料表']].map(function (o) {
      var on = p.mode === o[0];
      return '<button data-action="mode" data-val="' + o[0] + '" style="border:none;cursor:pointer;padding:9px 18px;border-radius:9px;font:600 13px \'Space Grotesk\',sans-serif;background:' +
        (on ? '#FFFFFF' : 'transparent') + ';color:' + (on ? '#1C2433' : '#6B7585') + ';box-shadow:' + (on ? '0 1px 3px rgba(20,30,50,.14)' : 'none') + ';">' + o[1] + '</button>';
    }).join('');
    var buSeg = ['MCD', 'BKW'].map(function (b) {
      var on = p.bu === b;
      return '<button data-action="bu" data-val="' + b + '" style="border:1px solid ' + (on ? '#232B3D' : '#DCE0E7') + ';cursor:pointer;padding:8px 16px;border-radius:999px;font:600 12px \'JetBrains Mono\',monospace;background:' +
        (on ? '#232B3D' : '#FFFFFF') + ';color:' + (on ? '#FFFFFF' : '#5E6675') + ';">' + b + '</button>';
    }).join('');
    var header =
      '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between;margin-bottom:clamp(18px,3vw,26px);">' +
        '<div><div style="font:600 clamp(22px,3.4vw,30px) \'Space Grotesk\',sans-serif;letter-spacing:-.6px;">資料觀測</div>' +
        '<div style="font:500 12px \'JetBrains Mono\',monospace;color:#69727F;margin-top:6px;">' + sub + '</div></div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
          '<div style="display:inline-flex;gap:4px;background:#E5E9F0;border-radius:12px;padding:4px;">' + modeSeg + '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;"><span style="font:500 11px \'Space Grotesk\',sans-serif;color:#8A919A;">BU</span>' + buSeg + '</div>' +
          '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div>' +
        '</div></div>';
    var listLabel = '<div style="font:600 11px \'Space Grotesk\',sans-serif;color:#9AA3AF;letter-spacing:.5px;margin-bottom:11px;">' +
      (p.mode === 'byGroup' ? '群組 GROUP_NAME' : '資料表 TABLE_NAME') + '</div>';
    var grid;
    if (p.mode === 'byGroup') {
      var cards = C.groupsInBU(rows, p.bu).map(function (g) {
        var t = rows.filter(function (r) { return r.group === g; });
        var br = t.filter(function (r) { return r.status === 'Breached'; }).length;
        var bad = br > 0, health = Math.round((t.length - br) / t.length * 100);
        return '<button data-action="openGroup" data-group="' + esc(g) + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-radius:16px;padding:15px;cursor:pointer;">' +
          '<div style="width:42px;height:42px;border-radius:12px;background:' + (bad ? '#FCEAE7' : '#E6F4EC') + ';display:flex;align-items:center;justify-content:center;font:600 13px \'JetBrains Mono\',monospace;color:' + (bad ? '#C53D34' : '#1F8A5B') + ';flex:0 0 auto;">' + health + '%</div>' +
          '<div style="flex:1;min-width:0;"><div style="font:600 15px \'Space Grotesk\',sans-serif;">' + esc(g) + '</div>' +
          '<div style="font:500 11.5px \'JetBrains Mono\',monospace;color:' + (bad ? '#C53D34' : '#1F8A5B') + ';margin-top:4px;">' + (bad ? (br + ' 張逾時') : '全部正常') + ' · 共 ' + t.length + ' 張</div></div>' +
          '<div style="font-size:19px;color:#C2C8CF;flex:0 0 auto;">›</div></button>';
      }).join('');
      grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(264px,1fr));gap:11px;">' + cards + '</div>';
    } else {
      var tcards = C.distinctTables(rows, p.bu).map(function (tb) {
        var arr = rows.filter(function (r) { return r.bu === p.bu && r.table === tb; });
        var br = arr.filter(function (r) { return r.status === 'Breached'; }).length, bad = br > 0;
        return '<button data-action="openTable" data-table="' + esc(tb) + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-radius:14px;padding:13px 14px;cursor:pointer;">' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + (bad ? '#E0584A' : '#34A06B') + ';flex:0 0 auto;"></div>' +
          '<div style="flex:1;min-width:0;font:600 13px \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(tb) + '</div>' +
          '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;flex:0 0 auto;">' + arr.length + ' 群組</span>' +
          '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 9px;border-radius:7px;background:' + (bad ? '#FCEAE7' : '#E6F4EC') + ';color:' + (bad ? '#C53D34' : '#1F8A5B') + ';flex:0 0 auto;">' + (bad ? (br + ' 逾時') : '正常') + '</span>' +
          '<div style="font-size:18px;color:#C2C8CF;flex:0 0 auto;">›</div></button>';
      }).join('');
      grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:9px;">' + tcards + '</div>';
    }
    return header + listLabel + grid;
  }

  function viewGroupTables(p) {
    var esc = C.escHtml;
    var all = p.rows.filter(function (r) { return r.group === p.group; });
    var br = all.filter(function (r) { return r.status === 'Breached'; }).length;
    var meta = br > 0 ? (all.length + ' 張 · ' + br + ' 逾時') : (all.length + ' 張 · 全部正常');
    var chips = [['all', '全部'], ['breach', '只看異常'], ['rt', 'Realtime'], ['off', 'Offline']].map(function (o) {
      var on = p.gFilter === o[0];
      return '<button data-action="gfilter" data-val="' + o[0] + '" style="flex:0 0 auto;border:none;cursor:pointer;padding:8px 15px;border-radius:999px;font:600 12px \'Space Grotesk\',sans-serif;background:' + (on ? '#232B3D' : '#EEF1F5') + ';color:' + (on ? '#FFFFFF' : '#555E6B') + ';">' + o[1] + '</button>';
    }).join('');
    var list = C.filterRows(all, p.gFilter).map(cardTable).join('');
    return '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">' + backBtn() +
        '<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:9px;"><div style="font:600 clamp(18px,2.6vw,22px) \'Space Grotesk\',sans-serif;">' + esc(p.group) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 8px;border-radius:6px;background:#EEF1F5;color:#5E6675;">' + esc(C.buOf(p.rows, p.group)) + '</span></div>' +
        '<div style="font:500 12px \'JetBrains Mono\',monospace;color:' + (br > 0 ? '#C53D34' : '#1F8A5B') + ';margin-top:4px;">' + meta + '</div></div>' +
        '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div></div>' +
      '<div class="scrollarea" style="display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap;">' + chips + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:9px;">' + list + '</div>';
  }

  function viewTableGroups(p) {
    var esc = C.escHtml;
    var rows = C.groupsInBU(p.rows, p.bu).map(function (g) {
      return p.rows.find(function (r) { return r.group === g && r.table === p.table; });
    }).filter(Boolean);
    var cards = rows.map(function (row) {
      var m = C.mkColors(row);
      return '<button data-action="openDetail" data-id="' + row.id + '" style="display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#FFFFFF;border:1px solid #EAEDF2;border-left:3px solid ' + m.accent + ';border-radius:14px;padding:14px;cursor:pointer;">' +
        '<div style="width:9px;height:9px;border-radius:50%;background:' + m.dotColor + ';flex:0 0 auto;"></div>' +
        '<div style="flex:1;min-width:0;"><div style="font:600 15px \'Space Grotesk\',sans-serif;">' + esc(row.group) + '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;margin-top:6px;"><span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 8px;border-radius:6px;background:' + m.srcBg + ';color:' + m.srcText + ';">' + esc(row.source) + '</span>' +
        '<span style="font:500 10px \'JetBrains Mono\',monospace;color:#9AA3AF;">SLA ' + C.slaHuman(row.sla) + '</span></div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;"><div style="font:600 13px \'JetBrains Mono\',monospace;color:' + m.delayColor + ';">' + esc(row.delayHuman) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:2px 9px;border-radius:6px;background:' + m.pillBg + ';color:' + m.pillText + ';">' + m.pillLabel + '</span></div></button>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">' + backBtn() +
        '<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:9px;"><div style="font:600 clamp(16px,2.4vw,20px) \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(p.table) + '</div>' +
        '<span style="font:600 10px \'Space Grotesk\',sans-serif;padding:3px 8px;border-radius:6px;background:#EEF1F5;color:#5E6675;flex:0 0 auto;">' + esc(p.bu) + '</span></div>' +
        '<div style="font:500 12px \'Space Grotesk\',sans-serif;color:#69727F;margin-top:4px;">此資料表在各 group_name 的最新狀態</div></div>' +
        '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:9px;">' + cards + '</div>';
  }

  function viewDetail(p) {
    var esc = C.escHtml, row = p.row;
    if (!row) return '<div class="center-state"><div class="msg">找不到資料</div></div>';
    var br = row.status === 'Breached';
    var accentBg = br ? '#FCEAE7' : '#E6F4EC', accentText = br ? '#C53D34' : '#1F8A5B', accentLine = br ? '#E0584A' : '#34A06B';
    var hist = p.history;
    var downtimeHuman = '—', slaWeekText = '—', downtimeMinText = '—', trendInner;
    if (!hist || hist.status === 'loading') {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div>';
    } else if (hist.status === 'error') {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">歷史讀取失敗</div>';
    } else if (!hist.points || !hist.points.length) {
      trendInner = '<div style="height:96px;display:flex;align-items:center;justify-content:center;font:500 12px \'Space Grotesk\',sans-serif;color:#9AA3AF;">尚無歷史資料點</div>';
    } else {
      var pts = hist.points;
      var downtime = pts.reduce(function (a, q) { return a + q.delay; }, 0); // 近七天 Σ Delay_Time
      var slaWeek = row.sla * pts.length;                                    // 近七天 Σ SLA
      downtimeHuman = C.human(downtime);
      downtimeMinText = downtime + ' 分';
      slaWeekText = slaWeek + ' 分';
      var tr = C.buildTrend(pts, row.sla);
      var ticks = C.weekTicks(p.checkTime);
      trendInner = '<svg viewBox="0 0 300 84" preserveAspectRatio="none" style="width:100%;height:96px;display:block;overflow:visible;">' +
        '<path d="' + tr.area + '" fill="' + accentBg + '" opacity="0.7"></path>' +
        '<line x1="0" y1="' + tr.threshY + '" x2="300" y2="' + tr.threshY + '" stroke="#99A0A8" stroke-width="1.4" stroke-dasharray="4 3"></line>' +
        '<path d="' + tr.spark + '" fill="none" stroke="' + accentLine + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>' +
        '<circle cx="' + tr.lx + '" cy="' + tr.ly + '" r="3.5" fill="' + accentLine + '"></circle></svg>' +
        '<div style="display:flex;justify-content:space-between;margin-top:8px;font:500 9.5px \'JetBrains Mono\',monospace;color:#B0B6BD;">' +
          ticks.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
    }
    function infoRow(label, val, color, last) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;' + (last ? '' : 'border-bottom:1px solid #F2F4F6;') + '">' +
        '<span style="font:500 12px \'Space Grotesk\',sans-serif;color:#7A828C;">' + label + '</span>' +
        '<span style="font:600 12.5px \'JetBrains Mono\',monospace;color:' + (color || '#1C2433') + ';">' + esc(val) + '</span></div>';
    }
    return '<div style="max-width:860px;">' +
      '<div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid #ECEFF2;">' + backBtnSmall() +
        '<div style="flex:1;min-width:0;"><div style="font:600 clamp(15px,2.2vw,18px) \'JetBrains Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(row.table) + '</div>' +
        '<div style="font:500 12px \'Space Grotesk\',sans-serif;color:#7A828C;margin-top:3px;">' + esc(row.bu) + ' · ' + esc(row.group) + '</div></div>' +
        '<div style="display:flex;gap:6px;">' + toolbarBtns() + '</div></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;background:' + accentBg + ';border-radius:12px;padding:14px 16px;margin-top:16px;">' +
        '<div style="display:flex;align-items:center;gap:9px;"><div style="width:9px;height:9px;border-radius:50%;background:' + accentLine + ';"></div>' +
        '<div style="font:600 14px \'Space Grotesk\',sans-serif;color:' + accentText + ';">近七天累積 Downtime</div></div>' +
        '<div style="font:600 16px \'JetBrains Mono\',monospace;color:' + accentText + ';">' + esc(downtimeHuman) + '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px;">' +
        '<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;padding:16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font:600 13px \'Space Grotesk\',sans-serif;color:#3A424C;">近七天延遲趨勢</div>' +
          '<div style="display:flex;align-items:center;gap:5px;font:500 10px \'JetBrains Mono\',monospace;color:#9AA1AA;"><span style="display:inline-block;width:14px;height:0;border-top:2px dashed #99A0A8;"></span>近七天 SLA 總時數 ' + esc(slaWeekText) + '</div></div>' +
          trendInner +
        '</div>' +
        '<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;overflow:hidden;align-self:start;">' +
          infoRow('檢查時間', p.checkTime) +
          infoRow('資料更新時間', row.maxUpdate) +
          infoRow('近七天 SLA 總時數', slaWeekText) +
          infoRow('近七天累積 Downtime', downtimeMinText, accentText, true) +
        '</div>' +
      '</div></div>';
  }

  return {
    viewMenu: viewMenu, viewGroupTables: viewGroupTables, viewTableGroups: viewTableGroups,
    viewDetail: viewDetail, cardTable: cardTable
  };
});
```

上面四個 `view*` 即 `app.js` 對應 `renderMenu`/`renderGroupTables`/`renderTableGroups`/`renderDetail` 的純函式版本（`state.*`→參數 `p.*`、`esc`→`C.escHtml`、`mk`→`C.mkColors`、`filt`→`C.filterRows`、`tableCard`→本檔 `cardTable`、衍生函式加 `p.rows` 參數）。視覺字串逐字保留，像素不變。

- [ ] **Step 4: 執行確認通過**

Run: `cd dashboard && node --test test/views.test.js`
Expected: 6 個 view test 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add dashboard/views.js dashboard/test/views.test.js
git commit -m "feat: extract pure HTML view builders into views.js with tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 重接 `app.js` + `index.html`，加整合測試

**Files:**
- Modify: `dashboard/app.js`（刪除已搬出的純函式，改呼叫 `DFCore`/`DFViews`）
- Modify: `dashboard/index.html`（script 載入順序）
- Create: `dashboard/test/integration.test.js`

**Interfaces:**
- Consumes: `DFCore`、`DFViews`
- Produces: 不變的對外行為（瀏覽器端 app 仍可運作）。整合測試驗證「fixture → 快照 → 衍生 → view」與「fixture → extractHistory → buildTrend」端到端串接。

- [ ] **Step 1: 寫整合測試 `test/integration.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');
const Views = require('../views.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');
const HIST = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history.gviz.txt'), 'utf8');

test('snapshot pipeline: parse -> normalize -> latest -> menu render', () => {
  const t = Core.parseGvizText(SNAP);
  const snap = Core.selectLatestSnapshot(t.rows.map(function (r) { return Core.normalizeRow('HK', r); }));
  assert.equal(snap.rows.length, 4);
  const html = Views.viewMenu({ mode: 'byGroup', bu: 'BKW', rows: snap.rows, checkTime: snap.checkTime });
  assert.match(html, /bjgroup/);
  assert.match(html, /0%/); // bjgroup 1 列 1 逾時
});

test('history pipeline: parse -> extractHistory -> buildTrend', () => {
  const t = Core.parseGvizText(HIST);
  const pts = Core.extractHistory(t, 24);
  const tr = Core.buildTrend(pts, 240);
  assert.equal(pts.length, 2);
  assert.match(tr.spark, /^M0\.0 /);
  assert.ok(tr.area.endsWith('Z'));
});
```

- [ ] **Step 2: 執行確認通過（整合測試本身先綠）**

Run: `cd dashboard && node --test test/integration.test.js`
Expected: 2 test PASS（此測試只依賴 core/views，已存在）。

- [ ] **Step 3: 改寫 `app.js` — 刪除已搬出的函式、改呼叫 DFCore/DFViews**

在 `app.js` 內：
1. 刪除這些已搬到 `core.js` 的函式定義：`cellV`、`cellF`、`normalize`、`parseTime`、`rowsOfBU`、`groupsInBU`、`distinctTables`、`buOf`、`mk`、`esc`、`slaHuman`、`human`、`weekTicks`、`buildTrend`、`sha256Hex`。（`gvizUrl`、`gEsc` **保留**在 app.js — 它們屬於 fetch 層。）
2. 刪除這些已搬到 `views.js` 的函式：`renderMenu`、`renderGroupTables`、`renderTableGroups`、`renderDetail`、`tableCard`、`toolbarBtns`、`backBtn`、`backBtnSmall`、`filt`。（`wrap`、`centerState` **保留**在 app.js，它們包外層容器並被 `render()` 使用。）
3. 在檔首取得參照：
```js
  var Core = window.DFCore, Views = window.DFViews;
```
4. `gvizQuery` 改用 `Core.parseGvizText`：
```js
  function gvizQuery(region, tq) {
    return fetch(gvizUrl(region, tq), { credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) { return Core.parseGvizText(text); });
  }
```
5. `loadSnapshot` 改用 `Core.normalizeRow` + `Core.selectLatestSnapshot`：
```js
  function loadSnapshot() {
    return gvizQuery(state.region, 'select * order by F desc limit 150').then(function (table) {
      var norm = (table.rows || []).map(function (r) { return Core.normalizeRow(state.region, r); });
      return Core.selectLatestSnapshot(norm);
    });
  }
```
6. `loadHistory` 改用 `Core.extractHistory`（`gEsc` 為 app.js 既有的本地 helper，不變）：
```js
  function loadHistory(row) {
    var tq = "select F, I where A = '" + gEsc(row.bu) + "' and B = '" + gEsc(row.group) +
      "' and C = '" + gEsc(row.table) + "' order by F desc limit 800";
    return gvizQuery(row.region, tq).then(function (table) { return Core.extractHistory(table, CONFIG.trendDays * 24); });
  }
```
7. `render()` 的四個分支改呼叫 `Views.*`，並用 `wrap()` 包外層；detail 分支把 `state.history[id]` 傳入：
```js
  function render() {
    if (state.status === 'loading') { app.innerHTML = wrap(centerState('<div class="spinner"></div><div class="msg">載入中…</div>')); return; }
    if (state.status === 'error') {
      app.innerHTML = wrap(centerState(
        '<div class="msg">讀取失敗：' + Core.escHtml(state.error || '') + '<br>請確認該 Google Sheet 已設為「知道連結的人皆可檢視」。</div>' +
        '<button data-action="refresh">重試</button>'));
      return;
    }
    var top = state.stack[state.stack.length - 1];
    var screen = top ? top.type : 'menu';
    var html;
    if (screen === 'menu') html = Views.viewMenu({ mode: state.mode, bu: state.bu, rows: state.data, checkTime: state.checkTime });
    else if (screen === 'groupTables') html = Views.viewGroupTables({ group: top.group, bu: top.bu, rows: state.data, gFilter: state.gFilter });
    else if (screen === 'tableGroups') html = Views.viewTableGroups({ table: top.table, bu: top.bu, rows: state.data });
    else html = Views.viewDetail({ row: state.data.find(function (r) { return r.id === top.id; }), checkTime: state.checkTime, history: state.history[top.id] });
    app.innerHTML = wrap(html);
  }
```
8. `sha256Hex(...)` 的呼叫處改為 `Core.sha256Hex(...)`（在 `initGate` 的 submit 內）。
其餘（state、onClick、openDetail、reload、startAutoRefresh、gate）維持不變。

- [ ] **Step 4: 改 `index.html` script 載入順序**

把底部 script 區塊改成：
```html
  <script src="config.js"></script>
  <script src="core.js"></script>
  <script src="views.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 5: 語法檢查 + 全測試**

Run: `cd dashboard && node --check app.js && node --check core.js && node --check views.js && node --test`
Expected: 三個 `--check` 無輸出（OK）；`node --test` 全部 PASS（core/views/integration/smoke）。

- [ ] **Step 6: 真實 gviz 冒煙驗證（確認重構沒破壞線上讀取）**

Run（建立暫存腳本後執行）:
```bash
cd dashboard
node -e "const C=require('./core.js');const ID='1Ti9iywMTyd7mEvnz47NvfQUsIruuhrxyWwFQx1L3pF4';fetch('https://docs.google.com/spreadsheets/d/'+ID+'/gviz/tq?tqx=out:json&sheet=HK&tq='+encodeURIComponent('select * order by F desc limit 150')).then(r=>r.text()).then(t=>{const tb=C.parseGvizText(t);const s=C.selectLatestSnapshot(tb.rows.map(r=>C.normalizeRow('HK',r)));console.log('checkTime',s.checkTime,'rows',s.rows.length,'groups',C.groupsInBU(s.rows,'MCD').concat(C.groupsInBU(s.rows,'BKW')).join(','));})"
```
Expected: 印出當下的 `checkTime`、`rows`（約 40+）、`groups`（含 cxgroup/segroup/mcwgroup/bjgroup）。確認線上資料仍正常解析。

- [ ] **Step 7: Commit**

```bash
git add dashboard/app.js dashboard/index.html dashboard/test/integration.test.js
git commit -m "refactor: app.js consumes core.js/views.js; add integration tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 人工 UI 驗收（瀏覽器，無法在零編譯下自動化的部分）

**Files:**
- Create: `dashboard/docs/MANUAL-TESTS.md`

**Interfaces:**
- Consumes: 完整 app（需本機 server，因要 fetch）
- Produces: 一份可重複執行的人工驗收清單，對應 `dashboard-ui` 與 `access-gate` 的互動型 scenario。

- [ ] **Step 1: 啟動本機 server**

Run: `cd dashboard && python -m http.server 8080`（背景執行），瀏覽器開 `http://localhost:8080/`。

- [ ] **Step 2: 撰寫 `docs/MANUAL-TESTS.md`，逐項勾選下列案例**

```markdown
# 人工驗收案例（每次改 UI 後重跑）

前置：`cd dashboard && python -m http.server 8080`，開 http://localhost:8080/
（手機外框：http://localhost:8080/MobilePreview.html）

## A. 密碼閘（access-gate）
- [ ] A1 首次開啟顯示密碼卡；輸入錯誤密碼 → 顯示「密碼錯誤」、不進入。
- [ ] A2 輸入 `53343286@Di` → 進入主畫面。
- [ ] A3 重新整理頁面 → 不再要求密碼（localStorage 記住）。
- [ ] A4 點右上「⎋」登出 → 重新要求密碼。

## B. 首頁（menu）
- [ ] B1 副標顯示「更新 {時間} · N 群組 / M 張表」。
- [ ] B2 預設「依群組」+ BU=MCD：顯示 cxgroup/segroup/mcwgroup 卡，每卡左側健康度色塊（紅=有逾時/綠=全正常）。
- [ ] B3 點 BU=BKW → 變成 bjgroup 卡（清單重新推導）。
- [ ] B4 切「依資料表」→ 顯示該 BU 不重複資料表列 + 狀態 pill。

## C. 下鑽與導覽（nav stack）
- [ ] C1 點一張群組卡 → 進入該群組資料表清單；左上「‹」可返回首頁。
- [ ] C2 群組頁點「只看異常」→ 只剩 Breached 的表；點「Realtime/Offline」對應篩選；切群組頁時篩選回「全部」。
- [ ] C3 「依資料表」點一張表 → 進入「該表在各群組」頁，只列含此表的群組。
- [ ] C4 任一表卡點進去 → 詳情頁。

## D. 詳情頁（近七天累積 Downtime）
- [ ] D1 狀態條標籤固定「近七天累積 Downtime」、右側顯示累積延遲（人性化），顏色依狀態（紅/綠）。
- [ ] D2 趨勢卡先顯示 spinner，稍後出現 SVG 折線 + SLA 虛線門檻 + 端點（真實七天歷史），X 軸為 4 個 `MM/DD HH時` 刻度。
- [ ] D3 資訊卡四列：檢查時間、資料更新時間、近七天 SLA 總時數、近七天累積 Downtime（末列顏色=狀態色）。
- [ ] D4 找一張歷史很少的表，趨勢卡顯示「尚無歷史資料點」或單點，不報錯。

## E. 狀態與重新整理
- [ ] E1 點「↻」→ 短暫載入後資料與副標時間更新。
- [ ] E2（模擬錯誤）把 config.js 的 HK id 暫改成錯的 → 重新整理頁面 → 顯示「讀取失敗…請確認 sheet 已設為可檢視」+「重試」鈕；改回後重試恢復。

## F. 響應式（手機/電腦）
- [ ] F1 桌面寬視窗：卡片多欄。
- [ ] F2 DevTools 切 iPhone 寬（≤390px）或開 MobilePreview.html：卡片單欄、不溢出、可點擊操作。
```

- [ ] **Step 3: 實際跑完 A–F 全部勾選**

逐項操作並確認；任何一項不符 → 回對應 Task 修正後重跑。

- [ ] **Step 4: Commit**

```bash
git add dashboard/docs/MANUAL-TESTS.md
git commit -m "test: add manual UI/gate acceptance checklist

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 部署驗收（GitHub Pages + hsuping.org + 憑證隔離）

**Files:**
- Modify: `dashboard/docs/MANUAL-TESTS.md`（append G 區）

**Interfaces:**
- Consumes: 完整 repo
- Produces: 部署型 scenario 的驗收紀錄。

- [ ] **Step 1: 驗證憑證隔離（自動可查）**

Run: `cd dashboard && git ls-files | grep -i '\.R$' || echo CLEAN`
Expected: 印出 `CLEAN`（repo 內無任何 `.R` 腳本）。

- [ ] **Step 2: 驗證零編譯可服務**

Run: `cd dashboard && python -m http.server 8080`，開 http://localhost:8080/ 確認**未經任何 build**即可運作。
Expected: 直接以靜態檔服務、畫面正常。

- [ ] **Step 3: 在 `docs/MANUAL-TESTS.md` append 部署清單**

```markdown
## G. 部署（deployment）
- [ ] G1 `git ls-files | grep -i '\.R$'` 回 CLEAN（無 .R 憑證入庫）。
- [ ] G2 `CNAME` 內容為 `hsuping.org`。
- [ ] G3 push 到 GitHub 公開 repo；Settings→Pages→Source=main/root。
- [ ] G4 DNS 設 A 記錄 185.199.108.153 / 109.153 / 110.153 / 111.153。
- [ ] G5 憑證簽發後勾 Enforce HTTPS；https://hsuping.org 可開、顯示儀表板。
- [ ] G6 手機實機開 https://hsuping.org 確認可查詢、可下鑽。
```

- [ ] **Step 4: 確認 `CNAME`**

Run: `cat dashboard/CNAME`
Expected: `hsuping.org`。

- [ ] **Step 5: Commit**

```bash
git add dashboard/docs/MANUAL-TESTS.md
git commit -m "test: add deployment acceptance checklist

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> G3–G6 需要你在 GitHub 與 DNS 操作，屬人工步驟；其餘（G1/G2）已可在本機核對。

---

## Spec Coverage Map

| Spec scenario | 由哪個 task / 測試覆蓋 |
|---|---|
| sheet-data-access：取得最新快照 | Task 3 `selectLatestSnapshot keeps only the newest…` |
| sheet-data-access：剝除 gviz 包裝 | Task 2 `parseGvizText strips wrapper` |
| sheet-data-access：歷史成長不影響查詢量 | Task 9 Step 6 真實 `order by F desc limit 150` 冒煙 + Task 3（只取最新批） |
| sheet-data-access：欄位對應正確 | Task 3 `normalizeRow maps HK columns` |
| sheet-data-access：數值/格式化分別取用 | Task 2 `cellV and cellF read values` |
| sheet-data-access：群組依資料推導 / 不重複表首見 | Task 4 `groupsInBU` / `distinctTables` |
| sheet-data-access：取得真實歷史 / 不足退回 | Task 5 `extractHistory filters to last N hours` |
| sheet-data-access：讀取失敗可偵測 | Task 2 `parseGvizText throws…`；UI 呈現 Task 10 E2 |
| dashboard-ui：menu 依群組/依表/切 BU | Task 8 `viewMenu byGroup/byTable`；Task 10 B2–B4 |
| dashboard-ui：群組→表 + 篩選 | Task 8 `viewGroupTables filters…`；Task 10 C2 |
| dashboard-ui：表→各群組 只列含此表 | Task 8 `viewTableGroups lists only…`；Task 10 C3 |
| dashboard-ui：詳情（近七天累積 Downtime）+ 真實七天趨勢 | Task 8 `viewDetail renders 7-day…` / `spinner while loading`；Task 10 D1–D4 |
| dashboard-ui：stack 導覽 | Task 10 C1–C4 |
| dashboard-ui：狀態/來源視覺語意 | Task 6 `mkColors maps…`；Task 10 D1 |
| dashboard-ui：響應式 | Task 10 F1–F2 |
| dashboard-ui：載入/錯誤/空/重新整理 | Task 8 `viewDetail spinner`；Task 10 E1–E2、D4 |
| access-gate：密碼放行/拒絕/記住/登出 | Task 7 `sha256Hex matches…`；Task 10 A1–A4 |
| access-gate：只存雜湊 | Task 7（比對雜湊）+ `config.js` 既存雜湊；人工檢視 `config.js` |
| deployment：apex 網域 HTTPS | Task 11 G2/G4/G5 |
| deployment：零編譯可服務 | Task 11 Step 2 / G 區 |
| deployment：憑證隔離 | Task 11 Step 1（`CLEAN`） |
```
