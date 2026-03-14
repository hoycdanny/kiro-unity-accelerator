# 實作計畫：關卡設計工具鏈 (Level Design Tooling)

## 概述

將關卡設計工具鏈功能實作為四個核心模組，依序建立型別定義、各模組實作、模板註冊表，最後整合 MCP 工作流與 steering 文件。每個模組實作後緊接對應的屬性測試與單元測試，確保增量驗證。

## 任務

- [x] 1. 建立核心型別定義與專案結構
  - [x] 1.1 在 `kiro-unity-power/src/types.ts` 中新增關卡設計工具鏈所需的所有介面與型別定義
    - 新增 `SerializedFieldInfo`、`InspectorGenInput`、`BatchToolGenInput`、`BatchOperation`、`ScriptGenResult` 介面
    - 新增 `FieldDefinition`、`FieldValidation`、`SOTemplateDefinition`、`SOGenResult` 介面
    - 新增 `FilterCondition`、`BatchRule`、`BatchAction`、`PreviewItem`、`ChangeDescription`、`BatchConfigResult`、`SkipReason` 介面
    - 新增 `TemplateListItem` 介面
    - _需求: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 2.5, 2.7, 3.1, 3.4, 3.5, 3.7, 4.3, 4.5_

- [x] 2. 實作 Editor Extension Generator 模組
  - [x] 2.1 建立 `kiro-unity-power/src/editor-extension-gen.ts`，實作 `generateInspectorScript` 函式
    - 根據 `InspectorGenInput` 生成包含 `using UnityEditor;`、`[CustomEditor]`、`OnInspectorGUI`、`Undo.RecordObject` 的 C# 腳本
    - 腳本檔案命名為 `{TargetClassName}Inspector.cs`，路徑為 `Assets/Editor/`
    - _需求: 1.1, 1.3, 1.5, 1.8_

  - [x] 2.2 實作 `generateBatchToolScript` 函式
    - 根據 `BatchToolGenInput` 生成繼承 `EditorWindow` 的 C# 腳本，包含 `[MenuItem]`、`OnGUI`、`EditorUtility.DisplayProgressBar`
    - 腳本檔案命名為 `{ToolName}Window.cs`，路徑為 `Assets/Editor/`
    - _需求: 1.2, 1.3, 1.7, 1.8_

  - [x] 2.3 實作 `mapFieldToGuiControl` 函式
    - 將 `SerializedFieldInfo` 映射為對應的 `EditorGUILayout` 控制項呼叫字串（IntField、FloatField、ObjectField、EnumPopup 等）
    - 處理列表型別欄位的 GUI 控制項生成
    - _需求: 1.4_

  - [ ]* 2.4 撰寫 Property 1 屬性測試：Inspector 腳本結構完整性
    - **Property 1: Inspector 腳本結構完整性**
    - 測試檔案：`kiro-unity-power/tests/property/editor-extension-gen.test.ts`
    - 驗證任意有效 `InspectorGenInput` 生成的腳本包含 `using UnityEditor;`、`[CustomEditor]`、`OnInspectorGUI`、`Undo.RecordObject`
    - **驗證需求: 1.1, 1.3, 1.5**

  - [ ]* 2.5 撰寫 Property 2 屬性測試：批次工具腳本結構完整性
    - **Property 2: 批次工具腳本結構完整性**
    - 測試檔案：`kiro-unity-power/tests/property/editor-extension-gen.test.ts`
    - 驗證任意有效 `BatchToolGenInput` 生成的腳本包含 `EditorWindow` 繼承、`[MenuItem]`、`OnGUI`、`EditorUtility.DisplayProgressBar`
    - **驗證需求: 1.2, 1.3, 1.7**

  - [ ]* 2.6 撰寫 Property 3 屬性測試：序列化欄位與 GUI 控制項對應
    - **Property 3: 序列化欄位與 GUI 控制項對應**
    - 測試檔案：`kiro-unity-power/tests/property/editor-extension-gen.test.ts`
    - 驗證任意欄位列表生成的 Inspector 腳本中 GUI 控制項數量等於欄位數量
    - **驗證需求: 1.4**

  - [ ]* 2.7 撰寫 Property 4 屬性測試：腳本檔案命名慣例
    - **Property 4: 腳本檔案命名慣例**
    - 測試檔案：`kiro-unity-power/tests/property/editor-extension-gen.test.ts`
    - 驗證任意類別名稱或工具名稱生成的檔案名稱遵循 `{Name}Inspector.cs` 或 `{Name}Window.cs` 慣例，路徑以 `Assets/Editor/` 開頭
    - **驗證需求: 1.1, 1.8**

  - [ ]* 2.8 撰寫 Editor Extension Generator 單元測試
    - 測試檔案：`kiro-unity-power/tests/unit/editor-extension-gen.test.ts`
    - 測試已知類別（如 `EnemyConfig`）的 Inspector 腳本生成結果
    - 測試空欄位列表的邊界案例
    - 測試類別不存在時的錯誤處理（需求 1.6）
    - _需求: 1.4, 1.6_

- [x] 3. 檢查點 — 確認 Editor Extension Generator 測試通過
  - 確認所有測試通過，如有問題請詢問使用者。

- [x] 4. 實作 ScriptableObject Template Builder 模組
  - [x] 4.1 建立 `kiro-unity-power/src/scriptableobject-template.ts`，實作 `generateSOScript` 函式
    - 根據 `SOTemplateDefinition` 生成包含 `[CreateAssetMenu]`、每個欄位的 `[Tooltip]`、`OnValidate` 方法的 ScriptableObject C# 腳本
    - 同時生成配套的自定義 Inspector 腳本，`[CustomEditor]` 指向 SO 類別
    - 處理列表型別（`List<T>` + `[SerializeField]`）、驗證屬性（`[Range]`、`[Min]`）、巢狀結構（`[System.Serializable]`）
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 4.2 實作 `generateOnValidateMethod` 函式
    - 根據欄位的驗證規則生成 `OnValidate` 方法內容
    - _需求: 2.8_

  - [x] 4.3 實作 `serializeTemplate` 與 `deserializeTemplate` 函式
    - 將 `SOTemplateDefinition` 序列化為 JSON 字串，以及從 JSON 字串反序列化
    - _需求: 4.7_

  - [ ]* 4.4 撰寫 Property 5 屬性測試：ScriptableObject 腳本結構完整性
    - **Property 5: ScriptableObject 腳本結構完整性**
    - 測試檔案：`kiro-unity-power/tests/property/scriptableobject-template.test.ts`
    - 驗證任意有效 `SOTemplateDefinition` 生成的腳本包含 `[CreateAssetMenu]`、每個欄位的 `[Tooltip]`、`OnValidate` 方法
    - **驗證需求: 2.1, 2.2, 2.4, 2.8**

  - [ ]* 4.5 撰寫 Property 6 屬性測試：欄位型別正確映射
    - **Property 6: 欄位型別正確映射**
    - 測試檔案：`kiro-unity-power/tests/property/scriptableobject-template.test.ts`
    - 驗證列表型別使用 `List<T>` + `[SerializeField]`、驗證規則生成對應屬性、巢狀結構生成 `[System.Serializable]` 類別
    - **驗證需求: 2.3, 2.5, 2.7**

  - [ ]* 4.6 撰寫 Property 7 屬性測試：SO 模板生成配套 Inspector
    - **Property 7: SO 模板生成配套 Inspector**
    - 測試檔案：`kiro-unity-power/tests/property/scriptableobject-template.test.ts`
    - 驗證任意有效 `SOTemplateDefinition` 的 `SOGenResult` 同時包含 `soScript` 與 `inspectorScript`，且 Inspector 的 `[CustomEditor]` 指向 SO 類別
    - **驗證需求: 2.6**

- [x] 5. 檢查點 — 確認 ScriptableObject Template Builder 測試通過
  - 確認所有測試通過，如有問題請詢問使用者。

- [x] 6. 實作 Scene Batch Configurator 模組
  - [x] 6.1 建立 `kiro-unity-power/src/scene-batch-config.ts`，實作 `parseBatchRules` 函式
    - 解析批次設定描述為 `BatchRule` 物件陣列
    - _需求: 3.1, 3.9_

  - [x] 6.2 實作 `matchGameObjects` 函式
    - 根據 `FilterCondition` 組合產生 `find_gameobjects` MCP 呼叫，支援名稱萬用字元、Tag、Layer、組件類型、父物件路徑篩選
    - _需求: 3.4_

  - [x] 6.3 實作 `generatePreview` 函式
    - 根據匹配物件列表與動作列表產生預覽清單，列出每個物件的預計變更內容
    - _需求: 3.5_

  - [x] 6.4 實作 `translateToMcpCalls` 函式
    - 將匹配物件與動作轉譯為 `manage_gameobject`、`manage_components` 等 MCP 呼叫序列
    - 支援 `setLayer`、`setTag`、`setComponentProperty` 三種動作類型
    - 多規則時按規則順序產生呼叫序列
    - _需求: 3.1, 3.2, 3.3, 3.6, 3.9_

  - [x] 6.5 實作 `serializeBatchRule` 與 `deserializeBatchRule` 函式
    - 將 `BatchRule` 序列化為 JSON 字串，以及從 JSON 字串反序列化
    - _需求: 4.1, 4.2_

  - [ ]* 6.6 撰寫 Property 8 屬性測試：批次規則動作正確轉譯為 MCP 呼叫
    - **Property 8: 批次規則動作正確轉譯為 MCP 呼叫**
    - 測試檔案：`kiro-unity-power/tests/property/scene-batch-config.test.ts`
    - 驗證任意動作組合與物件列表產生的 MCP 呼叫序列包含正確的工具名稱與參數
    - **驗證需求: 3.1, 3.2, 3.3**

  - [ ]* 6.7 撰寫 Property 9 屬性測試：篩選條件完整傳遞
    - **Property 9: 篩選條件完整傳遞**
    - 測試檔案：`kiro-unity-power/tests/property/scene-batch-config.test.ts`
    - 驗證任意篩選條件組合產生的 `find_gameobjects` 呼叫包含所有指定的篩選參數
    - **驗證需求: 3.4**

  - [ ]* 6.8 撰寫 Property 10 屬性測試：預覽清單完整性
    - **Property 10: 預覽清單完整性**
    - 測試檔案：`kiro-unity-power/tests/property/scene-batch-config.test.ts`
    - 驗證預覽項目數量等於匹配物件數量，每個項目的變更描述數量等於動作數量
    - **驗證需求: 3.5**

  - [ ]* 6.9 撰寫 Property 11 屬性測試：多規則順序執行
    - **Property 11: 多規則順序執行**
    - 測試檔案：`kiro-unity-power/tests/property/scene-batch-config.test.ts`
    - 驗證多規則產生的 MCP 呼叫序列按規則順序排列
    - **驗證需求: 3.9**

  - [ ]* 6.10 撰寫 Scene Batch Configurator 單元測試
    - 測試檔案：`kiro-unity-power/tests/unit/scene-batch-config.test.ts`
    - 測試不存在的 Layer/Tag 錯誤處理（需求 3.8）
    - 測試空篩選條件與空動作列表的邊界案例
    - 測試變更摘要報告的正確性（需求 3.7）
    - _需求: 3.7, 3.8_

- [x] 7. 檢查點 — 確認 Scene Batch Configurator 測試通過
  - 確認所有測試通過，如有問題請詢問使用者。

- [x] 8. 實作 Template Registry 模組
  - [x] 8.1 建立 `kiro-unity-power/src/template-registry.ts`，實作模板 CRUD 函式
    - 實作 `saveTemplate`、`loadTemplate`、`listTemplates`、`deleteTemplate`
    - 複用 `config-crud.ts` 的 `loadConfig`、`saveConfig`、`deleteConfig`
    - 模板儲存路徑：`Assets/KiroUnityPower/Config/LevelDesign/Templates/`
    - 每個模板記錄 `createdAt`、`updatedAt`、`version`
    - _需求: 4.1, 4.3, 4.4, 4.5_

  - [x] 8.2 實作批次規則 CRUD 函式
    - 實作 `saveBatchRule`、`loadBatchRule`、`listBatchRules`、`deleteBatchRule`
    - 批次規則儲存路徑：`Assets/KiroUnityPower/Config/LevelDesign/BatchRules/`
    - _需求: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.3 實作 `checkNameConflict` 函式
    - 檢查模板或規則名稱是否已存在，支援提示覆蓋或重新命名
    - _需求: 4.6_

  - [ ]* 8.4 撰寫 Property 12 屬性測試：模板定義 JSON 往返一致性
    - **Property 12: 模板定義 JSON 往返一致性**
    - 測試檔案：`kiro-unity-power/tests/property/template-registry.test.ts`
    - 驗證任意有效 `SOTemplateDefinition` 經 `serializeTemplate` → `deserializeTemplate` 後與原始定義等價
    - **驗證需求: 4.7**

  - [ ]* 8.5 撰寫 Property 13 屬性測試：批次規則 JSON 往返一致性
    - **Property 13: 批次規則 JSON 往返一致性**
    - 測試檔案：`kiro-unity-power/tests/property/template-registry.test.ts`
    - 驗證任意有效 `BatchRule` 經 `serializeBatchRule` → `deserializeBatchRule` 後與原始規則等價
    - **驗證需求: 4.1, 4.2, 4.4**

  - [ ]* 8.6 撰寫 Property 14 屬性測試：模板列表完整性與元資料正確性
    - **Property 14: 模板列表完整性與元資料正確性**
    - 測試檔案：`kiro-unity-power/tests/property/template-registry.test.ts`
    - 驗證 `listTemplates` 回傳列表長度等於已儲存模板數量，每個項目包含正確的元資料
    - **驗證需求: 4.3, 4.5**

  - [ ]* 8.7 撰寫 Property 15 屬性測試：範本載入優先順序
    - **Property 15: 範本載入優先順序**
    - 測試檔案：`kiro-unity-power/tests/property/template-registry.test.ts`
    - 驗證同名模板存在於自定義與內建目錄時，載入操作回傳自定義目錄版本
    - **驗證需求: 5.2**

  - [ ]* 8.8 撰寫 Template Registry 單元測試
    - 測試檔案：`kiro-unity-power/tests/unit/template-registry.test.ts`
    - 測試名稱衝突檢測（需求 4.6）
    - 測試 JSON 解析失敗的錯誤處理
    - 測試空目錄時 `listTemplates` 回傳空陣列
    - _需求: 4.6_

- [x] 9. 檢查點 — 確認 Template Registry 測試通過
  - 確認所有測試通過，如有問題請詢問使用者。

- [-] 10. 實作 MCP 整合與工作流串接
  - [x] 10.1 在各模組中整合 MCP 工具呼叫邏輯
    - `editor-extension-gen.ts`：整合 `manage_script(action: "get_info")` 查詢類別資訊、`create_script` 寫入腳本、`manage_editor(action: "refresh")` 觸發編譯
    - `scene-batch-config.ts`：整合 `find_gameobjects` 篩選物件、`batch_execute` 批次執行設定操作
    - 加入 MCP 連線中斷錯誤處理與 Unity 編譯中等待邏輯
    - _需求: 5.1, 5.3, 5.5, 5.6_

  - [ ]* 10.2 撰寫 Property 16 屬性測試：腳本生成後觸發 Editor 刷新
    - **Property 16: 腳本生成後觸發 Editor 刷新**
    - 測試檔案：`kiro-unity-power/tests/property/mcp-integration.test.ts`
    - 驗證任意腳本生成操作的 MCP 呼叫序列最後包含 `manage_editor(action: "refresh")`
    - **驗證需求: 5.3**

- [x] 11. 建立 Steering 領域知識文件
  - [x] 11.1 建立 `kiro-unity-power/steering/level-design-tooling.md`
    - 撰寫關卡設計工具鏈的領域知識文件，涵蓋功能說明、使用情境、MCP 工具對應關係
    - 遵循現有 steering 文件的格式與風格
    - _需求: 5.4_

- [x] 12. 最終檢查點 — 確認所有測試通過
  - 確認所有測試通過，如有問題請詢問使用者。

## 備註

- 標記 `*` 的任務為可選任務，可跳過以加速 MVP 開發
- 每個任務皆標註對應的需求編號，確保可追溯性
- 檢查點確保增量驗證，及早發現問題
- 屬性測試驗證通用正確性屬性，單元測試驗證特定範例與邊界案例
- 所有模組複用現有 `config-crud.ts` 與 MCP 工具，不引入額外依賴
