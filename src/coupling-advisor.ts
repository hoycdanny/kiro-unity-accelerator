import {
  UIReferenceResult,
  EventChainResult,
  CouplingPair,
  RefactoringSuggestion,
  RefactoringSuggestionType,
} from './types';

// ============================================================
// Coupling score weight constants (Requirement 3.2)
// ============================================================

const DIRECT_REFERENCE_WEIGHT = 1.0;
const CHAIN_DEPTH_WEIGHT = 0.5;
const SHARED_STATE_MUTATION_WEIGHT = 2.0;
const BIDIRECTIONAL_BONUS = 10.0;

/** Default coupling score threshold for generating suggestions */
const DEFAULT_THRESHOLD = 5.0;

// ============================================================
// Internal helpers
// ============================================================

/**
 * Build a map of script-pair keys to accumulated coupling factors
 * from the UI reference result and event chain result.
 */
interface PairAccumulator {
  scriptA: string;
  scriptB: string;
  directReferenceCount: number;
  maxChainDepth: number;
  sharedStateMutationCount: number;
  /** Scripts that reference each other (A→B and B→A) */
  directionAtoB: boolean;
  directionBtoA: boolean;
}

/**
 * Create a canonical key for a script pair so (A,B) and (B,A) map to the same entry.
 */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}

function getOrCreatePair(
  map: Map<string, PairAccumulator>,
  scriptA: string,
  scriptB: string,
): PairAccumulator {
  const key = pairKey(scriptA, scriptB);
  let pair = map.get(key);
  if (!pair) {
    const [canonA, canonB] = scriptA < scriptB ? [scriptA, scriptB] : [scriptB, scriptA];
    pair = {
      scriptA: canonA,
      scriptB: canonB,
      directReferenceCount: 0,
      maxChainDepth: 0,
      sharedStateMutationCount: 0,
      directionAtoB: false,
      directionBtoA: false,
    };
    map.set(key, pair);
  }
  return pair;
}

/**
 * Compute the coupling score from the four factors.
 */
function computeScore(
  directReferenceCount: number,
  maxChainDepth: number,
  sharedStateMutationCount: number,
  isBidirectional: boolean,
): number {
  let score = 0;
  score += directReferenceCount * DIRECT_REFERENCE_WEIGHT;
  score += maxChainDepth * CHAIN_DEPTH_WEIGHT;
  score += sharedStateMutationCount * SHARED_STATE_MUTATION_WEIGHT;
  if (isBidirectional) {
    score += BIDIRECTIONAL_BONUS;
  }
  return score;
}

// ============================================================
// Public API
// ============================================================

/**
 * Calculate coupling scores for all pairs of scripts that interact
 * through UI references and event chains.
 *
 * Scoring formula (Requirement 3.2):
 * - Direct reference count × 1.0
 * - Max event chain depth × 0.5
 * - Shared state mutation count × 2.0
 * - Bidirectional dependency bonus: +10.0
 *
 * The function is deterministic: identical inputs produce identical scores.
 *
 * @param referenceResult - UI reference tracking result
 * @param chainResult - Event chain analysis result
 * @returns Array of CouplingPair sorted by couplingScore descending
 */
export function calculateCouplingScores(
  referenceResult: UIReferenceResult,
  chainResult: EventChainResult,
): CouplingPair[] {
  const pairMap = new Map<string, PairAccumulator>();

  // 1. Count direct references between scripts that share UI component references.
  //    Group references by component key, then for each pair of scripts referencing
  //    the same component, increment directReferenceCount.
  const componentToScripts = new Map<string, Set<string>>();
  for (const ref of referenceResult.references) {
    const compKey = `${ref.componentType}::${ref.fieldName}`;
    let scripts = componentToScripts.get(compKey);
    if (!scripts) {
      scripts = new Set();
      componentToScripts.set(compKey, scripts);
    }
    scripts.add(ref.filePath);
  }

  for (const scripts of componentToScripts.values()) {
    const scriptArr = Array.from(scripts);
    for (let i = 0; i < scriptArr.length; i++) {
      for (let j = i + 1; j < scriptArr.length; j++) {
        const pair = getOrCreatePair(pairMap, scriptArr[i], scriptArr[j]);
        pair.directReferenceCount++;
      }
    }
  }

  // 2. Analyze event chains for chain depth and state mutations between scripts.
  for (const chain of chainResult.chains) {
    if (chain.nodes.length < 2) continue;

    // Collect unique scripts in this chain
    const chainScripts = [...new Set(chain.nodes.map((n) => n.scriptPath))];

    // Count state mutations in this chain
    const stateMutationScripts = chain.nodes
      .filter((n) => n.nodeType === 'StateMutation')
      .map((n) => n.scriptPath);

    // For each pair of scripts in the chain, update depth and state mutation counts
    for (let i = 0; i < chainScripts.length; i++) {
      for (let j = i + 1; j < chainScripts.length; j++) {
        const pair = getOrCreatePair(pairMap, chainScripts[i], chainScripts[j]);
        pair.maxChainDepth = Math.max(pair.maxChainDepth, chain.depth);

        // Count shared state mutations: mutations that affect both scripts' interaction
        const mutationsInPair = stateMutationScripts.filter(
          (s) => s === chainScripts[i] || s === chainScripts[j],
        );
        pair.sharedStateMutationCount += mutationsInPair.length;
      }
    }

    // Track directionality: if script A appears before script B in the chain,
    // that's A→B direction
    for (let k = 0; k < chain.nodes.length - 1; k++) {
      const from = chain.nodes[k].scriptPath;
      const to = chain.nodes[k + 1].scriptPath;
      if (from === to) continue;

      const pair = getOrCreatePair(pairMap, from, to);
      if (from === pair.scriptA && to === pair.scriptB) {
        pair.directionAtoB = true;
      } else if (from === pair.scriptB && to === pair.scriptA) {
        pair.directionBtoA = true;
      }
    }
  }

  // 3. Also check bidirectionality from references: if script A references a component
  //    that script B also references, and vice versa through different components
  //    (already handled above through shared component references)

  // 4. Build final CouplingPair array
  const pairs: CouplingPair[] = [];
  for (const acc of pairMap.values()) {
    const isBidirectional = acc.directionAtoB && acc.directionBtoA;
    const score = computeScore(
      acc.directReferenceCount,
      acc.maxChainDepth,
      acc.sharedStateMutationCount,
      isBidirectional,
    );

    pairs.push({
      scriptA: acc.scriptA,
      scriptB: acc.scriptB,
      couplingScore: score,
      directReferenceCount: acc.directReferenceCount,
      maxChainDepth: acc.maxChainDepth,
      sharedStateMutationCount: acc.sharedStateMutationCount,
      isBidirectional,
    });
  }

  // Sort by couplingScore descending
  pairs.sort((a, b) => b.couplingScore - a.couplingScore);

  return pairs;
}


/**
 * Generate refactoring suggestions for coupling pairs that exceed the threshold.
 *
 * Suggestion types (Requirement 3.4):
 * - EventBus: Introduce an event bus to decouple direct references
 * - ScriptableObjectChannel: Use ScriptableObject event channels
 * - LayerSeparation: Separate UI logic from game logic into different layers
 * - InterfaceDecoupling: Use interfaces instead of concrete type references
 *
 * Bidirectional dependencies are flagged as severe coupling and prioritised
 * for refactoring (Requirement 3.5).
 *
 * Pairs with couplingScore at or below the threshold produce no suggestions.
 *
 * @param pairs - Coupling pairs to evaluate
 * @param threshold - Score threshold above which suggestions are generated (default 5.0)
 * @returns Array of RefactoringSuggestion
 */
export function generateRefactoringSuggestions(
  pairs: CouplingPair[],
  threshold: number = DEFAULT_THRESHOLD,
): RefactoringSuggestion[] {
  const suggestions: RefactoringSuggestion[] = [];

  for (const pair of pairs) {
    if (pair.couplingScore <= threshold) continue;

    const targets = [pair.scriptA, pair.scriptB];

    // Bidirectional → severe coupling, prioritise EventBus + InterfaceDecoupling
    if (pair.isBidirectional) {
      suggestions.push(buildSuggestion('EventBus', targets, pair, 'high'));
      suggestions.push(buildSuggestion('InterfaceDecoupling', targets, pair, 'high'));
      continue;
    }

    // High shared state mutations → ScriptableObjectChannel
    if (pair.sharedStateMutationCount > 0) {
      suggestions.push(buildSuggestion('ScriptableObjectChannel', targets, pair, 'medium'));
    }

    // Deep chain → LayerSeparation
    if (pair.maxChainDepth > 5) {
      suggestions.push(buildSuggestion('LayerSeparation', targets, pair, 'medium'));
    }

    // High direct references → EventBus
    if (pair.directReferenceCount > 1) {
      suggestions.push(buildSuggestion('EventBus', targets, pair, 'medium'));
    }

    // If none of the specific conditions matched but score is above threshold,
    // provide a generic InterfaceDecoupling suggestion
    const pairSuggestionCount = suggestions.filter(
      (s) => s.targetScripts.includes(pair.scriptA) && s.targetScripts.includes(pair.scriptB),
    ).length;
    if (pairSuggestionCount === 0) {
      suggestions.push(buildSuggestion('InterfaceDecoupling', targets, pair, 'low'));
    }
  }

  return suggestions;
}

// ============================================================
// Suggestion builders
// ============================================================

function buildSuggestion(
  type: RefactoringSuggestionType,
  targetScripts: string[],
  pair: CouplingPair,
  impact: 'high' | 'medium' | 'low',
): RefactoringSuggestion {
  const templates = SUGGESTION_TEMPLATES[type];
  return {
    type,
    title: templates.title,
    problemDescription: templates.problemDescription(pair),
    steps: templates.steps,
    estimatedImpact: impact,
    targetScripts,
  };
}

interface SuggestionTemplate {
  title: string;
  problemDescription: (pair: CouplingPair) => string;
  steps: string[];
}

const SUGGESTION_TEMPLATES: Record<RefactoringSuggestionType, SuggestionTemplate> = {
  EventBus: {
    title: 'Introduce Event Bus',
    problemDescription: (pair) =>
      `Scripts "${pair.scriptA}" and "${pair.scriptB}" have ${pair.directReferenceCount} direct reference(s) and a coupling score of ${pair.couplingScore}. An event bus can decouple these scripts by replacing direct references with event-based communication.`,
    steps: [
      'Create a static EventBus class with publish/subscribe methods.',
      'Replace direct method calls between the two scripts with event publications.',
      'Subscribe to relevant events in each script instead of holding direct references.',
      'Remove unused direct references and SerializeField attributes.',
    ],
  },
  ScriptableObjectChannel: {
    title: 'Use ScriptableObject Event Channel',
    problemDescription: (pair) =>
      `Scripts "${pair.scriptA}" and "${pair.scriptB}" share ${pair.sharedStateMutationCount} state mutation(s). A ScriptableObject event channel can mediate state changes without direct coupling.`,
    steps: [
      'Create a ScriptableObject asset to act as an event channel.',
      'Move shared state into the ScriptableObject or use it as a signal.',
      'Have the producing script raise events on the ScriptableObject.',
      'Have the consuming script listen to the ScriptableObject events.',
    ],
  },
  LayerSeparation: {
    title: 'Separate UI and Game Logic Layers',
    problemDescription: (pair) =>
      `The event chain between "${pair.scriptA}" and "${pair.scriptB}" reaches a depth of ${pair.maxChainDepth}. Separating UI presentation from game logic into distinct layers reduces chain depth and improves maintainability.`,
    steps: [
      'Identify which script handles UI presentation and which handles game logic.',
      'Create an intermediary service or manager layer between UI and game logic.',
      'Move UI-specific code into a dedicated UI controller.',
      'Move game logic into a dedicated game service.',
      'Connect the layers through well-defined interfaces or events.',
    ],
  },
  InterfaceDecoupling: {
    title: 'Use Interface to Decouple Concrete References',
    problemDescription: (pair) =>
      `Scripts "${pair.scriptA}" and "${pair.scriptB}" have a coupling score of ${pair.couplingScore}. Replacing concrete type references with interfaces reduces coupling and improves testability.`,
    steps: [
      'Define an interface that captures the required contract between the scripts.',
      'Have the referenced script implement the interface.',
      'Change the referencing script to depend on the interface instead of the concrete type.',
      'Use dependency injection or a service locator to provide the implementation.',
    ],
  },
};
