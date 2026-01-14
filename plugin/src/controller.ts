// ============================================================================
// Figma Plugin Controller - Main Thread
// ============================================================================
// This code runs in the Figma sandbox and handles:
// - Message relay between UI and Figma API
// - Code execution from the IDE
// - Smart Scan helpers for document traversal

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 300 });

// ============================================================================
// Message Handling
// ============================================================================

figma.ui.onmessage = async (msg: {
    type: string;
    requestId?: string;
    code?: string;
    pageId?: string;
    nodeId?: string;
    scale?: number;
    format?: string;
    includeLibraryStyles?: boolean;
    fontFamilyFilter?: string;
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

            case "get_design_context":
                await handleGetDesignContext(
                    requestId!,
                    msg.includeLibraryStyles !== false,
                    msg.fontFamilyFilter
                );
                break;

            case "get_selection_context":
                await handleGetSelectionContext(requestId!);
                break;

            case "export_node_image":
                await handleExportNodeImage(requestId!, msg.nodeId, msg.scale || 2, msg.format || "png");
                break;

            case "resize":
                if (message?.width && message?.height) {
                    figma.ui.resize(message.width, message.height);
                }
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
        const trimmedCode = code.trim();

        // Check if code already has a return statement
        const hasReturn = trimmedCode.includes('return ') || trimmedCode.startsWith('return ');

        // Build the function body - if no return, add one
        let functionBody: string;
        if (hasReturn) {
            functionBody = code;
        } else {
            // Try to treat as expression first
            const isLikelyExpression = !trimmedCode.includes(';') &&
                !trimmedCode.includes('{') &&
                !trimmedCode.includes('function') &&
                trimmedCode.split('\n').length === 1;

            if (isLikelyExpression) {
                functionBody = `return ${code};`;
            } else {
                functionBody = `${code}\nreturn undefined;`;
            }
        }

        // Create async function
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
                .slice(0, 50)
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
// Smart Scan - Deep Page Scan (Fixed serialization)
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

        // Capture style IDs (safe string check)
        if ("fillStyleId" in node && node.fillStyleId && typeof node.fillStyleId === 'string') {
            base.fillStyleId = node.fillStyleId;
        }
        if ("strokeStyleId" in node && node.strokeStyleId && typeof node.strokeStyleId === 'string') {
            base.strokeStyleId = node.strokeStyleId;
        }
        if ("effectStyleId" in node && node.effectStyleId && typeof node.effectStyleId === 'string') {
            base.effectStyleId = node.effectStyleId;
        }
        if ("textStyleId" in node && node.textStyleId && typeof node.textStyleId === 'string') {
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
                // Ignore
            }
        }
        if ("effects" in node) {
            try {
                base.effects = serializeEffects(node.effects);
            } catch (e) {
                // Ignore
            }
        }

        // Text-specific properties
        if (node.type === "TEXT") {
            const textNode = node as TextNode;
            base.characters = textNode.characters;
            // Safe serialization of font properties
            if (textNode.fontName !== figma.mixed) {
                base.fontName = textNode.fontName;
            }
            if (textNode.fontSize !== figma.mixed) {
                base.fontSize = textNode.fontSize;
            }
            if (textNode.fontWeight !== figma.mixed) {
                base.fontWeight = textNode.fontWeight;
            }
            if (textNode.lineHeight !== figma.mixed) {
                base.lineHeight = textNode.lineHeight;
            }
            if (textNode.letterSpacing !== figma.mixed) {
                base.letterSpacing = textNode.letterSpacing;
            }
            base.textAlignHorizontal = textNode.textAlignHorizontal;
            base.textAlignVertical = textNode.textAlignVertical;
        }

        // Frame/Component layout properties
        if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
            const frameNode = node as FrameNode | ComponentNode | InstanceNode;
            if ("layoutMode" in frameNode && frameNode.layoutMode !== "NONE") {
                base.layoutMode = frameNode.layoutMode;
                base.paddingTop = frameNode.paddingTop;
                base.paddingRight = frameNode.paddingRight;
                base.paddingBottom = frameNode.paddingBottom;
                base.paddingLeft = frameNode.paddingLeft;
                base.itemSpacing = frameNode.itemSpacing;
                base.primaryAxisAlignItems = frameNode.primaryAxisAlignItems;
                base.counterAxisAlignItems = frameNode.counterAxisAlignItems;
            }
            if ("cornerRadius" in frameNode && typeof frameNode.cornerRadius === 'number') {
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

        // Variable bindings - FIXED: skip symbols/non-serializable
        if ("boundVariables" in node && node.boundVariables) {
            try {
                const boundVars: Record<string, string> = {};
                const bound = node.boundVariables as Record<string, VariableAlias | VariableAlias[]>;
                for (const [key, alias] of Object.entries(bound)) {
                    if (alias && typeof alias === 'object' && 'id' in alias && typeof alias.id === 'string') {
                        boundVars[key] = alias.id;
                    }
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
// Get Design Context - Comprehensive Single Call
// ============================================================================

async function handleGetDesignContext(
    requestId: string,
    includeLibraryStyles: boolean,
    fontFamilyFilter?: string
) {
    try {
        // 1. Get available fonts
        const allFonts = await figma.listAvailableFontsAsync();
        let fonts = allFonts;

        if (fontFamilyFilter) {
            fonts = allFonts.filter(f =>
                f.fontName.family.toLowerCase().includes(fontFamilyFilter.toLowerCase())
            );
        }

        // Group fonts by family for easier use
        const fontFamilies: Record<string, string[]> = {};
        fonts.slice(0, 500).forEach(f => { // Limit to prevent huge payloads
            if (!fontFamilies[f.fontName.family]) {
                fontFamilies[f.fontName.family] = [];
            }
            if (!fontFamilies[f.fontName.family].includes(f.fontName.style)) {
                fontFamilies[f.fontName.family].push(f.fontName.style);
            }
        });

        // 2. Get local paint styles
        const localPaintStyles = figma.getLocalPaintStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            type: 'local',
            paints: serializePaints(style.paints),
        }));

        // 3. Get local text styles
        const localTextStyles = figma.getLocalTextStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            type: 'local',
            fontSize: style.fontSize,
            fontName: style.fontName,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
        }));

        // 4. Get local effect styles
        const localEffectStyles = figma.getLocalEffectStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            type: 'local',
            effects: serializeEffects(style.effects),
        }));

        // 5. Get variables
        const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
        const allVariables = await figma.variables.getLocalVariablesAsync();

        const variables = allVariables.map((variable) => {
            const collection = variableCollections.find((c) => c.id === variable.variableCollectionId);
            const values: Record<string, unknown> = {};

            if (collection) {
                for (const mode of collection.modes) {
                    try {
                        const value = variable.valuesByMode[mode.modeId];
                        if (value !== undefined) {
                            // Serialize the value properly
                            if (typeof value === 'object' && value !== null) {
                                if ('r' in value && 'g' in value && 'b' in value) {
                                    // Color value
                                    const color = value as RGBA;
                                    values[mode.name] = {
                                        hex: rgbToHex(color.r, color.g, color.b),
                                        rgba: color
                                    };
                                } else if ('id' in value) {
                                    // Variable alias
                                    values[mode.name] = { aliasId: (value as VariableAlias).id };
                                } else {
                                    values[mode.name] = value;
                                }
                            } else {
                                values[mode.name] = value;
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            return {
                id: variable.id,
                name: variable.name,
                resolvedType: variable.resolvedType,
                collectionName: collection?.name,
                values,
            };
        });

        // 6. Get components
        const components = figma.root.findAll((node) => node.type === "COMPONENT") as ComponentNode[];
        const componentData = components.slice(0, 100).map((component) => ({
            id: component.id,
            name: component.name,
            key: component.key,
            description: component.description,
        }));

        // 7. Get component sets
        const componentSets = figma.root.findAll((node) => node.type === "COMPONENT_SET") as ComponentSetNode[];
        const componentSetData = componentSets.slice(0, 50).map((set) => ({
            id: set.id,
            name: set.name,
            key: set.key,
            description: set.description,
            variantCount: set.children.length,
        }));

        // 8. Get selection summary
        const selection = figma.currentPage.selection;
        const selectionSummary = {
            count: selection.length,
            nodes: selection.slice(0, 10).map(node => ({
                id: node.id,
                name: node.name,
                type: node.type,
            })),
        };

        const result = {
            availableFonts: fontFamilies,
            fontCount: Object.keys(fontFamilies).length,
            paintStyles: localPaintStyles,
            textStyles: localTextStyles,
            effectStyles: localEffectStyles,
            variables,
            variableCollections: variableCollections.map(c => ({
                id: c.id,
                name: c.name,
                modes: c.modes.map(m => ({ id: m.modeId, name: m.name })),
            })),
            components: componentData,
            componentSets: componentSetData,
            selection: selectionSummary,
            currentPage: {
                id: figma.currentPage.id,
                name: figma.currentPage.name,
            },
        };

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result,
        });
    } catch (error) {
        sendError(requestId, error, "get_design_context");
    }
}

// ============================================================================
// Get Document Styles (Legacy - kept for compatibility)
// ============================================================================

async function handleGetStyles(requestId: string) {
    try {
        const paintStyles = figma.getLocalPaintStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            paints: serializePaints(style.paints),
        }));

        const textStyles = figma.getLocalTextStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            fontSize: style.fontSize,
            fontName: style.fontName,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textCase: style.textCase,
            textDecoration: style.textDecoration,
        }));

        const effectStyles = figma.getLocalEffectStyles().map((style) => ({
            id: style.id,
            name: style.name,
            description: style.description,
            effects: serializeEffects(style.effects),
        }));

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
            const collection = variableCollections.find((c) => c.id === variable.variableCollectionId);
            const values: Record<string, unknown> = {};
            if (collection) {
                for (const mode of collection.modes) {
                    try {
                        const value = variable.valuesByMode[mode.modeId];
                        if (value !== undefined) {
                            values[mode.modeId] = value;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }
            return {
                id: variable.id,
                name: variable.name,
                description: variable.description,
                variableCollectionId: variable.variableCollectionId,
                resolvedType: variable.resolvedType,
                values,
            };
        });

        const components = figma.root.findAll((node) => node.type === "COMPONENT") as ComponentNode[];
        const componentData = components.map((component) => ({
            id: component.id,
            name: component.name,
            key: component.key,
            description: component.description,
        }));

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

// ============================================================================
// Get Selection Context
// ============================================================================

async function handleGetSelectionContext(requestId: string) {
    try {
        const selection = figma.currentPage.selection;

        if (selection.length === 0) {
            figma.ui.postMessage({
                type: "execution_result",
                requestId,
                result: {
                    selectionCount: 0,
                    nodes: [],
                    message: "No nodes selected. Please select nodes in Figma first."
                },
            });
            return;
        }

        const nodes = selection.map((node) => extractNodeContext(node));

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: {
                selectionCount: selection.length,
                nodes,
            },
        });
    } catch (error) {
        sendError(requestId, error, "get_selection_context");
    }
}

function extractNodeContext(node: SceneNode): Record<string, unknown> {
    const context: Record<string, unknown> = {
        id: node.id,
        name: node.name,
        type: node.type,
        visible: node.visible,
    };

    // Position & Size
    if ("x" in node && "y" in node) {
        context.position = { x: node.x, y: node.y };
    }
    if ("width" in node && "height" in node) {
        context.size = { width: node.width, height: node.height };
    }
    if ("rotation" in node) {
        context.rotation = node.rotation;
    }

    // Colors - Fills
    if ("fills" in node && node.fills !== figma.mixed) {
        context.fills = (node.fills as readonly Paint[]).map(paintToContext);
    }

    // Colors - Strokes
    if ("strokes" in node && node.strokes) {
        context.strokes = (node.strokes as readonly Paint[]).map(paintToContext);
        if ("strokeWeight" in node) {
            context.strokeWeight = node.strokeWeight;
        }
        if ("strokeAlign" in node) {
            context.strokeAlign = node.strokeAlign;
        }
    }

    // Style IDs
    if ("fillStyleId" in node && node.fillStyleId && typeof node.fillStyleId === 'string') {
        context.fillStyleId = node.fillStyleId;
    }
    if ("strokeStyleId" in node && node.strokeStyleId && typeof node.strokeStyleId === 'string') {
        context.strokeStyleId = node.strokeStyleId;
    }
    if ("effectStyleId" in node && node.effectStyleId && typeof node.effectStyleId === 'string') {
        context.effectStyleId = node.effectStyleId;
    }
    if ("textStyleId" in node && node.textStyleId && typeof node.textStyleId === 'string') {
        context.textStyleId = node.textStyleId;
    }

    // Corner Radius
    if ("cornerRadius" in node) {
        if (node.cornerRadius === figma.mixed) {
            context.cornerRadius = {
                mixed: true,
                topLeft: (node as FrameNode).topLeftRadius,
                topRight: (node as FrameNode).topRightRadius,
                bottomRight: (node as FrameNode).bottomRightRadius,
                bottomLeft: (node as FrameNode).bottomLeftRadius,
            };
        } else {
            context.cornerRadius = node.cornerRadius;
        }
    }

    // Opacity & Blend Mode
    if ("opacity" in node) {
        context.opacity = node.opacity;
    }
    if ("blendMode" in node) {
        context.blendMode = node.blendMode;
    }

    // Effects
    if ("effects" in node && node.effects.length > 0) {
        context.effects = node.effects.map(effectToContext);
    }

    // Typography
    if (node.type === "TEXT") {
        const textNode = node as TextNode;
        context.text = {
            characters: textNode.characters,
            fontName: textNode.fontName !== figma.mixed ? textNode.fontName : "mixed",
            fontSize: textNode.fontSize !== figma.mixed ? textNode.fontSize : "mixed",
            fontWeight: textNode.fontWeight !== figma.mixed ? textNode.fontWeight : "mixed",
            lineHeight: textNode.lineHeight !== figma.mixed ? textNode.lineHeight : "mixed",
            letterSpacing: textNode.letterSpacing !== figma.mixed ? textNode.letterSpacing : "mixed",
            textAlignHorizontal: textNode.textAlignHorizontal,
            textAlignVertical: textNode.textAlignVertical,
        };
    }

    // Auto Layout
    if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
        const frameNode = node as FrameNode | ComponentNode | InstanceNode;
        if (frameNode.layoutMode !== "NONE") {
            context.autoLayout = {
                mode: frameNode.layoutMode,
                padding: {
                    top: frameNode.paddingTop,
                    right: frameNode.paddingRight,
                    bottom: frameNode.paddingBottom,
                    left: frameNode.paddingLeft,
                },
                itemSpacing: frameNode.itemSpacing,
                primaryAxisAlignItems: frameNode.primaryAxisAlignItems,
                counterAxisAlignItems: frameNode.counterAxisAlignItems,
                primaryAxisSizingMode: frameNode.primaryAxisSizingMode,
                counterAxisSizingMode: frameNode.counterAxisSizingMode,
            };
        }
    }

    // Constraints
    if ("constraints" in node) {
        context.constraints = node.constraints;
    }

    // Component Instance Info
    if (node.type === "INSTANCE") {
        const instanceNode = node as InstanceNode;
        if (instanceNode.mainComponent) {
            context.component = {
                mainComponentId: instanceNode.mainComponent.id,
                mainComponentName: instanceNode.mainComponent.name,
                mainComponentKey: instanceNode.mainComponent.key,
            };
        }
    }

    // Component Info
    if (node.type === "COMPONENT") {
        const componentNode = node as ComponentNode;
        context.component = {
            key: componentNode.key,
            description: componentNode.description,
        };
    }

    // Children count
    if ("children" in node) {
        context.childCount = node.children.length;
    }

    return context;
}

// ============================================================================
// Export Node Image
// ============================================================================

async function handleExportNodeImage(
    requestId: string,
    nodeId: string | undefined,
    scale: number,
    format: string
) {
    try {
        let targetNode: SceneNode | null = null;

        if (nodeId) {
            targetNode = figma.getNodeById(nodeId) as SceneNode | null;
        } else {
            targetNode = figma.currentPage.selection[0] || null;
        }

        if (!targetNode) {
            figma.ui.postMessage({
                type: "execution_result",
                requestId,
                result: { error: "No node found. Provide a nodeId or select a node." },
            });
            return;
        }

        const clampedScale = Math.max(1, Math.min(4, scale));
        const exportFormat = format.toUpperCase() === "JPG" ? "JPG" : "PNG";

        const bytes = await targetNode.exportAsync({
            format: exportFormat,
            scale: clampedScale,
        } as ExportSettingsImage);

        const base64 = uint8ArrayToBase64(bytes);
        const width = "width" in targetNode ? Math.round(targetNode.width * clampedScale) : 0;
        const height = "height" in targetNode ? Math.round(targetNode.height * clampedScale) : 0;

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: {
                nodeId: targetNode.id,
                nodeName: targetNode.name,
                format: exportFormat.toLowerCase(),
                scale: clampedScale,
                width,
                height,
                base64,
            },
        });
    } catch (error) {
        sendError(requestId, error, "export_node_image");
    }
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
            // Skip symbols and functions
            if (typeof val === 'symbol' || typeof val === 'function') {
                continue;
            }
            result[key] = serializeForTransport(val);
        }
        return result;
    }

    // Primitives pass through
    return value;
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

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
            serialized.color = {
                hex: rgbToHex(paint.color.r, paint.color.g, paint.color.b),
                rgb: paint.color,
            };
        } else if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
            serialized.gradientStops = paint.gradientStops.map(stop => ({
                position: stop.position,
                color: {
                    hex: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                    rgba: stop.color,
                },
            }));
        } else if (paint.type === "IMAGE") {
            serialized.scaleMode = paint.scaleMode;
            serialized.imageHash = paint.imageHash;
        }
        return serialized;
    });
}

function serializeEffects(effects: readonly Effect[]): unknown {
    return effects.map((effect) => {
        const serialized: Record<string, unknown> = {
            type: effect.type,
            visible: effect.visible,
        };
        if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
            serialized.color = {
                hex: rgbToHex(effect.color.r, effect.color.g, effect.color.b),
                rgba: effect.color,
            };
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

function paintToContext(paint: Paint): Record<string, unknown> {
    const result: Record<string, unknown> = {
        type: paint.type,
        visible: paint.visible !== false,
        opacity: paint.opacity ?? 1,
    };

    if (paint.type === "SOLID") {
        result.color = {
            hex: rgbToHex(paint.color.r, paint.color.g, paint.color.b),
            rgb: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
        };
    } else if (
        paint.type === "GRADIENT_LINEAR" ||
        paint.type === "GRADIENT_RADIAL" ||
        paint.type === "GRADIENT_ANGULAR" ||
        paint.type === "GRADIENT_DIAMOND"
    ) {
        result.gradientStops = paint.gradientStops.map((stop) => ({
            position: stop.position,
            color: {
                hex: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                rgb: { r: stop.color.r, g: stop.color.g, b: stop.color.b },
                a: stop.color.a,
            },
        }));
    } else if (paint.type === "IMAGE") {
        result.scaleMode = paint.scaleMode;
        result.imageHash = paint.imageHash;
    }

    return result;
}

function effectToContext(effect: Effect): Record<string, unknown> {
    const result: Record<string, unknown> = {
        type: effect.type,
        visible: effect.visible,
    };

    if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
        result.color = {
            hex: rgbToHex(effect.color.r, effect.color.g, effect.color.b),
            rgba: effect.color,
        };
        result.offset = effect.offset;
        result.radius = effect.radius;
        result.spread = effect.spread;
        result.blendMode = effect.blendMode;
    } else if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
        result.radius = effect.radius;
    }

    return result;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    const len = bytes.length;

    for (let i = 0; i < len; i += 3) {
        const a = bytes[i];
        const b = i + 1 < len ? bytes[i + 1] : 0;
        const c = i + 2 < len ? bytes[i + 2] : 0;

        result += chars[a >> 2];
        result += chars[((a & 3) << 4) | (b >> 4)];
        result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '=';
        result += i + 2 < len ? chars[c & 63] : '=';
    }

    return result;
}
