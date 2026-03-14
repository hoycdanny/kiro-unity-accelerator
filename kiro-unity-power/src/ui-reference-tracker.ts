import {
  ScriptFile,
  UIComponentQuery,
  UIReferenceResult,
  ScriptReference,
  HighFanInComponent,
  FailedFile,
  ReferenceMethod,
  UIComponentType,
  UIDependencyGraph,
  UIDependencyNode,
  UIDependencyEdge,
} from './types';

// ============================================================
// Known UI types for matching
// ============================================================

const UI_TYPES: readonly string[] = [
  'Button',
  'Toggle',
  'Slider',
  'InputField',
  'Dropdown',
  'ScrollRect',
  'Text',
  'Image',
  'TMP_Text',
  'TextMeshProUGUI',
  'TextMeshPro',
  'RawImage',
  'Canvas',
  'CanvasGroup',
  'RectTransform',
  'ScrollView',
  'Scrollbar',
];

// ============================================================
// Reference detection patterns (Requirement 1.2)
// ============================================================

interface ReferencePattern {
  method: ReferenceMethod;
  regex: RegExp;
  /** Extract group indices: [componentType, fieldName] */
  extractGroups: (match: RegExpMatchArray) => { componentType: string; fieldName: string };
}

/**
 * Build regex patterns for detecting UI references in C# scripts.
 */
function buildPatterns(): ReferencePattern[] {
  return [
    // [SerializeField] private Button myButton;
    // [SerializeField] Button myButton;
    {
      method: 'SerializeField',
      regex: /\[SerializeField\]\s*(?:private|protected)?\s*(\w+)\s+(\w+)\s*;/g,
      extractGroups: (m) => ({ componentType: m[1], fieldName: m[2] }),
    },
    // public Button myButton;
    {
      method: 'PublicField',
      regex: /public\s+(\w+)\s+(\w+)\s*;/g,
      extractGroups: (m) => ({ componentType: m[1], fieldName: m[2] }),
    },
    // GetComponent<Button>()
    {
      method: 'GetComponent',
      regex: /(\w+)\s*=\s*\w*\.?GetComponent\s*<\s*(\w+)\s*>\s*\(/g,
      extractGroups: (m) => ({ componentType: m[2], fieldName: m[1] }),
    },
    // var x = GetComponent<Button>() — without object prefix
    {
      method: 'GetComponent',
      regex: /(\w+)\s*=\s*GetComponent\s*<\s*(\w+)\s*>\s*\(/g,
      extractGroups: (m) => ({ componentType: m[2], fieldName: m[1] }),
    },
    // GetComponentInChildren<Button>()
    {
      method: 'GetComponentInChildren',
      regex: /(\w+)\s*=\s*\w*\.?GetComponentInChildren\s*<\s*(\w+)\s*>\s*\(/g,
      extractGroups: (m) => ({ componentType: m[2], fieldName: m[1] }),
    },
    // var x = GetComponentInChildren<Button>() — without object prefix
    {
      method: 'GetComponentInChildren',
      regex: /(\w+)\s*=\s*GetComponentInChildren\s*<\s*(\w+)\s*>\s*\(/g,
      extractGroups: (m) => ({ componentType: m[2], fieldName: m[1] }),
    },
    // GameObject.Find("ButtonObj")
    {
      method: 'GameObjectFind',
      regex: /(\w+)\s*=\s*GameObject\s*\.\s*Find\s*\(\s*"([^"]+)"\s*\)/g,
      extractGroups: (m) => ({ componentType: 'GameObject', fieldName: m[1] }),
    },
    // transform.Find("ButtonObj")
    {
      method: 'TransformFind',
      regex: /(\w+)\s*=\s*\w*\.?transform\s*\.\s*Find\s*\(\s*"([^"]+)"\s*\)/g,
      extractGroups: (m) => ({ componentType: 'Transform', fieldName: m[1] }),
    },
    // AddComponent<Button>()
    {
      method: 'AddComponent',
      regex: /(\w+)\s*=\s*\w*\.?AddComponent\s*<\s*(\w+)\s*>\s*\(/g,
      extractGroups: (m) => ({ componentType: m[2], fieldName: m[1] }),
    },
    // gameObject.AddComponent<Button>() — standalone (no assignment)
    {
      method: 'AddComponent',
      regex: /\w+\.AddComponent\s*<\s*(\w+)\s*>\s*\(/g,
      extractGroups: (m) => ({ componentType: m[1], fieldName: m[1] }),
    },
  ];
}

const PATTERNS = buildPatterns();

// ============================================================
// High fan-in threshold
// ============================================================

const HIGH_FAN_IN_THRESHOLD = 3;

// ============================================================
// Core scanning logic
// ============================================================

/**
 * Check if a component type matches the query.
 */
function matchesQuery(
  componentType: string,
  fieldName: string,
  query: UIComponentQuery,
): boolean {
  // If query is empty (no name and no typeName), match everything
  if (!query.name && !query.typeName) {
    return true;
  }

  if (query.typeName && componentType === query.typeName) {
    return true;
  }

  if (query.name && fieldName === query.name) {
    return true;
  }

  return false;
}

/**
 * Check if a type name is a known UI type.
 */
function isUIType(typeName: string): boolean {
  return UI_TYPES.includes(typeName);
}

/**
 * Scan a single script for UI references matching the query.
 */
function scanScriptForReferences(
  filePath: string,
  content: string,
  query: UIComponentQuery,
): ScriptReference[] {
  const references: ScriptReference[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.length === 0) {
      continue;
    }

    for (const pattern of PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.regex.lastIndex = 0;
      let match: RegExpMatchArray | null;

      while ((match = pattern.regex.exec(line)) !== null) {
        const { componentType, fieldName } = pattern.extractGroups(match);

        // For field declarations (SerializeField/PublicField), only match UI types
        if ((pattern.method === 'SerializeField' || pattern.method === 'PublicField') && !isUIType(componentType)) {
          continue;
        }

        // For GetComponent/GetComponentInChildren/AddComponent, only match UI types
        if (
          (pattern.method === 'GetComponent' ||
            pattern.method === 'GetComponentInChildren' ||
            pattern.method === 'AddComponent') &&
          !isUIType(componentType)
        ) {
          continue;
        }

        // Check if this reference matches the query
        if (!matchesQuery(componentType, fieldName, query)) {
          continue;
        }

        references.push({
          filePath,
          lineNumber,
          referenceMethod: pattern.method,
          componentType: componentType as UIComponentType | string,
          fieldName,
        });
      }
    }
  }

  return references;
}

/**
 * Compute high fan-in components from the collected references.
 * A component is high fan-in if it's referenced by more than 3 distinct scripts.
 */
function computeHighFanInComponents(references: ScriptReference[]): HighFanInComponent[] {
  // Group by componentType+fieldName, tracking unique scripts
  const componentMap = new Map<string, { componentType: string; fieldName: string; scripts: Set<string> }>();

  for (const ref of references) {
    const key = `${ref.componentType}::${ref.fieldName}`;
    let entry = componentMap.get(key);
    if (!entry) {
      entry = { componentType: ref.componentType, fieldName: ref.fieldName, scripts: new Set() };
      componentMap.set(key, entry);
    }
    entry.scripts.add(ref.filePath);
  }

  const highFanIn: HighFanInComponent[] = [];
  for (const entry of componentMap.values()) {
    if (entry.scripts.size > HIGH_FAN_IN_THRESHOLD) {
      highFanIn.push({
        componentType: entry.componentType,
        fieldName: entry.fieldName,
        referenceCount: entry.scripts.size,
        referencingScripts: Array.from(entry.scripts),
      });
    }
  }

  return highFanIn;
}

// ============================================================
// Public API
// ============================================================

/**
 * Scan all C# scripts and return references to the specified UI component.
 *
 * - Detects SerializeField/public fields, GetComponent/GetComponentInChildren,
 *   GameObject.Find/transform.Find, and AddComponent patterns.
 * - Marks high fan-in components (referenced by > 3 scripts).
 * - Captures per-script failures into failedFiles and continues scanning.
 * - Returns a valid empty result for empty input.
 *
 * @param scripts - Array of C# script files to scan
 * @param targetComponent - Query to filter which UI component references to track
 * @returns UIReferenceResult with references, high fan-in markers, and failed files
 */
export function trackUIReferences(
  scripts: ScriptFile[],
  targetComponent: UIComponentQuery,
): UIReferenceResult {
  const allReferences: ScriptReference[] = [];
  const failedFiles: FailedFile[] = [];

  for (const script of scripts) {
    try {
      if (script.content == null) {
        failedFiles.push({
          filePath: script.filePath,
          error: 'Script content is null or undefined.',
        });
        continue;
      }

      const refs = scanScriptForReferences(script.filePath, script.content, targetComponent);
      allReferences.push(...refs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      failedFiles.push({
        filePath: script.filePath,
        error: message,
      });
    }
  }

  const highFanInComponents = computeHighFanInComponents(allReferences);

  return {
    query: targetComponent,
    references: allReferences,
    highFanInComponents,
    failedFiles,
  };
}


/**
 * Build a directed dependency graph representing relationships between
 * scripts and UI components.
 *
 * Each script file becomes a 'script' node, each unique UI component
 * (by componentType + fieldName) becomes a 'uiComponent' node, and
 * each ScriptReference produces one edge from the script node to the
 * UI component node. The total edge count equals the total reference count.
 *
 * @param scripts - Array of C# script files to analyse
 * @returns UIDependencyGraph with nodes and edges
 */
export function buildUIDependencyGraph(
  scripts: ScriptFile[],
): UIDependencyGraph {
  // Scan all scripts with an empty query to capture every UI reference
  const result = trackUIReferences(scripts, {});

  const nodeMap = new Map<string, UIDependencyNode>();
  const edges: UIDependencyEdge[] = [];

  for (const ref of result.references) {
    // Ensure a script node exists
    const scriptId = `script::${ref.filePath}`;
    if (!nodeMap.has(scriptId)) {
      nodeMap.set(scriptId, {
        id: scriptId,
        type: 'script',
        filePath: ref.filePath,
      });
    }

    // Ensure a UI component node exists (keyed by type + field name)
    const componentId = `ui::${ref.componentType}::${ref.fieldName}`;
    if (!nodeMap.has(componentId)) {
      nodeMap.set(componentId, {
        id: componentId,
        type: 'uiComponent',
        componentType: ref.componentType,
      });
    }

    // One edge per reference
    edges.push({
      source: scriptId,
      target: componentId,
      referenceMethod: ref.referenceMethod,
      lineNumber: ref.lineNumber,
    });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}
