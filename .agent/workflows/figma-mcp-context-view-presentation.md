---
description: Extract strict content structure (schema) from a Figma presentation template.
---

# Figma MCP Context View Presentation

Use this workflow to analyze a presentation slide template and generate a JSON schema that defines exactly where content should go. This schema is then used by `/figma-mcp-create-presentation` to ensure perfect content placement.

## Steps

1.  **Select the Template**: Click on the frame you want to use as a template in Figma.
2.  **Run Extraction Script**: Execute the script below to analyze the frame.
3.  **Save Output**: Save the returned JSON as a schema file (e.g., `slide_schema.json`).

## Extraction Script

This script scans the selected frame and identifies "Slots" for content based on text nodes. It generates "Stable Selectors" (using position and font size) so that the content finds the right place even after cloning.

```javascript
// figma-mcp-context-view-presentation
// Extract Content Schema

const selection = figma.currentPage.selection;
if (selection.length !== 1 || selection[0].type !== "FRAME") {
    return "Error: Please select exactly one FRAME to analyze.";
}

const template = selection[0];
const textNodes = template.findAll(n => n.type === "TEXT");

// 1. Sort nodes (Top-to-Bottom, Left-to-Right) to guess logical order
textNodes.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 10) return a.y - b.y; // Y priority
    return a.x - b.x; // Then X
});

// 2. Build Schema
const slots = textNodes.map((node, index) => {
    // Heuristic Role Assignment
    let role = "BODY";
    
    // Handle Mixed Font Size (assume significant if mixed)
    const size = (typeof node.fontSize === 'number') ? node.fontSize : 100; 

    if (index === 0 && size > 24) role = "TITLE";
    else if (index === 1 && size > 18) role = "SUBTITLE";
    else if (node.characters.toLowerCase().includes("date")) role = "DATE";
    else if (node.characters.match(/\d+\/\d+/)) role = "PAGE_NUMBER";

    return {
        id: `slot_${index}`,
        role: role,
        name: node.name,
        // STABLE SELECTOR: Properties to match in the clone
        selector: {
            // Note: We use loose matching for robustness
            type: "TEXT",
            x: Math.round(node.x),
            y: Math.round(node.y),
            fontSize: (typeof node.fontSize === 'number') ? node.fontSize : "mixed"
            // fontFamily: node.fontName.family
        },
        // Heuristic: Current content helps user identify the slot
        previewContent: node.characters
    };
});

const schema = {
    templateName: template.name,
    templateId: template.id,
    templateWidth: template.width,
    templateHeight: template.height,
    slots: slots
};

return JSON.stringify(schema, null, 2);
```

## How to use the Output

The JSON output looks like this:

```json
{
  "templateName": "Cover Slide",
  "slots": [
    {
      "id": "slot_0",
      "role": "TITLE",
      "selector": { "x": 100, "y": 50, "fontSize": 64 },
      "previewContent": "Big Title Here"
    }
  ]
}
```

You should copy this JSON and provide it as the `schema` input to the `/figma-mcp-create-presentation` workflow.
