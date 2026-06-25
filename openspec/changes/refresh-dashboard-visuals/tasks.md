# Tasks

## 1. 群組卡改版（views.js `viewMenu` 依群組）
- [x] 1.1 健康欄改 46×46 磚（radius 13px、JetBrains Mono 700 14px）+ 下方「健康率」說明字。
- [x] 1.2 中段加「共 {total} 張」、6px 健康進度條（軌道 #EEF1F5、填色寬度=健康率）。
- [x] 1.3 進度條三段配色：全正常 #34A06B／逾時且≥50% #E8A23C／逾時且<50% #E0584A。
- [x] 1.4 進度條下狀態文字「{n} 張逾時」(#C53D34)／「全部正常」(#1F8A5B)。

## 2. 詳情頁籤改版（views.js `viewDetail` tabBar）
- [x] 2.1 容器改白底 + border #E6E9EE + radius 13px + padding 5px + 陰影。
- [x] 2.2 選中態改深藍 #232B3D 白字 + 陰影；按鈕 font 700 14px、padding 12px 6px 13px。
- [x] 2.3 每個頁籤標籤前加 7px 圓點（選中 #E8C6CF／未選 #C9D2DA）。

## 3. 趨勢圖每點圓點（views.js `viewDetail` 概覽 SVG）
- [x] 3.1 依 `tr.pts` 為每點輸出 `<circle r=2.2 stroke=#FFF stroke-width=1>`，fill 依該點逾時(#E0584A)/正常(#34A06B)。

## 4. 統計磚更名（views.js + test/views.test.js）
- [x] 4.1 標籤「峰值→最大值」「谷值→最小值」（平均不變）。
- [x] 4.2 更新 views.test.js 對應斷言。

## 5. 全域頁首等高（app.js `renderHeader`）
- [x] 5.1 頁首內列 style 加 `min-height:44px`。

## 6. 驗收
- [x] 6.1 `node --test test/` 全綠。
- [x] 6.2 index.html `?v=` 版號 +1。
- [x] 6.3 commit 並 push。
