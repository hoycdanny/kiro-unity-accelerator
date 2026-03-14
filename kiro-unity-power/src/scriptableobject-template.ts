import {
  FieldDefinition,
  SOTemplateDefinition,
  SOGenResult,
  ScriptGenResult,
} from './types';

/**
 * Maps a FieldDefinition to the C# field declaration string,
 * including [Tooltip], [SerializeField], [Range], [Min], etc.
 */
function fieldToDeclaration(field: FieldDefinition, indent: string): string {
  const lines: string[] = [];

  // Tooltip
  lines.push(`${indent}[Tooltip("${field.tooltip}")]`);

  // Validation attributes
  if (field.validation) {
    switch (field.validation.type) {
      case 'range':
        lines.push(`${indent}[Range(${field.validation.params['min']}, ${field.validation.params['max']})]`);
        break;
      case 'min':
        lines.push(`${indent}[Min(${field.validation.params['value']})]`);
        break;
      case 'max':
        // Unity has no built-in [Max], handled in OnValidate
        break;
      case 'custom':
        // Handled in OnValidate
        break;
    }
  }

  // Field type
  const isListType = field.typeName.startsWith('List<');

  if (field.isNested && !isListType) {
    lines.push(`${indent}[SerializeField]`);
    lines.push(`${indent}public ${field.typeName} ${field.name};`);
  } else if (isListType) {
    lines.push(`${indent}[SerializeField]`);
    lines.push(`${indent}public ${field.typeName} ${field.name} = new ${field.typeName}();`);
  } else {
    lines.push(`${indent}public ${field.typeName} ${field.name};`);
  }

  return lines.join('\n');
}

/**
 * Generates the OnValidate method body from field validation rules.
 */
export function generateOnValidateMethod(fields: FieldDefinition[]): string {
  const checks: string[] = [];

  for (const field of fields) {
    if (!field.validation) continue;

    switch (field.validation.type) {
      case 'range': {
        const min = field.validation.params['min'];
        const max = field.validation.params['max'];
        checks.push(`        ${field.name} = Mathf.Clamp(${field.name}, ${min}f, ${max}f);`);
        break;
      }
      case 'min': {
        const val = field.validation.params['value'];
        checks.push(`        ${field.name} = Mathf.Max(${field.name}, ${val}f);`);
        break;
      }
      case 'max': {
        const val = field.validation.params['value'];
        checks.push(`        ${field.name} = Mathf.Min(${field.name}, ${val}f);`);
        break;
      }
      case 'custom': {
        const expr = field.validation.params['expression'];
        checks.push(`        // Custom validation: ${expr}`);
        break;
      }
    }

    // Recurse into nested fields
    if (field.isNested && field.nestedFields) {
      for (const nested of field.nestedFields) {
        if (!nested.validation) continue;
        switch (nested.validation.type) {
          case 'range': {
            const min = nested.validation.params['min'];
            const max = nested.validation.params['max'];
            checks.push(`        if (${field.name} != null) ${field.name}.${nested.name} = Mathf.Clamp(${field.name}.${nested.name}, ${min}f, ${max}f);`);
            break;
          }
          case 'min': {
            const val = nested.validation.params['value'];
            checks.push(`        if (${field.name} != null) ${field.name}.${nested.name} = Mathf.Max(${field.name}.${nested.name}, ${val}f);`);
            break;
          }
          case 'max': {
            const val = nested.validation.params['value'];
            checks.push(`        if (${field.name} != null) ${field.name}.${nested.name} = Mathf.Min(${field.name}.${nested.name}, ${val}f);`);
            break;
          }
          default:
            break;
        }
      }
    }
  }

  if (checks.length === 0) {
    return `    private void OnValidate()\n    {\n        // No validation rules defined\n    }`;
  }

  return `    private void OnValidate()\n    {\n${checks.join('\n')}\n    }`;
}


/**
 * Generates a [System.Serializable] nested class for a nested FieldDefinition.
 */
function generateNestedClass(field: FieldDefinition): ScriptGenResult | null {
  if (!field.isNested || !field.nestedFields || field.nestedFields.length === 0) {
    return null;
  }

  const fieldDecls = field.nestedFields.map((f) => fieldToDeclaration(f, '        ')).join('\n\n');

  const content = `using UnityEngine;
using System.Collections.Generic;

[System.Serializable]
public class ${field.typeName}
{
${fieldDecls}
}
`;

  return {
    fileName: `${field.typeName}.cs`,
    filePath: `Assets/Scripts/${field.typeName}.cs`,
    content,
    scriptType: 'scriptableObject',
  };
}

/**
 * Generates a Custom Inspector script for the given SO class.
 */
function generateSOInspectorScript(className: string, fields: FieldDefinition[]): ScriptGenResult {
  const fileName = `${className}Inspector.cs`;
  const filePath = `Assets/Editor/${fileName}`;

  const fieldControls = fields.map((f) => {
    if (f.isNested || f.typeName.startsWith('List<')) {
      return `            SerializedProperty ${f.name}Prop = serializedObject.FindProperty("${f.name}");\n            EditorGUILayout.PropertyField(${f.name}Prop, new GUIContent("${f.name}"), true);`;
    }
    // Simple fields use PropertyField via serializedObject for consistency
    return `            SerializedProperty ${f.name}Prop = serializedObject.FindProperty("${f.name}");\n            EditorGUILayout.PropertyField(${f.name}Prop, new GUIContent("${f.name}"));`;
  });

  const content = `using UnityEngine;
using UnityEditor;

[CustomEditor(typeof(${className}))]
public class ${className}Inspector : Editor
{
    public override void OnInspectorGUI()
    {
        serializedObject.Update();

${fieldControls.join('\n\n')}

        serializedObject.ApplyModifiedProperties();
    }
}
`;

  return { fileName, filePath, content, scriptType: 'inspector' };
}

/**
 * Generates a ScriptableObject C# script and its companion Inspector
 * from a SOTemplateDefinition.
 */
export function generateSOScript(template: SOTemplateDefinition): SOGenResult {
  const { className, menuPath, fileName: assetFileName, description, fields } = template;
  const soFileName = `${className}.cs`;
  const soFilePath = `Assets/Scripts/${soFileName}`;

  // Collect nested class scripts
  const nestedClassScripts: ScriptGenResult[] = [];
  for (const field of fields) {
    const nested = generateNestedClass(field);
    if (nested) {
      nestedClassScripts.push(nested);
    }
  }

  // Determine if we need List<T> import
  const needsCollections = fields.some(
    (f) => f.typeName.startsWith('List<')
  );

  // Build field declarations
  const fieldDecls = fields.map((f) => fieldToDeclaration(f, '    ')).join('\n\n');

  // Build OnValidate
  const onValidate = generateOnValidateMethod(fields);

  // Assemble SO script
  let soContent = `using UnityEngine;\n`;
  if (needsCollections) {
    soContent += `using System.Collections.Generic;\n`;
  }
  soContent += `\n/// <summary>\n/// ${description}\n/// </summary>\n`;
  soContent += `[CreateAssetMenu(menuName = "${menuPath}", fileName = "${assetFileName}")]\n`;
  soContent += `public class ${className} : ScriptableObject\n{\n`;
  soContent += `${fieldDecls}\n\n`;
  soContent += `${onValidate}\n`;
  soContent += `}\n`;

  const soScript: ScriptGenResult = {
    fileName: soFileName,
    filePath: soFilePath,
    content: soContent,
    scriptType: 'scriptableObject',
  };

  // Generate companion Inspector
  const inspectorScript = generateSOInspectorScript(className, fields);

  return { soScript, inspectorScript, nestedClassScripts };
}

/**
 * Serializes a SOTemplateDefinition to a JSON string.
 */
export function serializeTemplate(template: SOTemplateDefinition): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Deserializes a JSON string to a SOTemplateDefinition.
 */
export function deserializeTemplate(json: string): SOTemplateDefinition {
  return JSON.parse(json) as SOTemplateDefinition;
}
