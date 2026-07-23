# Unity General Development Steering

<!-- File Purpose / 本檔案用途: Unity general development steering guide / Unity 通用開發的 steering 指引，涵蓋專案結構慣例、命名規範、效能通則、MCP 連線健康檢查及 Unity 6.x 版本驗證原則。 -->

## Role and Purpose

Unity projects benefit from consistent conventions and performance-aware practices across all domains. Following these conventions helps teams collaborate effectively and makes projects easier to maintain as they grow. This document serves as the foundation layer for all domain-specific steering files, providing cross-domain general guidance on project structure, naming conventions, performance baselines, and MCP connection health.

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
- Use `manage_packages(action: "list_packages")` (asynchronous — poll with `action: "status", job_id: ...`) to confirm all UPM packages are compatible with the target Unity version
- Note Render Pipeline compatibility: Shaders and materials are not interchangeable between Built-in, URP, and HDRP

### Unity 6.x Behavior Changes Worth Verifying Live

Unity 6 ships frequent Update releases (6.0, 6.1, ... 6.7+) that change editor defaults without a major version bump, and public changelogs/discussion threads are not always precise about exactly which point release introduced a given default. **Do not cite a specific minor version number from memory as fact.** Instead, use the connected project as ground truth: `execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")` gives the actual Unity version string, and other `execute_code` calls can query live Editor/Player state directly (see the "Verify via" column). Treat the version numbers below as the most specific figures found in Unity's own communications at the time of writing — useful as a starting hypothesis, not as a guarantee for any given project.

| Change | Detail | Action | Verify via (`execute_code`) |
|--------|--------|--------|------------------------------|
| **Enter Play Mode defaults** | Public Unity threads describe a Unity 6.6 change where new projects default to "scene reload only" — domain reload is skipped, so static fields and other in-memory state are **not** reset when entering Play Mode. This is a *default for newly created projects*, not something that retroactively changes existing projects when the Editor is upgraded | Warn the developer if their scripts rely on `OnEnable`/static-initializer side effects to reset state each Play session; recommend explicit `[RuntimeInitializeOnLoadMethod]` resets or re-enabling full domain reload in Project Settings → Editor → Enter Play Mode Settings if stale state causes bugs | `UnityEditor.EditorSettings.enterPlayModeOptionsEnabled` and `UnityEditor.EditorSettings.enterPlayModeOptions` |
| **Render Graph as the default renderer path** | URP's Render Graph API (introduced with URP 17 / Unity 6.0) is enabled by default for new URP projects. A "Compatibility Mode (Render Graph Disabled)" toggle exists as a legacy escape hatch for old-style `ScriptableRenderPass` code | When writing or reviewing custom `ScriptableRenderPass` code, target the Render Graph API (`RecordRenderGraph`), not the legacy `Execute`/`Configure` pattern. Flag Compatibility Mode usage as technical debt during code-quality checks | Confirm the active pipeline asset type is `UniversalRenderPipelineAsset` (`UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline`); the Compatibility Mode flag itself lives in Editor-only global settings and may need to be checked manually in Project Settings → Graphics if reflection access is restricted |
| **GPU Resident Drawer (URP)** | Reduces CPU draw-call overhead via `BatchRendererGroup`-based GPU instancing. Requires the **Forward+** or **Deferred+** rendering path (not classic Forward/Deferred, and not the 2D Renderer), requires compute shader support (unsupported on **OpenGL ES** and **VisionOS**), and requires Realtime GI (Enlighten) to be disabled. Confirmed via reflection: the `GPUResidentDrawerMode` enum (`Disabled` / `InstancedDrawing`) and `RenderingMode` enum (`Forward` / `Deferred` / `ForwardPlus` / `DeferredPlus`) both exist on the URP Asset type | Before recommending it, confirm via `manage_graphics(action: "pipeline_get_info")`/`pipeline_get_settings` or direct reflection that the renderer uses Forward+/Deferred+ (a project on the 2D Renderer cannot use it at all — there is no `get_settings` action). To enable: (1) Project Settings → Graphics → Shader Stripping → set BatchRendererGroup Variants to "Keep All"; (2) enable SRP Batcher on the active URP Asset; (3) set GPU Resident Drawer to "Instanced Drawing"; (4) set the Universal Renderer's Rendering Path to Forward+. Note this increases build time | `urpAsset.gpuResidentDrawerMode` and the active `ScriptableRendererData`'s type/renderingMode via reflection (see unity-general.md verification notes) |
| **CoreCLR scripting backend (Experimental)** | `ScriptingImplementation.CoreCLR` exists as a Player-build scripting-backend enum value across multiple Unity 6.x releases — confirmed present via live reflection on a 6000.5 project, so it predates whatever version a changelog might imply. The separate, more clearly version-gated effort is the **CoreCLR Editor** (running the Editor process itself on CoreCLR), which Unity community threads associate with Unity 6.6+ and a stated target of fuller support by Unity 6.8 | Do not assume a specific version cutoff. Treat CoreCLR as experimental regardless of version and continue defaulting to **IL2CPP** for release builds and **Mono** for fast-iterating development builds | `System.Enum.GetNames(typeof(UnityEditor.ScriptingImplementation))` — check whether `CoreCLR` is present |
| **Built-in Render Pipeline status** | URP is the default and Unity-recommended render pipeline for new Unity 6 projects. The Built-in Render Pipeline remains usable for existing/legacy projects; Unity's public "Render Pipelines strategy" communications say Built-in stays available at least through the 6.7 LTS window for live titles, without committing to a final removal version | If live reflection reports Built-in Render Pipeline (`GraphicsSettings.currentRenderPipeline == null`) on a new/greenfield project, flag it and suggest URP. For existing Built-in projects, do not force a migration unprompted | `UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline == null` → Built-in; otherwise inspect the type name |
| **XR: OculusXR package status** | Unity's own "planned breaking changes" communications describe the OculusXR package as deprecated since 6.5 and slated for removal around 6.7, in favor of the OpenXR Plugin package. This has not been directly verified against a project that has the package installed — treat as reported-but-unverified until checked against an actual XR project | For Meta Quest / Oculus targets, recommend the **OpenXR Plugin** package. Before asserting removal status as fact for a specific project, check installed packages directly rather than citing the version number alone | `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status", job_id: ...`) — check results for `com.unity.xr.oculus` and `com.unity.xr.openxr` |
| **Intel-based macOS Editor support** | Public Unity communications describe Intel Mac Editor support winding down starting around Unity 6.6, with the 6.7 LTS window cited as a likely last-inclusion point | Inform developers on Intel Macs that future Unity versions may require Apple Silicon; not actionable via MCP tools, informational only, and not independently verified here | Not verifiable via MCP (host OS/architecture, not project state) |
| **Unity 7 forward-compatibility** | Unity's public roadmap communications describe Unity 7 as a continuation of the Unity 6/CoreCLR architecture rather than a breaking rewrite, targeted for early 2027 | No action needed today; mention this only if a developer asks about long-term roadmap planning, and flag it as roadmap information rather than shipped behavior | Not verifiable via MCP (future release) |

> **Verification discipline**: Always confirm the actual project's Unity version via `UnityEngine.Application.unityVersion` (through `execute_code`) before applying version-specific advice — do not assume the latest release just because it's current in public documentation. When a claim is checkable at runtime (enum values, active render pipeline, active scripting backend, installed packages, Editor settings), verify it directly against the connected project via MCP rather than relying on a remembered version number from training data or web research. Reserve unverifiable claims (package removal timelines, OS support windows, future roadmap) as clearly labeled "reported, not directly verified" rather than presenting them with the same confidence as a live-checked fact.

## MCP Connection Health Check Guide

### Connection Check Flow

Before executing any MCP operation, perform a lightweight health check:

```
Attempt a cheap read-only call → Success: MCP connection normal → Failure: Diagnose and prompt
```

1. **Probe**: Attempt a cheap read-only call, e.g. `manage_scene(action: "get_active")` or `execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")` — there is no standalone `project_info` resource/tool to read
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

## Local-Only Execution Model

All operations in this Power run through the local Unity Editor via unity-mcp — there is no cloud build service, remote device farm, or "Cloud_Assist" layer in the current tool surface (earlier drafts of this Power described such a layer; it does not exist in the connected `CoplayDev/unity-mcp` tool set). Asset automation, scene scaffolding, builds (`manage_build`), performance analysis, code quality checks, knowledge management, platform compatibility checks, and asset dependency analysis all execute directly against the connected Unity Editor.

If cloud build or remote device-testing integration is genuinely needed, it would require wiring up a separate custom tool/service outside unity-mcp's current scope — do not assume such a fallback path exists when planning a workflow.

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

- Prefer `batch_execute` to combine multiple independent operations, reducing MCP round trips — remember each command's second key is `params`, not `args`
- Before modification operations, use the corresponding `search`/`get_info` action to confirm the target exists (not `list` — most tools have no `list` action; see the tool reference in `POWER.md`)
- All paths use Unity's forward slash format (`Assets/Scripts/Player.cs`), not backslashes
- After operations complete, use `read_console()` to confirm no error messages on the Unity Editor side
- Watch for snake_case vs. flat-object parameter shapes — e.g. `manage_build` uses `output_path`/`scripting_backend` as top-level snake_case params rather than a nested camelCase `options` object; when unsure, a failed call's Pydantic validation error lists the exact valid field names

### Common MCP Resources

Two `mcpforunity://`-scheme resources are confirmed from tool documentation: `mcpforunity://scene/gameobject/{id}` (full GameObject detail, paired with `find_gameobjects`) and `mcpforunity://scene/gameobject/{id}/components` (component detail). **Do not assume a `project_info`, `editor_state`, or `editor_selection` resource exists** — none of these were confirmed against a live connection. Use tool calls instead:

| Need | Use Instead |
|------|-------------|
| Project/Unity version info | `execute_code` (`UnityEngine.Application.unityVersion`, etc.) or `manage_packages(action: "list_packages")` |
| Current editor/scene state | `manage_scene(action: "get_active")` or `manage_scene(action: "get_hierarchy")` |
| GameObject detail | `find_gameobjects` for instance IDs, then the `mcpforunity://scene/gameobject/{id}` resource |
| Current selection | Not directly exposed as of this writing — use `find_gameobjects` with an appropriate search instead |

### Live Verification Recipes (`execute_code`, `compiler: "codedom"`)

When a claim needs runtime confirmation rather than a remembered version number, these `execute_code` snippets (C# 6-compatible, so they work with the default `codedom` compiler without requiring Roslyn/NuGet setup) are known to work for checking the state described in this file's version-change table:

```csharp
// Unity version, active render pipeline type, current Graphics API
return new {
  unityVersion = UnityEngine.Application.unityVersion,
  graphicsApi = UnityEngine.SystemInfo.graphicsDeviceType.ToString()
};
```
```csharp
// Active render pipeline: null result means Built-in Render Pipeline
return UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline != null
  ? UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline.GetType().Name
  : "BuiltIn (null pipeline asset)";
```
```csharp
// Enter Play Mode Options — confirms whether domain/scene reload is skipped
return UnityEditor.EditorSettings.enterPlayModeOptionsEnabled + " | " +
  UnityEditor.EditorSettings.enterPlayModeOptions.ToString();
```
```csharp
// Confirm CoreCLR is offered as a ScriptingImplementation option (does not confirm it's selected)
return string.Join(",", System.Enum.GetNames(typeof(UnityEditor.ScriptingImplementation)));
```
```csharp
// GPU Resident Drawer mode on the active URP Asset (requires com.unity.render-pipelines.universal)
var urp = UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline
  as UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset;
return urp == null ? "no URP asset active" : urp.gpuResidentDrawerMode.ToString();
```

> **Note on `NamedBuildTarget`**: `UnityEditor.PlayerSettings.GetScriptingBackend(UnityEditor.NamedBuildTarget...)` does not compile under the default `codedom` compiler in some Unity versions (missing namespace in that compilation context) — prefer `UnityEditor.PlayerSettings.GetScriptingBackend(UnityEditor.BuildPipeline.GetBuildTargetGroup(buildTarget))` (the older `BuildTargetGroup`-based overload) as a more portable fallback when checking the active scripting backend live.
>
> For checking installed packages (e.g., presence of `com.unity.xr.oculus` or `com.unity.xr.openxr`), use the `manage_packages` MCP tool's `list_packages`/`search_packages` actions rather than `execute_code` — package manager state is asynchronous and exposed through its own job-polling API (`action: "status"` with the returned `job_id`), not through direct reflection.
