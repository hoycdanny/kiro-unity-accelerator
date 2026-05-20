import { AssetPreset } from './types';

/**
 * Maximum allowed length for regex patterns to mitigate ReDoS risk.
 */
const MAX_PATTERN_LENGTH = 200;

/**
 * Basic check to reject obviously dangerous regex patterns that could cause ReDoS.
 * Rejects patterns with nested quantifiers like (a+)+ or (a*)*
 */
function isSafeRegexPattern(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH) return false;
  // Reject nested quantifiers: e.g. (x+)+, (x*)+, (x+)*, (x{n,})+
  if (/(\+|\*|\{[^}]+\})\s*\)(\+|\*|\{[^}]+\})/.test(pattern)) return false;
  return true;
}

/**
 * Detect the asset type by matching the file path against each preset's naming patterns.
 *
 * Returns the first matching AssetPreset, or null if no pattern matches.
 */
export function detectAssetType(
  filePath: string,
  presets: AssetPreset[],
): AssetPreset | null {
  for (const preset of presets) {
    for (const pattern of preset.namingPatterns) {
      try {
        if (!isSafeRegexPattern(pattern)) continue;
        // nosemgrep: detect-non-literal-regexp -- pattern is validated by isSafeRegexPattern (length + nested quantifier check)
        const regex = new RegExp(pattern);
        if (regex.test(filePath)) {
          return preset;
        }
      } catch {
        // Skip invalid regex patterns
        continue;
      }
    }
  }
  return null;
}
