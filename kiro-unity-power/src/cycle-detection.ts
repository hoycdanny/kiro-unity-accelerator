/**
 * Cycle detection for directed graphs using DFS.
 *
 * Used by both code cyclic dependency detection (Requirement 7.6) and
 * asset circular reference detection (Requirement 10.6).
 */

/** A directed graph represented as an adjacency list (node → neighbours). */
export type DirectedGraph = Map<string, string[]>;

/**
 * Detect all elementary cycles in a directed graph.
 *
 * Returns an array of cycles where each cycle is an array of node identifiers
 * forming the path (e.g. `["A", "B", "C"]` means A → B → C → A).
 *
 * Non-cyclic paths are never reported as cycles.
 */
export function detectCycles(graph: DirectedGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  // Ensure we visit every node even in disconnected graphs.
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, graph, visited, inStack, stack, cycles);
    }
  }

  return deduplicateCycles(cycles);
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function dfs(
  node: string,
  graph: DirectedGraph,
  visited: Set<string>,
  inStack: Set<string>,
  stack: string[],
  cycles: string[][],
): void {
  visited.add(node);
  inStack.add(node);
  stack.push(node);

  const neighbours = graph.get(node) ?? [];
  for (const neighbour of neighbours) {
    if (inStack.has(neighbour)) {
      // Found a cycle — extract the cycle path from the stack.
      const cycleStart = stack.indexOf(neighbour);
      if (cycleStart !== -1) {
        cycles.push(stack.slice(cycleStart));
      }
    } else if (!visited.has(neighbour)) {
      dfs(neighbour, graph, visited, inStack, stack, cycles);
    }
  }

  stack.pop();
  inStack.delete(node);
}

/**
 * Deduplicate cycles that represent the same loop but start at different nodes.
 *
 * Two cycles are considered identical if they contain the same nodes in the
 * same rotational order.  We normalise each cycle by rotating it so the
 * lexicographically smallest node comes first, then deduplicate.
 */
function deduplicateCycles(cycles: string[][]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];

  for (const cycle of cycles) {
    const key = normaliseCycle(cycle);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cycle);
    }
  }

  return unique;
}

function normaliseCycle(cycle: string[]): string {
  if (cycle.length === 0) return '';
  // Find the rotation that starts with the lexicographically smallest element.
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[minIdx]) {
      minIdx = i;
    }
  }
  const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
  return rotated.join(' → ');
}
