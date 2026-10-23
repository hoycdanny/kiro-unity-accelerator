# Unity General Development Steering

<!-- File Purpose / 本檔案用途: Unity general development steering guide / Unity 通用開發的 steering 指引，涵蓋專案結構慣例、命名規範、效能通則、MCP 連線健康檢查、工具群組啟用，以及以 Unity 6.4 為基準的版本驗證原則。 -->

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

### Unity Version Baseline (Unity 6.4)

This is the version policy every other steering file in this Power defers to. Cross-reference it rather than restating version numbers locally.

- **Baseline / primary target: Unity 6.4, stream `6000.4`, pinned patch `6000.4.12f1`** (released 17 Jun 2026). Every version-specific claim in this Power was checked against this stream and no other. The live-verified pairing is Unity `6000.4.6f1` + URP 17.4.0 + MCP for Unity 9.6.8 on the Windows Editor, checked 2026-10-21.
- **Minimum supported Editor for this Power: Unity 6.0 (`6000.0`).** Build Profiles (`manage_build`'s `profile`/`profiles` params) are Unity 6+ only, and the Render Graph / GPU Resident Drawer guidance throughout these files is Unity 6-era. The bridge's own floor is lower — MCP for Unity supports Unity 2021.3 LTS or newer — so this Power's floor is deliberately higher than the bridge's.
- **Bridge target: MCP for Unity v10.3.0 or newer (minimum v10.0.0).**
- **Anything past 6.4 is forward-looking and unverified.** The Power is expected to work on 6.5, 6.6 and later 6.x releases, but none of them was verified here — say so rather than implying coverage. Unity 6.4 is an Update release whose patch stream has ended, so a project locking production down should move to **Unity 6.3 LTS (supported through Dec 2027)** or forward to the current Update release. **Never recommend Unity 6.0 LTS** — its support window closed on 16 Oct 2026.
- Sources: [Unity releases](https://unity.com/releases/) and [endoflife.date/unity](https://endoflife.date/unity), both retrieved 2026-10-21.

### Unity Version Compatibility Notes

- Before upgrading Unity versions, always back up the project and read Breaking Changes in Release Notes
- Use `manage_packages(action: "list_packages")` (asynchronous — poll with `action: "status", job_id: ...`) to confirm all UPM packages are compatible with the target Unity version
- Note Render Pipeline compatibility: Shaders and materials are not interchangeable between Built-in, URP, and HDRP
- To read the connected project's version and platform without activating any tool group, read the `mcpforunity://project/info` resource. It reports the project root, Unity version and platform, and replaces the `execute_code` snippet older drafts of this file recommended
- Several `Rigidbody` / `Rigidbody2D` members are deprecated on the 6.4 baseline. The canonical obsolete→current mapping — including the 2D/3D difference that is easy to get backwards — is in `code-quality.md` under "Current Physics APIs on Unity 6.4 (obsolete → current)". Use that section when generating or reviewing physics code; it is not restated here. To re-check the same facts on another Editor version, call `unity_reflect(action: "get_type", class_name: "...")` and read the `obsolete_members` field

### Unity 6.x Behavior Changes Worth Verifying Live

Unity 6 ships frequent Update releases that change editor defaults without a major version bump, and public changelogs and discussion threads are not always precise about which point release introduced a given default. **Do not cite a minor version number from memory as fact, and do not attach behaviour to a release past the 6.4 baseline above as though it were verified.** Use the connected project as ground truth instead: read `mcpforunity://project/info` for the Unity version (no tool group needed), and use `execute_code` for live Editor/Player state (see the "Verify via" column). The rows below are written against the **Unity 6.4** baseline; where a row describes something Unity has only announced, it is labelled as reported-but-unverified.

> **Tool group note for the "Verify via" column**: `execute_code` is declared in the `scripting_ext` tool group, which the bridge reports as off by default — but on the live-verified install it was callable with no activation. Just run the recipe; only if `execute_code` is reported as not existing do you run `manage_tools(action: "activate", group: "scripting_ext")` — see [Tool Group Activation](#tool-group-activation-manage_tools) below.

| Change | Detail | Action | Verify via (`execute_code`) |
|--------|--------|--------|------------------------------|
| **Enter Play Mode defaults** | Public Unity threads describe a change in a 6.x Update release after the 6.4 baseline where new projects default to "scene reload only" — domain reload is skipped, so static fields and other in-memory state are **not** reset when entering Play Mode. The exact release is **reported, not verified**. This is a *default for newly created projects*, not something that retroactively changes existing projects when the Editor is upgraded | Warn the developer if their scripts rely on `OnEnable`/static-initializer side effects to reset state each Play session; recommend explicit `[RuntimeInitializeOnLoadMethod]` resets or re-enabling full domain reload in Project Settings → Editor → Enter Play Mode Settings if stale state causes bugs | `UnityEditor.EditorSettings.enterPlayModeOptionsEnabled` and `UnityEditor.EditorSettings.enterPlayModeOptions` |
| **Render Graph is the only path (Compatibility Mode removed in 6.4)** | URP's Render Graph API arrived with URP 17 / Unity 6.0. **Unity 6.4 removes URP Compatibility Mode for custom render passes entirely, along with the `URP_COMPATIBILITY_MODE` scripting define** — there is no legacy escape hatch left to toggle. The verified pairing on the 6.4 baseline is URP **17.4**. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21 | Write and review custom `ScriptableRenderPass` code against the Render Graph API (`RecordRenderGraph`) only — never the legacy `Execute`/`Configure` pattern, and never suggest re-enabling Compatibility Mode on 6.4. A project upgrading from an earlier 6.x that still has legacy passes must port them before it will render on 6.4 | Confirm the active pipeline asset type is `UniversalRenderPipelineAsset` via `manage_graphics(action: "pipeline_get_info")` (core group, no activation needed); read the URP package version from `manage_packages(action: "list_packages")` |
| **GPU Resident Drawer (URP, available on the Unity 6.4 baseline)** | Reduces CPU draw-call overhead via `BatchRendererGroup`-based GPU instancing. Requires the **Forward+** or **Deferred+** rendering path (not classic Forward/Deferred, and not the 2D Renderer), requires compute shader support (unsupported on **OpenGL ES** and **VisionOS**), and requires Realtime GI (Enlighten) to be disabled. Confirmed via reflection: the `GPUResidentDrawerMode` enum (`Disabled` / `InstancedDrawing`) and `RenderingMode` enum (`Forward` / `Deferred` / `ForwardPlus` / `DeferredPlus`) both exist on the URP Asset type. On 6.4 the redesigned Rendering Statistics window itemises which batching path absorbed each draw call, so read `manage_graphics(action: "stats_get")` output with that breakdown in mind rather than treating draw calls as one number | Before recommending it, confirm via `manage_graphics(action: "pipeline_get_info")`/`pipeline_get_settings` or direct reflection that the renderer uses Forward+/Deferred+ (a project on the 2D Renderer cannot use it at all — there is no `get_settings` action). To enable: (1) Project Settings → Graphics → Shader Stripping → set BatchRendererGroup Variants to "Keep All"; (2) enable SRP Batcher on the active URP Asset; (3) set GPU Resident Drawer to "Instanced Drawing"; (4) set the Universal Renderer's Rendering Path to Forward+. Note this increases build time | `urpAsset.gpuResidentDrawerMode` and the active `ScriptableRendererData`'s type/renderingMode via reflection (see unity-general.md verification notes) |
| **CoreCLR scripting backend (Experimental, and not selectable through the bridge)** | `ScriptingImplementation.CoreCLR` exists as a Player-build scripting-backend enum value in the Editor on several Unity 6.x releases. **It does not matter for this Power: `manage_build`'s `scripting_backend` parameter accepts only `mono` or `il2cpp`, so CoreCLR cannot be selected through the bridge at all.** The separate **CoreCLR Editor** effort (running the Editor process itself on CoreCLR) is a forward-looking, unverified item here — do not attach it to a specific release | Never tell a developer the Power can build with CoreCLR. Keep **IL2CPP** for release builds and **Mono** for fast-iterating development builds; those are the only two values the bridge will accept. If a developer wants to experiment with CoreCLR, that is a manual Player Settings change in the Editor, outside `manage_build` | `System.Enum.GetNames(typeof(UnityEditor.ScriptingImplementation))` shows what the *Editor* offers; `manage_build(action: "settings", property: "scripting_backend")` shows what the *bridge* can read and write |
| **Built-in Render Pipeline status** | URP is the default and Unity-recommended render pipeline for new Unity 6 projects. The Built-in Render Pipeline remains usable for existing/legacy projects; Unity's public "Render Pipelines strategy" communications say Built-in stays available for live titles into a later 6.x LTS window without committing to a final removal version — treat the specific release as reported, not verified | If live reflection reports Built-in Render Pipeline (`GraphicsSettings.currentRenderPipeline == null`) on a new/greenfield project, flag it and suggest URP. For existing Built-in projects, do not force a migration unprompted | `UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline == null` → Built-in; otherwise inspect the type name |
| **XR: HoloLens 2 deprecated (6.4, documented)** | Unity 6.4 deprecates HoloLens 2 platform support and its plug-in; the documented migration is the OpenXR plug-in. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21 | For HoloLens 2 targets, move to `com.unity.xr.openxr` before upgrading to 6.4. Flag any project that still depends on the HoloLens 2 plug-in | `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status", job_id: ...`) |
| **XR: OculusXR package status** | Unity's own "planned breaking changes" communications describe the OculusXR package as deprecated and slated for removal in a later 6.x Update release, in favor of the OpenXR Plugin package. The deprecation is reported; **the removal release is unverified** and was not checked against a project with the package installed | For Meta Quest / Oculus targets, recommend the **OpenXR Plugin** package. Before asserting removal status as fact for a specific project, check installed packages directly rather than citing a version number | `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status", job_id: ...`) — check results for `com.unity.xr.oculus` and `com.unity.xr.openxr` |
| **Intel-based macOS Editor support** | Public Unity communications describe Intel Mac Editor support winding down over the later 6.x Update releases. The specific last-inclusion release is **reported, not verified** | Inform developers on Intel Macs that future Unity versions may require Apple Silicon; not actionable via MCP tools, informational only | Not verifiable via MCP (host OS/architecture, not project state) |
| **Unity 7 forward-compatibility** | Unity's public roadmap communications describe Unity 7 as a continuation of the Unity 6/CoreCLR architecture rather than a breaking rewrite, targeted for early 2027 | No action needed today; mention this only if a developer asks about long-term roadmap planning, and flag it as roadmap information rather than shipped behavior | Not verifiable via MCP (future release) |

> **Verification discipline**: Always confirm the actual project's Unity version before applying version-specific advice — read the `mcpforunity://project/info` resource (no tool group needed), or `UnityEngine.Application.unityVersion` through `execute_code` if the `scripting_ext` group is already active. Do not assume the 6.4 baseline is what the developer is running, and do not assume the latest public release either. When a claim is checkable at runtime (enum values, active render pipeline, active scripting backend, installed packages, Editor settings), verify it directly against the connected project via MCP rather than relying on a remembered version number from training data or web research. Reserve unverifiable claims (package removal timelines, OS support windows, future roadmap) as clearly labeled "reported, not directly verified" rather than presenting them with the same confidence as a live-checked fact.

## MCP Connection Health Check Guide

### Connection Check Flow

Before executing any MCP operation, perform a lightweight health check:

```
Attempt a cheap read-only call → Success: MCP connection normal → Failure: Diagnose and prompt
```

1. **Probe**: `manage_scene(action: "get_active")` — and only that. It is read-only, it is in the default-on `core` tool group, and it needs no arguments. Do **not** probe with `execute_code`: it is declared in the `scripting_ext` group, so a failed probe could not distinguish a connection problem from a tool-visibility one
2. **Success**: Confirm MCP connection is normal, proceed with subsequent operations
3. **Failure**: Provide specific prompts based on error type

### Failure Diagnosis and Prompts

| Error Type | Possible Cause | Prompt Message |
|------------|---------------|----------------|
| Connection Refused | MCP Server not started | Open Window > MCP for Unity in the Unity Editor and confirm the status panel reads `Connected`; use Restart Server to recover |
| Connection Timeout | Unity Editor is busy (compiling/building) | Unity Editor may be performing a time-consuming operation, please wait and retry |
| Host Unreachable | Wrong host/port in the MCP client config | The port is whatever the server was launched with (`--http-url`), not a constant. Read the endpoint shown in the Window > MCP for Unity panel (default 8080), or list `<UnityProject>\Library\MCPForUnity\RunState\` — the running server's pidfile is named `mcp_http_<port>.pid`, so `mcp_http_8080.pid` means port 8080. Make the client's URL match |
| Tool reported as not existing | Possibly the tool's group is not active for this session — but on the verified install every non-core tool was callable with no activation, so check the message first | Run the `manage_tools` recovery sequence below (`list_groups` → `sync` → `activate`), then refresh or reconnect the MCP client. Do not present the group as the confirmed cause until activation actually fixes it |
| Tool call denied by permissions | An IDE-side `capability: mcp` / `effect: deny` rule, not a bridge fault | The message names the rule and the file (`~/.kiro/settings/permissions.yaml`). Report the matched rule to the developer and stop — see "Tool Call Denied by the IDE's Permissions" below |
| `Unknown action` from inside a `batch_execute` | `batch_execute` bypasses the Python server layer, so server-layer actions fail there with a misleading message | Retest the action as a **direct** call before believing it does not exist — see "Batch Operation Partial Failure Handling Guide" below |
| Invalid Response Format | MCP Server version incompatible | Update the unity-mcp UPM package to the latest version |
| Unity Editor Not Open | Editor not launched | Open Unity Editor and load a project first |

### Health Check Timing

- **Before first operation**: Before the first MCP operation at the start of each Kiro session
- **After connection interruption**: Before retrying after detecting an MCP connection error
- **After long idle**: When no MCP operations have been performed for over 5 minutes

## Tool Group Activation (`manage_tools`)

This is the single canonical copy of the activation procedure. Every other steering file cross-references this section instead of repeating it.

**This is conditional troubleshooting, not a preamble.** Do not run an activation step "just in case" at the start of a workflow. Call the tool you need; only if it comes back as *not existing* do you work through the sequence below.

The bridge gates its tool surface into **ten groups**: `core`, `animation`, `asset_gen`, `docs`, `probuilder`, `profiling`, `scripting_ext`, `testing`, `ui`, `vfx`. The bridge's declared default is `core` only — the other nine are opt-in in the source.

- **VERIFIED (2026-10-21, live install)**: the declared default was **not** what the session actually exposed. All 43 tools were callable from the first call, before any `manage_tools` invocation, and still callable right after `manage_tools(action: "reset")`. The server was launched with `--project-scoped-tools`, which may explain it. **So "the group is off" is a hypothesis to test, never the explanation for a failure you have not diagnosed.**
- **VERIFIED (2026-10-21)**: `deactivate` *is* enforced. After `manage_tools(action: "deactivate", group: "profiling")`, `manage_profiler` was rejected with `Tool 'manage_profiler' does not exist on server 'power-kiro-unity-accelerator-unity-mcp'`. Do not deactivate groups casually mid-workflow.
- **VERIFIED**: the gate is a per-session tool-*listing* filter (FastMCP component visibility keyed on a `group:<name>` tag). A hidden group's tools do not appear in the tool list, so the agent normally never selects them.
- **VERIFIED**: the server-level default (hiding every non-default group at startup) is applied **only on HTTP** transport; on stdio that step is skipped and the visibility is instead synced from the Unity Editor's own tool toggles.
- A tool can also be refused for a reason that has nothing to do with groups: the IDE's own permission rules. See "Tool Call Denied by the IDE's Permissions" below.

| Group | Tools this Power uses from it |
|-------|------------------------------|
| `core` | `manage_scene`, `manage_gameobject`, `manage_components`, `manage_asset`, `manage_build`, `manage_graphics`, `manage_material`, `manage_camera`, `manage_physics`, `manage_prefabs`, `manage_packages`, `find_gameobjects`, `find_in_file`, `read_console`, `refresh_unity`, `batch_execute`, the script tools |
| `scripting_ext` | `execute_code`, `manage_scriptable_object` |
| `testing` | `run_tests`, `get_test_job` |
| `profiling` | `manage_profiler` |
| `ui` | `manage_ui` |
| `vfx` | `manage_shader`, `manage_texture`, `manage_vfx` |
| `docs` | `unity_docs`, `unity_reflect` |
| `animation` | `manage_animation` |
| `probuilder` | `manage_probuilder` (requires `com.unity.probuilder`) |
| `asset_gen` | none — **no workflow, steering file or template in this Power routes to `asset_gen`** |

### Recovery sequence — run only after a tool is reported as not existing

```
manage_tools(action: "list_groups")                      // see the catalog
manage_tools(action: "sync")                             // adopt the Unity Tools-window toggles
manage_tools(action: "activate", group: "scripting_ext") // enable the group owning the missing tool
manage_tools(action: "reset")                            // back to core-only when finished
```

Run it in that order: `list_groups` → `sync` → `activate` → `reset`.

Behaviours to state accurately when explaining this to a developer:

- `list_groups`'s `enabled` / `default_enabled` fields are **misleading**. On the verified install they read `false` for all eight non-core groups both before and after `reset`, while every one of those tools answered normally. Never read `enabled: false` as proof a tool is unavailable, and never read it as the cause of a failure.
- The MCP client may need a refresh or reconnect before a newly activated tool appears, because some clients cache the tool list until the server restarts.
- Activation is harmless but it is not free advice: telling a developer to activate a group when the real problem is a permission rule or a stopped server sends them down the wrong path.

## Tool Call Denied by the IDE's Permissions

A tool call can be refused by the IDE **before it reaches Unity**. This is a separate failure mode from a missing tool group, and it was **VERIFIED on 2026-10-21**.

- The IDE exposes a Power's MCP server as **`power-<powerName>-<serverName>`** — for this Power, `power-kiro-unity-accelerator-unity-mcp`. That is the string permission rules match against, and the name that appears in client-side tool errors.
- A direct `manage_build(action: "settings")` call returned `Tool call denied by user's permissions. Rule: deny mcp matching "power-kiro-unity-accelerator-unity-mcp/manage_build" Source: ~/.kiro/settings/permissions.yaml` — a `capability: mcp` / `effect: deny` rule in the user's own file. The whole build workflow was unrunnable on that machine for a reason unrelated to Unity or the bridge.
- **What to do**: recognise the message as an IDE-side denial, tell the developer which rule matched and where the file is (`~/.kiro/settings/permissions.yaml`, plus the workspace-level file), and stop. Do not retry, do not edit the developer's permission file, and do not look for another route to the same operation.

## Local-Only Execution Model

All operations in this Power run through the local Unity Editor via unity-mcp — there is no cloud build service, remote device farm, or "Cloud_Assist" layer in the current tool surface (earlier drafts of this Power described such a layer; it does not exist in the connected `CoplayDev/unity-mcp` tool set). Asset automation, scene scaffolding, builds (`manage_build`), performance analysis, code quality checks, knowledge management, platform compatibility checks, and asset dependency analysis all execute directly against the connected Unity Editor.

If cloud build or remote device-testing integration is genuinely needed, it would require wiring up a separate custom tool/service outside unity-mcp's current scope — do not assume such a fallback path exists when planning a workflow.

## Batch Operation Partial Failure Handling Guide

### Handling Principles

Batch operations (via `batch_execute`) should normally adopt a "best effort" strategy: a partial failure does not interrupt the rest of the batch, and the run ends with a complete success/failure report.

**This is not the bridge's default, and it has to be requested explicitly.** `batch_execute`'s `fail_fast` parameter **defaults to `true`**, so a bare `batch_execute(commands: [...])` aborts at the first failing command and the remaining commands never run — reporting an aggregate summary for them would be reporting on work that was never attempted. **Pass `fail_fast: false` on every `batch_execute` call that is meant to be best-effort.**

Also bound the batch size: the maximum commands per batch is configurable in the Unity MCP Tools window, with a **default of 25 and a hard maximum of 100**. Split a larger job into successive batches rather than sending one oversized call.

### `batch_execute` is not equivalent to direct calls (server-layer actions)

**VERIFIED 2026-10-21.** `batch_execute` forwards each command straight to Unity's C# handler and **bypasses the action handlers implemented in the Python server layer**. `manage_editor(action: "telemetry_status")` and `manage_editor(action: "telemetry_ping")` both succeed as direct calls (`{"success": true, "telemetry_enabled": true}` / `{"success": true, "message": "telemetry ping queued"}`) and both fail inside a batch with `Unknown action: '...'`, where the error lists only the 12 Unity-side `manage_editor` actions.

Consequences, and they are binding:

- **Never wrap a server-layer action in `batch_execute`.** Call it directly. The two `manage_editor` telemetry actions are the confirmed example.
- **An `Unknown action` error raised inside a batch is not evidence the action does not exist.** Retest it as a direct call before telling a developer an action is unsupported, and before "fixing" any documentation on the strength of it.
- The usual rule that a live error outranks the docs applies to **direct calls only**.
- Only these two actions are confirmed to live in the server layer. There is no published catalog of them, so do not guess which others might — diagnose by retesting directly.
- Everything this Power actually batches (GameObject/component/asset mutation) is Unity-side work and is unaffected.

### Handling Flow

```
batch_execute(fail_fast: false) starts → Execute one by one → Record each result → Continue remaining → Aggregate report
```

1. **Pass `fail_fast: false`**: Without it the batch aborts on the first failure (the default is `true`), and keep each batch within the command cap (default 25, hard max 100)
2. **Execute one by one**: Execute each operation in batch_execute sequentially
3. **Record status**: Record success/failure status and details for each operation
4. **Failure doesn't interrupt**: With `fail_fast: false`, a single failed operation does not stop the remaining operations
5. **Aggregate report**: After all operations complete, produce a structured aggregate report. Report only on commands that actually ran — if the batch was sent without `fail_fast: false` and aborted early, say so instead of counting the unattempted commands as failures

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

- Prefer `batch_execute` to combine multiple independent operations, reducing MCP round trips — remember each command's second key is `params`, not `args`, and that server-layer actions must be called directly instead (see "`batch_execute` is not equivalent to direct calls" above)
- `manage_editor(action: "telemetry_status")` and `manage_editor(action: "telemetry_ping")` are real read-only actions, verified by direct call. They report only whether telemetry is enabled / that a ping was queued — nothing about Editor state or compilation, so use `mcpforunity://editor/state` for readiness — and they only work as **direct** calls
- Before modification operations, use the corresponding `search`/`get_info` action to confirm the target exists (not `list` — most tools have no `list` action; see the tool reference in `POWER.md`)
- All paths use Unity's forward slash format (`Assets/Scripts/Player.cs`), not backslashes
- After operations complete, use `read_console()` to confirm no error messages on the Unity Editor side
- Watch for snake_case vs. flat-object parameter shapes — e.g. `manage_build` uses `output_path`/`scripting_backend` as top-level snake_case params rather than a nested camelCase `options` object; when unsure, a failed call's Pydantic validation error lists the exact valid field names

### Common MCP Resources

**Resources read; tools mutate.** Reading a resource needs no tool group, which makes resources the cheapest way to answer "what state is the Editor in" — and it is why several recipes that older drafts of this file routed through `execute_code` are now resource reads. The full catalog is in `POWER.md`; the URIs this file's guidance depends on are:

| Need | Resource URI |
|------|--------------|
| Project root, Unity version, platform | `mcpforunity://project/info` |
| Editor readiness snapshot, including an `advice` block and server-computed staleness | `mcpforunity://editor/state` |
| Current selection (GameObjects, assets) with properties | `mcpforunity://editor/selection` |
| All project tags — read before `manage_editor(action: "add_tag"/"remove_tag")` | `mcpforunity://project/tags` |
| All layers with indices 0-31 — read before `add_layer`/`remove_layer` | `mcpforunity://project/layers` |
| Rendering stats snapshot (draw calls, batches, triangles, frame time) | `mcpforunity://rendering/stats` |
| All cameras, including Cinemachine priorities and Brain state | `mcpforunity://scene/cameras` |
| All Volume components with profiles, effects and settings | `mcpforunity://scene/volumes` |
| One GameObject's full detail, paired with `find_gameobjects` | `mcpforunity://scene/gameobject/{instance_id}` |
| One GameObject's components with full property serialization | `mcpforunity://scene/gameobject/{instance_id}/components` |

All of the URIs above are real and readable. Earlier drafts of this file carried a warning to the contrary; **that warning was wrong and has been removed.** What is actually true is narrower: there is no `project_info` *tool call* — the information lives behind the `mcpforunity://project/info` *resource*.

`mcpforunity://path/Assets/...` is **not** a resource. It is one of three accepted forms for the script tools' `uri` parameter, alongside `Assets/...` and `file://...`.

### Instance IDs Are Opaque Tokens (Unity 6.4 `EntityId`)

`find_gameobjects` returns instance IDs only, and `manage_components` and the GameObject resources key on them. Unity 6.4 deprecates `InstanceID` in favour of a new `EntityId` type, and Unity's own upgrade guidance warns against the arithmetic that older code did on instance IDs.

**Treat the returned id as an opaque token — pass it straight back to the bridge; never do arithmetic on it, sort by it, or parse it.** Concretely, do not:

- cast it to or from `int`
- infer "this is an asset, not a scene object" from its sign
- call `GetHashCode` on it and use the result as the id
- round-trip it through `ToString` + `int.Parse`
- sort by id to recover creation order

Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21.

### Live Verification Recipes (`execute_code`, `compiler: "codedom"`)

> **Tool group note**: `execute_code` is declared in the `scripting_ext` group, reported off by default but callable without activation on the live-verified install. Run the snippet; only if `execute_code` is reported as not existing do you run `manage_tools(action: "activate", group: "scripting_ext")` — see [Tool Group Activation](#tool-group-activation-manage_tools). Where a resource can answer the question instead (Unity version, platform, editor readiness, selection, tags, layers, rendering stats, cameras, volumes), prefer the resource anyway: it is cheaper and it cannot be gated.

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
