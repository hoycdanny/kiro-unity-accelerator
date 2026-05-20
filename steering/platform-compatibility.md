# Platform Compatibility Check Steering

<!-- File Purpose / 本檔案用途: Unity cross-platform compatibility check steering guide / Unity 跨平台相容性檢查的 steering 指引，涵蓋 Shader 功能支援清單、記憶體預算估算、嚴重等級分類及平台切換問題排查。 -->

## Role and Purpose

Cross-platform Unity development requires careful attention to platform-specific constraints such as differences in available memory, GPU capabilities, supported graphics APIs, and input methods. This guide helps identify shader incompatibilities, memory budget violations, and API restrictions before deployment by scanning assets against platform profiles.

## Compatibility Check Flow

1. **Load Platform Profile**: Load the target platform's PlatformProfile from `templates/platform-profiles/` or custom location
2. **Scan Shaders**: Use `manage_shader(action: "list")` to get all Shaders and check for unsupported platform features
3. **Check graphics settings**: Use `manage_graphics(action: "get_settings")` to get current graphics configuration
4. **Estimate memory**: Use `manage_asset(action: "get_info")` to estimate memory usage of various asset types
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

### Console
- **Not supported**: Platform-specific limitations vary by console model
- **Alternatives**: Per platform SDK documentation
- **Recommendation**: Follow each platform's TRC/TCR (Technical Requirements Checklist / Technical Certification Requirements — the mandatory technical standards that console manufacturers require applications to meet before approval for release on their platforms) guidelines

### WebGL
- **Not supported**: Compute Shader, Tessellation, Geometry Shader, multi-threaded rendering
- **Alternatives**: Compute Shader → CPU computation or Pixel Shader, Tessellation → pre-baked Mesh
- **Recommendation**: Limit texture size (max 2048), use DXT/ETC2 compression, reduce Draw Calls

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

### Scan Shaders
```
manage_shader(action: "list")
→ [{ name: "Custom/TessellatedTerrain", path: "Assets/Shaders/...", features: [...] }, ...]
```

### Get Graphics Settings
```
manage_graphics(action: "get_settings")
→ { renderPipeline: "URP", qualityLevels: [...], ... }
```

### Estimate Asset Memory
```
manage_asset(action: "get_info", path: "Assets/Textures/hero_diffuse.png")
→ { size: 4194304, importedSize: 1048576, type: "Texture2D", ... }
```

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
