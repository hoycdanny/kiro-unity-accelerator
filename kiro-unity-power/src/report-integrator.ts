/**
 * ReportIntegrator — 整合截圖分析、程式碼掃描與最佳化建議為統一的效能報告。
 *
 * 產生的 ProfilerReport 包含所有分析來源的資料，並依 Severity 排序。
 * 報告摘要包含熱點總數、各嚴重程度數量與前三項優先問題。
 */

import {
  ScreenshotAnalysisResult,
  CodeScanResult,
  OptimizationPlan,
  ProfilerReport,
  ReportSummary,
  TopIssue,
  Hotspot,
  AntipatternMatch,
  SeverityLevel,
} from './types';

// ============================================================
// Severity 排序權重（Error > Warning > Suggestion）
// ============================================================

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  [SeverityLevel.Error]: 0,
  [SeverityLevel.Warning]: 1,
  [SeverityLevel.Suggestion]: 2,
};

// ============================================================
// 公開 API
// ============================================================

/**
 * 整合截圖分析、程式碼掃描與最佳化建議為完整的 ProfilerReport。
 *
 * 報告中的熱點依 Severity 由高到低排序（Error > Warning > Suggestion），
 * 反模式同樣依 Severity 排序。
 */
export function integrateReport(
  screenshotResult: ScreenshotAnalysisResult | null,
  codeScanResult: CodeScanResult | null,
  optimizations: OptimizationPlan[],
): ProfilerReport {
  // Sort hotspots by severity
  const sortedScreenshot = screenshotResult
    ? {
        ...screenshotResult,
        hotspots: sortHotspotsBySeverity(screenshotResult.hotspots),
      }
    : null;

  // Sort antipatterns by severity
  const sortedCodeScan = codeScanResult
    ? {
        ...codeScanResult,
        antipatterns: sortAntipatternsBySeverity(codeScanResult.antipatterns),
      }
    : null;

  const report: ProfilerReport = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    screenshotAnalysis: sortedScreenshot,
    codeScanResult: sortedCodeScan,
    optimizations,
    summary: {
      totalHotspots: 0,
      severityCounts: {
        [SeverityLevel.Error]: 0,
        [SeverityLevel.Warning]: 0,
        [SeverityLevel.Suggestion]: 0,
      },
      topIssues: [],
    },
  };

  report.summary = generateSummary(report);

  return report;
}

/**
 * 產生報告摘要，包含：
 * - 熱點總數（截圖熱點 + 反模式數量）
 * - 各嚴重程度的問題數量
 * - 最優先處理的前三項問題（依 Severity 排序）
 */
export function generateSummary(report: ProfilerReport): ReportSummary {
  const allIssues = collectAllIssues(report);

  // Sort all issues by severity
  allIssues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const severityCounts: Record<SeverityLevel, number> = {
    [SeverityLevel.Error]: 0,
    [SeverityLevel.Warning]: 0,
    [SeverityLevel.Suggestion]: 0,
  };

  for (const issue of allIssues) {
    severityCounts[issue.severity]++;
  }

  const topIssues: TopIssue[] = allIssues.slice(0, 3).map((issue) => ({
    description: issue.description,
    severity: issue.severity,
    source: issue.source,
  }));

  return {
    totalHotspots: allIssues.length,
    severityCounts,
    topIssues,
  };
}

// ============================================================
// 內部輔助函式
// ============================================================

interface NormalizedIssue {
  description: string;
  severity: SeverityLevel;
  source: string;
}

/**
 * Collect all issues (hotspots + antipatterns) from the report into a
 * normalized list for summary generation.
 */
function collectAllIssues(report: ProfilerReport): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];

  if (report.screenshotAnalysis) {
    for (const hotspot of report.screenshotAnalysis.hotspots) {
      issues.push({
        description: hotspot.description,
        severity: hotspot.severity,
        source: hotspot.source,
      });
    }
  }

  if (report.codeScanResult) {
    for (const ap of report.codeScanResult.antipatterns) {
      issues.push({
        description: ap.description,
        severity: ap.severity,
        source: `${ap.filePath}:${ap.lineNumber}`,
      });
    }
  }

  return issues;
}

function sortHotspotsBySeverity(hotspots: Hotspot[]): Hotspot[] {
  return [...hotspots].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

function sortAntipatternsBySeverity(antipatterns: AntipatternMatch[]): AntipatternMatch[] {
  return [...antipatterns].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

let counter = 0;
function generateId(): string {
  counter += 1;
  return `profiler-report-${Date.now()}-${counter}`;
}
