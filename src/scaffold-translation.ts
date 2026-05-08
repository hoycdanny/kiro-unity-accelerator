import { SceneScaffold, SceneNode, McpToolCall } from './types';

/**
 * Translate a SceneScaffold's hierarchy into an ordered sequence of MCP tool
 * calls. The traversal is depth-first so that parent objects are created before
 * their children, preserving the hierarchy structure.
 */
export function translateScaffoldToMcpCalls(scaffold: SceneScaffold): McpToolCall[] {
  const calls: McpToolCall[] = [];
  for (const node of scaffold.hierarchy) {
    collectCalls(node, calls);
  }
  return calls;
}

/**
 * Recursively collect MCP tool calls for a SceneNode and all its children.
 * Each node produces exactly one call using its own mcpTool / mcpArgs, then
 * recurses into children so they are created in parent-first order.
 */
function collectCalls(node: SceneNode, calls: McpToolCall[]): void {
  calls.push({
    tool: node.mcpTool,
    args: { ...node.mcpArgs },
  });

  for (const child of node.children) {
    collectCalls(child, calls);
  }
}
