/**
 * UIDependencySerialization — 序列化、反序列化與格式化 UI 依賴分析報告。
 *
 * - serializeUIDependencyReport：將 UIDependencyReport 序列化為 JSON 字串
 * - deserializeUIDependencyReport：將 JSON 字串反序列化為 UIDependencyReport，無效格式拋出描述性錯誤
 * - formatUIDependencyReportAsText：將報告格式化為人類可讀的文字
 *
 * 遵循現有 profiler-serialization.ts 的三件組模式。
 */

import { UIDependencyReport } from './types';

// ============================================================
// 公開 API
// ============================================================

/**
 * 將 UIDependencyReport 序列化為 JSON 字串。
 */
export function serializeUIDependencyReport(report: UIDependencyReport): string {
  return JSON.stringify(report);
}

/**
 * 將 JSON 字串反序列化為 UIDependencyReport。
 * 若 JSON 格式無效或結構不符合 UIDependencyReport 型別，拋出描述性錯誤。
 */
export function deserializeUIDependencyReport(json: string): UIDependencyReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${message}`);
  }

  validateUIDependencyReport(parsed);
  return parsed as UIDependencyReport;
}

/**
 * 將 UIDependencyReport 格式化為人類可讀的文字報告。
 * 包含所有 ScriptReference 的 filePath、所有 CouplingPair 的 scriptA/scriptB、
 * 以及所有 RefactoringSuggestion 的 title。
 */
export function formatUIDependencyReportAsText(report: UIDependencyReport): string {
  const lines: string[] = [];

  lines.push('=== UI Dependency Analysis Report ===');
  lines.push(`ID: ${report.id}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');

  // Summary
  const s = report.summary;
  lines.push('--- Summary ---');
  lines.push(`Total UI components: ${s.totalUIComponents}`);
  lines.push(`Total script references: ${s.totalScriptReferences}`);
  lines.push(`Total event chains: ${s.totalEventChains}`);
  lines.push(`Deep chains: ${s.deepChainCount}`);
  lines.push(`High coupling pairs: ${s.highCouplingPairCount}`);
  lines.push('');

  // Script references
  const refs = report.referenceResult.references;
  if (refs.length > 0) {
    lines.push('--- Script References ---');
    for (const ref of refs) {
      lines.push(`  - ${ref.filePath}:${ref.lineNumber} [${ref.referenceMethod}] ${ref.componentType} ${ref.fieldName}`);
    }
    lines.push('');
  }

  // High fan-in components
  const hfi = report.referenceResult.highFanInComponents;
  if (hfi.length > 0) {
    lines.push('--- High Fan-In Components ---');
    for (const c of hfi) {
      lines.push(`  - ${c.componentType} ${c.fieldName} (${c.referenceCount} references)`);
    }
    lines.push('');
  }

  // Event chains
  const chains = report.chainResult.chains;
  if (chains.length > 0) {
    lines.push('--- Event Chains ---');
    for (const chain of chains) {
      const deepTag = chain.isDeepChain ? ' [DEEP]' : '';
      const cycleTag = chain.cyclePath ? ' [CYCLE]' : '';
      lines.push(`  Chain: ${chain.entryPoint.scriptPath} ${chain.entryPoint.eventName} (depth: ${chain.depth})${deepTag}${cycleTag}`);
      for (const node of chain.nodes) {
        lines.push(`    - ${node.scriptPath}:${node.lineNumber} ${node.functionName} [${node.nodeType}]`);
      }
    }
    lines.push('');
  }

  // Coupling pairs
  const pairs = report.couplingPairs;
  if (pairs.length > 0) {
    lines.push('--- Coupling Pairs ---');
    for (const pair of pairs) {
      const biTag = pair.isBidirectional ? ' [BIDIRECTIONAL]' : '';
      lines.push(`  - ${pair.scriptA} <-> ${pair.scriptB} (score: ${pair.couplingScore})${biTag}`);
    }
    lines.push('');
  }

  // Refactoring suggestions
  const suggestions = report.suggestions;
  if (suggestions.length > 0) {
    lines.push('--- Refactoring Suggestions ---');
    for (const sug of suggestions) {
      lines.push(`  - ${sug.title} [${sug.type}] (impact: ${sug.estimatedImpact})`);
      lines.push(`    Problem: ${sug.problemDescription}`);
      for (const step of sug.steps) {
        lines.push(`    Step: ${step}`);
      }
    }
    lines.push('');
  }

  // Failed files
  const failed = report.referenceResult.failedFiles;
  if (failed.length > 0) {
    lines.push('--- Failed Files ---');
    for (const f of failed) {
      lines.push(`  - ${f.filePath}: ${f.error}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// 驗證輔助函式
// ============================================================

function validateUIDependencyReport(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid UIDependencyReport: expected an object');
  }

  const obj = value as Record<string, unknown>;

  // Required string fields
  for (const field of ['id', 'timestamp'] as const) {
    if (typeof obj[field] !== 'string') {
      throw new Error(`Invalid UIDependencyReport: missing or invalid field "${field}" (expected string)`);
    }
  }

  // referenceResult: object
  if (typeof obj.referenceResult !== 'object' || obj.referenceResult === null) {
    throw new Error('Invalid UIDependencyReport: missing or invalid field "referenceResult" (expected object)');
  }
  validateReferenceResult(obj.referenceResult);

  // chainResult: object
  if (typeof obj.chainResult !== 'object' || obj.chainResult === null) {
    throw new Error('Invalid UIDependencyReport: missing or invalid field "chainResult" (expected object)');
  }
  validateChainResult(obj.chainResult);

  // couplingPairs: array
  if (!Array.isArray(obj.couplingPairs)) {
    throw new Error('Invalid UIDependencyReport: field "couplingPairs" must be an array');
  }

  // suggestions: array
  if (!Array.isArray(obj.suggestions)) {
    throw new Error('Invalid UIDependencyReport: field "suggestions" must be an array');
  }

  // summary: object
  if (typeof obj.summary !== 'object' || obj.summary === null) {
    throw new Error('Invalid UIDependencyReport: missing or invalid field "summary" (expected object)');
  }
  validateSummary(obj.summary);
}

function validateReferenceResult(value: unknown): void {
  const obj = value as Record<string, unknown>;

  if (typeof obj.query !== 'object' || obj.query === null) {
    throw new Error('Invalid UIDependencyReport: referenceResult.query must be an object');
  }
  if (!Array.isArray(obj.references)) {
    throw new Error('Invalid UIDependencyReport: referenceResult.references must be an array');
  }
  if (!Array.isArray(obj.highFanInComponents)) {
    throw new Error('Invalid UIDependencyReport: referenceResult.highFanInComponents must be an array');
  }
  if (!Array.isArray(obj.failedFiles)) {
    throw new Error('Invalid UIDependencyReport: referenceResult.failedFiles must be an array');
  }
}

function validateChainResult(value: unknown): void {
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.chains)) {
    throw new Error('Invalid UIDependencyReport: chainResult.chains must be an array');
  }
  if (typeof obj.deepChainCount !== 'number') {
    throw new Error('Invalid UIDependencyReport: chainResult.deepChainCount must be a number');
  }
  if (typeof obj.cycleCount !== 'number') {
    throw new Error('Invalid UIDependencyReport: chainResult.cycleCount must be a number');
  }
}

function validateSummary(value: unknown): void {
  const obj = value as Record<string, unknown>;

  for (const field of [
    'totalUIComponents',
    'totalScriptReferences',
    'totalEventChains',
    'deepChainCount',
    'highCouplingPairCount',
  ] as const) {
    if (typeof obj[field] !== 'number') {
      throw new Error(`Invalid UIDependencyReport: summary.${field} must be a number`);
    }
  }
}
