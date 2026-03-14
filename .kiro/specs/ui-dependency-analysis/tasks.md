# 實作計畫：UI 與遊戲邏輯跨文件依賴分析

## 概述

將設計文件中的五個 TypeScript 模組（`ui-reference-tracker.ts`、`event-chain-analyzer.ts`、`coupling-advisor.ts`、`ui-dependency-serialization.ts`、`ui-dependency-report.ts`）逐步實作，並整合至現有的 Kiro Unity Power 專案中。每個步驟建立在前一步驟之上，最終將所有模組串接為完整的 UI 依賴分析流程。

## 任務

- [x] 1. 新增 UI 依賴分析型別定義至 `types.ts`
  - [x] 1.1 在 `kiro-unity-power/src/types.ts` 中新增所有 UI 依賴分析相關型別
    - 新增 `UIComponentType`、`ReferenceMethod`、`EventSubscriptionPattern`、`StateMutationType`、`EventNodeType`、`RefactoringSuggestionType` 等型別別名
    - 新增 `UIComponentQuery`、`ScriptReference`、`UIReferenceResult`、`HighFanInComponent`、`FailedFile`（若尚未存在則複用）、`UIDependencyGraph`、`UIDependencyNode`、`UIDependencyEdge` 等介面
    - 新增 `EventEntryPoint`、`EventChainOptions`、`EventNode`、`EventChain`、`EventChainResult` 等介面
    - 新增 `CouplingPair`、`RefactoringSuggestion`、`UIDependencyReport`、`UIDependencyReportSummary` 等介面
    - _需求：1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1_

- [x] 2. 實作 `ui-reference-tracker.ts` — UI 元件引用追蹤
  - [x] 2.1 建立 `kiro-unity-power/src/ui-reference-tracker.ts`，實作 `trackUIReferences` 函式
    - 掃描所有 C# 腳本，偵測 SerializeField/public 欄位、GetComponent/GetComponentInChildren、GameObject.Find/transform.Find、AddComponent 等引用模式
    - 回傳 `UIReferenceResult`，包含引用清單、高扇入元件標記（引用數 > 3）與掃描失敗清單
    - 單一腳本讀取失敗時捕獲例外並記錄至 `failedFiles`，繼續掃描其餘腳本
    - 空輸入時回傳有效的空結果物件
    - _需求：1.1, 1.2, 1.4, 1.5_

  - [x] 2.2 實作 `buildUIDependencyGraph` 函式
    - 建構 `UIDependencyGraph`，以有向圖表示 UI 元件與引用腳本之間的關係
    - 每條邊對應一筆 `ScriptReference`，邊數應等於引用數
    - _需求：1.3_

  - [ ]* 2.3 撰寫 `ui-reference-tracker` 單元測試
    - 在 `kiro-unity-power/tests/unit/ui-reference-tracker.test.ts` 中撰寫測試
    - 測試各種 C# 引用模式的偵測（SerializeField、GetComponent 等）
    - 測試高扇入元件標記（恰好 3 個引用 vs 4 個引用的邊界值）
    - 測試掃描失敗處理與空輸入
    - _需求：1.1, 1.2, 1.4, 1.5_

  - [ ]* 2.4 撰寫屬性測試：Property 1 — UI 引用偵測涵蓋所有引用模式
    - **Property 1: UI 引用偵測涵蓋所有引用模式**
    - 在 `kiro-unity-power/tests/property/ui-dependency-properties.test.ts` 中撰寫
    - 使用 fast-check 產生包含已知 UI 引用模式的 C# 腳本，驗證 `trackUIReferences` 偵測到該引用且 `referenceMethod` 正確
    - **驗證：需求 1.1, 1.2**

  - [ ]* 2.5 撰寫屬性測試：Property 2 — 依賴圖邊數等於引用數
    - **Property 2: 依賴圖邊數等於引用數**
    - 驗證 `buildUIDependencyGraph` 產生的邊數等於所有偵測到的 `ScriptReference` 數量
    - **驗證：需求 1.3**

  - [ ]* 2.6 撰寫屬性測試：Property 3 — 高扇入元件閾值判定
    - **Property 3: 高扇入元件閾值判定**
    - 驗證引用數 > 3 的元件出現在 `highFanInComponents`，引用數 ≤ 3 的不出現
    - **驗證：需求 1.4**

  - [ ]* 2.7 撰寫屬性測試：Property 4 — 掃描失敗不影響其餘結果
    - **Property 4: 掃描失敗不影響其餘結果**
    - 驗證混合有效與無效腳本時，有效腳本的引用結果完整且 `failedFiles` 正確
    - **驗證：需求 1.5**

- [x] 3. 檢查點 — 確認 UI 引用追蹤模組正確
  - 確保所有測試通過，如有疑問請詢問使用者。

- [-] 4. 實作 `event-chain-analyzer.ts` — 事件調用鏈分析
  - [x] 4.1 建立 `kiro-unity-power/src/event-chain-analyzer.ts`，實作 `analyzeEventChain` 函式
    - 從指定 UI 事件起點追蹤完整調用鏈
    - 偵測 AddListener、+= 訂閱、SerializedUnityEvent、SendMessage/BroadcastMessage 等事件訂閱模式
    - 為每個 `EventNode` 記錄 `functionName`、`scriptPath`、`lineNumber`、`nodeType`
    - 識別調用鏈末端的狀態變更（靜態欄位寫入、ScriptableObject 修改、PlayerPrefs 寫入、Singleton 狀態修改）
    - 深度超過 5 層時標記為過深調用鏈（`isDeepChain = true`）
    - 使用現有 `cycle-detection.ts` 的 `detectCycles` 偵測循環，設定 `cyclePath` 並中止該路徑遞迴
    - 空輸入時回傳有效的空結果物件
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.2 撰寫 `event-chain-analyzer` 單元測試
    - 在 `kiro-unity-power/tests/unit/event-chain-analyzer.test.ts` 中撰寫測試
    - 測試各種事件訂閱模式的偵測
    - 測試狀態變更識別、過深調用鏈標記（深度恰好 5 vs 6 的邊界值）
    - 測試循環偵測與中止
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.3 撰寫屬性測試：Property 5 — 事件調用鏈涵蓋所有訂閱模式
    - **Property 5: 事件調用鏈涵蓋所有訂閱模式**
    - 使用 fast-check 產生包含已知事件訂閱模式的腳本，驗證 `analyzeEventChain` 將訂閱者納入調用鏈且 `subscriptionPattern` 正確
    - **驗證：需求 2.1, 2.2**

  - [ ]* 4.4 撰寫屬性測試：Property 6 — 事件節點元資料完整性
    - **Property 6: 事件節點元資料完整性**
    - 驗證所有 `EventNode` 的 `functionName` 非空、`scriptPath` 非空、`lineNumber` 為正整數、`nodeType` 為有效值
    - **驗證：需求 2.3**

  - [ ]* 4.5 撰寫屬性測試：Property 7 — 狀態變更偵測
    - **Property 7: 狀態變更偵測**
    - 驗證包含已知狀態變更模式的腳本，調用鏈末端的 `EventNode` 標記為 `StateMutation` 且 `stateMutationType` 正確
    - **驗證：需求 2.4**

  - [ ]* 4.6 撰寫屬性測試：Property 8 — 過深調用鏈閾值判定
    - **Property 8: 過深調用鏈閾值判定**
    - 驗證 `isDeepChain` 為 `true` 若且唯若 `depth > 5`
    - **驗證：需求 2.5**

  - [ ]* 4.7 撰寫屬性測試：Property 9 — 循環偵測與中止
    - **Property 9: 循環偵測與中止**
    - 驗證存在事件調用循環時，`cyclePath` 被設定且不會無限遞迴
    - **驗證：需求 2.6**

- [x] 5. 檢查點 — 確認事件調用鏈分析模組正確
  - 確保所有測試通過，如有疑問請詢問使用者。

- [x] 6. 實作 `coupling-advisor.ts` — 耦合度評估與重構建議
  - [x] 6.1 建立 `kiro-unity-power/src/coupling-advisor.ts`，實作 `calculateCouplingScores` 函式
    - 根據直接引用數量（權重 1.0）、事件調用鏈深度（權重 0.5 × 深度）、共享狀態變更數量（權重 2.0）、雙向依賴（+10.0 加成）計算 `CouplingScore`
    - 相同輸入應產生相同分數（確定性）
    - _需求：3.1, 3.2, 3.5_

  - [x] 6.2 實作 `generateRefactoringSuggestions` 函式
    - 當 `couplingScore` 超過閾值時產生 `RefactoringSuggestion`
    - 支援四種建議類型：EventBus、ScriptableObjectChannel、LayerSeparation、InterfaceDecoupling
    - 雙向依賴標記為嚴重耦合並優先建議重構
    - 分數未超過閾值時不產生建議
    - _需求：3.3, 3.4, 3.5_

  - [ ]* 6.3 撰寫 `coupling-advisor` 單元測試
    - 在 `kiro-unity-power/tests/unit/coupling-advisor.test.ts` 中撰寫測試
    - 測試耦合分數計算公式、閾值判定、雙向依賴加成
    - 測試各類重構建議的產生邏輯
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.4 撰寫屬性測試：Property 10 — 耦合分數計算確定性
    - **Property 10: 耦合分數計算確定性**
    - 驗證相同的 `UIReferenceResult` 與 `EventChainResult` 輸入產生相同的 `CouplingScore`
    - **驗證：需求 3.1, 3.2**

  - [ ]* 6.5 撰寫屬性測試：Property 11 — 重構建議閾值與類型
    - **Property 11: 重構建議閾值與類型**
    - 驗證分數超過閾值時產生至少一個建議且類型有效，未超過閾值時不產生建議
    - **驗證：需求 3.3, 3.4**

  - [ ]* 6.6 撰寫屬性測試：Property 12 — 雙向依賴提升耦合分數
    - **Property 12: 雙向依賴提升耦合分數**
    - 驗證雙向依賴的 `couplingScore` 嚴格大於僅有單向依賴（其餘因素相同）時的分數
    - **驗證：需求 3.5**

- [x] 7. 檢查點 — 確認耦合度評估模組正確
  - 確保所有測試通過，如有疑問請詢問使用者。

- [x] 8. 實作 `ui-dependency-report.ts` — 報告整合
  - [x] 8.1 建立 `kiro-unity-power/src/ui-dependency-report.ts`，實作 `integrateUIDependencyReport` 函式
    - 整合 `UIReferenceResult`、`EventChainResult`、`CouplingPair[]`、`RefactoringSuggestion[]` 為完整的 `UIDependencyReport`
    - 產生 `UIDependencyReportSummary`，包含 `totalUIComponents`、`totalScriptReferences`、`totalEventChains`、`deepChainCount`、`highCouplingPairCount`
    - `couplingPairs` 依 `couplingScore` 由高到低排序
    - 報告格式為 JSON 相容的結構化物件
    - _需求：4.1, 4.2, 4.3, 4.4_

  - [ ]* 8.2 撰寫 `ui-dependency-report` 單元測試
    - 在 `kiro-unity-power/tests/unit/ui-dependency-report.test.ts` 中撰寫測試
    - 測試報告整合、摘要計數一致性、排序正確性
    - _需求：4.1, 4.2, 4.3_

  - [ ]* 8.3 撰寫屬性測試：Property 13 — 報告摘要與明細一致性
    - **Property 13: 報告摘要與明細一致性**
    - 驗證 `summary.totalScriptReferences` 等於 `referenceResult.references.length` 等一致性條件
    - **驗證：需求 4.1, 4.2**

  - [ ]* 8.4 撰寫屬性測試：Property 14 — 耦合配對依分數降序排列
    - **Property 14: 耦合配對依分數降序排列**
    - 驗證 `couplingPairs` 陣列中相鄰元素滿足 `pairs[i].couplingScore >= pairs[i+1].couplingScore`
    - **驗證：需求 4.3**

- [x] 9. 實作 `ui-dependency-serialization.ts` — 序列化與反序列化
  - [x] 9.1 建立 `kiro-unity-power/src/ui-dependency-serialization.ts`，實作序列化三件組
    - 實作 `serializeUIDependencyReport`：將 `UIDependencyReport` 序列化為 JSON 字串
    - 實作 `deserializeUIDependencyReport`：將 JSON 字串反序列化為 `UIDependencyReport`，無效 JSON 或結構不符時拋出描述性錯誤
    - 實作 `formatUIDependencyReportAsText`：將報告格式化為人類可讀文字，包含所有 `ScriptReference` 的 `filePath`、所有 `CouplingPair` 的 `scriptA`/`scriptB`、所有 `RefactoringSuggestion` 的 `title`
    - 遵循現有 `profiler-serialization.ts` 的驗證模式
    - _需求：5.1, 5.2, 5.3, 5.4_

  - [ ]* 9.2 撰寫 `ui-dependency-serialization` 單元測試
    - 在 `kiro-unity-power/tests/unit/ui-dependency-serialization.test.ts` 中撰寫測試
    - 測試無效 JSON 處理、結構驗證錯誤訊息
    - _需求：5.1, 5.2_

  - [ ]* 9.3 撰寫屬性測試：Property 15 — 序列化往返屬性
    - **Property 15: 序列化往返屬性**
    - 使用 fast-check 產生隨機 `UIDependencyReport`，驗證 `deserialize(serialize(report))` 與原始物件深度相等
    - **驗證：需求 5.1, 5.2, 5.4**

  - [ ]* 9.4 撰寫屬性測試：Property 16 — 格式化文字包含關鍵資訊
    - **Property 16: 格式化文字包含關鍵資訊**
    - 驗證 `formatUIDependencyReportAsText` 產生的文字包含所有 `filePath`、`scriptA`/`scriptB`、`title`
    - **驗證：需求 5.3**

- [x] 10. 檢查點 — 確認序列化與報告模組正確
  - 確保所有測試通過，如有疑問請詢問使用者。

- [x] 11. 整合串接與端對端驗證
  - [x] 11.1 在 `kiro-unity-power/tests/unit/` 中撰寫整合煙霧測試
    - 建立 `ui-dependency-integration.test.ts`
    - 測試完整流程：C# 腳本輸入 → `trackUIReferences` → `analyzeEventChain` → `calculateCouplingScores` → `generateRefactoringSuggestions` → `integrateUIDependencyReport` → `serializeUIDependencyReport` → `deserializeUIDependencyReport`
    - 驗證各模組串接後的資料流正確性
    - _需求：1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 12. 最終檢查點 — 確認所有測試通過
  - 確保所有測試通過，如有疑問請詢問使用者。

## 備註

- 標記 `*` 的任務為選用任務，可跳過以加速 MVP 開發
- 每個任務皆引用對應的需求編號以確保可追溯性
- 檢查點確保漸進式驗證
- 屬性測試驗證通用正確性屬性，單元測試驗證具體範例與邊界情況
- 所有模組遵循現有專案的純函式設計風格與模組化架構
