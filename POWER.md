# Unity Accelerator Power

## Overview

This package provides Unity development automation capabilities that can execute asset management, scene scaffolding, build automation, performance analysis, code quality checks, and more — all through natural language commands from the developer.

### Architecture

- **AI Layer**: Understand user intent, plan execution strategies, orchestrate MCP tool call sequences
- **unity-mcp = Execution Layer**: Open-source MCP server ([CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)) bridging the AI to Unity Editor. This guide uses unity-mcp as the MCP bridge implementation. Other MCP-compatible bridges may also work.
- **This Package = Intelligence Layer**: POWER.md (this file), steering files, and preset templates that provide deep Unity domain knowledge

### Key Principles

1. **Three-Step Setup**: Install the package, add the UPM dependency, and start the MCP server
2. **AI-Driven Architecture**: All operations originate from the AI layer; Unity Editor is the controlled target
3. **Knowledge-Driven**: Architecture separates domain knowledge (steering files) from execution logic (MCP tools)
4. **Natural Language Driven**: Developers describe intent; the AI translates to MCP tool call sequences
5. **Composable Architecture**: Complex workflows are composed from multiple MCP tool calls chained via `batch_execute`
6. **Local First**: All operations run through the local Unity Editor via MCP — there is no cloud build or remote device-testing layer in the current tool surface

### Core Behaviors

**These behaviors are always active when this Power is loaded, regardless of whether the developer mentions "Unity" explicitly.**

#### Language

Respond in the language the developer uses. If they write in Chinese, respond in Traditional Chinese (繁體中文). If they write in English or another language, match that language. When no preference is clear, default to Traditional Chinese. Technical terms may remain in English with Chinese explanation on first use. Code identifiers always stay in English.

#### Auto-Activation

When unity-mcp tools are available in the tool list, this Power is active. Any request involving scene objects, assets, scripts, builds, or game content should use this Power's workflows — the developer does not need to explicitly mention "Unity".

#### Steering-First Approach

Before executing any multi-step operation, read the relevant steering file(s) to ensure domain-correct behavior:

| Domain | Steering File |
|--------|--------------|
| Scene/GameObject operations | `scene-scaffolding.md` |
| Asset import/configuration | `asset-automation.md` |
| Build operations | `build-automation.md` |
| Performance concerns | `performance-analysis.md` |
| Code/architecture | `code-quality.md` |
| Platform targeting | `platform-compatibility.md` |
| Asset dependencies | `asset-dependencies.md` |
| Testing | `cross-platform-testing.md` |
| Multi-step automation | `workflow-automation.md` |
| Knowledge/docs | `knowledge-management.md` |
| Level design/Editor tools | `level-design-tooling.md` |
| UI analysis | `ui-dependency-analysis.md` |
| General best practices | `unity-general.md` |

#### Safety & Quality Checks

- **Post-operation**: After scene modifications adding 10+ objects (which can impact rendering performance by increasing draw calls and memory usage), run a quick performance check (draw calls, memory estimate) and check for common issues (missing colliders, shader incompatibilities). Report findings to the developer. For guidance on interpreting these metrics, see the `performance-analysis.md` steering file.
- **Render pipeline**: Always check the project's render pipeline (URP/HDRP/Built-in) before importing or recommending assets — verify via `GraphicsSettings.currentRenderPipeline` rather than assuming. Flag shader incompatibilities immediately. URP is the default and Unity-recommended pipeline for new Unity 6 projects; Built-in remains usable for existing projects and Unity has not committed to a firm removal version.
- **Play Mode**: Never make permanent scene changes while in Play Mode. Verify editor state before modifying and saving scenes.
- **Batch operations**: When placing multiple objects, ensure proper physics, vary rotation/scale for natural appearance, check performance impact for large quantities (50+), and respect the project's existing organizational structure.

#### Unity 6.7 Baseline

This Power targets **Unity 6.7** and the MCP tool surface of **[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)** as currently published. Older Unity versions and older unity-mcp releases are not a design goal — if a tool call fails with an "Unknown action" or validation error, the connected unity-mcp build is likely older than expected; tell the developer to update the package rather than trying to work around it with legacy syntax.

Two things are still worth a runtime check rather than an assumption, because they vary per-project regardless of Unity version:
- **Render pipeline**: confirm URP vs. Built-in via `manage_graphics(action: "pipeline_get_info")` before recommending pipeline-specific features like the GPU Resident Drawer (see `performance-analysis.md`)
- **GPU Resident Drawer eligibility**: requires Forward+/Deferred+ rendering path, compute-shader-capable Graphics API (not OpenGL ES/VisionOS), and is unavailable on the 2D Renderer — check before recommending it, don't assume it's on

## Setup

### Prerequisites

1. [Unity Editor](https://unity.com/download) installed and a project open (see [Unity Hub documentation](https://docs.unity3d.com/hub/manual/index.html) for getting started)
2. The IDE installed

### Installation Steps

1. **Install the MCP bridge UPM package in Unity**:
   - Open Unity Editor → Window → Package Manager
   - Add package from git URL: `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`

2. **Install this Power in the IDE**:
   - Open the IDE → Powers panel → Install this Power

3. **Start MCP Server in Unity**:
   - Unity Editor → Window → MCP for Unity → Start Server
   - The server listens on a local MCP endpoint (shown in the Unity MCP window; local-only loopback — communication that stays on the local computer and is not accessible from the network — see Security Note below)

### Language Setting / 語言設定

This Power automatically adapts to the language the developer uses — write in the preferred language and it responds in kind. No configuration needed.

本 Power 會自動適應您使用的語言 — 用任何語言提問，即以該語言回覆，無需額外設定。

- If no language is detected from the developer's input, the default is Traditional Chinese (繁體中文)
- Technical terms remain in English with explanation in the developer's language / 技術術語保留英文原文並附說明
- Code identifiers stay in English (Unity/C# conventions) / 程式碼變數/函式名稱維持英文
- To set a preferred response language, create a file named `language-override.md` in the `.kiro/steering/` directory of the project (note: folders starting with a dot are hidden by default on macOS/Linux; use `ls -a` or enable hidden files in the file manager to see them):

  ```markdown
  ---
  inclusion: auto
  ---
  # Language Override
  - Respond in English for all interactions.
  ```

### MCP Connection

**Primary — HTTP (recommended)**:
The default connection uses HTTP transport at the configured MCP server URL (local-only, not exposed to external networks). This is configured in `mcp.json` and requires no additional setup beyond starting the MCP server in Unity.

> **Security Note**: HTTP is used intentionally. This endpoint communicates exclusively with the Unity Editor on `localhost` (loopback interface — network traffic that stays on the local machine). Traffic never leaves the local machine, so HTTPS is not required.

**Backup — stdio (standard input/output — communication via text streams) via uvx**:
If the HTTP connection is unavailable (e.g., port conflict, firewall issues), the stdio transport mode can be used as a fallback. This uses `uvx` (a Python package runner) to launch the MCP bridge as a subprocess (a child process managed by the IDE):

- Command: `uvx`
- Args: `["unity-mcp"]`
- Transport: `stdio`

> **Note**: If these technical concepts are unfamiliar, the HTTP mode (recommended above) works automatically without requiring understanding of these details. The stdio mode is only needed as a fallback.

To switch to stdio mode, update `mcp.json`:
```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["unity-mcp"],
      "transport": "stdio"
    }
  }
}
```

### Connection Health Check

Before executing any MCP operation, perform a lightweight health check:
1. Attempt a cheap read-only call, e.g. `manage_scene(action: "get_active")` or `execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")`
2. If successful → MCP connection is healthy
3. If failed → prompt the developer to:
   - Confirm Unity Editor is open
   - Confirm MCP Server is started (Window → MCP for Unity → Start Server)
   - Confirm localhost:8080 is not occupied by another process

### Pre-Tool Hook（自動品質檢查）

本 Power 包含一個 `preToolUse` hook 檔案，位於 `hooks/pre-unity-tool.json`。

**功能**：在 AI 呼叫任何 unity-mcp 相關工具之前，自動提醒 AI 必須先：
1. 啟動（activate）本 Power 以載入完整文件
2. 讀取對應的 steering file 以獲取該任務的最佳實踐指引
3. 依照 Power 文件中定義的 workflow 執行操作

**涵蓋的工具**：所有 unity-mcp 工具，包括 `manage_scene`、`manage_gameobject`、`manage_components`、`manage_camera`、`manage_asset`、`manage_build`、`manage_editor`、`manage_material`、`manage_animation`、`manage_physics`、`manage_prefabs`、`manage_packages`、`manage_shader`、`manage_texture`、`manage_ui`、`manage_vfx`、`manage_probuilder`、`manage_profiler`、`manage_graphics`、`manage_scriptable_object`、`find_gameobjects`、`read_console`、`run_tests`、`get_test_job`、`batch_execute`、`execute_code`、`create_script`、`delete_script`、`validate_script`、`apply_text_edits`、`script_apply_edits`、`refresh_unity`、`unity_docs`、`unity_reflect` 等。建置請使用 `manage_build`（不是 `manage_editor`）。

**使用方式**：安裝本 Power 後，此 hook 會自動生效。開發者無需手動設定。如需停用，可刪除或重新命名 `hooks/pre-unity-tool.json` 檔案。


## Available MCP Tools

> **Verified against a live connection.** The tool names, `action` values, and parameter names below were confirmed by calling each tool against a running Unity Editor via unity-mcp — not assumed from documentation. If a call still fails with an "Unknown action" or a Pydantic validation error, treat that error message as authoritative (it lists the actual valid values) over anything written here, since unity-mcp evolves independently of this Power.

### Asset Management

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_asset` | `import`, `create`, `modify`, `delete`, `duplicate`, `move`, `rename`, `search`, `get_info`, `create_folder`, `get_components` | There is **no `list` action** — use `search` with `path` + `search_pattern` (e.g. `"*.fbx"`) to enumerate assets. Use `get_info` for import settings/metadata on a single asset |
| `manage_material` | `ping`, `get_material_info`, `create`, `set_material_shader_property`, `set_material_color`, `assign_material_to_renderer`, `set_renderer_color` | |
| `manage_texture` | `create`, `modify`, `delete`, `create_sprite`, `apply_pattern`, `apply_gradient`, `apply_noise`, `set_import_settings` | Procedural texture generation, not just import-setting management |
| `manage_shader` | `read` (read-only); `create`, `update`, `delete` (modifying) | Requires `name` + `path`; there is no `list` action — use `manage_asset(action: "search", search_pattern: "*.shader")` to enumerate shaders first |

### Scene & GameObject Management

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_scene` | Read-only: `get_hierarchy`, `get_active`, `get_build_settings`, `get_loaded_scenes`, `scene_view_frame`. Modifying: `create`, `load`, `save`, `close_scene`, `set_active_scene`, `move_to_scene`, `validate` | No `list` action — use `get_loaded_scenes` for currently loaded scenes or `get_build_settings` for the Build Settings scene list |
| `manage_gameobject` | `create`, `modify`, `delete`, `duplicate`, `move_relative`, `look_at` | For CRUD only. Use `find_gameobjects` to search |
| `manage_components` | `add`, `remove`, `set_property` | Requires `target` (instance ID preferred) + `component_type` |
| `manage_prefabs` | `get_info`, `get_hierarchy`, `create_from_gameobject`, `modify_contents`, `open_prefab_stage`, `save_prefab_stage`, `close_prefab_stage` | `modify_contents` supports `create_child`/`delete_child`/`component_properties` for headless prefab edits |

### UI & Visual

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_ui` | Read-only: `ping`, `read`, `get_visual_tree`, `list`. Modifying: `create`, `update`, `delete`, `attach_ui_document`, `detach_ui_document`, `create_panel_settings`, `update_panel_settings`, `modify_visual_element`, `render_ui`, `link_stylesheet` | This manages **UI Toolkit** (UXML/USS/UIDocument), not legacy uGUI Canvas/Button/Text. For legacy uGUI, create the GameObject + components via `manage_gameobject`/`manage_components` directly |
| `manage_camera` | `ping`, `ensure_brain`, `get_brain_status`, `create_camera`, `set_target`, `set_priority`, `set_lens`, `set_body`, `set_aim`, `set_noise`, `add_extension`, `remove_extension`, `set_blend`, `force_camera`, `release_override`, `list_cameras`, `screenshot`, `screenshot_multiview` | `create_camera` supports presets (`third_person`, `freelook`, `follow`, `dolly`, `static`, `top_down`, `side_scroller`) and works with or without Cinemachine installed |
| `manage_animation` | Prefixed actions: `animator_*`, `controller_*`, `clip_*` | Action-specific params go in the `properties` dict |
| `manage_vfx` | Prefixed actions: `particle_*`, `vfx_*`, `line_*`, `trail_*` | ParticleSystem, VisualEffect, LineRenderer, TrailRenderer |
| `manage_probuilder` | `create_shape`, `extrude_faces`, `bevel_edges`, `subdivide`, `get_mesh_info`, and many more mesh-editing actions | Requires `com.unity.probuilder` package |
| `manage_graphics` | Action-prefixed by area — `stats_get`/`stats_list_counters`/`stats_get_memory` (rendering stats); `pipeline_get_info`/`pipeline_get_settings`/`pipeline_set_settings`/`pipeline_set_quality` (render pipeline); `feature_list`/`feature_add`/`feature_remove`/`feature_configure`/`feature_toggle` (URP renderer features); `skybox_get`/`skybox_set_*` (environment/fog/ambient); `volume_*` (Volume/post-processing, requires URP/HDRP); `bake_*` (lightmap/probe baking, Edit mode only) | There is **no `get_settings` or `get_rendering_stats` action** — those are `pipeline_get_settings` and `stats_get` respectively |

### Project & Editor

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_packages` | `list_packages`, `search_packages`, `get_package_info`, `add_package`, `remove_package`, `list_registries`, `add_registry`, `remove_registry`, `embed_package`, `resolve_packages`, `ping`, `status` | **Asynchronous**: `list_packages`/`search_packages`/`add_package`/`remove_package` return `{job_id}` immediately with `_mcp_status: "pending"`; poll with `action: "status", job_id: "..."` until it resolves |
| `manage_build` | `build`, `status`, `platform`, `settings`, `scenes`, `profiles`, `batch`, `cancel` | **This is the build tool — `manage_editor` has no build action.** Supports Build Profiles (Unity 6+) via the `profile` param, and `batch` for multi-target builds |
| `manage_editor` | Read-only: `telemetry_status`, `telemetry_ping`. Modifying: `play`, `pause`, `stop`, `set_active_tool`, `add_tag`, `remove_tag`, `add_layer`, `remove_layer`, `deploy_package`, `restore_package`, `undo`, `redo` | Does **not** build or refresh — use `manage_build` for builds and `refresh_unity` for asset-database refresh/recompile |
| `refresh_unity` | N/A (single-purpose) | Params: `mode`, `scope`, `compile`, `wait_for_ready`. Use after script/asset changes made outside Unity's own import pipeline |
| `create_script` / `delete_script` / `validate_script` / `get_sha` | N/A (single-purpose each) | Modern script CRUD; prefer these over the legacy `manage_script` router |
| `apply_text_edits` / `script_apply_edits` | N/A | Line/column-based and structured (method/class-level) C# edits respectively; prefer `script_apply_edits` for method-level changes |
| `manage_script` | `create`, `read`, `delete` only | Legacy compatibility router — **no `list` or `get_info` action**. To enumerate scripts, use `manage_asset(action: "search", search_pattern: "*.cs")` |
| `manage_scriptable_object` | `create`, `modify` | Uses SerializedObject property paths for patches |
| `manage_physics` | `ping`, `get_settings`, `set_settings`, collision matrix, materials, joints, raycasts, `apply_force`, `simulate_step`, `validate` | 3D and 2D via the `dimension` param |

### Execution & Query

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `run_tests` | N/A — params: `mode` (`EditMode`/`PlayMode`), `test_names`, `category_names`, `assembly_names` | **Asynchronous**: returns `{job_id}` immediately; poll with `get_test_job(job_id, wait_timeout: 30)` until the run completes. There is no `platform` filter param — filtering is by test mode/category/assembly, not target platform |
| `get_test_job` | N/A | Poll target for `run_tests`; supports `wait_timeout` (seconds) to reduce polling round-trips |
| `read_console` | `get` (default), `clear` | Supports `filter_text`, `types`, `page_size`/`cursor` for paging |
| `batch_execute` | N/A | Each command is `{"tool": "...", "params": {...}}` — **the per-command key is `params`, not `args`**. Supports `parallel`/`fail_fast`/`max_parallelism` |
| `find_gameobjects` | N/A — params: `search_term` (required), `search_method` (name/tag/layer/component/path), `include_inactive`, `page_size`, `cursor` | **No `filter` param** — both `search_term` and `search_method` are required. Returns instance IDs only (paginated); fetch full data via the `mcpforunity://scene/gameobject/{id}` resource |
| `execute_code` | `execute`, `get_history`, `replay`, `clear_history` | Runs arbitrary C# in-Editor. Default `compiler: "auto"` falls back to `codedom` (C# 6 syntax only) unless Roslyn is installed — avoid C# 7+ syntax (e.g. `var x = (a, b);` tuples, pattern matching) unless you've confirmed Roslyn is available |
| `manage_profiler` | Session: `profiler_start/stop/status/set_areas`. Counters: `get_frame_timing`, `get_counters`, `get_object_memory`. Memory: `memory_take_snapshot/list_snapshots/compare_snapshots`. Frame Debugger: `frame_debugger_*` | Memory snapshot actions require `com.unity.memoryprofiler` package |
| `unity_docs` / `unity_reflect` | `get_doc`/`get_manual`/`get_package_doc`/`lookup`; `get_type`/`get_member`/`search` | Use `unity_reflect` to confirm an API exists on the connected Editor version before writing code against it, then `unity_docs` for usage examples |

### MCP Resources (Read-Only)

unity-mcp exposes some read-only data as `mcpforunity://`-scheme resources rather than tools. Two are confirmed from tool documentation:

| Resource | Description |
|----------|-------------|
| `mcpforunity://scene/gameobject/{id}` | Full detail for a specific GameObject, paired with `find_gameobjects` (which returns instance IDs only) |
| `mcpforunity://scene/gameobject/{id}/components` | Component list/detail for a GameObject, or use `mcpforunity://scene/gameobject/{id}/component/{name}` for a single component |
| `mcpforunity://path/Assets/...` | Alternate addressing scheme for script/asset paths, used by `apply_text_edits`/`find_in_file`/`get_sha`/`delete_script` (these also accept a plain `Assets/...` path or `file://...`) |

**Do not assume other resource URIs exist** (e.g. a `project_info` or `editor_state` resource) without confirming — prefer the equivalent tool call instead:
- For project/Unity-version info: `execute_code` (`UnityEngine.Application.unityVersion`, `SystemInfo.graphicsDeviceType`, etc.) or `manage_packages(action: "list_packages")`
- For editor/scene state: `manage_scene(action: "get_active")` or `manage_scene(action: "get_hierarchy")`
- For current selection: not directly exposed as a tool as of this writing — use `find_gameobjects` with an appropriate search instead


## Workflow Guides

### Workflow 1: Asset Batch Configuration (Requirement 1)

**To batch-configure assets (e.g., "Set all models in Characters folder to Humanoid rig"):**

**Step-by-step:**
1. **Scan** — `manage_asset(action: "search", path: "Assets/Characters/", search_pattern: "*.fbx")` (repeat per extension, e.g. `*.obj`; `manage_asset` has no `list` action)
2. **Detect type** — Match filenames against naming patterns to suggest appropriate Asset_Preset:
   - `*_char_*`, `*_character_*`, `*_hero_*` → `3d-character` preset
   - `*_env_*`, `*_prop_*`, `*_building_*` → `3d-environment` preset
   - `*_ui_*`, `*_icon_*`, `*_hud_*` → `ui-texture` preset
   - `*_sfx_*`, `*_bgm_*`, `*_music_*` → `audio-sfx` preset
   - `*_sprite_*`, `*_2d_*` → `2d-sprite` preset
3. **Load preset** — Read the matching JSON preset from `templates/presets/`
4. **Batch apply** — `batch_execute(commands: [{tool: "manage_asset", params: {action: "modify", path: each, properties: preset.config}} × N])` (each command uses a `params` key, not `args`)
5. **Report** — Generate a change summary listing each asset and the parameters that were modified

**Error handling:**
- If an asset path doesn't exist, inform the developer and suggest the correct path
- If a preset application fails on one asset, record the failure and continue with remaining assets
- After completion, report: "N succeeded, M failed" with failure reasons
- On failure, roll back the failed asset to its original state


### Workflow 2: Scene Scaffolding (Requirement 2)

**To quickly build a scene (e.g., "Create a 3D first-person scene"):**

**Step-by-step:**
1. **Identify scene type** — Confirm which Scene_Scaffold the developer needs
2. **Load scaffold** — Read the matching JSON scaffold from `templates/scaffolds/`
3. **Create scene** — `manage_scene(action: "create", name: "NewScene")`
4. **Check conflicts** — `find_gameobjects(search_term: name, search_method: "by_name")` for each planned object name, to detect name conflicts with existing objects (there is no generic `filter` param — `search_term` + `search_method` are both required)
5. **Build hierarchy** — `batch_execute(commands: [{tool: "manage_gameobject", params: {action: "create", ...}} × N])` following the scaffold's hierarchy definition (each command uses `params`, not `args`), including:
   - `manage_gameobject` for standard objects
   - `manage_camera(action: "create_camera", ...)` for camera objects — note this creates a Cinemachine-aware camera if Cinemachine is installed, or a basic Camera otherwise
   - `manage_ui` for UI Toolkit elements (UXML/USS); for legacy uGUI Canvas/Button/Text/Image, create them via `manage_gameobject` + `manage_components` (e.g. add `UnityEngine.UI.Canvas`, `UnityEngine.UI.Button` component types directly)
   - `manage_components` for adding components to objects
6. **Save scene** — `manage_scene(action: "save")`
7. **Report** — Display generation summary: total objects created, component list

**Conflict handling:**
- If the target scene already contains objects with the same name, ask the developer: Overwrite / Rename / Cancel

**Built-in scaffolds (5 types — these templates work for any Unity project):**
- `2d-platformer` — 2D side-scrolling scene (games, educational apps, interactive stories)
- `3d-first-person` — 3D first-person scene (FPSController, MainCamera, Terrain, Lights, HUD) — also suitable for architectural walkthroughs and training simulations
- `ui-menu` — UI menu scene (settings screens, dashboards, data displays)
- `open-world-base` — Open world base scene (exploration, visualization, large environments)
- `multiplayer-lobby` — Multiplayer lobby scene (collaborative tools, multi-user experiences)

> **Alternative use case**: For an architectural visualization project, replace the 3D scene with a building walkthrough, replace gameplay mechanics with measurement tools and material inspectors, and run the same quality/performance checks.


### Workflow 3: Build Automation (Requirement 3)

**To build the project (e.g., "Build for Windows"):**

**Step-by-step:**
1. **Load config** — Read the matching BuildConfig from `templates/build-configs/` or the developer's custom config
2. **Trigger build** — `manage_build(action: "build", target: "windows64", scenes: "[\"Assets/Scenes/Main.unity\"]", output_path: "Builds/Windows/MyGame.exe", development: false)` — **use `manage_build`, not `manage_editor`; `manage_editor` has no build action.** Valid `target` values: `windows64`, `osx`, `linux64`, `android`, `ios`, `webgl`, `uwp`, `tvos`, `visionos`
3. **Monitor progress** — Poll `manage_build(action: "status", job_id: ...)` for the build job, and `read_console()` for compile logs
4. **Handle result:**
   - On success → report build output path and summary
   - On failure → parse console logs, extract errors, provide structured error summary with fix suggestions
5. **Report** — Build result with duration, output size, and any warnings

**Multi-platform builds:**
- Use `manage_build(action: "batch", targets: [...])` (or `profiles: [...]` for Unity 6+ Build Profiles) to build multiple targets in one call, with `output_dir` as the base output directory

**Common build error patterns:**
- `CS` compilation errors → suggest code fixes
- Missing references → suggest package installation
- Shader errors → suggest shader alternatives for target platform

**Built-in build configs:**
- `windows-dev` — Windows development build
- `android-release` — Android release build
- `ios-release` — iOS release build
- `webgl-release` — WebGL release build

> Historical note: earlier drafts of this Power described an optional "Cloud_Assist" cloud build/device-testing layer. That layer is not part of the current unity-mcp tool surface — all build and test automation here runs through the local Unity Editor via `manage_build`/`run_tests`. If cloud build/device farm integration is needed, it would have to be wired up as a separate custom tool.


### Workflow 4: Cross-Platform Testing (Requirement 4)

**To run cross-platform tests (e.g., "Run EditMode and PlayMode tests"):**

**Step-by-step:**
1. **Start tests** — `run_tests(mode: "EditMode")` or `run_tests(mode: "PlayMode")` to execute Unity Test Framework tests. This returns `{job_id}` immediately — `run_tests` is asynchronous, not a blocking call. There is no `platform` param on `run_tests`; Unity Test Framework runs in the Editor (EditMode/PlayMode), not against a specific build target, so "testing for Android" in practice means building for that platform first (`manage_build`) and then reasoning about platform-specific code paths, not passing `platform` to `run_tests`
2. **Poll for completion** — `get_test_job(job_id: ..., wait_timeout: 30)` until `status` is no longer `"running"`; use `include_failed_tests: true` to get failure details without a huge payload
3. **Format results** — Structure results into pass rate + failed test case list
4. **Report** — Display structured test results

> Historical note: an earlier draft of this Power described an optional cloud device-testing layer ("Cloud_Assist") with automatic test-suite format conversion and per-device screenshots. No such capability exists in the current unity-mcp tool surface — remote/device-farm testing would need a separate integration outside this Power's current tools.


### Workflow 5: Workflow Automation (Requirement 5)

**To automate a multi-step process (e.g., "Import assets, configure them, then build"):**

**Step-by-step:**
1. **Load template** — Read the matching WorkflowTemplate from `templates/workflows/` or the developer's custom template
2. **Validate dependencies** — Check that step dependencies form a valid DAG (no cycles, all referenced steps exist)
3. **Execute steps** — Run each step's MCP tool call in topological order, respecting `dependsOn` constraints
4. **Track progress** — After completing step K of N, progress = K/N × 100%
5. **Handle failures** — If a step fails:
   - Pause execution immediately
   - Record the error message
   - Offer the developer three options: Retry / Skip / Abort
6. **Report** — Final summary of all steps executed, skipped, or failed

**Built-in workflow templates (3 types):**
- `asset-import-setup` — Asset import and configuration workflow
- `build-and-deploy` — Build and deployment workflow
- `test-execution` — Test execution workflow

**Dependency validation rules:**
- Each step's `dependsOn` must reference existing step IDs
- Dependencies must be resolvable via topological sort (no circular dependencies)
- If validation fails, reject the workflow before execution


### Workflow 6: Performance Analysis (Requirement 6)

**To analyze performance (e.g., "Analyze the current scene's performance"):**

**Step-by-step:**
1. **Collect metrics** — `manage_graphics(action: "stats_get")` for Draw Calls, batches, triangles, etc. (this is the real action name — there is no `get_rendering_stats`); `manage_profiler(action: "get_frame_timing")` for frame-time data; `manage_profiler(action: "get_counters", category: "Memory")` for GC/memory counters
2. **Read logs** — `read_console()` to collect performance-related logs
3. **Locate bottlenecks** — `find_gameobjects(search_term: "MeshRenderer", search_method: "by_component")` to identify objects with heavy renderers (params are `search_term`+`search_method`, not `filter`)
4. **Compare thresholds** — Compare collected metrics against thresholds (custom from `Assets/UnityAccelerator/Config/thresholds.json` or built-in defaults)
5. **Generate report** — Create a PerformanceReport containing:
   - Draw Calls (average, peak)
   - GC Allocation (average, peak)
   - Shader Complexity (average, peak)
   - Frame Rate (average, min)
   - Bottleneck objects with specific optimization suggestions
6. **Report** — Present findings with color-coded severity (green = OK, yellow = warning, red = error)

**Optimization suggestions (examples):**
- High Draw Calls → "Consider using LOD groups, mesh combining, or GPU instancing"
- High GC Allocation → "Avoid allocations in Update(). Use object pooling"
- Complex Shaders → "Simplify shader or use mobile-friendly alternatives"
- Low Frame Rate → "Reduce polygon count, optimize scripts, check physics settings"

**Adaptive sampling:**
- If Unity Editor frame rate drops below 10 FPS during analysis, automatically reduce sampling frequency


### Workflow 7: Code Quality & Architecture Check (Requirement 7)

**To check code quality (e.g., "Check the project's code architecture"):**

**Step-by-step:**
1. **Get project info** — `execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")` or `manage_packages(action: "list_packages")` to understand the project/environment
2. **List scripts** — `manage_asset(action: "search", path: "Assets/", search_pattern: "*.cs")` to get all C# script paths (`manage_script` has no `list` action)
3. **Read scripts** — `manage_script(action: "read", name: scriptName, path: folderPath)` to read script content (both `name` and `path` are required — `path` is the containing folder, not the full file path)
4. **Load rules** — Read enabled ArchitectureRule definitions from `templates/architecture-rules/`
5. **Analyze** — Check each script against the active rules, looking for:
   - Naming convention violations
   - Layer dependency violations
   - Inheritance constraint violations
   - Cyclic dependencies
6. **Generate report** — Each violation includes: file path, line number, rule name, fix suggestion
7. **Detect cycles** — If cyclic dependencies are found, describe the cycle path textually

**Built-in architecture rules (3 patterns):**
- `mvc-pattern` — MVC architecture rules
- `ecs-pattern` — ECS (Entity Component System) architecture rules
- `scriptableobject-pattern` — ScriptableObject architecture rules

**Incremental checking:**
- When a developer saves a C# script, run incremental architecture check on that file only
- Incremental results must be consistent with full-project check results


### Workflow 8: Knowledge Management (Requirement 8)

**To manage documentation (e.g., "What docs do we have about the inventory system?"):**

**Step-by-step:**
1. **Search** — Query the Knowledge_Base by keyword and tags, results sorted by relevance
2. **Asset lookup** — When the developer selects a script or component, find related documents via `relatedAssets` matching
3. **API change detection** — When Unity API updates, compare project's used APIs against the change list to generate migration guides
4. **Onboarding** — For new team members, auto-generate an onboarding checklist based on project structure and existing docs
5. **Staleness check** — Flag documents not updated in 180+ days as "NeedsReview" and notify the document owner

**Knowledge_Base storage:**
- Location: `Assets/UnityAccelerator/Knowledge/` (JSON + Markdown files)
- Each entry has: title, content, tags, relatedAssets, author, timestamps, status


### Workflow 9: Platform Compatibility Check (Requirement 9)

**To check platform compatibility (e.g., "Check Android compatibility"):**

**Step-by-step:**
1. **Load profile** — Read the target PlatformProfile from `templates/platform-profiles/`
2. **Scan shaders** — `manage_asset(action: "search", path: "Assets/", search_pattern: "*.shader")` to enumerate shader assets (`manage_shader` itself has no `list` action — it only reads/creates/updates/deletes a shader by `name`+`path`), then `manage_shader(action: "read", name: ..., path: ...)` per shader for content inspection if needed
3. **Get graphics settings** — `manage_graphics(action: "pipeline_get_info")` and `manage_graphics(action: "pipeline_get_settings")` to get current render pipeline configuration (there is no `get_settings` action)
4. **Check shader compatibility** — Compare shader features against the platform's supported feature list
5. **Estimate memory** — `manage_asset(action: "get_info", path: assetPath)` per asset to estimate memory usage against the platform's memory budget
6. **Generate report** — Classify issues into three severity levels:
   - **Error** — Build will fail (e.g., unsupported shader feature)
   - **Warning** — May cause issues on specific devices (e.g., high memory usage)
   - **Suggestion** — Optimization opportunity (e.g., texture compression recommendation)
7. **Shader alternatives** — For incompatible shader features, suggest alternatives from the PlatformProfile

**Built-in platform profiles (4 platforms):**
- `ios` — iOS platform profile (Metal shaders, memory constraints)
- `android` — Android platform profile (OpenGL ES / Vulkan, ASTC compression)
- `console` — Console platform profile (platform-specific constraints)
- `webgl` — WebGL platform profile (WebGL 2.0 limitations, strict memory budget)

**Auto-check on platform switch:**
- When the developer switches the Unity Editor build target, automatically run a quick compatibility check and display a summary in the Console


### Workflow 10: Asset Dependency Management (Requirement 10)

**To analyze asset dependencies (e.g., "Analyze dependencies of hero.fbx"):**

**Step-by-step:**
1. **Get dependencies** — `manage_asset` has **no `get_dependencies` action**. Use `execute_code` to call Unity's own API directly: `execute_code(action: "execute", code: "return string.Join(\",\", UnityEditor.AssetDatabase.GetDependencies(\"Assets/Characters/hero.fbx\", false));")` — the `false` argument means direct (non-recursive) dependencies only
2. **Recursive analysis** — Either pass `true` as the second argument to `GetDependencies` to get the full transitive closure in one call, or call it per-asset with `false` and walk the graph manually if you need per-level structure
3. **Build tree** — Construct a complete dependency tree (DependencyTree JSON) from the `execute_code` results
4. **Detect cycles** — Check for circular references in the dependency graph (note: `AssetDatabase.GetDependencies` on a Unity project's actual asset graph rarely produces true cycles since Unity's import pipeline doesn't allow them for most asset types — cyclic-reference concerns mostly apply to C# script namespace dependencies, covered in `code-quality.md`, not asset dependencies)
5. **Report** — Present the dependency tree structure textually, highlight any circular references with resolution suggestions

**Orphaned asset detection:**
- Scan the entire project's asset reference graph
- Identify assets with zero in-degree (not referenced by any scene or other asset)
- Present the orphaned asset list for the developer's review

**Delete impact analysis:**
- Before deleting an asset, check all direct and indirect dependents
- List all scenes and assets that reference the target asset
- Require the developer's confirmation before proceeding

**AssetBundle duplication detection:**
- Analyze AssetBundle configurations
- If two or more bundles contain the same asset path, warn about duplication
- Report all duplicate items with their bundle names

**Circular reference resolution:**
- When circular references are detected, visually describe the cycle path
- Suggest strategies to break the cycle (e.g., extract shared dependency, use indirect references)


## Preset Templates

The `templates/` directory contains pre-built JSON templates that can be used directly or as a base for customization. Developers can also create custom templates stored in `Assets/UnityAccelerator/Config/` within their Unity project.

**Loading priority:** Custom templates (Unity project) take precedence over built-in templates (this Power package). If a custom template doesn't exist, fall back to the built-in version.

### Template Directories

| Directory | Content | Used By |
|-----------|---------|---------|
| `templates/presets/` | Asset_Preset JSON templates (import settings for models, textures, audio, etc.) | Workflow 1: Asset Batch Configuration |
| `templates/scaffolds/` | Scene_Scaffold JSON templates (GameObject hierarchies, components, properties) | Workflow 2: Scene Scaffolding |
| `templates/build-configs/` | BuildConfig JSON templates (target platform, build options, output paths) | Workflow 3: Build Automation |
| `templates/platform-profiles/` | PlatformProfile JSON templates (shader support, memory budgets, scripting constraints) | Workflow 9: Platform Compatibility |
| `templates/architecture-rules/` | ArchitectureRule JSON templates (naming conventions, layer dependencies, patterns) | Workflow 7: Code Quality |
| `templates/workflows/` | WorkflowTemplate JSON templates (multi-step automated workflows) | Workflow 5: Workflow Automation |


### Built-in Asset Presets (`templates/presets/`)

| File | Description | Key Settings |
|------|-------------|--------------|
| `3d-character.json` | 3D character models | Humanoid rig, material import, normal maps, medium mesh compression |
| `3d-environment.json` | 3D environment/prop models | No rig, mesh compression, generate colliders |
| `2d-sprite.json` | 2D sprite textures | Sprite texture type, point filter mode, no mip maps |
| `ui-texture.json` | UI textures | UI texture settings, bilinear filter, no compression |
| `audio-sfx.json` | Sound effects | Audio import settings optimized for SFX |

### Built-in Scene Scaffolds (`templates/scaffolds/`)

| File | Description | Key Objects |
|------|-------------|-------------|
| `2d-platformer.json` | 2D platformer game | Main Camera (orthographic), Player, Ground, Background, UI Canvas |
| `3d-first-person.json` | 3D first-person scene | FPSController + MainCamera, Directional Light, Terrain, HUD Canvas |
| `ui-menu.json` | UI menu scene | EventSystem, Canvas (Screen Space), Panels, Buttons, Navigation |
| `open-world-base.json` | Open world base | Terrain, Skybox, Directional Light, Player Spawn, LOD Groups |
| `multiplayer-lobby.json` | Multiplayer lobby | NetworkManager, Lobby UI, Player List, Chat, Ready System |

### Built-in Build Configs (`templates/build-configs/`)

| File | Description | Key Options |
|------|-------------|-------------|
| `windows-dev.json` | Windows dev build | StandaloneWindows64, Development=true, Mono backend |
| `android-release.json` | Android release | Android, IL2CPP, Lz4HC compression |
| `ios-release.json` | iOS release | iOS, IL2CPP, Lz4HC compression |
| `webgl-release.json` | WebGL release | WebGL, IL2CPP, Lz4HC compression |


### Built-in Platform Profiles (`templates/platform-profiles/`)

| File | Description | Key Checks |
|------|-------------|------------|
| `ios.json` | iOS platform | Metal shaders (compute-capable, supports GPU Resident Drawer), memory budget ~1GB, no JIT |
| `android.json` | Android platform | Vulkan recommended / OpenGL ES 3.0 fallback, ASTC textures, memory budget ~1.5GB |
| `console.json` | Console platform | Platform-specific shader features, generous memory |
| `webgl.json` | WebGL platform | WebGL 2.0 limits, strict memory budget ~256MB, no threads, no compute shaders (GPU Resident Drawer unavailable) |
| `xr.json` | XR/VR platform | OpenXR (OculusXR reported deprecated/removed per Unity's roadmap — verify via `manage_packages` before citing a version), 72-90fps frame budget, comfort guidelines |

### Built-in Architecture Rules (`templates/architecture-rules/`)

| File | Description | Rule Types |
|------|-------------|------------|
| `mvc-pattern.json` | MVC architecture | Naming conventions, layer dependencies (View→Controller→Model) |
| `ecs-pattern.json` | ECS architecture | Component data-only, System logic-only, no MonoBehaviour mixing |
| `scriptableobject-pattern.json` | ScriptableObject pattern | Data in SO, logic in MonoBehaviour, event-driven communication |

### Built-in Workflow Templates (`templates/workflows/`)

| File | Description | Steps |
|------|-------------|-------|
| `asset-import-setup.json` | Asset import & config | Scan folder → Detect types → Apply presets → Generate summary |
| `build-and-deploy.json` | Build & deploy | Load config → Build → Monitor → Report |
| `test-execution.json` | Test execution | Run tests → Format results → Report |

### Custom Template Storage (Unity Project)

Developers can create custom templates in their Unity project:

| Type | Custom Location |
|------|----------------|
| Asset_Preset | `Assets/UnityAccelerator/Config/Presets/` |
| Scene_Scaffold | `Assets/UnityAccelerator/Config/Scaffolds/` |
| BuildConfig | `Assets/UnityAccelerator/Config/Builds/` |
| WorkflowTemplate | `Assets/UnityAccelerator/Config/Workflows/` |
| ArchitectureRule | `Assets/UnityAccelerator/Config/Rules/` |
| PlatformProfile | `Assets/UnityAccelerator/Config/Platforms/` |
| Knowledge_Base | `Assets/UnityAccelerator/Knowledge/` |
| PerformanceReport | `Assets/UnityAccelerator/Reports/` |
| PerformanceThresholds | `Assets/UnityAccelerator/Config/thresholds.json` |


## Steering Files

The `steering/` directory contains domain-specific knowledge files that guide the AI on how to effectively use MCP tools for each capability area. These are automatically loaded based on the developer's request context.

| File | Domain | Loaded When |
|------|--------|-------------|
| `unity-general.md` | General Unity best practices, MCP health checks, error handling | Always (base knowledge) |
| `asset-automation.md` | Asset pipeline, import settings, naming conventions, batch operations | Asset-related requests |
| `scene-scaffolding.md` | Scene architecture, GameObject hierarchies, conflict handling | Scene creation requests |
| `build-automation.md` | Build process (`manage_build`), error parsing | Build-related requests |
| `cross-platform-testing.md` | Test execution, result formatting, device testing | Testing requests |
| `workflow-automation.md` | Multi-step workflows, dependency validation, progress tracking | Workflow requests |
| `performance-analysis.md` | Profiling, metrics, thresholds, optimization suggestions | Performance requests |
| `code-quality.md` | Architecture patterns, violation detection, cyclic dependencies | Code quality requests |
| `knowledge-management.md` | Documentation, API changes, onboarding, staleness detection | Knowledge requests |
| `platform-compatibility.md` | Shader compatibility, memory budgets, platform constraints | Platform check requests |
| `asset-dependencies.md` | Dependency trees, orphaned assets, bundle duplication, circular refs | Dependency requests |

## Error Handling

### Error Categories

| Category | Example | Response |
|----------|---------|----------|
| MCP connection failure | Server not started, network issue | Prompt: "Please confirm Unity Editor is open and MCP Server is started (Window → MCP for Unity → Start Server)" |
| MCP tool schema mismatch | "Unknown action" or Pydantic validation error naming valid values | The connected unity-mcp version differs from what this Power expects — trust the error message's list of valid values over this document, and suggest the developer update the `com.coplaydev.unity-mcp` package if core actions seem missing |
| MCP operation timeout | Unity compiling or building | Wait and retry; inform the developer Unity may be busy |
| MCP tool error | Asset path not found, invalid params | Parse error, suggest correct path or parameters |
| Asset operation error | Preset apply failed, file locked | Record failure, continue with remaining assets, report at end |
| Build error | Compilation failed, missing dependency | Parse `read_console` logs and `manage_build(action: "status")`, provide structured error summary |
| Async job stuck/failed | `run_tests`, `manage_build`, or `manage_packages` job never reaches a terminal status | Poll with a reasonable timeout (e.g. `get_test_job(..., wait_timeout: 30)`); if still running after several polls, inform the developer rather than polling indefinitely |
| Workflow error | Step execution failed | Pause workflow, offer Retry / Skip / Abort |
| Template load error | Invalid JSON, file not found | Fall back to built-in template, inform the developer |
