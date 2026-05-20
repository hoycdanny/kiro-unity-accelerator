/**
 * UIDependencySerialization — Serialize, deserialize, and format UI dependency analysis reports.
 *
 * - serializeUIDependencyReport: Serialize a UIDependencyReport to a JSON string
 * - deserializeUIDependencyReport: Deserialize a JSON string into a UIDependencyReport; throws descriptive errors on invalid format
 * - formatUIDependencyReportAsText: Format a report as human-readable text
 *
 * Follows the existing profiler-serialization.ts trio pattern.
 */

import { UIDependencyReport } from './types';

// ============================================================
// Public API
// ============================================================

/**
 * Serialize a UIDependencyReport to a JSON string.
 */
export function serializeUIDependencyReport(report: UIDependencyReport): string {
  return JSON.stringify(report);
}

/**
 * Deserialize a JSON string into a UIDependencyReport.
 * Throws a descriptive error if the JSON is invalid or the structure does not match the UIDependencyReport type.
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
 * Format a UIDependencyReport as a human-readable text report.
 * Includes all ScriptReference filePaths, all CouplingPair scriptA/scriptB,
 * and all RefactoringSuggestion titles.
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
// Validation helpers
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
