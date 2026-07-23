# Code Quality & Architecture Check Steering

<!-- File Purpose / 本檔案用途: Unity C# code quality and architecture check steering guide / Unity C# 程式碼品質與架構檢查的 steering 指引，涵蓋架構模式（MVC/ECS/ScriptableObject）、循環依賴偵測、SOLID 原則檢查及常見程式碼異味。 -->

## Role and Purpose

Maintaining clean architecture in Unity projects benefits from consistent patterns and dependency management. Architecture rules help keep classes focused on single responsibilities and dependency graphs manageable, which makes refactoring easier over time. This guide covers three architecture patterns commonly used in Unity — MVC, ECS, and ScriptableObject-based — along with cyclic dependency detection and SOLID principle validation via MCP tool scanning. Use it when a developer asks to check code quality, enforce naming conventions, or detect circular references.

## Code Check Flow

1. **Get project info**: Use `execute_code` (e.g. `return UnityEngine.Application.unityVersion;`) or `manage_packages(action: "list_packages")` to understand the project/environment — there is no standalone `project_info` tool call
2. **List scripts**: Use `manage_asset(action: "search", path: "Assets/", search_pattern: "*.cs")` to get all C# script paths (`manage_script` has no `list` action — it's a legacy router supporting only `create`/`read`/`delete`)
3. **Read script content**: Use `manage_script(action: "read", name: scriptName, path: folderPath)` to read scripts that need checking — both `name` (filename without `.cs`) and `path` (containing folder) are required; there is no single-string full-path param
4. **Load architecture rules**: Load enabled ArchitectureRule definitions from `templates/architecture-rules/` or custom locations
5. **Analyze code**: Compare script content against architecture rules, identify violations
6. **Detect cyclic dependencies**: Analyze using/namespace dependencies between scripts, detect cycle paths
7. **Generate report**: Produce a violation report including file path, line number, rule name, and fix suggestion

## Architecture Pattern Guide

### MVC (Model-View-Controller)
- **Model**: Data classes, no dependency on View or Controller, names end with `Model` or `Data`
- **View**: UI and display logic, depends only on Model, names end with `View` or `UI`
- **Controller**: Business logic, coordinates Model and View, names end with `Controller` or `Manager`
- **Rule**: View must not directly reference Controller; Model must not reference View or Controller

### ECS (Entity-Component-System)
- **Entity**: Pure data container, no logic
- **Component**: Pure data struct, inherits IComponentData, no methods
- **System**: Pure logic, inherits SystemBase, holds no state
- **Rule**: Component must not contain methods; System must not hold non-transient fields

### ScriptableObject Architecture
- **ScriptableObject**: Serializable data container for configuration and shared data
- **Rule**: ScriptableObject must not reference MonoBehaviour; avoid static fields in ScriptableObject
- **Naming**: End with `SO` or `Config`

## Cyclic Dependency Detection Guide

### Detection Method
1. Parse `using` statements and `namespace` declarations from each C# script
2. Build a namespace-level directed dependency graph
3. Use DFS (Depth-First Search — a graph traversal algorithm that explores as far as possible along each branch before backtracking; the tool handles this automatically, but understanding the concept helps interpret cycle-path output) to detect all cycles in the graph
4. Describe cycle paths in text (e.g., `A → B → C → A`)

### Common Cyclic Dependency Patterns
- **Bidirectional reference**: A references B, B also references A → Introduce interface or event system to decouple
- **Triangle cycle**: A → B → C → A → Extract shared interface to independent namespace
- **Manager cross-references**: Multiple Managers depend on each other → Introduce Mediator pattern

## MCP Tool Usage Examples

> **Verified syntax**: confirmed against a live unity-mcp connection.

### Get Project Structure

```
execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")
```

### List All Scripts

```
manage_asset(action: "search", path: "Assets/", search_pattern: "*.cs")
→ { data: { totalAssets: N, assets: [{ path: "Assets/Scripts/PlayerController.cs", guid: "...", ... }, ...] } }
```

### Read Script Content

```
manage_script(action: "read", name: "PlayerController", path: "Assets/Scripts")
→ { content: "using UnityEngine;\n...", lineCount: 150 }
```

`name` is the filename without `.cs`; `path` is the containing folder (the tool internally builds `path/name.cs`). Passing a full file path in a single param does not work.

## Incremental Checking

- When a developer saves a C# script, run architecture check only on that file
- Incremental check results should be consistent with full check results for the same file
- Display newly detected violations in Console

## Error Handling

- If script reading fails, record the failed file path and continue checking remaining scripts
- If architecture rule JSON is malformed, skip that rule and inform you
- If the project has no C# scripts, inform you that no check is needed

## Code Quality Best Practices

- Recommend teams select an architecture pattern early and enable corresponding rules
- Run full architecture checks regularly to avoid accumulating technical debt
- Include custom architecture rules in version control to ensure team consistency
- Prioritize fixing cyclic dependencies — the most common source of architecture degradation

## Unity 6 Code Quality Advanced Guide (from official PDF best practices)

### SOLID Principle Checks

Per the Unity official Design Patterns e-book, the following SOLID principles (a set of five object-oriented design guidelines — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion — that help keep code maintainable and extensible) should be included in architecture checks:

#### Single Responsibility Principle (SRP)
- Classes exceeding 200-300 lines should be considered for splitting
- MonoBehaviour handling Input + Movement + Audio + UI simultaneously is an oversized-class symptom (a class that has taken on too many responsibilities, making it hard to test or modify — see Common Code Smells section below)
- Suggest splitting into PlayerInput, PlayerMovement, PlayerAudio, etc.

#### Open/Closed Principle (OCP)
- Long switch/if-else chains suggest refactoring with polymorphism
- Use abstract class or interface to define extensible behaviors

#### Dependency Inversion Principle (DIP)
- High-level modules should not depend directly on low-level modules; both should depend on abstractions
- Use interfaces like ISwitchable to decouple Switch from Door

### ScriptableObject Architecture Patterns

Per the Unity official ScriptableObject e-book, the following patterns should be recommended:

#### Event Channel Pattern
- Use ScriptableObject as event mediator, replacing Singleton
- VoidEventChannelSO contains UnityAction delegate and RaiseEvent method
- Any MonoBehaviour can subscribe/unsubscribe to event channels

#### Runtime Set Pattern
- Use ScriptableObject to maintain GameObject collections, replacing FindObjectOfType
- Objects add themselves to the set in OnEnable, remove in OnDisable
- More efficient than searching Scene Hierarchy

#### Delegate Object Pattern
- ScriptableObject contains pluggable behavior logic (e.g., AI behaviors)
- Use abstract ScriptableObject to define behavior interface
- Drag-and-drop to swap different behaviors in Inspector

#### Flyweight Pattern
- Use a memory-optimization pattern (Flyweight — where many objects share a single copy of common data instead of each storing its own) to store shared static data in ScriptableObject
- Multiple GameObjects reference the same ScriptableObject instead of duplicating data
- Significantly reduces memory usage

### C# Naming Conventions (from Unity official Style Guide)

| Type | Convention | Example |
|------|-----------|---------|
| Private field | m_ + camelCase | `m_currentHealth`, `m_moveSpeed` |
| Constant | k_ + PascalCase | `k_MaxHealth`, `k_DefaultSpeed` |
| Static field | s_ + camelCase | `s_instance`, `s_sharedData` |
| Public property | PascalCase | `MaxHealth`, `MoveSpeed` |
| Interface | I + PascalCase | `IDamageable`, `IMovable` |
| Event | Verb phrase | `DoorOpened`, `PointsScored` |
| Event handler | On + EventName | `OnDoorOpened`, `OnPointsScored` |

### UI Toolkit Naming Convention (BEM)

Use BEM (Block Element Modifier — a CSS naming methodology that structures class names as `block__element--modifier` to make UI component relationships explicit) naming convention:
```
block-name__element-name--modifier-name
```
Examples:
- `navbar-menu__shop-button--small`
- `health-bar__progress--critical`
- `inventory__slot--equipped`

> **Practical note**: In Unity projects with 50+ scripts, oversized classes and circular dependencies are the two most common architecture issues. Catching them early prevents cascading refactoring costs.

### Common Code Smells

| Smell | Description | Fix |
|-------|-------------|-----|
| Oversized class | A single class that has taken on too many responsibilities, making it hard to test or modify | Split into multiple single-responsibility classes |
| Long switch | Switch with more than 5 cases | Use polymorphism or Strategy pattern |
| Duplicate code | Copy-pasted logic | Extract to shared method (DRY principle) |
| Empty Update | Empty MonoBehaviour event methods | Remove or wrap with #if UNITY_EDITOR |
| Magic Numbers | Hard-coded numeric values | Use constants or ScriptableObject |
| Deep nesting | More than 3 levels of if/for nesting | Extract methods or use Guard Clause |
| Reflection-based access modifier bypass | Code uses `System.Reflection` (`GetField`/`GetMethod` with `BindingFlags.NonPublic`) to read or invoke `private`/`internal` members of another class | Refactor to expose an intentional public API (property, method, or `[InternalsVisibleTo]`) instead of reaching into internals. See CoreCLR note below — this pattern is expected to become stricter, not more lenient |
| Cached reflection objects held long-term | `Type.GetType()`, `GetMethod()`, etc. results stored in static fields or long-lived collections without pooling | Per Unity's official reflection-overhead guidance, cache reflection lookups but be aware the GC continuously scans cached reflection objects for the object's lifetime — prefer compiled delegates (`Expression.Compile`) or source generators for hot paths |

## Unity 6.x CoreCLR Impact on Code Quality Checks

> **Status note**: CoreCLR is an **experimental** scripting backend option. Its exact version availability should not be assumed from memory — it has been confirmed present as a `ScriptingImplementation` enum value as early as Unity 6000.5 via live reflection against a connected project, earlier than some public changelogs might suggest. The separate, more clearly version-gated feature is the **CoreCLR Editor** (running the Editor itself on CoreCLR), which Unity discussion threads place around Unity 6.6+ with a stated target of full support by Unity 6.8. Treat the items below as forward-looking guidance to flag during code review, not as build-breaking errors — most current projects still run on Mono/IL2CPP. When in doubt, verify directly against the connected project via `execute_code` rather than citing a specific version number.

- **Stricter access modifier enforcement**: CoreCLR enforces `public`/`internal`/`private` more strictly than the Mono runtime historically has. Code that relies on reflection (`BindingFlags.NonPublic | BindingFlags.Instance`) to read or invoke another class's private members — a pattern sometimes used to work around missing public APIs — is a maintainability risk regardless of backend, and is more likely to break when a project eventually migrates to CoreCLR. Flag this pattern as a violation during architecture checks and suggest an explicit public/internal API instead
- **Serialization changes**: Unity's serialization system is being updated alongside the CoreCLR migration (a new, faster binary serializer is replacing some legacy paths). Custom `ISerializationCallbackReceiver` implementations and heavy reliance on non-standard serialization tricks (e.g., serializing through reflection-based custom formatters) are worth flagging as "verify after CoreCLR migration" items, since exact byte-level serialization behavior may change
- **No action needed for typical MonoBehaviour/ScriptableObject code**: Standard `[SerializeField]` fields, public properties, and conventional C# code are unaffected — these CoreCLR notes only matter for code that leans on reflection internals or custom serialization plumbing
