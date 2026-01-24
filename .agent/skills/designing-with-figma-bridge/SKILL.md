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

### 1. Use Declarative Helpers (`$`)
- Use `$.create` for new layouts.
- Use `$.clone` for modifications.
- **Why?** It automatically handles styles, fonts, and auto-layout order correctly.

### 2. Style Names over IDs
- With `$.create`, you can use style names: `fill: "Primary/500"`.
- The engine will find the ID for you.

### 3. Font Loading is Automatic
- `$.create` and `$.modify` handle `loadFontAsync` for you.
- You do NOT need to manually await fonts when using helpers.

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

### 🚀 Clone & Tweak (Method A - PRIORITY)

The fastest way to consistent designs is to clone and modify.

```javascript
// Clone "Contact Form" and update content
const contactFormId = "123:456";
const newForm = await $.clone(contactFormId, {
   "Title": { text: "Registration" },            // Updates text
   "Submit Button": { fill: "Brand/Primary" },   // Updates style
   "Hero Image": { fill: "#F5F5F5" }             // Updates color
});
```

### ⚡ Declarative Creation (Method B)

Build new UIs using the `$` helper for implicit styling and layout.

```javascript
// Create a card with auto-layout
await $.create("FRAME", {
    name: "User Card",
    layout: "VERTICAL",
    fill: "Surface/Card",  // Finds "Surface/Card" style ID
    corner: 16,
    pad: 24,
    gap: 16,
    effect: "Shadow/Small" // Finds effect style ID
}, [
    // Header
    $.create("FRAME", { layout: "HORIZONTAL", gap: "AUTO", width: "FILL" }, [
        $.create("TEXT", { text: "Jane Doe", font: "H3", fill: "Text/Primary" }),
        $.create("TEXT", { text: "Admin", font: "Label/Small", fill: "Brand/Secondary" })
    ]),
    // Body
    $.create("TEXT", { 
        text: "User details description goes here...", 
        font: "Body/Regular", 
        fill: "Text/Secondary" 
    })
]);
```

### ⚠️ Manual API (Fallback)

Use standard `figma.*` API only when `$` helpers are insufficient (e.g., complex vector paths).
```javascript
const vector = figma.createVector();
// ... manual setup
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
