import {
  ScreenshotInput,
  CpuTimelineEntry,
  MemoryAllocationEntry,
  ProfilerMetrics,
  Hotspot,
  FunctionTiming,
  ScreenshotAnalysisResult,
  PerformanceThresholds,
  SeverityLevel,
} from './types';

/**
 * Parse a numeric value from a description string using a regex pattern.
 * Returns 0 if not found.
 */
function parseMetricFromDescription(description: string, pattern: RegExp): number {
  const match = description.match(pattern);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

/**
 * Extract ProfilerMetrics from a ScreenshotInput's description and structured data.
 */
function extractMetrics(input: ScreenshotInput): ProfilerMetrics {
  const desc = input.description;

  const cpuUsagePercent = parseMetricFromDescription(desc, /cpu[:\s]*(\d+(?:\.\d+)?)\s*%/i);
  const gpuUsagePercent = input.gpuUsage ?? parseMetricFromDescription(desc, /gpu[:\s]*(\d+(?:\.\d+)?)\s*%/i);
  const memoryUsageMB = parseMetricFromDescription(desc, /memory[:\s]*(\d+(?:\.\d+)?)\s*mb/i);
  const drawCalls = parseMetricFromDescription(desc, /draw\s*calls?[:\s]*(\d+)/i);
  const frameTimeMs = parseMetricFromDescription(desc, /frame\s*time[:\s]*(\d+(?:\.\d+)?)\s*ms/i);

  const gcAllocationBytes = input.memoryAllocations
    ? input.memoryAllocations
        .filter((e) => e.isGcAllocation)
        .reduce((sum, e) => sum + e.sizeBytes, 0)
    : parseMetricFromDescription(desc, /gc[:\s]*(\d+(?:\.\d+)?)/i);

  return {
    cpuUsagePercent: Math.max(0, cpuUsagePercent),
    gpuUsagePercent: Math.max(0, gpuUsagePercent),
    memoryUsageMB: Math.max(0, memoryUsageMB),
    gcAllocationBytes: Math.max(0, gcAllocationBytes),
    drawCalls: Math.max(0, drawCalls),
    frameTimeMs: Math.max(0, frameTimeMs),
  };
}

/**
 * Determine severity based on how far a value exceeds the threshold.
 * If value > error threshold → Error, else → Warning.
 */
function determineSeverity(value: number, warningThreshold: number, errorThreshold: number): SeverityLevel {
  if (value >= errorThreshold) {
    return SeverityLevel.Error;
  }
  return SeverityLevel.Warning;
}

/**
 * Identify hotspots where metrics exceed the given thresholds.
 * Each returned Hotspot has a category, description, value, severity, and source.
 */
export function identifyHotspots(
  metrics: ProfilerMetrics,
  thresholds: PerformanceThresholds,
): Hotspot[] {
  const hotspots: Hotspot[] = [];

  // CPU usage — treat as percentage; map to drawCalls thresholds as proxy
  if (metrics.cpuUsagePercent > thresholds.drawCalls.warning) {
    hotspots.push({
      category: 'cpu',
      description: `CPU usage at ${metrics.cpuUsagePercent}% exceeds threshold`,
      value: metrics.cpuUsagePercent,
      severity: determineSeverity(metrics.cpuUsagePercent, thresholds.drawCalls.warning, thresholds.drawCalls.error),
      source: 'CPU',
    });
  }

  // GPU usage — use shaderComplexity thresholds as proxy
  if (metrics.gpuUsagePercent > thresholds.shaderComplexity.warning) {
    hotspots.push({
      category: 'gpu',
      description: `GPU usage at ${metrics.gpuUsagePercent}% exceeds threshold`,
      value: metrics.gpuUsagePercent,
      severity: determineSeverity(metrics.gpuUsagePercent, thresholds.shaderComplexity.warning, thresholds.shaderComplexity.error),
      source: 'GPU',
    });
  }

  // Memory / GC allocation
  if (metrics.gcAllocationBytes > thresholds.gcAllocation.warning) {
    hotspots.push({
      category: 'memory',
      description: `GC allocation ${metrics.gcAllocationBytes} bytes exceeds threshold`,
      value: metrics.gcAllocationBytes,
      severity: determineSeverity(metrics.gcAllocationBytes, thresholds.gcAllocation.warning, thresholds.gcAllocation.error),
      source: 'GC Allocation',
    });
  }

  // Draw calls
  if (metrics.drawCalls > thresholds.drawCalls.warning) {
    hotspots.push({
      category: 'cpu',
      description: `Draw calls (${metrics.drawCalls}) exceed threshold`,
      value: metrics.drawCalls,
      severity: determineSeverity(metrics.drawCalls, thresholds.drawCalls.warning, thresholds.drawCalls.error),
      source: 'Draw Calls',
    });
  }

  // Frame time — higher is worse; use frame rate thresholds inverted
  // frameRate.warningBelow = 60 → frame time warning above ~16.67ms
  const warningFrameTimeMs = thresholds.frameRate.warningBelow > 0 ? 1000 / thresholds.frameRate.warningBelow : 16.67;
  const errorFrameTimeMs = thresholds.frameRate.errorBelow > 0 ? 1000 / thresholds.frameRate.errorBelow : 33.33;
  if (metrics.frameTimeMs > warningFrameTimeMs) {
    hotspots.push({
      category: 'cpu',
      description: `Frame time ${metrics.frameTimeMs}ms exceeds threshold`,
      value: metrics.frameTimeMs,
      severity: determineSeverity(metrics.frameTimeMs, warningFrameTimeMs, errorFrameTimeMs),
      source: 'Frame Time',
    });
  }

  return hotspots;
}

/**
 * Extract function timings from CPU timeline data, sorted by timeMs descending.
 */
export function extractFunctionTimings(cpuData: CpuTimelineEntry[]): FunctionTiming[] {
  return cpuData
    .map((entry) => ({
      functionName: entry.functionName,
      timeMs: entry.timeMs,
      percentage: entry.percentage,
    }))
    .sort((a, b) => b.timeMs - a.timeMs);
}

/**
 * Analyze a single Profiler screenshot input and produce a structured result.
 *
 * If the input description is empty or missing critical data, returns a
 * failure result with a descriptive error message.
 */
export function analyzeScreenshot(
  input: ScreenshotInput,
  thresholds: PerformanceThresholds,
): ScreenshotAnalysisResult {
  // Validate input
  if (!input.description || input.description.trim().length === 0) {
    return {
      metrics: { cpuUsagePercent: 0, gpuUsagePercent: 0, memoryUsageMB: 0, gcAllocationBytes: 0, drawCalls: 0, frameTimeMs: 0 },
      hotspots: [],
      functionTimings: [],
      memoryAllocations: [],
      success: false,
      error: 'Screenshot description is empty. Please provide a Profiler screenshot with visible CPU/GPU/Memory data.',
    };
  }

  const metrics = extractMetrics(input);
  const hotspots = identifyHotspots(metrics, thresholds);
  const functionTimings = input.cpuTimeline ? extractFunctionTimings(input.cpuTimeline) : [];
  const memoryAllocations = input.memoryAllocations ?? [];

  return {
    metrics,
    hotspots,
    functionTimings,
    memoryAllocations,
    success: true,
  };
}

/**
 * Analyze multiple screenshots in batch and merge results.
 *
 * The merged result aggregates all hotspots, function timings, and memory
 * allocations. Metrics are averaged across all successful analyses.
 * If all inputs fail, returns a failure result.
 */
export function analyzeBatch(
  inputs: ScreenshotInput[],
  thresholds: PerformanceThresholds,
): ScreenshotAnalysisResult {
  if (inputs.length === 0) {
    return {
      metrics: { cpuUsagePercent: 0, gpuUsagePercent: 0, memoryUsageMB: 0, gcAllocationBytes: 0, drawCalls: 0, frameTimeMs: 0 },
      hotspots: [],
      functionTimings: [],
      memoryAllocations: [],
      success: false,
      error: 'No screenshot inputs provided for batch analysis.',
    };
  }

  const results = inputs.map((input) => analyzeScreenshot(input, thresholds));
  const successful = results.filter((r) => r.success);

  if (successful.length === 0) {
    return {
      metrics: { cpuUsagePercent: 0, gpuUsagePercent: 0, memoryUsageMB: 0, gcAllocationBytes: 0, drawCalls: 0, frameTimeMs: 0 },
      hotspots: [],
      functionTimings: [],
      memoryAllocations: [],
      success: false,
      error: 'All screenshots failed analysis. Please ensure Profiler data is visible in the screenshots.',
    };
  }

  // Merge hotspots, function timings, and memory allocations from all successful results
  const allHotspots: Hotspot[] = [];
  const allTimings: FunctionTiming[] = [];
  const allAllocations: MemoryAllocationEntry[] = [];
  let totalCpu = 0, totalGpu = 0, totalMem = 0, totalGc = 0, totalDc = 0, totalFt = 0;

  for (const r of successful) {
    allHotspots.push(...r.hotspots);
    allTimings.push(...r.functionTimings);
    allAllocations.push(...r.memoryAllocations);
    totalCpu += r.metrics.cpuUsagePercent;
    totalGpu += r.metrics.gpuUsagePercent;
    totalMem += r.metrics.memoryUsageMB;
    totalGc += r.metrics.gcAllocationBytes;
    totalDc += r.metrics.drawCalls;
    totalFt += r.metrics.frameTimeMs;
  }

  const count = successful.length;
  const mergedMetrics: ProfilerMetrics = {
    cpuUsagePercent: totalCpu / count,
    gpuUsagePercent: totalGpu / count,
    memoryUsageMB: totalMem / count,
    gcAllocationBytes: totalGc / count,
    drawCalls: totalDc / count,
    frameTimeMs: totalFt / count,
  };

  // Sort merged timings by timeMs descending
  allTimings.sort((a, b) => b.timeMs - a.timeMs);

  return {
    metrics: mergedMetrics,
    hotspots: allHotspots,
    functionTimings: allTimings,
    memoryAllocations: allAllocations,
    success: true,
  };
}
