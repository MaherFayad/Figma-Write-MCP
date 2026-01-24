---
description: Create a presentation in Figma using extracted patterns, varied layouts, and smart text filling.
---

# Figma MCP Create Presentation Workflow

Create a professional presentation in Figma by cloning diverse templates and intelligently filling content while handling text cleanup and RTL requirements.

## Prerequisites

-   `/figma-mcp-context-view` completed (context extracted)
-   Figma plugin connected
-   Source slide templates identified (Cover, Section, Content, etc.)

---

## Step 1: Identify and Map Patterns

Before creating, identifying the source frames that serve as templates is crucial to avoid repetitive slide designs.

```
1. Scan source page with `mcp_figma-bridge_deep_scan_page`
2. Identify distinct layouts:
   - Cover Slide (Largest title, distinct layout)
   - Section Divider (Centered text, solid background)
   - Content Slide (Title + Body block)
   - Grid/List Slide (Multiple small text blocks)
   - Conclusion Slide (Centered message)
3. Map your content slides to these Template IDs.
```

> **Rule**: Never use the same template for more than 3 consecutive slides. Vary the rhythm.

---

## Step 2: Clear Previous Attempts (Cleanup)

Always clean up before generating new frames to avoid clutter.

```javascript
// Example cleanup script
const nodesToDelete = ["node-id-1", "node-id-2"];
for (const id of nodesToDelete) {
    const node = figma.getNodeById(id);
    if (node) node.remove();
}
```

---

## Step 3: Clone and Structure

Clone the mapped templates for each slide in your deck.

```
For each slide in deck:
1. `mcp_figma-bridge_clone_node`
   - targetNodeId: {Mapped Template ID}
   - newName: {Slide Title}
   - position: {Calculated X/Y coordinates}
```

### Fallback: Create from Scratch
If no suitable template exists, use `$.create`:

```javascript
/* Create a Title Slide from scratch */
const slide = await $.create("FRAME", {
    name: "Custom Slide",
    width: 1920, height: 1080,
    fill: "Background/Dark",
    layout: "VERTICAL", 
    align: "center", gap: 40
}, [
    $.create("TEXT", { text: "New Slide", font: "Display/H1", fill: "Text/Inverse" })
]);
```

---

## Step 4: Smart Content Fill & Cleanup

This is the most critical step. You must not only fill the text you *have* but also handle the text you *don't* have.

### Logic
1.  **Target Nodes**: Find all TEXT nodes in the frame.
2.  **Sort**: Order by font size (descending).
3.  **Title**: Assign the largest text node to the Slide Title.
4.  **Schema-Based Fill**:
    -   Use the `schema.json` provided (from `context-view-presentation`).
    -   For each `slot` in the schema:
        -   Find the text node in the **Cloned Frame** that matches the `selector` (x, y, fontSize).
        -   Fill it with the mapped content.
    -   **Strict Cleanup**: Delete ANY text node that was not matched by a slot (unless explicitly preserved).

### RTL Handling (for Arabic/Hebrew)
-   `node.textAlignHorizontal = "RIGHT"`

-   Ensure font supports the script (or load fallback like "Inter" or "Noto Sans Arabic").

```javascript
// SCHEMA-BASED SMART FILL SCRIPT
const clone = figma.getNodeById(clonedId);
const frameTexts = clone.findAll(n => n.type === "TEXT");
const filledNodeIds = new Set();

// Helper: Match selector
function findMatchingNode(selector) {
    return frameTexts.find(n => 
        Math.abs(n.x - selector.x) < 2 && // 2px tolerance
        Math.abs(n.y - selector.y) < 2 &&
        (selector.fontSize === "mixed" || n.fontSize === selector.fontSize)
    );
}

// 1. Iterate Schema Slots
for (const slot of schema.slots) {
    const targetNode = findMatchingNode(slot.selector);
    const contentText = content[slot.role] || content[slot.id]; // key by role or ID
    
    if (targetNode && contentText) {
        // Load font
        await figma.loadFontAsync(targetNode.fontName);
        
        // Fill content
        targetNode.characters = contentText;
        targetNode.textAlignHorizontal = "RIGHT"; // RTL

        // Mark as filled
        filledNodeIds.add(targetNode.id);

        // Auto-fit Logic
        while (targetNode.height > (targetNode.parent.height - 40) && targetNode.fontSize > 12) {
             targetNode.fontSize -= 2;
        }
    }
}

// 2. Strict Cleanup
for (const n of frameTexts) {
    if (!filledNodeIds.has(n.id)) {
        // Safe-guard for page numbers if role wasn't assigned
        if (n.characters.match(/^\d+$/) || n.characters.includes("/")) continue;
        n.remove();
    }
}
```

---

## Step 5: Final Review

1.  Export screenshots of all new slides.
2.  Verify no "English" or "Placeholder" text remains visible.
3.  Check alignment and overflow.

---

## Usage

```
/figma-mcp-create-presentation
```
