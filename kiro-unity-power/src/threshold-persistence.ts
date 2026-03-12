import { PerformanceThresholds } from './types';
import { loadConfig, saveConfig, LoadConfigOptions, SaveConfigOptions } from './config-crud';
import { DEFAULT_THRESHOLDS } from './performance-report';

const THRESHOLDS_FILE = 'thresholds.json';

export interface ThresholdPersistenceOptions {
  /** Directory where the custom thresholds file is stored. */
  customDir: string;
}

/**
 * Persist custom {@link PerformanceThresholds} to disk as JSON.
 */
export function saveThresholds(
  thresholds: PerformanceThresholds,
  options: ThresholdPersistenceOptions,
): void {
  const saveOpts: SaveConfigOptions = { dir: options.customDir };
  saveConfig<PerformanceThresholds>(THRESHOLDS_FILE, thresholds, saveOpts);
}

/**
 * Load custom {@link PerformanceThresholds} from disk.
 *
 * Returns the persisted thresholds if found, otherwise falls back to
 * {@link DEFAULT_THRESHOLDS}.
 */
export function loadThresholds(
  options: ThresholdPersistenceOptions,
): PerformanceThresholds {
  const loadOpts: LoadConfigOptions = { customDir: options.customDir };
  const loaded = loadConfig<PerformanceThresholds>(THRESHOLDS_FILE, loadOpts);
  return loaded ?? DEFAULT_THRESHOLDS;
}
