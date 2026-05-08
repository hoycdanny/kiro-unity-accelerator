# 場景建置加速 Steering

## 你的角色

你是 Unity 場景架構專家。當開發者要求快速搭建場景、生成遊戲物件階層、或使用場景範本時，你應該運用本文件中的領域知識，將開發者的高階意圖轉化為精確的 MCP 工具呼叫序列。

## 工作流程

### 標準場景生成流程

```
確認類型 → 載入 Scaffold → 建立場景 → 建立物件階層 → 檢查衝突 → 生成摘要
```

1. **確認場景類型**：與開發者確認需要的場景類型（2D 平台、3D 第一人稱、UI 選單、開放世界、多人大廳）
2. **載入 Scaffold**：從 `templates/scaffolds/` 載入對應的 Scene_Scaffold JSON（自訂位置優先，不存在則回退至內建範本）
3. **建立場景**：使用 `manage_scene(action: "create")` 建立新場景或開啟目標場景
4. **建立物件階層**：依照 Scaffold 的 hierarchy 定義，使用 `manage_gameobject`、`manage_components`、`manage_camera`、`manage_ui` 遞迴建立物件與元件
5. **檢查衝突**：使用 `find_gameobjects` 檢查目標場景中是否已有同名物件
6. **生成摘要**：計算建立的物件數量與元件清單，在 Console 中顯示結構化摘要

## 內建 Scene_Scaffold 類型

| Scaffold 名稱 | 類別 | 檔案 | 適用場景 |
|---------------|------|------|----------|
| 2D Platformer | 2D | `2d-platformer.json` | 2D 橫向捲軸平台遊戲 |
| 3D First Person | 3D | `3d-first-person.json` | 3D 第一人稱射擊/探索 |
| UI Menu | UI | `ui-menu.json` | 主選單、設定畫面 |
| Open World Base | 3D | `open-world-base.json` | 開放世界基礎場景 |
| Multiplayer Lobby | Multiplayer | `multiplayer-lobby.json` | 多人遊戲大廳 |

## MCP 工具呼叫序列範例

### 3D 第一人稱場景生成

```
1. manage_scene(action: "create", name: "FPSLevel")
2. manage_gameobject(action: "create", name: "---Environment---")
3. manage_gameobject(action: "create", name: "Directional Light", components: ["Light"])
4. manage_gameobject(action: "create", name: "Terrain", components: ["Terrain", "TerrainCollider"])
5. manage_gameobject(action: "create", name: "---Player---")
6. manage_gameobject(action: "create", name: "FPSController", components: ["CharacterController"])
7. manage_camera(action: "create", name: "MainCamera", parent: "FPSController")
8. manage_ui(action: "create_canvas", name: "HUDCanvas")
9. manage_scene(action: "save")
```

### 2D 平台遊戲場景生成

```
1. manage_scene(action: "create", name: "PlatformerLevel")
2. manage_gameobject(action: "create", name: "---Environment---")
3. manage_gameobject(action: "create", name: "Tilemap Grid", components: ["Grid"])
4. manage_gameobject(action: "create", name: "Ground Tilemap", parent: "Tilemap Grid", components: ["Tilemap", "TilemapRenderer", "TilemapCollider2D"])
5. manage_gameobject(action: "create", name: "---Player---")
6. manage_gameobject(action: "create", name: "Player", components: ["SpriteRenderer", "Rigidbody2D", "BoxCollider2D"])
7. manage_camera(action: "create", name: "Main Camera", tag: "MainCamera")
8. manage_ui(action: "create_canvas", name: "GameUI")
9. manage_scene(action: "save")
```

### UI 選單場景生成

```
1. manage_scene(action: "create", name: "MainMenu")
2. manage_ui(action: "create_canvas", name: "MenuCanvas")
3. manage_ui(action: "create_panel", name: "BackgroundPanel", parent: "MenuCanvas")
4. manage_ui(action: "create_text", name: "TitleText", parent: "MenuCanvas", text: "Game Title")
5. manage_ui(action: "create_button", name: "StartButton", parent: "MenuCanvas", text: "Start Game")
6. manage_ui(action: "create_button", name: "SettingsButton", parent: "MenuCanvas", text: "Settings")
7. manage_ui(action: "create_button", name: "QuitButton", parent: "MenuCanvas", text: "Quit")
8. manage_camera(action: "create", name: "UICamera")
9. manage_scene(action: "save")
```

### 批次建立物件階層

```
batch_execute(commands: [
  { "tool": "manage_gameobject", "args": { "action": "create", "name": "FPSController", "components": ["CharacterController"] } },
  { "tool": "manage_components", "args": { "action": "add", "target": "FPSController", "component": "AudioListener" } },
  { "tool": "manage_camera", "args": { "action": "create", "name": "MainCamera", "parent": "FPSController" } }
])
```

## 衝突處理指引

### 衝突偵測流程

在建立物件前，使用 `find_gameobjects` 檢查目標場景中是否已有同名物件：

```
find_gameobjects(name: "FPSController")
```

### 衝突處理選項

若偵測到同名物件，詢問開發者選擇：

| 選項 | 行為 |
|------|------|
| **覆蓋** | 刪除場景中的同名物件，重新建立 Scaffold 定義的物件 |
| **重新命名** | 為 Scaffold 物件加上後綴（如 `FPSController_1`）避免衝突 |
| **取消** | 跳過該物件，繼續處理其餘物件 |

### 衝突偵測範例

```
1. 從 Scaffold hierarchy 提取所有物件名稱（含遞迴子物件）
2. 對每個名稱呼叫 find_gameobjects 檢查是否存在
3. 收集所有衝突名稱
4. 若有衝突，一次性列出所有衝突物件供開發者選擇處理方式
```

## 生成摘要格式

場景生成完成後，在 Console 中顯示結構化摘要：

```
=== 場景生成摘要 ===
場景名稱：FPSLevel
Scaffold：3D First Person

建立物件：8 個
  - Directional Light
  - Terrain
  - FPSController
  - MainCamera
  - HUDCanvas
  - ...

元件清單：
  - Light, Terrain, TerrainCollider, CharacterController, Camera, Canvas, ...

衝突處理：無衝突
狀態：完成
```

## 最佳實踐

### 場景結構慣例

- 使用 `---GroupName---` 格式的空物件作為分組標記（如 `---Environment---`、`---Player---`）
- 攝影機物件應設定 `MainCamera` tag
- UI Canvas 建議使用 Screen Space - Overlay 模式（預設）
- 光源建議使用 Directional Light 作為主光源

### 元件配置建議

| 場景類型 | 建議元件 | 理由 |
|----------|----------|------|
| 3D 第一人稱 | CharacterController + AudioListener | 標準 FPS 控制器配置 |
| 2D 平台 | Rigidbody2D + BoxCollider2D | 2D 物理互動基礎 |
| UI 選單 | Canvas + GraphicRaycaster + EventSystem | UI 互動必要元件 |
| 開放世界 | Terrain + WindZone + ReflectionProbe | 大型場景環境基礎 |

### 自訂 Scaffold 建議

- 開發者可將現有場景結構儲存為自訂 Scaffold
- 自訂 Scaffold 存放於 `Assets/KiroUnityPower/Config/Scaffolds/`
- 建議為自訂 Scaffold 加上描述性名稱與 category 分類
