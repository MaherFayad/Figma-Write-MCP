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

## Complete Screen Template

Use this template for creating screens:

```javascript
// 1. LOAD FONTS FIRST
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });

// 2. GET ALL STYLES
const paintStyles = figma.getLocalPaintStyles();
const textStyles = figma.getLocalTextStyles();

// 3. MAP STYLES BY PURPOSE (adjust names to match your file)
const findPaint = (name) => paintStyles.find(s => s.name === name);
const findText = (name) => textStyles.find(s => s.name.includes(name));

const $ = {
    // Colors
    primary: findPaint("Primary/300"),
    primaryDark: findPaint("Primary/500"),
    textDark: findPaint("Greyscale/500"),
    textMuted: findPaint("Greyscale/100"),
    inputBg: findPaint("Greyscale/25"),
    border: findPaint("Greyscale/50"),
    white: findPaint("Greyscale/0"),
    // Typography  
    heading: findText("Heading"),
    bodyMedium: findText("Body/Medium/Medium"),
    bodyRegular: findText("Body/Medium/Regular"),
    bodySmall: findText("Body/Small/Regular"),
};

// 4. CREATE SCREEN FRAME
const screen = figma.createFrame();
screen.name = "My Screen";
screen.resize(393, 852);
if ($.white) screen.fillStyleId = $.white.id;
screen.layoutMode = "VERTICAL";
screen.paddingTop = 60;
screen.paddingBottom = 34;
screen.paddingLeft = 24;
screen.paddingRight = 24;
screen.itemSpacing = 16;

// 5. ADD ELEMENTS USING STYLES
const title = figma.createText();
title.fontName = { family: "Inter", style: "Semi Bold" };
title.fontSize = 28;
title.characters = "Screen Title";
if ($.textDark) title.fillStyleId = $.textDark.id;
screen.appendChild(title);

// 6. ADD TO PAGE
figma.currentPage.appendChild(screen);
figma.currentPage.selection = [screen];
figma.viewport.scrollAndZoomIntoView([screen]);

return { success: true, id: screen.id };
```

---

## Auto-Layout Rules (MUST follow order)

```javascript
// 1. Create parent frame
const container = figma.createFrame();

// 2. Set layout BEFORE children
container.layoutMode = "VERTICAL";
container.primaryAxisSizingMode = "AUTO";
container.counterAxisSizingMode = "AUTO";
container.itemSpacing = 8;
container.paddingTop = container.paddingBottom = 16;
container.paddingLeft = container.paddingRight = 16;

// 3. Create child
const child = figma.createFrame();
child.resize(100, 50);

// 4. Append child
container.appendChild(child);

// 5. Set child sizing AFTER append
child.layoutSizingHorizontal = "FILL";
```

---

## Common Components

### Primary Button
```javascript
const btn = figma.createFrame();
btn.name = "Primary Button";
btn.resize(200, 56);
btn.cornerRadius = 100;  // Pill shape
btn.layoutMode = "HORIZONTAL";
btn.primaryAxisAlignItems = "CENTER";
btn.counterAxisAlignItems = "CENTER";
if ($.primary) btn.fillStyleId = $.primary.id;

await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
const label = figma.createText();
label.fontName = { family: "Inter", style: "Semi Bold" };
label.fontSize = 16;
label.characters = "Button Text";
if ($.white) label.fillStyleId = $.white.id;
btn.appendChild(label);
```

### Input Field
```javascript
const field = figma.createFrame();
field.name = "Input Field";
field.resize(345, 56);
field.cornerRadius = 16;
field.layoutMode = "HORIZONTAL";
field.counterAxisAlignItems = "CENTER";
field.paddingLeft = field.paddingRight = 20;
if ($.inputBg) field.fillStyleId = $.inputBg.id;

const placeholder = figma.createText();
placeholder.fontName = { family: "Inter", style: "Regular" };
placeholder.fontSize = 16;
placeholder.characters = "Placeholder";
if ($.textMuted) placeholder.fillStyleId = $.textMuted.id;
field.appendChild(placeholder);
```

### Text Link
```javascript
const link = figma.createText();
link.fontName = { family: "Inter", style: "Semi Bold" };
link.fontSize = 14;
link.characters = "Click here";
if ($.primary) link.fillStyleId = $.primary.id;
```

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
