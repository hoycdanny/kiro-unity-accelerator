import {
  AntipatternType,
  AntipatternMatch,
  ScanContext,
  ScriptFile,
  CodeScanResult,
  FailedFile,
  SeverityLevel,
} from './types';

// ============================================================
// Update-method antipattern definitions
// ============================================================

interface AntipatternRule {
  type: AntipatternType;
  pattern: RegExp;
  severity: SeverityLevel;
  description: string;
  /** Only match inside Update/FixedUpdate/LateUpdate methods */
  updateOnly: boolean;
}

const ANTIPATTERN_RULES: AntipatternRule[] = [
  // --- Update-scoped antipatterns (Requirement 2.2) ---
  {
    type: 'GetComponentInUpdate',
    pattern: /GetComponent\s*[<(]/,
    severity: SeverityLevel.Error,
    description: 'GetComponent called in Update method — cache the result in Awake/Start instead.',
    updateOnly: true,
  },
  {
    type: 'StringConcatInUpdate',
    pattern: /(?:string\s+\w+\s*=.*\+|"\s*\+\s*\w|\w\s*\+\s*"|\+=\s*")/,
    severity: SeverityLevel.Warning,
    description: 'String concatenation in Update method causes GC allocation — use StringBuilder.',
    updateOnly: true,
  },
  {
    type: 'LinqInUpdate',
    pattern: /\.\s*(?:Where|Select|OrderBy|GroupBy|Any|All|First|Last|Count|Sum|Min|Max|Aggregate|Distinct|ToList|ToArray)\s*\(/,
    severity: SeverityLevel.Warning,
    description: 'LINQ query in Update method causes GC allocation — use manual loops.',
    updateOnly: true,
  },
  {
    type: 'NewAllocationInUpdate',
    pattern: /new\s+(?!(?:Vector[234]|Quaternion|Color|Mathf)\b)\w+\s*[\[(]/,
    severity: SeverityLevel.Warning,
    description: 'Object allocation (new) in Update method — use object pooling or pre-allocate.',
    updateOnly: true,
  },
  {
    type: 'FindInUpdate',
    pattern: /(?:Find|FindObjectOfType|FindObjectsOfType|FindWithTag|FindGameObjectWithTag|FindGameObjectsWithTag)\s*[<(]/,
    severity: SeverityLevel.Error,
    description: 'Find/FindObjectOfType in Update method is very expensive — cache references.',
    updateOnly: true,
  },
  // --- GC Allocation antipatterns (Requirement 2.4) ---
  {
    type: 'FrequentArrayAllocation',
    pattern: /new\s+(?:\w+\s*\[\s*\]|List\s*<|Dictionary\s*<|HashSet\s*<)/,
    severity: SeverityLevel.Warning,
    description: 'Frequent temporary array/collection allocation — pre-allocate and reuse.',
    updateOnly: true,
  },
  {
    type: 'ForeachNonGeneric',
    pattern: /foreach\s*\(\s*(?:object|var)\s+\w+\s+in\s+(?!.*<)/,
    severity: SeverityLevel.Suggestion,
    description: 'foreach over non-generic collection may cause boxing GC allocation.',
    updateOnly: false,
  },
  {
    type: 'ClosureAllocation',
    pattern: /=>\s*{?[^}]*\b(?:this\.\w+|\w+\.\w+)\b/,
    severity: SeverityLevel.Suggestion,
    description: 'Lambda/closure capturing external variables causes implicit GC allocation.',
    updateOnly: false,
  },
  // --- Empty Update methods (from Unity 6 optimization guide) ---
  {
    type: 'GetComponentInUpdate',
    pattern: /void\s+(Update|LateUpdate|FixedUpdate)\s*\(\s*\)\s*\{\s*\}/,
    severity: SeverityLevel.Warning,
    description: 'Empty Update/LateUpdate/FixedUpdate method still incurs interop overhead — remove it or wrap with #if UNITY_EDITOR.',
    updateOnly: false,
  },
  // --- Debug.Log in Update (from profiling guide) ---
  {
    type: 'GetComponentInUpdate',
    pattern: /Debug\.\s*(?:Log|LogWarning|LogError|DrawLine|DrawRay)\s*\(/,
    severity: SeverityLevel.Warning,
    description: 'Debug.Log/Draw statements in hot paths impact performance — use [Conditional("ENABLE_LOG")] wrapper or remove before build.',
    updateOnly: true,
  },
  // --- Camera.main in Update (from optimization guide) ---
  {
    type: 'FindInUpdate',
    pattern: /Camera\s*\.\s*main/,
    severity: SeverityLevel.Suggestion,
    description: 'Camera.main in Update — cache the reference in Start/Awake for better performance.',
    updateOnly: true,
  },
  // --- String comparison with tag (from optimization guide) ---
  {
    type: 'StringConcatInUpdate',
    pattern: /\.tag\s*==\s*"/,
    severity: SeverityLevel.Warning,
    description: 'Use GameObject.CompareTag() instead of string comparison with .tag to avoid GC allocation.',
    updateOnly: false,
  },
  // --- new WaitForSeconds in coroutine (from optimization guide) ---
  {
    type: 'NewAllocationInUpdate',
    pattern: /yield\s+return\s+new\s+WaitForSeconds/,
    severity: SeverityLevel.Suggestion,
    description: 'Cache WaitForSeconds object instead of creating new one each yield — reduces GC allocation.',
    updateOnly: false,
  },
  // --- AddComponent at runtime (from optimization guide) ---
  {
    type: 'NewAllocationInUpdate',
    pattern: /AddComponent\s*[<(]/,
    severity: SeverityLevel.Suggestion,
    description: 'AddComponent at runtime is expensive — prefer instantiating prefabs with pre-configured components.',
    updateOnly: false,
  },
  // --- Transform modified twice (from optimization guide) ---
  {
    type: 'GetComponentInUpdate',
    pattern: /transform\s*\.\s*position\s*=[\s\S]{0,80}transform\s*\.\s*rotation\s*=/,
    severity: SeverityLevel.Suggestion,
    description: 'Setting position and rotation separately — use Transform.SetPositionAndRotation() to update both at once.',
    updateOnly: false,
  },
  // --- LINQ in hot path (from profiling guide) ---
  {
    type: 'LinqInUpdate',
    pattern: /using\s+System\.Linq/,
    severity: SeverityLevel.Suggestion,
    description: 'System.Linq generates GC allocations from boxing — avoid in performance-critical code paths, use manual loops.',
    updateOnly: false,
  },
  // --- Draw Call antipatterns (Requirement 2.3) ---
  {
    type: 'NoStaticBatching',
    pattern: /StaticBatchingUtility/,
    severity: SeverityLevel.Suggestion,
    description: 'Consider using Static Batching for static objects to reduce draw calls.',
    updateOnly: false,
  },
  {
    type: 'NoGpuInstancing',
    pattern: /enableInstancing\s*=\s*false/,
    severity: SeverityLevel.Warning,
    description: 'GPU Instancing is disabled — enable it for repeated materials to reduce draw calls.',
    updateOnly: false,
  },
  {
    type: 'TooManyMaterials',
    pattern: /\.materials\s*=\s*new\s+Material\s*\[/,
    severity: SeverityLevel.Warning,
    description: 'Assigning multiple independent materials increases draw calls — share materials when possible.',
    updateOnly: false,
  },
];

// Method names that count as "per-frame" methods
const UPDATE_METHODS = ['Update', 'FixedUpdate', 'LateUpdate'];

// Regex to detect method declarations like: void Update() { or private void FixedUpdate()
const METHOD_DECLARATION_REGEX = /(?:void|private|protected|public|internal|static|\s)+\s+(Update|FixedUpdate|LateUpdate)\s*\(/;

/**
 * Check a single line of code against all antipattern rules.
 * Returns the first matching AntipatternMatch, or null if no match.
 */
export function matchAntipattern(
  line: string,
  lineNumber: number,
  context: ScanContext,
): AntipatternMatch | null {
  const trimmed = line.trim();

  // Skip comments and empty lines
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.length === 0) {
    return null;
  }

  for (const rule of ANTIPATTERN_RULES) {
    // If the rule is update-only, skip when not inside an update method
    if (rule.updateOnly && !context.inUpdateMethod) {
      continue;
    }

    if (rule.pattern.test(trimmed)) {
      return {
        filePath: '', // Caller fills this in
        lineNumber,
        antipatternType: rule.type,
        severity: rule.severity,
        codeSnippet: trimmed,
        description: rule.description,
      };
    }
  }

  return null;
}

/**
 * Scan a single C# script for performance antipatterns.
 *
 * Tracks brace depth to determine whether the current line is inside
 * an Update/FixedUpdate/LateUpdate method body.
 */
export function scanScript(filePath: string, content: string): AntipatternMatch[] {
  const lines = content.split('\n');
  const matches: AntipatternMatch[] = [];

  const context: ScanContext = {
    inUpdateMethod: false,
    currentMethod: '',
    braceDepth: 0,
  };

  /** Brace depth at which the current update method was entered */
  let updateMethodBraceDepth = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-based

    // Check for update method declaration
    const methodMatch = line.match(METHOD_DECLARATION_REGEX);
    if (methodMatch) {
      context.currentMethod = methodMatch[1];
      // The method body starts at the next '{', but we mark intent here.
      // We'll activate inUpdateMethod once we see the opening brace.
      context.inUpdateMethod = false;
      updateMethodBraceDepth = -1;
    }

    // Count braces to track scope
    for (const ch of line) {
      if (ch === '{') {
        context.braceDepth++;
        // If we just saw an update method declaration and this is the opening brace
        if (context.currentMethod && UPDATE_METHODS.includes(context.currentMethod) && updateMethodBraceDepth === -1) {
          updateMethodBraceDepth = context.braceDepth;
          context.inUpdateMethod = true;
        }
      } else if (ch === '}') {
        // If we're closing the update method scope
        if (context.inUpdateMethod && context.braceDepth === updateMethodBraceDepth) {
          context.inUpdateMethod = false;
          context.currentMethod = '';
          updateMethodBraceDepth = -1;
        }
        context.braceDepth = Math.max(0, context.braceDepth - 1);
      }
    }

    // Try to match antipatterns on this line
    const match = matchAntipattern(line, lineNumber, context);
    if (match) {
      match.filePath = filePath;
      matches.push(match);
    }
  }

  return matches;
}

/**
 * Scan multiple C# scripts and return a combined result.
 *
 * If a script's content is null/undefined or processing throws,
 * it is recorded in `failedFiles` and scanning continues.
 */
export function scanAllScripts(scripts: ScriptFile[]): CodeScanResult {
  const allAntipatterns: AntipatternMatch[] = [];
  const failedFiles: FailedFile[] = [];
  let scannedCount = 0;

  for (const script of scripts) {
    try {
      if (script.content == null) {
        failedFiles.push({
          filePath: script.filePath,
          error: 'Script content is null or undefined.',
        });
        continue;
      }

      const matches = scanScript(script.filePath, script.content);
      allAntipatterns.push(...matches);
      scannedCount++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      failedFiles.push({
        filePath: script.filePath,
        error: message,
      });
    }
  }

  return {
    antipatterns: allAntipatterns,
    failedFiles,
    scannedCount,
  };
}
