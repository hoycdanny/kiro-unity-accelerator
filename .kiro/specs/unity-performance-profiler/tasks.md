# 實作計畫：Unity 效能分析器（Performance Profiler）

## 概述

依據設計文件，逐步實作五個核心模組（ProfilerScreenshotAnalyzer、CodePerformanceScanner、OptimizationAdvisor、ReportIntegrator、ProfilerSerialization），並將所有新增型別整合至現有 `types.ts`。每個模組實作後搭配屬性測試與單元測試驗證正確性，最終整合所有模組並確保與現有 `PerformanceReport` 型別相容。

## Tasks

- [x] 1. 新增資料模型型別至 types.ts
  - [x] 1.1 在 `kiro-unity-power/src/types.ts` 中新增所有 Profiler 相關型別
    - 新增 `ScreenshotInput`、`CpuTimelineEntry`、`MemoryAllocationEntry`、`ProfilerMetrics`、`Hotspot`、`FunctionTiming`、`ScreenshotAnalysisResult` 介面
    - 新增 `AntipatternType`、`AntipatternMatch`、`ScanContext`、`ScriptFile`、`CodeScanResult`、`FailedFile` 介面
    - 新增 `OptimizationPlan` 介面
    - 新增 `ProfilerReport`、`ReportSummary`、`TopIssue` 介面
    - 確保 `Hotspot.severity` 與 `AntipatternMatch.severity` 使用現有 `SeverityLevel` 列舉
    - _需求：1.1, 1.2, 1.6, 2.5, 3.6, 4.1, 5.1_

- [x] 2. 實作 ProfilerScreenshotAnalyzer 模組
  - [x] 2.1 建立 `kiro-unity-power/src/profiler-screenshot-analyzer.ts`
    - 實作 `analyzeScreenshot(input, thresholds)` 函式：解析截圖輸入資料，產生結構化 `ProfilerMetrics` 與 `ScreenshotAnalysisResult`
    - 實作 `extractFunctionTimings(cpuData)` 函式：提取函式執行時間並依耗時降序排列
    - 實作 `identifyHotspots(metrics, thresholds)` 函式：識別超過閾值的熱點並標註類別與嚴重程度
    - 實作 `analyzeBatch(inputs, thresholds)` 函式：批次分析多張截圖並合併結果
    - 處理影像品質不足或無法辨識的錯誤情境，回傳描述性錯誤訊息
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.4_

  - [ ]* 2.2 撰寫 Property 1 的屬性測試
    - **Property 1：截圖分析產生結構化指標**
    - 在 `kiro-unity-power/tests/property/profiler-analysis-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ScreenshotInput`，驗證 `analyzeScreenshot` 回傳的 `ProfilerMetrics` 所有數值皆為非負數
    - **驗證：需求 1.1**

  - [ ]* 2.3 撰寫 Property 2 的屬性測試
    - **Property 2：熱點識別遵循閾值規則**
    - 在 `kiro-unity-power/tests/property/profiler-analysis-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ProfilerMetrics` 與 `PerformanceThresholds`，驗證每個回傳的 `Hotspot` 對應指標值超過閾值且 `category` 為有效值
    - **驗證：需求 1.2**

  - [ ]* 2.4 撰寫 Property 3 的屬性測試
    - **Property 3：函式執行時間依耗時降序排列**
    - 在 `kiro-unity-power/tests/property/profiler-analysis-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `CpuTimelineEntry[]`，驗證 `extractFunctionTimings` 回傳結果依 `timeMs` 降序排列
    - **驗證：需求 1.3**

  - [ ]* 2.5 撰寫 Property 4 的屬性測試
    - **Property 4：GC 分配正確提取**
    - 在 `kiro-unity-power/tests/property/profiler-analysis-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `MemoryAllocationEntry[]`，驗證 GC 分配總量等於所有 `isGcAllocation === true` 條目的 `sizeBytes` 總和
    - **驗證：需求 1.4**

  - [ ]* 2.6 撰寫 ProfilerScreenshotAnalyzer 單元測試
    - 在 `kiro-unity-power/tests/unit/profiler-screenshot-analyzer.test.ts` 中實作
    - 測試空輸入、缺少欄位、單一熱點識別的具體範例
    - 測試影像品質不足時的錯誤回傳
    - 測試批次分析合併結果
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.4_

- [-] 3. 實作 CodePerformanceScanner 模組
  - [x] 3.1 建立 `kiro-unity-power/src/code-performance-scanner.ts`
    - 實作 `matchAntipattern(line, lineNumber, context)` 函式：檢查單行程式碼是否匹配特定反模式
    - 實作 `scanScript(filePath, content)` 函式：掃描單一 C# 腳本，偵測 Update 系列方法中的 GetComponent、字串串接、LINQ、new 分配、Find 等反模式
    - 實作 `scanAllScripts(scripts)` 函式：掃描多個腳本並回傳完整結果（含失敗記錄）
    - 偵測 Draw Call 相關模式（未使用 Static Batching、未啟用 GPU Instancing、過多獨立材質）
    - 偵測 GC Allocation 相關模式（頻繁建立暫時陣列、foreach 非泛型集合、閉包捕獲）
    - 處理腳本讀取失敗的容錯邏輯，記錄至 `failedFiles` 並繼續掃描
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.2 撰寫 Property 5 的屬性測試
    - **Property 5：反模式偵測涵蓋所有已知模式**
    - 在 `kiro-unity-power/tests/property/code-scanner-properties.test.ts` 中實作
    - 使用 fast-check 生成包含已知反模式的 C# 程式碼片段（在 Update 方法內），驗證 `scanScript` 偵測到對應的 `AntipatternMatch`
    - **驗證：需求 2.2, 2.3, 2.4**

  - [ ]* 3.3 撰寫 Property 6 的屬性測試
    - **Property 6：偵測到的反模式包含完整中繼資料**
    - 在 `kiro-unity-power/tests/property/code-scanner-properties.test.ts` 中實作
    - 使用 fast-check 驗證每個 `AntipatternMatch` 的 `filePath` 為非空字串、`lineNumber` 為正整數、`antipatternType` 與 `severity` 為有效值
    - **驗證：需求 2.5**

  - [ ]* 3.4 撰寫 CodePerformanceScanner 單元測試
    - 在 `kiro-unity-power/tests/unit/code-performance-scanner.test.ts` 中實作
    - 測試各反模式的具體 C# 程式碼範例
    - 測試掃描失敗的容錯處理
    - 測試空腳本內容
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. 檢查點 — 確認截圖分析與程式碼掃描模組
  - 確保所有測試通過，若有疑問請詢問使用者。

- [-] 5. 實作 OptimizationAdvisor 模組
  - [x] 5.1 建立 `kiro-unity-power/src/optimization-advisor.ts`
    - 實作 `generateOptimizations(hotspots)` 函式：針對熱點清單產生最佳化方案
    - 實作 `generateAntipatternFixes(antipatterns)` 函式：針對反模式清單產生最佳化方案
    - 實作 `assessOptimization(plan)` 函式：為方案標註預估影響程度與實作難度
    - Draw Call 類別建議：Static/Dynamic Batching、GPU Instancing、LOD Group、Occlusion Culling
    - GC Allocation 類別建議：Object Pool、快取 GetComponent、StringBuilder、避免每幀分配
    - Shader 類別建議：簡化運算、減少取樣、Shader LOD、URP/Mobile Shader
    - CPU 類別建議：Coroutine/Job System、減少碰撞體複雜度、降低 FixedUpdate 頻率
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.2 撰寫 Property 7 的屬性測試
    - **Property 7：最佳化器為每個問題產生至少一個方案**
    - 在 `kiro-unity-power/tests/property/optimization-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機非空 `Hotspot[]`，驗證 `generateOptimizations` 回傳的方案數量 >= 輸入數量
    - **驗證：需求 3.1**

  - [ ]* 5.3 撰寫 Property 8 的屬性測試
    - **Property 8：最佳化建議與問題類別相符**
    - 在 `kiro-unity-power/tests/property/optimization-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `Hotspot`，驗證產生的 `OptimizationPlan.targetType` 與 `Hotspot.category` 相關，且方案包含對應類別的關鍵字
    - **驗證：需求 3.2, 3.3, 3.4, 3.5**

  - [ ]* 5.4 撰寫 Property 9 的屬性測試
    - **Property 9：所有最佳化方案標註影響程度與難度**
    - 在 `kiro-unity-power/tests/property/optimization-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `OptimizationPlan`，驗證 `estimatedImpact` 與 `implementationDifficulty` 為有效值
    - **驗證：需求 3.6**

  - [ ]* 5.5 撰寫 OptimizationAdvisor 單元測試
    - 在 `kiro-unity-power/tests/unit/optimization-advisor.test.ts` 中實作
    - 測試各類別熱點的具體建議內容
    - 測試空輸入回傳空陣列
    - 測試未知熱點類別的通用建議
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. 實作 ReportIntegrator 模組
  - [x] 6.1 建立 `kiro-unity-power/src/report-integrator.ts`
    - 實作 `integrateReport(screenshotResult, codeScanResult, optimizations)` 函式：整合所有分析結果為 `ProfilerReport`
    - 實作 `generateSummary(report)` 函式：產生報告摘要，包含熱點總數、各嚴重程度數量與前三項優先問題
    - 報告中所有問題依 Severity 由高到低排序（Error > Warning > Suggestion）
    - 確保產生的報告格式與現有 `PerformanceReport` 型別相容
    - _需求：4.1, 4.2, 4.3, 4.5_

  - [ ]* 6.2 撰寫 Property 10 的屬性測試
    - **Property 10：報告整合所有分析來源**
    - 在 `kiro-unity-power/tests/property/report-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ScreenshotAnalysisResult` 與 `CodeScanResult`，驗證 `integrateReport` 不遺漏任何項目
    - **驗證：需求 4.1**

  - [ ]* 6.3 撰寫 Property 11 的屬性測試
    - **Property 11：報告問題依嚴重程度排序**
    - 在 `kiro-unity-power/tests/property/report-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ProfilerReport`，驗證所有問題依 Severity 由高到低排序
    - **驗證：需求 4.2**

  - [ ]* 6.4 撰寫 Property 12 的屬性測試
    - **Property 12：報告摘要計數與實際資料一致**
    - 在 `kiro-unity-power/tests/property/report-properties.test.ts` 中實作
    - 使用 fast-check 驗證 `summary.totalHotspots` 與實際熱點數量一致，`severityCounts` 正確，`topIssues` 長度不超過 3
    - **驗證：需求 4.3**

  - [ ]* 6.5 撰寫 Property 13 的屬性測試
    - **Property 13：批次分析合併所有截圖結果**
    - 在 `kiro-unity-power/tests/property/report-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ScreenshotInput[]`，驗證 `analyzeBatch` 回傳的熱點為各別分析結果的聯集
    - **驗證：需求 4.4**

  - [ ]* 6.6 撰寫 ReportIntegrator 單元測試
    - 在 `kiro-unity-power/tests/unit/report-integrator.test.ts` 中實作
    - 測試僅截圖、僅程式碼掃描、兩者皆有的整合範例
    - 測試摘要產生的正確性
    - _需求：4.1, 4.2, 4.3, 4.5_

- [x] 7. 檢查點 — 確認最佳化建議與報告整合模組
  - 確保所有測試通過，若有疑問請詢問使用者。

- [-] 8. 實作 ProfilerSerialization 模組
  - [x] 8.1 建立 `kiro-unity-power/src/profiler-serialization.ts`
    - 實作 `serializeReport(report)` 函式：將 `ProfilerReport` 序列化為 JSON 字串
    - 實作 `deserializeReport(json)` 函式：將 JSON 字串反序列化為 `ProfilerReport`，無效格式拋出描述性錯誤
    - 實作 `formatReportAsText(report)` 函式：將報告格式化為人類可讀的文字，包含所有熱點描述、嚴重程度與最佳化方案標題
    - _需求：5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.2 撰寫 Property 14 的屬性測試
    - **Property 14：序列化往返屬性**
    - 在 `kiro-unity-power/tests/property/serialization-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ProfilerReport`，驗證 `deserializeReport(serializeReport(report))` 與原始物件深度相等
    - **驗證：需求 5.4**

  - [ ]* 8.3 撰寫 Property 15 的屬性測試
    - **Property 15：格式化文字包含關鍵報告資訊**
    - 在 `kiro-unity-power/tests/property/serialization-properties.test.ts` 中實作
    - 使用 fast-check 生成隨機 `ProfilerReport`，驗證 `formatReportAsText` 輸出包含所有熱點描述、嚴重程度文字與最佳化方案標題
    - **驗證：需求 5.3**

  - [ ]* 8.4 撰寫 ProfilerSerialization 單元測試
    - 在 `kiro-unity-power/tests/unit/profiler-serialization.test.ts` 中實作
    - 測試無效 JSON 的錯誤處理
    - 測試空報告的邊界案例
    - 測試格式化輸出包含預期內容
    - _需求：5.1, 5.2, 5.3, 5.4_

- [x] 9. 最終檢查點 — 確保所有測試通過
  - 確保所有測試通過，若有疑問請詢問使用者。

## 備註

- 標記 `*` 的任務為選用項目，可跳過以加速 MVP 開發
- 每個任務皆標註對應的需求編號，確保可追溯性
- 檢查點確保漸進式驗證
- 屬性測試驗證通用正確性屬性，單元測試驗證具體範例與邊界案例
