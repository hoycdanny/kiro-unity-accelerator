/**
 * Workflow Dependency Validation & Topological Sort
 *
 * Validates that workflow step dependencies are legal (no cycles,
 * all referenced step IDs exist) and produces a topological execution order.
 *
 * Requirements: 5.2, 5.6
 */

import { WorkflowStep, WorkflowTemplate } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** Topologically sorted step IDs (only populated when valid). */
  sortedStepIds: string[];
}

/**
 * Validate a workflow's dependency graph and return a topological order.
 */
export function validateDependencies(
  workflow: WorkflowTemplate,
): ValidationResult {
  const errors: string[] = [];
  const steps = workflow.steps;
  const idSet = new Set(steps.map((s) => s.id));

  // Check that every dependsOn reference points to an existing step
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!idSet.has(dep)) {
        errors.push(
          `Step "${step.id}" depends on non-existent step "${dep}".`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, sortedStepIds: [] };
  }

  // Attempt topological sort (Kahn's algorithm)
  const sorted = topologicalSort(steps);

  if (sorted === null) {
    errors.push('Circular dependency detected among workflow steps.');
    return { valid: false, errors, sortedStepIds: [] };
  }

  return { valid: true, errors: [], sortedStepIds: sorted };
}

/**
 * Topological sort using Kahn's algorithm.
 *
 * @returns Sorted step IDs, or `null` if a cycle exists.
 */
export function topologicalSort(steps: WorkflowStep[]): string[] | null {
  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const step of steps) {
    inDegree.set(step.id, 0);
    successors.set(step.id, []);
  }

  for (const step of steps) {
    for (const dep of step.dependsOn) {
      // dep → step  (step depends on dep, so dep is a predecessor)
      const list = successors.get(dep);
      if (list) {
        list.push(step.id);
      }
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const succ of successors.get(current) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 1) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) {
        queue.push(succ);
      }
    }
  }

  if (sorted.length !== steps.length) {
    return null; // cycle detected
  }

  return sorted;
}
