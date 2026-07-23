# UI Dependency Analysis Steering

<!-- File Purpose / 本檔案用途: Unity UI dependency analysis steering guide covering UI component reference detection, event call chain analysis, coupling calculation, and refactoring suggestion generation. / Unity UI 依賴分析的 steering 指引，涵蓋 UI 元件引用偵測、事件調用鏈分析、耦合度計算及重構建議生成。 -->

## Role and Purpose

This document provides Unity UI architecture analysis expertise. When the developer requests analysis of dependencies between UI components, event call chain tracing, or script coupling assessment, apply the specialized Unity knowledge in this document to translate developer requests into precise analysis workflows and MCP (Model Context Protocol) tool call sequences.

## Workflow

### Standard UI Dependency Analysis Flow

```
Scan scripts → Trace UI references → Analyze event call chains → Calculate coupling → Generate refactoring suggestions → Integrate report
```

1. **Scan scripts**: Use `find_gameobjects(search_method: "by_component")` or `manage_asset(action: "search")` to get all C# scripts in the project
2. **Trace UI references**: Parse UI component references in each script (SerializeField, GetComponent, GameObject.Find patterns)
3. **Analyze event call chains**: Trace complete call chains from UI event entry points, detect event subscription patterns and state changes
4. **Calculate coupling**: Compute coupling scores based on direct reference count, call chain depth, shared state changes, and bidirectional dependencies
5. **Generate refactoring suggestions**: Produce specific refactoring proposals for high-coupling pairs
6. **Integrate report**: Consolidate all analysis results into a complete UIDependencyReport

## UI Reference Detection Patterns

The system detects the following UI component reference methods:

| Reference Method | Code Pattern | Description |
|-----------------|-------------|-------------|
| SerializeField | `[SerializeField] private Button myButton;` | Inspector drag-and-drop assignment (a Unity attribute that makes private fields visible in the Inspector panel — Unity's property editor — for visual assignment) |
| PublicField | `public Button myButton;` | Public field direct reference |
| GetComponent | `GetComponent<Button>()` | Runtime dynamic retrieval |
| GetComponentInChildren | `GetComponentInChildren<Slider>()` | Dynamic retrieval from children |
| GameObjectFind | `GameObject.Find("ButtonObj")` | Global search by name |
| TransformFind | `transform.Find("ButtonObj")` | Relative path search |
| AddComponent | `AddComponent<Image>()` | Dynamic component addition |

### Supported UI Component Types

Button, Toggle, Slider, InputField, Dropdown, ScrollRect, Text, Image, TMP_Text, TextMeshProUGUI, TextMeshPro, RawImage, Canvas, CanvasGroup, RectTransform, ScrollView, Scrollbar

### High Fan-In Detection

> **Fan-In (扇入度)** measures how many other modules reference a given component. A component with high fan-in is used by many places — which makes it a critical dependency point: changing it risks breaking all of its consumers.

When the same UI component is referenced by more than 3 different scripts, the system flags it as a "High Fan-In Component" (a component referenced by many other components), which typically indicates a potential coupling hotspot (a point where many parts of the code depend on each other, making changes risky) that may benefit from decoupling via an event bus or interface.

## Event Call Chain Analysis

### Detected Event Subscription Patterns

| Pattern | Code Example | Description |
|---------|-------------|-------------|
| AddListener | `button.onClick.AddListener(OnClick)` | UnityEvent subscription |
| CSharpEventSubscription | `someEvent += OnSomething;` | C# event subscription |
| SerializedUnityEvent | `[SerializeField] UnityEvent onClicked;` | Serialized UnityEvent |
| SendMessage | `SendMessage("OnDamage")` | String reflection call |
| BroadcastMessage | `BroadcastMessage("OnDamage")` | Broadcast reflection call |

### State Change Detection

State change types at call chain terminals:

| Type | Code Pattern | Description |
|------|-------------|-------------|
| StaticFieldWrite | `GameManager.score = 10;` | Static field write |
| ScriptableObjectModify | `playerData.health = 100;` | ScriptableObject modification |
| PlayerPrefsWrite | `PlayerPrefs.SetInt("key", value)` | PlayerPrefs write |
| SingletonStateModify | `Instance.health = 100;` | Singleton state modification |

### Deep Call Chains

When event call chain depth exceeds 5 levels, the system flags it as a "Deep Chain" and suggests architectural refactoring to reduce complexity.

> **When to act**: In practice, coupling scores above 15 almost always indicate a design problem worth addressing immediately. Scores between 10-15 are worth monitoring but may be acceptable for tightly related components (e.g., a HealthBar and HealthSystem).

## Coupling Score Calculation

Coupling score is calculated from four weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Direct reference count | × 1.0 | Number of shared UI component references between two scripts |
| Max call chain depth | × 0.5 | Deepest event call chain between two scripts |
| Shared state change count | × 2.0 | Number of state changes both scripts are involved in |
| Bidirectional dependency bonus | + 10.0 | If two scripts depend on each other, add 10 points |

High coupling threshold is 10 points; pairs exceeding this score are included in the report summary.

## Refactoring Suggestion Types

| Suggestion Type | Applicable Scenario | Priority |
|----------------|--------------------| ---------|
| EventBus | High direct reference count or bidirectional dependency | High (bidirectional) / Medium |
| ScriptableObjectChannel | High shared state change count | Medium |
| LayerSeparation | Deep call chain (> 5 levels) | Medium |
| InterfaceDecoupling | Bidirectional dependency or general high coupling | High (bidirectional) / Low |

## MCP Tool Usage Examples

### Scan C# Scripts in Project

```
manage_asset(action: "search", path: "Assets/Scripts/", search_pattern: "*.cs")
```

### Read Script Content for Analysis

```
manage_script(action: "read", name: "UIManager", path: "Assets/Scripts/UI/")
```

### Batch Read Multiple Scripts

```
batch_execute(commands: [
  { "tool": "manage_script", "params": { "action": "read", "name": "UIManager", "path": "Assets/Scripts/UI/" } },
  { "tool": "manage_script", "params": { "action": "read", "name": "InventoryPanel", "path": "Assets/Scripts/UI/" } },
  { "tool": "manage_script", "params": { "action": "read", "name": "ShopController", "path": "Assets/Scripts/Shop/" } }
])
```

Each command's second key is `params`, not `args`.

### Build Dependency Graph

After analysis, use `buildUIDependencyGraph` to construct a directed dependency graph where:
- Each script file becomes a `script` node
- Each unique UI component becomes a `uiComponent` node
- Each reference creates an edge from script to UI component

## Error Handling

### Script Parse Failure

- If a single script fails to parse, record to `failedFiles` and continue processing remaining scripts
- Do not interrupt overall analysis due to a single file failure
- List all failed files and error reasons in the final report

### Empty Input Handling

- Empty script array returns valid empty results (empty reference list, empty call chains, zero coupling score)
- Do not throw exceptions

### Common Error Scenarios

| Error | Handling |
|-------|----------|
| Script content is null | Record to failedFiles, skip that file |
| Event entry point not found | Return minimal call chain containing only the entry node |
| Call chain exceeds max depth | Stop recursion at maxDepth (default 10) |
| Circular dependency detected | Record cycle path to cyclePath, do not re-traverse |

## Best Practices

### UI Reference Method Recommendations

| Reference Method | Recommendation | Reason |
|-----------------|---------------|--------|
| SerializeField | Preferred | Compile-time safe, Inspector visible, easy to maintain |
| GetComponent | Use moderately | Suitable for dynamically generated UI, but cache results |
| GameObject.Find | Avoid | Poor performance, string coupling, difficult to refactor |
| SendMessage / BroadcastMessage | Avoid | String reflection, no compile-time checking, hard to trace |

### Coupling Reduction Strategies

| Strategy | Applicable Scenario | Effect |
|----------|--------------------| -------|
| Event Bus | Many-to-many communication | Eliminates direct references, supports loose coupling |
| ScriptableObject Channel | Cross-scene state sharing | Data-driven, serializable, easy to test |
| Interface Decoupling | One-to-one dependency | Improves testability, supports implementation swapping |
| Layer Separation | Deep call chains | Separates UI from game logic, reduces complexity |

### Report Serialization

Analysis reports support three operations:
- **Serialize**: Convert `UIDependencyReport` to JSON string for storage and transmission
- **Deserialize**: Restore JSON string to `UIDependencyReport` with full format validation
- **Text formatting**: Convert report to human-readable structured text including all references, call chains, coupling pairs, and refactoring suggestions
