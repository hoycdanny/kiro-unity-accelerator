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

---

## 步驟 0：先啟用這個 Workshop 需要的工具群組

**目標**：讓 Kiro 看得到後面會用到的 MCP 工具。

MCP for Unity 把工具分成 **10 個群組**，而**預設只有 `core` 是啟用的**，其餘 9 個都要手動開啟。場景、GameObject、元件、腳本、建置這些本 Workshop 的主力工具都在 `core`，但有幾個步驟會用到 `core` 以外的群組。

**複製貼上這段 Prompt：**

```
請先呼叫 manage_tools(action: "list_groups") 列出目前的工具群組狀態，然後執行：
- manage_tools(action: "sync")                                 # 先採用 Unity Tools 視窗裡的開關狀態
- manage_tools(action: "activate", group: "scripting_ext")      # 需要 execute_code 做專案查詢時
- manage_tools(action: "activate", group: "testing")            # 步驟 10 要跑 run_tests 時

如果我後面要求用 UI Toolkit（而不是本 Workshop 預設的 legacy uGUI）做 HUD，再額外執行：
- manage_tools(action: "activate", group: "ui")                 # manage_ui 在這個群組

做完請再跑一次 manage_tools(action: "list_groups") 回報結果。
```

**預期結果**：Kiro 回報群組清單與啟用結果。

> **兩個必須知道的細節**：
> 1. `list_groups` 回傳的 `enabled` 欄位，只有在這個 session 已經下過 `activate`／`deactivate` 時才反映 session 的規則，否則它回報的是該群組的**預設值** —— 所以它不是「目前實際可呼叫什麼」的可靠讀數。
> 2. 部分 MCP client 會**快取工具清單**，`activate` 之後新工具可能要等 client 重新整理或重新連線才會出現。如果 Kiro 說找不到某個工具，先重新整理 MCP 伺服器再重試，不要急著換做法。
>
> 全部做完後想回到乾淨狀態，可以用 `manage_tools(action: "reset")` 回到只剩 `core`。

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
- 幫我寫一個 C# 腳本 PlayerController，掛在 Player 上：
  - 用方向鍵或 WASD 控制上下左右移動，移動速度用 public 變數 moveSpeed（預設 8）
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
   - 腳本 Bullet.cs：往上飛（沿著 Y 軸正方向），速度用 public 變數 speed（預設 12）控制，飛出畫面範圍外（例如 y > 6）就自動銷毀自己
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
   - 腳本 Enemy.cs：
     - 往下移動（Y 軸負方向），速度用 public 變數 speed（預設 3）控制
     - 飛出畫面下方（例如 y < -6）時，代表玩家漏接：呼叫 GameManager.Instance.DamagePlayer(missedDamage)（新增一個 public int missedDamage 欄位，預設 1），再銷毀自己
     - 偵測 OnTriggerEnter2D，如果碰到的物件 Tag 是 "Player"：呼叫 GameManager.Instance.DamagePlayer(1)，銷毀對方，並銷毀自己
   - 存成 Prefab（Assets/Prefabs/Enemy.prefab）

2. 建立一個空物件 EnemySpawner，掛上腳本 EnemySpawner.cs：
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

1. 建立一個 GameManager 空物件，掛上腳本 GameManager.cs，用 Singleton 模式（static Instance）：
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

2. 如果本 Power 有支援 AI 生成音效的工具，幫我生成並匯入：
   - 射擊音效（laser/pew 電子音效感，長度 1 秒內）
   - 爆炸音效（explosion 感，長度 1 秒內）
   如果沒有這類工具，請直接告訴我，並告訴我要去哪裡手動找免費音效資源即可。

3. 在 Bullet.cs 發射時、Enemy.cs 被摧毀時，播放對應音效

完成後跟我確認粒子特效跟音效有沒有正確套用。
```

**預期結果**：敵人爆炸有粒子特效，射擊/爆炸有音效。如果環境沒有 AI 生成工具的金鑰，Kiro 會如實告知並給替代方案。

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
