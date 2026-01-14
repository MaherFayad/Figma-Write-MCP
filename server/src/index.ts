import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer, WebSocket } from "ws";

// ============================================================================
// Configuration
// ============================================================================

const WS_PORT = 9000;
const RESPONSE_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// State
// ============================================================================

let figmaPlugin: WebSocket | null = null;
let currentMode: string = "editing";
let pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
> = new Map();

// ============================================================================
// Mode-Specific System Prompts
// ============================================================================

const MODE_SYSTEM_PROMPTS: Record<string, string> = {
    editing: `# EDITING MODE - Modify Existing Elements

You are in EDITING mode. Your primary focus is modifying the currently selected nodes in Figma.

## Available Operations
- Change fills, strokes, effects on selected nodes
- Modify text content, fonts, and typography
- Adjust positioning, sizing, and constraints
- Apply existing styles (fillStyleId, textStyleId, effectStyleId)
- Modify auto-layout properties (padding, spacing, alignment)
- Update corner radius, opacity, blend modes
- Rename nodes and reorganize layers

## Workflow
1. First call \`get_selection_context\` to understand what's selected
2. Call \`get_document_styles\` to find existing styles to apply
3. Use \`execute_figma_command\` to make modifications
4. Optionally call \`export_node_image\` to verify visual changes

## Best Practices
- Always check if a node is selected before modifying
- Use existing style IDs instead of hardcoding values
- For text changes, always load fonts with \`await figma.loadFontAsync()\`
- Check node type before accessing type-specific properties
- Use \`node.detachInstance()\` if modifying component instances

## Example: Change Selected Node Fill
\`\`\`javascript
const node = figma.currentPage.selection[0];
if (!node) return { error: "No node selected" };
if (!("fills" in node)) return { error: "Node doesn't support fills" };

// Use existing style if available
const styles = figma.getLocalPaintStyles();
const primaryStyle = styles.find(s => s.name.includes("Primary"));
if (primaryStyle) {
    node.fillStyleId = primaryStyle.id;
} else {
    node.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.4, b: 0.8 } }];
}
return "Fill updated successfully";
\`\`\``,

    creating: `# CREATING MODE - Generate New Elements

You are in CREATING mode. Your primary focus is generating new design elements in Figma.

## Available Operations
- Create frames, rectangles, ellipses, polygons, lines
- Create text nodes with proper font loading
- Create component instances from existing components
- Build complex layouts with auto-layout frames
- Generate design patterns (cards, buttons, lists, etc.)

## Workflow
1. ALWAYS call \`get_document_styles\` FIRST to see available styles/components
2. Call \`get_document_manifest\` to understand page structure
3. Use \`execute_figma_command\` to create elements
4. Apply existing styles by ID (never recreate existing styles)
5. Call \`export_node_image\` to show the created result

## Best Practices
- Check for existing styles/components before creating new ones
- Use \`node.fillStyleId = "S:xxx:xxx"\` instead of hardcoding colors
- Create component instances: \`component.createInstance()\`
- Use auto-layout for consistent spacing
- Load fonts before creating text: \`await figma.loadFontAsync(...)\`
- Append new nodes: \`figma.currentPage.appendChild(node)\`

## Example: Create Auto-Layout Card
\`\`\`javascript
// Get existing styles first
const styles = figma.getLocalPaintStyles();
const bgStyle = styles.find(s => s.name.includes("Surface") || s.name.includes("Background"));

// Create frame with auto-layout
const card = figma.createFrame();
card.name = "Card";
card.layoutMode = "VERTICAL";
card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 16;
card.itemSpacing = 12;
card.cornerRadius = 12;
card.resize(320, 1); // Width fixed, height hugs content
card.primaryAxisSizingMode = "AUTO";

// Apply existing style or fallback
if (bgStyle) {
    card.fillStyleId = bgStyle.id;
} else {
    card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
}

// Add text
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
const title = figma.createText();
title.characters = "Card Title";
title.fontSize = 18;
card.appendChild(title);

figma.currentPage.appendChild(card);
return { id: card.id, name: card.name };
\`\`\``,

    context: `# CONTEXT MODE - Read-Only Analysis

You are in CONTEXT mode. Your primary focus is gathering and analyzing design information WITHOUT making changes.

## Available Operations
- Scan document structure (pages, frames, components)
- Analyze design patterns and component usage
- Extract design tokens (colors, typography, spacing)
- Capture screenshots for visual reference
- Export style and variable definitions
- Understand component hierarchy and variants

## Workflow
1. Call \`get_document_manifest\` for document overview
2. Call \`get_document_styles\` for design tokens
3. Call \`deep_scan_page\` for detailed page structure
4. Call \`get_selection_context\` for selected element details
5. Call \`export_node_image\` for visual screenshots

## Best Practices
- Use manifest first for lightweight overview
- Deep scan only specific pages you need
- Use \`export_node_image\` to capture visual context
- Extract hex colors from RGB values: \`#\${Math.round(r*255).toString(16).padStart(2,'0')}...\`
- Identify patterns by analyzing repeated structures

## Example: Analyze Design System
\`\`\`javascript
// Get all design tokens
const paintStyles = figma.getLocalPaintStyles();
const textStyles = figma.getLocalTextStyles();
const variables = await figma.variables.getLocalVariablesAsync();
const collections = await figma.variables.getLocalVariableCollectionsAsync();

return {
    colors: paintStyles.map(s => ({
        name: s.name,
        id: s.id,
        paints: s.paints
    })),
    typography: textStyles.map(s => ({
        name: s.name,
        fontSize: s.fontSize,
        fontName: s.fontName
    })),
    variableCount: variables.length,
    collectionCount: collections.length
};
\`\`\`

## DO NOT in Context Mode
- Modify any nodes or properties
- Create new elements
- Delete or rename nodes
- Apply or change styles`,

    misc: `# MISC MODE - Utilities & Diagnostics

You are in MISC mode. Your focus is on utility operations, diagnostics, and batch tasks.

## Available Operations
- Plugin connection diagnostics
- Batch renaming and organization
- Export operations (images, SVGs)
- Cleanup tasks (remove hidden nodes, flatten groups)
- Performance analysis
- Variable/style auditing

## Workflow
1. Check connection status with \`get_figma_state\`
2. Use \`get_document_manifest\` to understand document scope
3. Execute utility operations via \`execute_figma_command\`
4. Verify results with \`get_selection_context\` or \`export_node_image\`

## Example: Batch Rename Layers
\`\`\`javascript
const selection = figma.currentPage.selection;
if (selection.length === 0) return { error: "No nodes selected" };

let renamed = 0;
selection.forEach((node, index) => {
    node.name = \`Layer-\${(index + 1).toString().padStart(2, '0')}\`;
    renamed++;
});

return { message: \`Renamed \${renamed} layers\` };
\`\`\`

## Example: Find Unused Styles
\`\`\`javascript
const paintStyles = figma.getLocalPaintStyles();
const allNodes = figma.root.findAll(n => "fillStyleId" in n);
const usedIds = new Set(allNodes.map(n => n.fillStyleId).filter(Boolean));

const unusedStyles = paintStyles.filter(s => !usedIds.has(s.id));
return {
    total: paintStyles.length,
    unused: unusedStyles.map(s => s.name)
};
\`\`\``
};

// ============================================================================
// WebSocket Server
// ============================================================================

const wss = new WebSocketServer({ port: WS_PORT });

console.error(`[MCP Server] WebSocket server listening on port ${WS_PORT}`);

wss.on("connection", (ws: WebSocket) => {
    console.error("[MCP Server] Figma plugin connected");
    figmaPlugin = ws;

    ws.on("message", (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString());
            handlePluginMessage(message);
        } catch (error) {
            console.error("[MCP Server] Failed to parse message:", error);
        }
    });

    ws.on("close", () => {
        console.error("[MCP Server] Figma plugin disconnected");
        figmaPlugin = null;
        // Reject all pending requests
        for (const [id, { reject }] of pendingRequests) {
            reject(new Error("Figma plugin disconnected"));
            pendingRequests.delete(id);
        }
    });

    ws.on("error", (error: Error) => {
        console.error("[MCP Server] WebSocket error:", error);
    });
});

function handlePluginMessage(message: {
    type: string;
    requestId?: string;
    mode?: string;
    result?: unknown;
    error?: string;
    stack?: string;
}) {
    if (message.type === "mode_update") {
        currentMode = message.mode || "editing";
        console.error(`[MCP Server] Plugin mode changed to: ${currentMode}`);
        return;
    }

    if (message.type === "execution_result" && message.requestId) {
        const pending = pendingRequests.get(message.requestId);
        if (pending) {
            pendingRequests.delete(message.requestId);
            if (message.error) {
                pending.reject(
                    new Error(`${message.error}\n\nStack trace:\n${message.stack || "N/A"}`)
                );
            } else {
                pending.resolve(message.result);
            }
        }
    }
}

function sendToPlugin(message: object): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (!figmaPlugin || figmaPlugin.readyState !== WebSocket.OPEN) {
            reject(new Error("Figma plugin is not connected"));
            return;
        }

        const requestId = crypto.randomUUID();
        const fullMessage = { ...message, requestId };

        pendingRequests.set(requestId, { resolve, reject });

        // Timeout handling
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error("Request timed out waiting for Figma plugin response"));
            }
        }, RESPONSE_TIMEOUT);

        figmaPlugin.send(JSON.stringify(fullMessage));
    });
}

// ============================================================================
// MCP Server
// ============================================================================

const server = new Server(
    {
        name: "figma-ide-bridge",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "execute_figma_command",
                description: `Execute JavaScript code inside the Figma plugin sandbox. The code has access to the 'figma' global object (Figma Plugin API). Returns the result of the code execution or an error with stack trace if it fails.

IMPORTANT: The code is executed in the Figma main thread. Use 'await' for async operations. The last expression's value is returned, or you can use explicit return statements.

BEST PRACTICES FOR STYLE CONSISTENCY:
1. ALWAYS call get_document_styles first to see available styles/variables/components
2. Use existing style IDs instead of creating new styles:
   - node.fillStyleId = "S:1234:5678" (use ID from get_document_styles)
   - node.textStyleId = "S:abcd:efgh" (use ID from get_document_styles)
3. Check for existing styles before creating:
   const styles = await get_document_styles();
   const existingStyle = styles.paintStyles.find(s => s.name === "Primary/Blue");
   if (existingStyle) {
     node.fillStyleId = existingStyle.id;
   }
4. Use component IDs when creating instances:
   const component = styles.components.find(c => c.name === "Button");
   if (component) {
     const instance = component.createInstance();
   }
5. Use variable IDs for bound variables when available

Example: "figma.currentPage.selection[0]?.name" returns the name of the first selected node.

Example with styles:
const styles = await get_document_styles();
const primaryStyle = styles.paintStyles.find(s => s.name.includes("Primary"));
if (primaryStyle) {
  node.fillStyleId = primaryStyle.id;
  return "Applied existing style: " + primaryStyle.name;
}`,
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "JavaScript code to execute in the Figma plugin sandbox",
                        },
                    },
                    required: ["code"],
                },
            },
            {
                name: "get_figma_state",
                description: `Get the current state of the Figma plugin, including:
- Connection status (connected/disconnected)
- Current mode (editing/creating/context/misc)
- Whether the plugin is ready to receive commands
- Mode-specific system prompt with detailed instructions for the AI agent

The systemPrompt field contains comprehensive guidance for the current mode, including:
- Available operations for this mode
- Recommended workflow steps
- Best practices and code examples
- What to avoid in this mode`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_document_manifest",
                description: `Get a lightweight manifest of the Figma document structure. Returns a list of all pages with their top-level frame names and IDs. Use this to understand the document structure before doing a deep scan of specific pages.`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "deep_scan_page",
                description: `Perform a detailed scan of a specific page in the Figma document. Returns the complete node tree for that page, including all layers, their types, names, properties, and style information.

The scan now includes:
- Style IDs (fillStyleId, strokeStyleId, textStyleId, effectStyleId)
- Actual fills, strokes, and effects (serialized)
- Text properties (fontName, fontSize, fontWeight, lineHeight, etc.)
- Layout properties (layoutMode, padding, itemSpacing, etc.)
- Component references (mainComponentId for instances)
- Variable bindings (boundVariables)

Use this to understand the complete structure and styling of a page before creating or modifying elements.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: {
                            type: "string",
                            description: "The ID of the page to scan (get this from get_document_manifest)",
                        },
                    },
                    required: ["pageId"],
                },
            },
            {
                name: "get_document_styles",
                description: `Get all local styles, variables, and components from the Figma document with their IDs.

Returns:
- paintStyles: All local paint/color styles with IDs and paint definitions
- textStyles: All local text styles with IDs and typography properties
- effectStyles: All local effect styles with IDs and effect definitions
- variables: All local variables with IDs, names, and values per mode
- variableCollections: All variable collections with their modes
- components: All component definitions with IDs and keys
- componentSets: All component set definitions with IDs and keys

CRITICAL: Always call this tool first when creating new elements to:
1. Check if styles/variables/components already exist before creating new ones
2. Use existing style IDs (fillStyleId, textStyleId, etc.) instead of creating duplicates
3. Reference existing components by ID when creating instances
4. Use variable IDs for bound variables

Example workflow:
1. Call get_document_styles to see available styles
2. Find matching style by name (e.g., "Primary/Blue")
3. Use the style.id in your code: node.fillStyleId = "S:1234:5678"
4. This ensures consistency with the design system`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_selection_context",
                description: `Get comprehensive details about the currently selected nodes in Figma.

Returns detailed information for each selected node including:
- Basic info: id, name, type, position, size
- Colors: fills and strokes with hex color values (e.g., "#1A2B3C")
- Typography: font family, size, weight, line height, letter spacing (for text nodes)
- Spacing: padding (top/right/bottom/left), item spacing, gap
- Layout: auto-layout mode, alignment, sizing mode, constraints
- Effects: drop shadows, inner shadows, blur with full parameters
- Corner radius (individual corners if different)
- Component info: main component ID/key for instances, variant properties
- Variable bindings: which variables are bound to which properties

This is the best tool to call first when you need to understand what the user has selected.
Use this before making modifications in Editing mode or to analyze elements in Context mode.`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "export_node_image",
                description: `Export a screenshot/image of a Figma node as base64-encoded data.

Use this to visually understand what a design looks like. The image can be used to:
- Verify visual changes after modifications
- Understand complex layouts that are hard to describe with data alone
- Capture the current state of a design for reference
- Show the user what you're working with

Returns:
- base64: The image data as a base64-encoded string
- format: The image format (png or jpg)
- width: Image width in pixels
- height: Image height in pixels

Note: Large nodes or complex designs may take a few seconds to export.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: {
                            type: "string",
                            description: "ID of the node to export. If not provided, exports the first selected node.",
                        },
                        scale: {
                            type: "number",
                            description: "Export scale (1-4). Default is 2 for good quality. Higher = larger file.",
                        },
                        format: {
                            type: "string",
                            enum: ["png", "jpg"],
                            description: "Image format. PNG for transparency, JPG for smaller size. Default: png",
                        },
                    },
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "execute_figma_command": {
                const code = (args as { code: string }).code;
                const result = await sendToPlugin({
                    type: "execute",
                    code,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            case "get_figma_state": {
                const isConnected = figmaPlugin?.readyState === WebSocket.OPEN;
                const systemPrompt = MODE_SYSTEM_PROMPTS[currentMode] || MODE_SYSTEM_PROMPTS.editing;
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                {
                                    connected: isConnected,
                                    mode: currentMode,
                                    ready: isConnected,
                                    systemPrompt,
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            }

            case "get_document_manifest": {
                const result = await sendToPlugin({
                    type: "get_manifest",
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            case "deep_scan_page": {
                const pageId = (args as { pageId: string }).pageId;
                const result = await sendToPlugin({
                    type: "deep_scan",
                    pageId,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            case "get_document_styles": {
                const result = await sendToPlugin({
                    type: "get_styles",
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            case "get_selection_context": {
                const result = await sendToPlugin({
                    type: "get_selection_context",
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            case "export_node_image": {
                const { nodeId, scale, format } = args as {
                    nodeId?: string;
                    scale?: number;
                    format?: "png" | "jpg";
                };
                const result = await sendToPlugin({
                    type: "export_node_image",
                    nodeId,
                    scale: scale || 2,
                    format: format || "png",
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP Server] MCP server running on stdio");
}

main().catch((error) => {
    console.error("[MCP Server] Fatal error:", error);
    process.exit(1);
});
