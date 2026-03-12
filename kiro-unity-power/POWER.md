# Kiro Unity Power

## Overview

You now have the ability to remotely control Unity Editor via MCP (Model Context Protocol). This Power transforms you into a Unity development expert that can execute asset management, scene scaffolding, build automation, performance analysis, code quality checks, and more — all through natural language commands from the developer.

### Architecture

- **Kiro (You) = Brain**: Understand developer intent, plan execution strategies, orchestrate MCP tool call sequences
- **unity-mcp = Execution Layer**: Open-source MCP server ([CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)) bridging you to Unity Editor
- **This Power Package = Intelligence Layer**: POWER.md (this file), steering files, and preset templates that give you deep Unity domain knowledge

### Key Principles

1. **Zero Friction**: Install Power + UPM package + start MCP server — three steps, no cloud accounts needed
2. **Kiro-Centric**: All operations originate from you; Unity Editor is the controlled target
3. **Intelligence First**: Your value comes from steering files and workflow knowledge, not plumbing
4. **Natural Language Driven**: Developers describe intent; you translate to MCP tool call sequences
5. **Composable**: Complex workflows are composed from multiple MCP tool calls chained via `batch_execute`
6. **Local First**: All core features run locally; Cloud_Assist is an optional transparent acceleration layer

## Setup

### Prerequisites

1. Unity Editor installed and a project open
2. Kiro IDE installed

### Installation Steps

1. **Install unity-mcp UPM package in Unity**:
   - Open Unity Editor → Window → Package Manager
   - Add package from git URL: `https://github.com/CoplayDev/unity-mcp.git`

2. **Install Kiro Unity Power in Kiro**:
   - Open Kiro → Powers panel → Install "Kiro Unity Power"

3. **Start MCP Server in Unity**:
   - Unity Editor → Window → MCP for Unity → Start Server
   - The server listens on `localhost:8080/mcp`

### MCP Connection

**Primary — HTTP (recommended)**:
The default connection uses HTTP transport at `http://localhost:8080/mcp`. This is configured in `mcp.json` and requires no additional setup beyond starting the MCP server in Unity.

**Backup — stdio via uvx**:
If the HTTP connection is unavailable (e.g., port conflict, firewall issues), you can use the stdio transport mode as a fallback. This uses `uvx` to launch the unity-mcp server as a subprocess:

- Command: `uvx`
- Args: `["unity-mcp"]`
- Transport: `stdio`

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
3. If failed → prompt the developer:
   - Confirm Unity Editor is open
   - Confirm MCP Server is started (Window → MCP for Unity → Start Server)
   - Confirm localhost:8080 is not occupied by another process


## Available MCP Tools

### Asset & Material Management

| Tool | Description |
|------|-------------|
| `manage_asset` | Manage asset import settings, search assets, batch operations. Actions: `list`, `get_info`, `set_import_settings`, `get_dependencies` |
| `manage_material` | Create, modify, and assign materials. Manage shader properties and material parameters |
| `manage_texture` | Import and configure texture assets. Set compression, max size, filter mode, mip maps |
| `manage_shader` | List, inspect, and manage shaders. Check shader features and compatibility |

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
| `batch_execute` | Execute multiple MCP tool calls in sequence. Essential for complex workflows |
| `find_gameobjects` | Search for GameObjects by name, tag, layer, component type, or custom filter |

### MCP Resources (Read-Only)

| Resource | Description |
|----------|-------------|
| `project_info` | Project structure, Unity version, installed packages, build settings |
| `editor_state` | Current editor state (play mode, scene, selection) |
| `gameobject` | Detailed info about a specific GameObject |
| `editor_selection` | Currently selected objects in the editor |


## Workflow Guides

### Workflow 1: Asset Batch Configuration (Requirement 1)

**When the developer asks to batch-configure assets (e.g., "Set all models in Characters folder to Humanoid rig"):**

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

**When the developer asks to quickly build a scene (e.g., "Create a 3D first-person scene"):**

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

**Built-in scaffolds (5 types):**
- `2d-platformer` — 2D platformer game scene
- `3d-first-person` — 3D FPS scene (FPSController, MainCamera, Terrain, Lights, HUD)
- `ui-menu` — UI menu scene
- `open-world-base` — Open world base scene
- `multiplayer-lobby` — Multiplayer lobby scene


### Workflow 3: Build Automation (Requirement 3)

**When the developer asks to build the project (e.g., "Build for Windows"):**

**Step-by-step:**
1. **Load config** — Read the matching BuildConfig from `templates/build-configs/` or developer's custom config
2. **Trigger build** — `manage_editor(action: "build", target: "StandaloneWindows64", scenes: [...], outputPath: "...")`
3. **Monitor progress** — Poll `read_console()` to get build progress and logs
4. **Handle result:**
   - On success → report build output path and summary
   - On failure → parse console logs, extract errors, provide structured error summary with fix suggestions
5. **Report** — Build result with duration, output size, and any warnings

**Cloud_Assist mode (optional):**
- When `useCloudAssist: true` in the build config, route the build task to Kiro-managed cloud infrastructure
- The developer does NOT need to configure any cloud accounts or access keys
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

**When the developer asks to run cross-platform tests (e.g., "Run tests for Android and iOS"):**

**Step-by-step:**
1. **Run local tests** — `run_tests(platform: "Android")` to execute Unity Test Framework tests in simulated environment
2. **Format results** — Structure results per platform: pass rate, failed test cases list
3. **Report** — Display structured test results for each target platform

**Cloud_Assist device testing (optional):**
- When enabled, submit build artifacts to Kiro-managed cloud device pool
- Developer does NOT need to configure cloud accounts or device pool settings
- On completion, automatically download test results including per-device pass rates, failed test cases, and screenshots
- If any device has test failures, mark that device and provide detailed failure logs

**Test suite format conversion:**
- Unity Test Framework test suites can be automatically converted to Cloud_Assist executable format
- The conversion is round-trip safe: convert → execute → convert back produces equivalent results


### Workflow 5: Workflow Automation (Requirement 5)

**When the developer asks to automate a multi-step process (e.g., "Import assets, configure them, then build"):**

**Step-by-step:**
1. **Load template** — Read the matching WorkflowTemplate from `templates/workflows/` or developer's custom template
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

**When the developer asks to analyze performance (e.g., "Analyze the current scene's performance"):**

**Step-by-step:**
1. **Collect metrics** — `manage_graphics(action: "get_rendering_stats")` to get Draw Calls, Shader complexity, frame rate
2. **Read logs** — `read_console()` to collect performance-related logs and GC Allocation data
3. **Locate bottlenecks** — `find_gameobjects(filter: ...)` to identify objects causing high draw calls or complex shaders
4. **Compare thresholds** — Compare collected metrics against thresholds (custom from `Assets/KiroUnityPower/Config/thresholds.json` or built-in defaults)
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

**When the developer asks to check code quality (e.g., "Check the project's code architecture"):**

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

**When the developer or tech lead asks about documentation (e.g., "What docs do we have about the inventory system?"):**

**Step-by-step:**
1. **Search** — Query the Knowledge_Base by keyword and tags, results sorted by relevance
2. **Asset lookup** — When a developer selects a script or component, find related documents via `relatedAssets` matching
3. **API change detection** — When Unity API updates, compare project's used APIs against the change list to generate migration guides
4. **Onboarding** — For new team members, auto-generate an onboarding checklist based on project structure and existing docs
5. **Staleness check** — Flag documents not updated in 180+ days as "NeedsReview" and notify the document owner

**Knowledge_Base storage:**
- Location: `Assets/KiroUnityPower/Knowledge/` (JSON + Markdown files)
- Each entry has: title, content, tags, relatedAssets, author, timestamps, status


### Workflow 9: Platform Compatibility Check (Requirement 9)

**When the developer asks to check platform compatibility (e.g., "Check Android compatibility"):**

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

**When the developer asks about asset dependencies (e.g., "Analyze dependencies of hero.fbx"):**

**Step-by-step:**
1. **Get dependencies** — `manage_asset(action: "get_dependencies", path: "Assets/Characters/hero.fbx")`
2. **Recursive analysis** — Recursively analyze each dependency's own dependencies
3. **Build tree** — Construct a complete dependency tree (DependencyTree JSON)
4. **Detect cycles** — Check for circular references in the dependency graph
5. **Report** — Present the dependency tree structure textually, highlight any circular references with resolution suggestions

**Orphaned asset detection:**
- Scan the entire project's asset reference graph
- Identify assets with zero in-degree (not referenced by any scene or other asset)
- Present the orphaned asset list for developer review

**Delete impact analysis:**
- Before deleting an asset, check all direct and indirect dependents
- List all scenes and assets that reference the target asset
- Require developer confirmation before proceeding

**AssetBundle duplication detection:**
- Analyze AssetBundle configurations
- If two or more bundles contain the same asset path, warn about duplication
- Report all duplicate items with their bundle names

**Circular reference resolution:**
- When circular references are detected, visually describe the cycle path
- Suggest strategies to break the cycle (e.g., extract shared dependency, use indirect references)


## Preset Templates

The `templates/` directory contains pre-built JSON templates that you can use directly or as a base for customization. Developers can also create custom templates stored in `Assets/KiroUnityPower/Config/` within their Unity project.

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
| Asset_Preset | `Assets/KiroUnityPower/Config/Presets/` |
| Scene_Scaffold | `Assets/KiroUnityPower/Config/Scaffolds/` |
| BuildConfig | `Assets/KiroUnityPower/Config/Builds/` |
| WorkflowTemplate | `Assets/KiroUnityPower/Config/Workflows/` |
| ArchitectureRule | `Assets/KiroUnityPower/Config/Rules/` |
| PlatformProfile | `Assets/KiroUnityPower/Config/Platforms/` |
| Knowledge_Base | `Assets/KiroUnityPower/Knowledge/` |
| PerformanceReport | `Assets/KiroUnityPower/Reports/` |
| PerformanceThresholds | `Assets/KiroUnityPower/Config/thresholds.json` |


## Steering Files

The `steering/` directory contains domain-specific knowledge files that guide you on how to effectively use MCP tools for each capability area. These are automatically loaded based on the developer's request context.

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
| MCP operation timeout | Unity compiling or building | Wait and retry; inform developer Unity may be busy |
| MCP tool error | Asset path not found, invalid params | Parse error, suggest correct path or parameters |
| Asset operation error | Preset apply failed, file locked | Record failure, continue with remaining assets, report at end |
| Build error | Compilation failed, missing dependency | Parse `read_console` logs, provide structured error summary |
| Cloud_Assist error | Network timeout, auth failure | Degrade to local MCP execution, notify developer |
| Workflow error | Step execution failed | Pause workflow, offer Retry / Skip / Abort |
| Template load error | Invalid JSON, file not found | Fall back to built-in template, inform developer |

### Cloud_Assist Degradation

- All Cloud_Assist errors must NOT block the developer's workflow
- On network unavailability or service error, automatically degrade to local MCP execution
- Inform the developer that local mode is active
- All core features (except cloud builds and device testing) work normally in local mode
