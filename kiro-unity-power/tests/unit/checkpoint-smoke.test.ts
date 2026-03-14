/**
 * Checkpoint 7 — Smoke test to verify all core modules integrate correctly.
 */
import { analyzeScreenshot, extractFunctionTimings, identifyHotspots } from '../../src/profiler-screenshot-analyzer';
import { scanScript, scanAllScripts } from '../../src/code-performance-scanner';
import { generateOptimizations, generateAntipatternFixes, assessOptimization } from '../../src/optimization-advisor';
import { integrateReport, generateSummary } from '../../src/report-integrator';
import { SeverityLevel } from '../../src/types';
import type { ScreenshotInput, PerformanceThresholds } from '../../src/types';

const THRESHOLDS: PerformanceThresholds = {
  drawCalls: { warning: 200, error: 500 },
  gcAllocation: { warning: 524288, error: 1048576 },
  shaderComplexity: { warning: 60, error: 80 },
  frameRate: { warningBelow: 60, errorBelow: 30 },
};

describe('Checkpoint 7: Module integration smoke tests', () => {
  test('analyzeScreenshot returns a valid result', () => {
    const input: ScreenshotInput = {
      description: 'CPU 85%, GPU 40%, Memory 512MB',
      cpuTimeline: [{ functionName: 'Update', timeMs: 12, percentage: 60 }],
      memoryAllocations: [],
    };
    const result = analyzeScreenshot(input, THRESHOLDS);
    expect(result.success).toBe(true);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.cpuUsagePercent).toBeGreaterThanOrEqual(0);
  });

  test('scanScript detects GetComponent in Update', () => {
    const code = `void Update() {\n  GetComponent<Rigidbody>();\n}`;
    const matches = scanScript('test.cs', code);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].antipatternType).toBe('GetComponentInUpdate');
  });

  test('generateOptimizations produces plans for hotspots', () => {
    const hotspots = [{
      category: 'cpu' as const,
      description: 'High CPU',
      value: 90,
      severity: SeverityLevel.Error,
      source: 'Update',
    }];
    const plans = generateOptimizations(hotspots);
    expect(plans.length).toBeGreaterThanOrEqual(1);
  });

  test('generateAntipatternFixes produces plans for antipatterns', () => {
    const code = `void Update() {\n  GetComponent<Rigidbody>();\n}`;
    const matches = scanScript('test.cs', code);
    const plans = generateAntipatternFixes(matches);
    expect(plans.length).toBeGreaterThanOrEqual(1);
  });

  test('integrateReport combines all sources into a report', () => {
    const screenshotResult = analyzeScreenshot(
      { description: 'CPU 90%', cpuTimeline: [], memoryAllocations: [] },
      THRESHOLDS,
    );
    const codeScanResult = scanAllScripts([
      { filePath: 'a.cs', content: 'void Update() {\n  GetComponent<Rigidbody>();\n}' },
    ]);
    const optimizations = generateOptimizations(screenshotResult.hotspots);

    const report = integrateReport(screenshotResult, codeScanResult, optimizations);
    expect(report.id).toBeTruthy();
    expect(report.summary).toBeDefined();
    expect(report.summary.totalHotspots).toBeGreaterThanOrEqual(0);
    expect(report.summary.topIssues.length).toBeLessThanOrEqual(3);
  });

  test('assessOptimization annotates impact and difficulty', () => {
    const plan = {
      title: 'Test',
      description: 'Test plan',
      targetType: 'cpu',
      steps: ['step 1'],
      estimatedImpact: 'medium' as const,
      implementationDifficulty: 'low' as const,
    };
    const assessed = assessOptimization(plan);
    expect(['high', 'medium', 'low']).toContain(assessed.estimatedImpact);
    expect(['high', 'medium', 'low']).toContain(assessed.implementationDifficulty);
  });
});
