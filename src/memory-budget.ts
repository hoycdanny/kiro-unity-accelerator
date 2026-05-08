import { PlatformProfile } from './types';

/**
 * An asset with its estimated memory size and category.
 */
export interface MemoryAsset {
  path: string;
  category: 'texture' | 'mesh' | 'audio' | 'other';
  estimatedSizeMB: number;
}

/**
 * A single memory budget violation.
 */
export interface BudgetViolation {
  assetPath: string;
  category: string;
  estimatedSizeMB: number;
  budgetMB: number;
}

/**
 * Check assets against the memory budget defined in a platform profile.
 *
 * Returns a violation for every asset whose estimated size exceeds the
 * budget for its category.
 */
export function checkMemoryBudget(
  assets: MemoryAsset[],
  profile: PlatformProfile,
): BudgetViolation[] {
  const budget = profile.checks.memoryBudget;
  const violations: BudgetViolation[] = [];

  const categoryBudget: Record<string, number> = {
    texture: budget.maxTextureMB,
    mesh: budget.maxMeshMB,
    audio: budget.maxAudioMB,
  };

  for (const asset of assets) {
    const limit = categoryBudget[asset.category];
    if (limit !== undefined && asset.estimatedSizeMB > limit) {
      violations.push({
        assetPath: asset.path,
        category: asset.category,
        estimatedSizeMB: asset.estimatedSizeMB,
        budgetMB: limit,
      });
    }
  }

  return violations;
}
