/**
 * UIDependencyReport — 整合 UI 引用追蹤、事件調用鏈分析、耦合度評估與重構建議
 * 為完整的 UI 依賴分析報告。
 *
 * 報告中的 couplingPairs 依 couplingScore 由高到低排序。
 * 報告摘要包含 UI 元件總數、引用總數、事件調用鏈總數、過深調用鏈數量與高耦合配對數量。
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
// 公開 API
// ============================================================

/**
 * 整合所有 UI 依賴分析結果為完整的 UIDependencyReport。
 *
 * couplingPairs 依 couplingScore 由高到低排序。
 * summary 中的計數與明細資料保持一致。
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
// 內部輔助函式
// ============================================================

/**
 * 產生報告摘要，計數與明細資料保持一致。
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
