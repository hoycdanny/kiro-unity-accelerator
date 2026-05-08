/**
 * AssetBundle duplication detection module.
 *
 * Detects assets that appear in two or more AssetBundles, which wastes
 * build size, memory, and download bandwidth.
 *
 * Requirement 10.4
 */

/** Represents an AssetBundle with its name and contained asset paths. */
export interface AssetBundle {
  name: string;
  assets: string[];
}

/** A single duplication entry: an asset path and the bundles it appears in. */
export interface DuplicationEntry {
  assetPath: string;
  bundles: string[];
}

/**
 * Detect assets that are duplicated across multiple AssetBundles.
 *
 * @param bundles  Array of AssetBundle definitions.
 * @returns Array of DuplicationEntry for every asset that appears in 2+ bundles.
 */
export function detectBundleDuplication(bundles: AssetBundle[]): DuplicationEntry[] {
  // Build a reverse index: asset path → list of bundle names containing it.
  const assetToBundles = new Map<string, string[]>();

  for (const bundle of bundles) {
    for (const asset of bundle.assets) {
      if (!assetToBundles.has(asset)) {
        assetToBundles.set(asset, []);
      }
      const list = assetToBundles.get(asset)!;
      if (!list.includes(bundle.name)) {
        list.push(bundle.name);
      }
    }
  }

  // Filter to assets appearing in 2 or more bundles.
  const duplications: DuplicationEntry[] = [];
  for (const [assetPath, bundleNames] of assetToBundles) {
    if (bundleNames.length >= 2) {
      duplications.push({ assetPath, bundles: bundleNames });
    }
  }

  return duplications;
}
