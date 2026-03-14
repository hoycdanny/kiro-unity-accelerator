import {
  SerializedFieldInfo,
  InspectorGenInput,
  BatchToolGenInput,
  ScriptGenResult,
  McpToolResult,
} from './types';
import {
  McpExecutor,
  McpWorkflowResult,
  executeMcpCall,
  waitForCompilation,
  refreshUnityEditor,
} from './mcp-integration';

/**
 * Maps a SerializedFieldInfo to the corresponding EditorGUILayout control call string.
 */
export function mapFieldToGuiControl(field: SerializedFieldInfo): string {
  if (field.isList) {
    const elementType = field.listElementType ?? field.typeName;
    return [
      `EditorGUILayout.LabelField("${field.name}", EditorStyles.boldLabel);`,
      `EditorGUI.indentLevel++;`,
      `SerializedProperty ${field.name}Prop = serializedObject.FindProperty("${field.name}");`,
      `EditorGUILayout.PropertyField(${field.name}Prop, new GUIContent("${field.name}"), true);`,
      `EditorGUI.indentLevel--;`,
    ].join('\n            ');
  }

  if (field.isEnum) {
    return `target.${field.name} = (${field.typeName})EditorGUILayout.EnumPopup("${field.name}", target.${field.name});`;
  }

  switch (field.typeName) {
    case 'int':
      return `target.${field.name} = EditorGUILayout.IntField("${field.name}", target.${field.name});`;
    case 'float':
      return `target.${field.name} = EditorGUILayout.FloatField("${field.name}", target.${field.name});`;
    case 'string':
      return `target.${field.name} = EditorGUILayout.TextField("${field.name}", target.${field.name});`;
    case 'bool':
      return `target.${field.name} = EditorGUILayout.Toggle("${field.name}", target.${field.name});`;
    case 'Vector2':
      return `target.${field.name} = EditorGUILayout.Vector2Field("${field.name}", target.${field.name});`;
    case 'Vector3':
      return `target.${field.name} = EditorGUILayout.Vector3Field("${field.name}", target.${field.name});`;
    case 'Vector4':
      return `target.${field.name} = EditorGUILayout.Vector4Field("${field.name}", target.${field.name});`;
    case 'Color':
      return `target.${field.name} = EditorGUILayout.ColorField("${field.name}", target.${field.name});`;
    case 'Rect':
      return `target.${field.name} = EditorGUILayout.RectField("${field.name}", target.${field.name});`;
    case 'Bounds':
      return `target.${field.name} = EditorGUILayout.BoundsField("${field.name}", target.${field.name});`;
    case 'AnimationCurve':
      return `target.${field.name} = EditorGUILayout.CurveField("${field.name}", target.${field.name});`;
    case 'double':
      return `target.${field.name} = EditorGUILayout.DoubleField("${field.name}", target.${field.name});`;
    case 'long':
      return `target.${field.name} = EditorGUILayout.LongField("${field.name}", target.${field.name});`;
    default:
      // Unity Object-derived types (GameObject, Transform, Sprite, etc.)
      return `target.${field.name} = (${field.typeName})EditorGUILayout.ObjectField("${field.name}", target.${field.name}, typeof(${field.typeName}), true);`;
  }
}


/**
 * Generates a Custom Inspector C# script for the given target class.
 * Generates a Custom Inspector C# script for the given target class.
 * Output placed at Assets/Editor/{TargetClassName}Inspector.cs
 */
export function generateInspectorScript(input: InspectorGenInput): ScriptGenResult {
  const { targetClassName, fields, namespace } = input;
  const fileName = `${targetClassName}Inspector.cs`;
  const filePath = `Assets/Editor/${fileName}`;
  const hasListFields = fields.some((f) => f.isList);

  const indent = namespace ? '        ' : '    ';
  const classIndent = namespace ? '    ' : '';

  const bodyLines: string[] = [];
  bodyLines.push(`${indent}    ${targetClassName} target = (${targetClassName})this.target;`);
  bodyLines.push('');
  bodyLines.push(`${indent}    Undo.RecordObject(target, "Modify ${targetClassName}");`);
  bodyLines.push('');

  if (hasListFields) {
    bodyLines.push(`${indent}    serializedObject.Update();`);
    bodyLines.push('');
  }

  if (fields.length > 0) {
    for (const f of fields) {
      bodyLines.push(`${indent}    ${mapFieldToGuiControl(f)}`);
    }
  } else {
    bodyLines.push(`${indent}    // No serialized fields found`);
  }

  if (hasListFields) {
    bodyLines.push('');
    bodyLines.push(`${indent}    serializedObject.ApplyModifiedProperties();`);
  }

  bodyLines.push('');
  bodyLines.push(`${indent}    if (GUI.changed)`);
  bodyLines.push(`${indent}    {`);
  bodyLines.push(`${indent}        EditorUtility.SetDirty(target);`);
  bodyLines.push(`${indent}    }`);

  const classBody = `${classIndent}[CustomEditor(typeof(${targetClassName}))]
${classIndent}public class ${targetClassName}Inspector : Editor
${classIndent}{
${classIndent}    public override void OnInspectorGUI()
${classIndent}    {
${bodyLines.join('\n')}
${classIndent}    }
${classIndent}}`;

  let content = `using UnityEngine;\nusing UnityEditor;\n\n`;
  if (namespace) {
    content += `namespace ${namespace}\n{\n${classBody}\n}\n`;
  } else {
    content += `${classBody}\n`;
  }

  return { fileName, filePath, content, scriptType: 'inspector' };
}



/**
 * Generates an EditorWindow batch tool C# script.
 * Output placed at Assets/Editor/{ToolName}Window.cs
 */
export function generateBatchToolScript(input: BatchToolGenInput): ScriptGenResult {
  const { toolName, description, targetComponentType, operations } = input;
  // Sanitize tool name for use as class identifier (remove spaces)
  const className = toolName.replace(/\s+/g, '');
  const fileName = `${className}Window.cs`;
  const filePath = `Assets/Editor/${fileName}`;
  const menuPath = `Tools/${toolName}`;

  const operationLines = operations.map((op) => {
    switch (op.operationType) {
      case 'set':
        return `                    comp.${op.fieldName} = ${op.valueExpression};`;
      case 'increment':
        return `                    comp.${op.fieldName} += ${op.valueExpression};`;
      case 'multiply':
        return `                    comp.${op.fieldName} *= ${op.valueExpression};`;
      default:
        return `                    comp.${op.fieldName} = ${op.valueExpression};`;
    }
  });

  const operationBody = operationLines.length > 0
    ? operationLines.join('\n')
    : '                    // No operations defined';

  const content = `using UnityEngine;
using UnityEditor;

public class ${className}Window : EditorWindow
{
    [MenuItem("${menuPath}")]
    public static void ShowWindow()
    {
        GetWindow<${className}Window>("${toolName}");
    }

    private void OnGUI()
    {
        GUILayout.Label("${description}", EditorStyles.boldLabel);

        if (GUILayout.Button("Execute"))
        {
            ExecuteBatch();
        }
    }

    private void ExecuteBatch()
    {
        ${targetComponentType}[] targets = FindObjectsOfType<${targetComponentType}>();
        int total = targets.Length;

        for (int i = 0; i < total; i++)
        {
            ${targetComponentType} comp = targets[i];
            EditorUtility.DisplayProgressBar("${toolName}", "Processing " + comp.gameObject.name, (float)i / total);

            Undo.RecordObject(comp, "${toolName}");

${operationBody}

            EditorUtility.SetDirty(comp);
        }

        EditorUtility.ClearProgressBar();
        Debug.Log($"${toolName}: Processed {total} objects.");
    }
}
`;

  return { fileName, filePath, content, scriptType: 'editorWindow' };
}


// ================================================================
// MCP Integration — Workflow functions (Requirement 5.1, 5.3, 5.5, 5.6)
// ================================================================

/**
 * Queries class information from Unity via MCP `manage_script(action: "read")`.
 * Returns serialized field info for the target class.
 *
 * Requirement 5.1
 */
export async function queryClassInfo(
  className: string,
  executor: McpExecutor,
): Promise<McpWorkflowResult<SerializedFieldInfo[]>> {
  // Wait for any ongoing compilation before querying
  await waitForCompilation(executor);

  const result = await executeMcpCall(
    {
      tool: 'manage_script',
      args: { action: 'read', name: className, path: 'Assets/Scripts' },
    },
    executor,
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? `找不到類別 "${className}"，請確認類別名稱是否正確。`,
    };
  }

  // Parse the script content to extract serialized fields if data is available
  // The actual field extraction depends on the MCP response format
  return {
    success: true,
    data: result.data as SerializedFieldInfo[] | undefined,
  };
}

/**
 * Creates a C# script in Unity via MCP `create_script`.
 *
 * Requirement 5.1
 */
export async function createScriptViaMcp(
  scriptResult: ScriptGenResult,
  executor: McpExecutor,
): Promise<McpToolResult> {
  // Wait for any ongoing compilation before writing
  await waitForCompilation(executor);

  return executeMcpCall(
    {
      tool: 'create_script',
      args: {
        path: scriptResult.filePath,
        contents: scriptResult.content,
      },
    },
    executor,
  );
}

/**
 * Full MCP workflow: generate an Inspector script and deploy it to Unity.
 *
 * 1. Query class info via manage_script
 * 2. Generate Inspector C# script
 * 3. Write script via create_script
 * 4. Trigger editor refresh via refresh_unity
 *
 * Requirements: 5.1, 5.3, 5.5, 5.6
 */
export async function deployInspectorScript(
  input: InspectorGenInput,
  executor: McpExecutor,
): Promise<McpWorkflowResult<ScriptGenResult>> {
  // Generate the script content
  const script = generateInspectorScript(input);

  // Write to Unity project
  const writeResult = await createScriptViaMcp(script, executor);
  if (!writeResult.success) {
    return {
      success: false,
      error: writeResult.error ?? '腳本寫入失敗。',
    };
  }

  // Trigger editor refresh (Requirement 5.3)
  const refreshResult = await refreshUnityEditor(executor);
  if (!refreshResult.success) {
    // Script was written but refresh failed — still report success with warning
    return {
      success: true,
      data: script,
      error: `腳本已寫入但 Editor 刷新失敗：${refreshResult.error}`,
    };
  }

  return { success: true, data: script };
}

/**
 * Full MCP workflow: generate a batch tool script and deploy it to Unity.
 *
 * 1. Generate EditorWindow C# script
 * 2. Write script via create_script
 * 3. Trigger editor refresh
 *
 * Requirements: 5.1, 5.3, 5.5, 5.6
 */
export async function deployBatchToolScript(
  input: BatchToolGenInput,
  executor: McpExecutor,
): Promise<McpWorkflowResult<ScriptGenResult>> {
  const script = generateBatchToolScript(input);

  const writeResult = await createScriptViaMcp(script, executor);
  if (!writeResult.success) {
    return {
      success: false,
      error: writeResult.error ?? '腳本寫入失敗。',
    };
  }

  const refreshResult = await refreshUnityEditor(executor);
  if (!refreshResult.success) {
    return {
      success: true,
      data: script,
      error: `腳本已寫入但 Editor 刷新失敗：${refreshResult.error}`,
    };
  }

  return { success: true, data: script };
}
