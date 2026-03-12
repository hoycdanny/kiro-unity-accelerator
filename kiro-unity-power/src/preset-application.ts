import { AssetPreset } from './types';

/** A flat record representing an asset's import settings state. */
export type AssetState = Record<string, unknown>;

/** A single changed parameter entry. */
export interface ChangeEntry {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

/** Result of applying a preset. */
export interface ApplyResult {
  success: boolean;
  newState: AssetState;
  error?: string;
}

/**
 * Apply an AssetPreset's config to an original asset state.
 *
 * Merges all leaf values from the preset config into the original state.
 * On error the original state is returned unchanged and the error is recorded.
 */
export function applyPreset(
  originalState: AssetState,
  preset: AssetPreset,
): ApplyResult {
  try {
    const newState: AssetState = { ...originalState };
    const flatConfig = flattenConfig(preset.config as unknown as Record<string, unknown>);

    for (const [key, value] of Object.entries(flatConfig)) {
      newState[key] = value;
    }

    return { success: true, newState };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, newState: { ...originalState }, error: message };
  }
}

/**
 * Generate a change summary listing every parameter that differs between
 * the original and new states. Parameters with identical values are excluded.
 */
export function generateChangeSummary(
  originalState: AssetState,
  newState: AssetState,
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  const allKeys = new Set([
    ...Object.keys(originalState),
    ...Object.keys(newState),
  ]);

  for (const key of allKeys) {
    const oldVal = originalState[key];
    const newVal = newState[key];
    if (!deepEqual(oldVal, newVal)) {
      changes.push({ key, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

/**
 * Flatten a nested config object into a single-level record.
 * e.g. { modelImport: { rigType: "Humanoid" } } → { rigType: "Humanoid" }
 */
function flattenConfig(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenConfig(value as Record<string, unknown>);
      Object.assign(result, nested);
    } else {
      // Top-level primitives in config are unlikely but handled
    }
  }

  // Also pick up direct primitive keys at the current level
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      result[key] = value;
    }
  }

  return result;
}

/** Simple deep equality check for JSON-serialisable values. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}
