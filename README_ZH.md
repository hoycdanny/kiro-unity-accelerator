# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

Unity 開發自動化加速器。透過 MCP（Model Context Protocol — 一種讓 AI 助手與開發工具互動的標準化協定，讓你可以用自然語言描述想做的事，而不需要手動操作選單或撰寫樣板腳本）以自然語言指揮 Unity Editor，涵蓋資產管理、場景建構、建置自動化、效能分析、程式碼品質檢查等功能 — 內建 40+ TypeScript 工具模組與 14 個領域知識檔案。

> **支援 Unity 6.x 最新實踐，並以實際專案驗證為準**：Steering 指引涵蓋 Unity 6 各次要版本更新的行為變化，包括 URP 預設的 Render Graph 渲染路徑、GPU Resident Drawer（Forward+/Deferred+ 的 GPU Instancing 繪製呼叫優化）、部分版本新專案預設的「僅重載場景（不重載 Domain）」Play Mode 行為、實驗性的 CoreCLR 腳本後端，以及 Unity 官方宣布逐步淘汰 OculusXR 套件改用 OpenXR 的方向。本 Power 不會單憑記憶中的版本號斷言行為，而是透過 MCP 實際查詢連接專案的 Unity 版本、目前啟用的渲染管線、渲染路徑、Scripting Backend 與已安裝套件後，才套用版本相關建議。

> **術語說明**：本文件使用的主要技術術語（首次出現時也會附帶簡短說明）：
> - **MCP** (Model Context Protocol)：AI 助手與開發工具通訊的標準協定，讓開發者能用自然語言操作 Unity Editor
> - **DAG** (Directed Acyclic Graph)：有向無環圖，用於決定任務依賴順序（例如「先匯入貼圖，才能建立材質」）
> - **MVC** (Model-View-Controller)：將程式碼分為資料(Model)、顯示(View)、邏輯(Controller)的架構模式
> - **ECS** (Entity-Component-System)：Unity DOTS 的資料導向架構模式（相對於傳統物件導向方式，資料導向將資料與邏輯分離，以記憶體連續排列的方式處理大量物件），能高效處理大量物件（如同時管理數千個實體）
> - **ScriptableObject**：Unity 的可序列化資料容器，用於儲存設定與共享資料（不需附加到場景物件上）
> - **AssetBundle**：Unity 資產打包格式，用於分發與動態載入（減少初始安裝大小）

![Kiro Unity Accelerator 截圖](image/README.png)

## 功能特色

- **資產自動化** — 批次套用資產預設、自動偵測資產類型、產生變更摘要
- **場景鷹架** — 一鍵產生場景結構，內建衝突偵測
- **建置自動化** — 本地建置、建置日誌解析、可選雲端加速
- **跨平台測試** — 本地模擬測試、結果格式化、測試套件轉換
- **工作流程自動化** — 多步驟工作流程，支援 DAG 依賴驗證與拓撲排序執行
- **效能分析** — Profiler 截圖分析、程式碼反模式掃描、最佳化建議
- **程式碼品質** — MVC/ECS/ScriptableObject 架構檢查、循環依賴偵測
- **知識管理** — 團隊文件管理、API 變更追蹤、過期偵測
- **平台相容性** — Shader 相容性、記憶體預算檢查、嚴重度分類（含 XR/VR）
- **資產依賴管理** — 依賴樹、孤立資產偵測、AssetBundle 重複檢查
- **關卡設計工具** — Editor 擴充腳本產生、ScriptableObject 模板、批次場景物件設定
- **UI 依賴分析** — 跨檔案 UI 參照追蹤、事件鏈分析、耦合度評估

## 架構

```
Developer (Natural Language)
    → AI Layer (Intent Understanding & Planning)
        → MCP Protocol
            → Unity Editor (Execution Layer)

Unity Accelerator (Intelligence Layer)
├── POWER.md        → Main doc defining tools & workflows
├── steering/       → 14 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 前置需求

- 已安裝 [Unity Editor](https://unity.com/) 並開啟專案
- 已安裝 [Kiro IDE](https://kiro.dev/docs/getting-started/installation)
- Node.js 18+（僅開發/測試需要，基本使用不需要。若尚未安裝，請參閱 [Node.js 官方安裝指南](https://nodejs.org/)。Node.js 是一個 JavaScript 執行環境，此處僅用於執行本專案的測試套件和開發工具）

## 安裝

### 步驟一 — 在 Kiro 中安裝此 Power

Kiro → 左側面板點擊 Powers 圖示 → 點擊「+」按鈕 → 選擇「Add Custom Power」→ 選擇本專案根目錄

![安裝自訂 Power](image/Add-Kiro-Customer-Power.png)

### 步驟二 — 安裝 unity-mcp 並在 Unity 中啟動 MCP Server

1. 開啟 Unity Editor → Window → Package Manager

   ![步驟 1：開啟 Package Manager](image/Enable-Unity-MCP-Server-1.png)

2. 點擊「+」→「Add package from git URL...」→ 貼上以下網址並點擊 Add：

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   ```

   ![步驟 2：從 git URL 新增套件](image/Enable-Unity-MCP-Server-2.png)

3. 安裝完成後，前往 Window → Toggle MCP Window

   ![步驟 3：開啟 MCP 視窗](image/Enable-Unity-MCP-Server-3.png)

4. 確認 MCP Server 狀態顯示綠色（運行中），並確認伺服器正在監聽 MCP 端點（顯示於 Unity MCP 視窗中）

   ![步驟 4：確認 Server 運行中](image/Enable-Unity-MCP-Server-4.png)

### MCP 連線設定

#### 自動設定（建議）

在 MCP for Unity 視窗中，選擇「Kiro」並點擊「Configuration」即可自動設定連線。

#### 手動設定

若自動設定不可用，請編輯 `mcp.json`。

HTTP 模式（預設，僅限本機 — 與 Unity Editor 通訊）：

> **安全說明**：此處刻意使用 HTTP。此端點僅與本機（localhost）上運行的 Unity Editor 通訊，流量不會離開您的電腦，因此不需要 HTTPS。

```json
{
  "mcpServers": {
    "unity-mcp": {
      "url": "<your-mcp-server-url>",
      "transport": "http"
    }
  }
}
```

Stdio 模式（備用）：

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

### 安裝自動導引 Hook（建議）

此 Power 提供 `promptSubmit` hook，會在每次請求前自動提醒 AI 啟動 Power 並載入對應的 Steering File。

```bash
mkdir -p .kiro/hooks
cp hooks/pre-unity-tool.kiro.hook .kiro/hooks/
```

### 驗證連線

在 Kiro 中輸入任何 Unity 相關指令（例如「列出目前場景中的所有物件」）。若 Kiro 正確回應，表示連線成功。

## 使用方式

告訴 Kiro 你想做什麼，用自然語言描述即可。Kiro 會自動選擇並執行適當的 MCP 工具。

### 範例指令

```
「將 Characters 資料夾中所有模型設為 Humanoid rig」
「建立一個 3D 第一人稱場景」
「建置 Windows 版本」
「檢查專案的程式碼架構」
「檢查 Android 平台相容性」
「分析 hero.fbx 的依賴關係」
```

> **註**：以下示範展示常見的 Unity 工作流程模式，使用互動式 3D 場景作為範例。我們選擇此範例是因為它同時展示了多個 Unity 系統的協作（物理、渲染、UI、腳本）。相同的工作流程模式適用於所有專案類型 — 益智遊戲、教育模擬、建築視覺化、訓練應用或任何其他 Unity 應用。例如，建築視覺化專案可將 FPSController 替換為 WalkController 並加入測量 UI，教育模擬可替換為 StudentController 和評估系統，即可套用相同的工作流程。

### 示範：建立遊戲並執行完整品質檢查

#### 階段一：建立遊戲

**步驟 1 — 建立可遊玩的 3D 場景**

```
建立一個 3D 第一人稱場景，包含：
- 地形（起伏的草地）
- 方向光與環境光
- 第一人稱控制器（WASD 移動 + 滑鼠視角）
- 互動物件（箱子和圓柱）
- HUD Canvas 含準心和狀態顯示
將場景命名為 Level01 並儲存
```

**步驟 2 — 新增互動遊戲機制**

```
新增核心互動玩法：
1. 互動系統：左鍵互動、Raycast 命中偵測、物件被觸發時閃爍視覺回饋
2. 3 個目標物件（彩色膠囊）在場景中緩慢移動
3. 物件被互動 3 次後停用並播放粒子特效
4. 計分系統：左上角顯示分數，每次成功互動 +100
5. 所有目標被清除時顯示「YOU WIN」
```

**步驟 3 — 建立關卡設定系統**

```
建立名為 LevelConfig 的 ScriptableObject，包含：關卡名稱（string）、難度（int, 1-10）、
時間限制（float）、敵人波次列表（巢狀：敵人類型 string + 數量 int + 生成延遲 float），
並產生自訂 Inspector
```

#### 階段二：品質檢查與最佳化

**步驟 4 — 程式碼品質檢查**

```
檢查所有 C# 程式碼是否符合 MVC 架構規則，掃描命名慣例、
層級依賴與循環參照，列出所有違規並提供修正建議
```

**步驟 5 — 效能掃描**

```
掃描所有 C# 腳本的效能反模式，分析目前場景的 Draw Calls
與記憶體使用量，產生依嚴重度排序的完整效能報告
```

**步驟 6 — 跨平台檢查**

```
檢查所有 Shader 在 Android 和 iOS 的平台相容性，驗證記憶體預算，
將問題分類為 Error/Warning/Suggestion，為不相容的 Shader 提供替代方案
```

**步驟 7 — 建置並檢查結果**

```
以 Android release 設定建置專案，解析建置日誌中的錯誤，
列出每個錯誤的類型、檔案位置與修正建議
```

## 開發

```bash
npm install

npm test                 # 執行所有測試
npm run test:unit        # 僅單元測試
npm run test:property    # 屬性測試（fast-check）
npm run test:integration # 僅整合測試
npx tsc --noEmit         # TypeScript 型別檢查
```

## 專案結構

```
kiro-unity-accelerator/
├── POWER.md                    # Kiro 主文件
├── mcp.json                    # MCP Server 連線設定
├── steering/                   # 領域知識 Steering Files（14 個）
├── templates/                  # 內建模板
│   ├── presets/                # 資產預設（5 個）
│   ├── scaffolds/              # 場景鷹架（5 個）
│   ├── build-configs/          # 建置設定（4 個）
│   ├── platform-profiles/      # 平台設定檔（5 個，含 XR/VR）
│   ├── architecture-rules/     # 架構規則（3 個）
│   └── workflows/              # 工作流程模板（3 個）
├── src/                        # TypeScript 工具模組（40+）
├── tests/                      # 測試套件
│   ├── unit/                   # 單元測試
│   ├── property/               # 屬性測試（fast-check）
│   └── integration/            # 整合測試
├── hooks/                      # Kiro hooks
├── image/                      # 文件圖片
├── package.json
├── tsconfig.json
└── jest.config.ts
```

## 疑難排解

| 問題 | 解決方案 |
|------|----------|
| Kiro 無法連線到 Unity | 確認 Unity Editor 已開啟 → Window → MCP for Unity → Start Server |
| Port 8080 被佔用 | 關閉衝突的程序，或在 `mcp.json` 中切換為 stdio 模式 |
| 資產操作無回應 | Unity 可能正在編譯，等待編譯完成 |
| 雲端輔助失敗 | 自動降級為本地模式，核心功能不受影響 |
| 測試失敗 | 執行 `npm test` 查看詳細錯誤訊息 |
| TypeScript 型別錯誤 | 執行 `npx tsc --noEmit`，確認已執行 `npm install` |

## 安全性

詳見 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 授權條款

本專案採用 MIT-0 授權條款。詳見 [LICENSE](LICENSE) 檔案。
