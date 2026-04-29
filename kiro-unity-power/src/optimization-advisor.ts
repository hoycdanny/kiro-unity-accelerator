/**
 * OptimizationAdvisor — 根據效能分析結果產生具體最佳化建議。
 *
 * 針對 Hotspot（熱點）與 AntipatternMatch（反模式）產生結構化的
 * OptimizationPlan，並標註預估影響程度與實作難度。
 */

import {
  Hotspot,
  AntipatternMatch,
  AntipatternType,
  OptimizationPlan,
} from './types';

// ============================================================
// 各類別的最佳化方案模板
// ============================================================

interface PlanTemplate {
  title: string;
  description: string;
  steps: string[];
  estimatedImpact: 'high' | 'medium' | 'low';
  implementationDifficulty: 'high' | 'medium' | 'low';
}

const DRAW_CALL_PLANS: PlanTemplate[] = [
  {
    title: 'Enable Static Batching',
    description: 'Mark non-moving objects as static to allow Unity to batch their draw calls together.',
    steps: [
      'Identify all non-moving GameObjects in the scene',
      'Mark them as Static in the Inspector',
      'Verify reduced draw call count in the Profiler',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Enable Dynamic Batching',
    description: 'Enable dynamic batching in Player Settings for small meshes that share materials.',
    steps: [
      'Open Player Settings > Other Settings',
      'Enable Dynamic Batching',
      'Ensure meshes have fewer than 300 vertices for batching eligibility',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
  {
    title: 'Enable GPU Instancing',
    description: 'Use GPU Instancing for repeated objects with the same mesh and material.',
    steps: [
      'Select materials used by repeated objects',
      'Enable GPU Instancing checkbox on each material',
      'Verify instancing is active in Frame Debugger',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Implement LOD Groups',
    description: 'Add Level of Detail groups to reduce polygon count for distant objects.',
    steps: [
      'Create LOD meshes at reduced polygon counts',
      'Add LOD Group component to each object',
      'Configure LOD transition distances',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
  {
    title: 'Enable Occlusion Culling',
    description: 'Use Occlusion Culling to skip rendering objects hidden behind others.',
    steps: [
      'Mark static occluders and occludees',
      'Bake Occlusion Culling data via Window > Rendering > Occlusion Culling',
      'Test with the Occlusion Culling visualization',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
];

const GC_ALLOCATION_PLANS: PlanTemplate[] = [
  {
    title: 'Implement Object Pool',
    description: 'Use an Object Pool to reuse frequently instantiated objects instead of allocating new ones each frame.',
    steps: [
      'Create a generic ObjectPool<T> class',
      'Pre-allocate objects during initialization',
      'Replace Instantiate/Destroy calls with pool Get/Return',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
  {
    title: 'Cache GetComponent Results',
    description: 'Cache GetComponent calls in Awake or Start instead of calling them every frame.',
    steps: [
      'Declare private fields for cached components',
      'Call GetComponent in Awake() or Start()',
      'Replace per-frame GetComponent calls with cached references',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Use StringBuilder for String Operations',
    description: 'Replace string concatenation with StringBuilder to avoid GC allocations.',
    steps: [
      'Create a reusable StringBuilder instance',
      'Replace string + operations with StringBuilder.Append',
      'Call StringBuilder.ToString() only when the final string is needed',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
  {
    title: 'Avoid Per-Frame Memory Allocations',
    description: 'Pre-allocate arrays and collections, reuse them across frames to eliminate GC pressure.',
    steps: [
      'Identify allocations inside Update/FixedUpdate/LateUpdate',
      'Move allocations to class-level fields initialized in Awake/Start',
      'Use Array.Clear or List.Clear instead of creating new collections',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
];

const SHADER_PLANS: PlanTemplate[] = [
  {
    title: 'Simplify Shader Computations',
    description: 'Reduce complex math operations in shaders to lower GPU workload.',
    steps: [
      'Profile shader with GPU Profiler to identify expensive operations',
      'Replace complex math with approximations where visual quality allows',
      'Move calculations from fragment to vertex shader when possible',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'high',
  },
  {
    title: 'Reduce Texture Sampling',
    description: 'Minimize the number of texture samples per pixel to reduce GPU bandwidth.',
    steps: [
      'Combine multiple textures into channel-packed atlases',
      'Remove unnecessary texture lookups',
      'Use lower-resolution textures for distant objects',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'medium',
  },
  {
    title: 'Use Shader LOD',
    description: 'Implement Shader LOD to use simpler shaders for distant objects.',
    steps: [
      'Define multiple SubShaders with decreasing LOD values',
      'Set Shader.maximumLOD based on target platform',
      'Test visual quality at each LOD level',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'medium',
  },
  {
    title: 'Switch to URP/Mobile Shader',
    description: 'Replace heavy shaders with optimized URP or mobile-friendly alternatives.',
    steps: [
      'Identify objects using Standard or custom heavy shaders',
      'Replace with URP Lit or URP Simple Lit shaders',
      'Adjust material properties to match original appearance',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
];

const CPU_PLANS: PlanTemplate[] = [
  {
    title: 'Offload to Coroutine or Job System',
    description: 'Move expensive computations out of the main thread using Coroutines or the C# Job System.',
    steps: [
      'Identify CPU-heavy logic in Update methods',
      'For simple cases, convert to a Coroutine with yield returns',
      'For heavy computation, use Unity Job System with Burst compiler',
      'Use NativeContainer types (NativeArray, NativeList) for job data',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'high',
  },
  {
    title: 'Reduce Collider Complexity',
    description: 'Simplify physics colliders to reduce CPU time spent on collision detection.',
    steps: [
      'Replace MeshColliders with primitive colliders where possible',
      'Enable Convex on MeshColliders that must remain',
      'Reduce polygon count of collision meshes',
      'Use Layer Collision Matrix to disable unnecessary collision pairs',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
  {
    title: 'Lower FixedUpdate Frequency',
    description: 'Increase the fixed timestep to reduce the number of physics updates per second.',
    steps: [
      'Open Project Settings > Time',
      'Increase Fixed Timestep (e.g., from 0.02 to 0.04)',
      'Test physics behavior to ensure acceptable quality',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
  {
    title: 'Enable GPU Resident Drawer (Unity 6)',
    description: 'Use GPU Resident Drawer to drastically reduce draw calls by keeping mesh data on the GPU. Requires Forward+ renderer in URP.',
    steps: [
      'Open URP Asset settings',
      'Enable GPU Resident Drawer under Instanced Drawing',
      'Enable GPU Occlusion Culling for additional savings',
      'Verify with Frame Debugger that batching improved',
      'Note: Requires Forward+ rendering path',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Enable Spatial-Temporal Post-Processing (STP)',
    description: 'Reduce rendering resolution while maintaining visual quality using STP upscaling. Ideal for mobile and XR platforms.',
    steps: [
      'Open URP Asset > Quality settings',
      'Enable STP (Spatial-Temporal Post-Processing)',
      'Configure render scale (e.g., 0.5-0.75 for mobile)',
      'Test visual quality on target devices',
      'Compare frame time before and after with Profiler',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Enable Split Graphics Jobs',
    description: 'Distribute rendering command submission across multiple CPU cores for better parallelism.',
    steps: [
      'Open Player Settings > Other Settings',
      'Enable Split Graphics Jobs',
      'Profile to verify render thread is no longer the bottleneck',
      'Note: Most effective on multi-core CPUs',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
  {
    title: 'Use Assembly Definitions for Faster Compilation',
    description: 'Split scripts into Assembly Definitions to enable incremental compilation and reduce iteration time.',
    steps: [
      'Create .asmdef files for each logical module (Core, Gameplay, UI, Utils)',
      'Define explicit references between assemblies',
      'Move Editor-only scripts to Editor assembly definitions',
      'Verify compilation time improvement in Console',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'medium',
  },
];

// ============================================================
// XR/VR 專用最佳化方案（來自 VR/MR 電子書）
// ============================================================

const XR_PLANS: PlanTemplate[] = [
  {
    title: 'Enable Single Pass Instanced Rendering',
    description: 'Render both eyes in a single pass using GPU instancing to halve draw call overhead in VR.',
    steps: [
      'Open XR Plugin Management settings',
      'Set Stereo Rendering Mode to Single Pass Instanced',
      'Verify shaders support instancing (check for UNITY_STEREO_INSTANCING_ENABLED)',
      'Test on target HMD device',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Enable Foveated Rendering',
    description: 'Reduce rendering resolution in peripheral vision areas where the user is not looking. Significantly reduces GPU workload.',
    steps: [
      'Check target HMD supports foveated rendering (Quest Pro, PSVR2, etc.)',
      'Enable Fixed Foveated Rendering in XR settings',
      'If eye tracking available, enable Dynamic Foveated Rendering',
      'Set foveation level (Low/Medium/High) based on visual quality needs',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'low',
  },
  {
    title: 'Maintain 72-90 FPS for VR Comfort',
    description: 'VR requires consistent high frame rates to prevent motion sickness. Frame budget is ~11ms at 90fps.',
    steps: [
      'Profile with VR Profiler to identify frame drops',
      'Target 11ms frame budget (90fps) or 13.8ms (72fps)',
      'Reduce draw calls below 150 for mobile VR (Quest)',
      'Use LOD Groups aggressively for distant objects',
      'Implement tunneling vignette for locomotion to reduce motion sickness',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
];

// ============================================================
// 2D 專用最佳化方案（來自 2D Art 電子書）
// ============================================================

const TWO_D_PLANS: PlanTemplate[] = [
  {
    title: 'Optimize 2D Light Batching',
    description: 'Reduce 2D light rendering overhead by optimizing sorting layers and blend styles.',
    steps: [
      'Use 2D Light Batching Debugger to visualize batch breaks',
      'Minimize the number of Sorting Layers and blend styles onscreen',
      'Keep lights batchable by using same lighting setup across contiguous layers',
      'Reduce shadow casting lights — switching to draw shadows has non-trivial cost',
      'Set normal lighting Quality to Fast instead of Accurate on mobile',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
  {
    title: 'Use Sprite Atlas for 2D Performance',
    description: 'Pack sprites into atlases to reduce draw calls and improve batching.',
    steps: [
      'Create Sprite Atlas assets for sprites that appear together in scenes',
      'Use Sprite Atlas Analyzer (Unity 6.3) to check for issues',
      'Avoid rotation of sprites when packed for tilemaps',
      'Enable alpha dilation to maintain sharp tile edges',
      'Use Tight mesh type in Sprite Editor to reduce overdraw',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'low',
  },
];

// ============================================================
// 多人遊戲最佳化方案（來自 Multiplayer 電子書）
// ============================================================

const MULTIPLAYER_PLANS: PlanTemplate[] = [
  {
    title: 'Optimize Network Synchronization',
    description: 'Reduce network bandwidth by synchronizing only essential data and using appropriate sync methods.',
    steps: [
      'Use NetworkVariable for continuously synced data (health, position)',
      'Use RPC for discrete events (shooting, ability use)',
      'Implement Data Culling to exclude non-essential updates',
      'Use Delta Compression to send only changes since last update',
      'Apply Interest Management to prioritize by distance/visibility',
      'Uncheck unnecessary axes in NetworkTransform to save bandwidth',
    ],
    estimatedImpact: 'high',
    implementationDifficulty: 'medium',
  },
];

// ============================================================
// 反模式類型到熱點類別的映射
// ============================================================

const ANTIPATTERN_CATEGORY_MAP: Record<AntipatternType, 'cpu' | 'gpu' | 'memory'> = {
  GetComponentInUpdate: 'memory',
  StringConcatInUpdate: 'memory',
  LinqInUpdate: 'memory',
  NewAllocationInUpdate: 'memory',
  FindInUpdate: 'cpu',
  NoStaticBatching: 'gpu',
  NoGpuInstancing: 'gpu',
  TooManyMaterials: 'gpu',
  FrequentArrayAllocation: 'memory',
  ForeachNonGeneric: 'memory',
  ClosureAllocation: 'memory',
};

// ============================================================
// 公開 API
// ============================================================

/**
 * 針對熱點清單產生最佳化方案。
 * 每個熱點至少產生一個方案；Draw Call 相關熱點使用 GPU 類別方案，
 * GC/記憶體相關使用 GC 類別方案，CPU 相關使用 CPU 類別方案。
 */
export function generateOptimizations(hotspots: Hotspot[]): OptimizationPlan[] {
  const plans: OptimizationPlan[] = [];

  for (const hotspot of hotspots) {
    const templates = getTemplatesForCategory(hotspot.category, hotspot.description);
    if (templates.length === 0) {
      // 未知類別 — 產生通用建議
      plans.push(createGenericPlan(hotspot.category, hotspot.description));
    } else {
      for (const tpl of templates) {
        plans.push(templateToPlan(tpl, hotspot.category));
      }
    }
  }

  return plans;
}

/**
 * 針對反模式清單產生最佳化方案。
 * 將反模式映射到對應的熱點類別，再產生方案。
 */
export function generateAntipatternFixes(antipatterns: AntipatternMatch[]): OptimizationPlan[] {
  const plans: OptimizationPlan[] = [];

  for (const ap of antipatterns) {
    const category = ANTIPATTERN_CATEGORY_MAP[ap.antipatternType];
    const templates = getTemplatesForAntipattern(ap.antipatternType);
    if (templates.length === 0) {
      plans.push(createGenericPlan(category, ap.description));
    } else {
      for (const tpl of templates) {
        plans.push(templateToPlan(tpl, ap.antipatternType));
      }
    }
  }

  return plans;
}

/**
 * 為最佳化方案標註預估影響程度與實作難度。
 * 若方案已有有效值則直接回傳，否則根據 targetType 推斷。
 */
export function assessOptimization(plan: OptimizationPlan): OptimizationPlan {
  const validLevels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

  const impact = validLevels.includes(plan.estimatedImpact)
    ? plan.estimatedImpact
    : 'medium';
  const difficulty = validLevels.includes(plan.implementationDifficulty)
    ? plan.implementationDifficulty
    : 'medium';

  return {
    ...plan,
    estimatedImpact: impact,
    implementationDifficulty: difficulty,
  };
}

// ============================================================
// 內部輔助函式
// ============================================================

function getTemplatesForCategory(
  category: 'cpu' | 'gpu' | 'memory',
  description: string,
): PlanTemplate[] {
  const descLower = description.toLowerCase();

  switch (category) {
    case 'gpu': {
      // 檢查是否為 shader 相關
      if (descLower.includes('shader')) {
        return SHADER_PLANS;
      }
      // 預設為 draw call 相關
      return DRAW_CALL_PLANS;
    }
    case 'memory':
      return GC_ALLOCATION_PLANS;
    case 'cpu':
      return CPU_PLANS;
    default:
      return [];
  }
}

function getTemplatesForAntipattern(type: AntipatternType): PlanTemplate[] {
  switch (type) {
    case 'GetComponentInUpdate':
      return [GC_ALLOCATION_PLANS[1]]; // Cache GetComponent
    case 'StringConcatInUpdate':
      return [GC_ALLOCATION_PLANS[2]]; // StringBuilder
    case 'LinqInUpdate':
    case 'NewAllocationInUpdate':
    case 'FrequentArrayAllocation':
      return [GC_ALLOCATION_PLANS[3]]; // Avoid per-frame allocations
    case 'FindInUpdate':
      return [GC_ALLOCATION_PLANS[1], CPU_PLANS[0]]; // Cache + Coroutine
    case 'NoStaticBatching':
      return [DRAW_CALL_PLANS[0]]; // Static Batching
    case 'NoGpuInstancing':
      return [DRAW_CALL_PLANS[2]]; // GPU Instancing
    case 'TooManyMaterials':
      return [DRAW_CALL_PLANS[0], DRAW_CALL_PLANS[2]]; // Batching + Instancing
    case 'ForeachNonGeneric':
    case 'ClosureAllocation':
      return [GC_ALLOCATION_PLANS[3]]; // Avoid per-frame allocations
    default:
      return [];
  }
}

function templateToPlan(tpl: PlanTemplate, targetType: string): OptimizationPlan {
  return {
    title: tpl.title,
    description: tpl.description,
    targetType,
    steps: [...tpl.steps],
    estimatedImpact: tpl.estimatedImpact,
    implementationDifficulty: tpl.implementationDifficulty,
  };
}

function createGenericPlan(targetType: string, description: string): OptimizationPlan {
  return {
    title: 'Review and Optimize',
    description: `Review the identified issue and apply targeted optimization: ${description}`,
    targetType,
    steps: [
      'Profile the specific area using Unity Profiler',
      'Identify the root cause of the performance issue',
      'Apply the most appropriate optimization technique',
      'Re-profile to verify improvement',
    ],
    estimatedImpact: 'medium',
    implementationDifficulty: 'medium',
  };
}
