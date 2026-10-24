# 2D 太空射擊遊戲 Workshop 🚀

> **這份文件的用途**：從零開始，透過複製貼上 Prompt 給 Kiro，一步一步做出一個可以玩的 2D 俯視角太空射擊遊戲（銀河守衛戰）。每個步驟都包含「目標說明」與「複製貼上的 Prompt」，照順序貼上即可。
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

> **Unity 6.4 的物理 API 名稱（只要用 Rigidbody2D 驅動移動就會用到）**
>
> 6.4 把 `Rigidbody2D` 幾個常用成員標記為 obsolete。這份 Workshop 的移動邏輯如果用 Rigidbody2D 來推，請讓 Kiro 用新名稱（舊名稱還能編譯，但會產生一堆過時警告）：
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
> 至於 Prompt 裡的 **Gravity Scale**（`gravityScale`），那是沒有被標記 obsolete 的屬性，照寫即可。
>
> 來源：對實機 Unity `6000.4.6f1` 編輯器（bridge 9.6.8）呼叫 `unity_reflect(action: "get_type", class_name: "Rigidbody2D")` 與 `class_name: "Rigidbody"`，讀取回應裡的 `obsolete_members` 欄位（2026-10-21）。換到別的 Unity 版本時，用同一個呼叫重新確認，不要憑記憶。
>
> 這張對照表後來也在實機上**寫入並讀回驗證過**（bridge 10.3.0，2026-10-21）：用 `manage_components(action: "set_property", component_type: "Rigidbody", properties: {linearDamping: 2.25, useGravity: false, mass: 7.5})` 設定成功，再用 `execute_code` 讀回得到 `mass=7.5 linearDamping=2.25 useGravity=False`。也就是說 6.4 的新名稱 `linearDamping` 確實可以透過 MCP 橋接設定，而且 `properties` 字典形式可以一次設定多個屬性。

> **這類「建立物件 → 寫腳本 → 掛上腳本」的流程已經在實機跑過驗收測試，而且通過了**（bridge 10.3.0，2026-10-21）
>
> 驗收測試跑的是姊妹篇 `2d-platformer-game.md` 的步驟 2，流程跟本篇步驟 2 完全同型：建立 Player（`components_to_add` 一次掛上 SpriteRenderer + Rigidbody2D + BoxCollider2D 並設定 tag）→ 設定 Rigidbody2D 屬性 → 寫一支用 `linearVelocity` 的 `PlayerController` → 編譯 → 掛上腳本 → 讀回物件確認。
>
> **最重要的結果**：那支用 6.4 新 API `linearVelocity` 寫的腳本編譯出來是 **0 個錯誤、0 個過時 API 警告**（`validate_script` 回報 0 errors，只有 1 個分析器警告說某個欄位沒指派；`read_console(types: [error, warning], filter_text: "PlayerController")` 回報 **0 筆**），型別確實有載入（`execute_code` 回報 `loaded: PlayerController base=MonoBehaviour`），腳本真的掛成元件。如果照舊寫法用 `rb.velocity`，6.4 就會冒出一串過時警告 —— 所以上面那張對照表是**照 Workshop 的寫法實際驗證過的**，不是只查文件。
>
> 同一次驗收也首次驗證了 `manage_scene` 的 `create`／`save`／`load`（`create` 會自動建立目標資料夾）、`manage_gameobject` 的 `components_to_add`，以及 `manage_components(set_property)` 可以用物件**名稱**當 `target`。

> **掛腳本時的型別名稱規則（不照這個寫，掛載一定失敗）**
>
> `manage_components(action: "add")` 對「Unity 內建型別」和「你自己寫的腳本」解析方式不同 —— 實機驗證（bridge 10.3.0，2026-10-21）：
>
> | `component_type` 傳什麼 | 結果 |
> |---|---|
> | `"PlayerController"`（自己寫的腳本，只給短名稱） | **失敗** —— `Component type 'PlayerController' not found. Use a fully-qualified name if needed.` |
> | `"PlayerController, Assembly-CSharp"` | **成功** |
> | `"Rigidbody2D"`、`"SpriteRenderer"`、`"BoxCollider2D"`、`"CircleCollider2D"`（內建型別） | **成功**，短名稱就可以 |
>
> **規則：內建型別用短名稱；自己寫的腳本（`PlayerController`、`Bullet`、`Enemy`、`EnemySpawner`、`GameManager`）要用 `型別名稱, Assembly-CSharp`。**（腳本放在 assembly definition 裡的話，就換成那個 assembly 的名稱。）
>
> 這**不是編譯還沒完成的時序問題**：同一個編輯器裡用 `execute_code` 確認 `System.Type.GetType("PlayerController, Assembly-CSharp")` 已經回報 `loaded: PlayerController base=MonoBehaviour` 之後，再重試一次短名稱，還是失敗。
>
> 另外要注意：**`refresh_unity(wait_for_ready: true)` 不會真的等**（實機驗證）。它會立刻回來，`resulting_state` 還是 `compiling`，緊接著的 `manage_components(add)` 就因為組件還沒重新載入而失敗。寫完腳本要編譯之後才掛元件的話，必須等到編輯器真的就緒（輪詢 `mcpforunity://editor/state` 直到 `data.advice.ready_for_tools` 為 true，這也是 `refresh_unity` 回應裡 `hint` 自己說的做法），或是失敗就重試。

> **場景改動要存檔才算數**：`manage_gameobject` 的建立／修改／刪除，以及任何場景改動，都只動到**記憶體裡**的場景。沒有呼叫 `manage_scene(action: "save")`，磁碟上的場景檔完全沒變，而切換或重新載入場景會把未存檔的改動丟掉、再把舊檔案讀回來（實機驗證：某個刪掉但沒存檔的物件，在切場景再切回來之後**又出現了**，root 數從 3 變成 4）。本 Workshop 的步驟 1 已經要求存檔，後面每次做完一批改動也請讓 Kiro 存檔。

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
> manage_tools(action: "activate", group: "testing")         # run_tests／get_test_job（步驟 10）
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

**遊戲名稱**：銀河守衛戰（Galaxy Defender）
**類型**：2D 俯視角太空射擊（Top-down Shoot 'em up）
**核心玩法**：
- 玩家操控太空船，在畫面下方左右／上下移動
- 按空白鍵發射子彈，往上飛
- 敵人從畫面上方持續生成，往下移動
- 子彈打中敵人 → 敵人爆炸消失、加分
- 敵人碰到玩家，或飛出畫面沒被打中 → 玩家扣血，血量歸零遊戲結束
- 畫面上顯示目前分數與血量

這是 2D 遊戲最經典的入門類型之一，很適合用來練習：GameObject/Component 操作、2D 物理（Rigidbody2D + Collider2D）、腳本邏輯、UI 顯示、以及基本的遊戲迴圈（spawn → collide → score → game over）。

---

## 步驟 1：建立新場景

**目標**：建立一個乾淨的場景作為遊戲關卡，設定好 2D 攝影機與光源。

**複製貼上這段 Prompt：**

```
請幫我建立一個新的 2D 場景，命名為 "GalaxyDefender"。場景需要：

1. 一個正交（orthographic）攝影機，命名為 Main Camera，tag 設為 MainCamera：
   - 位置 (0, 0, -10)（2D 場景標準佈局：所有 Sprite 畫在 z=0，攝影機退到 z=-10 往 +Z 看）
   - Orthographic Size 設為 6
   - 背景顏色設為深藍近黑色 (0.02, 0.02, 0.06)，模擬太空

2. 一個 Global Light 2D（lightType 設為 Global，白色，intensity = 1）。如果專案的 Render Pipeline 是 URP，之後建立的 Sprite 材質預設會是需要光照的 Lit shader，所以場景需要一個全域光源才能正常顯示顏色

3. 場景建立好之後請存檔

完成後請列出場景 Hierarchy，並確認攝影機位置、光源都已正確設定。
```

**預期結果**：Kiro 會建立新場景、正交攝影機（z=-10）、一個 Global Light 2D，最後存檔並列出場景結構。

---

## 步驟 2：建立玩家太空船

**目標**：建立可以左右上下移動、可正確碰撞的玩家太空船。

**複製貼上這段 Prompt：**

```
請在目前場景建立玩家太空船物件，規格如下：

- 名稱：Player，Tag 設為 "Player"（如果 Tag 不存在請先建立）
- 一個 Sprite（先用簡單的方形色塊代表，之後可以換成美術素材）
- 元件：SpriteRenderer（先指派好 Sprite）、Rigidbody2D（Gravity Scale = 0）、BoxCollider2D
- BoxCollider2D 的 size 請依照 Sprite 的實際大小設定（不要留預設或空值），完成後回報 size 數值供我確認
- 位置放在畫面下方中間偏下，例如 (0, -4, 0)
- 幫我寫一個 C# 腳本 PlayerController，掛在 Player 上（掛載時自己寫的腳本要用組件限定名稱：`manage_components(action: "add", component_type: "PlayerController, Assembly-CSharp")`，只給 `"PlayerController"` 會回報 `Component type not found`；內建型別如 SpriteRenderer、Rigidbody2D、BoxCollider2D 才可以用短名稱。另外要等編譯真的完成才掛得上，`refresh_unity(wait_for_ready: true)` 不會真的等，請輪詢 `mcpforunity://editor/state` 的 `data.advice.ready_for_tools` 或失敗就重試）：
  - 用方向鍵或 WASD 控制上下左右移動，移動速度用 public 變數 moveSpeed（預設 8）。用 transform 位移或 Rigidbody2D 都可以；如果用 Rigidbody2D 驅動，請設定 Unity 6.4 的 `linearVelocity`（`rb.linearVelocity = direction * moveSpeed`），**不要用已經 obsolete 的 `velocity`**
  - 限制移動範圍，不要讓玩家飛出攝影機可視範圍外（大約 x: -8~8，y: -5~5）
  - 依照專案的 Input System 設定選用對應 API

完成後幫我確認腳本編譯無誤，並回報 BoxCollider2D 的實際 size。
```

**預期結果**：Player GameObject 建立完成，Tag 為 "Player"，BoxCollider2D 尺寸貼合 Sprite 大小，`PlayerController.cs` 編譯無誤。

---

## 步驟 3：讓玩家可以射擊

**目標**：按空白鍵發射子彈。

**複製貼上這段 Prompt：**

```
現在幫玩家加上射擊功能：

1. 建立一個子彈 Prefab，名稱 Bullet：
   - Sprite（先用簡單的小色塊代表），SpriteRenderer 先指派好 Sprite
   - Rigidbody2D（Gravity Scale = 0）、CircleCollider2D（radius 依照 Sprite 大小設定，isTrigger = true）
   - 腳本 Bullet.cs（掛到 Bullet 物件上時用組件限定名稱 `component_type: "Bullet, Assembly-CSharp"`，短名稱會失敗；要等編譯完成才掛）：往上飛（沿著 Y 軸正方向），速度用 public 變數 speed（預設 12）控制，飛出畫面範圍外（例如 y > 6）就自動銷毀自己。如果用 Rigidbody2D 驅動飛行，請設定 Unity 6.4 的 `linearVelocity`（`rb.linearVelocity = Vector2.up * speed`），不要用已經 obsolete 的 `velocity`
   - 存成 Prefab（Assets/Prefabs/Bullet.prefab）

2. 修改 PlayerController.cs，加上射擊邏輯：
   - 按下空白鍵時，在 Player 目前位置生成一個 Bullet
   - 加上射擊冷卻時間（fireRate，預設 0.25 秒）
   - 依照專案的 Input System 設定選用對應 API

完成後幫我確認腳本編譯無誤，回報 Bullet 的 Collider 尺寸，並列出目前場景中新建立的物件與 Prefab。
```

**預期結果**：`Bullet` Prefab 與更新過的 `PlayerController.cs`。子彈往上飛、自動銷毀、有射擊冷卻，Collider 為 Trigger 且尺寸正確。

---

## 步驟 4：建立敵人並讓它們自動生成

**目標**：敵人從畫面上方持續冒出來，往下移動。

**複製貼上這段 Prompt：**

```
請幫我建立敵人系統：

1. 建立敵人 Prefab，名稱 Enemy，Tag 設為 "Enemy"（如果 Tag 不存在請先建立）：
   - Sprite（用另一種顏色的色塊區分玩家與敵人），SpriteRenderer 先指派好 Sprite
   - Rigidbody2D（Gravity Scale = 0）、BoxCollider2D（size 依照 Sprite 大小設定，isTrigger = true）
   - 腳本 Enemy.cs（掛到 Enemy 物件上時用組件限定名稱 `component_type: "Enemy, Assembly-CSharp"`，短名稱會失敗；要等編譯完成才掛）：
     - 往下移動（Y 軸負方向），速度用 public 變數 speed（預設 3）控制。如果用 Rigidbody2D 驅動，請設定 Unity 6.4 的 `linearVelocity`（`rb.linearVelocity = Vector2.down * speed`），不要用已經 obsolete 的 `velocity`
     - 飛出畫面下方（例如 y < -6）時，代表玩家漏接：呼叫 GameManager.Instance.DamagePlayer(missedDamage)（新增一個 public int missedDamage 欄位，預設 1），再銷毀自己
     - 偵測 OnTriggerEnter2D，如果碰到的物件 Tag 是 "Player"：呼叫 GameManager.Instance.DamagePlayer(1)，銷毀對方，並銷毀自己
   - 存成 Prefab（Assets/Prefabs/Enemy.prefab）

2. 建立一個空物件 EnemySpawner，掛上腳本 EnemySpawner.cs（掛載時用組件限定名稱 `component_type: "EnemySpawner, Assembly-CSharp"`，短名稱會失敗；要等編譯完成才掛）：
   - 每隔一段時間（spawnInterval，預設 1.5 秒）在畫面上方隨機 X 位置（範圍約 -7 到 7）生成一個 Enemy
   - 使用 Coroutine 搭配 WaitForSeconds 實作定時生成

腳本裡引用 GameManager 的部分先寫好，下一步會建立 GameManager 類別，不會影響這一步的編譯。

完成後幫我確認敵人 Prefab 的 Collider 尺寸、Spawner 腳本都正確設定，並簡單說明隨機生成位置的做法。
```

**預期結果**：`Enemy` Prefab（含碰撞與漏接扣血邏輯）、`EnemySpawner` 與腳本都建立完成。

---

## 步驟 5：碰撞偵測與分數系統

**目標**：子彈打敵人加分、敵人碰玩家或漏接都扣血。

**複製貼上這段 Prompt：**

```
請幫我建立分數與血量的核心管理器：

1. 建立一個 GameManager 空物件，掛上腳本 GameManager.cs（掛載時用組件限定名稱 `component_type: "GameManager, Assembly-CSharp"`，只給 `"GameManager"` 會回報 `Component type not found`；要等編譯真的完成才掛，`refresh_unity(wait_for_ready: true)` 不會真的等），用 Singleton 模式（static Instance）：
   - public int score（預設 0）、public int playerHealth（預設 3）
   - 方法 AddScore(int amount)：加分
   - 方法 DamagePlayer(int amount)：扣血，血量歸零時觸發遊戲結束（先在 Console 印出 "Game Over"，下一步再做 UI）

2. 修改 Bullet.cs：OnTriggerEnter2D 偵測 Tag 為 "Enemy" 的物件，命中時呼叫 GameManager.Instance.AddScore(10)，銷毀敵人物件，銷毀子彈自己

完成後幫我測試編譯，並說明子彈跟敵人是用 Trigger 還是 Collision 偵測碰撞、為什麼這樣選。
```

**預期結果**：`GameManager.cs` 建立完成並串接到 Bullet/Enemy。子彈打中敵人加分並銷毀雙方；敵人碰到玩家或漏接飛出畫面都會扣血。Kiro 會說明選用 Trigger 是因為只需要偵測重疊，不需要真實物理反彈。

---

## 步驟 6：遊戲結束畫面

**目標**：血量歸零時顯示 Game Over，並可以重新開始。

**複製貼上這段 Prompt：**

```
請幫我做遊戲結束的處理，UI 部分請用傳統 uGUI（Canvas + Image + Text + Button 元件，透過 GameObject 加元件的方式建立，不是 UI Toolkit 的 UXML/USS）：

1. 建立一個 UI Canvas，命名 GameOverCanvas，裡面放：
   - 一個全螢幕半透明黑色背景（Image，顏色約 (0,0,0,0.75)）
   - 一段文字（Text）顯示 "GAME OVER"，字體大一點（例如 72pt），置中
   - 一個按鈕（Button），文字顯示「重新開始」
   - 場景中如果還沒有 EventSystem，請一併建立（並依照專案的 Input System 設定選用對應的 Input Module）

2. GameOverCanvas 預設是隱藏狀態（不要一開始就顯示）

3. 修改 GameManager.cs：
   - 血量歸零時，顯示 GameOverCanvas，並停止 EnemySpawner 的生成 Coroutine
   - 血量歸零後，敵人不應該繼續移動或造成傷害
   - 「重新開始」按鈕按下時，重新載入目前場景（SceneManager.LoadScene）

完成後幫我確認 UI 用的是 uGUI 元件（Canvas/Image/Text/Button），並列出所有新建立的 UI 物件層級結構。
```

**預期結果**：`GameOverCanvas` 建立完成並預設隱藏，血量歸零時顯示、敵人停止行為，按「重新開始」會重載場景。

---

## 步驟 7：分數與血量 UI（HUD）

**目標**：畫面上即時顯示分數與血量。

**複製貼上這段 Prompt：**

```
請幫我加上遊戲中的 HUD（畫面資訊顯示），UI 部分同樣用傳統 uGUI：

1. 建立一個 UI Canvas，命名 HUDCanvas：
   - 左上角文字「Score: 0」，命名 ScoreText
   - 右上角文字「HP: 3」，命名 HealthText

2. 修改 GameManager.cs：
   - 新增 [SerializeField] 的 Text 欄位 scoreText、healthText
   - AddScore 跟 DamagePlayer 執行時，同步更新這兩個文字內容
   - 在 Start() 時也呼叫一次更新，確保遊戲一開始就顯示正確初始值

3. 把 HUDCanvas 底下的 ScoreText、HealthText 指派到 GameManager 對應的欄位，並存檔後重新讀取確認參照已正確寫入場景

完成後幫我確認 HUD 顯示的初始值跟 GameManager 的預設值（score=0, health=3）一致。
```

**預期結果**：畫面左上角顯示「Score: 0」、右上角顯示「HP: 3」，且隨遊戲進行即時更新，欄位參照已存檔寫入場景。

---

## 步驟 8：難度曲線與遊戲手感調整

**目標**：讓遊戲隨時間變難，手感更好玩。

**複製貼上這段 Prompt：**

```
請幫遊戲加上難度曲線，讓遊戲更好玩、更有挑戰性：

1. 修改 EnemySpawner.cs：
   - 每過 20 秒，spawnInterval 縮短 10%，設下限（最短 0.4 秒）
   - 生成的敵人有 15% 機率是「快速敵人」：呼叫 Enemy 上的一個方法把 speed 乘以 2、顏色換成不同色（用同一個 Prefab 動態調整，不用另建 Prefab）

2. 依你的遊戲設計經驗，幫我微調以下數值並說明理由：
   - 玩家移動速度
   - 子彈飛行速度與射擊冷卻時間
   - 敵人初始生成間隔

完成後跟我說明你做了哪些數值調整，以及為什麼這樣調整比較好玩。
```

**預期結果**：Kiro 會實作難度曲線與快速敵人變種，並以遊戲設計角度說明數值調整理由。

---

## 步驟 9：（選用）音效與爆炸特效

**目標**：加上打擊感與音效，讓遊戲更有反饋感。

**複製貼上這段 Prompt：**

```
請幫我加上簡單的視覺與音效反饋：

1. 敵人被子彈擊中銷毀時，在該位置生成一個簡單的爆炸粒子特效（ParticleSystem，白色/橙色粒子向外噴發，持續時間 0.5 秒左右），播完自動銷毀

2. 音效檔案我自己準備（不要用 AI 生成音效的工具）。請幫我：
   - 建立 Assets/Audio/SFX/ 資料夾
   - 告訴我可以去哪裡下載免費音效（射擊：laser/pew 電子音效感，1 秒內；爆炸：explosion 感，1 秒內）

3. 在 Bullet.cs 發射時、Enemy.cs 被摧毀時播放對應音效：請加上 AudioSource 與可在 Inspector 指派的 AudioClip 欄位，並告訴我音效檔放進專案後要怎麼指派

完成後跟我確認粒子特效跟音效接線有沒有正確套用。
```

**預期結果**：敵人爆炸有粒子特效；射擊與爆炸的 AudioSource/AudioClip 欄位都接好，等你把音效檔放進 `Assets/Audio/SFX/` 並在 Inspector 指派後就會發聲。

> **為什麼不請 Kiro 生成音效**：MCP for Unity 有一個 `asset_gen` 工具群組（`generate_audio`、`generate_image`、`generate_model` 等），但它**預設關閉（已在 bridge 10.3.0 上以 `manage_tools(action: "list_groups")` 實測確認：`enabled: false`、`default_enabled: false`）**，而且會呼叫第三方服務、消耗開發者自備的 API 金鑰與點數。本 Power **刻意不把任何工作流、steering 檔或範本路由到 `asset_gen`**（見 `POWER.md` 的「Generative Tools (`asset_gen` group) — awareness only」）。所以這個步驟走手動路線：免費音效可以在 Unity Asset Store 的免費音效包、[freesound.org](https://freesound.org/)（注意各檔案的授權條款）或 [kenney.nl](https://kenney.nl/assets)（CC0）找到。真的想用 AI 生成，請自行啟用該群組並自備金鑰，那是一次明確的、你自己決定的動作，不該由本 Workshop 代替你決定。

> **Unity 6.4 的 2D 畫面進階選項**：6.4 起可以把**自訂 render pass 注入 URP 2D 的 frame loop**，也就是能為 2D 專案加上自訂渲染與後處理（例如爆炸時的全畫面閃白、受傷時的螢幕邊緣泛紅），不必再繞過 2D Renderer。這屬於超出本 Workshop 範圍的進階題，但如果之後想做畫面特效，這是 6.4 該走的路。另外要注意：URP Compatibility Mode 與 `URP_COMPATIBILITY_MODE` 腳本定義在 6.4 已**完全移除**，自訂 render pass 只剩 Render Graph 一條路。來源：[New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) 與 [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64)（皆於 2026-10-21 取得）。

---

## 步驟 10：測試與建置

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

跑完以上 10 個步驟，你會有一個功能完整、可以實際遊玩的 2D 太空射擊遊戲，包含：
- 可移動、可射擊的玩家太空船
- 會自動生成、往下移動的敵人（含難度曲線與快速敵人）
- 完整的碰撞、分數與血量系統（含漏接扣血）
- 遊戲結束畫面與重新開始功能
- 即時 HUD 顯示
- （選用）音效與粒子特效
- 一份可執行的建置檔

---

## 延伸挑戰（做完基本版之後可以試試）

想繼續練習的話，可以把以下需求直接改寫成 Prompt 貼給 Kiro：

1. **武器升級系統**：敵人被擊中特定機率掉落道具，玩家撿到後子彈變成連發或加大範圍
2. **Boss 戰**：每隔一段時間或分數達到門檻時，生成一個血量很高、會發射多顆子彈的 Boss
3. **物件池（Object Pooling）**：目前子彈跟敵人是頻繁 Instantiate/Destroy，練習改成物件池模式來優化效能
4. **背景視差捲動**：加上會持續往下捲動的星空背景，營造飛行感
5. **手機觸控操作**：改成虛擬搖桿 + 觸控按鈕，讓遊戲可以在手機上玩

---

*本 Workshop 依 [kiro-unity-accelerator](../POWER.md) Power 撰寫。*
