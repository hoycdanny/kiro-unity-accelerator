# Knowledge Management & Documentation Integration Steering

<!-- File Purpose / 本檔案用途: Unity team knowledge management steering guide / Unity 團隊知識管理的 steering 指引，涵蓋文件建立與搜尋、API 變更偵測（含 Unity 6.4 已知 API 變更清單）、新人入職清單生成及文件過期偵測。 -->

## Role and Purpose

This document provides Unity team knowledge management expertise. When the developer requests creating, searching, or managing technical documentation, use MCP tools and knowledge base features to help the team centrally manage technical knowledge, track API changes, generate onboarding checklists, and automatically detect stale documents.

> **Why this matters**: Maintaining searchable documentation reduces time spent on repeated questions, whether working solo, in a small team, or in a large organization. The 180-day staleness threshold is based on typical Unity API update cycles.

> **Tool group note**: `manage_packages`, `manage_asset`, `manage_script` and `read_console` are all in the default-on `core` group. `execute_code` is declared in `scripting_ext`, and `unity_reflect` / `unity_docs` in `docs` — both groups are reported off by default, yet all three tools were callable with no activation on the live-verified install. Call them directly; run `manage_tools(action: "activate", group: "scripting_ext")` or `(group: "docs")` **only if the tool is reported as not existing**. Their parameter is `class_name` (never `type_name`); `get_member` adds `member_name`; `search` takes `query` plus an optional `scope`; `unity_docs(action: "get_doc")` takes `class_name` plus optional `member_name` and `version`. The canonical activation procedure is "Tool Group Activation (`manage_tools`)" in `unity-general.md`.

> **Version baseline**: this file targets **Unity 6.4** (stream `6000.4`, pinned patch `6000.4.12f1`). Anything past 6.4 is forward-looking and unverified; the full policy is in `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

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
1. Read the `mcpforunity://project/info` resource for the project root, Unity version and platform, and `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status", job_id: ...`) for installed packages. There is no standalone `project_info` **tool call**, but the **resource** does exist and needs no tool group — resources read, tools mutate
2. Scan core documents in Knowledge_Base (tags containing "architecture", "setup", "convention")
3. Auto-generate onboarding checklist items based on project structure
4. Includes: project architecture overview, naming conventions, build process, test process, common issues

### Document Staleness Detection
1. Scan all KnowledgeEntry `updatedAt` fields
2. If older than 180 days, mark status as `NeedsReview`
3. Notify the document maintainer (if applicable) for review
4. Flag stale documents in search results to alert users about timeliness

## Unity 6.4 API Change Baseline

Seed the API Change Detection pass with these. All of them are documented 6.4 changes, sourced from [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) and [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), both retrieved 2026-10-21. They are documentation-sourced, not observed on the developer's Editor — label them that way in a generated migration guide.

| API / behaviour | Change on 6.4 | What to scan for |
|---|---|---|
| `LightShadowCasterMode` | Two enum members renamed: `NonLightmappedOnly` → `ShadowMask`, `Everything` → `DistanceShadowMask`. The API updater rewrites these automatically | Any lighting script that sets `Light.lightShadowCasterMode`. Generated or hand-written code using the old names will not compile against 6.4 until the updater runs |
| `Object.Destroy` | Now invokes `OnDisable` on **all descendants**, matching `DestroyImmediate`. Teardown code that manually propagated disable callbacks down the hierarchy now fires them twice | `OnDisable` implementations plus any manual child-walking teardown helper. Remove the manual propagation rather than guarding it |
| `InstanceID` | Deprecated in favour of a new `EntityId` type | Code that casts instance IDs to/from `int`, infers asset-vs-scene from the sign, calls `GetHashCode` on the id, round-trips it through `ToString` + `int.Parse`, or sorts by id to recover creation order. Treat the id as an opaque token |
| URP Compatibility Mode | **Removed**, along with the `URP_COMPATIBILITY_MODE` scripting define | Custom `ScriptableRenderPass` classes still using the legacy `Execute`/`Configure` pattern, and any `#if URP_COMPATIBILITY_MODE` block. Render Graph (`RecordRenderGraph`) is the only path on 6.4 |
| `IVolume` | Removed; use `VolumeGizmoDrawer`. SRP Core's dependency on `com.unity.modules.physics` is now soft — disabling the module shrinks builds but **local Volumes stop working** | `IVolume` implementations, and any build that disables the physics module while relying on local Volumes |
| `[SerializeReference]` | Unity now warns if the assigned class or **any ancestor** lacks `[Serializable]` | `[SerializeReference]` fields; check the whole base-class chain, not just the concrete type |
| PVRTC texture compression | **Removed** — can no longer be targeted on import. Use ASTC, or ETC | iOS texture import settings and any import automation that names PVRTC |
| HoloLens 2 | Platform support and plug-in **deprecated**; migrate to the OpenXR plug-in | Projects depending on the HoloLens 2 plug-in. Confirm with `manage_packages(action: "list_packages")` before asserting it for a specific project |
| Asset Database artifact dependencies | Narrowed: dependents reimport only when the dependency's *import result* changes. Some `ScriptedImporter` / `AssetPostprocessor` code now needs explicit `DependsOnSourceAsset` / `DependsOnArtifact` declarations | Custom importers and postprocessors. See `asset-dependencies.md` and `asset-automation.md` for the detail |
| Project Auditor | Now ships inside the Editor rather than as a package; several analyzer APIs became `internal` | Build/CI scripts that install the Project Auditor package, and code calling its analyzer APIs. See `code-quality.md` |

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

### Worked Example (XR Plug-in Migration)

```markdown
## API Migration Guide: XR Plug-in Consolidation on OpenXR

### Change Summary
- **Old API**: `com.unity.xr.oculus` (OculusXR package); the HoloLens 2 platform plug-in
- **New API**: `com.unity.xr.openxr` (OpenXR Plugin package)
- **Change Type**: Deprecated — two separate facts, with different confidence levels:
  - **Documented for 6.4**: HoloLens 2 platform support and its plug-in are deprecated; the documented migration path is the OpenXR plug-in ([Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21)
  - **Reported, removal release unverified**: Unity's "planned breaking changes" communications describe OculusXR as deprecated and slated for removal in a later 6.x Update release. The deprecation is reported; the removal release was not verified against a project with the package installed. Confirm via `manage_packages(action: "list_packages")` (asynchronous — poll `action: "status", job_id: ...`) on the actual target project before treating removal as settled fact

### Affected Scripts
- Any script referencing `Unity.XR.Oculus` namespace APIs
- Any project depending on the HoloLens 2 plug-in

### Migration Steps
1. Install the OpenXR Plugin package via `manage_packages(action: "add_package", package: "com.unity.xr.openxr")` (asynchronous — poll `action: "status", job_id: ...`)
2. Enable the Meta Quest feature group under Project Settings → XR Plug-in Management → OpenXR
3. Replace any direct `Unity.XR.Oculus` API calls with OpenXR-equivalent APIs or the Meta XR SDK's OpenXR-based interfaces
4. Re-test on-device input, hand tracking, and passthrough features, as OpenXR's abstraction layer may surface slightly different feature-availability checks

### Notes
- Recommend migrating to OpenXR regardless of the exact Unity version, since both OculusXR and the HoloLens 2 plug-in are deprecated either way — but verify current package presence for the specific project rather than citing a removal version to the developer
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
→ { data: { packages: [{ name: "com.unity.render-pipelines.universal", version: "17.4.0", ... }, ...] } }
```

### Scan API Usage in Scripts
```
manage_script(action: "read", name: "PlayerController", path: "Assets/Scripts")
→ { content: "using UnityEngine;\nusing UnityEngine.UI;\n...", lineCount: 150 }
```

`name` (no `.cs` extension) and `path` (containing folder) are both required — there is no single full-path param.

### Query Related Documents

There is no scene-search-based way to query a knowledge base via unity-mcp tools (`find_gameobjects` searches scene GameObjects — its `search_method` values are `by_name`, `by_tag`, `by_layer`, `by_component`, `by_path` and `by_id` — not documentation). The relatedAssets lookup described here is application logic on top of the Knowledge_Base storage (JSON/Markdown files), not an MCP tool call — implement it as a plain text/JSON search over `Assets/UnityAccelerator/Knowledge/`.

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
