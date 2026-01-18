---
name: designing-with-figma-bridge
description: Creates and modifies Figma designs using the Figma Bridge MCP server. Use when the user mentions Figma design, create page, design system, style bindings, component creation, or any Figma manipulation task.
---

# Designing with Figma Bridge

Comprehensive skill for creating, modifying, and maintaining Figma designs through the Figma Bridge MCP server.

## When to Use This Skill

- User asks to "create a page" or "design a screen" in Figma
- User mentions "Figma design" or "design system"
- User wants to "add components" or "create frames"
- User asks about "style bindings" or "design tokens"
- User mentions "clone a design" or "duplicate a pattern"
- User wants to "fill a presentation" or manage slides

## Prerequisites

Verify Figma Bridge connection before any operation:
```
mcp_figma-bridge_get_figma_state
```
Expected: `connected: true, ready: true`

If not connected, ask user to:
1. Open Figma Desktop app
2. Run the Figma Bridge plugin

---

## Core Workflow

Copy and track progress:

```markdown
## Design Task Progress
- [ ] 1. Verify Connection
- [ ] 2. Extract Design Context
- [ ] 3. Check for Clonable Patterns (Step 3a - PRIORITY)
- [ ] 4. Plan Design Structure
- [ ] 5. Load Required Fonts
- [ ] 6. Create Elements with Style Bindings
- [ ] 7. Verify Output
```

---

## Mandatory Rules

### ⚠️ NEVER Hardcode Values

```javascript
// ❌ WRONG
node.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.6, b: 0.4 } }];
// ❌ ALSO WRONG (Ambiguous Name Lookup)
// const style = figma.getLocalPaintStyles().find(s => s.name === "Primary/500");

// ✅ CORRECT (Strict ID from Context)
// const primaryId = context.designSystem.paintStyles.find(s => s.name === "Primary/500").id;
if (primaryId) node.fillStyleId = primaryId;
```

### ⚠️ ALWAYS Load Fonts First

```javascript
// Load BEFORE any text operation
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
```

### ⚠️ Layout Order Matters

```javascript
// 1. Create frame
const frame = figma.createFrame();
// 2. Set layout mode BEFORE adding children
frame.layoutMode = "VERTICAL";
// 3. Add children
frame.appendChild(child);
// 4. Set sizing AFTER appendChild
child.layoutSizingHorizontal = "FILL";
```

---

## Phase 1: Get Design Context

**ALWAYS START HERE** - Never guess style IDs or component keys.

```
mcp_figma-bridge_get_design_context (includeLibraryStyles: true)
```

### Key Data to Extract

| Data Type | Property | Usage |
|-----------|----------|-------|
| Paint Styles | `id`, `name`, `hex` | `node.fillStyleId = id` |
| Text Styles | `id`, `name`, `fontSize` | `text.textStyleId = id` |
| Effect Styles | `id`, `name` | `node.effectStyleId = id` |
| Components | `key`, `name` | `figma.importComponentByKeyAsync(key)` |
| Fonts | `family`, `style` | `figma.loadFontAsync({family, style})` |

---

## Phase 2: Analyze Patterns (Optional)

For consistency with existing designs:

```
mcp_figma-bridge_analyze_patterns (pageId: "<optional>")
```

Extracts:
- Spacing scale (4px, 8px base)
- Corner radius patterns
- Color usage frequency
- Component instance counts
- Page structure templates

---

## Phase 3: Create Elements

### 🚀 Clone Existing Pattern (PRIORITY)

When replicating existing designs, **ALWAYS CHECK FOR CLONABLE PATTERNS FIRST.**

```javascript
// PRIORITY: Use this BEFORE creating manual layouts
mcp_figma-bridge_clone_node (
  targetNodeId: "<id>",
  newName: "Cloned Frame",
  offsetX: 100,
  offsetY: 0
)
```

> 🏆 **PRO TIP**: Cloning is 10x faster and 100x more accurate than manual creation.

### Instance Component (Second Priority)

If a component exists for what you are building (e.g. "Card", "Button"), **USE IT**. Do not build it from primitives.

```javascript
const componentKey = "abc123"; // From get_design_context
const component = await figma.importComponentByKeyAsync(componentKey);
const instance = component.createInstance();

// Override text
const label = instance.findOne(n => n.type === "TEXT" && n.name === "Label");
if (label) {
  await figma.loadFontAsync(label.fontName);
  label.characters = "New Label";
}

parentFrame.appendChild(instance);
```

### Create Frame (Fallback)

Only create frames manually if no existing pattern or component exists.

```javascript
// Via mcp_figma-bridge_execute_figma_command
const frame = figma.createFrame();
frame.name = "My Frame";
frame.resize(1440, 900);

// Apply style from context (USE IDs!)
// const bgStyleId = context.lookup.styles["Background"];
if (bgStyleId) frame.fillStyleId = bgStyleId;

// Set auto-layout
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "FIXED";
frame.itemSpacing = 16;
frame.paddingTop = 24;
frame.paddingBottom = 24;

figma.currentPage.appendChild(frame);
return { id: frame.id };
```

### Create Text

```javascript
// Use dynamic fonts from context
const font = context.designSystem.fonts[0] || { family: "Inter", style: "Medium" };
await figma.loadFontAsync(font);

const text = figma.createText();
text.characters = "Heading";

// Use text style (USE IDs!)
// const h1Id = context.lookup.styles["H1"];
if (h1Id) text.textStyleId = h1Id;

// Or apply paint style for color
// const textParams = context.lookup.styles["TextPrimary"];
if (textParams) text.fillStyleId = textParams;

parentFrame.appendChild(text);
```

---

## Phase 4: Presentation Tools

### Scan Presentation

```
mcp_figma-bridge_scan_presentation (forceRescan: true)
```

Returns slides with:
- Classification (cover, toc, content, separator, end)
- Editable slots (text, image)

### Fill Slide Content

```
mcp_figma-bridge_fill_slide (
  slideId: "123:456",
  slots: [
    { slotId: "123:457", content: "Title Text" },
    { slotId: "123:458", content: "Subtitle" }
  ]
)
```

### Configure Presentation

```
mcp_figma-bridge_configure_presentation (
  cover: "<slide-id>",
  toc: "<slide-id>",
  separators: ["<id1>", "<id2>"],
  end: "<slide-id>"
)
```

---

## Phase 5: Verify Output

### Export Screenshot

```
mcp_figma-bridge_export_node_image (
  nodeId: "<frame-id>",
  scale: 2,
  format: "png"
)
```

### Deep Scan for Compliance

```
mcp_figma-bridge_deep_scan_page (pageId: "<page-id>")
```

Check for:
- [ ] All fills use `fillStyleId`
- [ ] All text uses `textStyleId`
- [ ] All effects use `effectStyleId`
- [ ] Spacing follows design scale
- [ ] Components from design system

---

## Quick Reference: All Tools

| Tool | Purpose |
|------|---------|
| `get_figma_state` | Verify connection |
| `get_design_context` | **START HERE** - Get all tokens |
| `get_document_manifest` | Document structure overview |
| `deep_scan_page` | Detailed node analysis |
| `get_selection_context` | Selected element details |
| `analyze_patterns` | Design system patterns |
| `execute_figma_command` | Run JavaScript in Figma |
| `clone_node` | Duplicate existing patterns |
| `export_node_image` | Capture screenshots |
| `scan_presentation` | Get slide structure |
| `fill_slide` | Populate slide content |
| `configure_presentation` | Mark special slides |
| `get_presentation_cache` | Get cached slide data |

---

## Common Patterns

### Button

```javascript
const btn = figma.createFrame();
btn.name = "Button";
btn.layoutMode = "HORIZONTAL";
btn.primaryAxisAlignItems = "CENTER";
btn.counterAxisAlignItems = "CENTER";
btn.paddingTop = 12;
btn.paddingBottom = 12;
btn.paddingLeft = 24;
btn.paddingRight = 24;
btn.cornerRadius = 8;

// Apply primary style
// Apply primary style (BY ID)
const primaryId = "S:1234"; // Retrieved from context
if (primaryId) btn.fillStyleId = primaryId;
```

### Card

```javascript
const card = figma.createFrame();
card.name = "Card";
card.layoutMode = "VERTICAL";
card.cornerRadius = 16;
card.itemSpacing = 16;
card.paddingTop = 24;
card.paddingBottom = 24;
card.paddingLeft = 24;
card.paddingRight = 24;

// Apply shadow
// Apply shadow (BY ID)
const shadowId = "S:5678"; // Retrieved from context
if (shadowId) card.effectStyleId = shadowId;
```

### Header

```javascript
const header = figma.createFrame();
header.name = "Header";
header.layoutMode = "HORIZONTAL";
header.layoutSizingHorizontal = "FILL";
header.counterAxisAlignItems = "CENTER";
header.primaryAxisAlignItems = "SPACE_BETWEEN";
header.paddingTop = 16;
header.paddingBottom = 16;
header.paddingLeft = 64;
header.paddingRight = 64;
```

---

## Error Handling

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Font not loaded" | Missing `loadFontAsync` | Load font before text ops |
| "Plugin not connected" | Plugin not running | Ask user to run plugin |
| "Node not found" | Invalid node ID | Re-fetch with `get_document_manifest` |
| "Cannot set fillStyleId" | Style doesn't exist | Use correct ID from context |

### Recovery Pattern

```javascript
const node = figma.getNodeById(nodeId);
if (!node) {
  return { error: "Node not found", nodeId };
}
```

---

## Related Workflows

| Workflow | Purpose |
|----------|---------|
| `/figma-mcp-context-view` | Extract design context |
| `/figma-mcp-create` | Create designs from context |
| `/figma-mcp-review` | Review design compliance |

---

*Skill v1.0 - Master Figma design automation with MCP tools.*
