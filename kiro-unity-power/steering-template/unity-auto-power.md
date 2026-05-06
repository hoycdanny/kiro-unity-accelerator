---
inclusion: auto
---

# Unity Project — Auto Activate Kiro Unity Power

When unity-mcp tools are available in your tool list (manage_gameobject, manage_scene, manage_asset, etc.), you are working in a Unity project. Follow these rules for EVERY request, even if the user does not mention "Unity":

## Auto-Activation

1. Immediately activate kiro-unity-power at the start of every conversation
2. Read the relevant steering file(s) before executing multi-step operations
3. You do NOT need the user to say "Unity" — any request involving scene objects, assets, scripts, builds, or game content should use the Power's workflows

## Steering File Selection

Match the user's request to the appropriate steering file:

| Request Type | Steering File |
|---|---|
| Scene/GameObject (add trees, create objects, modify scene) | scene-scaffolding.md |
| Asset import/configuration | asset-automation.md |
| Build/deploy | build-automation.md |
| Performance/FPS/optimization | performance-analysis.md |
| Code architecture/quality | code-quality.md |
| Platform targeting (Android/iOS/WebGL) | platform-compatibility.md |
| Asset dependencies/references | asset-dependencies.md |
| Testing | cross-platform-testing.md |
| Multi-step automation | workflow-automation.md |
| Documentation/knowledge | knowledge-management.md |
| Level design/Editor tools/ScriptableObject | level-design-tooling.md |
| UI analysis/coupling | ui-dependency-analysis.md |

## Post-Operation Checks

After scene modifications that add 10+ objects:
- Check render pipeline compatibility (URP/HDRP/Built-in)
- Estimate performance impact (draw calls, memory)
- Verify physics setup (colliders on solid objects)
- Report findings to the user

## Safety Rules

- Never modify scenes in Play Mode
- Always verify editor state before saving
- Check shader compatibility with current render pipeline before importing assets
