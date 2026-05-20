# Asset Dependencies Steering

<!-- File Purpose / 本檔案用途: Unity asset dependency analysis steering guide / Unity 資產依賴分析的 steering 指引，涵蓋依賴樹建構、孤立資產偵測、AssetBundle 重複檢測及刪除影響分析。 -->

## Role and Purpose

Asset relationships in Unity can be overlooked during rapid development, but understanding them helps prevent issues like broken references or runtime errors. For example, a Prefab may silently lose its material, a deleted texture may cause the scene to break at runtime, or two AssetBundles may ship the same 50 MB mesh twice. These issues can cause significant problems in production environments, including broken references, runtime errors, and increased build sizes. Understanding asset relationships helps prevent these issues, and being able to query them quickly helps identify problems during development rather than discovering them at runtime. This guide covers recursive dependency tree construction, orphan asset detection, AssetBundle duplication checks, and deletion impact assessment through MCP tool analysis. Use it whenever a developer asks about what depends on what, what is safe to delete, or whether a bundle has duplication problems.

## Workflow

1. **Get dependency info**: Use `manage_asset(action: "get_dependencies", path: ...)` to get the direct dependency list for a specified asset
2. **Recursive analysis**: Repeat step 1 for each direct dependency to build the complete dependency tree
3. **Build dependency tree**: Organize all nodes into a DependencyTree structure, recording each node's dependencies and referencedBy
4. **Detect circular references**: Use DFS (Depth-First Search) algorithm to detect all cycles in the dependency graph
5. **Report results**: Present the dependency tree, cycles, orphan assets, and other analysis results in structured format

## Dependency Tree Analysis

### Building the Dependency Tree
- Start from the root asset, recursively get all direct and indirect dependencies
- Each node records: asset path, asset type, dependency list, referenced-by list
- Avoid revisiting already-analyzed nodes (use a visited set)
- Support deep nested dependencies (Material → Shader → Shader Include → ...)

### MCP Tool Call Sequence
```
manage_asset(action: "get_dependencies", path: "Assets/Characters/hero.fbx")
→ { dependencies: ["Assets/Materials/hero_mat.mat", "Assets/Textures/hero_diffuse.png", "Assets/Textures/hero_normal.png"] }

manage_asset(action: "get_dependencies", path: "Assets/Materials/hero_mat.mat")
→ { dependencies: ["Assets/Shaders/Character.shader", "Assets/Textures/hero_normal.png"] }

manage_asset(action: "get_dependencies", path: "Assets/Shaders/Character.shader")
→ { dependencies: [] }  // Leaf node — no further dependencies

// Continue recursing for each dependency until all leaf nodes (assets with no
// further dependencies) are reached. In production projects, dependency trees
// typically reach 3-5 levels deep. If a circular dependency is detected during
// traversal (e.g., A → B → C → A), record the cycle path and stop recursing
// that branch to avoid infinite loops.
```

## Orphan Asset Detection Guide

### Detection Method
1. Use `manage_asset(action: "list", recursive: true)` to get all assets in the project
2. Build a complete reference graph (referencedBy list for each asset)
3. Identify in-degree zero nodes — assets not referenced by any other asset or scene
4. Exclude root-level assets (scene files themselves don't need to be referenced)

### Common Orphan Asset Types
- Old versions of materials or textures (replaced by newer versions but not deleted)
- Temporary assets used for testing
- Unused content from Asset Store imports
- Prefabs no longer referenced after refactoring

### MCP Tool Usage
```
manage_asset(action: "list", path: "Assets/", recursive: true)
→ [{ path: "Assets/Textures/old_texture.png", ... }, ...]

find_gameobjects(filter: "references:Assets/Textures/old_texture.png")
→ [] // Empty result means no references
```

## AssetBundle Duplication Detection Guide

### Detection Method
1. Get the content list of all AssetBundles
2. Build a reverse index of asset path → Bundle name
3. If the same asset path appears in two or more Bundles, flag it as duplicated
4. Report all duplicated items and their associated Bundle names

### Impact of Duplication
- Increases build artifact size (same asset packaged multiple times)
- Increases memory usage (runtime may load multiple copies)
- Increases download time (update packages for networked games become larger)

### Resolution Suggestions
- Extract shared assets into a dedicated shared Bundle
- Use Bundle dependency mechanisms instead of duplicating assets
- Run duplication detection regularly as part of CI/CD

## Deletion Impact Analysis Guide

### Analysis Method
1. Use `manage_asset(action: "get_dependencies")` to get the referenced-by list of the target asset
2. Recursively analyze all referencers' referencers (indirect impact)
3. Specifically flag scene references — deleting an asset referenced by a scene causes scene load errors
4. Return the complete list of all affected items

### MCP Tool Call Sequence
```
// Analyze deletion impact of hero_mat.mat
manage_asset(action: "get_dependencies", path: "Assets/Materials/hero_mat.mat")
→ { referencedBy: ["Assets/Prefabs/Hero.prefab"] }

manage_asset(action: "get_dependencies", path: "Assets/Prefabs/Hero.prefab")
→ { referencedBy: ["Assets/Scenes/MainLevel.unity", "Assets/Scenes/BossLevel.unity"] }

// Impact list: Hero.prefab, MainLevel.unity, BossLevel.unity
```

### Impact Level Classification
- **Direct impact**: Items that directly reference the deleted asset (material referencing a texture, Prefab referencing a material)
- **Indirect impact**: Items indirectly affected through the dependency chain (scene references Prefab, Prefab references the deleted material)
- **Scene impact**: List of affected scenes (most critical, as it causes runtime errors)

## Circular Reference Detection

### Detection Method
1. Build the asset dependency graph as a directed graph using an adjacency list
2. Use DFS (Depth-First Search) algorithm to detect all cycles
3. Describe cycle paths in text (e.g., `A.mat → B.shader → C.cginc → A.mat`)

### Common Circular Reference Patterns
- **Material cycles**: Material A references Shader X, a file included by Shader X references Material A's properties
- **Prefab cycles**: Prefab A contains a reference to Prefab B, Prefab B contains a reference to Prefab A
- **Script cycles**: ScriptableObject A references ScriptableObject B, B references A

### Resolution Suggestions
- Introduce an intermediate asset to break the cycle
- Use event systems or indirect references instead of direct references
- Redesign asset structure to ensure unidirectional dependency flow

## Error Handling

- If the asset path doesn't exist, inform you and suggest checking the path
- If an unreadable asset is encountered during analysis, log and skip it, continue analyzing remaining assets
- If the project has no AssetBundle configuration, inform you that duplication detection is unnecessary
- For large dependency graphs (over 1000 nodes), consider narrowing the analysis scope for better performance

## Best Practices

- Run orphan asset detection regularly to keep the project clean
- Always run impact analysis before deleting assets to avoid breaking scenes
- Include AssetBundle duplication detection in the pre-build check process
- Prioritize resolving circular references, as they cause indeterminate asset loading order
- Use folder structure to reflect dependency direction (e.g., `Shared/` → `Features/` → `Scenes/`)
