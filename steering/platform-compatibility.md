# Platform Compatibility Check Steering

<!-- File Purpose / 本檔案用途: Unity cross-platform compatibility check steering guide / Unity 跨平台相容性檢查的 steering 指引，涵蓋 Shader 功能支援清單、記憶體預算估算、嚴重等級分類及平台切換問題排查。 -->

## Role and Purpose

Cross-platform Unity development requires careful attention to platform-specific constraints such as differences in available memory, GPU capabilities, supported graphics APIs, and input methods. This guide helps identify shader incompatibilities, memory budget violations, and API restrictions before deployment by scanning assets against platform profiles.

## Compatibility Check Flow

1. **Load Platform Profile**: Load the target platform's PlatformProfile from `templates/platform-profiles/` or custom location
2. **Scan Shaders**: Use `manage_asset(action: "search", path: "Assets/", search_pattern: "*.shader")` to enumerate shader assets (`manage_shader` has no `list` action — only `read`/`create`/`update`/`delete` by `name`+`path`) to check for unsupported platform features
3. **Check graphics settings**: Use `manage_graphics(action: "pipeline_get_info")` and `manage_graphics(action: "pipeline_get_settings")` to get current graphics configuration (there is no `get_settings` action)
4. **Estimate memory**: Use `manage_asset(action: "get_info", path: ...)` per asset to estimate memory usage of various asset types
5. **Generate report**: Produce a compatibility report classifying issues into Error/Warning/Suggestion severity levels

## Per-Platform Shader Feature Support

### iOS
- **Not supported**: Tessellation, Geometry Shader, Compute Shader (some older devices)
- **Alternatives**: Tessellation → Vertex Displacement, Geometry Shader → Vertex Shader + GPU Instancing
- **Recommendation**: Use URP/Mobile Shaders, avoid full Standard Shader

### Android
- **Not supported**: Tessellation, Geometry Shader, high-precision float (some Mali GPUs)
- **Alternatives**: Tessellation → LOD Mesh, Geometry Shader → Particle System, highp → mediump
- **Recommendation**: Use ASTC compression format, limit Shader variant count
- **Graphics API (Unity 6+)**: Prefer **Vulkan** over OpenGL ES as the primary Graphics API where the device/SDK supports it — OpenGL ES is a legacy fallback and does not support the GPU Resident Drawer (URP) or newer render-graph-based features. Keep OpenGL ES only as an auto-fallback for older/unsupported devices, not as the primary target

### Console
- **Not supported**: Platform-specific limitations vary by console model
- **Alternatives**: Per platform SDK documentation
- **Recommendation**: Follow each platform's TRC/TCR (Technical Requirements Checklist / Technical Certification Requirements — the mandatory technical standards that console manufacturers require applications to meet before approval for release on their platforms) guidelines

### WebGL
- **Not supported**: Compute Shader, Tessellation, Geometry Shader, multi-threaded rendering, GPU Resident Drawer (requires compute shader support WebGL lacks)
- **Alternatives**: Compute Shader → CPU computation or Pixel Shader, Tessellation → pre-baked Mesh
- **Recommendation**: Limit texture size (max 2048), use DXT/ETC2 compression, reduce Draw Calls, prefer WebGPU backend (Unity 6+, still maturing) over WebGL 2.0 for projects that need compute-shader-class features and can tolerate a smaller initial browser support matrix

## Memory Budget Estimation Guide

### iOS
- **Textures**: Max 150 MB (iPhone 8 and above)
- **Mesh**: Max 80 MB
- **Audio**: Max 40 MB
- **Total**: Max 400 MB (recommend reserving 30% for system)

### Android
- **Textures**: Max 120 MB (mid-range device baseline)
- **Mesh**: Max 60 MB
- **Audio**: Max 30 MB
- **Total**: Max 300 MB (low-end devices recommend 200 MB)

### Console
- **Textures**: Max 512 MB
- **Mesh**: Max 256 MB
- **Audio**: Max 128 MB
- **Total**: Max 1024 MB

### WebGL
- **Textures**: Max 80 MB (browser memory limitation)
- **Mesh**: Max 40 MB
- **Audio**: Max 20 MB
- **Total**: Max 200 MB (some browsers even lower)

## Severity Level Classification

### Error
- Uses a Shader feature completely unsupported on target platform → Build will fail
- Asset memory exceeds platform total budget → May cause OOM crash
- Uses a platform-prohibited API → Compilation failure

### Warning
- Uses a feature unsupported on some devices → May cause issues on specific devices
- Single category memory approaching budget limit → May cause issues on low-end devices
- Too many Shader variants → May cause excessive build time

### Suggestion
- Can use a more efficient compression format → Optimization opportunity
- Texture size can be reduced without visual quality loss → Reduce memory usage
- Can enable Shader stripping → Reduce build size

## MCP Tool Usage Examples

> **Verified syntax**: confirmed against a live unity-mcp connection.

### Scan Shaders
```
manage_asset(action: "search", path: "Assets/", search_pattern: "*.shader")
→ { data: { assets: [{ path: "Assets/Shaders/TessellatedTerrain.shader", guid: "...", ... }, ...] } }
```

Then, if shader source content needs inspection (e.g. to check for specific feature usage in text), read it via `manage_shader(action: "read", name: "TessellatedTerrain", path: "Assets/Shaders")`.

### Get Graphics/Pipeline Settings
```
manage_graphics(action: "pipeline_get_info")
manage_graphics(action: "pipeline_get_settings")
```

There is no `get_settings` action — pipeline info/settings are split into `pipeline_get_info` and `pipeline_get_settings`.

### Estimate Asset Memory
```
manage_asset(action: "get_info", path: "Assets/Textures/hero_diffuse.png")
→ { data: { path: "...", guid: "...", assetType: "UnityEngine.Texture2D", ... } }
```

The exact fields returned for size/import metadata depend on the asset type — inspect the actual response shape rather than assuming fixed `size`/`importedSize` keys.

## Platform Switch Troubleshooting

- If Platform Profile doesn't exist, inform you and suggest using built-in profiles
- If Shader reading fails, record the failed Shader and continue checking the rest
- If memory estimation cannot get asset size, use file size as approximation
- If MCP connection drops during platform switch, prompt to reconnect before running the check

## Cross-Platform Release Strategy

- Run compatibility checks before building to avoid discovering issues post-deployment
- Maintain independent Platform Profiles for each target platform
- Prioritize fixing Error-level issues; Warnings and Suggestions can be handled by priority
- Use Shader stripping to reduce unnecessary Shader variants
- Regularly update Platform Profiles to reflect new device capabilities

## Unity 6.x Platform Notes (verify against the connected project, don't assume from version number)

- **GPU Resident Drawer compatibility gate**: Before recommending the GPU Resident Drawer (see `performance-analysis.md`) for any platform, verify the target Graphics API supports compute shaders and excludes OpenGL ES and VisionOS, and confirm the project isn't on the 2D Renderer (which cannot use it at all). Use `manage_graphics(action: "pipeline_get_info")`/`pipeline_get_settings` or direct reflection (`execute_code`) to confirm the active Graphics API and rendering path (Forward+/Deferred+ required)
- **XR/OculusXR status**: Unity's public communications describe the OculusXR package as deprecated since 6.5 and removed around 6.7 in favor of the OpenXR Plugin package — this has not been independently verified against a live XR project as of this writing. If `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status"` with the returned `job_id`) shows `com.unity.xr.oculus`, flag it for migration to the OpenXR Plugin package regardless of the exact Unity version, since OculusXR is deprecated either way
- **Built-in Render Pipeline**: URP is the default and Unity-recommended pipeline for all new projects; Built-in remains usable for existing/legacy projects. Treat Built-in-only shaders in a new/greenfield project as a Suggestion-level flag to consider URP instead — verify via `GraphicsSettings.currentRenderPipeline == null` (Built-in) vs. a `UniversalRenderPipelineAsset` type
- **Render Graph Compatibility Mode**: If a URP project has "Compatibility Mode (Render Graph Disabled)" enabled, flag it as a Warning — it disables the default render-graph memory optimizations and is a legacy path for old-style `ScriptableRenderPass` scripts. This setting lives in Editor-only global settings that may not be reachable via simple reflection; if `execute_code` reflection can't confirm it, ask the developer to check Project Settings → Graphics → URP Global Settings directly
