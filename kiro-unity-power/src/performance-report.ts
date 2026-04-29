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

/** Default thresholds used when no custom thresholds are provided (PC/Console). */
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  drawCalls: { warning: 500, error: 1000 },
  gcAllocation: { warning: 1024, error: 5120 },
  shaderComplexity: { warning: 128, error: 256 },
  frameRate: { warningBelow: 60, errorBelow: 30 },
};

/**
 * Mobile-specific thresholds (from Unity 6 optimization guide).
 * Mobile devices need stricter limits due to thermal throttling and battery constraints.
 * Frame budget: ~22ms at 30fps (65% of 33.33ms to allow cooling).
 */
export const MOBILE_THRESHOLDS: PerformanceThresholds = {
  drawCalls: { warning: 100, error: 300 },
  gcAllocation: { warning: 512, error: 1024 },
  shaderComplexity: { warning: 64, error: 128 },
  frameRate: { warningBelow: 30, errorBelow: 20 },
};

/**
 * VR/XR-specific thresholds (from Unity 6 XR optimization guide).
 * VR requires 72-90fps minimum to prevent motion sickness.
 * Frame budget: ~11ms at 90fps.
 */
export const XR_THRESHOLDS: PerformanceThresholds = {
  drawCalls: { warning: 150, error: 400 },
  gcAllocation: { warning: 256, error: 1024 },
  shaderComplexity: { warning: 64, error: 128 },
  frameRate: { warningBelow: 72, errorBelow: 60 },
};

/** Platform type for selecting appropriate thresholds. */
export type PlatformType = 'pc' | 'console' | 'mobile' | 'xr' | 'webgl';

/**
 * Get the appropriate default thresholds for a given platform.
 * Based on Unity 6 optimization guides for each platform category.
 */
export function getThresholdsForPlatform(platform: PlatformType): PerformanceThresholds {
  switch (platform) {
    case 'mobile':
    case 'webgl':
      return MOBILE_THRESHOLDS;
    case 'xr':
      return XR_THRESHOLDS;
    case 'pc':
    case 'console':
    default:
      return DEFAULT_THRESHOLDS;
  }
}

// Optimisation suggestion templates keyed by metric name.
// Enhanced with specific advice from Unity 6 optimization guides.
const SUGGESTIONS: Record<string, string> = {
  drawCalls:
    '建議：(1) 啟用 SRP Batcher 減少 GPU setup 開銷 (2) 使用 GPU Instancing 合併重複物件 ' +
    '(3) 標記靜態物件為 Batching Static (4) 啟用 Occlusion Culling 剔除不可見物件 ' +
    '(5) Unity 6 可啟用 GPU Resident Drawer 大幅減少 draw calls (6) 使用 Frame Debugger 分析批次中斷原因。',
  gcAllocation:
    '建議：(1) 使用 UnityEngine.Pool 物件池取代 Instantiate/Destroy ' +
    '(2) 在 Awake/Start 快取 GetComponent 結果 (3) 使用 StringBuilder 取代字串串接 ' +
    '(4) 避免在 Update 中使用 LINQ 和 Regular Expressions (5) 快取 WaitForSeconds 物件 ' +
    '(6) 使用 GameObject.CompareTag() 取代 .tag 字串比較 (7) 考慮啟用 Incremental GC。',
  shaderComplexity:
    '建議：(1) 使用 URP Lit/Simple Lit 取代自訂重型 Shader (2) 在 Shader Graph 中減少節點數量 ' +
    '(3) 使用 half 精度取代 float（尤其行動平台）(4) 實作 Shader LOD 分級 ' +
    '(5) 合併多張貼圖為 channel-packed atlas 減少取樣次數 (6) 使用 Strip Shader Variants 減少變體數量。',
  frameRate:
    '建議：(1) 使用 frame time (ms) 而非 FPS 作為效能基準（60fps = 16.66ms, 30fps = 33.33ms）' +
    '(2) 行動平台預留 35% frame budget 給散熱（30fps 實際預算約 22ms）' +
    '(3) 啟用 Spatial-Temporal Post-Processing (STP) 降低渲染解析度同時維持畫質 ' +
    '(4) 使用 Profile Analyzer 比較最佳化前後的多幀數據 (5) 考慮使用 C# Job System + Burst 將重型計算移至 Worker Thread。',
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
