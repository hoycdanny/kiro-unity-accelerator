# 需求文件：Unity 效能分析器（Performance Profiler）

## 簡介

本功能為 Kiro Unity Power 新增進階效能分析能力。當工程師發現 FPS 掉幀但不確定瓶頸所在時，系統能夠分析 Unity Profiler 截圖以識別 CPU/GPU/記憶體熱點，掃描 C# 程式碼中的效能殺手（過度 GetComponent 呼叫、GC 分配、Draw Call 過多），並提供具體的最佳化方案（物件池、批次處理、Shader 最佳化）。

本功能建立在現有的 `performance-report.ts`（效能報告產生）與 `memory-budget.ts`（記憶體預算檢查）之上，擴展為完整的效能分析工作流程。

## 詞彙表

- **Profiler_Screenshot_Analyzer**：負責解析 Unity Profiler 截圖並提取效能指標的模組
- **Code_Performance_Scanner**：負責掃描 C# 程式碼中效能反模式的模組
- **Optimization_Advisor**：根據分析結果產生具體最佳化建議的模組
- **Profiler_Screenshot**：Unity Profiler 視窗的截圖影像，包含 CPU/GPU/記憶體使用資訊
- **Hotspot**：效能瓶頸點，指消耗過多 CPU、GPU 或記憶體資源的區域
- **Performance_Antipattern**：已知會導致效能問題的程式碼模式（如在 Update 中呼叫 GetComponent）
- **Optimization_Plan**：針對已識別瓶頸所產生的結構化最佳化方案
- **Severity**：問題嚴重程度，分為 Error（錯誤）、Warning（警告）、Suggestion（建議）三級
- **GC_Allocation**：垃圾回收記憶體分配，頻繁分配會觸發 GC 導致掉幀
- **Draw_Call**：CPU 向 GPU 發送的繪製指令，過多會造成 CPU 瓶頸
- **Object_Pool**：物件池模式，預先建立並重複使用物件以避免頻繁記憶體分配
- **Batching**：批次處理，將多個繪製指令合併以減少 Draw Call 數量

## 需求

### 需求 1：Profiler 截圖分析

**使用者故事：** 身為 Unity 工程師，我希望上傳 Unity Profiler 截圖後系統能自動識別 CPU/GPU/記憶體熱點，以便快速定位效能瓶頸。

#### 驗收條件

1. WHEN 使用者提供一張 Profiler_Screenshot，THE Profiler_Screenshot_Analyzer SHALL 解析該影像並輸出結構化的效能指標資料，包含 CPU 使用率、GPU 使用率與記憶體分配量
2. WHEN Profiler_Screenshot_Analyzer 完成影像解析，THE Profiler_Screenshot_Analyzer SHALL 識別所有超過閾值的 Hotspot，並標註該 Hotspot 屬於 CPU、GPU 或記憶體類別
3. WHEN Profiler_Screenshot 包含 CPU 時間軸資訊，THE Profiler_Screenshot_Analyzer SHALL 提取各函式的執行時間佔比，並依耗時由高到低排序
4. WHEN Profiler_Screenshot 包含記憶體分配資訊，THE Profiler_Screenshot_Analyzer SHALL 提取 GC_Allocation 數值與分配來源
5. IF Profiler_Screenshot 影像品質不足或無法辨識，THEN THE Profiler_Screenshot_Analyzer SHALL 回傳描述性錯誤訊息，說明無法解析的原因並建議重新截圖
6. WHEN 分析完成，THE Profiler_Screenshot_Analyzer SHALL 產生一份 JSON 格式的分析結果，包含所有已識別的 Hotspot 清單與對應的嚴重程度（Severity）

### 需求 2：程式碼效能反模式掃描

**使用者故事：** 身為 Unity 工程師，我希望系統能自動掃描 C# 程式碼中的效能殺手，以便在問題惡化前修正。

#### 驗收條件

1. WHEN 使用者要求掃描專案程式碼，THE Code_Performance_Scanner SHALL 透過 MCP 工具讀取所有 C# 腳本並逐一檢查效能反模式
2. THE Code_Performance_Scanner SHALL 偵測以下 Performance_Antipattern：在 Update/FixedUpdate/LateUpdate 中呼叫 GetComponent、在每幀方法中使用字串串接、在每幀方法中使用 LINQ 查詢、在每幀方法中實例化新物件（new）、在每幀方法中呼叫 Find/FindObjectOfType
3. THE Code_Performance_Scanner SHALL 偵測過多 Draw_Call 相關的程式碼模式：未使用 Static Batching 的靜態物件、未啟用 GPU Instancing 的重複材質、過多獨立材質的場景物件
4. THE Code_Performance_Scanner SHALL 偵測 GC_Allocation 相關的程式碼模式：頻繁建立暫時陣列或 List、使用 foreach 遍歷非泛型集合、閉包（Closure）捕獲導致的隱式分配
5. WHEN Code_Performance_Scanner 偵測到一個 Performance_Antipattern，THE Code_Performance_Scanner SHALL 回報該問題的檔案路徑、行號、反模式類型與 Severity
6. IF 掃描過程中某個腳本讀取失敗，THEN THE Code_Performance_Scanner SHALL 記錄該失敗並繼續掃描其餘腳本，最終報告中列出所有失敗項目

### 需求 3：最佳化方案產生

**使用者故事：** 身為 Unity 工程師，我希望系統能根據分析結果提供具體可執行的最佳化方案，以便直接套用修正。

#### 驗收條件

1. WHEN Profiler_Screenshot_Analyzer 或 Code_Performance_Scanner 產生分析結果，THE Optimization_Advisor SHALL 針對每個已識別的 Hotspot 或 Performance_Antipattern 產生對應的 Optimization_Plan
2. WHEN Hotspot 類型為 Draw_Call 過多，THE Optimization_Advisor SHALL 建議以下方案之一或多個：啟用 Static/Dynamic Batching、啟用 GPU Instancing、使用 LOD Group、啟用 Occlusion Culling
3. WHEN Hotspot 類型為 GC_Allocation 過高，THE Optimization_Advisor SHALL 建議以下方案之一或多個：使用 Object_Pool、快取 GetComponent 結果至 Awake/Start、使用 StringBuilder 取代字串串接、避免在每幀方法中分配記憶體
4. WHEN Hotspot 類型為 Shader 複雜度過高，THE Optimization_Advisor SHALL 建議以下方案之一或多個：簡化 Shader 運算、減少取樣次數、使用 Shader LOD、改用 URP/Mobile Shader
5. WHEN Hotspot 類型為 CPU 耗時過高，THE Optimization_Advisor SHALL 建議以下方案之一或多個：將耗時邏輯移至 Coroutine 或 Job System、減少物理碰撞體複雜度、降低 FixedUpdate 頻率
6. THE Optimization_Advisor SHALL 為每個 Optimization_Plan 標註預估影響程度（高、中、低）與實作難度（高、中、低）

### 需求 4：效能分析報告整合

**使用者故事：** 身為 Unity 工程師，我希望所有分析結果整合為一份完整的效能報告，以便全面了解專案效能狀況。

#### 驗收條件

1. WHEN 效能分析流程完成，THE Profiler_Screenshot_Analyzer SHALL 將截圖分析結果、程式碼掃描結果與最佳化建議整合為一份結構化的效能報告
2. THE Profiler_Screenshot_Analyzer SHALL 在報告中依 Severity 將所有問題由高到低排序
3. THE Profiler_Screenshot_Analyzer SHALL 在報告中包含摘要區段，列出 Hotspot 總數、各 Severity 等級的問題數量與最優先處理的前三項問題
4. WHEN 使用者提供多張 Profiler_Screenshot，THE Profiler_Screenshot_Analyzer SHALL 支援批次分析並在報告中合併所有截圖的分析結果
5. THE Profiler_Screenshot_Analyzer SHALL 產生的報告格式與現有 PerformanceReport 型別相容，以便與現有的閾值持久化與報告儲存機制整合

### 需求 5：效能分析結果序列化與反序列化

**使用者故事：** 身為 Unity 工程師，我希望效能分析結果能被儲存與載入，以便追蹤效能變化趨勢。

#### 驗收條件

1. THE Profiler_Screenshot_Analyzer SHALL 將效能分析結果序列化為 JSON 格式
2. WHEN 提供一份 JSON 格式的效能分析結果，THE Profiler_Screenshot_Analyzer SHALL 將其反序列化為對應的資料結構
3. THE Profiler_Screenshot_Analyzer SHALL 提供格式化輸出功能，將效能分析結果轉換為人類可讀的文字報告
4. FOR ALL 有效的效能分析結果物件，序列化後再反序列化 SHALL 產生與原始物件等價的結果（往返屬性）
