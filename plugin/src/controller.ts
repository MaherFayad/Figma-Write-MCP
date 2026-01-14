// ============================================================================
// Figma Plugin Controller - Main Thread
// ============================================================================
// This code runs in the Figma sandbox and handles:
// - Message relay between UI and Figma API
// - Code execution from the IDE
// - Smart Scan helpers for document traversal

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 500 });

// ============================================================================
// Message Handling
// ============================================================================

figma.ui.onmessage = async (msg: {
    type: string;
    requestId?: string;
    code?: string;
    pageId?: string;
    mode?: string;
    message?: { width?: number; height?: number };
}) => {
    const { type, requestId, message } = msg;

    try {
        switch (type) {
            case "execute":
                await handleExecute(msg.code!, requestId!);
                break;

            case "get_manifest":
                await handleGetManifest(requestId!);
                break;

            case "deep_scan":
                await handleDeepScan(msg.pageId!, requestId!);
                break;

            case "get_styles":
                await handleGetStyles(requestId!);
                break;

            case "mode_change":
                // Just a notification from UI, no action needed on main thread
                break;

            case "resize":
                if (message?.width && message?.height) {
                    figma.ui.resize(message.width, message.height);
                }
                break;

            case "saveSize":
                // Could save to clientStorage if needed
                if (message?.width && message?.height) {
                    figma.clientStorage.setAsync("pluginSize", { width: message.width, height: message.height });
                }
                break;

            case "defaultSize":
                figma.ui.resize(400, 500);
                break;

            default:
                sendError(requestId, `Unknown message type: ${type}`);
        }
    } catch (error) {
        sendError(requestId, error);
    }
};


// ============================================================================
// Code Execution Engine
// ============================================================================

async function handleExecute(code: string, requestId: string) {
    try {
        // Validate input
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            sendError(requestId, 'Code must be a non-empty string', 'validation');
            return;
        }

        // Create async function that executes the user's code
        // Always wrap in async function to handle both sync and async code
        const trimmedCode = code.trim();

        // Check if code already has a return statement
        const hasReturn = trimmedCode.includes('return ') || trimmedCode.startsWith('return ');

        // Build the function body - if no return, add one
        let functionBody: string;
        if (hasReturn) {
            functionBody = code;
        } else {
            // Try to treat as expression first (single line, no semicolons usually means expression)
            const isLikelyExpression = !trimmedCode.includes(';') &&
                !trimmedCode.includes('{') &&
                !trimmedCode.includes('function') &&
                trimmedCode.split('\n').length === 1;

            if (isLikelyExpression) {
                functionBody = `return ${code};`;
            } else {
                // Execute as statements
                functionBody = `${code}\nreturn undefined;`;
            }
        }

        // Create async function - use eval-like approach that works in Figma sandbox
        // Wrap code in async IIFE and execute using Function constructor
        // This approach avoids directly accessing AsyncFunction constructor
        const wrappedCode = `
            return new Promise(async (resolve, reject) => {
                try {
                    const result = await (async function(figma) {
                        ${functionBody}
                    })(figma);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        `;

        const fn = new Function("figma", wrappedCode);
        const result = await fn(figma);

        // Serialize result for transport
        const serializedResult = serializeForTransport(result);

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: serializedResult,
        });
    } catch (error) {
        // Enhanced error reporting
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        sendError(requestId, `Execution failed: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, 'execution');
    }
}

// ============================================================================
// Smart Scan - Manifest Helper
// ============================================================================

async function handleGetManifest(requestId: string) {
    const manifest = {
        documentName: figma.root.name,
        pages: figma.root.children.map((page) => ({
            id: page.id,
            name: page.name,
            topLevelFrames: page.children
                .filter((node) => node.type === "FRAME" || node.type === "COMPONENT")
                .slice(0, 50) // Limit to prevent huge payloads
                .map((frame) => ({
                    id: frame.id,
                    name: frame.name,
                    type: frame.type,
                })),
            totalChildren: page.children.length,
        })),
    };

    figma.ui.postMessage({
        type: "execution_result",
        requestId,
        result: manifest,
    });
}

// ============================================================================
// Smart Scan - Deep Page Scan
// ============================================================================

async function handleDeepScan(pageId: string, requestId: string) {
    const page = figma.root.children.find((p) => p.id === pageId);

    if (!page) {
        sendError(requestId, `Page not found: ${pageId}`);
        return;
    }

    const scanNode = (node: SceneNode, depth: number = 0): object => {
        const base: Record<string, unknown> = {
            id: node.id,
            name: node.name,
            type: node.type,
        };

        // Add position/size if available
        if ("x" in node && "y" in node) {
            base.x = node.x;
            base.y = node.y;
        }
        if ("width" in node && "height" in node) {
            base.width = node.width;
            base.height = node.height;
        }

        // Capture style IDs
        if ("fillStyleId" in node && node.fillStyleId) {
            base.fillStyleId = node.fillStyleId;
        }
        if ("strokeStyleId" in node && node.strokeStyleId) {
            base.strokeStyleId = node.strokeStyleId;
        }
        if ("effectStyleId" in node && node.effectStyleId) {
            base.effectStyleId = node.effectStyleId;
        }
        if ("textStyleId" in node && node.textStyleId) {
            base.textStyleId = node.textStyleId;
        }

        // Capture actual fills, strokes, effects (serialized)
        if ("fills" in node) {
            try {
                base.fills = serializePaints(node.fills);
            } catch (e) {
                // Ignore if fills can't be serialized
            }
        }
        if ("strokes" in node) {
            try {
                base.strokes = serializePaints(node.strokes);
            } catch (e) {
                // Ignore if strokes can't be serialized
            }
        }
        if ("effects" in node) {
            try {
                base.effects = serializeEffects(node.effects);
            } catch (e) {
                // Ignore if effects can't be serialized
            }
        }

        // Text-specific properties
        if (node.type === "TEXT") {
            const textNode = node as TextNode;
            base.characters = textNode.characters;
            base.fontName = textNode.fontName;
            base.fontSize = textNode.fontSize;
            base.fontWeight = textNode.fontWeight;
            base.lineHeight = textNode.lineHeight;
            base.letterSpacing = textNode.letterSpacing;
            base.textAlignHorizontal = textNode.textAlignHorizontal;
            base.textAlignVertical = textNode.textAlignVertical;
            base.textCase = textNode.textCase;
            base.textDecoration = textNode.textDecoration;
        }

        // Frame/Component layout properties
        if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
            const frameNode = node as FrameNode | ComponentNode | InstanceNode;
            if ("layoutMode" in frameNode) {
                base.layoutMode = frameNode.layoutMode;
                base.paddingTop = frameNode.paddingTop;
                base.paddingRight = frameNode.paddingRight;
                base.paddingBottom = frameNode.paddingBottom;
                base.paddingLeft = frameNode.paddingLeft;
                base.itemSpacing = frameNode.itemSpacing;
                base.primaryAxisAlignItems = frameNode.primaryAxisAlignItems;
                base.counterAxisAlignItems = frameNode.counterAxisAlignItems;
                base.layoutWrap = frameNode.layoutWrap;
            }
            if ("cornerRadius" in frameNode) {
                base.cornerRadius = frameNode.cornerRadius;
            }
        }

        // Component instance properties
        if (node.type === "INSTANCE") {
            const instanceNode = node as InstanceNode;
            if (instanceNode.mainComponent) {
                base.mainComponentId = instanceNode.mainComponent.id;
                base.mainComponentKey = instanceNode.mainComponent.key;
            }
        }

        // Component properties
        if (node.type === "COMPONENT") {
            const componentNode = node as ComponentNode;
            base.key = componentNode.key;
            base.description = componentNode.description;
        }

        // Variable bindings (if available)
        if ("boundVariables" in node) {
            try {
                const boundVars: Record<string, string> = {};
                const bound = node.boundVariables as Record<string, VariableAlias>;
                for (const [key, alias] of Object.entries(bound)) {
                    boundVars[key] = alias.id;
                }
                if (Object.keys(boundVars).length > 0) {
                    base.boundVariables = boundVars;
                }
            } catch (e) {
                // Ignore if variables can't be accessed
            }
        }

        // Add children (limit depth to prevent stack overflow)
        if ("children" in node && depth < 10) {
            base.children = node.children.map((child) => scanNode(child, depth + 1));
        }

        return base;
    };

    const result = {
        pageId: page.id,
        pageName: page.name,
        children: page.children.map((child) => scanNode(child)),
    };

    figma.ui.postMessage({
        type: "execution_result",
        requestId,
        result,
    });
}

// ============================================================================
// Utilities
// ============================================================================

function sendError(requestId: string | undefined, error: unknown, context?: string) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const contextMsg = context ? ` [${context}]` : '';

    figma.ui.postMessage({
        type: "execution_result",
        requestId,
        error: `${errorMessage}${contextMsg}`,
        stack,
    });
}

function serializeForTransport(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    // Handle Figma nodes
    if (typeof value === "object" && value !== null && "id" in value && "type" in value) {
        const node = value as SceneNode;
        return {
            __figmaNode: true,
            id: node.id,
            name: node.name,
            type: node.type,
        };
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(serializeForTransport);
    }

    // Handle plain objects
    if (typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = serializeForTransport(val);
        }
        return result;
    }

    // Primitives pass through
    return value;
}

// Serialize paint styles (fills/strokes)
function serializePaints(paints: readonly Paint[] | typeof figma.mixed): unknown {
    if (paints === figma.mixed) {
        return { type: "MIXED" };
    }
    return paints.map((paint) => {
        const serialized: Record<string, unknown> = {
            type: paint.type,
            visible: paint.visible,
            opacity: paint.opacity,
        };
        if (paint.type === "SOLID") {
            serialized.color = paint.color;
        } else if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
            serialized.gradientStops = paint.gradientStops;
            serialized.gradientTransform = paint.gradientTransform;
        } else if (paint.type === "IMAGE") {
            serialized.scaleMode = paint.scaleMode;
            serialized.imageHash = paint.imageHash;
            serialized.imageTransform = paint.imageTransform;
        }
        return serialized;
    });
}

// Serialize effect styles
function serializeEffects(effects: readonly Effect[]): unknown {
    return effects.map((effect) => {
        const serialized: Record<string, unknown> = {
            type: effect.type,
            visible: effect.visible,
        };
        if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
            serialized.color = effect.color;
            serialized.offset = effect.offset;
            serialized.radius = effect.radius;
            serialized.spread = effect.spread;
            serialized.blendMode = effect.blendMode;
        } else if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
            serialized.radius = effect.radius;
        }
        return serialized;
    });
}

// ============================================================================
// Get Document Styles, Variables, and Components
// ============================================================================

async function handleGetStyles(requestId: string) {
    try {
        // Get paint styles
        const paintStyles = figma.getLocalPaintStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            paints: serializePaints(style.paints),
        }));

        // Get text styles
        const textStyles = figma.getLocalTextStyles().map((style) => {
            const styleData: Record<string, unknown> = {
                id: style.id,
                name: style.name,
                description: style.description,
                fontSize: style.fontSize,
                fontName: style.fontName,
                lineHeight: style.lineHeight,
                letterSpacing: style.letterSpacing,
                textCase: style.textCase,
                textDecoration: style.textDecoration,
                paragraphIndent: style.paragraphIndent,
                paragraphSpacing: style.paragraphSpacing,
            };

            // Add font weight if available (from fontName)
            if (style.fontName && typeof style.fontName === 'object') {
                styleData.fontWeight = (style.fontName as FontName).style;
            }

            return styleData;
        });

        // Get effect styles
        const effectStyles = figma.getLocalEffectStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            effects: serializeEffects(style.effects),
        }));

        // Get variable collections and variables
        const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
        const allVariables = await figma.variables.getLocalVariablesAsync();

        const collections = variableCollections.map((collection) => ({
            id: collection.id,
            name: collection.name,
            modes: collection.modes.map((mode) => ({
                modeId: mode.modeId,
                name: mode.name,
            })),
        }));

        const variables = allVariables.map((variable) => {
            const varData: Record<string, unknown> = {
                id: variable.id,
                name: variable.name,
                description: variable.description,
                variableCollectionId: variable.variableCollectionId,
                resolvedType: variable.resolvedType,
            };

            // Get values for each mode
            const collection = variableCollections.find((c) => c.id === variable.variableCollectionId);
            if (collection) {
                const values: Record<string, unknown> = {};
                for (const mode of collection.modes) {
                    try {
                        const value = variable.valuesByMode[mode.modeId];
                        if (value !== undefined) {
                            values[mode.modeId] = value;
                        }
                    } catch (e) {
                        // Ignore if value can't be accessed
                    }
                }
                varData.values = values;
            }

            return varData;
        });

        // Get components
        const components = figma.root.findAll((node) => node.type === "COMPONENT") as ComponentNode[];
        const componentData = components.map((component) => ({
            id: component.id,
            name: component.name,
            key: component.key,
            description: component.description,
        }));

        // Get component sets
        const componentSets = figma.root.findAll((node) => node.type === "COMPONENT_SET") as ComponentSetNode[];
        const componentSetData = componentSets.map((set) => ({
            id: set.id,
            name: set.name,
            key: set.key,
            description: set.description,
        }));

        const result = {
            paintStyles,
            textStyles,
            effectStyles,
            variables,
            variableCollections: collections,
            components: componentData,
            componentSets: componentSetData,
        };

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result,
        });
    } catch (error) {
        sendError(requestId, error, "get_styles");
    }
}
