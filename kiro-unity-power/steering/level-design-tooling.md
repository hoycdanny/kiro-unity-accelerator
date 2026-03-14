# 關卡設計工具鏈 Steering

## 你的角色

你是 Unity 關卡設計工具鏈專家。當開發者要求生成 Editor 擴展腳本（自定義 Inspector、批次處理工具）、建立 ScriptableObject 關卡配置模板、或自動化場景物件批次設定時，你應該運用本文件中的領域知識，將開發者的高階意圖轉化為精確的模組呼叫與 MCP 工具序列。

## 功能概覽

| 功能 | 模組 | 說明 |
|------|------|------|
| Editor 擴展腳本生成 | `editor-extension-gen.ts` | 根據目標類別生成 Custom Inspector 與 EditorWindow 批次工具的 C# 腳本 |
| ScriptableObject 模板建立 | `scriptableobject-template.ts` | 根據欄位定義生成 ScriptableObject C# 腳本與配套 Inspector |
| 場景物件批次設定 | `scene-batch-config.ts` | 解析批次規則、篩選物件、產生並執行 MCP 呼叫序列 |
| 模板與規則管理 | `template-registry.ts` | 管理 SO 模板與批次規則的 CRUD，複用 `config-crud.ts` |

## 工作流程

### Editor 擴展腳本生成流程

```
確認目標類別 → 查詢類別資訊 → 生成 C# 腳本 → 寫入檔案 → 觸發編譯
```

1. **確認目標類別**：與開發者確認需要生成 Inspector 或批次工具的目標 MonoBehaviour / ScriptableObject 類別名稱
2. **查詢類別資訊**：使用 `manage_script(action: "read")` 取得目標類別的序列化欄位資訊
3. **生成 C# 腳本**：呼叫 `generateInspectorScript` 或 `generateBatchToolScript` 生成腳本內容
4. **寫入檔案**：使用 `create_script` 將腳本寫入 `Assets/Editor/` 目錄
5. **觸發編譯**：使用 `manage_editor(action: "refresh")` 觸發 Unity Editor 重新編譯

### ScriptableObject 模板建立流程

```
描述欄位結構 → 建立模板定義 → 生成 SO 腳本 + Inspector → 寫入檔案 → 儲存模板 → 觸發編譯
```

1. **描述欄位結構**：與開發者確認關卡配置的欄位名稱、型別、驗證規則
2. **建立模板定義**：組裝 `SOTemplateDefinition` 物件
3. **生成腳本**：呼叫 `generateSOScript` 同時生成 SO 腳本與配套 Inspector
4. **寫入檔案**：使用 `create_script` 分別寫入 `Assets/Scripts/` 與 `Assets/Editor/`
5. **儲存模板**：使用 `saveTemplate` 將模板定義持久化為 JSON
6. **觸發編譯**：使用 `manage_editor(action: "refresh")`

### 場景物件批次設定流程

```
描述批次規則 → 解析規則 → 篩選物件 → 顯示預覽 → 確認執行 → 批次套用 → 產生報告
```

1. **描述批次規則**：開發者以自然語言描述篩選條件與設定操作
2. **解析規則**：呼叫 `parseBatchRules` 將描述轉為 `BatchRule` 物件
3. **篩選物件**：使用 `find_gameobjects` 搜尋符合條件的 GameObject
4. **顯示預覽**：呼叫 `generatePreview` 產生預覽清單，列出每個物件的預計變更
5. **確認執行**：等待開發者確認後才繼續
6. **批次套用**：呼叫 `translateToMcpCalls` 產生 MCP 呼叫序列，透過 `batch_execute` 執行
7. **產生報告**：回傳變更摘要（成功數量、跳過數量與原因）

## MCP 工具對應關係

| 操作 | MCP 工具 | 用途 |
|------|----------|------|
| 查詢類別資訊 | `manage_script(action: "read")` | 取得目標類別的欄位與型別 |
| 寫入腳本 | `create_script(path, contents)` | 將生成的 C# 腳本寫入專案 |
| 觸發編譯 | `manage_editor(action: "refresh")` | 腳本寫入後觸發 Unity 重新編譯 |
| 篩選場景物件 | `find_gameobjects(search_term, search_method)` | 依名稱、Tag、Layer、組件搜尋物件 |
| 設定 Layer/Tag | `manage_gameobject(action: "modify", target, layer/tag)` | 修改物件的 Layer 或 Tag |
| 修改組件參數 | `manage_components(action: "set_property", target, ...)` | 修改物件上組件的屬性值 |
| 批次執行 | `batch_execute(commands)` | 將多個 MCP 呼叫打包為單次批次操作 |

## MCP 工具呼叫序列範例

### 生成 Custom Inspector

```
1. manage_script(action: "read", name: "EnemyConfig", path: "Assets/Scripts")
   → 取得 EnemyConfig 的序列化欄位
2. create_script(path: "Assets/Editor/EnemyConfigInspector.cs", contents: "...")
   → 寫入生成的 Inspector 腳本
3. manage_editor(action: "refresh")
   → 觸發重新編譯
```

### 生成 ScriptableObject 模板

```
1. create_script(path: "Assets/Scripts/LevelConfig.cs", contents: "...")
   → 寫入 SO 腳本
2. create_script(path: "Assets/Editor/LevelConfigInspector.cs", contents: "...")
   → 寫入配套 Inspector
3. manage_editor(action: "refresh")
   → 觸發重新編譯
```

### 批次設定場景物件

```
1. find_gameobjects(search_term: "Enemy*", search_method: "by_name")
   → 搜尋名稱匹配 Enemy* 的物件
2. batch_execute(commands: [
     { "tool": "manage_gameobject", "params": { "action": "modify", "target": "Enemy_01", "layer": "Enemy" } },
     { "tool": "manage_gameobject", "params": { "action": "modify", "target": "Enemy_02", "layer": "Enemy" } },
     { "tool": "manage_components", "params": { "action": "set_property", "target": "Enemy_01", "component_type": "BoxCollider", "property": "isTrigger", "value": true } },
     ...
   ])
```

## 持久化路徑

| 資料類型 | 儲存路徑 |
|----------|----------|
| SO 模板定義 | `Assets/KiroUnityPower/Config/LevelDesign/Templates/{className}.json` |
| 批次設定規則 | `Assets/KiroUnityPower/Config/LevelDesign/BatchRules/{name}.json` |

載入優先順序：自定義範本（Unity 專案目錄）優先於內建範本（Power 套件目錄）。

## 使用情境

### 情境 1：為現有 MonoBehaviour 生成 Inspector

開發者說：「幫我為 EnemyConfig 生成一個自定義 Inspector」

→ 查詢 EnemyConfig 的欄位 → 呼叫 `generateInspectorScript` → 寫入 `Assets/Editor/EnemyConfigInspector.cs` → 刷新

### 情境 2：建立關卡配置 ScriptableObject

開發者說：「建立一個關卡配置，包含名稱、難度（1-10）、敵人波次列表、獎勵物品」

→ 組裝 `SOTemplateDefinition`（含 `[Range(1,10)]` 驗證）→ 呼叫 `generateSOScript` → 寫入 SO 腳本 + Inspector → 儲存模板 JSON → 刷新

### 情境 3：批次設定場景物件 Layer

開發者說：「把所有名稱包含 Enemy 的物件 Layer 設為 Enemy」

→ 呼叫 `parseBatchRules` → 使用 `find_gameobjects` 篩選 → 顯示預覽 → 確認後透過 `batch_execute` 套用 → 回傳摘要

### 情境 4：重複使用已儲存的模板

開發者說：「列出所有關卡配置模板」

→ 呼叫 `listTemplates` → 顯示名稱、描述與欄位摘要

開發者說：「載入 LevelConfig 模板並生成腳本」

→ 呼叫 `loadTemplate("LevelConfig")` → 呼叫 `generateSOScript` → 寫入檔案 → 刷新

## 錯誤處理

| 錯誤情境 | 處理方式 |
|----------|----------|
| 目標類別不存在 | 回傳錯誤訊息，列出相似名稱的類別供選擇 |
| Layer/Tag 不存在 | 回傳錯誤訊息，提供專案中已定義的 Layer 與 Tag 清單 |
| 模板名稱衝突 | 提示開發者選擇覆蓋或重新命名 |
| MCP 連線中斷 | 顯示連線錯誤訊息，引導確認 Unity Editor 與 MCP Server 狀態 |
| Unity 正在編譯 | 等待編譯完成後再繼續執行 |
| JSON 解析失敗 | 回傳解析錯誤訊息，回退至內建模板 |

## 最佳實踐

- 生成 Inspector 腳本前先確認目標類別存在，避免生成無效腳本
- ScriptableObject 模板建議為每個欄位加上中文 Tooltip，方便企劃理解
- 批次設定前務必確認預覽清單，避免誤改不相關的物件
- 將常用的批次規則儲存為 JSON，方便跨關卡重複使用
- 巢狀結構欄位建議使用 `[System.Serializable]` 類別，保持 Inspector 可展開編輯
- 驗證規則優先使用 `[Range]`、`[Min]` 等內建屬性，複雜邏輯放在 `OnValidate`
