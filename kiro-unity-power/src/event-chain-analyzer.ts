import {
  ScriptFile,
  EventEntryPoint,
  EventChainOptions,
  EventChainResult,
  EventChain,
  EventNode,
  EventNodeType,
  EventSubscriptionPattern,
  StateMutationType,
} from './types';
import { detectCycles, DirectedGraph } from './cycle-detection';

// ============================================================
// Event subscription detection patterns (Requirement 2.2)
// ============================================================

interface SubscriptionMatch {
  pattern: EventSubscriptionPattern;
  handlerName: string;
  lineNumber: number;
}

/**
 * Detect AddListener calls: e.g. `button.onClick.AddListener(OnClick)`
 */
function detectAddListenerSubscriptions(content: string): SubscriptionMatch[] {
  const matches: SubscriptionMatch[] = [];
  const lines = content.split('\n');
  const regex = /\.AddListener\s*\(\s*(\w+)\s*\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(line)) !== null) {
      matches.push({
        pattern: 'AddListener',
        handlerName: m[1],
        lineNumber: i + 1,
      });
    }
  }
  return matches;
}

/**
 * Detect C# event += subscriptions: e.g. `someEvent += OnSomething;`
 */
function detectCSharpEventSubscriptions(content: string): SubscriptionMatch[] {
  const matches: SubscriptionMatch[] = [];
  const lines = content.split('\n');
  const regex = /\w+\s*\+=\s*(\w+)\s*;/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
    // Skip string concatenation (+=) that isn't event subscription
    if (/"\s*$/.test(line) || /\+\=\s*"/.test(line) || /\+\=\s*\d/.test(line)) continue;

    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      // Filter out obvious non-event patterns (numeric assignments, string concat)
      const fullMatch = m[0];
      if (/\+=\s*\d/.test(fullMatch) || /\+=\s*"/.test(fullMatch)) continue;
      matches.push({
        pattern: 'CSharpEventSubscription',
        handlerName: m[1],
        lineNumber: i + 1,
      });
    }
  }
  return matches;
}

/**
 * Detect [SerializeField] UnityEvent fields: e.g. `[SerializeField] UnityEvent onClicked;`
 */
function detectSerializedUnityEvents(content: string): SubscriptionMatch[] {
  const matches: SubscriptionMatch[] = [];
  const lines = content.split('\n');
  const regex = /\[SerializeField\]\s*(?:private|protected)?\s*UnityEvent(?:<[^>]*>)?\s+(\w+)\s*;/g;

  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      matches.push({
        pattern: 'SerializedUnityEvent',
        handlerName: m[1],
        lineNumber: i + 1,
      });
    }
  }
  return matches;
}

/**
 * Detect SendMessage calls: e.g. `SendMessage("OnDamage")`
 */
function detectSendMessageCalls(content: string): SubscriptionMatch[] {
  const matches: SubscriptionMatch[] = [];
  const lines = content.split('\n');
  const regex = /\bSendMessage\s*\(\s*"(\w+)"/g;

  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      matches.push({
        pattern: 'SendMessage',
        handlerName: m[1],
        lineNumber: i + 1,
      });
    }
  }
  return matches;
}

/**
 * Detect BroadcastMessage calls: e.g. `BroadcastMessage("OnDamage")`
 */
function detectBroadcastMessageCalls(content: string): SubscriptionMatch[] {
  const matches: SubscriptionMatch[] = [];
  const lines = content.split('\n');
  const regex = /\bBroadcastMessage\s*\(\s*"(\w+)"/g;

  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      matches.push({
        pattern: 'BroadcastMessage',
        handlerName: m[1],
        lineNumber: i + 1,
      });
    }
  }
  return matches;
}

// ============================================================
// State mutation detection patterns (Requirement 2.4)
// ============================================================

interface StateMutationMatch {
  type: StateMutationType;
  lineNumber: number;
  functionName: string;
}

/**
 * Detect static field writes: e.g. `GameManager.score = 10;` or `ClassName.field = value;`
 */
function detectStaticFieldWrites(content: string): StateMutationMatch[] {
  const matches: StateMutationMatch[] = [];
  const lines = content.split('\n');
  // Pattern: ClassName.fieldName = value (where ClassName starts with uppercase)
  const regex = /\b([A-Z]\w+)\.(\w+)\s*=\s*[^=]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      const className = m[1];
      // Skip known non-static patterns
      if (className === 'Instance' || className === 'PlayerPrefs') continue;
      // Skip method calls (e.g., Transform.position = ...)
      if (['Transform', 'Vector3', 'Vector2', 'Quaternion', 'Color', 'Mathf'].includes(className)) continue;

      matches.push({
        type: 'StaticFieldWrite',
        lineNumber: i + 1,
        functionName: `${className}.${m[2]}`,
      });
    }
  }
  return matches;
}

/**
 * Detect ScriptableObject modifications: patterns like `someSO.value = x` where
 * the variable is typed as ScriptableObject or common SO patterns.
 */
function detectScriptableObjectModifications(content: string): StateMutationMatch[] {
  const matches: StateMutationMatch[] = [];
  const lines = content.split('\n');
  // Detect ScriptableObject field assignments or method calls
  const regex = /\b(\w+(?:Data|Config|Settings|SO|Asset))\s*\.\s*(\w+)\s*=\s*[^=]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      matches.push({
        type: 'ScriptableObjectModify',
        lineNumber: i + 1,
        functionName: `${m[1]}.${m[2]}`,
      });
    }
  }
  return matches;
}

/**
 * Detect PlayerPrefs writes: e.g. `PlayerPrefs.SetInt("key", value)`
 */
function detectPlayerPrefsWrites(content: string): StateMutationMatch[] {
  const matches: StateMutationMatch[] = [];
  const lines = content.split('\n');
  const regex = /\bPlayerPrefs\s*\.\s*(Set\w+)\s*\(/g;

  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      matches.push({
        type: 'PlayerPrefsWrite',
        lineNumber: i + 1,
        functionName: `PlayerPrefs.${m[1]}`,
      });
    }
  }
  return matches;
}

/**
 * Detect Singleton state modifications: e.g. `Instance.health = 100;` or `GameManager.Instance.score = 10;`
 */
function detectSingletonStateModifications(content: string): StateMutationMatch[] {
  const matches: StateMutationMatch[] = [];
  const lines = content.split('\n');
  // Pattern: Instance.field = value or ClassName.Instance.field = value
  const regex = /\bInstance\s*\.\s*(\w+)\s*=\s*[^=]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    regex.lastIndex = 0;
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      matches.push({
        type: 'SingletonStateModify',
        lineNumber: i + 1,
        functionName: `Instance.${m[1]}`,
      });
    }
  }
  return matches;
}

// ============================================================
// Function resolution helpers
// ============================================================

/**
 * Find the line number of a function/method definition in a script.
 * Returns -1 if not found.
 */
function findFunctionLineNumber(content: string, functionName: string): number {
  const lines = content.split('\n');
  // Match method declarations like: void FunctionName( or public void FunctionName(
  const regex = new RegExp(
    `(?:void|private|protected|public|internal|static|\\s)+\\s+${escapeRegex(functionName)}\\s*\\(`,
  );

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      return i + 1;
    }
  }
  return -1;
}

/**
 * Find all method calls within a function body.
 */
function findMethodCallsInFunction(content: string, functionName: string): string[] {
  const lines = content.split('\n');
  const calls: string[] = [];

  // Find the function start
  const funcRegex = new RegExp(
    `(?:void|private|protected|public|internal|static|\\s)+\\s+${escapeRegex(functionName)}\\s*\\(`,
  );

  let inFunction = false;
  let braceDepth = 0;
  let funcBraceDepth = -1;

  for (const line of lines) {
    if (!inFunction && funcRegex.test(line)) {
      inFunction = false; // Wait for opening brace
      funcBraceDepth = -1;
      // Check if opening brace is on same line
      for (const ch of line) {
        if (ch === '{') {
          braceDepth++;
          if (funcBraceDepth === -1) {
            funcBraceDepth = braceDepth;
            inFunction = true;
          }
        } else if (ch === '}') {
          if (inFunction && braceDepth === funcBraceDepth) {
            inFunction = false;
            break;
          }
          braceDepth = Math.max(0, braceDepth - 1);
        }
      }
      continue;
    }

    if (!inFunction && funcBraceDepth === -1 && funcRegex.test(lines[lines.indexOf(line) - 1] ?? '')) {
      // Handle opening brace on next line
    }

    if (inFunction) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

      // Extract method calls: identifier( or identifier.method(
      const callRegex = /\b(\w+)\s*\(/g;
      let m: RegExpMatchArray | null;
      while ((m = callRegex.exec(line)) !== null) {
        const name = m[1];
        // Skip language keywords and common non-method tokens
        if (['if', 'for', 'while', 'switch', 'catch', 'new', 'return', 'typeof', 'sizeof', 'nameof'].includes(name)) continue;
        calls.push(name);
      }
    }

    // Track braces
    for (const ch of line) {
      if (ch === '{') {
        braceDepth++;
        if (funcBraceDepth === -1 && !inFunction) {
          // Check if we were waiting for the opening brace of the function
        }
      } else if (ch === '}') {
        if (inFunction && braceDepth === funcBraceDepth) {
          inFunction = false;
          funcBraceDepth = -1;
        }
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }
  }

  return [...new Set(calls)];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Script index for fast lookups
// ============================================================

interface ScriptIndex {
  /** Map from function name to scripts that define it */
  functionToScripts: Map<string, { scriptPath: string; lineNumber: number }[]>;
  /** Map from script path to content */
  scriptContents: Map<string, string>;
}

function buildScriptIndex(scripts: ScriptFile[]): ScriptIndex {
  const functionToScripts = new Map<string, { scriptPath: string; lineNumber: number }[]>();
  const scriptContents = new Map<string, string>();

  for (const script of scripts) {
    if (script.content == null) continue;
    scriptContents.set(script.filePath, script.content);

    const lines = script.content.split('\n');
    // Find all method declarations
    const methodRegex = /(?:void|private|protected|public|internal|static|\s)+\s+(\w+)\s*\(/g;

    for (let i = 0; i < lines.length; i++) {
      methodRegex.lastIndex = 0;
      let m: RegExpMatchArray | null;
      while ((m = methodRegex.exec(lines[i])) !== null) {
        const funcName = m[1];
        // Skip common C# keywords that look like methods
        if (['if', 'for', 'while', 'switch', 'catch', 'class', 'struct', 'interface', 'enum', 'namespace'].includes(funcName)) continue;

        let entries = functionToScripts.get(funcName);
        if (!entries) {
          entries = [];
          functionToScripts.set(funcName, entries);
        }
        entries.push({ scriptPath: script.filePath, lineNumber: i + 1 });
      }
    }
  }

  return { functionToScripts, scriptContents };
}

// ============================================================
// Chain traversal
// ============================================================

interface TraversalContext {
  index: ScriptIndex;
  maxDepth: number;
  visited: Set<string>; // "scriptPath::functionName" to detect cycles during traversal
  adjacency: Map<string, Set<string>>; // For cycle detection graph
}

/**
 * Recursively trace the event chain from a given function.
 */
function traceChain(
  functionName: string,
  scriptPath: string,
  depth: number,
  ctx: TraversalContext,
  nodes: EventNode[],
): void {
  if (depth > ctx.maxDepth) return;

  const visitKey = `${scriptPath}::${functionName}`;
  if (ctx.visited.has(visitKey)) return;
  ctx.visited.add(visitKey);

  const content = ctx.index.scriptContents.get(scriptPath);
  if (!content) return;

  const lineNumber = findFunctionLineNumber(content, functionName);
  if (lineNumber === -1) return;

  // Determine node type
  const nodeType = determineNodeType(content, functionName);

  const node: EventNode = {
    functionName,
    scriptPath,
    lineNumber,
    nodeType: nodeType.type,
  };

  if (nodeType.stateMutationType) {
    node.stateMutationType = nodeType.stateMutationType;
  }

  nodes.push(node);

  // If this is a state mutation endpoint, don't recurse further from here
  if (nodeType.type === 'StateMutation') return;

  // Find calls within this function and recurse
  const calls = findMethodCallsInFunction(content, functionName);

  for (const calledFunc of calls) {
    // Check all scripts for this function
    const targets = ctx.index.functionToScripts.get(calledFunc);
    if (!targets) continue;

    for (const target of targets) {
      // Build adjacency for cycle detection
      const fromKey = `${scriptPath}::${functionName}`;
      const toKey = `${target.scriptPath}::${calledFunc}`;

      if (!ctx.adjacency.has(fromKey)) {
        ctx.adjacency.set(fromKey, new Set());
      }
      ctx.adjacency.get(fromKey)!.add(toKey);

      traceChain(calledFunc, target.scriptPath, depth + 1, ctx, nodes);
    }
  }

  // Also check for event subscriptions within this function that lead to other handlers
  const subscriptions = getAllSubscriptions(content);
  for (const sub of subscriptions) {
    const targets = ctx.index.functionToScripts.get(sub.handlerName);
    if (!targets) continue;

    for (const target of targets) {
      const fromKey = `${scriptPath}::${functionName}`;
      const toKey = `${target.scriptPath}::${sub.handlerName}`;

      if (!ctx.adjacency.has(fromKey)) {
        ctx.adjacency.set(fromKey, new Set());
      }
      ctx.adjacency.get(fromKey)!.add(toKey);

      // Add the handler node with subscription pattern info
      const handlerVisitKey = `${target.scriptPath}::${sub.handlerName}`;
      if (!ctx.visited.has(handlerVisitKey)) {
        const handlerContent = ctx.index.scriptContents.get(target.scriptPath);
        if (handlerContent) {
          const handlerLine = findFunctionLineNumber(handlerContent, sub.handlerName);
          if (handlerLine !== -1) {
            const handlerNodeType = determineNodeType(handlerContent, sub.handlerName);
            const handlerNode: EventNode = {
              functionName: sub.handlerName,
              scriptPath: target.scriptPath,
              lineNumber: handlerLine,
              nodeType: handlerNodeType.type,
              subscriptionPattern: sub.pattern,
            };
            if (handlerNodeType.stateMutationType) {
              handlerNode.stateMutationType = handlerNodeType.stateMutationType;
            }
            ctx.visited.add(handlerVisitKey);
            nodes.push(handlerNode);

            if (handlerNodeType.type !== 'StateMutation') {
              traceChain(sub.handlerName, target.scriptPath, depth + 1, ctx, nodes);
            }
          }
        }
      }
    }
  }
}

/**
 * Determine the node type for a function based on its content.
 */
function determineNodeType(
  scriptContent: string,
  functionName: string,
): { type: EventNodeType; stateMutationType?: StateMutationType } {
  // Extract function body to check for state mutations
  const bodyContent = extractFunctionBody(scriptContent, functionName);
  if (!bodyContent) {
    return { type: 'EventHandler' };
  }

  // Check for state mutations in the function body
  const staticWrites = detectStaticFieldWrites(bodyContent);
  if (staticWrites.length > 0) {
    return { type: 'StateMutation', stateMutationType: 'StaticFieldWrite' };
  }

  const soModifications = detectScriptableObjectModifications(bodyContent);
  if (soModifications.length > 0) {
    return { type: 'StateMutation', stateMutationType: 'ScriptableObjectModify' };
  }

  const playerPrefsWrites = detectPlayerPrefsWrites(bodyContent);
  if (playerPrefsWrites.length > 0) {
    return { type: 'StateMutation', stateMutationType: 'PlayerPrefsWrite' };
  }

  const singletonMods = detectSingletonStateModifications(bodyContent);
  if (singletonMods.length > 0) {
    return { type: 'StateMutation', stateMutationType: 'SingletonStateModify' };
  }

  return { type: 'EventHandler' };
}

/**
 * Extract the body of a function as a string.
 */
function extractFunctionBody(content: string, functionName: string): string | null {
  const lines = content.split('\n');
  const funcRegex = new RegExp(
    `(?:void|private|protected|public|internal|static|\\s)+\\s+${escapeRegex(functionName)}\\s*\\(`,
  );

  let foundFunc = false;
  let braceDepth = 0;
  let funcBraceDepth = -1;
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (!foundFunc && funcRegex.test(line)) {
      foundFunc = true;
      funcBraceDepth = -1;
    }

    if (foundFunc) {
      for (const ch of line) {
        if (ch === '{') {
          braceDepth++;
          if (funcBraceDepth === -1) {
            funcBraceDepth = braceDepth;
          }
        } else if (ch === '}') {
          if (funcBraceDepth !== -1 && braceDepth === funcBraceDepth) {
            return bodyLines.join('\n');
          }
          braceDepth = Math.max(0, braceDepth - 1);
        }
      }
      if (funcBraceDepth !== -1) {
        bodyLines.push(line);
      }
    }
  }

  return bodyLines.length > 0 ? bodyLines.join('\n') : null;
}

/**
 * Get all event subscriptions from a script.
 */
function getAllSubscriptions(content: string): SubscriptionMatch[] {
  return [
    ...detectAddListenerSubscriptions(content),
    ...detectCSharpEventSubscriptions(content),
    ...detectSerializedUnityEvents(content),
    ...detectSendMessageCalls(content),
    ...detectBroadcastMessageCalls(content),
  ];
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyze event chains starting from a specified UI event entry point.
 *
 * Traces the complete call chain from the entry point through event
 * subscriptions and method calls, detecting:
 * - Event subscription patterns (AddListener, +=, SerializedUnityEvent, SendMessage, BroadcastMessage)
 * - State mutations at chain endpoints (static field writes, ScriptableObject, PlayerPrefs, Singleton)
 * - Deep chains (depth > 5)
 * - Cycles (using detectCycles from cycle-detection.ts)
 *
 * Returns a valid empty result for empty input.
 *
 * @param scripts - Array of C# script files to analyze
 * @param entryPoint - The UI event entry point to trace from
 * @param options - Optional configuration (maxDepth defaults to 10)
 * @returns EventChainResult with chains, deep chain count, and cycle count
 */
export function analyzeEventChain(
  scripts: ScriptFile[],
  entryPoint: EventEntryPoint,
  options?: EventChainOptions,
): EventChainResult {
  // Empty input → valid empty result
  if (scripts.length === 0) {
    return { chains: [], deepChainCount: 0, cycleCount: 0 };
  }

  const maxDepth = options?.maxDepth ?? 10;
  const index = buildScriptIndex(scripts);

  // Find the entry point script
  const entryContent = index.scriptContents.get(entryPoint.scriptPath);
  if (!entryContent) {
    return { chains: [], deepChainCount: 0, cycleCount: 0 };
  }

  // Find all event subscriptions in the entry script that match the event
  const subscriptions = getAllSubscriptions(entryContent);

  // Also look across all scripts for subscriptions to the entry point's event
  const allSubscriptions: { sub: SubscriptionMatch; scriptPath: string }[] = [];

  // Subscriptions in the entry script
  for (const sub of subscriptions) {
    allSubscriptions.push({ sub, scriptPath: entryPoint.scriptPath });
  }

  // Subscriptions in other scripts
  for (const script of scripts) {
    if (script.content == null || script.filePath === entryPoint.scriptPath) continue;
    const subs = getAllSubscriptions(script.content);
    for (const sub of subs) {
      allSubscriptions.push({ sub, scriptPath: script.filePath });
    }
  }

  const chains: EventChain[] = [];

  // For each subscription, trace the chain
  for (const { sub, scriptPath } of allSubscriptions) {
    const ctx: TraversalContext = {
      index,
      maxDepth,
      visited: new Set(),
      adjacency: new Map(),
    };

    const nodes: EventNode[] = [];

    // Add the entry trigger node
    const entryLineNumber = findEventLineNumber(entryContent, entryPoint.eventName);
    nodes.push({
      functionName: entryPoint.eventName,
      scriptPath: entryPoint.scriptPath,
      lineNumber: entryLineNumber > 0 ? entryLineNumber : 1,
      nodeType: 'EventTrigger',
    });

    // Find the handler function in the target scripts
    const handlerTargets = index.functionToScripts.get(sub.handlerName);
    if (!handlerTargets || handlerTargets.length === 0) continue;

    for (const target of handlerTargets) {
      const handlerContent = ctx.index.scriptContents.get(target.scriptPath);
      if (!handlerContent) continue;

      const handlerNodeType = determineNodeType(handlerContent, sub.handlerName);
      const handlerNode: EventNode = {
        functionName: sub.handlerName,
        scriptPath: target.scriptPath,
        lineNumber: target.lineNumber,
        nodeType: handlerNodeType.type,
        subscriptionPattern: sub.pattern,
      };
      if (handlerNodeType.stateMutationType) {
        handlerNode.stateMutationType = handlerNodeType.stateMutationType;
      }

      const chainNodes: EventNode[] = [...nodes, handlerNode];
      ctx.visited.add(`${target.scriptPath}::${sub.handlerName}`);

      // Build adjacency for the entry → handler edge
      const fromKey = `${entryPoint.scriptPath}::${entryPoint.eventName}`;
      const toKey = `${target.scriptPath}::${sub.handlerName}`;
      if (!ctx.adjacency.has(fromKey)) {
        ctx.adjacency.set(fromKey, new Set());
      }
      ctx.adjacency.get(fromKey)!.add(toKey);

      // Recurse into the handler if it's not a state mutation
      if (handlerNodeType.type !== 'StateMutation') {
        traceChain(sub.handlerName, target.scriptPath, 2, ctx, chainNodes);
      }

      const depth = chainNodes.length;

      // Build the directed graph for cycle detection
      const graph: DirectedGraph = new Map();
      for (const [from, toSet] of ctx.adjacency) {
        graph.set(from, Array.from(toSet));
      }

      const detectedCycles = detectCycles(graph);

      const chain: EventChain = {
        entryPoint,
        nodes: chainNodes,
        depth,
        isDeepChain: depth > 5,
        ...(detectedCycles.length > 0 ? { cyclePath: detectedCycles[0] } : {}),
      };

      chains.push(chain);
    }
  }

  // If no subscriptions found, create a minimal chain with just the entry point
  if (chains.length === 0) {
    const entryLineNumber = findEventLineNumber(entryContent, entryPoint.eventName);
    const chain: EventChain = {
      entryPoint,
      nodes: [
        {
          functionName: entryPoint.eventName,
          scriptPath: entryPoint.scriptPath,
          lineNumber: entryLineNumber > 0 ? entryLineNumber : 1,
          nodeType: 'EventTrigger',
        },
      ],
      depth: 1,
      isDeepChain: false,
    };
    chains.push(chain);
  }

  const deepChainCount = chains.filter((c) => c.isDeepChain).length;
  const cycleCount = chains.filter((c) => c.cyclePath && c.cyclePath.length > 0).length;

  return {
    chains,
    deepChainCount,
    cycleCount,
  };
}

/**
 * Find the line number where an event is declared or used in a script.
 */
function findEventLineNumber(content: string, eventName: string): number {
  const lines = content.split('\n');
  const escaped = escapeRegex(eventName);
  const regex = new RegExp(`\\b${escaped}\\b`);

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      return i + 1;
    }
  }
  return 1;
}
