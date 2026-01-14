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
- paintStyles: All color/fill styles (local + library) with IDs and resolved colors
- textStyles: All text styles with font info, sizes, and IDs
- effectStyles: All effect styles (shadows, blur)
- components: All available components with IDs and keys
- variables: All design tokens/variables with resolved values
- selection: Current selection summary (count, types, basic info)

This gives you everything needed to:
1. Know which fonts are safe to use
2. Find existing styles to apply (use style.id)
3. Find components to instantiate
4. Understand what's currently selected`,
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
