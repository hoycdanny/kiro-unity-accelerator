# Level Design Tooling Steering
<!-- File Purpose / 本檔案用途: Unity level design toolchain steering guide / Unity 關卡設計工具鏈的 steering 指引，涵蓋 Editor 擴展腳本生成、ScriptableObject 模板建立、場景物件批次設定及模板管理。 -->

## Role and Purpose

Unity is used across diverse domains including games, architectural visualization, training simulations, and educational applications. Scene designers, level designers, and environment artists (roles responsible for scene layout, object placement, and workflow design — in smaller teams or solo projects, one person may fill multiple roles) need custom tools to efficiently configure scenes and manage data. This guide covers generating Editor extensions (custom Inspectors, batch tools), creating ScriptableObject templates, and automating batch scene operations through MCP tool sequences.

## Feature Overview

| Feature | Module | Description |
|---------|--------|-------------|
| Editor Extension Script Generation | `editor-extension-gen.ts` | Generates Custom Inspector and EditorWindow batch tool C# scripts based on target classes |
| ScriptableObject Template Creation | `scriptableobject-template.ts` | Generates ScriptableObject C# scripts and accompanying Inspectors based on field definitions |
| Scene Object Batch Configuration | `scene-batch-config.ts` | Parses batch rules, filters objects, generates and executes MCP call sequences |
| Template & Rule Management | `template-registry.ts` | Manages CRUD operations for SO templates and batch rules, reuses `config-crud.ts` |

> **Design rationale**: These three workflows (Editor extensions, ScriptableObject templates, batch configuration) cover the most common level designer requests. Each follows a similar pattern intentionally — consistency reduces cognitive load when switching between workflows.

## Editor Extension Generation Workflow

### Editor Extension Script Generation Flow

```
Confirm target class → Query class info → Generate C# script → Write file → Trigger compilation
```

1. **Confirm target class**: Confirm with the developer the target MonoBehaviour / ScriptableObject class name for which to generate an Inspector or batch tool
2. **Query class info**: Use `manage_script(action: "read")` to retrieve the target class's serialized field information
3. **Generate C# script**: Call `generateInspectorScript` or `generateBatchToolScript` to generate script content
4. **Write file**: Use `create_script` to write the script to the `Assets/Editor/` directory
5. **Trigger compilation**: Use `manage_editor(action: "refresh")` to trigger Unity Editor recompilation

### ScriptableObject Template Creation Flow

```
Describe field structure → Create template definition → Generate SO script + Inspector → Write files → Save template → Trigger compilation
```

1. **Describe field structure**: Confirm with the developer the field names, types, and validation rules for the level configuration
2. **Create template definition**: Assemble the `SOTemplateDefinition` object
3. **Generate scripts**: Call `generateSOScript` to generate both the SO script and accompanying Inspector
4. **Write files**: Use `create_script` to write to `Assets/Scripts/` and `Assets/Editor/` respectively
5. **Save template**: Use `saveTemplate` to persist the template definition as JSON
6. **Trigger compilation**: Use `manage_editor(action: "refresh")`

### Scene Object Batch Configuration Flow

```
Describe batch rules → Parse rules → Filter objects → Show preview → Confirm execution → Batch apply → Generate report
```

1. **Describe batch rules**: Developer describes filter conditions and configuration operations in natural language
2. **Parse rules**: Call `parseBatchRules` to convert the description into a `BatchRule` object
3. **Filter objects**: Use `find_gameobjects` to search for matching GameObjects
4. **Show preview**: Call `generatePreview` to produce a preview list showing expected changes for each object
5. **Confirm execution**: Wait for the developer's confirmation before proceeding
6. **Batch apply**: Call `translateToMcpCalls` to generate MCP call sequences, execute via `batch_execute`
7. **Generate report**: Return a change summary (success count, skipped count and reasons)

## MCP Tool Mapping

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Query class info | `manage_script(action: "read")` | Retrieve target class fields and types |
| Write script | `create_script(path, contents)` | Write generated C# scripts to the project |
| Trigger compilation | `manage_editor(action: "refresh")` | Trigger Unity recompilation after writing scripts |
| Filter scene objects | `find_gameobjects(search_term, search_method)` | Search objects by name, Tag, Layer, or component |
| Set Layer/Tag | `manage_gameobject(action: "modify", target, layer/tag)` | Modify an object's Layer or Tag |
| Modify component properties | `manage_components(action: "set_property", target, ...)` | Modify property values on an object's components |
| Batch execute | `batch_execute(commands)` | Package multiple MCP calls into a single batch operation |

## MCP Tool Call Sequence Examples

### Generate Custom Inspector

```
1. manage_script(action: "read", name: "EnemyConfig", path: "Assets/Scripts")
   → Retrieve EnemyConfig's serialized fields
2. create_script(path: "Assets/Editor/EnemyConfigInspector.cs", contents: "...")
   → Write the generated Inspector script
3. manage_editor(action: "refresh")
   → Trigger recompilation
```

### Generate ScriptableObject Template

```
1. create_script(path: "Assets/Scripts/LevelConfig.cs", contents: "...")
   → Write SO script
2. create_script(path: "Assets/Editor/LevelConfigInspector.cs", contents: "...")
   → Write accompanying Inspector
3. manage_editor(action: "refresh")
   → Trigger recompilation
```

### Batch Configure Scene Objects

```
1. find_gameobjects(search_term: "Enemy*", search_method: "by_name")
   → Search for objects with names matching Enemy*
2. batch_execute(commands: [
     { "tool": "manage_gameobject", "params": { "action": "modify", "target": "Enemy_01", "layer": "Enemy" } },
     { "tool": "manage_gameobject", "params": { "action": "modify", "target": "Enemy_02", "layer": "Enemy" } },
     { "tool": "manage_components", "params": { "action": "set_property", "target": "Enemy_01", "component_type": "BoxCollider", "property": "isTrigger", "value": true } },
     ...
   ])
```

## Persistence Paths

| Data Type | Storage Path |
|-----------|--------------|
| SO Template Definitions | `Assets/UnityAccelerator/Config/LevelDesign/Templates/{className}.json` |
| Batch Configuration Rules | `Assets/UnityAccelerator/Config/LevelDesign/BatchRules/{name}.json` |

Loading priority: Custom templates (Unity project directory) take precedence over built-in templates (Power package directory).

## Usage Scenarios

### Scenario 1: Generate Inspector for a MonoBehaviour (Architectural Visualization)

Example request: "Generate a custom Inspector for BuildingProperties"

→ Query BuildingProperties's fields → Call `generateInspectorScript` → Write to `Assets/Editor/BuildingPropertiesInspector.cs` → Refresh

### Scenario 1b: Generate Inspector for a MonoBehaviour (Game Development)

Example request: "Generate a custom Inspector for EnemyConfig"

→ Query EnemyConfig's fields → Call `generateInspectorScript` → Write to `Assets/Editor/EnemyConfigInspector.cs` → Refresh

### Scenario 2: Create a Configuration ScriptableObject (Training Simulation)

Example request: "Create a training module config with module name, learning objectives (string list), assessment criteria, and resource links"

→ Assemble `SOTemplateDefinition` → Call `generateSOScript` → Write SO script + Inspector → Save template JSON → Refresh

### Scenario 2b: Create a Configuration ScriptableObject (Game Development)

Example request: "Create a level config with name, difficulty (1-10), time limit, spawn points, and reward items"

→ Assemble `SOTemplateDefinition` (with `[Range(1,10)]` validation) → Call `generateSOScript` → Write SO script + Inspector → Save template JSON → Refresh

### Scenario 2c: Create an Architectural Project Configuration

Example request: "Create a building config with building name, floor count (int), material properties (nested: material name + cost), and lighting presets"

→ Assemble `SOTemplateDefinition` (with `[Min(1)]` validation on floor count) → Call `generateSOScript` → Write SO script + Inspector → Save template JSON → Refresh

### Scenario 2d: Create a Simulation Parameter Configuration

Example request: "Create a simulation config with simulation name, time scale (float, 0.1-10), particle count (int), physics material list (nested: name + friction + bounciness), and visualization mode enum"

→ Assemble `SOTemplateDefinition` (with `[Range(0.1f, 10f)]` validation on time scale) → Call `generateSOScript` → Write SO script + Inspector → Save template JSON → Refresh

### Scenario 3: Batch Set Scene Object Layers

Example request: "Set the Layer of all objects with 'Enemy' in their name to Enemy"

→ Call `parseBatchRules` → Use `find_gameobjects` to filter → Show preview → After confirmation, apply via `batch_execute` → Return summary

### Scenario 3b: Batch Configure Architectural Walkthrough Objects

Example request: "Set the Layer of all objects tagged 'Furniture' to Interactable and enable their MeshCollider"

→ Call `parseBatchRules` → Use `find_gameobjects` to filter by tag → Show preview → After confirmation, apply via `batch_execute` → Return summary

### Scenario 4: Reuse a Saved Template

Example request: "List all level config templates"

→ Call `listTemplates` → Display names, descriptions, and field summaries

Example request: "Load the LevelConfig template and generate scripts"

→ Call `loadTemplate("LevelConfig")` → Call `generateSOScript` → Write files → Refresh

## Script Generation & Compilation Troubleshooting

| Error Scenario | Handling |
|----------------|----------|
| Target class does not exist | Return error message, list similar class names for selection |
| Layer/Tag does not exist | Return error message, provide list of defined Layers and Tags in the project |
| Template name conflict | Prompt the developer to choose overwrite or rename |
| MCP connection lost | Display connection error message, guide user to verify Unity Editor and MCP Server status |
| Unity is compiling | Wait for compilation to complete before continuing |
| JSON parse failure | Return parse error message, fall back to built-in template |

## Level Tooling Design Principles

- Confirm the target class exists before generating Inspector scripts to avoid generating invalid scripts
- For ScriptableObject templates, add a Tooltip to each field for easier understanding by designers
- Always confirm the preview list before batch configuration to avoid accidentally modifying unrelated objects
- Save frequently used batch rules as JSON for reuse across levels
- Use `[System.Serializable]` classes for nested structure fields to keep the Inspector expandable
- Prefer built-in attributes like `[Range]`, `[Min]` for validation rules; place complex logic in `OnValidate`
