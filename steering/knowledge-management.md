# Knowledge Management & Documentation Integration Steering

<!-- File Purpose / 本檔案用途: Unity team knowledge management steering guide / Unity 團隊知識管理的 steering 指引，涵蓋文件建立與搜尋、API 變更偵測、新人入職清單生成及文件過期偵測。 -->

## Role and Purpose

This document provides Unity team knowledge management expertise. When the developer requests creating, searching, or managing technical documentation, use MCP tools and knowledge base features to help the team centrally manage technical knowledge, track API changes, generate onboarding checklists, and automatically detect stale documents.

> **Why this matters**: Maintaining searchable documentation reduces time spent on repeated questions, whether working solo, in a small team, or in a large organization. The 180-day staleness threshold is based on typical Unity API update cycles.

## Workflows

### Create & Search Documents
1. **Create Document**: Collect title, content, tags, and related assets from the developer to create a KnowledgeEntry JSON
2. **Search Documents**: Search titles and tags by keyword, results sorted by relevance score descending
3. **Related Query**: When the developer selects a script or component, query documents matching relatedAssets and display links

### API Change Detection
1. Use `manage_packages(action: "list_packages")` to get Unity package versions used in the project (asynchronous — returns `{job_id}`; poll with `action: "status", job_id: ...`)
2. Use `manage_asset(action: "search", path: "Assets/", search_pattern: "*.cs")` to enumerate all C# scripts in the project (`manage_script` has no `list` action), then `manage_script(action: "read", name: ..., path: ...)` per script to read content
3. Parse Unity APIs used in scripts (using statements and method calls)
4. Compare against API change list, identify affected APIs in the project
5. Generate migration guides for each affected API and store in Knowledge_Base

### Onboarding Checklist Generation
1. Use `execute_code` (e.g. `return UnityEngine.Application.unityVersion;`) or `manage_packages(action: "list_packages")` to understand project structure/environment — there is no standalone `project_info` tool call
2. Scan core documents in Knowledge_Base (tags containing "architecture", "setup", "convention")
3. Auto-generate onboarding checklist items based on project structure
4. Includes: project architecture overview, naming conventions, build process, test process, common issues

### Document Staleness Detection
1. Scan all KnowledgeEntry `updatedAt` fields
2. If older than 180 days, mark status as `NeedsReview`
3. Notify the document maintainer (if applicable) for review
4. Flag stale documents in search results to alert users about timeliness

## API Change Detection Guide

### Comparison Logic
- Input: Set of APIs used in project + new version change list
- Output: All APIs that appear in the change list and are used by the project
- Excludes APIs not used by the project (to reduce noise)

### Migration Guide Template
```markdown
## API Migration Guide: {API Name}

### Change Summary
- **Old API**: `{old API signature}`
- **New API**: `{new API signature}`
- **Change Type**: {Deprecated | Removed | Signature Changed | Behavior Changed}

### Affected Scripts
- `{script path}` line {line number}

### Migration Steps
1. {specific modification steps}
2. {verification steps}

### Notes
- {compatibility considerations}
```

### Worked Example (Reported Unity 6.x Breaking Change — Verify Before Trusting)

```markdown
## API Migration Guide: OculusXR Package Deprecation/Removal

### Change Summary
- **Old API**: `com.unity.xr.oculus` (OculusXR package)
- **New API**: `com.unity.xr.openxr` (OpenXR Plugin package)
- **Change Type**: Deprecated/Removed — Unity's public "planned breaking changes" communications describe OculusXR as deprecated starting Unity 6.5 and removed around Unity 6.7. This has not been independently verified against a live project with the package installed; confirm via `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status", job_id: ...`) on the actual target project before treating removal as settled fact for that project's specific Unity version

### Affected Scripts
- Any script referencing `Unity.XR.Oculus` namespace APIs

### Migration Steps
1. Install the OpenXR Plugin package via `manage_packages(action: "add_package", package: "com.unity.xr.openxr")` (asynchronous — poll `action: "status", job_id: ...`)
2. Enable the Meta Quest feature group under Project Settings → XR Plug-in Management → OpenXR
3. Replace any direct `Unity.XR.Oculus` API calls with OpenXR-equivalent APIs or the Meta XR SDK's OpenXR-based interfaces
4. Re-test on-device input, hand tracking, and passthrough features, as OpenXR's abstraction layer may surface slightly different feature-availability checks

### Notes
- Recommend migrating to OpenXR regardless of the exact Unity version, since OculusXR is deprecated either way — but verify current package presence for the specific project before citing a precise removal version to the developer
```

When Unity publishes a version-specific breaking-changes list, treat it as a high-value input to API Change Detection, but cross-reference the project's actual installed packages (`manage_packages(action: "list_packages")` — asynchronous, poll with `action: "status"`) against the announced removals/deprecations before presenting them as confirmed for that project — public breaking-changes lists describe Unity's intent, not necessarily the exact state of every individual project's installed packages.

## Document Staleness Detection Guide

### 180-Day Threshold Rules
- `updatedAt` ≤ 180 days ago → status = `Active`
- `updatedAt` > 180 days ago → status = `NeedsReview`
- `reviewDeadline` = `updatedAt` + 180 days

### Staleness Handling Process
1. Periodically scan all KnowledgeEntry records
2. Mark stale documents as `NeedsReview`
3. Visually flag stale status in search results
4. Suggest document maintainers (or the team, for solo developers) update or confirm content is still valid

## MCP Tool Usage Examples

> **Verified syntax**: confirmed against a live unity-mcp connection.

### Get Project Package Info
```
manage_packages(action: "list_packages")
→ { data: { job_id: "..." } }  // asynchronous — poll with action: "status", job_id: "..."
→ { data: { packages: [{ name: "com.unity.render-pipelines.universal", version: "17.5.0", ... }, ...] } }
```

### Scan API Usage in Scripts
```
manage_script(action: "read", name: "PlayerController", path: "Assets/Scripts")
→ { content: "using UnityEngine;\nusing UnityEngine.UI;\n...", lineCount: 150 }
```

`name` (no `.cs` extension) and `path` (containing folder) are both required — there is no single full-path param.

### Query Related Documents

There is no scene-search-based way to query a knowledge base via unity-mcp tools (`find_gameobjects` searches scene GameObjects by name/tag/layer/component/path, not documentation). The relatedAssets lookup described here is application logic on top of the Knowledge_Base storage (JSON/Markdown files), not an MCP tool call — implement it as a plain text/JSON search over `Assets/UnityAccelerator/Knowledge/`.

## Error Handling

- If knowledge base is empty, inform the developer and suggest creating the first document
- If search returns no results, suggest broadening keywords or checking tags
- If API change list format is invalid, skip invalid entries and inform the developer
- If document JSON is corrupted, log error and skip that entry

## Best Practices

- Add at least 2-3 tags per document to improve search hit rate
- Associate corresponding script paths or GUIDs in relatedAssets
- Regularly review stale documents to maintain knowledge base freshness
- Generate onboarding checklist immediately when new members join to accelerate ramp-up
- Run comparison immediately after major API changes to avoid discovering issues post-upgrade
