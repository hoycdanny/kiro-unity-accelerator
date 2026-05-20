# Asset Automation Steering
<!-- File Purpose / 本檔案用途: Unity asset automation steering guide / Unity 資產設定自動化的 steering 指引，涵蓋資產批次設定、類型偵測、匯入參數管理及資產管線最佳實踐。 -->

> **Context**: This steering file is designed for AI assistants helping developers with Unity asset automation tasks. It uses "the developer" to refer to the human being assisted.

## Role and Purpose

Unity's asset import pipeline can be automated through batch operations and preset configurations. When working on Unity projects, manual import-setting management is time-consuming: when multiple textures are imported, discovering that compression settings need adjustment across all files requires manually adjusting each file individually, which is time-consuming and error-prone. This guide focuses on what actually works in production — using filename conventions to detect asset type, applying Asset Presets in batch, and producing a change summary the developer can review before committing. Use it whenever the developer needs to configure many assets at once or wants to enforce import settings as code.

## Asset Import & Configuration Workflow

### Standard Asset Batch Operation Flow

```
Scan → Detect type → Load Preset → batch_execute apply → Generate change summary
```

1. **Scan folder**: Use `manage_asset(action: "list")` to recursively scan the specified folder and retrieve a list of all asset files
2. **Detect asset type**: Automatically determine asset type based on file naming conventions (see rules below) and suggest the applicable Asset_Preset
3. **Load Preset**: Load the corresponding Asset_Preset JSON from `templates/presets/` (custom location takes priority; falls back to built-in template if not found)
4. **Batch apply**: Use `batch_execute` to batch-apply the parameters defined in the Preset to all selected assets
5. **Generate summary**: Compare each asset's parameters before and after application, producing a structured change summary

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

The examples below cover the three operations the developer will use most often: scanning, applying settings to a single asset, and applying settings in batch. Real workflows usually chain these together — scan first to confirm the file list, dry-run on one asset, then batch-execute. A brief manual review between scan and batch-execute is recommended, especially the first time a Preset is run against a new folder.

### Scan Folder

```
manage_asset(action: "list", path: "Assets/Characters/", recursive: true, filter: "*.fbx,*.obj")
```

Returns a list of all asset paths matching the filter conditions under the specified folder.

### Set Model Import Parameters

```
manage_asset(action: "set_import_settings", path: "Assets/Characters/hero.fbx", settings: {
  "rigType": "Humanoid",
  "materialImportMode": "ImportViaMaterialDescription",
  "meshCompression": "Medium",
  "normalMapEnabled": true
})
```

### Batch Execute

```
batch_execute(commands: [
  { "tool": "manage_asset", "args": { "action": "set_import_settings", "path": "Assets/Characters/hero.fbx", "settings": { "rigType": "Humanoid" } } },
  { "tool": "manage_asset", "args": { "action": "set_import_settings", "path": "Assets/Characters/npc_guard.fbx", "settings": { "rigType": "Humanoid" } } }
])
```

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
- Continue processing remaining assets; do not interrupt the entire batch due to a single failure

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
| WebGL | ETC2 / ASTC | Good browser compatibility |
| Universal (platform uncertain) | NormalQuality | Safe default choice |

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
