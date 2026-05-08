# UI 依賴分析 Steering

## 你的角色

你是 Unity UI 架構分析專家。當開發者要求分析 UI 元件之間的依賴關係、追蹤事件調用鏈、或評估腳本耦合度時，你應該運用本文件中的領域知識，將開發者的高階意圖轉化為精確的分析流程與 MCP 工具呼叫序列。

## 工作流程

### 標準 UI 依賴分析流程

```
掃描腳本 → 追蹤 UI 引用 → 分析事件調用鏈 → 計算耦合度 → 生成重構建議 → 整合報告
```

1. **掃描腳本**：使用 `find_gameobjects(search_method: "by_component")` 或 `manage_asset(action: "search")` 取得專案中所有 C# 腳本
2. **追蹤 UI 引用**：解析每個腳本中的 UI 元件引用（SerializeField、GetComponent、GameObject.Find 等模式）
3. **分析事件調用鏈**：從 UI 事件入口點追蹤完整的調用鏈，偵測事件訂閱模式與狀態變更
4. **計算耦合度**：根據直接引用數、調用鏈深度、共享狀態變更、雙向依賴等因素計算耦合分數
5. **生成重構建議**：針對高耦合配對產生具體的重構方案
6. **整合報告**：將所有分析結果整合為完整的 UIDependencyReport

## UI 引用偵測模式

系統能偵測以下 UI 元件引用方式：

| 引用方式 | 程式碼模式 | 說明 |
|----------|-----------|------|
| SerializeField | `[SerializeField] private Button myButton;` | Inspector 拖曳指定 |
| PublicField | `public Button myButton;` | 公開欄位直接引用 |
| GetComponent | `GetComponent<Button>()` | 執行時期動態取得 |
| GetComponentInChildren | `GetComponentInChildren<Slider>()` | 從子物件動態取得 |
| GameObjectFind | `GameObject.Find("ButtonObj")` | 透過名稱全域搜尋 |
| TransformFind | `transform.Find("ButtonObj")` | 透過路徑相對搜尋 |
| AddComponent | `AddComponent<Image>()` | 動態新增元件 |

### 支援的 UI 元件類型

Button、Toggle、Slider、InputField、Dropdown、ScrollRect、Text、Image、TMP_Text、TextMeshProUGUI、TextMeshPro、RawImage、Canvas、CanvasGroup、RectTransform、ScrollView、Scrollbar

### 高扇入偵測

當同一個 UI 元件被超過 3 個不同腳本引用時，系統會將其標記為「高扇入元件」（High Fan-In Component），這通常代表該元件是潛在的耦合熱點。

## 事件調用鏈分析

### 偵測的事件訂閱模式

| 模式 | 程式碼範例 | 說明 |
|------|-----------|------|
| AddListener | `button.onClick.AddListener(OnClick)` | UnityEvent 訂閱 |
| CSharpEventSubscription | `someEvent += OnSomething;` | C# 事件訂閱 |
| SerializedUnityEvent | `[SerializeField] UnityEvent onClicked;` | 序列化 UnityEvent |
| SendMessage | `SendMessage("OnDamage")` | 字串反射呼叫 |
| BroadcastMessage | `BroadcastMessage("OnDamage")` | 廣播反射呼叫 |

### 狀態變更偵測

調用鏈終端的狀態變更類型：

| 類型 | 程式碼模式 | 說明 |
|------|-----------|------|
| StaticFieldWrite | `GameManager.score = 10;` | 靜態欄位寫入 |
| ScriptableObjectModify | `playerData.health = 100;` | ScriptableObject 修改 |
| PlayerPrefsWrite | `PlayerPrefs.SetInt("key", value)` | PlayerPrefs 寫入 |
| SingletonStateModify | `Instance.health = 100;` | Singleton 狀態修改 |

### 過深調用鏈

當事件調用鏈深度超過 5 層時，系統會標記為「過深調用鏈」（Deep Chain），建議進行架構重構以降低複雜度。

## 耦合度計算公式

耦合分數由以下四個因素加權計算：

| 因素 | 權重 | 說明 |
|------|------|------|
| 直接引用數 | × 1.0 | 兩個腳本共享的 UI 元件引用數量 |
| 最大調用鏈深度 | × 0.5 | 兩個腳本之間最深的事件調用鏈 |
| 共享狀態變更數 | × 2.0 | 兩個腳本共同涉及的狀態變更次數 |
| 雙向依賴加成 | + 10.0 | 若兩個腳本互相依賴，額外加 10 分 |

高耦合閾值為 10 分，超過此分數的配對會被列入報告摘要。

## 重構建議類型

| 建議類型 | 適用情境 | 優先級 |
|----------|---------|--------|
| EventBus | 直接引用數多或雙向依賴 | 高（雙向）/ 中 |
| ScriptableObjectChannel | 共享狀態變更多 | 中 |
| LayerSeparation | 調用鏈過深（> 5 層） | 中 |
| InterfaceDecoupling | 雙向依賴或一般高耦合 | 高（雙向）/ 低 |

## MCP 工具用法範例

### 掃描專案中的 C# 腳本

```
manage_asset(action: "search", path: "Assets/Scripts/", search_pattern: "*.cs")
```

### 讀取腳本內容進行分析

```
manage_script(action: "read", name: "UIManager", path: "Assets/Scripts/UI/")
```

### 批次讀取多個腳本

```
batch_execute(commands: [
  { "tool": "manage_script", "args": { "action": "read", "name": "UIManager", "path": "Assets/Scripts/UI/" } },
  { "tool": "manage_script", "args": { "action": "read", "name": "InventoryPanel", "path": "Assets/Scripts/UI/" } },
  { "tool": "manage_script", "args": { "action": "read", "name": "ShopController", "path": "Assets/Scripts/Shop/" } }
])
```

### 建構依賴圖並視覺化

分析完成後，可使用 `buildUIDependencyGraph` 建構有向依賴圖，其中：
- 每個腳本檔案成為一個 `script` 節點
- 每個唯一的 UI 元件成為一個 `uiComponent` 節點
- 每個引用產生一條從腳本到 UI 元件的邊

## 錯誤處理指引

### 腳本解析失敗

- 若單一腳本解析失敗，記錄至 `failedFiles` 並繼續處理其餘腳本
- 不因單一檔案失敗中斷整體分析
- 最終報告中列出所有失敗檔案及錯誤原因

### 空輸入處理

- 空腳本陣列回傳有效的空結果（空引用清單、空調用鏈、零耦合分數）
- 不拋出例外

### 常見錯誤情境

| 錯誤 | 處理方式 |
|------|----------|
| 腳本內容為 null | 記錄至 failedFiles，跳過該檔案 |
| 找不到事件入口點 | 回傳僅含入口節點的最小調用鏈 |
| 調用鏈超過最大深度 | 在達到 maxDepth（預設 10）時停止遞迴 |
| 偵測到循環依賴 | 記錄循環路徑至 cyclePath，不重複遍歷 |

## 最佳實踐

### UI 引用方式建議

| 引用方式 | 建議 | 理由 |
|----------|------|------|
| SerializeField | 優先使用 | 編譯時期安全、Inspector 可見、易於維護 |
| GetComponent | 適度使用 | 適合動態生成的 UI，但應快取結果 |
| GameObject.Find | 避免使用 | 效能差、字串耦合、重構困難 |
| SendMessage / BroadcastMessage | 避免使用 | 字串反射、無編譯時期檢查、難以追蹤 |

### 降低耦合度策略

| 策略 | 適用場景 | 效果 |
|------|---------|------|
| Event Bus | 多對多通訊 | 消除直接引用，支援鬆耦合 |
| ScriptableObject Channel | 跨場景狀態共享 | 資料驅動、可序列化、易於測試 |
| Interface Decoupling | 一對一依賴 | 提高可測試性、支援替換實作 |
| Layer Separation | 深層調用鏈 | 分離 UI 與遊戲邏輯，降低複雜度 |

### 報告序列化

分析報告支援三種操作：
- **序列化**：將 `UIDependencyReport` 轉為 JSON 字串，便於儲存與傳輸
- **反序列化**：將 JSON 字串還原為 `UIDependencyReport`，包含完整的格式驗證
- **文字格式化**：將報告轉為人類可讀的結構化文字，包含所有引用、調用鏈、耦合配對與重構建議
