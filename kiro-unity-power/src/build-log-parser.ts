/**
 * Build log parser module.
 *
 * Parses Unity build log text and extracts structured error information
 * with fix suggestions for common Unity build error patterns.
 *
 * Requirement: 3.4
 */

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type ErrorType =
  | 'CompileError'
  | 'MissingReference'
  | 'ShaderError'
  | 'MissingAsset'
  | 'BuildSizeError'
  | 'Unknown';

export interface BuildError {
  errorType: ErrorType;
  message: string;
  filePath: string | null;
  line: number | null;
  column: number | null;
  errorCode: string | null;
  suggestion: string;
}

export interface BuildLogResult {
  errors: BuildError[];
  hasErrors: boolean;
}

// ----------------------------------------------------------------
// Error pattern definitions
// ----------------------------------------------------------------

interface ErrorPattern {
  regex: RegExp;
  type: ErrorType;
  extract: (match: RegExpMatchArray) => Omit<BuildError, 'errorType'>;
}

const SUGGESTION_MAP: Record<string, string> = {
  CS0246:
    'Type or namespace not found. Check for missing using statements or Assembly Definition references.',
  CS1002:
    'Syntax error — likely a missing semicolon or bracket at the indicated location.',
  CS0103:
    'Name not found in scope. Verify the variable or method name is spelled correctly.',
  CS0117:
    'Type does not contain the specified member. The API may have changed in a newer Unity version.',
  CS0619:
    'Member is obsolete. Check the Unity upgrade guide for the recommended replacement.',
  CS0234:
    'Namespace does not contain the specified type. Verify the assembly reference is included.',
};

function getSuggestionForCode(code: string): string {
  return (
    SUGGESTION_MAP[code] ??
    'Review the error message and check the Unity documentation for guidance.'
  );
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // CS compile errors: Assets/Scripts/Foo.cs(42,15): error CS1002: ; expected
  {
    regex:
      /^(.+?)\((\d+),(\d+)\):\s*error\s+(CS\d+):\s*(.+)$/,
    type: 'CompileError',
    extract: (m) => ({
      message: m[5],
      filePath: m[1],
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
      errorCode: m[4],
      suggestion: getSuggestionForCode(m[4]),
    }),
  },
  // Missing reference: Assembly '...' references '...' which could not be found
  {
    regex:
      /Assembly\s+'(.+?)'\s+references\s+'(.+?)'\s+which could not be found/i,
    type: 'MissingReference',
    extract: (m) => ({
      message: `Assembly '${m[1]}' references '${m[2]}' which could not be found.`,
      filePath: null,
      line: null,
      column: null,
      errorCode: null,
      suggestion: `Install the missing package '${m[2]}' via UPM or verify the plugin is present in the project.`,
    }),
  },
  // Shader errors: Shader error in '...': undeclared identifier '...'
  {
    regex: /Shader error in '(.+?)':\s*(.+)/i,
    type: 'ShaderError',
    extract: (m) => ({
      message: `Shader error in '${m[1]}': ${m[2]}`,
      filePath: m[1],
      line: null,
      column: null,
      errorCode: null,
      suggestion:
        'Check shader syntax and ensure compatibility with the target graphics API. Consider using URP/HDRP compatible shaders.',
    }),
  },
  // Missing asset: The referenced script on this Behaviour is missing!
  // or: Missing Prefab with guid: ...
  {
    regex:
      /(?:The referenced script on this Behaviour is missing|Missing Prefab with guid:\s*(\S+))/i,
    type: 'MissingAsset',
    extract: (m) => ({
      message: m[0],
      filePath: null,
      line: null,
      column: null,
      errorCode: m[1] ?? null,
      suggestion:
        'Search for the missing asset or script in the project. Verify .meta files are intact and the asset has not been deleted or moved.',
    }),
  },
  // Build size exceeded
  {
    regex: /Build size exceeds maximum allowed size/i,
    type: 'BuildSizeError',
    extract: (m) => ({
      message: m[0],
      filePath: null,
      line: null,
      column: null,
      errorCode: null,
      suggestion:
        'Reduce build size by compressing textures, removing unused assets, or enabling Asset Bundle splitting.',
    }),
  },
];

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Parse a Unity build log and extract all recognised errors with
 * structured summaries and fix suggestions.
 */
export function parseBuildLog(logText: string): BuildLogResult {
  const lines = logText.split('\n');
  const errors: BuildError[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    for (const pattern of ERROR_PATTERNS) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const extracted = pattern.extract(match);
        errors.push({ errorType: pattern.type, ...extracted });
        break; // first matching pattern wins for this line
      }
    }
  }

  return { errors, hasErrors: errors.length > 0 };
}
