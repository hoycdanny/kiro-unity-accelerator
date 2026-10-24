# Performance Analysis Steering

<!-- File Purpose / 本檔案用途: Unity performance analysis steering guide / Unity 效能分析的 steering 指引，涵蓋 profiling 工具群組啟用、效能指標收集、閾值比對、瓶頸定位及最佳化建議生成，並以 Unity 6.4 為基準。 -->

## Role and Purpose

Performance problems in Unity typically involve a few key metrics: Draw Calls, GC Allocation, Shader complexity, and frame rate. Unity's Profiler collects performance metrics. The challenge is understanding which metrics exceed acceptable thresholds for a given platform and what to do when they are outside the recommended range (see threshold tables below). This guide encodes the thresholds we have seen work across mobile, desktop, and VR projects, plus the optimization techniques that provide the greatest performance improvement relative to implementation effort. Use it whenever a developer asks to analyze scene performance, identify bottlenecks, or generate a performance report. The MCP tool sequences below collect the data; the threshold tables and suggestion templates turn that data into actionable advice.

## Performance Analysis Execution Flow

> **Tool group note**: `manage_profiler` is declared in the `profiling` group and `execute_code` in `scripting_ext`; the bridge reports both groups off by default, yet both tools answered with no activation on the live-verified install. **Do not open the analysis with an activation step.** Call the tool; only if it is reported as not existing do you run `manage_tools(action: "activate", group: "profiling")` (or `"scripting_ext"`), and then expect the MCP client may need a refresh or reconnect. The canonical procedure, including the `list_groups` → `sync` → `activate` → `reset` recovery order, is in `unity-general.md` under "Tool Group Activation (`manage_tools`)".

0. **(Only if a tool is reported as not existing)** activate the group that owns it — `manage_tools(action: "activate", group: "profiling")` for `manage_profiler`, `"scripting_ext"` for `execute_code`. Otherwise begin at step 1
1. **Collect rendering metrics**: Use `manage_graphics(action: "stats_get")` to get Draw Calls, batches, triangles, and other rendering statistics (there is no `get_rendering_stats` action); use `manage_profiler(action: "get_frame_timing")` for frame-time data. The read-only alternative that needs no tool group is the `mcpforunity://rendering/stats` resource
2. **Collect Console logs**: Use `read_console()` to get GC Allocation warnings and frame rate related logs
3. **Locate bottleneck objects**: Use `find_gameobjects(search_term: "MeshRenderer", search_method: "by_component")` to search for objects with heavy renderers. Only `search_term` is required; `search_method` is optional and its values are always prefixed (`by_name`, `by_tag`, `by_layer`, `by_component`, `by_path`, `by_id`). There is no generic `filter` param
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

> **Verified syntax**: confirmed against a live unity-mcp connection — `manage_graphics(action: "stats_get")` returned real fields like `draw_calls`, `batches`, `triangles`, `vertices`, `render_textures_bytes` (snake_case, not the camelCase shown in older drafts of this guide).

### Get Rendering Statistics
```
manage_graphics(action: "stats_get")
→ { draw_calls: 850, batches: 12, triangles: 1200000, vertices: 640000, render_textures: 23, ... }
```

> **Unity 6.4 reading discipline**: 6.4 redesigns the Rendering Statistics window so that draw calls are itemised by the path that optimised them — SRP Batcher, GPU Resident Drawer, BatchRendererGroup, and GPU instancing — and frame times are reported more accurately. When interpreting `stats_get`, **report which batching path absorbed the draw calls rather than treating draw calls as one number**; "850 draw calls" means something very different depending on whether the SRP Batcher or the GPU Resident Drawer is doing the work. Source: [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64), retrieved 2026-10-21.

### Read Console Performance Logs
```
read_console(filter_text: "GC")
→ { data: ["<b>GC.Alloc</b>: 4.2 KB", ...] }
```

The param is `filter_text`, not `filter`.

### Search High-Polygon Objects
```
find_gameobjects(search_term: "MeshRenderer", search_method: "by_component")
→ { data: { instanceIDs: [...], totalCount: N, ... } }
```

Fetch full detail per result via the `mcpforunity://scene/gameobject/{id}` resource, or `manage_components(action: "..." )`/direct inspection as needed — `find_gameobjects` itself returns instance IDs only, paginated (`pageSize`, `cursor`, `nextCursor`, `totalCount`, `hasMore`).

> **Instance IDs are opaque (Unity 6.4 `EntityId`)**: Unity 6.4 deprecates `InstanceID` in favour of a new `EntityId` type. **Treat the returned id as an opaque token — pass it straight back to the bridge; never do arithmetic on it, sort by it, or parse it.** In a performance report that means: do not cast ids to `int`, do not use the sign of an id to decide whether something is an asset, do not call `GetHashCode` on it, do not round-trip it through `ToString` + `int.Parse`, and do not sort by id to infer creation order when ranking "heaviest objects" — rank by the measured metric instead. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21.

## Analysis Tool Troubleshooting

- If `manage_graphics(action: "stats_get")` returns all-zero data, prompt the developer to confirm they are in Play Mode (rendering stats are typically only meaningful once something has actually rendered a frame)
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

### Unity 6.4 Rendering & Profiling Features

> **Version baseline**: these notes are written against **Unity 6.4** (stream `6000.4`, pinned patch `6000.4.12f1`), the pairing this Power was verified on — Unity `6000.4.6f1` + URP 17.4.0, checked 2026-10-21. Anything past 6.4 is forward-looking and unverified. The full policy, including the minimum supported Editor and the LTS recommendation, is in `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

- **GPU Resident Drawer** (URP, available on the 6.4 baseline): Uses the `BatchRendererGroup` API to draw GameObjects with GPU instancing, cutting CPU draw-call overhead — reports of up to 50% CPU rendering cost reduction in object-dense scenes. Hard requirements: renderer must use **Forward+** or **Deferred+** (not classic Forward/Deferred), the target Graphics API must support compute shaders (**not supported on OpenGL ES or VisionOS**), and Realtime GI (Enlighten) must be disabled. Enable via: Project Settings → Graphics → Shader Stripping → BatchRendererGroup Variants = "Keep All" → enable SRP Batcher on the URP Asset → set GPU Resident Drawer = "Instanced Drawing" → set the Universal Renderer's Rendering Path = "Forward+". Trade-off: longer build times (all BatchRendererGroup shader variants get compiled in). Also note: LOD animated cross-fading is unsupported (falls back to distance-based cross-fade) and `Light.shadowMatrixOverride` has no effect on shadow-caster culling while it's active
- **GPU Occlusion Culling**: Pairs with GPU Resident Drawer to cull invisible objects on the GPU; also supports Dynamic Occlusion alongside its own culling system
- **Render Graph (URP 17.4 on the 6.4 baseline, default since Unity 6.0) — Compatibility Mode is removed**: URP's render pass system runs through the Render Graph API, which reduces memory usage by only allocating the resources a frame actually needs. **Unity 6.4 removes URP Compatibility Mode for custom render passes entirely, along with the `URP_COMPATIBILITY_MODE` scripting define.** There is no "Compatibility Mode (Render Graph Disabled)" toggle to fall back to and no technical-debt switch to flag — Render Graph is the only path for custom render passes on 6.4. A project upgrading from an earlier 6.x with legacy `Execute`/`Configure` passes must port them to `RecordRenderGraph` before it will render. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21
- **2D custom render passes in URP (new in 6.4)**: a custom render pass can be injected into the URP 2D frame loop, so 2D projects can do custom rendering and post-processing inside URP instead of working around it. Relevant when profiling a 2D project that was previously paying for a bespoke rendering detour. Source: [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64), retrieved 2026-10-21
- **Volumes depend on the physics module (6.4)**: SRP Core's dependency on `com.unity.modules.physics` became a *soft* dependency in 6.4. The module can be disabled to shrink builds, but **local Volumes stop working** when it is — their trigger colliders are gone. `IVolume` was removed; use `VolumeGizmoDrawer` instead. Before reading `manage_graphics(action: "volume_*")` results or the `mcpforunity://scene/volumes` resource as evidence that post-processing is misconfigured, confirm the physics module is still enabled. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21
- **Spatial-Temporal Post-Processing (STP)**: Lower rendering resolution while maintaining quality, suitable for mobile
- **Split Graphics Jobs**: Enable in Player Settings to leverage multi-core CPU for faster render command submission
- **Incremental GC**: Spread GC workload across multiple frames to reduce single-frame stuttering
- **CoreCLR scripting backend (Experimental — and not reachable through this Power)**: `ScriptingImplementation.CoreCLR` exists as a Player-build enum value in the Editor on several Unity 6.x releases, but **`manage_build`'s `scripting_backend` parameter accepts only `mono` or `il2cpp`**, so the Power cannot produce a CoreCLR build to profile. Establish performance baselines against **Mono** (development builds) and **IL2CPP** (release builds) — those are the only two the bridge will set. The separately-tracked **CoreCLR Editor** effort (running the Editor process itself on CoreCLR) is forward-looking and unverified here; do not attach it to a specific release
- **Enter Play Mode without scene reload**: A 6.x Update release changed the default for *new* projects to skip domain reload on Play Mode entry (the exact release is reported, not verified), so static state can persist across Play sessions. Verify the actual project setting via `UnityEditor.EditorSettings.enterPlayModeOptionsEnabled` / `enterPlayModeOptions` (through `execute_code`) rather than assuming the default from version number alone — existing projects keep whatever setting they were created with regardless of the Editor version they're later opened in. **A live data point for exactly that, 2026-10-21**: the verification project on 6.4 reported `enterPlayModeOptionsEnabled = False` and `enterPlayModeOptions = None`, i.e. domain reload fully on. It was created in the Unity 6.0 era (template assets dated 2025-01-30) and later upgraded, so it carries the older default — **this confirms that an upgraded project keeps domain reload on, and it is not evidence against the reported new-project default**, which stays reported-not-verified. Which is precisely why you read the setting instead of inferring it. If domain reload is disabled, stale state (leftover subscriptions, cached singletons) can accumulate across repeated Play Mode entries and distort profiling results — recommend a full Editor restart or explicit domain reload before establishing a performance baseline

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
