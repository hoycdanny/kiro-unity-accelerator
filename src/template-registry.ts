import * as path from 'path';

import {
  loadConfig,
  saveConfig,
  deleteConfig,
  DEFAULT_BUILT_IN_BASE,
  DEFAULT_CUSTOM_BASE,
} from './config-crud';

import type {
  SOTemplateDefinition,
  BatchRule,
  TemplateListItem,
} from './types';

// ----------------------------------------------------------------
// Path constants
// ----------------------------------------------------------------

const TEMPLATE_SUBDIR = path.join('LevelDesign', 'Templates');
const BATCH_RULE_SUBDIR = path.join('LevelDesign', 'BatchRules');

/** Custom (project-level) directory for SO templates. */
export const TEMPLATE_CUSTOM_DIR = path.join(DEFAULT_CUSTOM_BASE, TEMPLATE_SUBDIR);

/** Built-in (Power package) directory for SO templates. */
export const TEMPLATE_BUILT_IN_DIR = path.join(DEFAULT_BUILT_IN_BASE, TEMPLATE_SUBDIR);

/** Custom (project-level) directory for batch rules. */
export const BATCH_RULE_CUSTOM_DIR = path.join(DEFAULT_CUSTOM_BASE, BATCH_RULE_SUBDIR);

/** Built-in (Power package) directory for batch rules. */
export const BATCH_RULE_BUILT_IN_DIR = path.join(DEFAULT_BUILT_IN_BASE, BATCH_RULE_SUBDIR);

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function toFileName(name: string): string {
  return `${name}.json`;
}

/**
 * Lists JSON files in a directory via config-crud's loadConfig pattern.
 * Returns file names (without extension) found in the given directory.
 */
function listJsonFiles(dir: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------
// Template CRUD  (Requirement 4.1, 4.3, 4.4, 4.5)
// ----------------------------------------------------------------

/**
 * Saves a SOTemplateDefinition to the custom templates directory.
 * Automatically sets `updatedAt` to the current timestamp.
 */
export function saveTemplate(template: SOTemplateDefinition): void {
  const toSave: SOTemplateDefinition = {
    ...template,
    updatedAt: new Date().toISOString(),
  };
  if (!toSave.createdAt) {
    toSave.createdAt = toSave.updatedAt;
  }
  saveConfig(toFileName(template.className), toSave, { dir: TEMPLATE_CUSTOM_DIR });
}

/**
 * Loads a SOTemplateDefinition by class name.
 *
 * Resolution order (Requirement 5.2):
 *   1. Custom directory (project-level)
 *   2. Built-in directory (Power package)
 *   3. null
 */
export function loadTemplate(name: string): SOTemplateDefinition | null {
  return loadConfig<SOTemplateDefinition>(toFileName(name), {
    customDir: TEMPLATE_CUSTOM_DIR,
    builtInDir: TEMPLATE_BUILT_IN_DIR,
  });
}

/**
 * Lists all saved templates, merging custom and built-in directories.
 * Custom templates take precedence over built-in ones with the same name.
 */
export function listTemplates(): TemplateListItem[] {
  const customNames = listJsonFiles(TEMPLATE_CUSTOM_DIR);
  const builtInNames = listJsonFiles(TEMPLATE_BUILT_IN_DIR);

  // Deduplicate: custom overrides built-in
  const allNames = Array.from(new Set([...customNames, ...builtInNames]));

  const items: TemplateListItem[] = [];
  for (const name of allNames) {
    const template = loadTemplate(name);
    if (!template) continue;
    items.push({
      name: template.className,
      description: template.description,
      fieldSummary: template.fields.map((f) => `${f.name}: ${f.typeName}`).join(', '),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      version: template.version,
    });
  }

  return items;
}

/**
 * Deletes a template from the custom directory.
 * Returns true if the file was deleted, false if it didn't exist.
 */
export function deleteTemplate(name: string): boolean {
  return deleteConfig(toFileName(name), { dir: TEMPLATE_CUSTOM_DIR });
}

// ----------------------------------------------------------------
// Batch Rule CRUD  (Requirement 4.1, 4.2, 4.3, 4.4)
// ----------------------------------------------------------------

/**
 * Saves a BatchRule to the custom batch rules directory.
 * Automatically sets `updatedAt` to the current timestamp.
 */
export function saveBatchRule(rule: BatchRule): void {
  const toSave: BatchRule = {
    ...rule,
    updatedAt: new Date().toISOString(),
  };
  if (!toSave.createdAt) {
    toSave.createdAt = toSave.updatedAt;
  }
  saveConfig(toFileName(rule.name), toSave, { dir: BATCH_RULE_CUSTOM_DIR });
}

/**
 * Loads a BatchRule by name.
 *
 * Resolution order:
 *   1. Custom directory
 *   2. Built-in directory
 *   3. null
 */
export function loadBatchRule(name: string): BatchRule | null {
  return loadConfig<BatchRule>(toFileName(name), {
    customDir: BATCH_RULE_CUSTOM_DIR,
    builtInDir: BATCH_RULE_BUILT_IN_DIR,
  });
}

/**
 * Lists all saved batch rules, merging custom and built-in directories.
 * Custom rules take precedence over built-in ones with the same name.
 */
export function listBatchRules(): TemplateListItem[] {
  const customNames = listJsonFiles(BATCH_RULE_CUSTOM_DIR);
  const builtInNames = listJsonFiles(BATCH_RULE_BUILT_IN_DIR);

  const allNames = Array.from(new Set([...customNames, ...builtInNames]));

  const items: TemplateListItem[] = [];
  for (const name of allNames) {
    const rule = loadBatchRule(name);
    if (!rule) continue;
    items.push({
      name: rule.name,
      description: rule.description,
      fieldSummary: rule.filters.map((f) => `${f.type}=${f.value}`).join(', '),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      version: rule.version,
    });
  }

  return items;
}

/**
 * Deletes a batch rule from the custom directory.
 * Returns true if the file was deleted, false if it didn't exist.
 */
export function deleteBatchRule(name: string): boolean {
  return deleteConfig(toFileName(name), { dir: BATCH_RULE_CUSTOM_DIR });
}

// ----------------------------------------------------------------
// Name conflict check  (Requirement 4.6)
// ----------------------------------------------------------------

/**
 * Checks whether a template or batch rule with the given name already
 * exists in the custom directory.
 *
 * Returns `true` if a conflict is found (name already taken).
 */
export function checkNameConflict(
  name: string,
  type: 'template' | 'batchRule',
): boolean {
  if (type === 'template') {
    return loadConfig<SOTemplateDefinition>(toFileName(name), {
      customDir: TEMPLATE_CUSTOM_DIR,
    }) !== null;
  }
  return loadConfig<BatchRule>(toFileName(name), {
    customDir: BATCH_RULE_CUSTOM_DIR,
  }) !== null;
}
