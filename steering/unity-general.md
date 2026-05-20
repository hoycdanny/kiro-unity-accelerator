# Unity General Development Steering

<!-- File Purpose / 本檔案用途: Unity general development steering guide / Unity 通用開發的 steering 指引，涵蓋專案結構慣例、命名規範、效能通則、MCP 連線健康檢查及 Cloud_Assist 降級策略。 -->

## Role and Purpose

Unity projects benefit from consistent conventions and performance-aware practices across all domains. Following these conventions helps teams collaborate effectively and makes projects easier to maintain as they grow. This document serves as the foundation layer for all domain-specific steering files, providing cross-domain general guidance on project structure, naming conventions, performance baselines, MCP connection health, and Cloud_Assist degradation strategies.

## Unity Project Structure Conventions

### Standard Folder Structure

```
Assets/
├── Animations/          # AnimationClip, Animator Controller
├── Audio/
│   ├── Music/           # Background music (.wav, .ogg)
│   └── SFX/             # Sound effects (.wav, .mp3)
├── Editor/              # Editor-only scripts (not included in builds)
├── Materials/           # Materials (.mat)
├── Models/
│   ├── Characters/      # Character models (.fbx, .obj)
│   └── Environment/     # Environment models
├── Plugins/             # Third-party plugins
├── Prefabs/             # Prefab objects (.prefab)
├── Resources/           # Assets loaded via Resources.Load (use with caution — see note below)
├── Scenes/              # Scene files (.unity)
├── Scripts/
│   ├── Core/            # Core systems (GameManager, EventSystem)
│   ├── Gameplay/        # Game logic
│   ├── UI/              # UI-related scripts
│   └── Utils/           # Utility classes
├── Shaders/             # Custom Shaders
├── StreamingAssets/     # Files copied as-is to builds
├── Textures/            # Textures (.png, .jpg, .tga)
└── UnityAccelerator/
    └── Config/          # Kiro Unity Power custom settings
```

### Folder Convention Rules

- **Do not** place more than a few dozen small assets in the `Resources/` folder — all assets under Resources are included in builds, even if unreferenced, which increases build size. Consider Addressables or AssetBundles for dynamic loading instead
- **Use** Addressables or AssetBundles instead of Resources.Load for dynamic loading
- Scripts in **Editor/** folder are only available in Unity Editor, not included in builds
- Files in **StreamingAssets/** are copied as-is to build artifacts, suitable for config files that need to be read at runtime
- Each feature module should use an independent Assembly Definition (.asmdef) to speed up compilation

## Naming Conventions

### C# Script Naming

| Type | Convention | Example |
|------|-----------|---------|
| Class | PascalCase | `PlayerController`, `GameManager` |
| Interface | I + PascalCase | `IDamageable`, `IInteractable` |
| Method | PascalCase | `TakeDamage()`, `Initialize()` |
| Public field | camelCase | `maxHealth`, `moveSpeed` |
| Private field | _camelCase | `_currentHealth`, `_rigidbody` |
| Constant | UPPER_SNAKE_CASE | `MAX_PLAYERS`, `DEFAULT_SPEED` |
| Enum | PascalCase | `GameState.Playing`, `DamageType.Fire` |
| Event | On + PascalCase | `OnPlayerDeath`, `OnLevelComplete` |

### Asset Naming

| Type | Convention | Example |
|------|-----------|---------|
| Scene | PascalCase | `MainMenu.unity`, `Level01.unity` |
| Prefab | PascalCase | `EnemySpider.prefab`, `HealthBar.prefab` |
| Material | M_ + description | `M_Character_Skin.mat`, `M_Metal_Rusty.mat` |
| Texture | T_ + description + type | `T_Character_Diffuse.png`, `T_Wall_Normal.png` |
| Animation | Anim_ + description | `Anim_Idle.anim`, `Anim_Run.anim` |
| Shader | S_ + description | `S_Toon_Outline.shader` |

> **Why these baselines exist**: Unity's default settings are optimized for editor usability, not runtime performance. The guidelines below represent the gap between 'works in editor' and 'ships on target hardware'.

## Performance Guidelines

### Key Performance Metrics and Recommended Thresholds

> **Getting started with performance**: If these metrics are new to you, focus on **Frame Rate** first — it directly affects user experience. As you gain experience, the other metrics help diagnose specific bottlenecks. Each metric is explained in the Description column.

| Metric | Mobile Recommended | Desktop Recommended | Description |
|--------|-------------------|--------------------| ------------|
| Draw Calls | < 100 | < 500 | Reduce with Static/Dynamic Batching, GPU Instancing |
| Triangles | < 100K/frame | < 1M/frame | Use LOD, Occlusion Culling |
| GC Allocation | < 1KB/frame | < 5KB/frame | Avoid memory allocation in Update |
| Frame Rate | ≥ 30 FPS | ≥ 60 FPS | User experience degrades noticeably below these |
| Shader Variants | < 50 | < 200 | Too many variants increase build time and memory |

### Common Performance Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Using Find/GetComponent in Update() | Per-frame search causes CPU overhead | Cache references in Awake/Start |
| Frequent Instantiate/Destroy | High GC pressure | Use Object Pool pattern |
| Uncompressed textures | Memory and bandwidth waste | Choose appropriate compression format per platform |
| Too many realtime lights | Draw Call multiplication | Use Lightmap baking for static lights (suitable for visual-quality-focused projects like architectural visualization; training simulations may prefer simpler lighting for performance) |
| Not using LOD | Distant objects still render at high polygon count | Set up LOD Groups for complex models |
| Oversized Canvas | High UI rebuild cost | Separate static and dynamic UI into different Canvases |
| String concatenation | Generates excessive GC | Use StringBuilder or string.Format |
| LINQ in hot paths (frequently executed code) | Hidden memory allocations | Use for loops instead |

### Unity Version Compatibility Notes

- Before upgrading Unity versions, always back up the project and read Breaking Changes in Release Notes
- Use `manage_packages(action: "list")` to confirm all UPM packages are compatible with the target Unity version
- Note Render Pipeline compatibility: Shaders and materials are not interchangeable between Built-in, URP, and HDRP

## MCP Connection Health Check Guide

### Connection Check Flow

Before executing any MCP operation, perform a lightweight health check:

```
Attempt to read project_info → Success: MCP connection normal → Failure: Diagnose and prompt
```

1. **Probe**: Attempt to read the `project_info` resource
2. **Success**: Confirm MCP connection is normal, proceed with subsequent operations
3. **Failure**: Provide specific prompts based on error type

### Failure Diagnosis and Prompts

| Error Type | Possible Cause | Prompt Message |
|------------|---------------|----------------|
| Connection Refused | MCP Server not started | Open Window > MCP for Unity > Start Server in Unity Editor |
| Connection Timeout | Unity Editor is busy (compiling/building) | Unity Editor may be performing a time-consuming operation, please wait and retry |
| Host Unreachable | localhost configuration issue | Verify that localhost:8080 is not occupied by another process |
| Invalid Response Format | MCP Server version incompatible | Update the unity-mcp UPM package to the latest version |
| Unity Editor Not Open | Editor not launched | Open Unity Editor and load a project first |

### Health Check Timing

- **Before first operation**: Before the first MCP operation at the start of each Kiro session
- **After connection interruption**: Before retrying after detecting an MCP connection error
- **After long idle**: When no MCP operations have been performed for over 5 minutes

## Cloud_Assist Degradation Strategy Guide

### Degradation Principles

All Cloud_Assist errors should never block the developer's workflow. When cloud services are unavailable, the system should automatically and transparently degrade to local MCP execution.

### Degradation Trigger Conditions

| Condition | Detection Method | Degradation Behavior |
|-----------|-----------------|---------------------|
| Network unavailable | Cloud_Assist API connection failure | Auto-switch to local MCP execution |
| Cloud service error | API returns 5xx error | Auto-switch to local MCP execution |
| Authentication expired | API returns 401/403 | Prompt the developer to re-authenticate, degrade to local simultaneously |
| Response timeout | No response for over 60 seconds | Auto-switch to local MCP execution |

### Degradation Flow

```
Cloud_Assist request → Failure → Log error → Notify the developer of degradation → Local MCP execution → Report results
```

1. Detect Cloud_Assist unavailability
2. Log error reason (for subsequent diagnosis)
3. Notify the developer: "Cloud_Assist is temporarily unavailable, automatically switched to local mode"
4. Execute the same operation using local MCP tool calls
5. Report execution results normally

### Local Mode Feature Scope

After degrading to local mode, most features remain fully available through local MCP execution:

**Fully available locally:** Asset preset automation, scene scaffolding, local builds (via `manage_editor`), performance analysis, code quality checks, knowledge management, platform compatibility checks, asset dependency analysis, and workflow automation.

**Requires Cloud_Assist (unavailable after degradation):**
- Cloud builds — requires cloud infrastructure for remote compilation
- Remote device testing — requires cloud-hosted physical devices

### Recovery Strategy

- After degradation, Kiro should periodically attempt to restore Cloud_Assist connection (every 5 minutes)
- On successful recovery, notify the developer: "Cloud_Assist has recovered, subsequent operations will use cloud acceleration"
- Do not automatically re-execute operations already completed locally

## Batch Operation Partial Failure Handling Guide

### Handling Principles

Partial failures in batch operations (via `batch_execute`) should not interrupt the entire batch. The system should adopt a "best effort" strategy, ultimately reporting complete success/failure status.

### Handling Flow

```
batch_execute starts → Execute one by one → Record each result → Continue remaining → Aggregate report
```

1. **Execute one by one**: Execute each operation in batch_execute sequentially
2. **Record status**: Record success/failure status and details for each operation
3. **Failure doesn't interrupt**: When a single operation fails, continue processing remaining operations
4. **Aggregate report**: After all operations complete, produce a structured aggregate report

### Aggregate Report Format

```
Batch operation complete:
- Total: N operations
- Succeeded: X
- Failed: Y

Failed items:
1. [asset path/operation name] — error reason
2. [asset path/operation name] — error reason
```

### Operations Requiring Atomicity

Some operations require atomicity guarantees (all succeed or all rollback):

| Operation Type | Atomicity Requirement | Handling |
|---------------|----------------------|----------|
| Asset_Preset application | Single asset atomic | Rollback single asset to original state on failure |
| Scene_Scaffold generation | Whole atomic | Delete already-created objects on failure |
| Workflow step execution | Step-level atomic | Pause on step failure, provide retry/skip/abort options |
| Build operations | Whole atomic | Clean up incomplete artifacts on failure |

### Error Classification and Handling Strategy

| Error Category | Example | Strategy |
|---------------|---------|----------|
| Retryable errors | MCP connection timeout, file temporarily locked | Auto-retry once, record if still fails |
| Non-retryable errors | Asset path doesn't exist, invalid parameters | Record directly, continue to next operation |
| Fatal errors | MCP Server completely unreachable | Interrupt entire batch, prompt the developer to check connection |

## MCP Tool General Notes

### Tool Call Best Practices

- Prefer `batch_execute` to combine multiple independent operations, reducing MCP round trips
- Before modification operations, use the corresponding `list` or `get_info` action to confirm the target exists
- All paths use Unity's forward slash format (`Assets/Scripts/Player.cs`), not backslashes
- After operations complete, use `read_console()` to confirm no error messages on the Unity Editor side

### Common MCP Resources

| Resource | Purpose | When to Use |
|----------|---------|-------------|
| `project_info` | Get project basic info (Unity version, Render Pipeline, platform) | Health check, environment confirmation |
| `editor_state` | Get current Unity Editor state (Play Mode, compiling) | Confirm Editor state before operations |
| `gameobject` | Get detailed info for a specified GameObject | Scene object queries |
| `editor_selection` | Get the developer's currently selected objects | Execute operations based on selection |
