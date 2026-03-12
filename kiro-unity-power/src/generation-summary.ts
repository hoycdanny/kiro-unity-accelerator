import { SceneScaffold, SceneNode } from './types';

/** Summary produced after scaffold generation. */
export interface GenerationSummary {
  /** Total number of objects in the hierarchy (including all nested children). */
  objectCount: number;
  /** Deduplicated list of all component type names used across the hierarchy. */
  componentTypes: string[];
}

/**
 * Calculate a generation summary for a SceneScaffold.
 *
 * Counts every node in the hierarchy (recursively) and collects the union of
 * all component type names.
 */
export function calculateSummary(scaffold: SceneScaffold): GenerationSummary {
  const componentSet = new Set<string>();
  let objectCount = 0;

  for (const node of scaffold.hierarchy) {
    objectCount += countNodes(node, componentSet);
  }

  return {
    objectCount,
    componentTypes: Array.from(componentSet).sort(),
  };
}

/** Recursively count nodes and collect component type names. */
function countNodes(node: SceneNode, componentSet: Set<string>): number {
  let count = 1;

  for (const comp of node.components) {
    componentSet.add(comp.typeName);
  }

  for (const child of node.children) {
    count += countNodes(child, componentSet);
  }

  return count;
}
