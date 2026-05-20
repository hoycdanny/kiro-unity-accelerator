/**
 * ReportIntegrator — Integrate screenshot analysis, code scan, and optimization suggestions into a unified performance report.
 *
 * The generated ProfilerReport contains data from all analysis sources, sorted by Severity.
 * The report summary includes total hotspot count, counts per severity level, and the top three priority issues.
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
// Severity sorting weight (Error > Warning > Suggestion)
// ============================================================

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  [SeverityLevel.Error]: 0,
  [SeverityLevel.Warning]: 1,
  [SeverityLevel.Suggestion]: 2,
};

// ============================================================
// Public API
// ============================================================

/**
 * Integrate screenshot analysis, code scan, and optimization suggestions into a complete ProfilerReport.
 *
 * Hotspots in the report are sorted by Severity from high to low (Error > Warning > Suggestion);
 * antipatterns are also sorted by Severity.
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
 * Generate a report summary containing:
 * - Total hotspot count (screenshot hotspots + antipattern count)
 * - Issue count per severity level
 * - Top three priority issues (sorted by Severity)
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
// Internal helper functions
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
