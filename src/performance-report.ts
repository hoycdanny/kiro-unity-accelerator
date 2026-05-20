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
// Note: For developers new to optimization, begin with Static Batching (the most straightforward approach)
// before implementing SRP Batcher and GPU Instancing.
const SUGGESTIONS: Record<string, string> = {
  drawCalls:
    'Enable SRP Batcher (groups similar rendering operations to reduce per-object GPU setup overhead). ' +
    'Use GPU Instancing (renders multiple copies of the same mesh in a single draw call) to merge duplicate objects. ' +
    'Mark static objects as Batching Static. Enable Occlusion Culling (skips rendering objects hidden behind others) to cull invisible objects. ' +
    'In Unity 6, enable GPU Resident Drawer (a rendering optimization that keeps mesh data on the GPU to significantly reduce CPU overhead) to significantly reduce draw calls. ' +
    'Use Frame Debugger to analyze batch-breaking causes.',
  gcAllocation:
    'Use UnityEngine.Pool for object pooling (a technique that reuses objects instead of repeatedly creating and destroying them, ' +
    'which reduces memory allocation). Replace Instantiate/Destroy calls with pooling methods. ' +
    'Cache GetComponent results in Awake/Start. Use StringBuilder instead of string concatenation. ' +
    'Avoid LINQ and Regular Expressions in Update. Cache WaitForSeconds objects. ' +
    'Use GameObject.CompareTag() instead of .tag string comparison. Consider enabling Incremental GC.',
  shaderComplexity:
    'Use URP Lit/Simple Lit instead of custom heavy shaders. Reduce node count in Shader Graph. ' +
    'Use half precision instead of float (especially on mobile). Implement Shader LOD levels. ' +
    'Combine multiple textures into channel-packed atlas to reduce sampling. ' +
    'Use Strip Shader Variants to reduce variant count.',
  frameRate:
    'Use frame time (ms) rather than FPS as performance baseline (60fps = 16.66ms, 30fps = 33.33ms). ' +
    'On mobile, reserve 35% frame budget for thermal throttling (30fps actual budget ~22ms). ' +
    'Enable Spatial-Temporal Post-Processing (STP) to lower render resolution while maintaining quality. ' +
    'Use Profile Analyzer to compare multi-frame data before/after optimization. ' +
    'Consider using C# Job System + Burst to move heavy computation to Worker Threads.',
  accessibility:
    'Consider motion sensitivity: limit camera movement speed and provide reduced-motion options. ' +
    'Add photosensitivity warnings for flashing effects (>3 flashes/second). ' +
    'Manage cognitive load: limit simultaneous UI elements and provide clear visual hierarchy. ' +
    'Reference WCAG 2.1 and Game Accessibility Guidelines for comprehensive standards.',
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
