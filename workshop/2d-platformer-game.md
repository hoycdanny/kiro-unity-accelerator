# 2D 跳躍平台遊戲 Workshop 🧱

> **這份文件的用途**：從零開始，透過複製貼上 Prompt 給 Kiro，一步一步做出一個可以玩的 2D 橫向捲軸跳躍平台遊戲（方塊冒險家）。每個步驟都包含「目標說明」與「複製貼上的 Prompt」，照順序貼上即可。
>
> 本 Workshop 使用 [kiro-unity-accelerator](../POWER.md) Power，透過 [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp) 控制 Unity Editor。所有步驟都是自然語言指令 —— 你不需要懂 MCP 工具的實際語法，Kiro 會自動翻譯成正確的工具呼叫。

---

## 開始之前（前置準備）

請確認以下條件都已滿足：

1. **Unity Editor 已開啟**，且已開啟一個 2D 專案，使用 URP 2D Renderer。
   版本政策：本 Power 以 **Unity 6.4**（發布串流 `6000.4`，最新修補版 `6000.4.12f1`）為基準，支援的最低 Editor 版本是 **Unity 6.0（`6000.0`）**。本 Workshop 實機查核過的組合是 **Unity `6000.4.6f1` + URP 17.4.0**。Unity 6.5 / 6.6 及之後的 6.x 預期可用但未在此驗證；要鎖定版本進入正式生產，請改用 **Unity 6.3 LTS**（支援至 2027 年 12 月）。**Unity 6.0 LTS 已於 2026-10-16 結束支援，請勿使用。**
2. **MCP for Unity 橋接已就緒**：Unity Editor → `Window → MCP for Unity`，確認狀態面板顯示 **Connected**。若不是，用同一個視窗裡的重新啟動（Restart）動作把橋接伺服器重開。套件版本請用 **v10.3.0 或更新版本（最低 v10.0.0）**。
3. **本 Power 已安裝**並在 Kiro 中啟用（Powers 面板 → 確認 kiro-unity-accelerator 已啟用）
4. 在 Kiro 對話框貼上第一句健康檢查 Prompt，確認連線正常：

```
請確認 Unity MCP 連線是否正常，並告訴我目前專案的 Unity 版本、Render Pipeline、目前場景名稱，以及 Player Settings 裡的 Active Input Handling 設定（Legacy Input Manager / New Input System / Both）。之後所有腳本裡讀取鍵盤輸入的部分，請依照這個設定選用對應的 API（New Input System 用 Keyboard.current，Legacy 用 UnityEngine.Input）。
```

**預期結果**：Kiro 會回報 Unity 版本、Render Pipeline、目前場景名稱、以及 Input 系統設定，並在後續所有腳本中套用正確的輸入 API。

> **Unity 6.4 的 Input 補充**：6.4 的 Input System 套件新增了 `OnMouse*` 事件支援，作為從舊 Input Manager 遷移的過渡路徑 —— 如果專案還留著依賴 `OnMouseDown` 這類訊息的舊腳本，切到 New Input System 之後它們仍可運作。本 Workshop 的腳本仍以上面查到的 Active Input Handling 設定為準。來源：[New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64)（2026-10-21 取得）。

> **Unity 6.4 的物理 API 名稱（這份 Workshop 會一直用到）**
>
> 6.4 把 `Rigidbody2D` 幾個常用成員標記為 obsolete。本 Workshop 的 Prompt 都已經指名新名稱，請讓 Kiro 照著寫，不要用舊名稱（舊名稱還能編譯，但會產生一堆過時警告）：
>
> | 舊名稱（obsolete） | 現在要用 | 適用範圍 |
> |---|---|---|
> | `velocity` | `linearVelocity` | 2D 與 3D 都適用 |
> | `velocityX` / `velocityY` | `linearVelocityX` / `linearVelocityY` | 只有 2D |
> | `drag` | `linearDamping` | 2D 與 3D 都適用 |
> | `angularDrag` | `angularDamping` | 2D 與 3D 都適用 |
> | `isKinematic` | `bodyType`（`RigidbodyType2D`） | **只有 `Rigidbody2D`** |
>
> **特別注意這個不對稱**：`isKinematic` 只有在 `Rigidbody2D` 上是 obsolete；3D `Rigidbody.isKinematic` 仍然是有效、沒有被標記 obsolete 的屬性，**不要把 3D 的 `isKinematic` 改成 `bodyType`**。
>
> 來源：對實機 Unity `6000.4.6f1` 編輯器（bridge 9.6.8）呼叫 `unity_reflect(action: "get_type", class_name: "Rigidbody2D")` 與 `class_name: "Rigidbody"`，讀取回應裡的 `obsolete_members` 欄位（2026-10-21）。換到別的 Unity 版本時，用同一個呼叫重新確認，不要憑記憶。
>
> 這張對照表後來也在實機上**寫入並讀回驗證過**（bridge 10.3.0，2026-10-21）：用 `manage_components(action: "set_property", component_type: "Rigidbody", properties: {linearDamping: 2.25, useGravity: false, mass: 7.5})` 設定成功，再用 `execute_code` 讀回得到 `mass=7.5 linearDamping=2.25 useGravity=False`。也就是說 6.4 的新名稱 `linearDamping` 確實可以透過 MCP 橋接設定，而且 `properties` 字典形式可以一次設定多個屬性。

---

## 步驟 0：確認連線（工具群組先不用動）

**目標**：確認 Kiro 真的連得上 Unity，然後就可以直接開始。

**複製貼上這段 Prompt：**

```
請呼叫 manage_scene(action: "get_active") 確認 MCP 連線正常，並回報目前開啟的場景名稱。
```

**預期結果**：Kiro 回報目前的場景（例如 `SampleScene`）。

> **不需要預先啟用工具群組。** MCP for Unity 把工具分成 **10 個群組**，bridge 宣告的預設值只有 `core`，但在本 Power 實機驗證的那台機器上，**本 Workshop 用到的工具在任何 `manage_tools` 呼叫之前就都可以呼叫**（bridge 9.6.8 當時是 43 個，含 `execute_code`、`run_tests`、`manage_ui`、`manage_profiler`；升級到 10.3.0 後實測清單是 49 個，預設關閉群組裡的工具一樣直接可用）。所以請直接做後面的步驟，不要先跑一串 activate。唯一不要去啟用的是第十個群組 `asset_gen` — 它已實測確認預設關閉，而且裡面的工具會花你自己的錢。
>
> **只有在 Kiro 回報某個工具「不存在」時**，才依序執行：
>
> ```
> manage_tools(action: "list_groups")                        # 看群組目錄
> manage_tools(action: "sync")                               # 採用 Unity Tools 視窗裡的開關狀態
> manage_tools(action: "activate", group: "scripting_ext")   # execute_code 所在的群組
> manage_tools(action: "activate", group: "testing")         # run_tests／get_test_job（步驟 12）
> manage_tools(action: "activate", group: "ui")              # manage_ui（只有改用 UI Toolkit 才需要）
> ```
>
> **三個必須知道的細節**：
> 1. `list_groups` 的 `enabled`／`default_enabled` 欄位會誤導人：實機驗證時，八個非 core 群組在 `reset` 前後都回報 `enabled: false`，但那些工具全都能正常呼叫。**不要拿這個欄位當作「工具不可用」的證據**，要以重試是否成功來判斷。
> 2. 部分 MCP client 會**快取工具清單**，`activate` 之後新工具可能要等 client 重新整理或重新連線才會出現。
> 3. 如果錯誤訊息是 `Tool call denied by user's permissions`，那是 Kiro 的權限規則擋下來的，跟群組和 Unity 都無關 —— 請檢查 `~/.kiro/settings/permissions.yaml` 裡 `capability: mcp` 且 `effect: deny` 的規則。
>
> `manage_tools(action: "deactivate", ...)` 是真的會生效的（實機驗證過），所以不要在流程中隨意關閉群組；要回到乾淨狀態用 `manage_tools(action: "reset")`。

---

## 這個遊戲長什麼樣子

**遊戲名稱**：方塊冒險家（Block Adventurer）
**類型**：2D 橫向捲軸跳躍平台遊戲（Side-scrolling Platformer）
**核心玩法**：
- 玩家操控角色，左右移動並跳躍，跨越一個個平台
- 攝影機會隨玩家水平移動而跟隨
- 收集散落在關卡中的水晶可以加分
- 遇到會來回巡邏的敵人：從上方跳下去踩到牠會被擊敗並加分並讓玩家小幅彈跳；從側面碰到牠則玩家會扣一條生命
- 關卡中有尖刺等危險機關，碰到會扣一條生命並重生回起點
- 抵達關卡終點會顯示「過關」畫面
- 生命值歸零會顯示「遊戲結束」畫面，並可以重新開始
- 畫面上即時顯示分數與生命值

這是 2D 平台遊戲最經典的入門類型，很適合用來練習：2D 物理與重力、跳躍手感調校、攝影機跟隨、觸發式互動（收集/傷害/過關）、以及基本的關卡管理迴圈（移動 → 互動 → 分數/生命 → 結局）。

---

## 步驟 1：場景與環境建置

**目標**：建立場景、攝影機、光源，並搭建一段簡單的平台關卡地形。

**複製貼上這段 Prompt：**

```
請幫我建立一個新的 2D 場景，命名為 "BlockAdventure"。場景需要：

1. 一個正交（orthographic）攝影機，命名為 Main Camera，tag 設為 MainCamera：
   - 位置 (0, 0, -10)（2D 場景標準佈局：所有 Sprite 畫在 z=0，攝影機退到 z=-10 往 +Z 看）
   - Orthographic Size 設為 5
   - 背景顏色設為明亮的天空藍

2. 一個 Global Light 2D（lightType 設為 Global，白色，intensity = 1）。如果專案的 Render Pipeline 是 URP，之後建立的 Sprite 材質預設會是需要光照的 Lit shader，所以場景需要一個全域光源才能正常顯示顏色

3. 建立地面與平台，全部使用 Tag "Ground"（如果 Tag 不存在請先建立），元件是 SpriteRenderer（先指派好 Sprite）+ BoxCollider2D（size 依照 Sprite 大小設定，不是 Trigger）：
   - 一段長條形地面 Ground_Base，放在畫面下方，例如位置 (0, -3, 0)，尺寸做成長條形（例如寬 20、高 1，可以用 localScale 拉伸一個方形 Sprite 達到這個比例）
   - 三個懸空平台 Platform_1、Platform_2、Platform_3，錯落分布在不同高度與 X 位置（例如 (4, -1, 0)、(8, 1, 0)、(12, -0.5, 0)），方便之後測試跳躍

4. 場景建立好之後請存檔

完成後請列出場景 Hierarchy，並確認攝影機位置、光源、以及每個地面/平台物件的 Collider 尺寸都已正確設定（不是 0）。
```

**預期結果**：Kiro 會建立場景、攝影機（z=-10）、Global Light 2D，以及一段地面加三個懸空平台，全部都有正確尺寸的 BoxCollider2D 並標記 Tag "Ground"。

---

## 步驟 2：玩家角色：移動與跳躍

**目標**：建立可以左右移動、跳躍、且會受重力影響落地的角色。

**複製貼上這段 Prompt：**

```
請在目前場景建立玩家角色物件，規格如下：

- 名稱：Player，Tag 設為 "Player"（如果 Tag 不存在請先建立）
- 一個 Sprite（先用簡單的方形色塊代表，之後可以換成美術素材）
- 元件：SpriteRenderer（先指派好 Sprite）、Rigidbody2D（Gravity Scale 設為 3，讓下落手感稍微紮實一點；Freeze Rotation Z 打勾，避免角色因碰撞亂轉）、BoxCollider2D（size 依照 Sprite 大小設定，完成後回報數值）
- 位置放在 Ground_Base 上方，例如 (-6, -1.5, 0)

幫我寫一個 C# 腳本 PlayerController，掛在 Player 上，功能：
- 左右移動：用方向鍵或 A/D 控制，速度用 public 變數 moveSpeed（預設 6），直接設定 Rigidbody2D 的水平速度 —— 請用 Unity 6.4 的 `linearVelocity`（例如 `rb.linearVelocity = new Vector2(input * moveSpeed, rb.linearVelocity.y)`），**不要用已經 obsolete 的 `velocity`**；也不要用 MovePosition，因為需要保留重力對垂直速度的影響
- 跳躍：按下跳躍鍵（空白鍵）時，如果角色目前在地面上，給予一個向上的瞬間速度，大小用 public 變數 jumpForce（預設 12）；同樣透過 `linearVelocity` 設定垂直分量（`rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce)`）
- 地面偵測（isGrounded）：在腳本裡用 Physics2D.OverlapBox 做檢測，位置取角色 BoxCollider2D 底部邊緣往下一點的位置（用 `collider.bounds.center` 減去 `collider.bounds.extents.y` 再往下偏移約 0.1 個單位計算），偵測範圍是一個扁的小方框（寬度略小於角色本身、高度約 0.2），只要偵測到的物件 Tag 是 "Ground" 就視為在地面上。這個判定請在 FixedUpdate 裡持續更新
- 依照專案的 Input System 設定選用對應 API

完成後幫我確認腳本編譯無誤，並簡單說明地面偵測的具體位置與範圍是怎麼計算的。
```

**預期結果**：Player 建立完成，Tag 為 "Player"，BoxCollider2D 尺寸正確。`PlayerController.cs` 編譯無誤，具備左右移動、跳躍、以及依附著 Collider 底部計算的地面偵測邏輯。

---

## 步驟 3：攝影機跟隨玩家

**目標**：讓攝影機隨著玩家左右移動自動跟隨，維持角色在畫面中的視野。

**複製貼上這段 Prompt：**

```
請幫我寫一個攝影機跟隨腳本 CameraFollow.cs，掛在 Main Camera 上：

- 用 public Transform target 欄位指定要跟隨的目標（Start() 時如果沒有手動指定，就用 Tag "Player" 自動找到玩家並設定）
- 在 LateUpdate() 裡，讓攝影機的 X、Y 座標平滑跟隨 target 的 X、Y（用 Vector3.Lerp 或 Vector3.SmoothDamp，速度用 public 變數 followSpeed 控制，預設 5），Z 座標維持攝影機原本的 -10 不變
- 幫我把這個腳本掛到 Main Camera 上，並確認 target 有正確找到 Player

完成後幫我確認腳本編譯無誤，並回報 Main Camera 上 CameraFollow 元件的 target 欄位是否已正確指向 Player。
```

**預期結果**：`CameraFollow.cs` 建立並掛載到 Main Camera，攝影機會平滑跟隨玩家的水平（與垂直）移動，Z 軸維持不變。

---

## 步驟 4：遊戲管理器：分數與生命值

**目標**：建立集中管理分數、生命值與重生邏輯的核心腳本。

**複製貼上這段 Prompt：**

```
請幫我建立一個 GameManager 空物件，掛上腳本 GameManager.cs，用 Singleton 模式（static Instance）讓其他腳本可以呼叫：

- public int score（預設 0）、public int lives（預設 3）
- private Vector3 respawnPoint，在 Start() 時記錄 Player 目前的初始位置（用 Tag "Player" 找到玩家）作為預設重生點
- 方法 AddScore(int amount)：加分
- 方法 LoseLife()：扣一條生命；如果扣完後 lives > 0，把 Player 的位置重設到 respawnPoint、並把 Player 的 Rigidbody2D 速度歸零（用 Unity 6.4 的 `linearVelocity`：`rb.linearVelocity = Vector2.zero`，不要用已經 obsolete 的 `velocity`；避免重生後還帶著原本的墜落速度）；如果 lives <= 0，觸發遊戲結束（先在 Console 印出 "Game Over" 即可，之後步驟會做畫面）
- 方法 ReachGoal()：觸發過關（先在 Console 印出 "Level Complete" 即可，之後步驟會做畫面）

完成後幫我測試編譯，並確認 GameManager 的 score、lives 初始值正確，且 respawnPoint 有正確記錄到 Player 的起始位置。
```

**預期結果**：`GameManager.cs` 建立完成並掛載在場景中，具備分數、生命值、重生點記錄、扣血重生、以及過關/結束的觸發方法（先用 Console 訊息代表，UI 會在後面步驟接上）。

---

## 步驟 5：收集道具

**目標**：在關卡中放置可以撿取加分的水晶。

**複製貼上這段 Prompt：**

```
請幫我建立收集道具系統：

1. 建立一個水晶 Prefab，名稱 Crystal：
   - Sprite（先用簡單的菱形或方形色塊代表，顏色跟地面、玩家都不同），SpriteRenderer 先指派好 Sprite
   - 一個 Collider2D（isTrigger = true），尺寸依照 Sprite 大小設定
   - 腳本 CollectibleItem.cs：OnTriggerEnter2D 偵測 Tag 為 "Player" 的物件，命中時呼叫 GameManager.Instance.AddScore(一個 public int scoreValue 欄位，預設 10)，然後銷毀自己
   - 存成 Prefab（Assets/Prefabs/Crystal.prefab）

2. 在關卡中的三個平台（Platform_1、Platform_2、Platform_3）正上方各放一個 Crystal 實例，方便玩家跳上平台時順路收集

完成後幫我確認 Crystal 的 Collider 尺寸正確、Prefab 已建立，並列出目前場景中新增的 Crystal 實例位置。
```

**預期結果**：`Crystal` Prefab 建立完成，並在三個平台上方各放置一個實例。玩家碰到會加分並消失。

---

## 步驟 6：敵人與踩踏機制

**目標**：建立會巡邏的敵人，玩家可以從上方跳下去踩擊敗，從側面碰到則會受傷。

**複製貼上這段 Prompt：**

```
請幫我建立敵人系統：

1. 建立敵人 Prefab，名稱 Patroller，Tag 設為 "Enemy"（如果 Tag 不存在請先建立）：
   - Sprite（用另一種顏色的色塊代表），SpriteRenderer 先指派好 Sprite
   - Rigidbody2D（Gravity Scale = 0，敵人在平台上左右巡邏、不需要掉落）、Collider2D（isTrigger = true，尺寸依照 Sprite 大小設定）
   - 腳本 Patroller.cs：
     - 在兩個邊界之間來回水平移動，用 public float moveSpeed（預設 2）跟 public float patrolDistance（預設 2，代表從初始位置往左右各移動的距離）控制，用 Sin 波或簡單的方向翻轉都可以，實作上你可以自由選擇
     - 提供一個 public 方法 Defeat()：呼叫這個方法時銷毀自己（並可以之後接特效/音效）
   - 存成 Prefab（Assets/Prefabs/Patroller.prefab）

2. 修改 PlayerController.cs，加上踩踏判定：偵測 OnTriggerEnter2D，如果碰到的物件 Tag 是 "Enemy"：
   - 如果玩家當下 Rigidbody2D 的垂直速度小於 0（代表正在下落；請讀 Unity 6.4 的 `rb.linearVelocity.y`，不要用已經 obsolete 的 `velocity`）且玩家目前的 Y 座標高於敵人的 Y 座標（代表是從上方接觸），視為「踩踏」：呼叫該敵人的 Defeat() 方法，並透過 `linearVelocity` 給玩家一個小幅向上的瞬間速度（例如 jumpForce 的一半），同時呼叫 GameManager.Instance.AddScore(20)
   - 否則視為「側面碰撞」：呼叫 GameManager.Instance.LoseLife()

3. 在關卡中的地面上放置兩個 Patroller 實例，位置分別在 (2, -2, 0) 跟 (10, -2, 0)

完成後幫我確認腳本編譯無誤，並簡單說明踩踏跟側面碰撞的判定條件分別是什麼。
```

**預期結果**：`Patroller` Prefab 與 `Patroller.cs` 建立完成，兩個敵人在地面上巡邏。`PlayerController.cs` 新增踩踏判定邏輯：從上方踩會擊敗敵人並加分，從側面碰到會扣生命。

---

## 步驟 7：危險機關

**目標**：加入接觸就會扣生命的尖刺機關。

**複製貼上這段 Prompt：**

```
請幫我建立危險機關：

1. 建立一個尖刺 Prefab，名稱 Spike，Tag 設為 "Hazard"（如果 Tag 不存在請先建立）：
   - Sprite（用醒目的顏色如紅色代表），SpriteRenderer 先指派好 Sprite
   - Collider2D（isTrigger = true，尺寸依照 Sprite 大小設定）
   - 腳本 Hazard.cs：OnTriggerEnter2D 偵測 Tag 為 "Player" 的物件，命中時呼叫 GameManager.Instance.LoseLife()
   - 存成 Prefab（Assets/Prefabs/Spike.prefab）

2. 在地面上放置一個 Spike 實例，位置大約在兩個平台之間的地面上（例如 (6, -2.3, 0)），讓玩家需要跳過去而不是直接走過去

完成後幫我確認 Spike 的 Collider 尺寸正確，並確認碰到 Spike 會扣生命且觸發重生（依照步驟 4 GameManager.LoseLife() 的邏輯，會把玩家傳回重生點）。
```

**預期結果**：`Spike` Prefab 建立完成並放置在關卡中，玩家碰到會扣一條生命並重生回起點。

---

## 步驟 8：過關終點

**目標**：抵達關卡終點觸發過關。

**複製貼上這段 Prompt：**

```
請幫我建立關卡終點：

1. 建立一個終點旗桿 Prefab，名稱 Goal，Tag 設為 "Goal"（如果 Tag 不存在請先建立）：
   - Sprite（用顯眼的顏色代表，例如金色或綠色的直立長條），SpriteRenderer 先指派好 Sprite
   - Collider2D（isTrigger = true，尺寸依照 Sprite 大小設定）
   - 腳本 Goal.cs：OnTriggerEnter2D 偵測 Tag 為 "Player" 的物件，命中時呼叫 GameManager.Instance.ReachGoal()
   - 存成 Prefab（Assets/Prefabs/Goal.prefab）

2. 把 Goal 放在關卡最右側，例如位置 (15, -2, 0)，確保玩家依照關卡佈局跳過平台跟機關後能夠到達

完成後幫我確認 Goal 的 Collider 尺寸正確，並確認碰到 Goal 會呼叫 GameManager.Instance.ReachGoal()。
```

**預期結果**：`Goal` Prefab 建立完成並放置在關卡終點，玩家抵達會觸發 `GameManager.ReachGoal()`。

---

## 步驟 9：HUD 畫面顯示

**目標**：畫面上即時顯示分數與生命值。

**複製貼上這段 Prompt：**

```
請幫我加上遊戲中的 HUD（畫面資訊顯示），UI 部分請用傳統 uGUI（Canvas + Text 元件，透過 GameObject 加元件的方式建立，不是 UI Toolkit 的 UXML/USS）：

1. 建立一個 UI Canvas，命名 HUDCanvas：
   - 左上角文字「Score: 0」，命名 ScoreText
   - 右上角文字「Lives: 3」，命名 LivesText
   - 場景中如果還沒有 EventSystem，請一併建立（並依照專案的 Input System 設定選用對應的 Input Module）

2. 修改 GameManager.cs：
   - 新增 [SerializeField] 的 Text 欄位 scoreText、livesText
   - AddScore 跟 LoseLife 執行時，同步更新這兩個文字內容
   - 在 Start() 時也呼叫一次更新，確保遊戲一開始就顯示正確初始值

3. 把 HUDCanvas 底下的 ScoreText、LivesText 指派到 GameManager 對應的欄位，並存檔後重新讀取確認參照已正確寫入場景

完成後幫我確認 HUD 顯示的初始值跟 GameManager 的預設值（score=0, lives=3）一致。
```

**預期結果**：畫面左上角顯示「Score: 0」、右上角顯示「Lives: 3」，且隨遊戲進行即時更新，欄位參照已存檔寫入場景。

---

## 步驟 10：結局畫面與重新開始

**目標**：過關與遊戲結束時顯示對應畫面，並可以重新開始。

**複製貼上這段 Prompt：**

```
請幫我做關卡結局的處理，UI 部分同樣用傳統 uGUI：

1. 建立一個 UI Canvas，命名 LevelCompleteCanvas，裡面放：
   - 一個全螢幕半透明黑色背景（Image，顏色約 (0,0,0,0.75)）
   - 文字（Text）顯示「LEVEL COMPLETE」，字體大一點（例如 64pt），置中
   - 一個按鈕（Button），文字顯示「重新開始」
   - 預設隱藏（不要一開始就顯示）

2. 建立第二個 UI Canvas，命名 GameOverCanvas，結構跟上面一樣，但文字改成「GAME OVER」，預設也是隱藏

3. 修改 GameManager.cs：
   - ReachGoal() 執行時，顯示 LevelCompleteCanvas，並停用玩家的移動輸入（可以停用 PlayerController 元件本身）
   - LoseLife() 當生命歸零時，顯示 GameOverCanvas，並同樣停用玩家的移動輸入
   - 兩個畫面上的「重新開始」按鈕都綁定重新載入目前場景（SceneManager.LoadScene）

完成後幫我確認兩個結局畫面預設都是隱藏的，並列出它們的 UI 物件層級結構。
```

**預期結果**：`LevelCompleteCanvas` 與 `GameOverCanvas` 建立完成並預設隱藏，過關或生命歸零時會顯示對應畫面並停用玩家操作，按「重新開始」會重載場景。

---

## 步驟 11：（選用）特效與音效

**目標**：加上跳躍、收集、擊敗敵人的視覺與音效反饋。

**複製貼上這段 Prompt：**

```
請幫我加上簡單的視覺與音效反饋：

1. 敵人被踩踏擊敗時，在該位置生成一個簡單的粒子特效（ParticleSystem，白色/黃色粒子向外噴發，持續時間 0.3 秒左右），播完自動銷毀
2. 玩家撿到 Crystal 時，同樣生成一個小型閃光粒子特效

3. 音效檔案我自己準備（不要用 AI 生成音效的工具）。請幫我：
   - 建立 Assets/Audio/SFX/ 資料夾
   - 告訴我可以去哪裡下載免費音效（跳躍：短促的 boing/hop，0.5 秒內；收集：清脆的叮咚聲，0.5 秒內；敵人被擊敗：短促的 pop，0.5 秒內）

4. 在 PlayerController.cs 跳躍時、CollectibleItem.cs 被撿取時、Patroller.cs 被擊敗時播放對應音效：請加上 AudioSource 與可在 Inspector 指派的 AudioClip 欄位，並告訴我音效檔放進專案後要怎麼指派

完成後跟我確認粒子特效跟音效接線有沒有正確套用。
```

**預期結果**：擊敗敵人與收集水晶時有粒子特效；三個音效的 AudioSource/AudioClip 欄位都接好，等你把音效檔放進 `Assets/Audio/SFX/` 並在 Inspector 指派後就會發聲。

> **為什麼不請 Kiro 生成音效**：MCP for Unity 有一個 `asset_gen` 工具群組（`generate_audio`、`generate_image`、`generate_model` 等），但它**預設關閉（已在 bridge 10.3.0 上以 `manage_tools(action: "list_groups")` 實測確認：`enabled: false`、`default_enabled: false`）**，而且會呼叫第三方服務、消耗開發者自備的 API 金鑰與點數。本 Power **刻意不把任何工作流、steering 檔或範本路由到 `asset_gen`**（見 `POWER.md` 的「Generative Tools (`asset_gen` group) — awareness only」）。所以這個步驟走手動路線：免費音效可以在 Unity Asset Store 的免費音效包、[freesound.org](https://freesound.org/)（注意各檔案的授權條款）或 [kenney.nl](https://kenney.nl/assets)（CC0）找到。真的想用 AI 生成，請自行啟用該群組並自備金鑰，那是一次明確的、你自己決定的動作，不該由本 Workshop 代替你決定。

> **Unity 6.4 的 2D 畫面進階選項**：6.4 起可以把**自訂 render pass 注入 URP 2D 的 frame loop**，也就是能為 2D 專案加上自訂渲染與後處理（例如全畫面受傷閃紅、過關時的色調變化），不必再繞過 2D Renderer。這屬於超出本 Workshop 範圍的進階題，但如果之後想做畫面特效，這是 6.4 該走的路。另外要注意：URP Compatibility Mode 與 `URP_COMPATIBILITY_MODE` 腳本定義在 6.4 已**完全移除**，自訂 render pass 只剩 Render Graph 一條路。來源：[New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) 與 [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64)（皆於 2026-10-21 取得）。

---

## 步驟 12：測試與建置

**目標**：確認沒有錯誤，並建置成可執行檔。

**複製貼上這段 Prompt：**

```
遊戲的核心玩法都做好了，請幫我做最後檢查：

1. 讀一次 Console，確認沒有任何錯誤或警告訊息，如果有請解讀並修正
2. 確認目前場景已經加進 Build Settings 的場景清單裡
3. 建置一個 Windows 版本的開發版執行檔，輸出到 Builds/Windows/ 資料夾

建置完成後跟我報告建置結果（成功/失敗、耗時、輸出路徑、有沒有警告）。
```

**預期結果**：Kiro 會確認場景無誤、加入 Build Settings，並完成建置，回報結果與輸出路徑。

---

## 完成後你會得到什麼

跑完以上 12 個步驟，你會有一個功能完整、可以實際遊玩的 2D 跳躍平台遊戲，包含：
- 可左右移動、跳躍、受重力影響的角色
- 會平滑跟隨玩家的攝影機
- 一段包含地面、懸空平台、收集道具、巡邏敵人、危險機關與終點的關卡
- 踩踏擊敗敵人與側面碰撞受傷的雙重互動機制
- 完整的分數、生命值與重生系統
- 過關與遊戲結束畫面，皆可重新開始
- 即時 HUD 顯示
- （選用）音效與粒子特效
- 一份可執行的建置檔

---

## 延伸挑戰（做完基本版之後可以試試）

想繼續練習的話，可以把以下需求直接改寫成 Prompt 貼給 Kiro：

1. **檢查點系統**：在關卡中段放置檢查點 Prefab，玩家經過後更新 GameManager 的重生點，不用每次扣命都回到最初起點
2. **雙段跳／土狼時間（Coyote Time）**：讓跳躍手感更寬容，允許離開平台邊緣後極短時間內仍可跳躍，或允許在空中再跳一次
3. **移動平台**：讓其中一個平台左右或上下來回移動，玩家站上去會跟著平台移動
4. **多關卡與過關銜接**：建立第二個關卡場景，過關畫面的按鈕改成載入下一關而不是重新開始
5. **道具強化**：收集特定道具後讓玩家獲得暫時的速度提升、無敵時間或額外一次跳躍機會
6. **關卡編輯素材化**：把地面跟平台改成用 Tilemap 繪製，取代目前用單一色塊拉伸的做法，方便之後手繪關卡地形

---

*本 Workshop 依 [kiro-unity-accelerator](../POWER.md) Power 撰寫。*
