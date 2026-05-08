/**
 * Detect naming conflicts between a scaffold's object names and names that
 * already exist in the target scene.
 *
 * @param scaffoldNames - Names extracted from the SceneScaffold hierarchy.
 * @param existingNames - Names of objects already present in the scene.
 * @returns An array of names that appear in both sets (conflicts).
 */
export function detectNameConflicts(
  scaffoldNames: string[],
  existingNames: string[],
): string[] {
  const existingSet = new Set(existingNames);
  const conflicts: string[] = [];
  const seen = new Set<string>();

  for (const name of scaffoldNames) {
    if (existingSet.has(name) && !seen.has(name)) {
      conflicts.push(name);
      seen.add(name);
    }
  }

  return conflicts;
}
