# 實作計畫：Kiro Unity Power

## 概述

本計畫將 Kiro Unity Power 套件的設計轉化為可執行的編碼任務。實作順序為：先建立專案結構與核心工具模組，再建立 POWER.md 與 mcp.json 配置，接著建立所有 steering files 與 JSON 範本，最後實作 TypeScript 工具邏輯並撰寫測試。每個任務都可由程式碼生成 LLM 獨立執行，並在前一步的基礎上遞增推進。

## Tasks

- [x] 1. 建立專案結構與核心配置
  - [x] 1.1 初始化專案目錄結構與 TypeScript 工具鏈
    - 建立 `kiro-unity-power/` 根目錄及所有子目錄：`steering/`、`templates/presets/`、`templates/scaffolds/`、`templates/build-configs/`、`templates/platform-profiles/`、`templates/architecture-rules/`、`templates/workflows/`、`src/`、`tests/unit/`、`tests/property/`、`tests/integration/`
    - 初始化 `package.json`（含 Jest、fast-check、typescript 依賴）
    - 建立 `tsconfig.json`（strict mode、ES2020 target）
    - 建立 `jest.config.ts`（支援 TypeScript、設定 property test 最少 100 次迭代）
    - _需求：全部（基礎設施）_

  - [x] 1.2 建立 POWER.md 主文件
    - 撰寫 Power 概述、可用 MCP 工具清單（manage_asset、manage_scene、manage_gameobject、manage_components、manage_material、manage_script、manage_shader、manage_texture、manage_prefabs、manage_ui、manage_animation、manage_camera、manage_graphics、manage_packages、manage_editor、run_tests、read_console、batch_execute、create_script、find_gameobjects）
    - 撰寫每個需求的工作流指引（資產批次操作、場景建置、建置自動化、效能分析、程式碼品質、平台相容性、資產依賴等）
    - 撰寫預設範本使用說明
    - _需求：全部_

  - [x] 1.3 建立 mcp.json MCP 配置檔
    - 建立 HTTP 模式配置（`http://localhost:8080/mcp`）
    - 在 POWER.md 中說明備用 stdio 模式（uvx）
    - _需求：全部（MCP 連線基礎）_

- [x] 2. 建立核心 TypeScript 型別定義與工具模組
  - [x] 2.1 定義所有核心資料模型介面
    - 在 `src/types.ts` 中定義 AssetPreset、SceneScaffold、BuildConfig、WorkflowTemplate、PerformanceThresholds、PerformanceReport、ArchitectureRule、PlatformProfile、DependencyTree、KnowledgeEntry 等 TypeScript 介面
    - 定義 MCP 工具呼叫相關型別（McpToolCall、BatchExecutePayload 等）
    - 定義列舉型別（AssetType、RigType、MeshCompression、BuildTarget、SeverityLevel 等）
    - _需求：1.1-1.6, 2.1-2.5, 3.1-3.7, 5.1-5.6, 6.1-6.6, 7.1-7.6, 8.1-8.6, 9.1-9.7, 10.1-10.6_

  - [x] 2.2 實作 JSON 序列化/反序列化與 CRUD 工具模組
    - 在 `src/config-crud.ts` 中實作 `loadConfig<T>()`、`saveConfig<T>()`、`deleteConfig()` 泛型函式
    - 支援所有設定實體類型的 JSON 讀寫與刪除
    - 實作內建範本 fallback 邏輯（自訂位置優先，不存在則回退至內建範本）
    - _需求：1.3, 2.3, 5.1, 7.4, 9.6, 8.1_

  - [ ]* 2.3 撰寫 Property 3 屬性測試：設定實體 CRUD 往返
    - **Property 3: Config Entity CRUD Round-Trip**
    - 使用 fast-check 隨機生成各類設定實體 JSON，驗證序列化→反序列化→比對等價性；刪除後載入應回傳空值
    - **驗證：需求 1.3, 2.3, 5.1, 7.4, 9.6, 8.1**

- [x] 3. Checkpoint — 確認基礎結構與核心工具模組
  - 確保所有測試通過，如有疑問請詢問使用者。


- [-] 4. 實作資產設定自動化邏輯與 Steering（需求 1）
  - [x] 4.1 建立 `steering/asset-automation.md` steering file
    - 撰寫資產管線專家角色定義、工作流程（掃描→偵測→載入 Preset→batch_execute→摘要）
    - 撰寫命名慣例規則（_char_→3D Character、_env_→Environment、_ui_→UI Texture、_sfx_→Audio 等）
    - 撰寫 MCP 工具用法範例（manage_asset list、set_import_settings、batch_execute）
    - 撰寫錯誤處理指引與最佳實踐（rig 類型選擇、貼圖壓縮建議）
    - _需求：1.1, 1.2, 1.4, 1.5, 1.6_

  - [x] 4.2 建立所有內建 Asset_Preset JSON 範本
    - 建立 `templates/presets/3d-character.json`（Humanoid rig、材質、normal maps）
    - 建立 `templates/presets/3d-environment.json`（None rig、mesh compression）
    - 建立 `templates/presets/2d-sprite.json`（Sprite texture type、filter mode）
    - 建立 `templates/presets/ui-texture.json`（UI texture settings）
    - 建立 `templates/presets/audio-sfx.json`（音效匯入設定）
    - 每個 JSON 須符合 AssetPreset 介面，包含 id、name、config、namingPatterns、mcpToolMapping
    - _需求：1.1, 1.2, 1.3_

  - [x] 4.3 實作資產類型偵測模組
    - 在 `src/asset-detection.ts` 中實作 `detectAssetType(filePath, presets)` 函式
    - 根據檔名匹配 AssetPreset 的 `namingPatterns` 正則表達式
    - 匹配則回傳對應 Preset，不匹配則回傳 null
    - _需求：1.2_

  - [ ]* 4.4 撰寫 Property 2 屬性測試：資產類型偵測正確性
    - **Property 2: Asset Type Detection by Naming Pattern**
    - 使用 fast-check 隨機生成檔名與正則表達式，驗證匹配結果與 RegExp.test() 一致
    - **驗證：需求 1.2**

  - [x] 4.5 實作 Preset 套用與變更摘要模組
    - 在 `src/preset-application.ts` 中實作 `applyPreset(originalState, preset)` 函式，回傳套用後的狀態
    - 實作 `generateChangeSummary(originalState, newState)` 函式，回傳所有值不同的參數項目
    - 實作錯誤回復邏輯：套用失敗時回復至原始狀態並記錄錯誤原因
    - _需求：1.1, 1.4, 1.5_

  - [ ]* 4.6 撰寫 Property 1 屬性測試：資產預設套用完整性
    - **Property 1: Preset Application Completeness**
    - 使用 fast-check 隨機生成 AssetPreset 與模擬資產狀態，驗證套用後參數值等於 Preset 定義
    - **驗證：需求 1.1**

  - [ ]* 4.7 撰寫 Property 4 屬性測試：變更摘要正確性
    - **Property 4: Change Summary Accuracy**
    - 使用 fast-check 隨機生成原始狀態與目標狀態，驗證 diff 結果精確列出所有不同參數且不包含相同參數
    - **驗證：需求 1.4**

  - [ ]* 4.8 撰寫 Property 5 屬性測試：錯誤回復原子性
    - **Property 5: Error Rollback Atomicity**
    - 使用 fast-check 模擬套用過程中的錯誤，驗證資產參數回復至原始狀態且錯誤被記錄
    - **驗證：需求 1.5**

  - [x] 4.9 實作資料夾掃描過濾模組
    - 在 `src/folder-scan.ts` 中實作 `filterSupportedAssets(filePaths)` 函式
    - 保留支援類型（.fbx, .obj, .png, .jpg, .wav, .mp3, .mat, .shader 等），排除不支援類型
    - _需求：1.6_

  - [ ]* 4.10 撰寫 Property 6 屬性測試：資料夾掃描完整性
    - **Property 6: Folder Scan Completeness**
    - 使用 fast-check 隨機生成檔案路徑清單，驗證過濾結果集合的精確性
    - **驗證：需求 1.6**

  - [ ]* 4.11 撰寫資產自動化單元測試
    - 測試內建 Preset JSON 結構正確性
    - 測試邊界條件：空資料夾掃描、無匹配命名模式、空 Preset config
    - 測試錯誤情境：無效 JSON 載入、不存在的資產路徑
    - _需求：1.1-1.6_


- [x] 5. 實作場景建置加速邏輯與 Steering（需求 2）
  - [x] 5.1 建立 `steering/scene-scaffolding.md` steering file
    - 撰寫場景架構專家角色定義、工作流程（確認類型→載入 Scaffold→建立場景→建立物件階層→檢查衝突→摘要）
    - 撰寫 MCP 工具呼叫序列範例（manage_scene、manage_gameobject、manage_camera、manage_ui）
    - 撰寫衝突處理指引（find_gameobjects 檢查同名物件→覆蓋/重新命名/取消）
    - _需求：2.1-2.5_

  - [x] 5.2 建立所有內建 Scene_Scaffold JSON 範本
    - 建立 `templates/scaffolds/2d-platformer.json`（2D 平台遊戲場景結構）
    - 建立 `templates/scaffolds/3d-first-person.json`（3D 第一人稱場景：FPSController、MainCamera、Terrain、Light、HUD）
    - 建立 `templates/scaffolds/ui-menu.json`（UI 選單場景結構）
    - 建立 `templates/scaffolds/open-world-base.json`（開放世界基礎場景結構）
    - 建立 `templates/scaffolds/multiplayer-lobby.json`（多人遊戲大廳場景結構）
    - 每個 JSON 須符合 SceneScaffold 介面，包含 hierarchy（含遞迴 children）、components、mcpTool、mcpArgs
    - _需求：2.1, 2.2, 2.3_

  - [x] 5.3 實作 Scaffold-to-MCP 轉譯模組
    - 在 `src/scaffold-translation.ts` 中實作 `translateScaffoldToMcpCalls(scaffold)` 函式
    - 將 SceneScaffold 的 hierarchy 遞迴轉換為 MCP 工具呼叫序列（manage_gameobject、manage_components、manage_camera、manage_ui）
    - 保持物件名稱、元件類型、屬性值與 hierarchy 結構一一對應
    - _需求：2.2_

  - [ ]* 5.4 撰寫 Property 7 屬性測試：場景腳手架 MCP 呼叫轉譯正確性
    - **Property 7: Scaffold-to-MCP Translation**
    - 使用 fast-check 隨機生成 SceneScaffold JSON，驗證產生的 MCP 呼叫序列與 hierarchy 一致
    - **驗證：需求 2.2**

  - [x] 5.5 實作場景命名衝突偵測模組
    - 在 `src/scene-conflict.ts` 中實作 `detectNameConflicts(scaffoldNames, existingNames)` 函式
    - 回傳所有 Scaffold 中與場景中同名的物件清單
    - _需求：2.5_

  - [ ]* 5.6 撰寫 Property 8 屬性測試：場景命名衝突偵測
    - **Property 8: Scene Name Conflict Detection**
    - 使用 fast-check 隨機生成 Scaffold 物件名稱集合與場景物件名稱集合，驗證衝突偵測不遺漏
    - **驗證：需求 2.5**

  - [x] 5.7 實作生成摘要計算模組
    - 在 `src/generation-summary.ts` 中實作 `calculateSummary(scaffold)` 函式
    - 計算物件總數（含遞迴子物件）與元件清單（所有 components 的聯集）
    - _需求：2.4_

  - [ ]* 5.8 撰寫 Property 9 屬性測試：生成摘要一致性
    - **Property 9: Generation Summary Consistency**
    - 使用 fast-check 隨機生成 SceneScaffold，驗證摘要中物件數量與元件清單的正確性
    - **驗證：需求 2.4**

  - [ ]* 5.9 撰寫場景建置單元測試
    - 驗證內建 Scene_Scaffold 至少有 5 種且涵蓋指定類型
    - 測試邊界條件：空 hierarchy、無 components 的物件、深層巢狀結構
    - _需求：2.1-2.5_

- [x] 6. Checkpoint — 確認資產自動化與場景建置模組
  - 確保所有測試通過，如有疑問請詢問使用者。


- [-] 7. 實作建置自動化邏輯與 Steering（需求 3）
  - [x] 7.1 建立 `steering/build-automation.md` steering file
    - 撰寫建置自動化專家角色定義、工作流程（載入配置→manage_editor build→輪詢 read_console→解析日誌→回報結果）
    - 撰寫 Cloud_Assist 路由邏輯指引（useCloudAssist 判斷→雲端/本地路徑分流）
    - 撰寫建置錯誤解析指引與常見錯誤修正建議
    - _需求：3.1-3.7_

  - [x] 7.2 建立所有內建 BuildConfig JSON 範本
    - 建立 `templates/build-configs/windows-dev.json`（Windows 開發建置配置）
    - 建立 `templates/build-configs/android-release.json`（Android 發行建置配置）
    - 建立 `templates/build-configs/ios-release.json`（iOS 發行建置配置）
    - 建立 `templates/build-configs/webgl-release.json`（WebGL 發行建置配置）
    - 每個 JSON 須符合 BuildConfig 介面，包含 target、scenes、outputPath、options、mcpToolMapping
    - _需求：3.1, 3.3_

  - [x] 7.3 實作建置日誌解析模組
    - 在 `src/build-log-parser.ts` 中實作 `parseBuildLog(logText)` 函式
    - 提取所有錯誤訊息，為每個錯誤提供結構化摘要（錯誤類型、檔案位置）與修正建議
    - 支援常見 Unity 建置錯誤模式（CS 編譯錯誤、缺少引用、Shader 錯誤等）
    - _需求：3.4_

  - [ ]* 7.4 撰寫 Property 10 屬性測試：建置日誌錯誤解析
    - **Property 10: Build Log Error Parsing**
    - 使用 fast-check 隨機生成含已知錯誤模式的日誌文字，驗證所有錯誤被提取且含結構化摘要
    - **驗證：需求 3.4**

  - [x] 7.5 實作 Cloud_Assist 路由邏輯模組
    - 在 `src/cloud-assist-router.ts` 中實作 `routeBuildTask(config)` 函式
    - 當 `useCloudAssist` 為 true 時回傳雲端執行路徑，為 false 時回傳本地 MCP 路徑
    - _需求：3.5_

  - [ ]* 7.6 撰寫 Property 11 屬性測試：建置配置多組共存
    - **Property 11: Multiple Build Configs Coexistence**
    - 使用 fast-check 隨機生成多組 BuildConfig，驗證各組獨立載入且互不影響
    - **驗證：需求 3.3**

  - [ ]* 7.7 撰寫 Property 12 屬性測試：Cloud_Assist 路由正確性
    - **Property 12: Cloud_Assist Routing**
    - 使用 fast-check 隨機生成含 useCloudAssist 布林值的配置，驗證路由結果正確
    - **驗證：需求 3.5, 4.3**

  - [ ]* 7.8 撰寫建置自動化單元測試
    - 驗證觸發建置時產生正確的 manage_editor MCP 呼叫
    - 驗證 Cloud_Assist 建置狀態輪詢間隔為 30 秒
    - 驗證 Cloud_Assist 建置完成後觸發產物下載
    - 測試邊界條件：空 scenes 清單、無效 outputPath
    - _需求：3.1-3.7_


- [-] 8. 實作跨平台測試與工作流自動化邏輯（需求 4, 5）
  - [x] 8.1 建立 `steering/cross-platform-testing.md` steering file
    - 撰寫跨平台測試專家角色定義、工作流程（run_tests→結構化結果→Cloud_Assist 裝置測試→下載結果）
    - 撰寫測試套件格式轉換指引（Unity Test Framework → Cloud_Assist 格式）
    - 撰寫測試失敗標記與日誌處理指引
    - _需求：4.1-4.6_

  - [x] 8.2 實作測試套件格式轉換模組
    - 在 `src/test-suite-converter.ts` 中實作 `convertToCloudFormat(unityTestSuite)` 與 `convertFromCloudFormat(cloudTestSuite)` 函式
    - 確保往返轉換後產生等價的測試套件定義
    - _需求：4.6_

  - [x] 8.3 實作測試結果結構化模組
    - 在 `src/test-result-formatter.ts` 中實作 `formatTestResults(rawResults)` 函式
    - 每個平台結果包含通過率、失敗測試案例清單；失敗裝置標記並附帶失敗日誌
    - _需求：4.2, 4.5_

  - [ ]* 8.4 撰寫 Property 13 屬性測試：測試結果結構完整性
    - **Property 13: Test Result Structure per Platform**
    - 使用 fast-check 隨機生成跨平台測試結果，驗證每個平台包含通過率與失敗清單，失敗裝置被標記
    - **驗證：需求 4.2, 4.5**

  - [ ]* 8.5 撰寫 Property 14 屬性測試：測試套件格式轉換往返
    - **Property 14: Test Suite Format Round-Trip**
    - 使用 fast-check 隨機生成 Unity Test 定義，驗證轉換→反轉換→比對等價性
    - **驗證：需求 4.6**

  - [x] 8.6 建立 `steering/workflow-automation.md` steering file
    - 撰寫工作流自動化專家角色定義、工作流程（載入範本→依序執行步驟→進度回報→錯誤處理）
    - 撰寫步驟依賴驗證指引（DAG 拓撲排序）
    - 撰寫失敗處理指引（暫停→重試/跳過/中止）
    - _需求：5.1-5.6_

  - [x] 8.7 建立所有內建 Workflow_Template JSON 範本
    - 建立 `templates/workflows/asset-import-setup.json`（資產導入與設定工作流）
    - 建立 `templates/workflows/build-and-deploy.json`（建置與部署工作流）
    - 建立 `templates/workflows/test-execution.json`（測試執行工作流）
    - 每個 JSON 須符合 WorkflowTemplate 介面，包含 steps（含 dependsOn、onFailure）
    - _需求：5.1, 5.5_

  - [x] 8.8 實作工作流依賴驗證與拓撲排序模組
    - 在 `src/workflow-validation.ts` 中實作 `validateDependencies(workflow)` 函式
    - 驗證步驟之間的依賴關係是否合法（無循環、dependsOn 的步驟存在）
    - 實作 `topologicalSort(steps)` 函式，回傳合法的執行順序
    - 若存在非法依賴（如 B dependsOn A 但 B 排在 A 前且無法拓撲排序），回傳驗證失敗
    - _需求：5.2, 5.6_

  - [x] 8.9 實作工作流進度計算模組
    - 在 `src/workflow-progress.ts` 中實作 `calculateProgress(totalSteps, completedSteps)` 函式
    - 完成第 K 步後進度為 K/N × 100
    - _需求：5.3_

  - [ ]* 8.10 撰寫 Property 15 屬性測試：工作流步驟執行順序
    - **Property 15: Workflow Step Execution Order**
    - 使用 fast-check 隨機生成 DAG 結構的工作流，驗證拓撲排序後每個步驟在其 dependsOn 步驟之後
    - **驗證：需求 5.2**

  - [ ]* 8.11 撰寫 Property 16 屬性測試：工作流進度計算
    - **Property 16: Workflow Progress Calculation**
    - 使用 fast-check 隨機生成 N 與 K（K ≤ N），驗證進度百分比為 K/N × 100
    - **驗證：需求 5.3**

  - [ ]* 8.12 撰寫 Property 17 屬性測試：工作流失敗暫停
    - **Property 17: Workflow Failure Pause**
    - 使用 fast-check 隨機生成工作流與失敗步驟位置，驗證失敗後後續步驟不被執行
    - **驗證：需求 5.4**

  - [ ]* 8.13 撰寫 Property 18 屬性測試：工作流依賴驗證
    - **Property 18: Workflow Dependency Validation**
    - 使用 fast-check 隨機生成含非法依賴的工作流，驗證驗證器拒絕非法配置
    - **驗證：需求 5.6**

  - [ ]* 8.14 撰寫跨平台測試與工作流單元測試
    - 驗證內建 Workflow_Template 至少有 3 種且涵蓋指定類型
    - 驗證 Cloud_Assist 測試結果包含螢幕截圖引用
    - 測試邊界條件：零步驟工作流、單步驟工作流、無依賴的平行步驟
    - _需求：4.1-4.6, 5.1-5.6_

- [x] 9. Checkpoint — 確認跨平台測試與工作流模組
  - 確保所有測試通過，如有疑問請詢問使用者。


- [-] 10. 實作效能分析與程式碼品質邏輯（需求 6, 7）
  - [x] 10.1 建立 `steering/performance-analysis.md` steering file
    - 撰寫效能分析專家角色定義、工作流程（manage_graphics→read_console→find_gameobjects→比對閾值→生成報告）
    - 撰寫效能指標閾值建議（Draw Calls、GC Allocation、Shader 複雜度、幀率）
    - 撰寫最佳化建議範本（LOD、材質合併、Shader 簡化等）
    - _需求：6.1-6.6_

  - [x] 10.2 實作效能報告生成與閾值比對模組
    - 在 `src/performance-report.ts` 中實作 `generatePerformanceReport(metrics, thresholds)` 函式
    - 報告包含 Draw Calls、GC Allocation、Shader 複雜度、幀率四項指標
    - 對每個超出閾值的指標提供非空的最佳化建議文字
    - 實作 `identifyBottlenecks(metrics, thresholds)` 函式，定位瓶頸物件
    - _需求：6.1, 6.3, 6.6_

  - [x] 10.3 實作自訂閾值持久化模組
    - 在 `src/threshold-persistence.ts` 中實作 `saveThresholds(thresholds)` 與 `loadThresholds()` 函式
    - 序列化為 JSON 儲存，反序列化載入後值相同
    - 後續效能報告使用自訂閾值而非預設值
    - _需求：6.4_

  - [ ]* 10.4 撰寫 Property 19 屬性測試：效能報告完整性與閾值建議
    - **Property 19: Performance Report Completeness and Threshold Suggestions**
    - 使用 fast-check 隨機生成效能指標與閾值，驗證報告包含四項指標且超出閾值的指標有非空建議
    - **驗證：需求 6.1, 6.3**

  - [x] 10.5 撰寫 Property 20 屬性測試：自訂閾值持久化
    - **Property 20: Custom Threshold Persistence**
    - 使用 fast-check 隨機生成 PerformanceThresholds，驗證序列化→反序列化後值相同
    - **驗證：需求 6.4**

  - [ ]* 10.6 撰寫 Property 21 屬性測試：瓶頸定位正確性
    - **Property 21: Bottleneck Localization**
    - 使用 fast-check 隨機生成超出閾值的指標與模擬物件清單，驗證定位結果回傳至少一個物件路徑
    - **驗證：需求 6.6**

  - [x] 10.7 建立 `steering/code-quality.md` steering file
    - 撰寫程式碼品質專家角色定義、工作流程（project_info→manage_script list→read→載入規則→分析→報告）
    - 撰寫架構模式指引（MVC、ECS、ScriptableObject）
    - 撰寫循環依賴偵測指引
    - _需求：7.1-7.6_

  - [x] 10.8 建立所有內建 Architecture_Rule JSON 範本
    - 建立 `templates/architecture-rules/mvc-pattern.json`（MVC 架構規則）
    - 建立 `templates/architecture-rules/ecs-pattern.json`（ECS 架構規則）
    - 建立 `templates/architecture-rules/scriptableobject-pattern.json`（ScriptableObject 架構規則）
    - 每個 JSON 須符合 ArchitectureRule 介面，包含 rules（NamingConvention、LayerDependency、InheritanceConstraint、CyclicDependency）
    - _需求：7.1, 7.4_

  - [x] 10.9 實作循環依賴偵測模組
    - 在 `src/cycle-detection.ts` 中實作 `detectCycles(dependencyGraph)` 函式
    - 使用 DFS 偵測有向圖中的所有循環路徑
    - 不將非循環路徑誤報為循環
    - 此模組同時服務程式碼循環依賴（需求 7.6）與資產循環引用（需求 10.6）
    - _需求：7.6, 10.6_

  - [ ]* 10.10 撰寫 Property 24 屬性測試：程式碼循環依賴偵測
    - **Property 24: Code Cyclic Dependency Detection**
    - 使用 fast-check 隨機生成含已知循環的有向圖，驗證所有循環被找出且無誤報
    - **驗證：需求 7.6**

  - [x] 10.11 實作架構違規報告生成模組
    - 在 `src/architecture-check.ts` 中實作 `checkArchitecture(scripts, rules)` 函式
    - 每個違規項目包含檔案路徑、行號、違規規則名稱、修正建議
    - 實作 `incrementalCheck(changedFile, rules)` 函式，增量式檢查結果與完整檢查一致
    - _需求：7.2, 7.3, 7.5_

  - [ ]* 10.12 撰寫 Property 22 屬性測試：架構違規報告完整性
    - **Property 22: Architecture Violation Report Completeness**
    - 使用 fast-check 隨機生成腳本內容與規則，驗證違規報告包含四個必要欄位且不遺漏違規
    - **驗證：需求 7.2, 7.3**

  - [ ]* 10.13 撰寫 Property 23 屬性測試：增量式檢查一致性
    - **Property 23: Incremental Check Consistency**
    - 使用 fast-check 隨機生成修改的腳本，驗證增量式檢查結果與完整檢查結果一致
    - **驗證：需求 7.5**

  - [ ]* 10.14 撰寫效能分析與程式碼品質單元測試
    - 驗證預設 Architecture_Rule 集合包含 MVC、ECS、ScriptableObject 模式
    - 測試邊界條件：所有指標都在閾值內的效能報告、空的依賴圖、無違規的腳本
    - _需求：6.1-6.6, 7.1-7.6_

- [x] 11. Checkpoint — 確認效能分析與程式碼品質模組
  - 確保所有測試通過，如有疑問請詢問使用者。


- [-] 12. 實作知識管理與平台相容性邏輯（需求 8, 9）
  - [x] 12.1 建立 `steering/knowledge-management.md` steering file
    - 撰寫知識管理專家角色定義、工作流程（建立/搜尋文件→API 變更比對→onboarding 清單→過期標記）
    - 撰寫 API 變更比對指引與遷移指引生成範本
    - 撰寫文件過期偵測指引（180 天閾值）
    - _需求：8.1-8.6_

  - [x] 12.2 實作知識庫搜尋模組
    - 在 `src/knowledge-search.ts` 中實作 `searchKnowledgeBase(entries, keyword)` 函式
    - 搜尋標題與標籤匹配的條目，結果按相關性分數降序排列
    - 實作 `findRelatedDocuments(entries, assetPathOrGuid)` 函式，查詢 relatedAssets 匹配的條目
    - _需求：8.4, 8.5_

  - [x] 12.3 實作 API 變更比對模組
    - 在 `src/api-change-detection.ts` 中實作 `detectApiChanges(usedApis, changeList)` 函式
    - 回傳所有在變更清單中出現且專案有使用的 API，不包含專案未使用的 API
    - _需求：8.2_

  - [x] 12.4 實作文件過期偵測模組
    - 在 `src/staleness-detection.ts` 中實作 `checkStaleness(entry, currentDate)` 函式
    - updatedAt 距今超過 180 天則 status 為 NeedsReview，否則為 Active
    - _需求：8.6_

  - [ ]* 12.5 撰寫 Property 25 屬性測試：API 變更比對正確性
    - **Property 25: API Change Detection**
    - 使用 fast-check 隨機生成 API 集合與變更清單，驗證比對結果的精確性
    - **驗證：需求 8.2**

  - [ ]* 12.6 撰寫 Property 26 屬性測試：知識庫搜尋相關性
    - **Property 26: Knowledge Base Search Relevance**
    - 使用 fast-check 隨機生成 KnowledgeEntry 集合與關鍵字，驗證搜尋結果完整性與排序
    - **驗證：需求 8.4**

  - [ ]* 12.7 撰寫 Property 27 屬性測試：資產關聯文件查詢
    - **Property 27: Asset-Related Document Lookup**
    - 使用 fast-check 隨機生成 KnowledgeEntry 與資產路徑，驗證查詢結果不遺漏匹配條目
    - **驗證：需求 8.5**

  - [ ]* 12.8 撰寫 Property 28 屬性測試：文件過期標記
    - **Property 28: Document Staleness Detection**
    - 使用 fast-check 隨機生成不同日期的 KnowledgeEntry，驗證 180 天閾值判斷正確
    - **驗證：需求 8.6**

  - [x] 12.9 建立 `steering/platform-compatibility.md` steering file
    - 撰寫平台相容性專家角色定義、工作流程（載入 Profile→掃描 Shader→圖形設定→記憶體估算→生成報告）
    - 撰寫各平台 Shader 功能支援清單與替代方案
    - 撰寫記憶體預算估算指引（iOS/Android/Console/WebGL）
    - _需求：9.1-9.7_

  - [x] 12.10 建立所有內建 Platform_Profile JSON 範本
    - 建立 `templates/platform-profiles/ios.json`（iOS 平台設定檔）
    - 建立 `templates/platform-profiles/android.json`（Android 平台設定檔）
    - 建立 `templates/platform-profiles/console.json`（Console 平台設定檔）
    - 建立 `templates/platform-profiles/webgl.json`（WebGL 平台設定檔）
    - 每個 JSON 須符合 PlatformProfile 介面，包含 shaderFeatures、memoryBudget、scriptingConstraints
    - _需求：9.1, 9.6_

  - [x] 12.11 實作平台相容性檢查模組
    - 在 `src/compatibility-check.ts` 中實作 `checkCompatibility(assets, profile)` 函式
    - 識別使用了平台不支援功能的資產，分類為錯誤/警告/建議三個嚴重等級
    - 實作 `suggestShaderAlternatives(unsupportedFeature, profile)` 函式，回傳替代方案
    - _需求：9.2, 9.3, 9.4_

  - [x] 12.12 實作記憶體預算檢查模組
    - 在 `src/memory-budget.ts` 中實作 `checkMemoryBudget(assets, profile)` 函式
    - 標記超出對應類別預算的資產，包含實際估算大小與預算上限
    - _需求：9.5_

  - [ ]* 12.13 撰寫 Property 29 屬性測試：平台相容性檢查與嚴重等級分類
    - **Property 29: Platform Compatibility Check with Severity Classification**
    - 使用 fast-check 隨機生成資產集合與 PlatformProfile，驗證問題識別與三級分類
    - **驗證：需求 9.2, 9.3**

  - [ ]* 12.14 撰寫 Property 30 屬性測試：Shader 替代方案建議
    - **Property 30: Shader Alternative Suggestion**
    - 使用 fast-check 隨機生成不支援的 Shader 功能與 Profile，驗證替代方案建議正確
    - **驗證：需求 9.4**

  - [ ]* 12.15 撰寫 Property 31 屬性測試：記憶體預算檢查
    - **Property 31: Memory Budget Check**
    - 使用 fast-check 隨機生成資產大小與預算設定，驗證超出預算的資產被正確標記
    - **驗證：需求 9.5**

  - [ ]* 12.16 撰寫知識管理與平台相容性單元測試
    - 驗證四個平台各有對應的 Platform_Profile
    - 驗證切換建置平台時自動觸發相容性檢查的 MCP 呼叫序列
    - 測試邊界條件：空知識庫搜尋、無不相容 Shader、記憶體全部在預算內
    - _需求：8.1-8.6, 9.1-9.7_

- [x] 13. Checkpoint — 確認知識管理與平台相容性模組
  - 確保所有測試通過，如有疑問請詢問使用者。

- [x] 14. 實作資產依賴關係管理邏輯（需求 10）
  - [x] 14.1 建立 `steering/asset-dependencies.md` steering file
    - 撰寫資產依賴分析專家角色定義、工作流程（manage_asset get_dependencies→遞迴分析→建構依賴樹→偵測循環→回報）
    - 撰寫孤立資產偵測指引（入度為零的節點）
    - 撰寫 AssetBundle 重複偵測指引
    - 撰寫刪除影響分析指引
    - _需求：10.1-10.6_

  - [x] 14.2 實作依賴關係樹建構模組
    - 在 `src/dependency-analysis.ts` 中實作 `buildDependencyTree(rootAsset, getDeps)` 函式
    - 遞迴建構完整依賴樹，包含所有直接與間接依賴
    - 實作 `findOrphanedAssets(allAssets, referenceGraph)` 函式，回傳入度為零的資產
    - 實作 `analyzeDeleteImpact(asset, referenceGraph)` 函式，回傳所有受影響項目
    - _需求：10.1, 10.2, 10.3, 10.5_

  - [x] 14.3 實作 AssetBundle 重複偵測模組
    - 在 `src/bundle-duplication.ts` 中實作 `detectBundleDuplication(bundles)` 函式
    - 若兩個或以上 Bundle 包含相同資產路徑，回傳所有重複項目及其所屬 Bundle 名稱
    - _需求：10.4_

  - [x] 14.4 整合循環引用偵測（複用 `src/cycle-detection.ts`）
    - 在 `src/dependency-analysis.ts` 中整合 `detectCycles()` 函式用於資產依賴圖
    - 偵測資產依賴圖中的所有循環路徑
    - _需求：10.6_

  - [ ]* 14.5 撰寫 Property 32 屬性測試：依賴關係樹完整性
    - **Property 32: Dependency Tree Completeness**
    - 使用 fast-check 隨機生成資產依賴圖，驗證遍歷完整性（所有直接與間接依賴）
    - **驗證：需求 10.1**

  - [ ]* 14.6 撰寫 Property 33 屬性測試：刪除影響與場景引用分析
    - **Property 33: Delete Impact and Scene Reference Analysis**
    - 使用 fast-check 隨機生成資產引用關係圖，驗證刪除影響分析回傳所有受影響項目
    - **驗證：需求 10.3, 10.5**

  - [ ]* 14.7 撰寫 Property 34 屬性測試：AssetBundle 重複偵測
    - **Property 34: AssetBundle Duplication Detection**
    - 使用 fast-check 隨機生成 Bundle 配置，驗證重複偵測回傳所有重複項目
    - **驗證：需求 10.4**

  - [ ]* 14.8 撰寫 Property 35 屬性測試：孤立資產偵測
    - **Property 35: Orphaned Asset Detection**
    - 使用 fast-check 隨機生成引用關係圖，驗證入度為零的節點集合正確
    - **驗證：需求 10.2**

  - [ ]* 14.9 撰寫 Property 36 屬性測試：資產循環引用偵測
    - **Property 36: Asset Circular Reference Detection**
    - 使用 fast-check 隨機生成含已知循環的有向圖，驗證所有循環被找出且無誤報
    - **驗證：需求 10.6**

  - [ ]* 14.10 撰寫資產依賴管理單元測試
    - 測試邊界條件：空依賴圖、單一資產無依賴、所有資產都被引用（無孤立資產）
    - 測試 AssetBundle 無重複的情境
    - _需求：10.1-10.6_

- [x] 15. Checkpoint — 確認資產依賴管理模組
  - 確保所有測試通過，如有疑問請詢問使用者。

- [x] 16. 建立通用 Steering 與整合測試
  - [x] 16.1 建立 `steering/unity-general.md` steering file
    - 撰寫 Unity 開發通用知識與最佳實踐（專案結構慣例、命名規範、效能通則）
    - 撰寫 MCP 連線健康檢查指引（project_info 探測→失敗提示）
    - 撰寫 Cloud_Assist 降級策略指引（網路不可用→自動降級至本地 MCP）
    - 撰寫批次操作部分失敗處理指引
    - _需求：全部（通用基礎）_

  - [x] 16.2 實作 MCP 連線健康檢查模組
    - 在 `src/mcp-health.ts` 中實作 `checkMcpHealth(serverUrl)` 函式
    - 嘗試讀取 project_info 資源，成功則回傳健康，失敗則回傳具體錯誤提示
    - _需求：全部（MCP 連線基礎）_

  - [ ]* 16.3 撰寫 MCP 整合測試（使用 Mock）
    - 在 `tests/integration/mcp-integration.test.ts` 中建立 MCP server mock
    - 測試完整工作流：資產批次操作、場景生成、建置觸發、效能分析
    - 驗證 MCP 工具呼叫序列的正確性
    - 測試 MCP 連線失敗與重試邏輯
    - _需求：全部_

- [x] 17. 最終 Checkpoint — 確保所有測試通過
  - 確保所有單元測試、屬性測試與整合測試通過，如有疑問請詢問使用者。

## 備註

- 標記 `*` 的任務為可選任務，可跳過以加速 MVP 開發
- 每個任務都引用了對應的需求編號以確保可追溯性
- Checkpoint 任務確保遞增式驗證
- 屬性測試驗證通用正確性屬性（36 個 Property 全部覆蓋）
- 單元測試驗證具體範例與邊界條件
- 所有 TypeScript 工具模組位於 `src/` 目錄，測試位於 `tests/` 目錄
- Steering files 與 JSON 範本為 Power 套件的核心價值，需包含深度 Unity 領域知識
