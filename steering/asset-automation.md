# Asset Automation Steering
<!-- File Purpose / 本檔案用途: Unity asset automation steering guide / Unity 資產設定自動化的 steering 指引，涵蓋資產批次設定、類型偵測、匯入參數管理、資產管線最佳實踐，以及 Unity 6.4 的 PVRTC 移除與自訂匯入器相依性宣告。 -->

> **Context**: This steering file is designed for AI assistants helping developers with Unity asset automation tasks. It uses "the developer" to refer to the human being assisted.

## Role and Purpose

Unity's asset import pipeline can be automated through batch operations and preset configurations. When working on Unity projects, manual import-setting management is time-consuming: when multiple textures are imported, discovering that compression settings need adjustment across all files requires manually adjusting each file individually, which is time-consuming and error-prone. This guide focuses on what actually works in production — using filename conventions to detect asset type, applying Asset Presets in batch, and producing a change summary the developer can review before committing. Use it whenever the developer needs to configure many assets at once or wants to enforce import settings as code.

## Asset Import & Configuration Workflow

### Standard Asset Batch Operation Flow

```
Scan → Detect type → Load Preset → batch_execute apply → Generate change summary
```

1. **Scan folder**: Use `manage_asset(action: "search", path: "Assets/Characters/", search_pattern: "*.fbx")` to scan the specified folder and retrieve matching asset paths (there is no `list` action — `search` with `search_pattern` is the real syntax; run it once per extension since `search_pattern` takes a single glob, not a comma-separated list)
2. **Detect asset type**: Automatically determine asset type based on file naming conventions (see rules below) and suggest the applicable Asset_Preset
3. **Load Preset**: Load the corresponding Asset_Preset JSON from `templates/presets/` (custom location takes priority; falls back to built-in template if not found)
4. **Batch apply**: Use `batch_execute` to batch-apply the parameters defined in the Preset to all selected assets via `manage_asset(action: "modify", path: ..., properties: {...})`. **Pass `fail_fast: false` explicitly** — it defaults to `true`, which aborts the whole batch at the first bad asset instead of continuing as the failure recovery below requires. Keep each batch within the command cap (configurable in the Unity MCP Tools window, default 25, hard maximum 100) and send successive batches for a larger folder. **Batch only Unity-side work like this** — `batch_execute` bypasses the Python server layer, so a server-layer action fails inside a batch with a misleading `Unknown action` error (see "`batch_execute` is not equivalent to direct calls" in `unity-general.md`); if a batched command reports an unknown action, retest it as a direct call before concluding anything
5. **Generate summary**: Compare each asset's parameters before and after application (via `manage_asset(action: "get_info")`), producing a structured change summary

## Naming Convention Rules

Automatically detect asset type based on keywords in the file name:

| Naming Pattern | Asset Type | Corresponding Preset |
|----------------|------------|---------------------|
| `_char_`, `_character_`, `_hero_`, `_npc_`, `_player_` | 3D Character | `3d-character.json` |
| `_env_`, `_prop_`, `_building_`, `_terrain_`, `_rock_` | 3D Environment | `3d-environment.json` |
| `_sprite_`, `_2d_`, `_pixel_` | 2D Sprite | `2d-sprite.json` |
| `_ui_`, `_icon_`, `_hud_`, `_button_`, `_panel_` | UI Texture | `ui-texture.json` |
| `_sfx_`, `_bgm_`, `_music_`, `_audio_`, `_sound_` | Audio SFX | `audio-sfx.json` |

Matching rules:
- Matching is case-insensitive
- A file name containing any of the above keywords is considered a match
- If the file name does not match any pattern, no Preset is automatically suggested; the developer must select manually

## MCP Tool Usage Examples

> **Verification scope**: checked on **2026-10-21** against MCP for Unity **9.6.8** and then again against **10.3.0**, both connected to Unity **6000.4.6f1**. The read-only sweeps proved that `manage_asset` has no `list` and no `set_import_settings` action (the 10.3.0 rejection returned the identical valid-action list, so the contract is **verified on both versions**), and that `manage_asset(action: "search")` with a single-glob `search_pattern` works. A later write-path pass on 10.3.0 additionally verified **`manage_asset(action: "create_folder")`** (returns guid, instanceID, `isFolder: true`) and **`manage_asset(action: "delete")`** (removed a folder together with the asset inside it), with every write confined to an isolated `Assets/_MCPVerify/` folder that was deleted afterwards. The `modify` call below (and its importer property names) is **still not** live-verified on either version — nor are `import`, `duplicate`, `move` and `rename` — it is reconciled against the MCP for Unity v10.3.0 generated tool reference. A validation error from the live call lists the real field names and overrides this file.

The examples below cover the three operations the developer will use most often: scanning, applying settings to a single asset, and applying settings in batch. Real workflows usually chain these together — scan first to confirm the file list, dry-run on one asset, then batch-execute. A brief manual review between scan and batch-execute is recommended, especially the first time a Preset is run against a new folder.

### Scan Folder

```
manage_asset(action: "search", path: "Assets/Characters/", search_pattern: "*.fbx")
```

Returns a paginated list of asset paths matching the pattern under the specified folder. Run once per extension (e.g. a second call with `search_pattern: "*.obj"`) since the pattern is a single glob, not a comma-separated list. Use `page_size`/`page_number` if the folder has more assets than one page.

### Set Model Import Parameters

```
manage_asset(action: "modify", path: "Assets/Characters/hero.fbx", properties: {
  "rigType": "Humanoid",
  "materialImportMode": "ImportViaMaterialDescription",
  "meshCompression": "Medium",
  "normalMapEnabled": true
})
```

### Batch Execute

```
batch_execute(commands: [
  { "tool": "manage_asset", "params": { "action": "modify", "path": "Assets/Characters/hero.fbx", "properties": { "rigType": "Humanoid" } } },
  { "tool": "manage_asset", "params": { "action": "modify", "path": "Assets/Characters/npc_guard.fbx", "properties": { "rigType": "Humanoid" } } }
], fail_fast: false)
```

Each command's second key is `params`, not `args` — a mismatch there causes a validation error rather than silently being ignored. `fail_fast: false` is required for best-effort batching because the parameter **defaults to `true`**; without it the first failing asset aborts every command after it. The command cap is configurable in the Unity MCP Tools window (default 25, hard maximum 100), so split a large folder into successive batches.

### Get Current Asset Settings (for change summary comparison)

```
manage_asset(action: "get_info", path: "Assets/Characters/hero.fbx")
```

## Asset Import Failure Troubleshooting

Batch operations fail in predictable ways: a file is locked, an asset path was renamed, or a Preset references a feature the importer does not support. The patterns below describe how to recover gracefully — the goal is to record the failure, leave the asset in a known state, and keep moving. We have found this matters most when batches are large enough that re-running everything would be slow.

### Apply Failure Recovery

- Before applying a Preset, record the asset's original parameter state
- If an MCP tool call returns an error, immediately revert that asset to its original state
- Record the error reason (asset path, error message)
- Continue processing remaining assets; do not interrupt the entire batch due to a single failure — this requires `fail_fast: false` on the `batch_execute` call, since the parameter defaults to `true`

### Partial Batch Operation Failure

- Record the success/failure status of each operation
- Final report format: "Succeeded: N, Failed: M"
- List each failed asset's path and error reason

### Common Error Scenarios

| Error | Handling |
|-------|----------|
| Asset path does not exist | Inform the developer and suggest the correct path |
| File is locked | Prompt the developer to close the program occupying the file |
| Unsupported file type | Skip and inform the developer that the file type is not in the supported list |
| JSON Preset format error | Fall back to built-in template, inform the developer that the custom template has issues |

## Unity 6.4: Custom Importers Must Declare Their Dependencies

> **Version baseline**: Unity 6.4 (stream `6000.4`, pinned patch `6000.4.12f1`). Anything past 6.4 is forward-looking and unverified — see `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

Unity 6.4 narrows artifact-dependency behaviour: **a dependent asset reimports only when the dependency's *import result* changes**, rather than whenever the dependency is touched. This matters for automation because it changes when a batch of `manage_asset(action: "modify", ...)` calls actually propagates.

- If the project has custom **`ScriptedImporter`** or **`AssetPostprocessor`** code, it may need to declare its inputs explicitly with **`DependsOnSourceAsset`** or **`DependsOnArtifact`**. An importer that reads a sibling file (a shared config, a lookup table, a palette) without declaring it will no longer cause a reimport when that file changes
- **Symptom**: after a batch apply, some assets keep their old settings until someone reimports them by hand. On 6.4 that usually means a missing dependency declaration in a custom importer, not a failed `manage_asset` call. Check `read_console()` for the absence of reimport activity before re-running the batch
- The companion analysis guidance is in `asset-dependencies.md`

Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21.

## Asset Pipeline Best Practices

### Rig Type Selection

| Asset Type | Recommended Rig | Reason |
|------------|----------------|--------|
| Humanoid characters with skeletal animation | Humanoid | Supports Mecanim animation retargeting |
| Non-humanoid animated models (animals, machines) | Generic | Supports custom skeleton animation |
| Environment models, props | None | No animation skeleton needed, reduces import time |
| Props with simple animation | Generic | Supports basic animation playback |

### Texture Compression Recommendations

| Target Platform | Recommended Compression Format | Reason |
|-----------------|-------------------------------|--------|
| Mobile (iOS/Android) | ASTC | Best balance of quality and file size |
| Desktop (Windows/Mac) | BC7 | High-quality compression, natively supported by desktop GPUs |
| WebGL / Web | ETC2 / ASTC | Good browser compatibility |
| Universal (platform uncertain) | NormalQuality | Safe default choice |

> **Unity 6.4: PVRTC is gone.** PVRTC was removed in Unity 6.4 and can no longer be targeted on import — **use ASTC (preferred) or ETC on iOS**. Never emit PVRTC in a generated import setting, and treat an existing PVRTC setting as something to migrate when a project moves to 6.4. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21.

### Mesh Compression Recommendations

| Asset Type | Recommended Compression Level | Reason |
|------------|------------------------------|--------|
| Main character models | Off or Low | Maintain highest visual quality |
| NPCs / distant characters | Medium | Balance quality and performance |
| Environment models | Medium or High | Large quantity, significant compression benefit |
| UI elements | Off | Typically very low poly count, no compression needed |

### Supported Asset File Types

**3D Models**: `.fbx`, `.obj`, `.dae`, `.3ds`, `.blend`
**Textures**: `.png`, `.jpg`, `.jpeg`, `.tga`, `.psd`, `.tiff`, `.bmp`, `.gif`, `.exr`, `.hdr`
**Audio**: `.wav`, `.mp3`, `.ogg`, `.aiff`, `.flac`
**Materials & Shaders**: `.mat`, `.shader`, `.shadergraph`, `.cginc`, `.hlsl`
**Animations**: `.anim`, `.controller`
**Other**: `.prefab`, `.asset`, `.unity`
