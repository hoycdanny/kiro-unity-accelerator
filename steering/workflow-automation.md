# Workflow Automation Steering

<!-- File Purpose / 本檔案用途: Unity workflow automation steering guide / Unity 工作流程自動化的 steering 指引，涵蓋多步驟工作流範本執行、DAG 依賴驗證、拓撲排序、進度回報及失敗處理策略。 -->

## Role and Purpose

Multi-step workflows in Unity — "import these assets, configure them, build, then run tests" — can be time-consuming and error-prone when steps have ordering constraints (when some steps must complete before others can begin). Automating them improves repeatability and helps ensure prerequisites are not skipped, which is particularly valuable during team onboarding. This guide covers how to define, validate, and execute workflow templates with proper dependency ordering and failure recovery. Use it whenever the developer asks to automate a sequence of operations or create a reusable workflow template.

## Workflow

### Execute Workflow Templates

1. **Load template**: Load WorkflowTemplate JSON from `templates/workflows/` or your custom location
2. **Validate dependencies**: Check that `dependsOn` relationships between steps are valid (no cycles, referenced steps exist)
3. **Topological sort**: Sort steps by dependency order, ensuring each step executes only after its dependencies complete
4. **Execute sequentially**: Execute MCP tool calls in sorted order
5. **Report progress**: After completing each step, calculate and report overall progress percentage (K/N × 100)
6. **Handle errors**: If a step fails, decide to pause, skip, or abort based on `onFailure` setting

### Create Custom Workflows

1. Ask you about the workflow's purpose and steps
2. Confirm the corresponding MCP tool and parameters for each step
3. Confirm dependencies between steps
4. Validate dependency legality
5. Save as WorkflowTemplate JSON

## MCP Tool Usage

> **Verified syntax**: confirmed against a live unity-mcp connection.

### Execute a Single Workflow Step

```
manage_asset(action: "search", path: "Assets/", search_pattern: "*")
```

There is no `list` action or `recursive` flag — `search` under a folder path already covers subfolders; use `search_pattern` to filter by glob.

### Batch Execute Multiple Steps

```
batch_execute(commands: [
  { "tool": "manage_asset", "params": { "action": "search", "path": "Assets/", "search_pattern": "*.fbx" } },
  { "tool": "manage_asset", "params": { "action": "modify", "path": "Assets/Characters/hero.fbx", "properties": { "rigType": "Humanoid" } } }
])
```

Each command's second key is `params`, not `args`.

### Trigger Build Step

```
manage_build(action: "build", target: "android", scenes: "[\"Assets/Scenes/Main.unity\"]", output_path: "Builds/Android")
```

Use `manage_build`, not `manage_editor` — `manage_editor` has no build action. `target` uses the lowercase short name (`android`, not `Android`), and `scenes`/`output_path` are the real param names (a JSON array string and snake_case, respectively).

## Step Dependency Validation (DAG Topological Sort)

> **What is topological sort?** It determines the correct order to execute steps when some steps depend on others completing first — like determining which tasks must complete before others can begin, such as installing dependencies before building software. The algorithm automatically calculates this order so dependent steps always run after their prerequisites.

### Valid Dependency Rules

- Each step's `dependsOn` array IDs must correspond to existing steps in the workflow
- Dependencies must not form cycles (A → B → C → A is invalid)
- Steps with no dependencies can execute in parallel (but currently executed serially)

### Topological Sort Algorithm (Kahn's Algorithm)

1. Build in-degree count for each step (how many other steps it depends on)
2. Add steps with in-degree 0 (no dependencies) to a queue
3. Dequeue a step, add it to the sorted result
4. For all successor steps, decrement in-degree by 1; if in-degree becomes 0, add to queue
5. If sorted result count is less than total step count, a cycle exists

### Validation Failure Handling

- If a cycle is detected, report the cycle path and reject saving
- If `dependsOn` references a non-existent step ID, report the error and list invalid references
- Suggest you fix dependencies and re-validate

## Failure Handling Guide

### onFailure Strategies

| Strategy | Behavior |
|----------|----------|
| `pause` | Pause workflow, record error, prompt you to choose: Retry / Skip / Abort |
| `skip` | Record error, skip the step, continue to next step |
| `abort` | Record error, immediately abort the entire workflow |

### Options After Pause

- **Retry**: Re-execute the failed step
- **Skip**: Skip the failed step, continue subsequent steps (note: steps depending on this step will also be skipped)
- **Abort**: Terminate the entire workflow, report completed and incomplete steps

### Error Log Format

```
[Workflow Name] Step "Step Name" (ID: step-id) execution failed
  Error Type: MCP tool call failed
  Tool: manage_asset
  Action: modify
  Error Message: Asset path not found: Assets/Missing/file.fbx
  onFailure Strategy: pause
  Awaiting your decision...
```

## Progress Calculation

- Progress percentage = (completed steps / total steps) × 100
- Skipped steps count toward completed steps
- Progress updates in real-time after each step completes

## Built-in Workflow Templates

### 1. Asset Import & Setup (asset-import-setup)
- Steps: Scan folder → Detect asset types → Load Preset → Batch apply → Generate summary

### 2. Build & Deploy (build-and-deploy)
- Steps: Load build config → Execute build → Monitor progress → Verify artifacts

### 3. Test Execution (test-execution)
- Steps: Run EditMode tests → Run PlayMode tests → Aggregate results

## Best Practices

- Set appropriate `onFailure` strategy for each step: use `pause` for critical steps, `skip` for non-critical
- Use `dependsOn` to explicitly define step dependencies, avoid implicit dependencies
- Workflow templates should remain generic; specific parameters are provided by you at execution time
- Regularly review custom workflows, remove steps that are no longer needed
