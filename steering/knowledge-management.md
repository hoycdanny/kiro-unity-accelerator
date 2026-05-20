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
1. Use `manage_packages(action: "list")` to get Unity package versions used in the project
2. Use `manage_script(action: "list")` to scan all C# scripts in the project
3. Parse Unity APIs used in scripts (using statements and method calls)
4. Compare against API change list, identify affected APIs in the project
5. Generate migration guides for each affected API and store in Knowledge_Base

### Onboarding Checklist Generation
1. Use `project_info` to get project structure
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

### Get Project Package Info
```
manage_packages(action: "list")
→ [{ name: "com.unity.render-pipelines.universal", version: "14.0.8" }, ...]
```

### Scan API Usage in Scripts
```
manage_script(action: "read", path: "Assets/Scripts/PlayerController.cs")
→ { content: "using UnityEngine;\nusing UnityEngine.UI;\n...", lineCount: 150 }
```

### Query Related Documents
```
find_gameobjects(filter: "PlayerController")
→ Query Knowledge_Base for documents where relatedAssets contains this script
```

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
