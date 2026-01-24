---
description: Create pages and designs in Figma using extracted design context, patterns, styles, and components
---

# Figma MCP Create Workflow

Create new pages, frames, and designs in Figma using the design context extracted from the `/figma-mcp-context-view` workflow.

## Prerequisites

- Completed `/figma-mcp-context-view` workflow first
- Context files available at `.figma/context/{document-name}.json`
- Figma plugin connected (verify with `get_figma_state`)

> ⚠️ **CRITICAL**: The `.figma/context/{document-name}.json` file is the SOURCE OF TRUTH. You must read it to get the correct Style IDs (e.g., `S:1234`) and Component Keys. Do not guess names!

---

## Step 1: Load Design Context

```
1. Read `.figma/context/{document-name}.json` for structured tokens
2. Read `.figma/context/{document-name}.md` for quick reference
3. Parse and prepare style IDs, component keys, and patterns
```

### Key Data to Extract
| Data | Usage |
|------|-------|
| Paint Style IDs | For `node.fillStyleId` bindings |
| Text Style IDs | For `node.textStyleId` bindings |
| Effect Style IDs | For `node.effectStyleId` bindings |
| Component Keys | For `figma.importComponentByKeyAsync()` |
| Font Families | For `figma.loadFontAsync()` calls |
| Spacing Scale | For consistent gaps and padding |
| Corner Radius | For consistent border radius |

---

## Step 2: Verify Connection & Load Fonts

```javascript
// 1. Check connection
const state = await mcp_figma-bridge_get_figma_state();
if (!state.connected) { /* Ask user to connect */ }

// 2. Pre-flight: Context Freshness Check (Logical Step)
/* 
   Check file stats for .figma/context/{document-name}.json.
   If > 24 hours old, WARNING: "Context might be stale. Consider running /figma-mcp-context-view first."
*/

// 2. Load all required fonts BEFORE any text operations
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
```

> ⚠️ **CRITICAL**: Always load fonts before creating or modifying text nodes!

> 📝 **Note**: All JavaScript code in this workflow executes via `mcp_figma-bridge_execute_figma_command`. Wrap code blocks appropriately.

---


---

## Step 3: Clone Existing Patterns ("Gold Standard")

> 🏆 **BEST PRACTICE**: Whenever possible, do NOT create complex UI from scratch. If the context reveals an existing "Card", "Header", or "Section" that matches 80% of what you need, **CLONE IT**!

Use `$.clone` to duplicate and tweak:

```javascript
/* 
   Clone "Product Card" and update:
   - "Title" text -> "New Item"
   - "Price" text -> "$99"
   - "Buy Button" fill -> "Brand/Secondary"
*/
await $.clone("123:456", {
    "Title": { text: "New Item" },
    "Price": { text: "$99" },
    "Buy Button": { fill: "Brand/Secondary" }
});
```

---

## Step 4: Create Declarative UIs (The New Standard)

For new structures, use the `$.create` helper. It handles:
- **Auto-Layout**: Just pass `layout: "VERTICAL"`
- **Styles**: Pass names like `fill: "Surface/Card"` (fuzzy matched)
- **Fonts**: Automatically loaded

### 4.1 Create Page & Frame

```javascript
// 1. Create Page
const newPage = figma.createPage();
newPage.name = "Dashboard";
figma.currentPage = newPage;

// 2. Create Layout
const screen = await $.create("FRAME", {
    name: "Dashboard Screen",
    width: 1440,
    height: 1024,
    fill: "Background/Page", // Fuzzy finds style ID
    layout: "VERTICAL",
    gap: 0
});
figma.currentPage.appendChild(screen);
return { frameId: screen.id };
```

---

## Step 5: Build Components with Nesting

Nest `$.create` calls to build complex UIs in one go.

### 5.1 Header & Hero Example

```javascript
// Add to 'screen' from above
const header = await $.create("FRAME", {
    name: "Header",
    width: "FILL",
    height: "HUG",
    layout: "HORIZONTAL",
    pad: [16, 32], // Vertical: 16, Horizontal: 32
    path: "between", // Primary axis: space-between
    fill: "Surface/Header", 
    effect: "Shadow/Small"
}, [
    $.create("TEXT", { text: "Logo", font: "H3", fill: "Brand/Primary" }),
    $.create("FRAME", { layout: "HORIZONTAL", gap: 16 }, [
        $.create("TEXT", { text: "Home", font: "Body", fill: "Text/Primary" }),
        $.create("TEXT", { text: "About", font: "Body", fill: "Text/Secondary" })
    ])
]);
screen.appendChild(header);

const hero = await $.create("FRAME", {
    name: "Hero",
    width: "FILL",
    height: "HUG",
    layout: "VERTICAL",
    pad: 64,
    gap: 24,
    align: "center", // Align items center
    fill: "Surface/Hero"
}, [
    $.create("TEXT", { text: "Build Faster", font: "Display/H1", fill: "Text/Primary" }),
    $.create("TEXT", { text: "Use the declarative engine.", font: "Body/Large", fill: "Text/Secondary" }),
    $.create("FRAME", { 
        name: "CTA Button",
        fill: "Brand/Primary",
        corner: 8,
        pad: [12, 24] 
    }, [
        $.create("TEXT", { text: "Get Started", font: "Button/Medium", fill: "Text/Inverse" })
    ])
]);
screen.appendChild(hero);
```


---


---


## Step 8: Verify Creation

```
1. Call `mcp_figma-bridge_export_node_image` to capture screenshot
2. Save to `.figma/screenshots/created/{frame-name}.png`
3. Verify layout matches expected patterns
4. Check style bindings are correct
5. Validate component instances
6. **Check for Overflow**: 
   - Iterate text nodes.
   - If `text.truncated` is true, or if text bounds exceed parent padding box, warn or auto-resize.

```

> 💡 **Tip**: Run `/figma-mcp-review` workflow to generate a full compliance report.

---

## Complete Example: Create Landing Page

```javascript
// Full landing page creation following extracted patterns
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

// Get styles
const styles = figma.getLocalPaintStyles();
const textStyles = figma.getLocalTextStyles();
const findPaint = (name) => styles.find(s => s.name.includes(name));
const findText = (name) => textStyles.find(s => s.name.includes(name));

// Create page frame
const page = figma.createFrame();
page.name = "Landing Page";
page.resize(1440, 2000);
page.layoutMode = "VERTICAL";
page.primaryAxisSizingMode = "AUTO";
page.itemSpacing = 0;

// Pre-lookup styles (simulated from context load)
// const bgStyleId = context.designSystem.paintStyles.find(s => s.name === "Background").id;
if (bgStyleId) page.fillStyleId = bgStyleId;

// Header
const header = figma.createFrame();
header.name = "Header";
header.layoutMode = "HORIZONTAL";
header.layoutSizingHorizontal = "FILL";
header.layoutSizingVertical = "HUG";
header.counterAxisAlignItems = "CENTER";
header.primaryAxisAlignItems = "SPACE_BETWEEN";
header.paddingTop = 16;
header.paddingBottom = 16;
header.paddingLeft = 64;
header.paddingRight = 64;
page.appendChild(header);

// Hero
const hero = figma.createFrame();
hero.name = "Hero Section";
hero.layoutMode = "VERTICAL";
hero.layoutSizingHorizontal = "FILL";
hero.layoutSizingVertical = "HUG";
hero.primaryAxisAlignItems = "CENTER";
hero.counterAxisAlignItems = "CENTER";
hero.paddingTop = 96;
hero.paddingBottom = 96;
hero.itemSpacing = 32;
page.appendChild(hero);

// Add heading
const heading = figma.createText();
heading.characters = "Welcome to Our Platform";

// Apply styles by ID
// const h1StyleId = context.designSystem.textStyles.find(s => s.name === "H1").id;
if (h1StyleId) heading.textStyleId = h1StyleId;
hero.appendChild(heading);

figma.currentPage.appendChild(page);
return { pageId: page.id, name: page.name };
```

---

## Style Binding Reference

| Property | Method | Example |
|----------|--------|---------|
| Fill | `fillStyleId` | `node.fillStyleId = style.id` |
| Stroke | `strokeStyleId` | `node.strokeStyleId = style.id` |
| Text | `textStyleId` | `text.textStyleId = style.id` |
| Effect | `effectStyleId` | `node.effectStyleId = style.id` |

---

## Common Mistakes to Avoid

1. ❌ Forgetting to load fonts before text operations
2. ❌ Setting `layoutSizingHorizontal` before `appendChild`
3. ❌ Hardcoding colors instead of using style IDs
4. ❌ Creating duplicate styles instead of reusing existing
5. ❌ Not checking if node exists before modifying

---

## Special Case: Creating Presentations

If the user request involves "slides", "deck", or "presentation", use the specialized Presentation features.

### 1. Scan Presentation Structure
```
mcp_figma-bridge_scan_presentation (forceRescan: true)
```
*Returns available slides and their editable "slots".*

### 2. Configure Slide Types
```
mcp_figma-bridge_configure_presentation (
  cover: "slide-id-1",
  toc: "slide-id-2",
  end: "slide-id-99"
)
```

### 3. Fill Content
Instead of creating nodes manually, fill existing slots:
```
mcp_figma-bridge_fill_slide (
  slideId: "slide-id",
  slots: [
    { slotId: "title-slot-id", content: "Q4 Roadmap" },
    { slotId: "body-slot-id", content: "Key objectives..." }
  ]
)
```

---

## Usage

```
/figma-mcp-create
```

*Workflow v1.0 - Creates designs using extracted patterns for consistency.*
