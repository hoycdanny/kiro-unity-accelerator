/**
 * Asset dependency analysis module.
 *
 * Provides dependency tree construction, orphaned asset detection,
 * delete impact analysis, and circular reference detection.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.5, 10.6
 */

import { detectCycles, DirectedGraph } from './cycle-detection';
import { DependencyTree, DependencyNode, CircularReference } from './types';

/**
 * Callback that returns the direct dependencies of a given asset path.
 * In production this would call the MCP `manage_asset(get_dependencies)` tool.
 */
export type GetDepsFunction = (assetPath: string) => string[];

/**
 * Build a complete dependency tree starting from a root asset.
 *
 * Recursively resolves all direct and indirect dependencies via the
 * provided `getDeps` callback.  Circular references are detected and
 * included in the result without causing infinite recursion.
 *
 * Requirement 10.1
 */
export function buildDependencyTree(
  rootAsset: string,
  getDeps: GetDepsFunction,
): DependencyTree {
  const nodesMap = new Map<string, DependencyNode>();
  const visited = new Set<string>();

  function visit(assetPath: string): void {
    if (visited.has(assetPath)) return;
    visited.add(assetPath);

    const deps = getDeps(assetPath);

    if (!nodesMap.has(assetPath)) {
      nodesMap.set(assetPath, {
        assetPath,
        assetType: inferAssetType(assetPath),
        dependencies: [],
        referencedBy: [],
      });
    }

    const node = nodesMap.get(assetPath)!;
    node.dependencies = deps;

    for (const dep of deps) {
      if (!nodesMap.has(dep)) {
        nodesMap.set(dep, {
          assetPath: dep,
          assetType: inferAssetType(dep),
          dependencies: [],
          referencedBy: [],
        });
      }
      const depNode = nodesMap.get(dep)!;
      if (!depNode.referencedBy.includes(assetPath)) {
        depNode.referencedBy.push(assetPath);
      }

      visit(dep);
    }
  }

  visit(rootAsset);

  // Build the directed graph for cycle detection.
  const graph: DirectedGraph = new Map();
  for (const [path, node] of nodesMap) {
    graph.set(path, node.dependencies);
  }
  const rawCycles = detectCycles(graph);
  const circularReferences: CircularReference[] = rawCycles.map((path) => ({ path }));

  return {
    rootAsset,
    nodes: Array.from(nodesMap.values()),
    circularReferences,
  };
}


/**
 * A reference graph mapping each asset to the set of assets it depends on.
 * Key = asset path, Value = array of asset paths it references/depends on.
 */
export type ReferenceGraph = Map<string, string[]>;

/**
 * Find orphaned assets — assets with zero in-degree (not referenced by
 * any other asset or scene).
 *
 * Requirement 10.2
 *
 * @param allAssets  Complete list of asset paths in the project.
 * @param referenceGraph  Adjacency list where key depends on values.
 *                        i.e. referenceGraph.get("A") = ["B","C"] means A references B and C.
 * @returns Array of asset paths that are not referenced by any other asset.
 */
export function findOrphanedAssets(
  allAssets: string[],
  referenceGraph: ReferenceGraph,
): string[] {
  // Build the set of all assets that are referenced by at least one other asset.
  const referenced = new Set<string>();
  for (const deps of referenceGraph.values()) {
    for (const dep of deps) {
      referenced.add(dep);
    }
  }

  return allAssets.filter((asset) => !referenced.has(asset));
}

/**
 * Analyse the impact of deleting a given asset.
 *
 * Returns all assets that directly or indirectly depend on the target asset
 * (i.e. all assets that would be affected if the target were removed).
 *
 * Requirements 10.3, 10.5
 *
 * @param asset  The asset path being considered for deletion.
 * @param referenceGraph  Adjacency list where key depends on values.
 * @returns Array of asset paths that would be affected by the deletion.
 */
export function analyzeDeleteImpact(
  asset: string,
  referenceGraph: ReferenceGraph,
): string[] {
  // Build a reverse graph: for each asset, who depends on it?
  const reverseGraph = new Map<string, string[]>();
  for (const [source, deps] of referenceGraph) {
    for (const dep of deps) {
      if (!reverseGraph.has(dep)) {
        reverseGraph.set(dep, []);
      }
      reverseGraph.get(dep)!.push(source);
    }
  }

  // BFS/DFS from the target asset through the reverse graph.
  const affected = new Set<string>();
  const queue = [asset];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseGraph.get(current) ?? [];
    for (const dep of dependents) {
      if (!affected.has(dep)) {
        affected.add(dep);
        queue.push(dep);
      }
    }
  }

  return Array.from(affected);
}

/**
 * Detect circular references in an asset dependency graph.
 *
 * This is a convenience wrapper around the shared `detectCycles` utility,
 * accepting a ReferenceGraph and returning CircularReference objects.
 *
 * Requirement 10.6
 */
export function detectAssetCycles(referenceGraph: ReferenceGraph): CircularReference[] {
  const graph: DirectedGraph = new Map();
  for (const [key, deps] of referenceGraph) {
    graph.set(key, deps);
  }
  return detectCycles(graph).map((path) => ({ path }));
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

/** Infer a simple asset type string from the file extension. */
function inferAssetType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const typeMap: Record<string, string> = {
    fbx: 'Model',
    obj: 'Model',
    blend: 'Model',
    png: 'Texture',
    jpg: 'Texture',
    jpeg: 'Texture',
    tga: 'Texture',
    psd: 'Texture',
    wav: 'Audio',
    mp3: 'Audio',
    ogg: 'Audio',
    mat: 'Material',
    shader: 'Shader',
    cginc: 'ShaderInclude',
    prefab: 'Prefab',
    unity: 'Scene',
    asset: 'ScriptableObject',
    controller: 'AnimatorController',
    anim: 'Animation',
    cs: 'Script',
  };
  return typeMap[ext] ?? 'Unknown';
}
