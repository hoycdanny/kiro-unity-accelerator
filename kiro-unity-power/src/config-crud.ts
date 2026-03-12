import * as fs from 'fs';
import * as path from 'path';

/**
 * Default base paths used by the CRUD helpers.
 *
 * - `builtInBase`  – read-only templates shipped with the Power package
 * - `customBase`   – user/project-specific overrides inside the Unity project
 *
 * Callers may override these via the `options` parameter on each function.
 */
export interface BasePaths {
  builtInBase: string;
  customBase: string;
}

export const DEFAULT_BUILT_IN_BASE = path.join(__dirname, '..', 'templates');
export const DEFAULT_CUSTOM_BASE = path.join(
  'Assets',
  'KiroUnityPower',
  'Config',
);

// ----------------------------------------------------------------
// loadConfig
// ----------------------------------------------------------------

export interface LoadConfigOptions {
  /** Absolute or relative path to the custom config directory. */
  customDir?: string;
  /** Absolute or relative path to the built-in template directory. */
  builtInDir?: string;
}

/**
 * Load a JSON config entity from disk.
 *
 * Resolution order:
 *   1. `customDir / fileName`   (user override)
 *   2. `builtInDir / fileName`  (built-in fallback)
 *   3. `null`                   (not found)
 */
export function loadConfig<T>(
  fileName: string,
  options: LoadConfigOptions = {},
): T | null {
  const { customDir, builtInDir } = options;

  // Try custom location first
  if (customDir) {
    const customPath = path.join(customDir, fileName);
    const result = readJsonFile<T>(customPath);
    if (result !== null) return result;
  }

  // Fallback to built-in template
  if (builtInDir) {
    const builtInPath = path.join(builtInDir, fileName);
    const result = readJsonFile<T>(builtInPath);
    if (result !== null) return result;
  }

  return null;
}

// ----------------------------------------------------------------
// saveConfig
// ----------------------------------------------------------------

export interface SaveConfigOptions {
  /** Directory to write the config file into. */
  dir: string;
}

/**
 * Serialize `entity` as JSON and write it to `dir / fileName`.
 * Creates intermediate directories if they don't exist.
 */
export function saveConfig<T>(
  fileName: string,
  entity: T,
  options: SaveConfigOptions,
): void {
  const filePath = path.join(options.dir, fileName);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(entity, null, 2), 'utf-8');
}

// ----------------------------------------------------------------
// deleteConfig
// ----------------------------------------------------------------

export interface DeleteConfigOptions {
  /** Directory containing the config file to delete. */
  dir: string;
}

/**
 * Delete a config file from disk.
 * Returns `true` if the file was deleted, `false` if it didn't exist.
 */
export function deleteConfig(
  fileName: string,
  options: DeleteConfigOptions,
): boolean {
  const filePath = path.join(options.dir, fileName);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
