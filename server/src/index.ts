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

const WS_PORT = parseInt(process.env.WS_PORT || "9000", 10);
const RESPONSE_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// State
// ============================================================================

let figmaPlugin: WebSocket | null = null;
let pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
> = new Map();

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
    result?: unknown;
    error?: string;
    stack?: string;
}) {
    if (message.type === "execution_result" && message.requestId) {
        const pending = pendingRequests.get(message.requestId);
        if (pending) {
            pendingRequests.delete(message.requestId);
            if (message.error) {
                pending.reject(
                    new Error(`${message.error}${message.stack ? '\nStack trace:\n' + message.stack : ''}`)
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
            reject(new Error("Figma plugin is not connected. Please open Figma and run the Figma Bridge plugin."));
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
        name: "figma-bridge",
        version: "2.0.0",
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
                name: "get_figma_state",
                description: `Check if the Figma plugin is connected and ready.

Returns:
- connected: boolean - Whether the plugin is connected
- ready: boolean - Whether commands can be executed

Call this first to verify the connection before executing commands.`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_design_context",
                description: `Get comprehensive design context from Figma in a single call.

**ALWAYS CALL THIS FIRST** before creating or modifying elements.

Returns:
- availableFonts: List of fonts that can be loaded (family + styles)
- paintStyles: Local color/fill styles with IDs and resolved colors
- textStyles: Local text styles with font info, sizes, and IDs
- effectStyles: Local effect styles (shadows, blur)
- components: Local components with IDs and keys
- variables: Local design tokens/variables with resolved values
- libraryVariableCollections: Variable collections from linked libraries
- usedStyles: ALL styles used in the document (local + library) with full details
- libraryComponents: Library components found via instances in the document
- selection: Current selection summary (count, types, basic info)

This gives you everything needed to:
1. Know which fonts are safe to use
2. Find existing styles to apply (use style.id)
3. Find components to instantiate (both local and library)
4. Understand what's currently selected
5. Access library styles and components that are in use`,
                inputSchema: {
                    type: "object",
                    properties: {
                        includeLibraryStyles: {
                            type: "boolean",
                            description: "Include styles from linked libraries (default: true)",
                        },
                        fontFamilyFilter: {
                            type: "string",
                            description: "Optional: filter fonts by family name (e.g., 'Inter')",
                        },
                    },
                },
            },
            {
                name: "execute_figma_command",
                description: `Execute JavaScript code in the Figma plugin sandbox.

⚠️ MANDATORY: Use document styles - NEVER hardcode colors/fonts!

BEFORE using this tool:
1. Call get_document_styles to get all style IDs
2. Use those IDs via node.fillStyleId, node.textStyleId, etc.

WRONG (hardcoded):
  node.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.6, b: 0.4 } }];

CORRECT (using style):
  const styles = figma.getLocalPaintStyles();
  const primary = styles.find(s => s.name === "Primary/300");
  if (primary) node.fillStyleId = primary.id;

EXECUTION RULES:
1. Load fonts FIRST: await figma.loadFontAsync({ family: "Inter", style: "Regular" })
2. Set layoutMode BEFORE adding children
3. Set layoutSizingHorizontal AFTER appendChild
4. Always check node exists: if (!node) return { error: "..." }

TEMPLATE:
\`\`\`javascript
// 1. Load fonts
await figma.loadFontAsync({ family: "Inter", style: "Regular" });

// 2. Get styles (ALWAYS DO THIS)
const paintStyles = figma.getLocalPaintStyles();
const findPaint = (name) => paintStyles.find(s => s.name === name);
const $ = {
    primary: findPaint("Primary/300"),
    dark: findPaint("Greyscale/500"),
    white: findPaint("Greyscale/0"),
};

// 3. Create with style IDs
const frame = figma.createFrame();
if ($.primary) frame.fillStyleId = $.primary.id;
\`\`\``,
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
                name: "get_document_manifest",
                description: `Get a lightweight overview of the Figma document structure.

Returns:
- documentName: Name of the Figma file
- pages: List of pages with their IDs, names, and top-level frames

Use this to understand document structure before deep-scanning specific pages.`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "deep_scan_page",
                description: `Get detailed information about all nodes on a specific page.

Returns the complete node tree including:
- Node hierarchy with types, names, positions, sizes
- Style IDs applied to each node
- Actual fill/stroke/effect values
- Text content and typography properties
- Auto-layout configuration
- Component instance references

WARNING: Large pages may return a lot of data. Use get_document_manifest first to find specific page IDs.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: {
                            type: "string",
                            description: "The ID of the page to scan (from get_document_manifest)",
                        },
                    },
                    required: ["pageId"],
                },
            },
            {
                name: "get_selection_context",
                description: `Get detailed information about currently selected nodes.

Returns for each selected node:
- id, name, type, position, size
- fills/strokes with hex colors
- typography (for text nodes)
- auto-layout spacing
- effects (shadows, blur)
- component info (for instances)
- variable bindings

Best for understanding what the user has selected before making modifications.`,
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "export_node_image",
                description: `Export a screenshot of a Figma node as base64 PNG/JPG.

Use to:
- Verify visual changes after modifications
- Understand complex layouts visually
- Capture design state for reference

Returns base64 image data, dimensions, and format.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: {
                            type: "string",
                            description: "ID of node to export. If not provided, exports first selected node.",
                        },
                        scale: {
                            type: "number",
                            description: "Export scale 1-4 (default: 2)",
                        },
                        format: {
                            type: "string",
                            enum: ["png", "jpg"],
                            description: "Image format (default: png)",
                        },
                    },
                },
            },
            {
                name: "analyze_patterns",
                description: `Analyze design patterns used in a Figma page to understand the design system.

**Use this to understand how pages are structured** before creating new pages.

Returns comprehensive pattern analysis including:
- colors: Top colors used with usage counts and style names
- typography: Font families and styles with usage counts
- spacing: Common spacing values and detected scale (4px, 8px base)
- sizing: Common frame/component dimensions
- cornerRadius: Common border radius values
- layout: Auto-layout distribution (horizontal, vertical, none)
- components: Most used components (local and library)
- pageStructure: Structural element analysis including:
  - Headers, navigation, sidebars, footers detected by name/position
  - Page templates showing top-to-bottom structure of each frame
  - Component keys for library elements to replicate structure

Use this to ensure new pages follow the same structure and patterns.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: {
                            type: "string",
                            description: "Optional page ID to analyze. If not provided, analyzes current page.",
                        },
                    },
                },
            },
            {
                name: "clone_node",
                description: `Clone/duplicate a node (frame, component, instance, etc.) to reuse existing patterns.

**Use this to avoid recreating patterns from scratch.** Instead of building from scratch:
1. Use analyze_patterns to find existing frames with the structure you need
2. Use clone_node to duplicate them
3. Modify the cloned node as needed

Parameters:
- targetNodeId: ID of the node to clone (required)
- newName: Optional new name for the cloned node
- offsetX/offsetY: Position offset from original (default: 100px right)
- targetParentId: Optional parent to place the clone in

Returns the cloned node's ID for further modifications.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        targetNodeId: {
                            type: "string",
                            description: "ID of the node to clone",
                        },
                        newName: {
                            type: "string",
                            description: "Optional new name for the cloned node",
                        },
                        offsetX: {
                            type: "number",
                            description: "Horizontal offset from original position (default: 100)",
                        },
                        offsetY: {
                            type: "number",
                            description: "Vertical offset from original position (default: 0)",
                        },
                        targetParentId: {
                            type: "string",
                            description: "Optional parent node ID to place the clone in",
                        },
                    },
                    required: ["targetNodeId"],
                },
            },
            {
                name: "scan_presentation",
                description: `Scan a presentation to identify slides and their editable slots.

**Features:**
- Auto-classifies slides (cover, toc, separator, content, end)
- Caches results - subsequent calls return cached data instantly
- Use forceRescan: true to refresh the cache

Returns for each slide:
- id, name, classification (cover/toc/separator/content/end)
- slots: Array of text/image slots with IDs and content

Workflow:
1. scan_presentation - get structure (cached after first call)
2. configure_presentation - mark special slides
3. fill_slide - populate content`,
                inputSchema: {
                    type: "object",
                    properties: {
                        slideId: {
                            type: "string",
                            description: "Optional specific slide ID to scan",
                        },
                        forceRescan: {
                            type: "boolean",
                            description: "Force rescan even if cached data exists",
                        },
                    },
                },
            },
            {
                name: "fill_slide",
                description: `Fill data into a presentation slide's editable slots.

Workflow:
1. Use scan_presentation to get the slide structure and slot IDs
2. Use fill_slide to populate the slots with your content

Parameters:
- slideId: The slide frame ID
- slots: Array of objects with slotId and content

Example usage:
{
  "slideId": "123:456",
  "slots": [
    { "slotId": "123:457", "content": "My Presentation Title" },
    { "slotId": "123:458", "content": "Subtitle or description" }
  ]
}`,
                inputSchema: {
                    type: "object",
                    properties: {
                        slideId: {
                            type: "string",
                            description: "The slide frame ID to fill",
                        },
                        slots: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    slotId: {
                                        type: "string",
                                        description: "The slot node ID from scan_presentation",
                                    },
                                    content: {
                                        type: "string",
                                        description: "The text content to fill in",
                                    },
                                },
                                required: ["slotId", "content"],
                            },
                            description: "Array of slot fills",
                        },
                    },
                    required: ["slideId", "slots"],
                },
            },
            {
                name: "configure_presentation",
                description: `Configure which slides are special (cover, ToC, separators, end).

Use this to tell the AI which slides have special purposes:
- cover: Title/intro slide
- toc: Table of contents / agenda
- separators: Section divider slides (array)
- end: Thank you / closing slide

These IDs are saved in the plugin and used for intelligent filling.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        cover: {
                            type: "string",
                            description: "Slide ID for the cover/title slide",
                        },
                        toc: {
                            type: "string",
                            description: "Slide ID for table of contents",
                        },
                        separators: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of slide IDs for section separators",
                        },
                        end: {
                            type: "string",
                            description: "Slide ID for end/thank you slide",
                        },
                    },
                },
            },
            {
                name: "get_presentation_cache",
                description: `Get the cached presentation structure without rescanning.

Returns the cached presentation including:
- All slides with their classifications
- All slots per slide
- User configuration

Use this for fast access to the presentation structure after initial scan.`,
                inputSchema: {
                    type: "object",
                    properties: {},
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
            case "get_figma_state": {
                const isConnected = figmaPlugin?.readyState === WebSocket.OPEN;
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                {
                                    connected: isConnected,
                                    ready: isConnected,
                                    message: isConnected
                                        ? "Figma plugin is connected and ready"
                                        : "Figma plugin is not connected. Please open Figma and run the Figma Bridge plugin.",
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            }

            case "get_design_context": {
                const { includeLibraryStyles, fontFamilyFilter } = (args || {}) as {
                    includeLibraryStyles?: boolean;
                    fontFamilyFilter?: string;
                };
                const result = await sendToPlugin({
                    type: "get_design_context",
                    includeLibraryStyles: includeLibraryStyles !== false,
                    fontFamilyFilter,
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
                const { nodeId, scale, format } = (args || {}) as {
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

            case "analyze_patterns": {
                const { pageId } = (args || {}) as { pageId?: string };
                const result = await sendToPlugin({
                    type: "analyze_patterns",
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

            case "clone_node": {
                const { targetNodeId, newName, offsetX, offsetY, targetParentId } = (args || {}) as {
                    targetNodeId: string;
                    newName?: string;
                    offsetX?: number;
                    offsetY?: number;
                    targetParentId?: string;
                };
                const result = await sendToPlugin({
                    type: "clone_node",
                    targetNodeId,
                    newName,
                    offsetX: offsetX ?? 100,
                    offsetY: offsetY ?? 0,
                    targetParentId,
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

            case "scan_presentation": {
                const { slideId, forceRescan } = (args || {}) as { slideId?: string; forceRescan?: boolean };
                const result = await sendToPlugin({
                    type: "scan_presentation",
                    slideId,
                    forceRescan,
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

            case "fill_slide": {
                const { slideId, slots } = (args || {}) as {
                    slideId: string;
                    slots: Array<{ slotId: string; content: string }>;
                };
                const result = await sendToPlugin({
                    type: "fill_slide",
                    slideId,
                    slots,
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

            case "configure_presentation": {
                const config = (args || {}) as {
                    cover?: string;
                    toc?: string;
                    separators?: string[];
                    end?: string;
                };
                const result = await sendToPlugin({
                    type: "configure_presentation",
                    presentationConfig: config,
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

            case "get_presentation_cache": {
                const result = await sendToPlugin({
                    type: "get_presentation_cache",
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result ?? { success: false, message: "No response" }, null, 2),
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
                    text: JSON.stringify({ error: errorMessage }, null, 2),
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
