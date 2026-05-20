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
6. **Local First**: All core features run locally; Cloud_Assist is an optional transparent acceleration layer

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
- **Render pipeline**: Always check the project's render pipeline (URP/HDRP/Built-in) before importing or recommending assets. Flag shader incompatibilities immediately.
- **Play Mode**: Never make permanent scene changes while in Play Mode. Verify editor state before modifying and saving scenes.
- **Batch operations**: When placing multiple objects, ensure proper physics, vary rotation/scale for natural appearance, check performance impact for large quantities (50+), and respect the project's existing organizational structure.

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
1. Attempt to read the `project_info` resource
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

**涵蓋的工具**：所有 unity-mcp 工具，包括 `manage_scene`、`manage_gameobject`、`manage_components`、`manage_camera`、`manage_asset`、`manage_build`、`manage_editor`、`manage_material`、`manage_animation`、`manage_physics`、`manage_prefabs`、`manage_packages`、`manage_shader`、`manage_texture`、`manage_ui`、`manage_vfx`、`manage_probuilder`、`manage_profiler`、`manage_graphics`、`find_gameobjects`、`read_console`、`run_tests`、`batch_execute`、`execute_code`、`create_script`、`refresh_unity`、`script_apply_edits` 等。

**使用方式**：安裝本 Power 後，此 hook 會自動生效。開發者無需手動設定。如需停用，可刪除或重新命名 `hooks/pre-unity-tool.json` 檔案。


## Available MCP Tools

### Asset & Material Management

| Tool | Description |
|------|-------------|
| `manage_asset` | Configure how Unity imports models, textures, and audio files. Use for batch operations when applying presets to multiple assets, or to query asset metadata before modification. Actions: `list`, `get_info`, `set_import_settings`, `get_dependencies` |
| `manage_material` | Create, modify, and assign materials. Manage shader properties and material parameters. Pairs with `manage_shader` for compatibility checks |
| `manage_texture` | Import and configure texture assets. Set compression, max size, filter mode, mip maps. Critical for platform-specific optimization |
| `manage_shader` | List, inspect, and manage shaders. Check shader features and compatibility across target platforms |

### Scene & GameObject Management

| Tool | Description |
|------|-------------|
| `manage_scene` | Create, load, save, and manage scenes. Actions: `create`, `load`, `save`, `list` |
| `manage_gameobject` | Create, modify, delete GameObjects. Set name, tag, layer, parent-child hierarchy |
| `manage_components` | Add, remove, modify components on GameObjects. Set component properties |
| `manage_prefabs` | Create, instantiate, and manage prefabs. Apply overrides and unpack |

### UI & Visual

| Tool | Description |
|------|-------------|
| `manage_ui` | Create and manage UI elements (Canvas, Button, Text, Image, etc.) |
| `manage_camera` | Create and configure cameras. Set projection, FOV, clipping planes, render settings |
| `manage_animation` | Manage animation clips, controllers, and animation state machines |
| `manage_graphics` | Get and set graphics/rendering settings. Actions: `get_rendering_stats`, `get_settings` |

### Project & Editor

| Tool | Description |
|------|-------------|
| `manage_packages` | List, add, remove UPM packages. Check package versions and dependencies |
| `manage_editor` | Control Unity Editor operations. Actions: `build`, `play`, `pause`, `refresh` |
| `manage_script` | List, read, and manage C# scripts. Actions: `list`, `read`, `get_info` |
| `create_script` | Create new C# scripts from templates or custom content |

### Execution & Query

| Tool | Description |
|------|-------------|
| `run_tests` | Execute Unity Test Framework tests. Filter by category, platform, or test name |
| `read_console` | Read Unity Editor console output. Get logs, warnings, errors |
| `batch_execute` | Execute multiple MCP tool calls in sequence. Essential for complex workflows that combine scanning, configuration, and verification steps |
| `find_gameobjects` | Search for GameObjects by name, tag, layer, component type, or custom filter. Use before scene modifications to detect conflicts |

### MCP Resources (Read-Only)

| Resource | Description |
|----------|-------------|
| `project_info` | Project structure, Unity version, installed packages, build settings |
| `editor_state` | Current editor state (play mode, scene, selection) |
| `gameobject` | Detailed info about a specific GameObject |
| `editor_selection` | Currently selected objects in the editor |


## Workflow Guides

### Workflow 1: Asset Batch Configuration (Requirement 1)

**To batch-configure assets (e.g., "Set all models in Characters folder to Humanoid rig"):**

**Step-by-step:**
1. **Scan** — `manage_asset(action: "list", path: "Assets/Characters/", recursive: true, filter: "*.fbx,*.obj")`
2. **Detect type** — Match filenames against naming patterns to suggest appropriate Asset_Preset:
   - `*_char_*`, `*_character_*`, `*_hero_*` → `3d-character` preset
   - `*_env_*`, `*_prop_*`, `*_building_*` → `3d-environment` preset
   - `*_ui_*`, `*_icon_*`, `*_hud_*` → `ui-texture` preset
   - `*_sfx_*`, `*_bgm_*`, `*_music_*` → `audio-sfx` preset
   - `*_sprite_*`, `*_2d_*` → `2d-sprite` preset
3. **Load preset** — Read the matching JSON preset from `templates/presets/`
4. **Batch apply** — `batch_execute([manage_asset(action: "set_import_settings", path: each, settings: preset.config) × N])`
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
4. **Check conflicts** — `find_gameobjects(filter: ...)` to detect name conflicts with existing objects
5. **Build hierarchy** — `batch_execute([manage_gameobject(action: "create", ...) × N])` following the scaffold's hierarchy definition, including:
   - `manage_gameobject` for standard objects
   - `manage_camera` for camera objects
   - `manage_ui` for UI Canvas and elements
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
2. **Trigger build** — `manage_editor(action: "build", target: "StandaloneWindows64", scenes: [...], outputPath: "...")`
3. **Monitor progress** — Poll `read_console()` to get build progress and logs
4. **Handle result:**
   - On success → report build output path and summary
   - On failure → parse console logs, extract errors, provide structured error summary with fix suggestions
5. **Report** — Build result with duration, output size, and any warnings

**Cloud_Assist mode (optional):**
- When `useCloudAssist: true` in the build config, route the build task to managed cloud infrastructure
- The developer does NOT need to configure any cloud accounts or access keys — this is managed automatically. Teams with enterprise or compliance requirements can configure custom cloud settings (such as specific regions, VPCs, or private infrastructure)
- Poll build status every 30 seconds and display progress in Unity Editor
- On completion, automatically download build artifacts to the specified local output path

**Common build error patterns:**
- `CS` compilation errors → suggest code fixes
- Missing references → suggest package installation
- Shader errors → suggest shader alternatives for target platform

**Built-in build configs:**
- `windows-dev` — Windows development build
- `android-release` — Android release build
- `ios-release` — iOS release build
- `webgl-release` — WebGL release build


### Workflow 4: Cross-Platform Testing (Requirement 4)

**To run cross-platform tests (e.g., "Run tests for Android and iOS"):**

**Step-by-step:**
1. **Run local tests** — `run_tests(platform: "Android")` to execute Unity Test Framework tests in simulated environment
2. **Format results** — Structure results per platform: pass rate, failed test cases list
3. **Report** — Display structured test results for each target platform

**Cloud_Assist device testing (optional):**
- When enabled, submit build artifacts to managed cloud device pool
- Developer does NOT need to configure cloud accounts or device pool settings — this is managed automatically. Teams with enterprise or compliance requirements can configure custom device pools or specific testing regions
- On completion, automatically download test results including per-device pass rates, failed test cases, and screenshots
- If any device has test failures, mark that device and provide detailed failure logs

**Test suite format conversion:**
- Unity Test Framework test suites can be automatically converted to Cloud_Assist executable format
- The conversion is round-trip safe: convert → execute → convert back produces equivalent results


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
1. **Collect metrics** — `manage_graphics(action: "get_rendering_stats")` to get Draw Calls, Shader complexity, frame rate
2. **Read logs** — `read_console()` to collect performance-related logs and GC Allocation data
3. **Locate bottlenecks** — `find_gameobjects(filter: ...)` to identify objects causing high draw calls or complex shaders
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
1. **Get project info** — `project_info` resource to understand project structure
2. **List scripts** — `manage_script(action: "list")` to get all C# scripts
3. **Read scripts** — `manage_script(action: "read", path: each)` to read script content
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
2. **Scan shaders** — `manage_shader(action: "list")` to get all shaders in the project
3. **Get graphics settings** — `manage_graphics(action: "get_settings")` to get current graphics configuration
4. **Check shader compatibility** — Compare shader features against the platform's supported feature list
5. **Estimate memory** — `manage_asset(action: "get_info")` to estimate asset memory usage against the platform's memory budget
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
1. **Get dependencies** — `manage_asset(action: "get_dependencies", path: "Assets/Characters/hero.fbx")`
2. **Recursive analysis** — Recursively analyze each dependency's own dependencies
3. **Build tree** — Construct a complete dependency tree (DependencyTree JSON)
4. **Detect cycles** — Check for circular references in the dependency graph
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
| `ios.json` | iOS platform | Metal shaders, memory budget ~1GB, no JIT |
| `android.json` | Android platform | OpenGL ES 3.0 / Vulkan, ASTC textures, memory budget ~1.5GB |
| `console.json` | Console platform | Platform-specific shader features, generous memory |
| `webgl.json` | WebGL platform | WebGL 2.0 limits, strict memory budget ~256MB, no threads |

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
| `build-automation.md` | Build process, error parsing, Cloud_Assist routing | Build-related requests |
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
| MCP operation timeout | Unity compiling or building | Wait and retry; inform the developer Unity may be busy |
| MCP tool error | Asset path not found, invalid params | Parse error, suggest correct path or parameters |
| Asset operation error | Preset apply failed, file locked | Record failure, continue with remaining assets, report at end |
| Build error | Compilation failed, missing dependency | Parse `read_console` logs, provide structured error summary |
| Cloud_Assist error | Network timeout, auth failure | Degrade to local MCP execution, notify the developer |
| Workflow error | Step execution failed | Pause workflow, offer Retry / Skip / Abort |
| Template load error | Invalid JSON, file not found | Fall back to built-in template, inform the developer |

### Cloud_Assist Degradation

- All Cloud_Assist errors must NOT block the developer's workflow
- On network unavailability or service error, automatically degrade to local MCP execution
- Inform the developer that local mode is active
- All core features (except cloud builds and device testing) work normally in local mode
