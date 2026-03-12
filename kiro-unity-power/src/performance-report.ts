import {
  PerformanceMetrics,
  PerformanceThresholds,
  PerformanceReport,
  Bottleneck,
} from './types';

/** Objects with associated metric values used for bottleneck identification. */
export interface SceneObject {
  objectPath: string;
  metrics: {
    drawCalls?: number;
    gcAllocation?: number;
    shaderComplexity?: number;
    frameRate?: number;
  };
}

/** Default thresholds used when no custom thresholds are provided. */
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  drawCalls: { warning: 500, error: 1000 },
  gcAllocation: { warning: 1024, error: 5120 },
  shaderComplexity: { warning: 128, error: 256 },
  frameRate: { warningBelow: 60, errorBelow: 30 },
};

// Optimisation suggestion templates keyed by metric name.
const SUGGESTIONS: Record<string, string> = {
  drawCalls:
    '建議啟用 Static/Dynamic Batching、GPU Instancing 或 Occlusion Culling 以減少 Draw Calls。',
  gcAllocation:
    '建議使用物件池（Object Pooling）、避免在 Update 中分配記憶體、使用 StringBuilder 取代字串串接。',
  shaderComplexity:
    '建議簡化 Shader 運算、減少取樣次數、使用 Shader LOD 或改用 Mobile/URP Shader。',
  frameRate:
    '建議降低後處理效果、啟用動態解析度縮放、最佳化物理與腳本邏輯。',
};

/**
 * Generate a {@link PerformanceReport} by comparing collected metrics against
 * the supplied (or default) thresholds.
 *
 * For every metric that exceeds its warning or error threshold the report will
 * contain a non-empty optimisation suggestion.
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS,
): PerformanceReport {
  const bottlenecks: Bottleneck[] = [];

  // --- Draw Calls ---
  if (metrics.drawCalls.peak > thresholds.drawCalls.warning) {
    bottlenecks.push({
      metric: 'drawCalls',
      objectPath: '',
      value: metrics.drawCalls.peak,
      suggestion: SUGGESTIONS.drawCalls,
    });
  }

  // --- GC Allocation ---
  if (metrics.gcAllocation.peak > thresholds.gcAllocation.warning) {
    bottlenecks.push({
      metric: 'gcAllocation',
      objectPath: '',
      value: metrics.gcAllocation.peak,
      suggestion: SUGGESTIONS.gcAllocation,
    });
  }

  // --- Shader Complexity ---
  if (metrics.shaderComplexity.peak > thresholds.shaderComplexity.warning) {
    bottlenecks.push({
      metric: 'shaderComplexity',
      objectPath: '',
      value: metrics.shaderComplexity.peak,
      suggestion: SUGGESTIONS.shaderComplexity,
    });
  }

  // --- Frame Rate (lower is worse) ---
  if (metrics.frameRate.min < thresholds.frameRate.warningBelow) {
    bottlenecks.push({
      metric: 'frameRate',
      objectPath: '',
      value: metrics.frameRate.min,
      suggestion: SUGGESTIONS.frameRate,
    });
  }

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    metrics,
    bottlenecks,
    thresholdsUsed: thresholds,
  };
}

/**
 * Identify scene objects that are contributing to metrics exceeding thresholds.
 *
 * Returns a {@link Bottleneck} entry for every object whose individual metric
 * value exceeds the corresponding warning threshold.  If no objects exceed any
 * threshold the returned array is empty.
 */
export function identifyBottlenecks(
  objects: SceneObject[],
  thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS,
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  for (const obj of objects) {
    const m = obj.metrics;

    if (m.drawCalls !== undefined && m.drawCalls > thresholds.drawCalls.warning) {
      bottlenecks.push({
        metric: 'drawCalls',
        objectPath: obj.objectPath,
        value: m.drawCalls,
        suggestion: SUGGESTIONS.drawCalls,
      });
    }

    if (m.gcAllocation !== undefined && m.gcAllocation > thresholds.gcAllocation.warning) {
      bottlenecks.push({
        metric: 'gcAllocation',
        objectPath: obj.objectPath,
        value: m.gcAllocation,
        suggestion: SUGGESTIONS.gcAllocation,
      });
    }

    if (m.shaderComplexity !== undefined && m.shaderComplexity > thresholds.shaderComplexity.warning) {
      bottlenecks.push({
        metric: 'shaderComplexity',
        objectPath: obj.objectPath,
        value: m.shaderComplexity,
        suggestion: SUGGESTIONS.shaderComplexity,
      });
    }

    if (m.frameRate !== undefined && m.frameRate < thresholds.frameRate.warningBelow) {
      bottlenecks.push({
        metric: 'frameRate',
        objectPath: obj.objectPath,
        value: m.frameRate,
        suggestion: SUGGESTIONS.frameRate,
      });
    }
  }

  return bottlenecks;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

let counter = 0;
function generateId(): string {
  counter += 1;
  return `perf-report-${Date.now()}-${counter}`;
}
