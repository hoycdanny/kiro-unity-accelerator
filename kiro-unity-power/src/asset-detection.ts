import { AssetPreset } from './types';

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
