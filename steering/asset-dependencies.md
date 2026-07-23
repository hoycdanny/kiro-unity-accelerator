# Asset Dependencies Steering

<!-- File Purpose / 本檔案用途: Unity asset dependency analysis steering guide / Unity 資產依賴分析的 steering 指引，涵蓋依賴樹建構、孤立資產偵測、AssetBundle 重複檢測及刪除影響分析。 -->

## Role and Purpose

Asset relationships in Unity can be overlooked during rapid development, but understanding them helps prevent issues like broken references or runtime errors. For example, a Prefab may silently lose its material, a deleted texture may cause the scene to break at runtime, or two AssetBundles may ship the same 50 MB mesh twice. These issues can cause significant problems in production environments, including broken references, runtime errors, and increased build sizes. Understanding asset relationships helps prevent these issues, and being able to query them quickly helps identify problems during development rather than discovering them at runtime. This guide covers recursive dependency tree construction, orphan asset detection, AssetBundle duplication checks, and deletion impact assessment through MCP tool analysis. Use it whenever a developer asks about what depends on what, what is safe to delete, or whether a bundle has duplication problems.

## Workflow

> **Tool correction**: `manage_asset` has **no `get_dependencies` action** (confirmed against a live unity-mcp connection — the valid actions are `import`, `create`, `modify`, `delete`, `duplicate`, `move`, `rename`, `search`, `get_info`, `create_folder`, `get_components`). Dependency queries go through `execute_code`, calling Unity's own `AssetDatabase.GetDependencies` API directly — there is no dedicated MCP tool action for this.

1. **Get dependency info**: Use `execute_code(action: "execute", code: "return string.Join(\"|\", UnityEditor.AssetDatabase.GetDependencies(\"Assets/Characters/hero.fbx\", false));")` to get the direct dependency list for a specified asset. Passing `true` as the second argument returns the full transitive closure in one call instead of requiring manual recursion
2. **Recursive analysis**: Either use the recursive (`true`) form directly, or call with `false` per-asset and walk the graph yourself if you need per-level tree structure rather than a flat closure
3. **Build dependency tree**: Organize all nodes into a DependencyTree structure, recording each node's dependencies and referencedBy
4. **Detect circular references**: Use DFS (Depth-First Search) algorithm to detect all cycles in the dependency graph — in practice, true cycles are rare in `AssetDatabase.GetDependencies` output since Unity's own import pipeline doesn't generally allow them; this matters more for hand-rolled reference graphs (e.g. ScriptableObjects referencing each other) than for standard asset-to-asset dependencies
5. **Report results**: Present the dependency tree, cycles, orphan assets, and other analysis results in structured format

## Dependency Tree Analysis

### Building the Dependency Tree
- Start from the root asset, recursively get all direct and indirect dependencies
- Each node records: asset path, asset type, dependency list, referenced-by list
- Avoid revisiting already-analyzed nodes (use a visited set)
- Support deep nested dependencies (Material → Shader → Shader Include → ...)

### MCP Tool Call Sequence (verified against a live connection)
```
execute_code(action: "execute", code: "return string.Join(\"|\", UnityEditor.AssetDatabase.GetDependencies(\"Assets/Characters/hero.fbx\", false));")
→ "Assets/Materials/hero_mat.mat|Assets/Textures/hero_diffuse.png|Assets/Textures/hero_normal.png"

execute_code(action: "execute", code: "return string.Join(\"|\", UnityEditor.AssetDatabase.GetDependencies(\"Assets/Materials/hero_mat.mat\", false));")
→ "Assets/Shaders/Character.shader|Assets/Textures/hero_normal.png"

execute_code(action: "execute", code: "return string.Join(\"|\", UnityEditor.AssetDatabase.GetDependencies(\"Assets/Shaders/Character.shader\", false));")
→ ""  // Leaf node — no further dependencies

// Continue recursing for each dependency until all leaf nodes (assets with no
// further dependencies) are reached. In production projects, dependency trees
// typically reach 3-5 levels deep. If a circular dependency is detected during
// traversal (e.g., A → B → C → A), record the cycle path and stop recursing
// that branch to avoid infinite loops. Note: GetDependencies returns package
// and built-in engine dependencies too (e.g. render pipeline runtime scripts) —
// filter to Assets/ paths if only project-owned assets matter for the report.
```

> **Default compiler note**: the `string.Join` + array pattern above works under the default `codedom` compiler (C# 6). If building more complex analysis logic inline, avoid C# 7+ syntax (tuples, pattern matching, `var` with anonymous types in some contexts) unless Roslyn is confirmed available via the `compiler` param.

## Orphan Asset Detection Guide

### Detection Method
1. Use `manage_asset(action: "search", path: "Assets/", search_pattern: "*")` (paginated — use `page_size`/`page_number` to walk the full list) to get all assets in the project — there is no `list` action or a `recursive` flag; `search` under a folder path covers subfolders
2. Build a complete reference graph (referencedBy list for each asset) using `execute_code` calls to `AssetDatabase.GetDependencies` for every asset, then inverting the resulting edges
3. Identify in-degree zero nodes — assets not referenced by any other asset or scene
4. Exclude root-level assets (scene files themselves don't need to be referenced)

### Common Orphan Asset Types
- Old versions of materials or textures (replaced by newer versions but not deleted)
- Temporary assets used for testing
- Unused content from Asset Store imports
- Prefabs no longer referenced after refactoring

### MCP Tool Usage (verified against a live connection)
```
manage_asset(action: "search", path: "Assets/", search_pattern: "*")
→ { data: { assets: [{ path: "Assets/Textures/old_texture.png", guid: "...", ... }, ...] } }
```

There is no direct "find what references this asset" tool call — build the reverse index yourself: call `AssetDatabase.GetDependencies` (via `execute_code`) for every asset in the project, then for the target asset, check which other assets' dependency lists include its path. `find_gameobjects` searches **scene GameObjects**, not asset-to-asset references, and has no `references:`-style filter syntax — it is not usable for this check.

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
1. There is no direct "referenced-by" MCP tool call. Build the reverse index once (as described in Orphan Asset Detection above) via `execute_code` + `AssetDatabase.GetDependencies` across the project's assets, then look up which entries include the target asset's path
2. Recursively analyze all referencers' referencers (indirect impact) using the same reverse index
3. Specifically flag scene references — deleting an asset referenced by a scene causes scene load errors
4. Return the complete list of all affected items

### MCP Tool Call Sequence (verified pattern)
```
// Build the reverse-dependency index once per analysis session, e.g.:
execute_code(action: "execute", code: "
  var allAssets = UnityEditor.AssetDatabase.FindAssets(\"\", new[] { \"Assets\" });
  var lines = new System.Collections.Generic.List<string>();
  foreach (var guid in allAssets) {
    var path = UnityEditor.AssetDatabase.GUIDToAssetPath(guid);
    var deps = UnityEditor.AssetDatabase.GetDependencies(path, false);
    foreach (var d in deps) { if (d != path) lines.Add(path + \"=>\" + d); }
  }
  return string.Join(\"|\", lines);
")
// Then, to find what references Assets/Materials/hero_mat.mat, filter the
// returned "X=>Y" pairs for Y == "Assets/Materials/hero_mat.mat" and collect
// the X values. Repeat one more pass on those X values to get indirect impact.
```

> This scan can be slow and payload-heavy on large projects — for a single asset's impact analysis, it's often more practical to narrow `FindAssets` to a relevant subfolder filter, or to only build the reverse index for asset types likely to reference the target (e.g. Prefabs and Materials when checking a Texture).

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
