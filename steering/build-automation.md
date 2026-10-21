# Build Automation Steering
<!-- File Purpose / 本檔案用途: Unity build automation steering guide / Unity 建置自動化的 steering 指引，涵蓋建置配置載入、manage_build 觸發本地建置、建置錯誤解析、多平台建置管理，以及 Unity 6.4 的 Build Profiles 與 Apple 執行期程式庫路徑變更。 -->

## Role and Purpose

Builds reveal integration issues — problems that occur when different parts of the project are combined, such as shader incompatibilities (rendering code that works on one platform but not another), missing assets, or configuration mismatches (settings that conflict between different parts of the project). CS errors (C# compilation errors) are also common. Based on common Unity build patterns, most failures fall into a small number of categories (CS errors, missing references, shader incompatibilities, oversized output (build artifacts that exceed platform size limits)). Regardless of Unity build experience level, this guide helps identify and resolve these issues efficiently. Use it whenever the developer needs to build the project, manage build configurations, or troubleshoot build errors. The MCP tool sequences below translate that high-level intent into concrete commands.

## Workflow

### Standard Local Build Flow

The diagram below shows the standard successful build flow. In practice, step 4 (parsing logs) provides the most actionable information — Unity emits a lot of noise alongside the actual error. Extracting the actionable lines transforms "build failed" into specific guidance like "fix this CS0246 in PlayerController.cs:42."

```
Load config → manage_build build → Poll manage_build status / read_console → Parse logs → Report results
```

1. **Load build configuration**: Load the corresponding BuildConfig JSON from `templates/build-configs/` (custom location takes priority; falls back to built-in template if not found)
2. **Trigger build**: Use `manage_build(action: "build")` to start the Unity build process — **this is the dedicated build tool; `manage_editor` has no build action**
3. **Poll progress**: Use `manage_build(action: "status")` for the build job status and `read_console()` for compile logs, both periodically, to report progress in real-time
4. **Parse logs**: After build completion, parse console logs to extract errors and warnings
5. **Report results**: Display build results in a structured format (success/failure, duration, artifact path, error summary)

## MCP Tool Usage Examples

> **Verified syntax**: confirmed against a live unity-mcp connection.
>
> **Tool groups**: every tool in the build flow — `manage_build`, `manage_scene`, `manage_asset`, `manage_packages`, `read_console` — is in the default-on `core` group, so the standard build needs no activation step. Two side paths do: reading shader source uses `manage_shader` (`vfx` group) and any `execute_code` recipe uses the `scripting_ext` group. Both are off by default; see "Tool Group Activation (`manage_tools`)" in `unity-general.md`.

### Trigger Local Build

```
manage_build(
  action: "build",
  target: "windows64",
  scenes: "[\"Assets/Scenes/MainMenu.unity\", \"Assets/Scenes/GameLevel1.unity\"]",
  output_path: "Builds/Windows/MyGame.exe",
  development: false,
  scripting_backend: "il2cpp",
  options: "[\"compress_lz4\"]"
)
```

Notes on real parameter names/values (differ from earlier drafts of this guide):
- `target` uses lowercase short names: `windows64`, `osx`, `linux64`, `android`, `ios`, `webgl`, `uwp`, `tvos`, `visionos` — not `StandaloneWindows64`
- `scenes` is a JSON array **string** (or comma-separated path string), not a native array literal
- `output_path`, not `outputPath` (snake_case, not camelCase — unity-mcp's Python-side schema uses snake_case throughout)
- There is no nested `options` object with `allowDebugging`/`compression`/`scriptingBackend` keys — those are top-level params: `scripting_backend` (`mono`/`il2cpp`), and general build options (`clean_build`, `auto_run`, `deep_profiling`, `compress_lz4`, `strict_mode`, `detailed_report`) go in the flat `options` array
- `subtarget` (`player`/`server`) is separate from `target`

> **IL2CPP** converts .NET IL code to C++ for better runtime performance and platform compatibility.

### Poll Build Status

```
manage_build(action: "status")
```

Call periodically to check the running build job. Also poll `read_console(filter_text: "Build")` for compiler/build log lines.

### Check/Set Player Settings Before Building

```
manage_build(action: "settings", property: "scripting_backend")           // read (omit `value`)
manage_build(action: "settings", property: "scripting_backend", value: "il2cpp")  // write
```

Confirmed properties: `product_name`, `company_name`, `version`, `bundle_id`, `scripting_backend`, `defines`, `architecture`.

### Get Project Scene List (Build Settings)

```
manage_scene(action: "get_build_settings")
```

Used to confirm the scene list already registered in Build Settings before building (there is no `manage_scene(action: "list")` — that action doesn't exist).

## Build Error Parsing Guide

### Common Unity Build Error Patterns

#### CS Compilation Errors

Pattern: `Assets/Scripts/PlayerController.cs(42,15): error CS1002: ; expected`

Format: `{filePath}({line},{column}): error {errorCode}: {message}`

Fix suggestions:
- `CS0246` (type not found): Check for missing using statements or Assembly Definition references
- `CS1002` (syntax error): Check the syntax at the specified line number, usually a missing semicolon or bracket
- `CS0103` (undefined name): Check if the variable or method name is spelled correctly
- `CS0117` (type does not contain definition): Check if the API has changed in a newer version

#### Missing Reference Errors

Pattern: `Assembly 'Assembly-CSharp.dll' references 'SomePlugin' which could not be found`

Fix suggestions:
- Check if the corresponding UPM package or third-party plugin is installed
- Use `manage_packages(action: "list_packages")` to confirm installed packages (this is asynchronous — poll with `action: "status", job_id: ...` until it resolves)
- Use `manage_packages(action: "add_package", package: "com.example.plugin")` to install missing packages (also asynchronous)

#### Shader Compilation Errors

Pattern: `Shader error in 'Custom/MyShader': undeclared identifier 'unity_ObjectToWorld'`

Fix suggestions:
- Check if the Shader syntax is compatible with the target platform's graphics API
- Use `manage_asset(action: "search", path: "Assets/", search_pattern: "*.shader")` to enumerate Shaders in the project (`manage_shader` itself has no `list` action — only `read`/`create`/`update`/`delete` by `name`+`path`). `manage_asset` is in the default-on `core` group; **`manage_shader` is in the `vfx` group, which is off by default** — run `manage_tools(action: "activate", group: "vfx")` before reading shader source. See "Tool Group Activation (`manage_tools`)" in `unity-general.md`
- Suggest using URP/HDRP-compatible Shaders instead of custom Shaders

#### Missing Asset Errors

Pattern: `The referenced script on this Behaviour is missing!`
Pattern: `Missing Prefab with guid: {guid}`

Fix suggestions:
- Use `manage_asset(action: "search", path: "Assets/", search_pattern: "...")` to search for the missing asset (there is no `find` action)
- Check if `.meta` files are intact
- Confirm the asset was not accidentally deleted or moved

#### Build Size Exceeded

Pattern: `Build size exceeds maximum allowed size`

Fix suggestions:
- Check texture compression settings; recommend using platform-appropriate compression formats
- Remove unused assets (can be combined with asset dependency analysis)
- Enable Asset Bundle splitting strategy

### Error Severity Levels

| Level | Marker | Description |
|-------|--------|-------------|
| Error | `error` | Build failed, must be fixed |
| Warning | `warning` | Build may succeed but has potential issues |
| Info | `info` | Informational message, usually can be ignored |

## Build Configuration Management

### Multiple Configurations Coexistence

A single project can maintain multiple BuildConfigs for different platforms and purposes:

| Config Name | Target Platform | Purpose |
|-------------|----------------|---------|
| `windows-dev.json` | StandaloneWindows64 | Development testing, Development Build enabled |
| `android-release.json` | Android | Android release build |
| `ios-release.json` | iOS | iOS release build |
| `webgl-release.json` | WebGL | WebGL web build |

### Configuration Loading Priority

1. Custom location: `Assets/UnityAccelerator/Config/Builds/{name}.json`
2. Built-in template: `templates/build-configs/{name}.json`

### Pre-Build Checklist

Before triggering a build, perform the following checks:

1. **Scene list confirmation**: Confirm all scenes in the BuildConfig exist
2. **Output path confirmation**: Confirm the parent directory of outputPath exists and is writable
3. **Platform compatibility**: If platform compatibility steering is installed, run a quick check first
4. **Script compilation**: Confirm there are no compilation errors in the Unity Editor

## Best Practices

### Build Configuration Recommendations

| Scenario | Recommended Config | Reason |
|----------|-------------------|--------|
| Daily development testing | Development + Mono | Fast compilation, supports debugging |
| Performance testing | Release + IL2CPP | Close to release build performance |
| Production release | Release + IL2CPP + Lz4HC | Best performance and compression |
| CI/CD automated builds | Release + IL2CPP | Standardized build pipeline |

### Platform-Specific Notes

| Platform | `manage_build` `target` value | Notes |
|----------|-------------------------------|-------|
| Windows | `windows64` | Confirm .NET Framework version compatibility |
| Android | `android` | Confirm Android SDK/NDK paths are set, minimum API Level is correct; prefer Vulkan as the primary Graphics API (OpenGL ES as fallback only) |
| iOS | `ios` | Must build on macOS, confirm Xcode version compatibility, signing settings are correct |
| WebGL | `webgl` | Longer build times, be aware of memory limits. **Multithreaded *rendering* is still unavailable**, but on Unity 6.4 `[BurstCompile]` jobs do run on background workers for Web builds — see the Unity 6.4 note below before telling a developer "Web has no threads". GPU Resident Drawer is unavailable (no compute shader support) |
| macOS | `osx` | |
| Linux | `linux64` | |
| iOS | `ios` | On Unity 6.4 the Apple runtime libraries moved to `XcodeFolder/Frameworks/UnityRuntime.framework/UnityRuntime` — see the Unity 6.4 note below |

### Scripting Backend Notes (Unity 6.4 baseline)

> **Version baseline**: this file targets **Unity 6.4** (stream `6000.4`, pinned patch `6000.4.12f1`). Anything past 6.4 is forward-looking and unverified; the full policy is in `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

- **`manage_build`'s `scripting_backend` parameter accepts only `mono` or `il2cpp`. There is no `coreclr` value.** Whatever the Editor's `ScriptingImplementation` enum happens to contain, the Power cannot select CoreCLR through the bridge — state that plainly rather than hedging about versions
- **IL2CPP** remains the recommended backend for release builds — best AOT runtime performance, required on iOS/consoles
- **Mono** remains the recommended backend for fast-iterating development builds where the platform supports it
- A BuildConfig that asks for a CoreCLR backend cannot be executed by `manage_build` at all. Treat it as a configuration error, not an experimental option: tell the developer the bridge will reject it, and that switching the Editor to CoreCLR is a manual Player Settings change outside this Power
- If the developer's project has Enter Play Mode Options set to skip domain reload (a default introduced for new projects in a 6.x Update release — verify the actual setting via `UnityEditor.EditorSettings.enterPlayModeOptionsEnabled` rather than assuming from a version number), remind them this does not affect standalone builds — it only affects Editor Play Mode behavior

### Unity 6.4 Build Changes

All three items below come from [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) and [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21.

- **Build Profiles hides classic platforms by default.** In new projects the classic platform list is hidden and the Platform Browser is regrouped. If a developer cannot find their target in the Build Profiles window, point them at `Project Settings > Editor > Build Profiles > Hide Classic Platforms` to show it again. `manage_build`'s `profile`/`profiles` params take Build Profile asset paths and are Unity 6+ only
- **Apple runtime libraries moved.** On 6.4 the Unity runtime ships as a static framework at `XcodeFolder/Frameworks/UnityRuntime.framework/UnityRuntime` for both device and simulator. Any build post-processing script that hard-codes the old `Libraries/` path breaks — check for that before an iOS/tvOS/visionOS build and flag it
- **Web builds can multithread Burst jobs.** Unity 6.4 enables multithreading for `[BurstCompile]` jobs on Web builds; they run on background workers. Non-Burst jobs still run on the main thread, and multithreaded *rendering* is still unavailable. So "WebGL has no multithreading" is no longer accurate as written — distinguish multithreaded rendering (unavailable) from Burst-compiled jobs (multithreaded on 6.4). 6.4 also adds Microphone API support and PSO tracing/warming for WebGPU on Web

### Multi-Platform Builds

- Use `manage_build(action: "batch", targets: [...], output_dir: "Builds/")` to build multiple platforms in one call (or `profiles: [...]` to batch-build Unity 6+ Build Profiles instead of raw target names)
- Poll `manage_build(action: "status")` per job, or `action: "cancel"` to abort a running batch
