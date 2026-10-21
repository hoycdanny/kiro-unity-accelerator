# Platform Compatibility Check Steering

<!-- File Purpose / 本檔案用途: Unity cross-platform compatibility check steering guide / Unity 跨平台相容性檢查的 steering 指引，涵蓋 Shader 功能支援清單、記憶體預算估算、嚴重等級分類、平台切換問題排查，以及 Unity 6.4 的 PVRTC 移除與 Web 多執行緒變更。 -->

## Role and Purpose

Cross-platform Unity development requires careful attention to platform-specific constraints such as differences in available memory, GPU capabilities, supported graphics APIs, and input methods. This guide helps identify shader incompatibilities, memory budget violations, and API restrictions before deployment by scanning assets against platform profiles.

> **Tool group prerequisite**: `manage_asset` and `manage_graphics` are in the default-on `core` group, so the standard check needs no activation. Two things here do: reading shader source uses **`manage_shader`, in the `vfx` group**, and the reflection recipes use **`execute_code`, in the `scripting_ext` group**. Both are off by default — `manage_tools(action: "activate", group: "vfx")` and `manage_tools(action: "activate", group: "scripting_ext")` respectively, and the MCP client may need a refresh before the tool appears. Canonical procedure: "Tool Group Activation (`manage_tools`)" in `unity-general.md`.

> **Version baseline**: this file targets **Unity 6.4** (stream `6000.4`, pinned patch `6000.4.12f1`). Anything past 6.4 is forward-looking and unverified; the full policy is in `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

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
- **Texture compression (Unity 6.4)**: **PVRTC was removed in 6.4** and can no longer be targeted on import. Use **ASTC** (preferred) or ETC. Never suggest PVRTC for an iOS target on the 6.4 baseline, and flag it as an Error-level finding if an existing import setting or automation script still names it. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21

### Android
- **Not supported**: Tessellation, Geometry Shader, high-precision float (some Mali GPUs)
- **Alternatives**: Tessellation → LOD Mesh, Geometry Shader → Particle System, highp → mediump
- **Recommendation**: Use ASTC compression format, limit Shader variant count
- **Graphics API (Unity 6+)**: Prefer **Vulkan** over OpenGL ES as the primary Graphics API where the device/SDK supports it — OpenGL ES is a legacy fallback and does not support the GPU Resident Drawer (URP) or newer render-graph-based features. Keep OpenGL ES only as an auto-fallback for older/unsupported devices, not as the primary target

### Console
- **Not supported**: Platform-specific limitations vary by console model
- **Alternatives**: Per platform SDK documentation
- **Recommendation**: Follow each platform's TRC/TCR (Technical Requirements Checklist / Technical Certification Requirements — the mandatory technical standards that console manufacturers require applications to meet before approval for release on their platforms) guidelines

### WebGL / Web
- **Not supported**: Compute Shader, Tessellation, Geometry Shader, **multithreaded *rendering***, GPU Resident Drawer (requires compute shader support WebGL lacks)
- **Threading, stated precisely (Unity 6.4)**: do **not** tell a developer "Web has no multithreading". Multithreaded *rendering* is still unavailable and general-purpose `System.Threading.Thread` is still off the table, but **Unity 6.4 enables multithreading for `[BurstCompile]` jobs on Web builds** — those jobs run on background workers. Non-Burst jobs still run on the main thread. So the correct advice for CPU-bound Web work on 6.4 is: move it into a Burst-compiled job. Source: [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64), retrieved 2026-10-21
- **Also new on 6.4 for Web**: Microphone API support, and PSO tracing/warming for WebGPU
- **Alternatives**: Compute Shader → CPU computation, a Burst-compiled job, or a Pixel Shader; Tessellation → pre-baked Mesh
- **Recommendation**: Limit texture size (max 2048), use DXT/ETC2 compression, reduce Draw Calls, prefer the WebGPU backend over WebGL 2.0 for projects that need compute-shader-class features and can tolerate a smaller browser support matrix

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

## Unity 6.4 Platform Notes (verify against the connected project, don't assume from a version number)

- **GPU Resident Drawer compatibility gate (available on the 6.4 baseline)**: Before recommending the GPU Resident Drawer (see `performance-analysis.md`) for any platform, verify the target Graphics API supports compute shaders and excludes OpenGL ES and VisionOS, and confirm the project isn't on the 2D Renderer (which cannot use it at all). Forward+ or Deferred+ is required, and Realtime GI (Enlighten) must be off. Use `manage_graphics(action: "pipeline_get_info")`/`pipeline_get_settings` — both `core`, no activation needed — or direct reflection via `execute_code` (`scripting_ext`) to confirm the active Graphics API and rendering path. On 6.4 the redesigned Rendering Statistics window itemises which batching path absorbed each draw call, so verify the benefit from that breakdown rather than from a single draw-call number
- **Render Graph is the only path (Compatibility Mode removed in 6.4)**: **Unity 6.4 removes URP Compatibility Mode for custom render passes entirely, along with the `URP_COMPATIBILITY_MODE` scripting define.** There is no toggle left to flag as a Warning. What to check instead on a project upgrading into 6.4: any custom `ScriptableRenderPass` still using the legacy `Execute`/`Configure` pattern, or any `#if URP_COMPATIBILITY_MODE` block, is an **Error**-level finding — it must be ported to `RecordRenderGraph` before the project will render. The verified URP pairing on the 6.4 baseline is URP 17.4. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21
- **XR: HoloLens 2 deprecated (documented for 6.4)**: Unity 6.4 deprecates HoloLens 2 platform support and its plug-in; the documented migration is the OpenXR plug-in. Flag any project that still depends on it. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21
- **XR: OculusXR status (reported, removal release unverified)**: Unity's public communications describe the OculusXR package as deprecated and slated for removal in a later 6.x Update release, in favour of the OpenXR Plugin package. The deprecation is reported; **the removal release is unverified** and was not checked against a live XR project. If `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status"` with the returned `job_id`) shows `com.unity.xr.oculus`, flag it for migration to OpenXR regardless of the exact Unity version, since it is deprecated either way
- **iOS texture compression**: PVRTC is gone on 6.4 — ASTC or ETC only. See the iOS section above
- **Built-in Render Pipeline**: URP is the default and Unity-recommended pipeline for all new projects; Built-in remains usable for existing/legacy projects. Treat Built-in-only shaders in a new/greenfield project as a Suggestion-level flag to consider URP instead — verify via `manage_graphics(action: "pipeline_get_info")`, or `GraphicsSettings.currentRenderPipeline == null` (Built-in) vs. a `UniversalRenderPipelineAsset` type
