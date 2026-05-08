/**
 * Represents a single API change entry in a version changelog.
 */
export interface ApiChange {
  api: string;
  changeType: 'deprecated' | 'removed' | 'signatureChanged' | 'behaviorChanged';
  description: string;
  replacement?: string;
}

/**
 * Represents a detected API change that affects the project.
 */
export interface DetectedChange {
  api: string;
  change: ApiChange;
}

/**
 * Compare a set of APIs used by the project against a change list.
 *
 * Returns only the changes that affect APIs the project actually uses.
 * APIs in the change list that the project does not use are excluded.
 */
export function detectApiChanges(
  usedApis: string[],
  changeList: ApiChange[],
): DetectedChange[] {
  const usedSet = new Set(usedApis);
  const results: DetectedChange[] = [];

  for (const change of changeList) {
    if (usedSet.has(change.api)) {
      results.push({ api: change.api, change });
    }
  }

  return results;
}
