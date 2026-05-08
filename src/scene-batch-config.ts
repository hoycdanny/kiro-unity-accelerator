import {
  FilterCondition,
  BatchRule,
  BatchAction,
  PreviewItem,
  ChangeDescription,
  McpToolCall,
  BatchConfigResult,
  SkipReason,
} from './types';
import {
  McpExecutor,
  McpWorkflowResult,
  executeMcpCall,
  executeBatch,
  waitForCompilation,
} from './mcp-integration';

/**
 * Generates a unique ID for a batch rule.
 */
function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parses a natural-language batch configuration description into BatchRule objects.
 *
 * Supports descriptions like:
 *   "所有名稱包含 Enemy 的物件設定 Layer 為 Enemy"
 *   "Tag 為 Player 的物件設定組件 Rigidbody 的 mass 為 10"
 *
 * Multiple rules can be separated by newlines or semicolons.
 */
export function parseBatchRules(description: string): BatchRule[] {
  const now = new Date().toISOString();
  const lines = description
    .split(/[;\n]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, index) => {
    const filters: FilterCondition[] = [];
    const actions: BatchAction[] = [];

    // --- Parse filter conditions ---

    // Name filter: "名稱包含 X" or "name contains X" or "名稱為 X"
    const nameContains = line.match(/名稱包含\s*(\S+)/);
    if (nameContains) {
      filters.push({ type: 'name', value: `*${nameContains[1]}*`, useWildcard: true });
    }
    const nameEquals = line.match(/名稱為\s*(\S+)/);
    if (nameEquals && !nameContains) {
      filters.push({ type: 'name', value: nameEquals[1], useWildcard: false });
    }

    // Tag filter: "Tag 為 X" or "tag 為 X"
    const tagMatch = line.match(/[Tt]ag\s*為\s*(\S+)/);
    if (tagMatch) {
      filters.push({ type: 'tag', value: tagMatch[1], useWildcard: false });
    }

    // Layer filter: "Layer 為 X" or "layer 為 X"
    const layerFilterMatch = line.match(/[Ll]ayer\s*為\s*(\S+)\s*的/);
    if (layerFilterMatch) {
      filters.push({ type: 'layer', value: layerFilterMatch[1], useWildcard: false });
    }

    // Component filter: "包含 X 組件" or "組件 X"
    const componentMatch = line.match(/(?:包含|組件)\s*(\S+)\s*(?:組件|的)/);
    if (componentMatch) {
      filters.push({ type: 'component', value: componentMatch[1], useWildcard: false });
    }

    // Parent path filter: "父物件路徑 X"
    const parentMatch = line.match(/父物件路徑\s*(\S+)/);
    if (parentMatch) {
      filters.push({ type: 'parentPath', value: parentMatch[1], useWildcard: false });
    }

    // --- Parse actions ---

    // setLayer: "設定 Layer 為 X"
    const layerAction = line.match(/設定\s*[Ll]ayer\s*為\s*(\S+)/);
    if (layerAction) {
      actions.push({ type: 'setLayer', params: { layer: layerAction[1] } });
    }

    // setTag: "設定 Tag 為 X"
    const tagAction = line.match(/設定\s*[Tt]ag\s*為\s*(\S+)/);
    if (tagAction) {
      actions.push({ type: 'setTag', params: { tag: tagAction[1] } });
    }

    // setComponentProperty: "設定組件 X 的 Y 為 Z" or "X 的 Y 設為 Z"
    const compPropAction = line.match(/(?:設定)?組件\s*(\S+)\s*的\s*(\S+)\s*(?:為|設為)\s*(\S+)/);
    if (compPropAction) {
      const value = parsePropertyValue(compPropAction[3]);
      actions.push({
        type: 'setComponentProperty',
        params: {
          componentType: compPropAction[1],
          propertyName: compPropAction[2],
          value,
        },
      });
    }

    return {
      id: generateId(),
      name: `Rule ${index + 1}`,
      description: line,
      filters,
      actions,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  });
}

/**
 * Parses a string value into the appropriate JS primitive.
 */
function parsePropertyValue(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const num = Number(raw);
  if (!isNaN(num)) return num;
  return raw;
}


/**
 * Produces a `find_gameobjects` MCP tool call from a set of FilterConditions.
 *
 * Each filter type maps to a specific search_method / search_term combination.
 * When multiple filters are provided the first filter drives the primary
 * `find_gameobjects` call; additional filters are returned as supplementary
 * calls so the caller can intersect results.
 *
 * Requirement 3.4 — supports name wildcards, Tag, Layer, component type,
 * and parent path filtering.
 */
export function matchGameObjects(filters: FilterCondition[]): McpToolCall {
  if (filters.length === 0) {
    // Default: search all by name wildcard
    return {
      tool: 'find_gameobjects',
      args: { search_term: '*', search_method: 'by_name', include_inactive: false },
    };
  }

  // Use the first filter as the primary search criterion
  const primary = filters[0];
  const args: Record<string, unknown> = {
    include_inactive: false,
  };

  switch (primary.type) {
    case 'name':
      args['search_method'] = 'by_name';
      args['search_term'] = primary.value;
      break;
    case 'tag':
      args['search_method'] = 'by_tag';
      args['search_term'] = primary.value;
      break;
    case 'layer':
      args['search_method'] = 'by_layer';
      args['search_term'] = primary.value;
      break;
    case 'component':
      args['search_method'] = 'by_component';
      args['search_term'] = primary.value;
      break;
    case 'parentPath':
      args['search_method'] = 'by_path';
      args['search_term'] = primary.value;
      break;
  }

  // Attach remaining filters as additional_filters metadata so the caller
  // can perform client-side intersection if needed.
  if (filters.length > 1) {
    args['additional_filters'] = filters.slice(1).map((f) => ({
      type: f.type,
      value: f.value,
      useWildcard: f.useWildcard,
    }));
  }

  return { tool: 'find_gameobjects', args };
}

/**
 * Generates a human-readable preview list showing what changes will be
 * applied to each matched GameObject.
 *
 * Requirement 3.5 — preview item count equals matched object count,
 * each item's change count equals action count.
 */
export function generatePreview(
  matchedObjects: { name: string; path: string }[],
  actions: BatchAction[],
): PreviewItem[] {
  return matchedObjects.map((obj) => {
    const changes: ChangeDescription[] = actions.map((action) => {
      switch (action.type) {
        case 'setLayer':
          return {
            field: 'Layer',
            oldValue: '(current)',
            newValue: String(action.params['layer']),
          };
        case 'setTag':
          return {
            field: 'Tag',
            oldValue: '(current)',
            newValue: String(action.params['tag']),
          };
        case 'setComponentProperty':
          return {
            field: `${action.params['componentType']}.${action.params['propertyName']}`,
            oldValue: '(current)',
            newValue: String(action.params['value']),
          };
        default:
          return { field: 'unknown', oldValue: '', newValue: '' };
      }
    });

    return {
      gameObjectName: obj.name,
      gameObjectPath: obj.path,
      changes,
    };
  });
}

/**
 * Translates matched objects and actions into a sequence of MCP tool calls.
 *
 * Supports three action types:
 *   - setLayer  → manage_gameobject (modify)
 *   - setTag    → manage_gameobject (modify)
 *   - setComponentProperty → manage_components (set_property)
 *
 * When processing multiple rules, call this function per rule and
 * concatenate the results to preserve rule ordering (Requirement 3.9).
 *
 * Requirements 3.1, 3.2, 3.3, 3.6
 */
export function translateToMcpCalls(
  matchedObjects: { name: string; path: string }[],
  actions: BatchAction[],
): McpToolCall[] {
  const calls: McpToolCall[] = [];

  for (const obj of matchedObjects) {
    for (const action of actions) {
      switch (action.type) {
        case 'setLayer':
          calls.push({
            tool: 'manage_gameobject',
            args: {
              action: 'modify',
              target: obj.path,
              search_method: 'by_path',
              layer: String(action.params['layer']),
            },
          });
          break;

        case 'setTag':
          calls.push({
            tool: 'manage_gameobject',
            args: {
              action: 'modify',
              target: obj.path,
              search_method: 'by_path',
              tag: String(action.params['tag']),
            },
          });
          break;

        case 'setComponentProperty':
          calls.push({
            tool: 'manage_components',
            args: {
              action: 'set_property',
              target: obj.path,
              search_method: 'by_path',
              component_type: String(action.params['componentType']),
              property: String(action.params['propertyName']),
              value: action.params['value'],
            },
          });
          break;
      }
    }
  }

  return calls;
}

/**
 * Serializes a BatchRule to a JSON string.
 * Requirement 4.1, 4.2
 */
export function serializeBatchRule(rule: BatchRule): string {
  return JSON.stringify(rule, null, 2);
}

/**
 * Deserializes a JSON string to a BatchRule.
 * Requirement 4.1, 4.2
 */
export function deserializeBatchRule(json: string): BatchRule {
  return JSON.parse(json) as BatchRule;
}


// ================================================================
// MCP Integration — Workflow functions (Requirement 5.1, 5.5, 5.6)
// ================================================================

/**
 * Executes find_gameobjects via MCP to get matching objects from the scene.
 *
 * Requirement 5.1
 */
export async function findGameObjectsViaMcp(
  filters: FilterCondition[],
  executor: McpExecutor,
): Promise<McpWorkflowResult<{ name: string; path: string }[]>> {
  // Wait for any ongoing compilation before querying the scene
  await waitForCompilation(executor);

  const call = matchGameObjects(filters);
  const result = await executeMcpCall(call, executor);

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? '場景物件搜尋失敗。',
    };
  }

  // Parse the MCP response into a list of matched objects
  const data = result.data as { name: string; path: string }[] | undefined;
  return {
    success: true,
    data: data ?? [],
  };
}

/**
 * Validates that the specified layers and
 tags exist in the Unity project.
 * Returns an error message if any are missing.
 *
 * Requirement 3.8
 */
export async function validateLayersAndTags(
  actions: BatchAction[],
  executor: McpExecutor,
): Promise<McpWorkflowResult<void>> {
  for (const action of actions) {
    if (action.type === 'setLayer') {
      const layer = String(action.params['layer']);
      // Attempt to verify layer exists by querying editor
      const result = await executeMcpCall(
        {
          tool: 'find_gameobjects',
          args: { search_term: layer, search_method: 'by_layer', include_inactive: true },
        },
        executor,
      );
      // If the MCP call itself fails with an invalid layer error, report it
      if (!result.success && result.error?.includes('layer')) {
        return {
          success: false,
          error: `Layer "${layer}" 在專案中不存在。請使用 manage_editor(action: "add_layer") 新增，或選擇已定義的 Layer。`,
        };
      }
    }

    if (action.type === 'setTag') {
      const tag = String(action.params['tag']);
      const result = await executeMcpCall(
        {
          tool: 'find_gameobjects',
          args: { search_term: tag, search_method: 'by_tag', include_inactive: true },
        },
        executor,
      );
      if (!result.success && result.error?.includes('tag')) {
        return {
          success: false,
          error: `Tag "${tag}" 在專案中不存在。請使用 manage_editor(action: "add_tag") 新增，或選擇已定義的 Tag。`,
        };
      }
    }
  }

  return { success: true };
}

/**
 * Full MCP workflow: execute batch configuration on scene objects.
 *
 * 1. Wait for compilation to finish
 * 2. Find matching GameObjects via find_gameobjects
 * 3. Validate layers/tags
 * 4. Translate actions to MCP calls
 * 5. Execute batch via sequential MCP calls
 * 6. Return summary report
 *
 * Requirements: 5.1, 5.5, 5.6, 3.1, 3.2, 3.3, 3.7
 */
export async function executeBatchConfig(
  rules: BatchRule[],
  executor: McpExecutor,
): Promise<McpWorkflowResult<BatchConfigResult>> {
  // Wait for any ongoing compilation
  await waitForCompilation(executor);

  let totalProcessed = 0;
  let successCount = 0;
  let skippedCount = 0;
  const skippedReasons: SkipReason[] = [];

  for (const rule of rules) {
    // 1. Find matching objects
    const findResult = await findGameObjectsViaMcp(rule.filters, executor);
    if (!findResult.success || !findResult.data) {
      return {
        success: false,
        error: findResult.error ?? `規則 "${rule.name}" 的物件搜尋失敗。`,
      };
    }

    const matchedObjects = findResult.data;
    if (matchedObjects.length === 0) {
      skippedReasons.push({
        gameObjectName: `(規則: ${rule.name})`,
        reason: '沒有符合篩選條件的物件',
      });
      continue;
    }

    // 2. Validate layers and tags
    const validationResult = await validateLayersAndTags(rule.actions, executor);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    // 3. Translate to MCP calls and execute
    const mcpCalls = translateToMcpCalls(matchedObjects, rule.actions);
    const batchResult = await executeBatch(mcpCalls, executor);

    totalProcessed += matchedObjects.length;
    successCount += batchResult.successCount;

    // Track failures as skipped
    if (batchResult.failureCount > 0) {
      skippedCount += batchResult.failureCount;
      batchResult.results.forEach((r, idx) => {
        if (!r.success) {
          const objIndex = Math.floor(idx / Math.max(rule.actions.length, 1));
          const obj = matchedObjects[objIndex];
          skippedReasons.push({
            gameObjectName: obj?.name ?? 'unknown',
            reason: r.error ?? '操作失敗',
          });
        }
      });
    }
  }

  return {
    success: true,
    data: {
      totalProcessed,
      successCount,
      skippedCount,
      skippedReasons,
    },
  };
}
