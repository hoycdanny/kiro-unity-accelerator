# Performance Analysis Steering

<!-- File Purpose / 本檔案用途: Unity performance analysis steering guide / Unity 效能分析的 steering 指引，涵蓋效能指標收集、閾值比對、瓶頸定位及最佳化建議生成。 -->

## Role and Purpose

Performance problems in Unity typically involve a few key metrics: Draw Calls, GC Allocation, Shader complexity, and frame rate. Unity's Profiler collects performance metrics. The challenge is understanding which metrics exceed acceptable thresholds for a given platform and what to do when they are outside the recommended range (see threshold tables below). This guide encodes the thresholds we have seen work across mobile, desktop, and VR projects, plus the optimization techniques that provide the greatest performance improvement relative to implementation effort. Use it whenever a developer asks to analyze scene performance, identify bottlenecks, or generate a performance report. The MCP tool sequences below collect the data; the threshold tables and suggestion templates turn that data into actionable advice.

## Performance Analysis Execution Flow

1. **Collect rendering metrics**: Use `manage_graphics(action: "get_rendering_stats")` to get Draw Calls, Shader complexity, and other rendering statistics
2. **Collect Console logs**: Use `read_console()` to get GC Allocation warnings and frame rate related logs
3. **Locate bottleneck objects**: Use `find_gameobjects(filter: ...)` to search for high-polygon models, complex Shader objects
4. **Load threshold settings**: Load thresholds from a project-local config file (e.g., `Assets/Config/performance-thresholds.json`) or built-in defaults
5. **Compare against thresholds**: Compare collected metrics against thresholds item by item
6. **Generate report**: Produce a Performance_Report JSON including metric values, bottleneck list, and optimization suggestions
7. **Report results**: Present the report summary to the developer in structured format

> **Threshold context**: These thresholds are derived from profiling data across mobile (ARM Mali/Adreno GPUs common in smartphones and tablets), desktop (mid-range GPU), and VR/XR (Quest 2/3 and similar standalone headsets used for training, visualization, and interactive experiences) projects. Mobile thresholds are the most restrictive because thermal throttling (when a device automatically reduces performance to prevent overheating) compounds frame drops over time.

## Performance Metric Threshold Recommendations

### Draw Calls
| Level | Threshold | Description |
|-------|-----------|-------------|
| Normal | < 500 | Recommended range for mobile platforms |
| Warning | 500–1000 | May affect performance on low-end devices |
| Error | > 1000 | Severely impacts frame rate, requires immediate optimization |

### GC Allocation (per frame)
| Level | Threshold | Description |
|-------|-----------|-------------|
| Normal | < 1 KB | Ideal state |
| Warning | 1–5 KB | May cause intermittent stuttering |
| Error | > 5 KB | Frequently triggers GC, causing noticeable frame drops |

### Shader Complexity (instruction count)
| Level | Threshold | Description |
|-------|-----------|-------------|
| Normal | < 128 | Suitable for most platforms |
| Warning | 128–256 | May be problematic on mobile platforms |
| Error | > 256 | Shader needs simplification |

### Frame Rate (FPS)
| Level | Threshold | Description |
|-------|-----------|-------------|
| Normal | ≥ 60 | Smooth experience |
| Warning | 30–59 | Acceptable but room for improvement |
| Error | < 30 | Poor experience, optimization needed |

## Optimization Suggestion Templates

### High Draw Calls
- **LOD (Level of Detail)**: Create LOD Groups for high-polygon models, use low-polygon versions at distance
- **Material Batching**: Merge materials for objects using the same Shader, enable Static/Dynamic Batching
- **GPU Instancing**: Enable GPU Instancing for large numbers of repeated objects
- **Occlusion Culling**: Enable Occlusion Culling to reduce rendering of invisible objects

### High GC Allocation
- **Object Pooling**: Avoid `new` in Update/FixedUpdate, use object pools instead
- **Avoid Boxing**: Use generic collections to avoid value type boxing
- **String Operations**: Use StringBuilder instead of string concatenation
- **Cache References**: Cache GetComponent results in Awake/Start, avoid per-frame calls

### High Shader Complexity
- **Shader Simplification**: Reduce math operations and sampling in Shaders
- **Shader LOD**: Use Shader LOD to switch to simplified versions on low-end devices
- **Mobile Shaders**: Use URP/Mobile series Shaders for mobile platforms
- **Reduce Pass Count**: Merge multi-pass Shaders into single pass

### Low Frame Rate
- **Lower Resolution**: Use dynamic resolution scaling on mobile platforms
- **Reduce Post-Processing**: Disable non-essential post-processing effects (Bloom, SSAO, Motion Blur)
- **Physics Optimization**:
  - Lower FixedUpdate frequency: FixedUpdate is Unity's physics update loop — a method called at a fixed time interval regardless of frame rate, used for physics calculations and other time-sensitive operations. The Fixed Timestep setting (found in Edit > Project Settings > Time) controls how often this loop runs. For example, changing from 0.02 (50 updates/sec) to 0.04 (25 updates/sec) reduces physics updates by half, which can improve performance on physics-heavy scenes.
  - Simplify collider shapes: prefer Box/Sphere/Capsule colliders over Mesh colliders where possible.
- **Script Optimization**: Move expensive logic to Coroutines or Job System

## MCP Tool Usage Examples

### Get Rendering Statistics
```
manage_graphics(action: "get_rendering_stats")
→ { drawCalls: 850, triangles: 1200000, ... }
```

### Read Console Performance Logs
```
read_console(filter: "GC|performance|frame")
→ [{ message: "GC.Alloc: 4.2 KB", ... }, ...]
```

### Search High-Polygon Objects
```
find_gameobjects(filter: "MeshFilter")
→ [{ name: "HeroModel", path: "/Characters/HeroModel", ... }, ...]
```

## Analysis Tool Troubleshooting

- If `manage_graphics` returns empty data, prompt the developer to confirm they are in Play Mode
- If `read_console` has no performance-related logs, inform the developer they may need to enable Profiler or Deep Profiling
- If threshold config file fails to load, automatically use built-in default thresholds and inform the developer
- If Unity Editor frame rate is below 10 FPS, suggest reducing analysis sampling frequency

## Performance Optimization Strategy

- Perform performance analysis in Play Mode for accurate data
- Use Development Build for performance testing to get complete Profiler data
- Optimize Draw Calls and GC Allocation first — these have the greatest performance impact
- Set platform-appropriate thresholds (mobile platforms should be stricter)
- Perform performance analysis regularly to avoid accumulating performance issues

## Unity 6 Advanced Profiling Guide (from official PDF best practices)

### Frame Time Over FPS

Per the Unity official Profiling Guide, **use frame time (ms) rather than FPS** as the performance baseline:
- 60fps = 16.66ms/frame
- 30fps = 33.33ms/frame
- 90fps (VR) = 11.11ms/frame

FPS is a deceptive metric: dropping from 900fps to 450fps looks severe, but the actual difference is only 1.111ms.

### Platform-Specific Frame Budgets

| Platform | Target FPS | Frame Budget | Actual Available (with thermal) |
|----------|-----------|-------------|-------------------------------|
| PC/Console | 60 | 16.66ms | 16.66ms |
| Mobile | 30 | 33.33ms | ~22ms (reserve 35% for thermal) |
| VR/XR | 72-90 | 11.11-13.88ms | ~8-10ms |
| WebGL | 60 | 16.66ms | ~14ms (browser overhead) |

### CPU-bound vs GPU-bound Diagnosis

> **CPU-bound** means the CPU is the performance bottleneck (it can't feed data
> to the GPU fast enough). **GPU-bound** means the GPU is the bottleneck (it
> can't finish rendering before the next frame is due).

Use the Profiler Timeline view to identify which applies:
- **Gfx.WaitForCommands** → Render thread waiting for main thread → CPU-bound
- **Gfx.WaitForPresentOnGfxThread** → Main thread waiting for render thread → Possibly GPU-bound
- **Camera.Render on render thread** → CPU-bound (spending too much time sending draw calls)
- **Gfx.PresentFrame** → GPU-bound (waiting for GPU to finish rendering)

### Unity 6 New Features

- **GPU Resident Drawer** (Unity 6 feature): Enable Instanced Drawing in URP Asset to significantly reduce draw calls (requires Forward+ renderer)
- **GPU Occlusion Culling**: Use with GPU Resident Drawer to reduce rendering of invisible objects
- **Spatial-Temporal Post-Processing (STP)**: Lower rendering resolution while maintaining quality, suitable for mobile
- **Split Graphics Jobs**: Enable in Player Settings to leverage multi-core CPU for faster render command submission
- **Incremental GC**: Spread GC workload across multiple frames to reduce single-frame stuttering

### Profiler Tips

1. **Disable VSync marker**: Hide VSync markers in CPU Profiler to see actual workload clearly
2. **Use Call Stacks**: Enable Allocation Call Stacks to trace GC.Alloc sources, lower overhead than Deep Profiling
3. **Profile Analyzer comparison**: Save pre-optimization .data files, use Compare view after optimization to compare differences
4. **Standalone Profiler**: Use standalone Profiler window to avoid Editor UI affecting measurements
5. **Highlights Module**: Unity 6's new Highlights module quickly identifies CPU/GPU bound status

### Memory Analysis Guide

- Use Memory Profiler package for detailed memory snapshots
- Compare two snapshots to detect memory leaks (objects persisting after scene unload)
- Focus on Texture2D and Mesh usage in the Unity Objects tab
- Set memory budgets per target platform (80% of lowest-spec device)
