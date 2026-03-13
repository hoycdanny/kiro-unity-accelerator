# Kiro Unity Power

讓 Kiro 成為你的 Unity 開發智慧大腦。透過自然語言下達指令，Kiro 經由 MCP（Model Context Protocol）遠端操控 Unity Editor，涵蓋資產管理、場景建置、建置自動化、效能分析、程式碼品質檢查等十大核心功能。

## 快速開始

### 前置需求

- [Unity Editor](https://unity.com/) 已安裝並開啟專案
- [Kiro IDE](https://kiro.dev/) 已安裝
- Node.js 18+（僅開發/測試時需要）

### 三步安裝

1. **Unity 端 — 安裝 unity-mcp UPM 套件**

   Unity Editor → Window → Package Manager → Add package from git URL：
   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   ```

2. **Kiro 端 — 安裝本 Power**

   Kiro → Powers 面板 → 安裝「Kiro Unity Power」

3. **啟動 MCP Server**

   Unity Editor → Window → MCP for Unity → Start Server

   Server 預設監聽 `localhost:8080/mcp`，無需額外設定。

### 驗證連線

在 Kiro 中輸入任意 Unity 相關指令（例如「列出目前場景的物件」），若 Kiro 能正確回應，代表連線成功。

## 功能總覽

| 功能 | 說明 | 對應 Steering |
|------|------|---------------|
| 資產設定自動化 | 批次套用 Asset Preset、自動偵測資產類型、變更摘要 | `asset-automation.md` |
| 場景建置加速 | 從 Scene Scaffold 一鍵生成場景結構 | `scene-scaffolding.md` |
| 建置自動化 | 一鍵本地建置，可選 Cloud Assist 雲端加速 | `build-automation.md` |
| 跨平台測試 | 本地模擬測試 + 可選雲端真實裝置測試 | `cross-platform-testing.md` |
| 工作流自動化 | 定義多步驟工作流，自動依序執行 | `workflow-automation.md` |
| 效能分析 | Draw Calls、GC、Shader 複雜度、幀率分析與建議 | `performance-analysis.md` |
| 程式碼品質 | MVC/ECS/ScriptableObject 架構檢查、循環依賴偵測 | `code-quality.md` |
| 知識管理 | 團隊文件集中管理、API 變更追蹤、過期偵測 | `knowledge-management.md` |
| 平台相容性 | Shader 相容性、記憶體預算、三級嚴重度分類 | `platform-compatibility.md` |
| 資產依賴管理 | 依賴樹、孤立資產偵測、AssetBundle 重複檢查 | `asset-dependencies.md` |

## 使用範例

```
# 批次設定資產
「把 Characters 資料夾的模型都設定成 Humanoid rig」

# 快速建場景
「幫我建一個 3D 第一人稱場景」

# 一鍵建置
「建置 Windows 版本」

# 效能分析
「分析目前場景的效能」

# 架構檢查
「檢查專案的程式碼架構」

# 平台相容性
「檢查 Android 平台的相容性」

# 資產依賴
「分析 hero.fbx 的依賴關係」
```

## 專案結構

```
kiro-unity-power/
├── POWER.md                    # Kiro 讀取的主文件（Power 說明與工具指引）
├── mcp.json                    # MCP Server 連線配置
├── steering/                   # 領域知識 Steering Files（11 個）
├── templates/
│   ├── presets/                # 內建 Asset Preset（5 種）
│   ├── scaffolds/              # 內建 Scene Scaffold（5 種）
│   ├── build-configs/          # 內建建置配置（4 種）
│   ├── platform-profiles/      # 內建平台設定檔（4 種）
│   ├── architecture-rules/     # 內建架構規則（3 種）
│   └── workflows/              # 內建工作流範本（3 種）
├── src/                        # TypeScript 工具模組
├── tests/
│   ├── unit/                   # 單元測試
│   ├── property/               # 屬性測試（fast-check）
│   └── integration/            # 整合測試
├── package.json
├── tsconfig.json
└── jest.config.ts
```

## 內建範本

### Asset Presets（`templates/presets/`）

| 檔案 | 用途 |
|------|------|
| `3d-character.json` | 3D 角色模型（Humanoid rig、材質、法線貼圖） |
| `3d-environment.json` | 3D 環境/道具模型（無 rig、網格壓縮） |
| `2d-sprite.json` | 2D 精靈圖（Sprite 類型、Point 過濾） |
| `ui-texture.json` | UI 貼圖（Bilinear 過濾、無壓縮） |
| `audio-sfx.json` | 音效（SFX 最佳化設定） |

### Scene Scaffolds（`templates/scaffolds/`）

| 檔案 | 用途 |
|------|------|
| `3d-first-person.json` | 3D 第一人稱場景（FPSController、地形、光源、HUD） |
| `2d-platformer.json` | 2D 平台遊戲場景 |
| `ui-menu.json` | UI 選單場景 |
| `open-world-base.json` | 開放世界基礎場景 |
| `multiplayer-lobby.json` | 多人遊戲大廳場景 |

### 自訂範本

在 Unity 專案中建立對應目錄即可覆蓋內建範本：

| 類型 | 自訂路徑 |
|------|----------|
| Asset Preset | `Assets/KiroUnityPower/Config/Presets/` |
| Scene Scaffold | `Assets/KiroUnityPower/Config/Scaffolds/` |
| 建置配置 | `Assets/KiroUnityPower/Config/Builds/` |
| 工作流範本 | `Assets/KiroUnityPower/Config/Workflows/` |
| 架構規則 | `Assets/KiroUnityPower/Config/Rules/` |
| 平台設定檔 | `Assets/KiroUnityPower/Config/Platforms/` |

自訂範本優先於內建範本載入。

## 開發

```bash
# 安裝依賴
cd kiro-unity-power
npm install

# 執行所有測試
npm test

# 僅執行屬性測試
npm run test:property

# 僅執行單元測試
npm run test:unit

# 僅執行整合測試
npm run test:integration
```

## MCP 連線配置

預設使用 HTTP 模式（`mcp.json`）：

```json
{
  "mcpServers": {
    "unity-mcp": {
      "url": "http://localhost:8080/mcp",
      "transport": "http"
    }
  }
}
```

若 HTTP 不可用（埠號衝突等），可切換為 stdio 模式：

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["unity-mcp"],
      "transport": "stdio"
    }
  }
}
```

## 疑難排解

| 問題 | 解法 |
|------|------|
| Kiro 無法連線 Unity | 確認 Unity Editor 已開啟 → Window → MCP for Unity → Start Server |
| 埠號 8080 被佔用 | 關閉佔用程式，或改用 stdio 模式 |
| 資產操作無回應 | Unity 可能正在編譯，等待編譯完成後重試 |
| Cloud Assist 失敗 | 自動降級為本地模式，核心功能不受影響 |

## 授權

Private — 僅供 Kiro Power 套件使用。
