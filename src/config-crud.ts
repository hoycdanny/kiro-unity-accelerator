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
  'UnityAccelerator',
  'Config',
);

// ----------------------------------------------------------------
// Path validation helper (prevents path traversal attacks)
// ----------------------------------------------------------------

/**
 * Validates that a file name does not contain path traversal sequences.
 * Throws an error if the name is unsafe.
 */
function validateFileName(fileName: string): void {
  if (
    fileName.includes('..') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes('\0')
  ) {
    throw new Error(`Invalid file name: "${fileName}" contains path traversal characters.`);
  }
}

/**
 * Validates that a resolved path stays within the expected base directory.
 * Throws an error if the resolved path escapes the base.
 */
function validatePathWithinBase(resolvedPath: string, baseDir: string): void {
  const normalizedBase = path.resolve(baseDir) + path.sep; // nosemgrep: path-join-resolve-traversal
  const normalizedPath = path.resolve(resolvedPath); // nosemgrep: path-join-resolve-traversal
  if (!normalizedPath.startsWith(normalizedBase) && normalizedPath !== path.resolve(baseDir)) { // nosemgrep: path-join-resolve-traversal
    throw new Error(
      `Path traversal detected: "${resolvedPath}" escapes base directory "${baseDir}".`,
    );
  }
}

/**
 * Safely joins a base directory with a validated file name and returns the path.
 * Validates both the file name and the resulting path to prevent traversal.
 */
function safePath(baseDir: string, fileName: string): string {
  validateFileName(fileName);
  const joined = path.join(baseDir, fileName); // nosemgrep: path-join-resolve-traversal
  validatePathWithinBase(joined, baseDir);
  return joined;
}

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
    const customPath = safePath(customDir, fileName);
    const result = readJsonFile<T>(customPath);
    if (result !== null) return result;
  }

  // Fallback to built-in template
  if (builtInDir) {
    const builtInPath = safePath(builtInDir, fileName);
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
  const filePath = safePath(options.dir, fileName);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) { // nosemgrep: detect-non-literal-fs-filename
    fs.mkdirSync(dirPath, { recursive: true }); // nosemgrep: detect-non-literal-fs-filename
  }

  fs.writeFileSync(filePath, JSON.stringify(entity, null, 2), 'utf-8'); // nosemgrep: detect-non-literal-fs-filename
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
  const filePath = safePath(options.dir, fileName);

  if (!fs.existsSync(filePath)) { // nosemgrep: detect-non-literal-fs-filename
    return false;
  }

  fs.unlinkSync(filePath); // nosemgrep: detect-non-literal-fs-filename
  return true;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null; // nosemgrep: detect-non-literal-fs-filename
    const raw = fs.readFileSync(filePath, 'utf-8'); // nosemgrep: detect-non-literal-fs-filename
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
