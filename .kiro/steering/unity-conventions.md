---
inclusion: auto
---

# Unity Project Conventions

## Input System Detection (CRITICAL)

Before generating ANY C# script that reads player input (keyboard, mouse, gamepad, touch), you MUST first detect which input system the project uses.

### Detection Methods (use any one)

**Method 1 — Check installed packages:**

```
Use manage_packages(action='list_packages') and look for com.unity.inputsystem
```

**Method 2 — Check for Input System assets:**

```
Look for *.inputactions files in Assets/ (e.g. Assets/InputSystem_Actions.inputactions)
```

**Method 3 — Execute code to check Player Settings:**

```csharp
#if ENABLE_INPUT_SYSTEM
    return "New Input System";
#elif ENABLE_LEGACY_INPUT_MANAGER
    return "Legacy Input Manager";
#endif
```

### Rules

- If **New Input System** is active → use `UnityEngine.InputSystem` namespace (`Keyboard.current`, `Mouse.current`, `Gamepad.current`)
- If **Legacy Input Manager** is active → use `UnityEngine.Input` (`Input.GetAxis()`, `Input.GetKey()`)
- If **Both** is active → prefer New Input System API
- **NEVER assume legacy input — always detect first**

### Common Indicators of New Input System

- `*.inputactions` files exist in Assets
- `com.unity.inputsystem` in package manifest
- Player Settings > Active Input Handling = "Input System Package (New)"

### New Input System Code Patterns

```csharp
// Movement
using UnityEngine.InputSystem;

Vector2 move = Keyboard.current != null
    ? new Vector2(
        (Keyboard.current.dKey.isPressed ? 1 : 0) - (Keyboard.current.aKey.isPressed ? 1 : 0),
        (Keyboard.current.wKey.isPressed ? 1 : 0) - (Keyboard.current.sKey.isPressed ? 1 : 0))
    : Vector2.zero;

// Mouse look
Vector2 mouseDelta = Mouse.current != null
    ? Mouse.current.delta.ReadValue()
    : Vector2.zero;

// Shooting
bool fire = Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame;

// Jump
bool jump = Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame;
```

---

## Render Pipeline Detection (CRITICAL)

Before creating materials, shaders, or any visual content, you MUST detect the active render pipeline.

### Detection Methods

**Method 1 — Check installed packages:**

```
Use manage_packages(action='list_packages') and look for:
- com.unity.render-pipelines.universal (URP)
- com.unity.render-pipelines.high-definition (HDRP)
- Neither = Built-in Render Pipeline
```

**Method 2 — Check pipeline settings:**

```csharp
var pipeline = UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline;
if (pipeline == null) return "Built-in";
if (pipeline.GetType().Name.Contains("Universal")) return "URP";
if (pipeline.GetType().Name.Contains("HDRender")) return "HDRP";
```

### Rules

- If **URP** → use `Universal Render Pipeline/Lit` shader (NOT `Standard`)
- If **HDRP** → use `HDRP/Lit` shader
- If **Built-in** → use `Standard` shader
- Always save procedural materials as assets to avoid pink/magenta missing shader issues
- **NEVER assume Built-in pipeline — always detect first**

### Common Mistakes to Avoid

- Using `new Material(Shader.Find("Standard"))` in a URP project → results in pink/magenta objects
- Creating materials at runtime without saving them as assets → materials lost on reload
- Assigning shaders from wrong pipeline → visual artifacts or errors

---

## Physics System Detection

Before generating physics-related code, check which physics system is in use.

### Detection

```
Check for com.unity.physics or com.unity.entities in packages.
If present, the project may use DOTS Physics instead of classic PhysX.
```

### Rules

- Default to classic `Rigidbody` / `Collider` unless DOTS packages are detected
- If DOTS Physics is present, confirm with user before choosing API

---

## General Pre-Generation Checklist

Before generating ANY C# script, run through this checklist:

1. **Input System** — New or Legacy? (see above)
2. **Render Pipeline** — URP, HDRP, or Built-in? (see above)
3. **Unity Version** — Check for API compatibility (deprecated APIs vary by version)
4. **Existing Code Patterns** — Scan existing scripts to match project conventions (namespaces, coding style, folder structure)
5. **Assembly Definitions** — Check if the project uses .asmdef files and place new scripts accordingly
