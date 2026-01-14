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
- Whether the plugin is ready to receive commands`,
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
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                {
                                    connected: isConnected,
                                    mode: currentMode,
                                    ready: isConnected,
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
