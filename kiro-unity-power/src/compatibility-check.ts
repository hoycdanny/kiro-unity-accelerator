import { PlatformProfile, SeverityLevel } from './types';

/**
 * An asset to be checked for platform compatibility.
 */
export interface AssetInfo {
  path: string;
  shaderFeatures?: string[];
  estimatedSizeMB?: number;
  assetCategory?: 'texture' | 'mesh' | 'audio' | 'other';
}

/**
 * A single compatibility issue found during checking.
 */
export interface CompatibilityIssue {
  assetPath: string;
  severity: SeverityLevel;
  description: string;
  suggestion?: string;
}

/**
 * Check a set of assets against a platform profile.
 *
 * Identifies assets that use unsupported shader features and classifies
 * each issue as Error, Warning, or Suggestion.
 */
export function checkCompatibility(
  assets: AssetInfo[],
  profile: PlatformProfile,
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  const unsupported = new Set(profile.checks.shaderFeatures.unsupported);

  for (const asset of assets) {
    if (!asset.shaderFeatures) continue;

    for (const feature of asset.shaderFeatures) {
      if (unsupported.has(feature)) {
        const alternative = profile.checks.shaderFeatures.alternatives[feature];
        issues.push({
          assetPath: asset.path,
          severity: SeverityLevel.Error,
          description: `Shader 功能 '${feature}' 在 ${profile.platform} 平台不受支援。`,
          suggestion: alternative
            ? `替代方案：${alternative}`
            : undefined,
        });
      }
    }
  }

  return issues;
}

/**
 * Suggest shader alternatives for an unsupported feature on the given platform.
 *
 * Returns the alternative from the profile's shader features mapping, or
 * `null` if no alternative is defined.
 */
export function suggestShaderAlternatives(
  unsupportedFeature: string,
  profile: PlatformProfile,
): string | null {
  return profile.checks.shaderFeatures.alternatives[unsupportedFeature] ?? null;
}
