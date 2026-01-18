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

## Step 3: Clone Existing Patterns (The "Gold Standard")

> 🏆 **BEST PRACTICE**: Whenever possible, do NOT create complex UI from scratch. If the context reveals an existing "Card", "Header", or "Section" that matches 80% of what you need, **CLONE IT**!

### Why Clone?
1.  **Pixel Perfect details**: Captures shadows, exact padding, deeply nested constraints that code might miss.
2.  **Guaranteed Design System**: By definition, the existing node uses the correct tokens.
3.  **Faster**: One API call vs 50 calls to build a tree.

Use `mcp_figma-bridge_clone_node` to duplicate existing structures:

```
1. Call clone_node with:
   - targetNodeId: "existing-frame-id" (from context)
   - newName: "Cloned Frame"
   - offsetX: 100
   - targetParentId: "parent-frame-id" (optional)

2. Modify the cloned node as needed
3. Update text content, swap component instances
```

---

## Step 4: Create Page or Frame (Fallback/New)

### 4.1 Create New Page

```javascript
// Execute via mcp_figma-bridge_execute_figma_command
const newPage = figma.createPage();
newPage.name = "New Page Name";
figma.currentPage = newPage;
return { pageId: newPage.id, name: newPage.name };
```

### 4.2 Create Frame on Current Page

```javascript
const frame = figma.createFrame();
frame.name = "Frame Name";
frame.resize(1440, 900); // Desktop size from patterns
frame.x = 0;
frame.y = 0;

// Apply background using style ID from context (PREFERRED)
// const bgStyleId = context.lookup.styles["Background"];
if (bgStyleId) frame.fillStyleId = bgStyleId;

figma.currentPage.appendChild(frame);
return { frameId: frame.id };
```

---

## Step 5: Apply Design Patterns

### 5.1 Apply Auto-Layout

```javascript
// Set layout mode BEFORE adding children
frame.layoutMode = "VERTICAL"; // or "HORIZONTAL"
frame.primaryAxisSizingMode = "AUTO"; // or "FIXED"
frame.counterAxisSizingMode = "AUTO"; // or "FIXED"
frame.primaryAxisAlignItems = "MIN"; // MIN, CENTER, MAX, SPACE_BETWEEN
frame.counterAxisAlignItems = "CENTER"; // MIN, CENTER, MAX, STRETCH
frame.itemSpacing = 16; // From spacing scale
frame.paddingTop = 24;
frame.paddingBottom = 24;
frame.paddingLeft = 24;
frame.paddingRight = 24;
```

### 5.2 Apply Corner Radius

```javascript
// Use values from pattern analysis
frame.cornerRadius = 16; // Cards: 16px
// Or individual corners:
frame.topLeftRadius = 16;
frame.topRightRadius = 16;
frame.bottomLeftRadius = 0;
frame.bottomRightRadius = 0;
```

### 5.3 Apply Effects (Shadows)

```javascript
const shadowStyle = figma.getLocalEffectStyles().find(s => s.id === "S:shadowMdId");
if (shadowStyle) frame.effectStyleId = shadowStyle.id;
```

---

## Step 6: Create Common Elements

### 6.1 Create Text Node

```javascript
// Font MUST be loaded first!
// Use dynamic font from context if possible
const font = context.designSystem.fonts[0] || { family: "Inter", style: "Medium" };
await figma.loadFontAsync(font);

const text = figma.createText();
text.characters = "Heading Text";

// Apply text style by ID (PREFERRED)
// const headingStyleId = context.lookup.styles["H1"];
if (headingStyleId) {
  text.textStyleId = headingStyleId;
} else {
  // FALLBACK ONLY
  text.fontSize = 24;
  text.fontName = font;
}

// Apply color style by ID
if (textColorId) text.fillStyleId = textColorId;

parentFrame.appendChild(text);
```

### 6.2 Create Rectangle/Shape

```javascript
const rect = figma.createRectangle();
rect.name = "Card Background";
rect.resize(320, 200);
rect.cornerRadius = 16;

// Apply fill style by ID
// const cardBgId = context.lookup.styles["Surface"];
if (cardBgId) rect.fillStyleId = cardBgId;

parentFrame.appendChild(rect);
```

### 6.3 Instance Component

```javascript
// Import component by key from context
const componentKey = "abc123def456"; // From context JSON
const component = await figma.importComponentByKeyAsync(componentKey);
const instance = component.createInstance();

// Position and customize
instance.x = 0;
instance.y = 0;

// Override text in instance
const textNode = instance.findOne(n => n.type === "TEXT" && n.name === "Label");
if (textNode) {
  await figma.loadFontAsync(textNode.fontName);
  textNode.characters = "Custom Label Text";
}

parentFrame.appendChild(instance);
```

---

## Step 7: Build Page Sections

### 7.1 Header Section

```javascript
const header = figma.createFrame();
header.name = "Header";
header.layoutMode = "HORIZONTAL";
header.resize(1440, 64); // From patterns
header.counterAxisAlignItems = "CENTER";
header.paddingLeft = 24;
header.paddingRight = 24;
header.itemSpacing = 16;

// Apply header background style by ID
if (headerBgStyleId) header.fillStyleId = headerBgStyleId;

// Add logo, nav items, etc.
pageFrame.appendChild(header);
```

### 7.2 Hero Section

```javascript
const hero = figma.createFrame();
hero.name = "Hero";
hero.layoutMode = "VERTICAL";
hero.resize(1440, 500);
hero.primaryAxisAlignItems = "CENTER";
hero.counterAxisAlignItems = "CENTER";
hero.itemSpacing = 24;
hero.paddingTop = 64;
hero.paddingBottom = 64;

// Add heading, subheading, CTA button
pageFrame.appendChild(hero);
```

### 7.3 Content Grid

```javascript
const contentGrid = figma.createFrame();
contentGrid.name = "Content Grid";
contentGrid.layoutMode = "HORIZONTAL";
contentGrid.layoutWrap = "WRAP";
contentGrid.resize(1200, 600);
contentGrid.itemSpacing = 24;
contentGrid.counterAxisSpacing = 24;
contentGrid.paddingTop = 48;
contentGrid.paddingBottom = 48;

// Add cards using component instances
for (let i = 0; i < 6; i++) {
  const cardInstance = cardComponent.createInstance();
  contentGrid.appendChild(cardInstance);
}

pageFrame.appendChild(contentGrid);
```

### 7.4 Footer Section

```javascript
const footer = figma.createFrame();
footer.name = "Footer";
footer.layoutMode = "HORIZONTAL";
footer.resize(1440, 200);
footer.primaryAxisAlignItems = "SPACE_BETWEEN";
footer.counterAxisAlignItems = "MIN";
footer.paddingTop = 48;
footer.paddingBottom = 48;
footer.paddingLeft = 64;
footer.paddingRight = 64;

// Add footer columns
pageFrame.appendChild(footer);
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
