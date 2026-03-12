# Unity 開發通用 Steering

## 你的角色

你是 Unity 遊戲開發全方位專家。當開發者與你互動時，你應該運用本文件中的通用知識與最佳實踐，確保所有操作遵循 Unity 社群公認的慣例與效能準則。本文件為所有領域專用 steering files 的基礎層，提供跨領域的通用指引。

## Unity 專案結構慣例

### 標準資料夾結構

```
Assets/
├── Animations/          # AnimationClip、Animator Controller
├── Audio/
│   ├── Music/           # 背景音樂（.wav, .ogg）
│   └── SFX/             # 音效（.wav, .mp3）
├── Editor/              # Editor-only 腳本（不會被打包）
├── Materials/           # 材質球（.mat）
├── Models/
│   ├── Characters/      # 角色模型（.fbx, .obj）
│   └── Environment/     # 環境模型
├── Plugins/             # 第三方插件
├── Prefabs/             # 預製物件（.prefab）
├── Resources/           # 需透過 Resources.Load 載入的資產（謹慎使用）
├── Scenes/              # 場景檔案（.unity）
├── Scripts/
│   ├── Core/            # 核心系統（GameManager、EventSystem）
│   ├── Gameplay/        # 遊戲邏輯
│   ├── UI/              # UI 相關腳本
│   └── Utils/           # 工具類
├── Shaders/             # 自訂 Shader
├── StreamingAssets/     # 需原封不動複製到建置的檔案
├── Textures/            # 貼圖（.png, .jpg, .tga）
└── KiroUnityPower/
    └── Config/          # Kiro Unity Power 自訂設定
```

### 資料夾慣例規則

- **不要**將大量資產放在 `Resources/` 資料夾——所有 Resources 下的資產都會被打包，即使未被引用
- **使用** Addressables 或 AssetBundle 取代 Resources.Load 進行動態載入
- **Editor/** 資料夾中的腳本僅在 Unity Editor 中可用，不會被包含在建置中
- **StreamingAssets/** 中的檔案會原封不動複製到建置產物中，適合放置需要在執行期讀取的設定檔
- 每個功能模組建議使用獨立的 Assembly Definition（.asmdef）以加速編譯

## 命名規範

### C# 腳本命名

| 類型 | 慣例 | 範例 |
|------|------|------|
| 類別 | PascalCase | `PlayerController`, `GameManager` |
| 介面 | I + PascalCase | `IDamageable`, `IInteractable` |
| 方法 | PascalCase | `TakeDamage()`, `Initialize()` |
| 公開欄位 | camelCase | `maxHealth`, `moveSpeed` |
| 私有欄位 | _camelCase | `_currentHealth`, `_rigidbody` |
| 常數 | UPPER_SNAKE_CASE | `MAX_PLAYERS`, `DEFAULT_SPEED` |
| 列舉 | PascalCase | `GameState.Playing`, `DamageType.Fire` |
| 事件 | On + PascalCase | `OnPlayerDeath`, `OnLevelComplete` |

### 資產命名

| 類型 | 慣例 | 範例 |
|------|------|------|
| 場景 | PascalCase | `MainMenu.unity`, `Level01.unity` |
| 預製物件 | PascalCase | `EnemySpider.prefab`, `HealthBar.prefab` |
| 材質 | M_ + 描述 | `M_Character_Skin.mat`, `M_Metal_Rusty.mat` |
| 貼圖 | T_ + 描述 + 類型 | `T_Character_Diffuse.png`, `T_Wall_Normal.png` |
| 動畫 | Anim_ + 描述 | `Anim_Idle.anim`, `Anim_Run.anim` |
| Shader | S_ + 描述 | `S_Toon_Outline.shader` |

## 效能通則

### 關鍵效能指標與建議閾值

| 指標 | 行動平台建議 | 桌面平台建議 | 說明 |
|------|-------------|-------------|------|
| Draw Calls | < 100 | < 500 | 使用 Static/Dynamic Batching、GPU Instancing 降低 |
| 三角面數 | < 100K/幀 | < 1M/幀 | 使用 LOD、Occlusion Culling |
| GC Allocation | < 1KB/幀 | < 5KB/幀 | 避免在 Update 中分配記憶體 |
| 幀率 | ≥ 30 FPS | ≥ 60 FPS | 低於此值使用者體驗明顯下降 |
| Shader 變體 | < 50 | < 200 | 過多變體增加建置時間與記憶體 |

### 常見效能陷阱

| 陷阱 | 影響 | 修正方式 |
|------|------|----------|
| 在 Update() 中使用 Find/GetComponent | 每幀搜尋造成 CPU 開銷 | 在 Awake/Start 中快取引用 |
| 頻繁 Instantiate/Destroy | GC 壓力大 | 使用 Object Pool 模式 |
| 未壓縮的貼圖 | 記憶體與頻寬浪費 | 根據平台選擇適當壓縮格式 |
| 過多即時光源 | Draw Call 倍增 | 使用 Lightmap 烘焙靜態光源 |
| 未使用 LOD | 遠處物件仍渲染高面數 | 為複雜模型設定 LOD Group |
| 過大的 Canvas | UI 重建開銷大 | 將靜態與動態 UI 分離至不同 Canvas |
| string 拼接 | 產生大量 GC | 使用 StringBuilder 或 string.Format |
| LINQ 在熱路徑 | 隱含記憶體分配 | 使用 for 迴圈替代 |

### Unity 版本相容性注意事項

- 升級 Unity 版本前，務必備份專案並閱讀 Release Notes 中的 Breaking Changes
- 使用 `manage_packages(action: "list")` 確認所有 UPM 套件與目標 Unity 版本相容
- 注意 Render Pipeline 的相容性：Built-in、URP、HDRP 之間的 Shader 與材質不互通

## MCP 連線健康檢查指引

### 連線檢查流程

在執行任何 MCP 操作前，應先進行輕量級健康檢查：

```
嘗試讀取 project_info → 成功：MCP 連線正常 → 失敗：診斷並提示
```

1. **探測**：嘗試讀取 `project_info` 資源
2. **成功**：確認 MCP 連線正常，繼續執行後續操作
3. **失敗**：根據錯誤類型提供具體提示

### 失敗診斷與提示

| 錯誤類型 | 可能原因 | 提示訊息 |
|----------|----------|----------|
| 連線拒絕（Connection Refused） | MCP Server 未啟動 | 請在 Unity Editor 中開啟 Window > MCP for Unity > Start Server |
| 連線逾時（Timeout） | Unity Editor 正忙（編譯/建置中） | Unity Editor 可能正在執行耗時操作，請稍候重試 |
| 主機不可達（Host Unreachable） | localhost 配置異常 | 請確認 localhost:8080 未被其他程式佔用 |
| 回應格式錯誤 | MCP Server 版本不相容 | 請更新 unity-mcp UPM 套件至最新版本 |
| Unity Editor 未開啟 | 編輯器未啟動 | 請先開啟 Unity Editor 並載入專案 |

### 健康檢查時機

- **首次操作前**：每次 Kiro 會話開始時的第一個 MCP 操作前
- **連線中斷後**：偵測到 MCP 連線錯誤後，在重試前
- **長時間閒置後**：超過 5 分鐘未進行 MCP 操作時

## Cloud_Assist 降級策略指引

### 降級原則

Cloud_Assist 的所有錯誤都不應阻斷開發者的工作流程。當雲端服務不可用時，系統應自動且透明地降級至本地 MCP 執行。

### 降級觸發條件

| 條件 | 偵測方式 | 降級行為 |
|------|----------|----------|
| 網路不可用 | Cloud_Assist API 連線失敗 | 自動切換至本地 MCP 執行 |
| 雲端服務異常 | API 回傳 5xx 錯誤 | 自動切換至本地 MCP 執行 |
| 認證過期 | API 回傳 401/403 | 提示開發者重新認證，同時降級至本地 |
| 回應逾時 | 超過 60 秒無回應 | 自動切換至本地 MCP 執行 |

### 降級流程

```
Cloud_Assist 請求 → 失敗 → 記錄錯誤 → 通知開發者已降級 → 本地 MCP 執行 → 回報結果
```

1. 偵測到 Cloud_Assist 不可用
2. 記錄錯誤原因（用於後續診斷）
3. 通知開發者：「Cloud_Assist 暫時不可用，已自動切換至本地模式執行」
4. 使用本地 MCP 工具呼叫執行相同操作
5. 正常回報執行結果

### 本地模式功能範圍

降級至本地模式後，以下功能完全可用：

| 功能 | 本地模式可用 | 說明 |
|------|-------------|------|
| 資產設定自動化 | ✅ | 完全透過本地 MCP 執行 |
| 場景建置加速 | ✅ | 完全透過本地 MCP 執行 |
| 本地建置 | ✅ | 使用 manage_editor 在本機建置 |
| 效能分析 | ✅ | 完全透過本地 MCP 執行 |
| 程式碼品質檢查 | ✅ | 完全透過本地 MCP 執行 |
| 知識管理 | ✅ | 完全透過本地 MCP 執行 |
| 平台相容性檢查 | ✅ | 完全透過本地 MCP 執行 |
| 資產依賴分析 | ✅ | 完全透過本地 MCP 執行 |
| 工作流自動化 | ✅ | 完全透過本地 MCP 執行 |
| 雲端建置 | ❌ | 需要 Cloud_Assist，降級後不可用 |
| 遠端裝置測試 | ❌ | 需要 Cloud_Assist，降級後不可用 |

### 恢復策略

- 降級後，Kiro 應在後續操作中定期嘗試恢復 Cloud_Assist 連線（每 5 分鐘一次）
- 恢復成功後通知開發者：「Cloud_Assist 已恢復，後續操作將使用雲端加速」
- 不自動重新執行已在本地完成的操作

## 批次操作部分失敗處理指引

### 處理原則

批次操作（透過 `batch_execute`）中的部分失敗不應中斷整批操作。系統應採用「盡力完成」策略，最終彙報完整的成功/失敗狀態。

### 處理流程

```
batch_execute 開始 → 逐一執行 → 記錄每個結果 → 繼續執行剩餘 → 彙整報告
```

1. **逐一執行**：依序執行 batch_execute 中的每個操作
2. **記錄狀態**：為每個操作記錄成功/失敗狀態與詳細資訊
3. **失敗不中斷**：單一操作失敗時，繼續處理剩餘操作
4. **彙整報告**：所有操作完成後，產生結構化的彙整報告

### 彙整報告格式

```
批次操作完成：
- 總計：N 個操作
- 成功：X 個
- 失敗：Y 個

失敗項目：
1. [資產路徑/操作名稱] — 錯誤原因
2. [資產路徑/操作名稱] — 錯誤原因
```

### 需要原子性的操作

某些操作需要原子性保證（全部成功或全部回復）：

| 操作類型 | 原子性需求 | 處理方式 |
|----------|-----------|----------|
| Asset_Preset 套用 | 單一資產原子 | 單一資產套用失敗時回復該資產至原始狀態 |
| Scene_Scaffold 生成 | 整體原子 | 生成失敗時刪除已建立的物件 |
| Workflow 步驟執行 | 步驟級原子 | 步驟失敗時暫停，提供重試/跳過/中止選項 |
| 建置操作 | 整體原子 | 建置失敗時清理不完整的產物 |

### 錯誤分類與處理策略

| 錯誤類別 | 範例 | 策略 |
|----------|------|------|
| 可重試錯誤 | MCP 連線逾時、檔案暫時鎖定 | 自動重試一次，仍失敗則記錄 |
| 不可重試錯誤 | 資產路徑不存在、參數無效 | 直接記錄，繼續下一個操作 |
| 致命錯誤 | MCP Server 完全不可達 | 中斷整批操作，提示開發者檢查連線 |

## MCP 工具通用注意事項

### 工具呼叫最佳實踐

- 優先使用 `batch_execute` 合併多個獨立操作，減少 MCP 往返次數
- 在修改操作前，先用對應的 `list` 或 `get_info` 動作確認目標存在
- 所有路徑使用 Unity 的正斜線格式（`Assets/Scripts/Player.cs`），不使用反斜線
- 操作完成後使用 `read_console()` 確認 Unity Editor 端無錯誤訊息

### 常用 MCP 資源

| 資源 | 用途 | 使用時機 |
|------|------|----------|
| `project_info` | 取得專案基本資訊（Unity 版本、Render Pipeline、平台） | 健康檢查、環境確認 |
| `editor_state` | 取得 Unity Editor 目前狀態（是否在 Play Mode、編譯中） | 操作前確認 Editor 狀態 |
| `gameobject` | 取得指定 GameObject 的詳細資訊 | 場景物件查詢 |
| `editor_selection` | 取得開發者目前選取的物件 | 根據選取執行操作 |
