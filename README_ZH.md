# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

Unity 開發自動化加速器。透過 MCP（Model Context Protocol — 一種讓 AI 助手與開發工具互動的標準化協定，讓你可以用自然語言描述想做的事，而不需要手動操作選單或撰寫樣板腳本）以自然語言指揮 Unity Editor，涵蓋資產管理、場景建構、建置自動化、效能分析、程式碼品質檢查等功能 — 內建 40+ TypeScript 工具模組與 15 個領域知識檔案。

> **Unity 6.4 基準版本**：本 Power 以 **Unity 6.4**（發布串流 `6000.4`，最新修補版 `6000.4.12f1`，2026-06-17 發布）與 **MCP for Unity v10.3.0 或更新版本（最低 v10.0.0）** 的工具介面為目標。本 Power 支援的最低 Editor 版本是 **Unity 6.0（`6000.0`）**；橋接套件本身的下限更低（Unity 2021.3 LTS）。所有指引是在 **Unity `6000.4.6f1` + URP 17.4.0 + MCP for Unity 9.6.8、Windows Editor、2026-10-21** 這組環境上實機查核的 — Unity 6.5、6.6 及之後的 6.x 預期可用，但**並未**在此驗證。Unity 6.4 屬於 Update 版本，其修補串流已於 2026-06-17 結束，因此要鎖定版本進入正式生產的專案，應改用 **Unity 6.3 LTS**（支援至 2027 年 12 月）或前進到目前的 Update 版本。**Unity 6.0 LTS 已於 2026-10-16 結束支援 — 任何情況下都不建議使用，包含當作「比較保險的舊版」。** 來源：[unity.com/releases](https://unity.com/releases/) 與 [endoflife.date/unity](https://endoflife.date/unity)，皆於 2026-10-21 取得。
>
> **6.4 專屬指引涵蓋的內容**：URP **只剩 Render Graph 一條路** — URP Compatibility Mode 與 `URP_COMPATIBILITY_MODE` 腳本定義在 6.4 已完全移除，不再是舊版自訂 render pass 的退路；GPU Resident Drawer（Forward+/Deferred+ 的 GPU Instancing，2D Renderer 不支援）搭配改版後的 Rendering Statistics 視窗，該視窗會分別列出各批次路徑各自吸收了多少 draw call，而不是只給一個數字；`InstanceID` 已被 `EntityId` 取代，因此橋接回傳的 instance id 要視為不透明的 token — 原樣傳回給橋接即可，切勿對它做運算、排序或解析；iOS 的 PVRTC 已移除（只能用 ASTC 或 ETC）；Web 建置現在會把 `[BurstCompile]` job 放到背景工作執行緒執行，但多執行緒*渲染*仍然不支援；6.4 起可以把自訂 render pass 注入 URP 2D 的 frame loop；OculusXR 套件已不建議使用，請改用 OpenXR plug-in，而 HoloLens 2 支援與其 plug-in 在 6.4 已標記為 deprecated（OculusXR 的實際移除版本未經驗證）。Scripting Backend：`manage_build` 只接受 **`mono` 或 `il2cpp`** — 無法透過本 Power 選用 CoreCLR。來源：[New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) 與 [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64)，皆於 2026-10-21 取得。
>
> 本 Power 不會單憑記憶中的版本號斷言行為，而是透過 MCP 實際查詢連接的專案 — 用 `manage_graphics(action: "pipeline_get_info")` 取得目前啟用的渲染管線、用 `mcpforunity://project/info` 資源取得 Unity 版本與平台、用 `manage_packages(action: "list_packages")` 取得已安裝套件 — 之後才套用版本相關建議。

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
- **建置自動化** — 透過 `manage_build` 進行本地建置、建置日誌解析、可重用的建置設定模板
- **跨平台測試** — 透過 `run_tests` / `get_test_job` 執行測試、結果格式化、測試套件轉換
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
├── steering/       → 15 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 到底是哪一個「Unity MCP」？— 三個不同的專案

有三個互不相關的專案都叫做某種形式的「Unity MCP」。本 Power **只針對第一個**。混用會得到與本文件完全對不上的工具名稱與連接埠。以下三列資訊皆於 **2026-10-21** 取得。

| 專案 | 身分 | 連線方式 | 狀態 |
|---|---|---|---|
| **(a) CoplayDev MCP for Unity** — *本 Power 使用的就是這個* | UPM `com.coplaydev.unity-mcp`，程式庫 [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)，Python 伺服器以 `mcpforunityserver` 發布於 PyPI，MIT 授權 | 預設走 streamable HTTP，端點 `http://127.0.0.1:8080/mcp`；或透過 `uvx` 走 stdio。Unity 端的橋接另外監聽 TCP `6400` | 活躍。已查核的最新版本為 **v10.3.0**（2026-10-04）；本 Power 記載的是 **v10.3.0 或更新版本，最低 v10.0.0**。10 個工具群組共 49 個工具入口 |
| **(b) IvanMurzak/Unity-MCP** — *另一個專案，本 Power 不使用* | UPM `com.ivanmurzak.unity.mcp`，程式庫 [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 會自動下載獨立的伺服器執行檔到 `Library/mcp-server/`；連接埠由專案路徑的雜湊推導（範圍 20000–29999），所以沒有連接埠可設定 | 活躍，最新 1.3.0（約 2026-10-20）。其工具名稱與連接埠機制與本 Power **不相容** |
| **(c) Unity 官方內建的 Editor 內 MCP 伺服器** | 隨 `com.unity.ai.assistant` 一起出貨；UI 在 `Edit > Project Settings > AI > Unity MCP` | MCP client 直接連到 Editor 內的伺服器 | **已不建議使用（deprecated）** — 見下方說明 |

**關於 (c) 的 deprecated 狀態，以及為什麼它不影響本 Power。** Unity 官方文件指出，內建於 Editor 內 AI assistant 套件的那個 MCP 伺服器已不建議使用，改由 Unity CLI（`unity mcp`）取代，CLI 自帶一個說同樣協定的 MCP 伺服器（[Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)，2026-10-21 取得；同樣的公告也出現在套件文件 [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html)，2026-10-21 取得）。**同一份 Unity 頁面也明確說明，從 GitHub 安裝、用來讓 agent 存取 Unity 的第三方 MCP 套件不受這項 deprecation 影響。** 也就是說 (a) — 本 Power 使用的橋接 — 明確不在這項 deprecation 的範圍內，本 Power 並未因此過時。

## 前置需求

- 已安裝 [Unity Editor](https://unity.com/) 並開啟專案 — 目標版本是 Unity 6.4，本 Power 支援的最低版本是 Unity 6.0
- 已安裝 [Kiro IDE](https://kiro.dev/docs/getting-started/installation)
- **MCP for Unity v10.3.0 或更新版本（最低 v10.0.0）** — 若專案目前安裝的 `com.coplaydev.unity-mcp` 是 9.6.8 或更舊，請升級；9.6.8 → 10.3.0 的差異純粹是新增工具，沒有遷移成本
- **Python 3.10 以上並搭配 [`uv`](https://docs.astral.sh/uv/)** — 橋接的伺服器是一個 Python 套件（PyPI 上的 `mcpforunityserver`），由 `uv`/`uvx` 啟動。MCP for Unity 的安裝精靈可以幫你裝 `uv`；在 Windows 上，如果 PATH 裡有多份 `uv.exe`，請把「Choose UV Install Location」指到 WinGet 的 shim（`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`）
- Node.js 18+（僅開發/型別檢查需要，基本使用不需要。若尚未安裝，請參閱 [Node.js 官方安裝指南](https://nodejs.org/)）

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

   如果不想追著 `main` 跑，git URL 還有這些替代方式：

   - **鎖定某個 release**：把 `#main` 換成 tag，例如 `#v10.3.0`
   - **OpenUPM**：`openupm add com.coplaydev.unity-mcp`
   - **Asset Store**：「MCP for Unity」商品頁，再到 Package Manager → My Assets

3. 套件第一次匯入時會開啟**安裝精靈（setup wizard）**。之後常駐的 UI 是 **Window → MCP for Unity**，可在此啟動/停止伺服器、切換 transport、重新設定 client。

   ![步驟 3：開啟 MCP 視窗](image/Enable-Unity-MCP-Server-3.png)

   > 上圖截自較舊的版本，當時選單項目叫「Toggle MCP Window」。目前版本的路徑是 `Window → MCP for Unity`。

4. 確認狀態面板顯示 **Connected**，並記下它顯示的伺服器端點／連接埠（下面會用到）。要復原連線時使用 `Restart Server`。

   ![步驟 4：確認 Server 運行中](image/Enable-Unity-MCP-Server-4.png)

### 註冊路徑只能選一條

有兩種機制可以把 Unity MCP 伺服器註冊給 Kiro，而它們會寫進**同一個**設定檔、只是用不同的名稱。兩邊都做的話，就會有兩個伺服器指向同一個 Unity Editor，造成工具清單重複、資源讀取時伺服器名稱不明確。

- **路徑 A — 讓本 Power 註冊伺服器。** 安裝本 Power 並且不要去動它的 `mcp.json`。Legacy（`POWER.md`）格式的 power，其 MCP 伺服器會被註冊到 `~/.kiro/settings/mcp.json` 的 Powers 區段，名稱由 Kiro 加上命名空間。
- **路徑 B — 讓 Unity 設定 Kiro。** 在 Unity 中執行 `Window → MCP for Unity → Configure All Detected Clients`（或選擇 Kiro 後按 `Configure Selected`）。套件會把一個名為 `unityMCP` 的伺服器項目寫進同一個檔案。

> **如果 Kiro 的 MCP 面板出現兩個 Unity MCP 伺服器，請停用其中一個並重啟 Kiro。** 三個相關的設定檔位置：本 Power 自己的 `mcp.json`、使用者層級的 `~/.kiro/settings/mcp.json`、工作區層級的 `.kiro/settings/mcp.json`。

### MCP 連線設定

#### 自動設定（建議）

在 Unity 中開啟 `Window → MCP for Unity` → 確認 transport 是 HTTP → 按 **Configure All Detected Clients**（或選擇 Kiro 後按 **Configure Selected**）。Kiro 是官方一等支援的 client，所以這一步會把連接埠正確的項目寫進 `~/.kiro/settings/mcp.json`，伺服器鍵名為 `unityMCP`。

#### 讀出真正的連接埠

**不要把 8080 當成固定值。** 這個連接埠可由使用者修改，而 8080 常與其他服務衝突（上游以 Tailscale 為例，並建議改用 8090）。MCP for Unity 視窗會顯示目前的端點 — 如果不是 8080，網址就是 `http://127.0.0.1:<該連接埠>/mcp`。

#### 手動設定（最後手段）

只有在上面兩步都沒能產生可用的項目時，才需要編輯 `mcp.json`。

HTTP 模式（預設 transport，僅限本機 — 與 Unity Editor 通訊）：

> **安全說明**：此處刻意使用 HTTP。伺服器只綁定 loopback（`127.0.0.1` / `::1`）；要綁定 LAN 位址需要開啟 `Advanced Settings → Allow LAN Bind (HTTP Local)`，而遠端端點必須是 `https://`。在預設設定下流量不會離開您的電腦，因此不需要 HTTPS。

```json
{
  "mcpServers": {
    "unity-mcp": {
      "url": "http://127.0.0.1:8080/mcp",
      "type": "http",
      "env": {},
      "disabled": false
    }
  }
}
```

> 請把 `8080` 換成 Unity 視窗顯示的連接埠。模式欄位的鍵名是 `type`，不是 `transport`。這裡刻意寫 `127.0.0.1`：上游文件印的是 `localhost`，但 Unity 端自己的預設值就是字面的 `127.0.0.1`，而且在 Windows 上 `localhost` 可能先解析到 `::1`。

Stdio 模式（備用 — 把 MCP 伺服器當成子行程由 Kiro 管理）。PyPI 套件名稱是 **`mcpforunityserver`**，執行檔入口是 **`mcp-for-unity`**，且必須帶上 `--transport stdio`。PyPI 上**沒有** `unity-mcp` 這個套件 — 本 README 舊版記載的 `uvx unity-mcp` 就是因此從來無法啟動。

Windows（請給 `uvx.exe` 絕對路徑，建議使用 WinGet 的 shim）：

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "C:/Users/<you>/AppData/Local/Microsoft/WinGet/Links/uvx.exe",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

macOS/Linux（PATH 上的 `uvx` 通常就可以）：

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

### 安裝自動導引 Hook（建議）

此 Power 提供 `UserPromptSubmit` hook（Kiro 1.0 `v1` schema），會在每次請求前自動提醒 AI 啟動 Power 並載入對應的 Steering File。

```bash
mkdir -p .kiro/hooks
cp hooks/unity-power-auto-activate.json .kiro/hooks/unity-power-auto-activate.json
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

`src/` 下的 TypeScript 模組是各自獨立的 — 沒有打包器，也沒有建置步驟。測試套件與 TypeScript 編譯設定檔屬於開發者本機檔案（已被 git 忽略），所以全新 clone 下來並沒有設定好的測試執行器；請改用明確的編譯旗標做型別檢查：

```bash
npm install   # 只有 devDependencies — 本 Power 本身沒有執行階段依賴

# 型別檢查（bash）
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/*.ts
```

```powershell
# 型別檢查（PowerShell）
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck (Get-ChildItem src -Filter *.ts | ForEach-Object FullName)
```

## 專案結構

```
kiro-unity-accelerator/
├── POWER.md                    # Kiro 主文件
├── mcp.json                    # MCP Server 連線設定
├── steering/                   # 領域知識 Steering Files（15 個）
├── templates/                  # 內建模板
│   ├── presets/                # 資產預設（5 個）
│   ├── scaffolds/              # 場景鷹架（5 個）
│   ├── build-configs/          # 建置設定（4 個）
│   ├── platform-profiles/      # 平台設定檔（5 個，含 XR/VR）
│   ├── architecture-rules/     # 架構規則（3 個）
│   └── workflows/              # 工作流程模板（3 個）
├── src/                        # TypeScript 工具模組（40+）
├── hooks/                      # Hook 範本（請複製到 .kiro/hooks/）
├── workshop/                   # 一步一步的 Prompt 教學
├── image/                      # 文件圖片
└── package.json
```

## 疑難排解

| 問題 | 解決方案 |
|------|----------|
| Kiro 無法連線到 Unity | 確認 Unity Editor 已開啟並載入專案 → `Window → MCP for Unity` → 確認狀態面板顯示 **Connected**（若否，按 `Restart Server`） |
| Port 8080 被佔用 | 在 MCP for Unity 設定中改掉連接埠（上游建議 8090），重新執行 **Configure All Detected Clients**，重啟 Kiro，並把 `mcp.json` 的 `url` 改成 Unity 視窗顯示的連接埠 |
| 文件寫的某個工具在工具清單裡找不到 | 很可能是該工具的群組沒有啟用 — 預設只有 `core` 是開啟的。依序執行 `manage_tools(action: "list_groups")`、`manage_tools(action: "sync")`、`manage_tools(action: "activate", group: "<名稱>")`。Kiro 可能會快取工具清單，之後請重新整理或重新連線 MCP 伺服器 |
| 註冊了兩個 Unity MCP 伺服器 | 打開 `~/.kiro/settings/mcp.json` 與 Kiro 的 MCP 面板；如果本 Power 的項目和 `unityMCP` 同時存在，請停用其中一個並重啟 Kiro（見「註冊路徑只能選一條」） |
| Unity 6.3+ 且安裝了 Unity AI Assistant 套件 | AI Assistant 內附的 `System.Collections.Immutable` 版本比 `validate_script` / `execute_code` 使用的 Roslyn 依賴所需的更新。上游的解法是把 `System.Collections.Immutable` v9.0.0 放進 `Assets/Plugins/` |
| 資產操作無回應 | Unity 可能正在編譯，等待編譯完成，或讀取 `mcpforunity://editor/state` 資源確認狀態 |
| TypeScript 型別錯誤 | 執行上面「開發」一節的旗標式型別檢查，並確認已執行 `npm install` |

## 安全性

詳見 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 授權條款

本專案採用 MIT-0 授權條款。詳見 [LICENSE](LICENSE) 檔案。
