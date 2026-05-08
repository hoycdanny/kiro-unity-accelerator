/**
 * ProfilerSerialization — 序列化、反序列化與格式化效能分析報告。
 *
 * - serializeReport：將 ProfilerReport 序列化為 JSON 字串
 * - deserializeReport：將 JSON 字串反序列化為 ProfilerReport，無效格式拋出描述性錯誤
 * - formatReportAsText：將報告格式化為人類可讀的文字
 */

import {
  ProfilerReport,
  ScreenshotAnalysisResult,
  CodeScanResult,
  OptimizationPlan,
  ReportSummary,
  SeverityLevel,
} from './types';

// ============================================================
// 公開 API
// ============================================================

/**
 * 將 ProfilerReport 序列化為 JSON 字串。
 */
export function serializeReport(report: ProfilerReport): string {
  return JSON.stringify(report);
}

/**
 * 將 JSON 字串反序列化為 ProfilerReport。
 * 若 JSON 格式無效或結構不符合 ProfilerReport 型別，拋出描述性錯誤。
 */
export function deserializeReport(json: string): ProfilerReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${message}`);
  }

  validateProfilerReport(parsed);
  return parsed as ProfilerReport;
}

/**
 * 將 ProfilerReport 格式化為人類可讀的文字報告。
 * 包含所有熱點描述、嚴重程度與最佳化方案標題。
 */
export function formatReportAsText(report: ProfilerReport): string {
  const lines: string[] = [];

  lines.push(`=== Performance Profiler Report ===`);
  lines.push(`ID: ${report.id}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');

  // Summary
  const s = report.summary;
  lines.push(`--- Summary ---`);
  lines.push(`Total hotspots: ${s.totalHotspots}`);
  lines.push(
    `Severity counts: Error=${s.severityCounts[SeverityLevel.Error]}, ` +
    `Warning=${s.severityCounts[SeverityLevel.Warning]}, ` +
    `Suggestion=${s.severityCounts[SeverityLevel.Suggestion]}`,
  );

  if (s.topIssues.length > 0) {
    lines.push('Top issues:');
    for (const issue of s.topIssues) {
      lines.push(`  - [${issue.severity}] ${issue.description} (source: ${issue.source})`);
    }
  }
  lines.push('');

  // Screenshot analysis
  if (report.screenshotAnalysis) {
    lines.push(`--- Screenshot Analysis ---`);
    const sa = report.screenshotAnalysis;
    if (!sa.success) {
      lines.push(`Analysis failed: ${sa.error ?? 'unknown error'}`);
    } else {
      const m = sa.metrics;
      lines.push(`CPU: ${m.cpuUsagePercent}%, GPU: ${m.gpuUsagePercent}%, Memory: ${m.memoryUsageMB} MB`);
      lines.push(`GC Allocation: ${m.gcAllocationBytes} bytes, Draw Calls: ${m.drawCalls}, Frame Time: ${m.frameTimeMs} ms`);

      if (sa.hotspots.length > 0) {
        lines.push('Hotspots:');
        for (const h of sa.hotspots) {
          lines.push(`  - [${h.severity}] ${h.description} (category: ${h.category}, value: ${h.value}, source: ${h.source})`);
        }
      }

      if (sa.functionTimings.length > 0) {
        lines.push('Function timings:');
        for (const ft of sa.functionTimings) {
          lines.push(`  - ${ft.functionName}: ${ft.timeMs} ms (${ft.percentage}%)`);
        }
      }
    }
    lines.push('');
  }

  // Code scan
  if (report.codeScanResult) {
    lines.push(`--- Code Scan ---`);
    const cs = report.codeScanResult;
    lines.push(`Scanned files: ${cs.scannedCount}`);

    if (cs.antipatterns.length > 0) {
      lines.push('Antipatterns:');
      for (const ap of cs.antipatterns) {
        lines.push(`  - [${ap.severity}] ${ap.description} (${ap.filePath}:${ap.lineNumber}, type: ${ap.antipatternType})`);
      }
    }

    if (cs.failedFiles.length > 0) {
      lines.push('Failed files:');
      for (const f of cs.failedFiles) {
        lines.push(`  - ${f.filePath}: ${f.error}`);
      }
    }
    lines.push('');
  }

  // Optimizations
  if (report.optimizations.length > 0) {
    lines.push(`--- Optimizations ---`);
    for (const opt of report.optimizations) {
      lines.push(`  - ${opt.title} (impact: ${opt.estimatedImpact}, difficulty: ${opt.implementationDifficulty})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// 驗證輔助函式
// ============================================================

function validateProfilerReport(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid ProfilerReport: expected an object');
  }

  const obj = value as Record<string, unknown>;

  // Required string fields
  for (const field of ['id', 'timestamp'] as const) {
    if (typeof obj[field] !== 'string') {
      throw new Error(`Invalid ProfilerReport: missing or invalid field "${field}" (expected string)`);
    }
  }

  // screenshotAnalysis: null or object
  if (obj.screenshotAnalysis !== null && typeof obj.screenshotAnalysis !== 'object') {
    throw new Error('Invalid ProfilerReport: field "screenshotAnalysis" must be an object or null');
  }

  // codeScanResult: null or object
  if (obj.codeScanResult !== null && typeof obj.codeScanResult !== 'object') {
    throw new Error('Invalid ProfilerReport: field "codeScanResult" must be an object or null');
  }

  // optimizations: array
  if (!Array.isArray(obj.optimizations)) {
    throw new Error('Invalid ProfilerReport: field "optimizations" must be an array');
  }

  // summary: object
  if (typeof obj.summary !== 'object' || obj.summary === null) {
    throw new Error('Invalid ProfilerReport: missing or invalid field "summary" (expected object)');
  }

  const summary = obj.summary as Record<string, unknown>;
  if (typeof summary.totalHotspots !== 'number') {
    throw new Error('Invalid ProfilerReport: summary.totalHotspots must be a number');
  }
  if (typeof summary.severityCounts !== 'object' || summary.severityCounts === null) {
    throw new Error('Invalid ProfilerReport: summary.severityCounts must be an object');
  }
  if (!Array.isArray(summary.topIssues)) {
    throw new Error('Invalid ProfilerReport: summary.topIssues must be an array');
  }
}
