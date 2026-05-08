import { ArchitectureRule, RuleType } from './types';

/**
 * Represents a single C# script to be checked.
 */
export interface ScriptFile {
  path: string;
  content: string;
}

/**
 * A single architecture violation found during checking.
 */
export interface Violation {
  filePath: string;
  line: number;
  ruleName: string;
  suggestion: string;
}

/**
 * Check a set of scripts against a set of architecture rules.
 *
 * Returns all violations found.  Each violation includes the file path, line
 * number, violated rule name, and a fix suggestion.
 */
export function checkArchitecture(
  scripts: ScriptFile[],
  rules: ArchitectureRule[],
): Violation[] {
  const violations: Violation[] = [];
  const enabledRules = rules.filter((r) => r.enabled);

  for (const script of scripts) {
    const lines = script.content.split('\n');
    for (const rule of enabledRules) {
      for (const ruleConfig of rule.rules) {
        const found = checkRule(script.path, lines, rule.name, ruleConfig.type, ruleConfig.config);
        violations.push(...found);
      }
    }
  }

  return violations;
}

/**
 * Incremental check — checks a single changed file against all rules.
 *
 * The result is identical to what {@link checkArchitecture} would return for
 * the same file within a full scan.
 */
export function incrementalCheck(
  changedFile: ScriptFile,
  rules: ArchitectureRule[],
): Violation[] {
  return checkArchitecture([changedFile], rules);
}

// ----------------------------------------------------------------
// Rule checking logic
// ----------------------------------------------------------------

function checkRule(
  filePath: string,
  lines: string[],
  ruleName: string,
  ruleType: RuleType,
  config: Record<string, unknown>,
): Violation[] {
  switch (ruleType) {
    case RuleType.NamingConvention:
      return checkNamingConvention(filePath, lines, ruleName, config);
    case RuleType.LayerDependency:
      return checkLayerDependency(filePath, lines, ruleName, config);
    case RuleType.InheritanceConstraint:
      return checkInheritanceConstraint(filePath, lines, ruleName, config);
    case RuleType.CyclicDependency:
      // Cyclic dependency is handled at the graph level via cycle-detection.ts.
      // Individual file checks are not applicable here.
      return [];
    default:
      return [];
  }
}

/**
 * Check naming conventions: class names should end with one of the expected
 * suffixes for their layer.
 */
function checkNamingConvention(
  filePath: string,
  lines: string[],
  ruleName: string,
  config: Record<string, unknown>,
): Violation[] {
  const violations: Violation[] = [];
  const classRegex = /\bclass\s+(\w+)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(classRegex);
    if (!match) continue;

    const className = match[1];
    // Check if the file path hints at a layer and the class name doesn't match.
    for (const [layer, layerConfig] of Object.entries(config)) {
      const lc = layerConfig as { suffixes?: string[]; directory?: string };
      if (!lc.directory || !lc.suffixes) continue;

      const dirPattern = new RegExp(`[/\\\\]${lc.directory}[/\\\\]`, 'i');
      if (dirPattern.test(filePath)) {
        const hasSuffix = lc.suffixes.some((s) => className.endsWith(s));
        if (!hasSuffix) {
          violations.push({
            filePath,
            line: i + 1,
            ruleName: `${ruleName}/NamingConvention`,
            suggestion: `類別 '${className}' 位於 ${lc.directory} 目錄，建議名稱以 ${lc.suffixes.join(' 或 ')} 結尾。`,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Check layer dependency rules: using statements should not reference
 * forbidden layers.
 */
function checkLayerDependency(
  filePath: string,
  lines: string[],
  ruleName: string,
  config: Record<string, unknown>,
): Violation[] {
  const violations: Violation[] = [];
  const forbidden = (config as { forbidden?: Record<string, string[]> }).forbidden;
  if (!forbidden) return violations;

  // Determine which layer this file belongs to based on path.
  const currentLayer = detectLayer(filePath, config);
  if (!currentLayer) return violations;

  const forbiddenLayers = forbidden[currentLayer] ?? [];
  if (forbiddenLayers.length === 0) return violations;

  const usingRegex = /^\s*using\s+([\w.]+)\s*;/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(usingRegex);
    if (!match) continue;

    const ns = match[1];
    for (const forbiddenLayer of forbiddenLayers) {
      if (ns.toLowerCase().includes(forbiddenLayer.toLowerCase())) {
        violations.push({
          filePath,
          line: i + 1,
          ruleName: `${ruleName}/LayerDependency`,
          suggestion: `${currentLayer} 層不應引用 ${forbiddenLayer} 層。請移除 'using ${ns}' 或重構依賴方向。`,
        });
      }
    }
  }

  return violations;
}

/**
 * Check inheritance constraints: classes should not extend forbidden base
 * classes.
 */
function checkInheritanceConstraint(
  filePath: string,
  lines: string[],
  ruleName: string,
  config: Record<string, unknown>,
): Violation[] {
  const violations: Violation[] = [];
  const currentLayer = detectLayer(filePath, config);
  if (!currentLayer) return violations;

  const layerConstraint = (config as Record<string, { mustNotExtend?: string[] }>)[currentLayer];
  if (!layerConstraint?.mustNotExtend?.length) return violations;

  const classRegex = /\bclass\s+\w+\s*:\s*([\w.,\s]+)/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(classRegex);
    if (!match) continue;

    const bases = match[1].split(',').map((b) => b.trim());
    for (const base of bases) {
      if (layerConstraint.mustNotExtend.includes(base)) {
        violations.push({
          filePath,
          line: i + 1,
          ruleName: `${ruleName}/InheritanceConstraint`,
          suggestion: `${currentLayer} 層的類別不應繼承 ${base}。`,
        });
      }
    }
  }

  return violations;
}

/**
 * Detect which architectural layer a file belongs to based on its path and
 * the directory mappings in the rule config.
 */
function detectLayer(
  filePath: string,
  config: Record<string, unknown>,
): string | null {
  for (const [layer, layerConfig] of Object.entries(config)) {
    if (layer === 'allowed' || layer === 'forbidden') continue;
    const lc = layerConfig as { directory?: string };
    if (!lc.directory) continue;
    const dirPattern = new RegExp(`[/\\\\]${lc.directory}[/\\\\]`, 'i');
    if (dirPattern.test(filePath)) return layer;
  }
  return null;
}
