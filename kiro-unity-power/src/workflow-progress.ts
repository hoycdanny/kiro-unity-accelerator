/**
 * Workflow Progress Calculator
 *
 * Computes the completion percentage of a running workflow.
 * After completing step K out of N total steps, progress = K/N × 100.
 *
 * Requirement: 5.3
 */

/**
 * Calculate workflow progress as a percentage.
 *
 * @param totalSteps  Total number of steps in the workflow (N).
 * @param completedSteps  Number of steps completed so far (K).
 * @returns Progress percentage (0–100). Returns 100 when totalSteps is 0.
 */
export function calculateProgress(
  totalSteps: number,
  completedSteps: number,
): number {
  if (totalSteps <= 0) {
    return 100;
  }
  return (completedSteps / totalSteps) * 100;
}
