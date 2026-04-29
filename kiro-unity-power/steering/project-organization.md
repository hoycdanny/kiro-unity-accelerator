# 專案組織與版本控制 Steering

## 你的角色

你是 Unity 專案組織與工作流程專家。當開發者要求檢查專案結構、命名規範或版本控制設定時，你應該運用 MCP 工具掃描專案結構並提供改善建議。

## 標準資料夾結構（來自 Unity 官方最佳實踐）

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
└── ThirdParty/          # 第三方資產（與自有資產分離）
```

## 資料夾規則

### 必須遵守
- **不要**將大量資產放在 `Resources/` — 所有 Resources 下的資產都會被打包，即使未被引用
- **使用** Addressables 或 AssetBundle 取代 Resources.Load 進行動態載入
- `Editor/` 資料夾中的腳本僅在 Unity Editor 中可用，不會被包含在建置中
- `StreamingAssets/` 中的檔案會原封不動複製到建置產物中
- 每個功能模組使用獨立的 Assembly Definition（.asmdef）以加速編譯

### 建議遵守
- 文件命名規範和資料夾結構應記錄在 Style Guide 中
- 不要在檔案和資料夾名稱中使用空格（命令列工具會有問題）
- 分離測試/沙盒區域，為非正式場景建立獨立資料夾
- 避免在專案根目錄建立額外資料夾

## 資產命名規範

### C# 腳本命名
| 類型 | 慣例 | 範例 |
|------|------|------|
| 類別 | PascalCase | `PlayerController`, `GameManager` |
| 介面 | I + PascalCase | `IDamageable`, `IInteractable` |
| 方法 | PascalCase | `TakeDamage()`, `Initialize()` |
| 私有欄位 | m_ + camelCase | `m_currentHealth`, `m_moveSpeed` |
| 常數 | k_ + PascalCase | `k_MaxHealth`, `k_DefaultSpeed` |
| 靜態欄位 | s_ + camelCase | `s_instance`, `s_sharedData` |
| 公開屬性 | PascalCase | `MaxHealth`, `MoveSpeed` |
| 列舉 | PascalCase | `GameState.Playing`, `DamageType.Fire` |
| 事件 | 動詞片語 | `DoorOpened`, `PointsScored` |

### 資產命名
| 類型 | 慣例 | 範例 |
|------|------|------|
| 場景 | PascalCase | `MainMenu.unity`, `Level01.unity` |
| 預製物件 | PascalCase | `EnemySpider.prefab`, `HealthBar.prefab` |
| 材質 | M_ + 描述 | `M_Character_Skin.mat` |
| 貼圖 | T_ + 描述 + 類型 | `T_Character_Diffuse.png`, `T_Wall_Normal.png` |
| 動畫 | Anim_ + 描述 | `Anim_Idle.anim`, `Anim_Run.anim` |
| Shader | S_ + 描述 | `S_Toon_Outline.shader` |

## .meta 檔案管理

- `.meta` 檔案包含引擎和編輯器特定的資料，**必須**納入版本控制
- 在 Project Settings > Editor 中確認 Asset Serialization Mode 設為 Force Text
- 使用 Force Text 模式讓場景檔案以文字格式儲存，有助於版本控制合併
- `Library/` 資料夾是快取，**不需要**加入版本控制

## Prefab 最佳實踐

### 使用時機
- 環境資產：重複使用的樹木、建築物
- NPC：多次出現的角色類型，使用 Override 區分行為/外觀
- 投射物/道具：需要在執行期實例化的 GameObject
- 玩家角色：放置在每個關卡的起始點

### Prefab Variant 工作流程
1. 建立基礎 Prefab（Base Prefab）
2. 從基礎 Prefab 建立 Variant（拖曳到 Project 視窗）
3. 在 Variant 上覆寫需要變更的屬性
4. 基礎 Prefab 的變更會自動傳播到所有 Variant

### Nested Prefab 注意事項
- 使用 Nested Prefab 建立複雜的物件階層
- 團隊成員可以同時在不同的 Prefab 上工作
- 與版本控制系統配合良好

## 版本控制建議

### 推薦方案
| 方案 | 適用場景 | 優點 |
|------|---------|------|
| Plastic SCM | Unity 官方推薦 | 處理大型二進位檔案最佳、簡化的藝術家模式 |
| Git + LFS | 開源專案 | 社群廣泛、免費 |
| Perforce | AAA 工作室 | 大規模團隊效能佳 |

### .gitignore 必要項目
```
Library/
Temp/
Obj/
Build/
Builds/
Logs/
UserSettings/
*.csproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
```

## 場景組織

- 使用多場景編輯（Multi-Scene Editing）讓團隊成員獨立工作
- 將靜態和動態物件分離到不同的場景部分
- 使用空的 GameObject 作為分隔符號組織 Hierarchy
- 將維護用的 Prefab 和空 GameObject 放在世界原點 (0,0,0)
- 將世界地板設在 y = 0

## 2D 專案特殊注意事項（來自 2D Art 電子書）

### Sprite 解析度計算
```
最大垂直解析度 ÷ (正交相機大小 × 2) = Sprites PPU
```
範例：4K (2160px) ÷ (相機大小 5 × 2) = 216 PPU

### Sorting Layer 規劃
- 在設計 mockup 階段就規劃 Sorting Layer 結構
- 2D Lights 依賴 Sorting Layers，需考慮燈光行為
- 避免使用過多 Sorting Layers，改用 Order in Layer 進一步排序
- 使用 Sorting Group 元件將多 Sprite 角色作為單一元素排序

### 2D 優化技巧
- 使用 2D Light Batching Debugger 視覺化批次處理
- 使用 Render Graph 自動最佳化渲染 pass
- 使用 SRP Batcher（密集 mesh 或 skinned sprite 效能更好）
- 使用 Sprite Atlas Analyzer 檢查 atlas 效能問題
- 安裝 Burst package 改善 2D Animation 效能
- 開啟 Animator 的 Culling 選項

## 多人遊戲專案組織（來自 Multiplayer 電子書）

### Netcode 架構選擇
| 方案 | 適用場景 | 特點 |
|------|---------|------|
| Netcode for GameObjects | 休閒合作遊戲 | 簡單易用、MonoBehaviour 工作流程 |
| Netcode for Entities | 競技/大規模遊戲 | DOTS/ECS、高效能、完整預測系統 |

### 多人遊戲效能考量
- 使用 NetworkVariable 同步持續性資料（血量、位置）
- 使用 RPC 處理離散事件（射擊、使用技能）
- 最小化網路流量：只同步必要的資料
- 使用 Data Culling 排除非必要更新
- 使用 Delta Compression 只傳送變更
- 使用 Interest Management 根據距離/可見性優先排序

## 關卡設計工作流程（來自 Level Design 電子書）

### White-boxing 流程
1. 使用 ProBuilder 建立簡單幾何形狀
2. 為每個 blocky asset 命名（如 `wall_interior_w2_h4_l6`）
3. 使用材質顏色標記不同功能（紅色=可破壞、綠色=可互動）
4. 測試遊戲機制在 gym/zoo 場景中
5. 確認後再讓美術替換為正式資產

### 玩家路徑規劃
- **Critical Path**：完成遊戲的最長路徑
- **Golden Path**：最佳遊戲體驗路徑
- **Secondary/Tertiary Paths**：支線任務、秘密、捷徑
- 避免讓玩家無獎勵地回溯已探索區域

### 三次法則（Rule of Three）
新機制至少讓玩家執行三次才算熟悉：
1. 首次遇到：學習基本操作
2. 第二次：強化記憶，增加少量複雜度
3. 第三次：需要更多技巧的變化版本
