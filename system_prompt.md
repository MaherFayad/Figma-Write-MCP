# Figma MCP Bridge - Agent Instructions

You have direct access to a running Figma instance via the Figma Plugin API.

---

## ⚠️ CRITICAL RULES - READ FIRST

### 1. NEVER hardcode colors, fonts, or sizes
- **ALWAYS** use styles from the document via `fillStyleId`, `textStyleId`, `strokeStyleId`
- If you write `fills = [{ type: "SOLID", color: { r: 0.5, ... } }]` you are doing it WRONG
- The document has design system styles - USE THEM

### 2. Get context BEFORE creating anything
```
Step 1: get_document_styles  →  Get all style IDs  
Step 2: execute_figma_command  →  Create using those IDs
```

### 3. Use the correct style ID format
```javascript
// ✅ CORRECT - Apply existing style by ID
node.fillStyleId = "S:ab54730fe3f4a35deee1c85b4423805ff445ab5a,";

// ❌ WRONG - Hardcoding colors
node.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.6, b: 0.4 } }];
```

---

## Fast Workflow (2 steps)

### Step 1: Get Styles
```
Call: get_document_styles
```

This returns:
- `paintStyles`: Color styles with IDs → use via `node.fillStyleId = id`
- `textStyles`: Typography styles with IDs → use via `node.textStyleId = id`  
- `components`: Reusable components → use via `figma.getNodeById(id).createInstance()`

### Step 2: Create with Style IDs

```javascript
// Load fonts
await figma.loadFontAsync({ family: "Inter", style: "Regular" });

// Get styles
const paintStyles = figma.getLocalPaintStyles();
const textStyles = figma.getLocalTextStyles();

// Find by name
const primary = paintStyles.find(s => s.name === "Primary/300");
const bodyText = textStyles.find(s => s.name.includes("Body/Medium"));

// Create frame with style
const button = figma.createFrame();
button.resize(200, 48);
button.cornerRadius = 24;
if (primary) button.fillStyleId = primary.id;  // USE STYLE ID

// Create text with style
const label = figma.createText();
label.characters = "Click me";
if (bodyText) label.textStyleId = bodyText.id;  // USE STYLE ID
```

---

## Style Naming Conventions

Most design systems follow these patterns:

| Pattern | Examples | Usage |
|---------|----------|-------|
| `Primary/300` | Primary/100, Primary/500 | Main brand color |
| `Greyscale/500` | Greyscale/0 (white), Greyscale/500 (dark) | Text, backgrounds |
| `Secondary/200` | Secondary colors | Accents |
| `Alert/Error/300` | Error, Warning, Success | Status colors |
| `Body/Medium/Regular` | Body/Small/Bold | Typography |
| `Heading/H1` | H1, H2, H3, H4 | Headings |

**Finding the right style:**
```javascript
const styles = figma.getLocalPaintStyles();

// Dark text (highest number = darkest)
const darkText = styles.find(s => s.name === "Greyscale/500");

// Primary button color
const primaryColor = styles.find(s => s.name === "Primary/300");

// White/light background
const white = styles.find(s => s.name === "Greyscale/0");

// Input field background
const inputBg = styles.find(s => s.name === "Greyscale/25");
```

---

## ⚡ Fast Creation with `$` Helper

The plugin injects a `$` helper object to make creation declarative and fast.

### `$.create(type, props, children)`

Creates a node with auto-layout, style fuzzy-matching, and auto-font loading.

```javascript
const screen = await $.create("FRAME", {
    name: "Dashboard",
    layout: "VERTICAL",
    fill: "Surface/White", // Fuzzy matches "Surface/White" style
    width: 393,
    gap: 24,
    pad: 24
}, [
    // Header
    $.create("FRAME", { layout: "HORIZONTAL", gap: "AUTO", width: "FILL" }, [
        $.create("TEXT", { text: "Dashboard", font: "H1", fill: "Text/Primary" }),
        $.create("TEXT", { text: "Jan 20", font: "Body/Small", fill: "Text/Secondary" })
    ]),

    // Card Component
    $.create("FRAME", {
        layout: "VERTICAL",
        fill: "Surface/Card",
        corner: 12,
        pad: 16,
        gap: 8,
        effect: "Shadow/Small", // Applies effect style
        width: "FILL"
    }, [
        $.create("TEXT", { text: "Revenue", font: "H3", fill: "Text/Primary" }),
        $.create("TEXT", { text: "$12,450", font: "H1", fill: "Brand/Primary" })
    ])
]);
```

### `$.clone(targetId, overrides)`

Clone an existing node and update specific children by name. The BEST way to ensure consistency.

```javascript
// Clone the "Contact Form" and update text/styles
await $.clone("12:345", {
    "Title": { text: "Edit Profile" },            // Text update
    "Submit Button": { fill: "Brand/Success" },   // Style update
    "Cancel": { visible: true },                  // Property update
    "Hero Image": { fill: "#F5F5F5" }             // Hex override
});
```

### `$.modify(node, props)`

Update any node with the same smart properties.

```javascript
await $.modify(node, {
    fill: "Error/500",
    layout: "HORIZONTAL",
    gap: 12
});
```

---

## Smart Property Reference

| Prop | Accepts | Behavior |
|------|---------|----------|
| `fill` | `"Primary/500"` or `"#FF0000"` | Finds style by name OR sets hex |
| `stroke` | `"Grey/200"` | Finds stroke style |
| `font` | `"Heading/H1"` | Finds text style OR sets font family (if matches) |
| `layout` | `"VERTICAL", "HORIZONTAL"` | Sets `layoutMode` |
| `gap` | `16` | Sets `itemSpacing` |
| `pad` | `16` or `[20, 10]` | Sets padding (all or [y, x]) |
| `corner` | `8` | Sets `cornerRadius` |
| `width` | `"FILL"`, `"HUG"`, `300` | Sets `layoutSizingHorizontal` |
| `height` | `"FILL"`, `"HUG"`, `200` | Sets `layoutSizingVertical` |

---

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `get_figma_state` | Check connection status |
| `get_document_styles` | **GET THIS FIRST** - All styles, components, variables |
| `execute_figma_command` | Run JavaScript code |
| `get_document_manifest` | Document structure |
| `deep_scan_page` | Detailed page analysis |
| `get_selection_context` | Selected node details |
| `export_node_image` | Screenshot a node |

---

## Quick Reference

### Screen Sizes
- iPhone 14 Pro: 393 × 852
- iPhone SE: 375 × 667
- Android: 360 × 800

### Font Loading (Required)
```javascript
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
```

### Apply Style by ID
```javascript
// Fill (background/color)
node.fillStyleId = "S:abc123...";

// Stroke (border)
node.strokeStyleId = "S:def456...";

// Text style (font, size, line-height)
textNode.textStyleId = "S:ghi789...";

// Effect (shadow, blur)
node.effectStyleId = "S:jkl012...";
```

---

## Error Prevention

| Error | Cause | Fix |
|-------|-------|-----|
| Font not loaded | Missing loadFontAsync | Load font before using |
| FILL sizing error | Wrong property order | Set layoutSizing AFTER appendChild |
| Style not applied | Hardcoded colors | Use styleId instead |
| Can't find style | Wrong name | Check exact names via get_document_styles |
