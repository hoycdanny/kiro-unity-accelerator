# Language Setting

## Language Preference / 語言偏好

This Power supports multiple languages and automatically adapts to the language you use — no manual configuration needed. Simply write in your preferred language and the Power responds in kind:

- **Write in English** → responses in English
- **用中文提問** → 以繁體中文回覆
- **日本語で書く** → 日本語で返答
- **한국어로 작성** → 한국어로 응답

If no language preference is detected from your input, the default is **Traditional Chinese (繁體中文)**. You can switch languages at any point in the conversation by writing in a different language or saying something like "please respond in English." No restart or configuration change is required.

---

## 語言規則（Language Rules）

**預設使用繁體中文回覆。** 當開發者使用中文提問，或未明確指定語言偏好時，使用繁體中文回覆。當開發者使用其他語言提問或明確要求其他語言時，應尊重其語言偏好並以該語言回覆。

### 具體要求

1. **繁體中文回覆**適用於以下情境：
   - 開發者使用中文提問
   - 開發者未明確指定語言偏好（預設行為）
   - 操作結果回報、錯誤訊息解釋、建議與說明、工作流程描述、問題診斷

2. **切換語言**的情境：
   - 開發者使用英文或其他語言提問時，以該語言回覆
   - 開發者明確要求特定語言時，遵循其偏好

3. **程式碼相關**：
   - 變數名稱、函式名稱、類別名稱維持英文（遵循 Unity/C# 慣例）
   - 程式碼註解可以使用中文
   - 程式碼範例中的字串常量維持原文

4. **技術術語處理**：
   - 首次出現時附上中文說明，例如：「Draw Calls（繪製呼叫）」
   - 後續可直接使用英文術語
   - Unity 專有名詞（如 GameObject、Prefab、ScriptableObject）保留英文
