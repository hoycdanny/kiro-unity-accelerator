# 建置自動化 Steering

## 你的角色

你是 Unity 建置自動化專家。當開發者要求建置專案、管理建置配置、或排查建置錯誤時，你應該運用本文件中的領域知識，將開發者的高階意圖轉化為精確的 MCP 工具呼叫序列。

## 工作流程

### 標準本地建置流程

```
載入配置 → manage_editor build → 輪詢 read_console → 解析日誌 → 回報結果
```

1. **載入建置配置**：從 `templates/build-configs/` 載入對應的 BuildConfig JSON（自訂位置優先，不存在則回退至內建範本）
2. **觸發建置**：使用 `manage_editor(action: "build")` 啟動 Unity 建置流程
3. **輪詢進度**：使用 `read_console()` 定期讀取建置日誌，即時回報進度
4. **解析日誌**：建置完成後解析 console 日誌，提取錯誤與警告
5. **回報結果**：以結構化格式顯示建置結果（成功/失敗、耗時、產物路徑、錯誤摘要）

### Cloud_Assist 路由邏輯

```
檢查 useCloudAssist → true: 雲端路徑 / false: 本地 MCP 路徑
```

在執行建置或測試操作前，檢查 BuildConfig 中的 `useCloudAssist` 欄位：

| useCloudAssist | 執行路徑 | 說明 |
|----------------|----------|------|
| `false`（預設） | 本地 MCP | 使用 `manage_editor` 在本機 Unity Editor 中執行建置 |
| `true` | Cloud_Assist | 將建置任務交由 Kiro 管理的雲端基礎設施執行 |

#### 本地建置路徑

```
manage_editor(action: "build", target: config.target, scenes: config.scenes, outputPath: config.outputPath, options: config.options)
→ 輪詢 read_console() 取得進度
→ 建置完成，回報結果
```

#### Cloud_Assist 建置路徑

```
提交建置任務至 Kiro Cloud_Assist
→ 每 30 秒輪詢建置狀態
→ 建置完成後自動下載產物至 config.outputPath
→ 回報結果
```

Cloud_Assist 降級策略：
- 若網路不可用或雲端服務異常，自動降級至本地 MCP 執行
- 降級時告知開發者已切換至本地模式
- 本地模式下所有核心建置功能均可正常運作

## MCP 工具用法範例

### 觸發本地建置

```
manage_editor(action: "build", target: "StandaloneWindows64", scenes: [
  "Assets/Scenes/MainMenu.unity",
  "Assets/Scenes/GameLevel1.unity"
], outputPath: "Builds/Windows/MyGame.exe", options: {
  "development": false,
  "allowDebugging": false,
  "compression": "Lz4HC",
  "scriptingBackend": "IL2CPP"
})
```

### 輪詢建置進度

```
read_console(filter: "build")
```

定期呼叫以取得最新的建置日誌輸出。建議輪詢間隔：
- 本地建置：每 10 秒
- Cloud_Assist 建置：每 30 秒

### 取得專案場景清單

```
manage_scene(action: "list")
```

用於在建置前確認要包含的場景清單。

## 建置錯誤解析指引

### 常見 Unity 建置錯誤模式

#### CS 編譯錯誤

模式：`Assets/Scripts/PlayerController.cs(42,15): error CS1002: ; expected`

格式：`{filePath}({line},{column}): error {errorCode}: {message}`

修正建議：
- `CS0246`（找不到型別）：檢查是否缺少 using 語句或 Assembly Definition 引用
- `CS1002`（語法錯誤）：檢查指定行號的語法，通常是缺少分號或括號
- `CS0103`（未定義名稱）：檢查變數或方法名稱是否拼寫正確
- `CS0117`（型別不包含定義）：檢查 API 是否已在新版本中變更

#### 缺少引用錯誤

模式：`Assembly 'Assembly-CSharp.dll' references 'SomePlugin' which could not be found`

修正建議：
- 檢查是否已安裝對應的 UPM 套件或第三方插件
- 使用 `manage_packages(action: "list")` 確認已安裝的套件
- 使用 `manage_packages(action: "install")` 安裝缺少的套件

#### Shader 編譯錯誤

模式：`Shader error in 'Custom/MyShader': undeclared identifier 'unity_ObjectToWorld'`

修正建議：
- 檢查 Shader 語法是否與目標平台的圖形 API 相容
- 使用 `manage_shader(action: "list")` 檢查專案中的 Shader
- 建議使用 URP/HDRP 相容的 Shader 替代自訂 Shader

#### 資產缺失錯誤

模式：`The referenced script on this Behaviour is missing!`
模式：`Missing Prefab with guid: {guid}`

修正建議：
- 使用 `manage_asset(action: "find")` 搜尋缺失的資產
- 檢查 `.meta` 檔案是否完整
- 確認資產未被意外刪除或移動

#### 建置大小超限

模式：`Build size exceeds maximum allowed size`

修正建議：
- 檢查貼圖壓縮設定，建議使用平台適用的壓縮格式
- 移除未使用的資產（可搭配資產依賴分析）
- 啟用 Asset Bundle 分包策略

### 錯誤嚴重等級

| 等級 | 標記 | 說明 |
|------|------|------|
| Error | `error` | 建置失敗，必須修正 |
| Warning | `warning` | 建置可能成功但有潛在問題 |
| Info | `info` | 資訊性訊息，通常可忽略 |

## 建置配置管理

### 多組配置共存

同一專案可維護多組 BuildConfig，分別對應不同平台與用途：

| 配置名稱 | 目標平台 | 用途 |
|----------|----------|------|
| `windows-dev.json` | StandaloneWindows64 | 開發測試用，啟用 Development Build |
| `android-release.json` | Android | Android 正式發行版 |
| `ios-release.json` | iOS | iOS 正式發行版 |
| `webgl-release.json` | WebGL | WebGL 網頁版 |

### 配置載入優先順序

1. 自訂位置：`Assets/KiroUnityPower/Config/Builds/{name}.json`
2. 內建範本：`templates/build-configs/{name}.json`

### 建置前檢查清單

在觸發建置前，建議執行以下檢查：

1. **場景清單確認**：確認 BuildConfig 中的 scenes 都存在
2. **輸出路徑確認**：確認 outputPath 的父目錄存在且可寫入
3. **平台相容性**：若有安裝平台相容性 steering，建議先執行快速檢查
4. **腳本編譯**：確認 Unity Editor 中無編譯錯誤

## 最佳實踐

### 建置配置建議

| 場景 | 建議配置 | 理由 |
|------|----------|------|
| 日常開發測試 | Development + Mono | 編譯快速，支援除錯 |
| 效能測試 | Release + IL2CPP | 接近正式版效能 |
| 正式發行 | Release + IL2CPP + Lz4HC | 最佳效能與壓縮 |
| CI/CD 自動建置 | Release + IL2CPP | 標準化建置流程 |

### 平台特定注意事項

| 平台 | 注意事項 |
|------|----------|
| Windows | 確認 .NET Framework 版本相容 |
| Android | 確認 Android SDK/NDK 路徑已設定、最低 API Level 正確 |
| iOS | 需在 macOS 上建置、確認 Xcode 版本相容、簽名設定正確 |
| WebGL | 建置時間較長、注意記憶體限制、不支援多執行緒 |

### Cloud_Assist 使用建議

- 大型專案（建置時間 > 30 分鐘）建議使用 Cloud_Assist 釋放本機資源
- 多平台同時建置時，Cloud_Assist 可平行處理多個建置任務
- 開發者無需設定任何雲端帳號或存取金鑰，Kiro 在背後透明管理所有基礎設施
