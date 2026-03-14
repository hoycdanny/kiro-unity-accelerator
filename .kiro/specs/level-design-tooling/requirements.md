# 需求文件

## 簡介

本功能為 Kiro Unity Power 新增關卡設計工具鏈，協助企劃與開發者快速生成 Unity Editor 擴展腳本（自定義 Inspector、批次處理工具）、建立關卡配置用的 ScriptableObject 模板，以及自動化場景物件的批次設定（Layer、Tag、組件參數）。目標是大幅減少手動配置關卡數據的時間，讓企劃能專注於設計而非重複性操作。

## 詞彙表

- **Level_Design_Tooling**: 關卡設計工具鏈系統，涵蓋 Editor 擴展腳本生成、ScriptableObject 模板建立、場景物件批次設定三大功能
- **Editor_Extension_Generator**: Editor 擴展腳本生成器，根據使用者描述產生自定義 Inspector 或批次處理工具的 C# 腳本
- **Custom_Inspector**: Unity Editor 自定義 Inspector 面板，用於在 Inspector 視窗中顯示自定義的編輯介面
- **Batch_Tool**: 批次處理工具，用於對多個物件同時執行相同操作的 Editor 視窗腳本
- **ScriptableObject_Template**: 基於 ScriptableObject 的關卡配置資料模板，定義關卡數據的結構與欄位
- **Scene_Batch_Configurator**: 場景物件批次設定器，自動化設定場景中物件的 Layer、Tag 及組件參數
- **Level_Config**: 關卡配置資料，包含關卡的敵人配置、獎勵設定、難度參數等結構化數據
- **Field_Definition**: ScriptableObject 模板中的欄位定義，包含欄位名稱、型別、預設值與驗證規則
- **Batch_Rule**: 批次設定規則，定義篩選條件與對應的設定操作（Layer、Tag、組件參數）
- **Template_Registry**: 模板註冊表，管理所有已建立的 ScriptableObject 模板與 Editor 擴展腳本模板

## 需求

### 需求 1：Editor 擴展腳本生成

**使用者故事：** 身為企劃，我希望能透過自然語言描述快速生成 Unity Editor 擴展腳本，以便在不需要深入了解 Editor API 的情況下建立自定義 Inspector 面板與批次處理工具。

#### 驗收條件

1. WHEN 使用者提供目標 MonoBehaviour 或 ScriptableObject 類別名稱，THE Editor_Extension_Generator SHALL 生成對應的自定義 Inspector C# 腳本，腳本放置於 `Assets/Editor/` 目錄下
2. WHEN 使用者描述批次處理需求（例如「批次修改所有敵人的血量」），THE Editor_Extension_Generator SHALL 生成繼承 EditorWindow 的批次處理工具 C# 腳本
3. THE Editor_Extension_Generator SHALL 生成的 C# 腳本包含正確的 `using` 宣告、`[CustomEditor]` 或 `[MenuItem]` 屬性標記，以及 `OnInspectorGUI` 或 `OnGUI` 方法實作
4. WHEN 目標類別包含序列化欄位，THE Editor_Extension_Generator SHALL 為每個序列化欄位生成對應的 Inspector GUI 控制項（例如 IntField、FloatField、ObjectField、EnumPopup）
5. THE Editor_Extension_Generator SHALL 生成的腳本包含 Undo 支援，使用 `Undo.RecordObject` 記錄所有修改操作
6. IF 使用者提供的類別名稱在專案中不存在，THEN THE Editor_Extension_Generator SHALL 回傳錯誤訊息，說明找不到指定類別並列出相似名稱的類別供選擇
7. WHEN 使用者要求生成批次處理工具，THE Editor_Extension_Generator SHALL 在生成的腳本中包含進度條顯示（EditorUtility.DisplayProgressBar），每處理一個物件更新一次進度
8. THE Editor_Extension_Generator SHALL 生成的腳本遵循 Unity Editor 腳本慣例，將腳本檔案命名為 `{TargetClassName}Inspector.cs` 或 `{ToolName}Window.cs`

### 需求 2：ScriptableObject 關卡配置模板建立

**使用者故事：** 身為企劃，我希望能快速建立結構化的 ScriptableObject 關卡配置模板，以便統一管理關卡數據並支援在 Inspector 中直覺編輯。

#### 驗收條件

1. WHEN 使用者描述關卡配置結構（例如「關卡有名稱、難度、敵人波次列表、獎勵物品」），THE ScriptableObject_Template SHALL 生成對應的 ScriptableObject C# 腳本，包含所有描述的欄位
2. THE ScriptableObject_Template SHALL 為生成的腳本加上 `[CreateAssetMenu]` 屬性，設定合理的 menuName 與 fileName 參數
3. WHEN 欄位型別為列表或陣列，THE ScriptableObject_Template SHALL 使用 `[SerializeField]` 標記並搭配 `List<T>` 型別，確保在 Inspector 中可展開編輯
4. THE ScriptableObject_Template SHALL 為每個欄位生成 `[Tooltip]` 屬性，包含欄位用途的中文說明
5. WHEN 使用者指定欄位需要驗證規則（例如「血量範圍 1-9999」），THE ScriptableObject_Template SHALL 生成對應的 `[Range]`、`[Min]` 或自定義驗證屬性
6. THE ScriptableObject_Template SHALL 生成配套的自定義 Inspector 腳本，提供比預設 Inspector 更友善的編輯介面
7. WHEN 使用者指定需要巢狀結構（例如「敵人波次包含敵人類型與數量」），THE ScriptableObject_Template SHALL 生成標記 `[System.Serializable]` 的巢狀資料類別
8. THE ScriptableObject_Template SHALL 在生成的腳本中包含 `OnValidate` 方法，自動檢查欄位值是否符合驗證規則

### 需求 3：場景物件批次設定

**使用者故事：** 身為開發者，我希望能自動化設定場景中大量物件的 Layer、Tag 及組件參數，以便減少手動逐一設定的時間並避免人為疏漏。

#### 驗收條件

1. WHEN 使用者提供批次設定規則（例如「所有名稱包含 Enemy 的物件設定 Layer 為 Enemy」），THE Scene_Batch_Configurator SHALL 掃描目前場景中所有符合條件的 GameObject 並套用指定的 Layer 設定
2. WHEN 使用者提供 Tag 設定規則，THE Scene_Batch_Configurator SHALL 為所有符合篩選條件的 GameObject 設定指定的 Tag
3. WHEN 使用者提供組件參數設定規則（例如「所有 BoxCollider 的 isTrigger 設為 true」），THE Scene_Batch_Configurator SHALL 找到所有包含指定組件的 GameObject 並修改對應參數
4. THE Scene_Batch_Configurator SHALL 支援以下篩選條件的組合：物件名稱（支援萬用字元）、Tag、Layer、包含的組件類型、父物件路徑
5. THE Scene_Batch_Configurator SHALL 在執行批次設定前顯示預覽清單，列出所有將被修改的物件與預計變更內容，等待使用者確認後才執行
6. THE Scene_Batch_Configurator SHALL 使用 Undo 群組記錄所有批次修改，使用者可透過單次 Undo 操作還原整批變更
7. WHEN 批次設定完成，THE Scene_Batch_Configurator SHALL 產生變更摘要報告，包含成功修改的物件數量、跳過的物件數量及跳過原因
8. IF 指定的 Layer 或 Tag 在專案中不存在，THEN THE Scene_Batch_Configurator SHALL 回傳錯誤訊息並提供專案中已定義的 Layer 與 Tag 清單供選擇
9. WHEN 使用者提供多條批次設定規則，THE Scene_Batch_Configurator SHALL 依規則順序依次執行，每條規則的結果不影響其他規則的篩選條件

### 需求 4：模板與規則的持久化管理

**使用者故事：** 身為開發者，我希望能儲存、載入與管理已建立的 ScriptableObject 模板與批次設定規則，以便在不同關卡或專案中重複使用。

#### 驗收條件

1. THE Template_Registry SHALL 將所有 ScriptableObject 模板定義儲存為 JSON 檔案，存放於 `Assets/KiroUnityPower/Config/LevelDesign/Templates/` 目錄下
2. THE Template_Registry SHALL 將所有批次設定規則儲存為 JSON 檔案，存放於 `Assets/KiroUnityPower/Config/LevelDesign/BatchRules/` 目錄下
3. WHEN 使用者要求列出可用模板，THE Template_Registry SHALL 回傳所有已儲存模板的名稱、描述與欄位摘要清單
4. WHEN 使用者要求載入指定模板，THE Template_Registry SHALL 讀取對應的 JSON 檔案並還原為完整的模板定義
5. THE Template_Registry SHALL 為每個模板與規則記錄建立時間、最後修改時間與版本號
6. IF 使用者嘗試儲存與現有模板同名的模板，THEN THE Template_Registry SHALL 提示使用者選擇覆蓋或重新命名
7. FOR ALL 有效的模板定義，序列化為 JSON 後再反序列化 SHALL 產生與原始定義等價的物件（往返一致性）

### 需求 5：與現有 Kiro Unity Power 工作流整合

**使用者故事：** 身為開發者，我希望關卡設計工具鏈能與現有的 Kiro Unity Power 工作流無縫整合，以便在統一的操作體驗中使用所有功能。

#### 驗收條件

1. THE Level_Design_Tooling SHALL 透過 MCP 協議與 Unity Editor 通訊，使用現有的 `manage_script`、`create_script`、`manage_gameobject`、`manage_components`、`find_gameobjects` 等 MCP 工具執行操作
2. THE Level_Design_Tooling SHALL 遵循現有的範本載入優先順序：自定義範本（Unity 專案目錄）優先於內建範本（Power 套件目錄）
3. WHEN 生成 Editor 擴展腳本或 ScriptableObject 腳本後，THE Level_Design_Tooling SHALL 呼叫 `manage_editor(action: "refresh")` 觸發 Unity Editor 重新編譯
4. THE Level_Design_Tooling SHALL 在 `steering/` 目錄下提供 `level-design-tooling.md` 領域知識文件，當使用者發出關卡設計相關請求時自動載入
5. IF MCP 連線中斷，THEN THE Level_Design_Tooling SHALL 顯示連線錯誤訊息並引導使用者確認 Unity Editor 與 MCP Server 狀態
6. WHEN 批次操作執行過程中 Unity Editor 正在編譯，THE Level_Design_Tooling SHALL 等待編譯完成後再繼續執行，避免操作失敗
