# Build Automation Steering
<!-- File Purpose / 本檔案用途: Unity build automation steering guide / Unity 建置自動化的 steering 指引，涵蓋建置配置載入、本地建置觸發、Cloud_Assist 路由邏輯、建置錯誤解析及多平台建置管理。 -->

## Role and Purpose

Builds reveal integration issues — problems that occur when different parts of the project are combined, such as shader incompatibilities (rendering code that works on one platform but not another), missing assets, or configuration mismatches (settings that conflict between different parts of the project). CS errors (C# compilation errors) are also common. Based on common Unity build patterns, most failures fall into a small number of categories (CS errors, missing references, shader incompatibilities, oversized output (build artifacts that exceed platform size limits)). Regardless of Unity build experience level, this guide helps identify and resolve these issues efficiently. It also covers the routing logic between local builds and the optional Cloud_Assist (a managed cloud build infrastructure that offloads compilation to remote servers) mode. Use it whenever the developer needs to build the project, manage build configurations, or troubleshoot build errors. The MCP tool sequences below translate that high-level intent into concrete commands.

## Workflow

### Standard Local Build Flow

The diagram below shows the standard successful build flow. In practice, step 4 (parsing logs) provides the most actionable information — Unity emits a lot of noise alongside the actual error. Extracting the actionable lines transforms "build failed" into specific guidance like "fix this CS0246 in PlayerController.cs:42."

```
Load config → manage_editor build → Poll read_console → Parse logs → Report results
```

1. **Load build configuration**: Load the corresponding BuildConfig JSON from `templates/build-configs/` (custom location takes priority; falls back to built-in template if not found)
2. **Trigger build**: Use `manage_editor(action: "build")` to start the Unity build process
3. **Poll progress**: Use `read_console()` to periodically read build logs and report progress in real-time
4. **Parse logs**: After build completion, parse console logs to extract errors and warnings
5. **Report results**: Display build results in a structured format (success/failure, duration, artifact path, error summary)

### Cloud_Assist Routing Logic

```
Check useCloudAssist → true: cloud path / false: local MCP path
```

Before executing build or test operations, check the `useCloudAssist` field in the BuildConfig:

| useCloudAssist | Execution Path | Description |
|----------------|---------------|-------------|
| `false` (default) | Local MCP | Use `manage_editor` to execute the build in the local Unity Editor |
| `true` | Cloud_Assist | Delegate the build task to managed cloud infrastructure |

#### Local Build Path

```
manage_editor(action: "build", target: config.target, scenes: config.scenes, outputPath: config.outputPath, options: config.options)
→ Poll read_console() for progress
→ Build complete, report results
```

#### Cloud_Assist Build Path

```
Submit build task to Cloud_Assist
→ Poll build status every 30 seconds
→ After build completion, automatically download artifacts to config.outputPath
→ Report results
```

Cloud_Assist fallback strategy:
- If the network is unavailable or the cloud service is experiencing issues, automatically fall back to local MCP execution
- Inform you when switching to local mode
- All core build features function normally in local mode

## MCP Tool Usage Examples

### Trigger Local Build

```
manage_editor(action: "build", target: "StandaloneWindows64", scenes: [
  "Assets/Scenes/MainMenu.unity",
  "Assets/Scenes/GameLevel1.unity"
], outputPath: "Builds/Windows/MyGame.exe", options: {
  "development": false,
  "allowDebugging": false,
  "compression": "Lz4HC",          // LZ4 High Compression: smaller builds, fast decompression
  "scriptingBackend": "IL2CPP"     // Intermediate Language To C++: ahead-of-time compilation for better performance
})
```

> **IL2CPP** converts .NET IL code to C++ for better runtime performance and platform compatibility. **Lz4HC** produces smaller builds than standard LZ4 at the cost of longer compression time; decompression speed remains fast.

### Poll Build Progress

```
read_console(filter: "build")
```

Call periodically to retrieve the latest build log output. Recommended polling intervals:
- Local build: every 10 seconds
- Cloud_Assist build: every 30 seconds

### Get Project Scene List

```
manage_scene(action: "list")
```

Used to confirm the scene list to include before building.

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
- Use `manage_packages(action: "list")` to confirm installed packages
- Use `manage_packages(action: "install")` to install missing packages

#### Shader Compilation Errors

Pattern: `Shader error in 'Custom/MyShader': undeclared identifier 'unity_ObjectToWorld'`

Fix suggestions:
- Check if the Shader syntax is compatible with the target platform's graphics API
- Use `manage_shader(action: "list")` to check Shaders in the project
- Suggest using URP/HDRP-compatible Shaders instead of custom Shaders

#### Missing Asset Errors

Pattern: `The referenced script on this Behaviour is missing!`
Pattern: `Missing Prefab with guid: {guid}`

Fix suggestions:
- Use `manage_asset(action: "find")` to search for the missing asset
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

| Platform | Notes |
|----------|-------|
| Windows | Confirm .NET Framework version compatibility |
| Android | Confirm Android SDK/NDK paths are set, minimum API Level is correct |
| iOS | Must build on macOS, confirm Xcode version compatibility, signing settings are correct |
| WebGL | Longer build times, be aware of memory limits, multithreading not supported |

### Cloud_Assist Usage Recommendations

- For large projects (build time > 30 minutes), Cloud_Assist can offload compilation work from the local machine
- When building for multiple platforms simultaneously, Cloud_Assist can process multiple build tasks in parallel
- Cloud infrastructure is managed automatically. Developers requiring custom cloud configurations can configure their own infrastructure to meet enterprise compliance, data residency, or security requirements
