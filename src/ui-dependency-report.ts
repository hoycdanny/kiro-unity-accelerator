/**
 * UIDependencyReport — Integrates UI reference tracking, event call chain analysis,
 * coupling assessment, and refactoring suggestions into a complete UI dependency
 * analysis report.
 *
 * couplingPairs in the report are sorted by couplingScore in descending order.
 * The report summary includes total UI components, total references, total event
 * call chains, number of overly deep call chains, and high-coupling pair count.
 */

import {
  UIReferenceResult,
  EventChainResult,
  CouplingPair,
  RefactoringSuggestion,
  UIDependencyReport,
  UIDependencyReportSummary,
} from './types';

// ============================================================
// Public API
// ============================================================

/**
 * Integrate all UI dependency analysis results into a complete UIDependencyReport.
 *
 * couplingPairs are sorted by couplingScore in descending order.
 * Counts in summary are consistent with detailed data.
 */
export function integrateUIDependencyReport(
  referenceResult: UIReferenceResult,
  chainResult: EventChainResult,
  couplingPairs: CouplingPair[],
  suggestions: RefactoringSuggestion[],
): UIDependencyReport {
  const sortedPairs = sortCouplingPairsByScore(couplingPairs);

  const summary = generateUIDependencyReportSummary(
    referenceResult,
    chainResult,
    sortedPairs,
  );

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    referenceResult,
    chainResult,
    couplingPairs: sortedPairs,
    suggestions,
    summary,
  };
}

// ============================================================
// Internal helper functions
// ============================================================

/**
 * Generate report summary with counts consistent with detailed data.
 */
function generateUIDependencyReportSummary(
  referenceResult: UIReferenceResult,
  chainResult: EventChainResult,
  sortedPairs: CouplingPair[],
): UIDependencyReportSummary {
  const uniqueComponents = new Set<string>();
  for (const ref of referenceResult.references) {
    uniqueComponents.add(`${ref.componentType}:${ref.fieldName}`);
  }

  const HIGH_COUPLING_THRESHOLD = 10;

  return {
    totalUIComponents: uniqueComponents.size,
    totalScriptReferences: referenceResult.references.length,
    totalEventChains: chainResult.chains.length,
    deepChainCount: chainResult.deepChainCount,
    highCouplingPairCount: sortedPairs.filter(
      (p) => p.couplingScore >= HIGH_COUPLING_THRESHOLD,
    ).length,
  };
}

function sortCouplingPairsByScore(pairs: CouplingPair[]): CouplingPair[] {
  return [...pairs].sort((a, b) => b.couplingScore - a.couplingScore);
}

let counter = 0;
function generateId(): string {
  counter += 1;
  return `ui-dep-report-${Date.now()}-${counter}`;
}
