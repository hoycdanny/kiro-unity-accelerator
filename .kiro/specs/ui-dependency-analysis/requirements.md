# 需求文件：UI 與遊戲邏輯跨文件依賴分析

## 簡介

本功能為 Kiro Unity Power 新增 UI 與遊戲邏輯之間的跨文件依賴分析能力。在 Unity 專案中，UI 元件（按鈕、面板、文字等）經常被多個腳本引用，事件調用鏈（按鈕點擊 → 事件觸發 → 遊戲狀態變更）可能跨越多個文件，導致耦合過深且難以追蹤。本功能透過靜態分析 C# 腳本，追蹤所有引用特定 UI 元件的腳本、解析事件調用鏈，並提供重構建議以降低耦合度。

本功能建立在現有的 `dependency-analysis.ts`（資產依賴分析）、`cycle-detection.ts`（循環依賴偵測）與 `architecture-check.ts`（架構規則檢查）之上，擴展為針對 UI 與遊戲邏輯互動的專用分析工具。

## 詞彙表

- **UI_Reference_Tracker**：負責追蹤所有引用特定 UI 元件之腳本的模組
- **Event_Chain_Analyzer**：負責解析事件調用鏈（從 UI 事件到遊戲狀態變更）的模組
- **Coupling_Advisor**：根據依賴分析結果產生重構建議以降低耦合度的模組
- **UI_Component**：Unity UI 元件，包含 Button、Toggle、Slider、InputField、Dropdown、ScrollRect、Text、Image 等 UGUI 或 UI Toolkit 元件
- **Script_Reference**：一個 C# 腳本對特定 UI_Component 的引用，包含引用方式（欄位宣告、GetComponent 呼叫、Find 查詢等）
- **Event_Chain**：從 UI 事件觸發開始，經過中間處理函式，最終影響遊戲狀態的完整調用路徑
- **Event_Node**：Event_Chain 中的單一節點，代表一個函式呼叫或事件訂閱
- **Coupling_Score**：衡量兩個模組之間耦合程度的數值指標，數值越高表示耦合越深
- **Refactoring_Suggestion**：針對耦合過深的程式碼所提出的具體重構方案
- **Event_Subscription**：C# 腳本中對 Unity 事件的訂閱，例如 `button.onClick.AddListener` 或 `UnityEvent` 的 `+=` 訂閱
- **State_Mutation**：遊戲狀態的變更操作，例如修改分數、生命值、遊戲階段等全域或共享狀態
- **Dependency_Graph**：以有向圖表示的 UI 元件與腳本之間的依賴關係

## 需求

### 需求 1：UI 元件跨文件引用追蹤

**使用者故事：** 身為 Unity 工程師，我希望系統能追蹤所有引用特定 UI 元件的腳本，以便了解哪些程式碼依賴於該 UI 元件。

#### 驗收條件

1. WHEN 使用者指定一個 UI_Component 名稱或類型，THE UI_Reference_Tracker SHALL 掃描所有 C# 腳本並回傳引用該 UI_Component 的 Script_Reference 清單，每筆包含檔案路徑、行號與引用方式
2. THE UI_Reference_Tracker SHALL 偵測以下引用方式：SerializeField 或 public 欄位宣告中的 UI 類型、GetComponent 或 GetComponentInChildren 呼叫取得 UI 類型、GameObject.Find 或 transform.Find 查詢 UI 物件、透過 AddComponent 動態新增 UI 元件
3. WHEN UI_Reference_Tracker 完成掃描，THE UI_Reference_Tracker SHALL 建構一個 Dependency_Graph，以有向圖表示 UI_Component 與引用腳本之間的關係
4. WHEN 一個 UI_Component 被三個以上的腳本引用，THE UI_Reference_Tracker SHALL 將該 UI_Component 標記為高扇入元件並在結果中標註警告
5. IF 掃描過程中某個腳本讀取失敗，THEN THE UI_Reference_Tracker SHALL 記錄該失敗並繼續掃描其餘腳本，最終結果中列出所有失敗項目

### 需求 2：事件調用鏈分析

**使用者故事：** 身為 Unity 工程師，我希望系統能解析從 UI 事件觸發到遊戲狀態變更的完整調用鏈，以便理解按鈕點擊後的完整執行流程。

#### 驗收條件

1. WHEN 使用者指定一個 UI 事件起點（例如某個 Button 的 onClick），THE Event_Chain_Analyzer SHALL 追蹤該事件的所有訂閱者，並遞迴解析每個訂閱者函式中的後續呼叫，產生完整的 Event_Chain
2. THE Event_Chain_Analyzer SHALL 偵測以下 Event_Subscription 模式：UnityEvent.AddListener 呼叫、C# event 的 += 訂閱、Inspector 中序列化的 UnityEvent 回呼（透過 SerializeField 標記的 UnityEvent 欄位）、SendMessage 或 BroadcastMessage 呼叫
3. WHEN Event_Chain_Analyzer 解析一條 Event_Chain，THE Event_Chain_Analyzer SHALL 為鏈中每個 Event_Node 記錄函式名稱、所屬腳本檔案路徑、行號與節點類型（事件觸發、事件處理、狀態變更）
4. THE Event_Chain_Analyzer SHALL 識別 Event_Chain 末端的 State_Mutation，包含對靜態欄位的寫入、對 ScriptableObject 的修改、對 PlayerPrefs 的寫入、對 Singleton 模式物件的狀態修改
5. WHEN Event_Chain 的深度超過五層，THE Event_Chain_Analyzer SHALL 將該鏈標記為過深調用鏈並在結果中標註警告
6. IF Event_Chain_Analyzer 偵測到事件調用鏈中存在循環（A 觸發 B，B 又觸發 A），THEN THE Event_Chain_Analyzer SHALL 標記該循環並中止該路徑的遞迴追蹤，在結果中回報循環路徑

### 需求 3：耦合度評估與重構建議

**使用者故事：** 身為 Unity 工程師，我希望系統能評估 UI 與遊戲邏輯之間的耦合程度，並提供具體的重構建議，以便改善程式碼架構。

#### 驗收條件

1. WHEN UI_Reference_Tracker 與 Event_Chain_Analyzer 完成分析，THE Coupling_Advisor SHALL 計算每對 UI 腳本與遊戲邏輯腳本之間的 Coupling_Score
2. THE Coupling_Advisor SHALL 根據以下因素計算 Coupling_Score：直接引用數量、事件調用鏈深度、共享狀態變更數量、雙向依賴存在與否
3. WHEN Coupling_Score 超過設定的閾值，THE Coupling_Advisor SHALL 產生對應的 Refactoring_Suggestion，包含建議標題、問題描述、具體重構步驟與預估影響程度
4. THE Coupling_Advisor SHALL 提供以下類型的 Refactoring_Suggestion：引入事件匯流排（Event Bus）以解耦直接引用、使用 ScriptableObject 事件通道取代直接方法呼叫、將 UI 邏輯與遊戲邏輯分離至不同層級、使用介面（Interface）取代具體類型引用以降低耦合
5. WHEN 存在雙向依賴（腳本 A 引用腳本 B 且腳本 B 引用腳本 A），THE Coupling_Advisor SHALL 將該依賴標記為嚴重耦合並優先建議重構

### 需求 4：依賴分析結果整合與報告

**使用者故事：** 身為 Unity 工程師，我希望所有 UI 依賴分析結果整合為一份結構化報告，以便全面了解 UI 與遊戲邏輯的依賴狀況。

#### 驗收條件

1. WHEN 依賴分析流程完成，THE UI_Reference_Tracker SHALL 將 UI 引用追蹤結果、事件調用鏈分析結果與重構建議整合為一份結構化的依賴分析報告
2. THE UI_Reference_Tracker SHALL 在報告中包含摘要區段，列出 UI_Component 總數、Script_Reference 總數、Event_Chain 總數、過深調用鏈數量與高耦合配對數量
3. THE UI_Reference_Tracker SHALL 在報告中依 Coupling_Score 由高到低排序所有耦合配對
4. THE UI_Reference_Tracker SHALL 產生的報告格式為 JSON，以便與現有的報告儲存機制整合

### 需求 5：依賴分析結果序列化與反序列化

**使用者故事：** 身為 Unity 工程師，我希望依賴分析結果能被儲存與載入，以便追蹤依賴關係的變化趨勢。

#### 驗收條件

1. THE UI_Reference_Tracker SHALL 將依賴分析結果序列化為 JSON 格式
2. WHEN 提供一份 JSON 格式的依賴分析結果，THE UI_Reference_Tracker SHALL 將其反序列化為對應的資料結構
3. THE UI_Reference_Tracker SHALL 提供格式化輸出功能，將依賴分析結果轉換為人類可讀的文字報告
4. FOR ALL 有效的依賴分析結果物件，序列化後再反序列化 SHALL 產生與原始物件等價的結果（往返屬性）

### 需求 6：功能文件與使用指南

**使用者故事：** 身為 Unity 工程師，我希望本功能提供完整的 API 文件與使用指南，以便快速使用這個 Kiro Power。

#### 驗收條件

1. THE UI_Reference_Tracker SHALL 提供 API 文件，涵蓋 UI_Reference_Tracker、Event_Chain_Analyzer 與 Coupling_Advisor 三個模組的所有公開介面，每個介面包含函式簽名、參數說明、回傳值說明與使用範例
2. THE UI_Reference_Tracker SHALL 提供使用指南文件，包含至少三個端對端使用情境範例：追蹤單一 UI_Component 的跨文件引用、解析一條完整的 Event_Chain、取得 Coupling_Score 與 Refactoring_Suggestion
3. THE UI_Reference_Tracker SHALL 提供整合文件，說明本功能如何與現有的 dependency-analysis.ts（資產依賴分析）、cycle-detection.ts（循環依賴偵測）及 architecture-check.ts（架構規則檢查）模組協同運作
4. WHEN 公開介面的函式簽名或行為發生變更，THE UI_Reference_Tracker SHALL 同步更新對應的 API 文件，確保文件內容與實作一致
5. THE UI_Reference_Tracker SHALL 在使用指南中提供詞彙表索引，連結至本需求文件中定義的所有專有名詞
6. THE UI_Reference_Tracker SHALL 提供快速入門區段，以不超過十個步驟引導使用者完成首次依賴分析操作
