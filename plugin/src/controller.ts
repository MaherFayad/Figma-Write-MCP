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
    // Clone node parameters
    targetNodeId?: string;
    newName?: string;
    offsetX?: number;
    offsetY?: number;
    targetParentId?: string;
    // Presentation tool parameters
    slideId?: string;
    slots?: Array<{ slotId: string; content: string }>;
    forceRescan?: boolean;
    presentationConfig?: {
        cover?: string;
        toc?: string;
        separators?: string[];
        end?: string;
    };
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

            case "analyze_patterns":
                await handleAnalyzePatterns(requestId!, msg.pageId);
                break;

            case "clone_node":
                await handleCloneNode(
                    requestId!,
                    msg.targetNodeId!,
                    msg.newName,
                    msg.offsetX,
                    msg.offsetY,
                    msg.targetParentId
                );
                break;

            case "scan_presentation":
                await handleScanPresentation(requestId!, msg.slideId, msg.forceRescan);
                break;

            case "fill_slide":
                await handleFillSlide(requestId!, msg.slideId!, msg.slots || []);
                break;

            case "configure_presentation":
                await handleConfigurePresentation(requestId!, msg.presentationConfig || {});
                break;

            case "get_presentation_cache":
                await handleGetPresentationCache(requestId!);
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
// Get Design Context - Comprehensive Single Call (with Library Support)
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

        // 5. Get local variables
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

        // 6. Get local components (in document)
        const components = figma.root.findAll((node) => node.type === "COMPONENT") as ComponentNode[];
        const componentData = components.slice(0, 100).map((component) => ({
            id: component.id,
            name: component.name,
            key: component.key,
            description: component.description,
            source: 'local',
        }));

        // 7. Get local component sets
        const componentSets = figma.root.findAll((node) => node.type === "COMPONENT_SET") as ComponentSetNode[];
        const componentSetData = componentSets.slice(0, 50).map((set) => ({
            id: set.id,
            name: set.name,
            key: set.key,
            description: set.description,
            variantCount: set.children.length,
            source: 'local',
        }));

        // ===============================================
        // NEW: Library content support
        // ===============================================

        // 8. Get library variable collections (requires teamLibrary permission)
        let libraryVariableCollections: Array<{
            key: string;
            name: string;
            libraryName: string;
        }> = [];

        try {
            const libCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
            libraryVariableCollections = libCollections.map(c => ({
                key: c.key,
                name: c.name,
                libraryName: c.libraryName,
            }));
        } catch (e) {
            // teamLibrary API may fail if no libraries are linked
        }

        // 9. Scan document for USED styles (includes library styles)
        const usedStyleIds = new Set<string>();
        const scanForStyles = (node: SceneNode) => {
            if ("fillStyleId" in node && node.fillStyleId && typeof node.fillStyleId === 'string') {
                usedStyleIds.add(node.fillStyleId);
            }
            if ("strokeStyleId" in node && node.strokeStyleId && typeof node.strokeStyleId === 'string') {
                usedStyleIds.add(node.strokeStyleId);
            }
            if ("effectStyleId" in node && node.effectStyleId && typeof node.effectStyleId === 'string') {
                usedStyleIds.add(node.effectStyleId);
            }
            if ("textStyleId" in node && node.textStyleId && typeof node.textStyleId === 'string') {
                usedStyleIds.add(node.textStyleId);
            }
            if ("children" in node) {
                for (const child of node.children) {
                    scanForStyles(child);
                }
            }
        };

        // Scan current page
        for (const child of figma.currentPage.children) {
            scanForStyles(child);
        }

        // Resolve used styles (works for both local AND library styles)
        const usedStyles: Array<{
            id: string;
            name: string;
            type: string;
            source: 'local' | 'library';
            description?: string;
            paints?: unknown;
            effects?: unknown;
            fontSize?: number;
            fontName?: FontName;
        }> = [];

        for (const styleId of usedStyleIds) {
            try {
                const style = figma.getStyleById(styleId);
                if (style) {
                    const isRemote = style.remote === true;
                    const styleInfo: typeof usedStyles[0] = {
                        id: style.id,
                        name: style.name,
                        type: style.type,
                        source: isRemote ? 'library' : 'local',
                        description: style.description,
                    };

                    // Add type-specific properties
                    if (style.type === 'PAINT') {
                        const paintStyle = style as PaintStyle;
                        styleInfo.paints = serializePaints(paintStyle.paints);
                    } else if (style.type === 'EFFECT') {
                        const effectStyle = style as EffectStyle;
                        styleInfo.effects = serializeEffects(effectStyle.effects);
                    } else if (style.type === 'TEXT') {
                        const textStyle = style as TextStyle;
                        styleInfo.fontSize = textStyle.fontSize;
                        styleInfo.fontName = textStyle.fontName;
                    }

                    usedStyles.push(styleInfo);
                }
            } catch (e) {
                // Style may not be accessible
            }
        }

        // 10. Scan for library components (from instances)
        const libraryComponentsMap = new Map<string, {
            key: string;
            name: string;
            description: string;
            componentSetName?: string;
        }>();

        const scanForLibraryComponents = (node: SceneNode) => {
            if (node.type === "INSTANCE") {
                const instance = node as InstanceNode;
                if (instance.mainComponent && instance.mainComponent.remote) {
                    const comp = instance.mainComponent;
                    if (!libraryComponentsMap.has(comp.key)) {
                        const parentSet = comp.parent?.type === "COMPONENT_SET"
                            ? (comp.parent as ComponentSetNode).name
                            : undefined;
                        libraryComponentsMap.set(comp.key, {
                            key: comp.key,
                            name: comp.name,
                            description: comp.description,
                            componentSetName: parentSet,
                        });
                    }
                }
            }
            if ("children" in node) {
                for (const child of node.children) {
                    scanForLibraryComponents(child);
                }
            }
        };

        // Scan current page for library components
        for (const child of figma.currentPage.children) {
            scanForLibraryComponents(child);
        }

        const libraryComponents = Array.from(libraryComponentsMap.values()).slice(0, 100);

        // 11. Get selection summary
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
            // Local styles (for backward compatibility)
            paintStyles: localPaintStyles,
            textStyles: localTextStyles,
            effectStyles: localEffectStyles,
            // Local variables
            variables,
            variableCollections: variableCollections.map(c => ({
                id: c.id,
                name: c.name,
                modes: c.modes.map(m => ({ id: m.modeId, name: m.name })),
            })),
            // Local components
            components: componentData,
            componentSets: componentSetData,
            // NEW: Library content
            libraryVariableCollections,
            usedStyles, // All styles used in document (local + library)
            libraryComponents, // Library components found via instances
            // Selection & page info
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
// Pattern Analysis - Scan pages for design patterns
// ============================================================================

async function handleAnalyzePatterns(requestId: string, pageId?: string) {
    try {
        // Determine which page(s) to scan
        const pagesToScan: PageNode[] = pageId
            ? [figma.root.children.find(p => p.id === pageId)].filter(Boolean) as PageNode[]
            : [figma.currentPage];

        if (pagesToScan.length === 0) {
            sendError(requestId, `Page not found: ${pageId}`, "analyze_patterns");
            return;
        }

        // Pattern collectors
        const colorPatterns = new Map<string, { hex: string; count: number; styleId?: string; styleName?: string }>();
        const fontPatterns = new Map<string, { family: string; style: string; count: number }>();
        const spacingPatterns = new Map<number, number>(); // spacing value -> count
        const sizePatterns = new Map<string, number>(); // "WxH" -> count
        const cornerRadiusPatterns = new Map<number, number>(); // radius -> count
        const componentUsage = new Map<string, { name: string; key: string; count: number; isLibrary: boolean }>();
        const layoutPatterns = {
            horizontal: 0,
            vertical: 0,
            wrap: 0,
            none: 0,
        };
        const alignmentPatterns = {
            primaryAxis: new Map<string, number>(),
            counterAxis: new Map<string, number>(),
        };

        // Helper to add color
        const addColor = (r: number, g: number, b: number, styleId?: string, styleName?: string) => {
            const hex = rgbToHex(r, g, b);
            const existing = colorPatterns.get(hex);
            if (existing) {
                existing.count++;
            } else {
                colorPatterns.set(hex, { hex, count: 1, styleId, styleName });
            }
        };

        // Recursive node scanner
        const scanNode = (node: SceneNode) => {
            // Track sizes for frames/components
            if ("width" in node && "height" in node &&
                (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "RECTANGLE")) {
                const sizeKey = `${Math.round(node.width)}x${Math.round(node.height)}`;
                sizePatterns.set(sizeKey, (sizePatterns.get(sizeKey) || 0) + 1);
            }

            // Track corner radius
            if ("cornerRadius" in node && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
                cornerRadiusPatterns.set(node.cornerRadius, (cornerRadiusPatterns.get(node.cornerRadius) || 0) + 1);
            }

            // Track colors from fills
            if ("fills" in node && node.fills !== figma.mixed) {
                for (const fill of node.fills as readonly Paint[]) {
                    if (fill.type === "SOLID" && fill.visible !== false) {
                        let styleName: string | undefined;
                        let styleId: string | undefined;
                        if ("fillStyleId" in node && typeof node.fillStyleId === "string") {
                            styleId = node.fillStyleId;
                            try {
                                const style = figma.getStyleById(styleId);
                                if (style) styleName = style.name;
                            } catch (e) { /* ignore */ }
                        }
                        addColor(fill.color.r, fill.color.g, fill.color.b, styleId, styleName);
                    }
                }
            }

            // Track fonts from text nodes
            if (node.type === "TEXT") {
                const textNode = node as TextNode;
                if (textNode.fontName !== figma.mixed) {
                    const fontKey = `${textNode.fontName.family}|${textNode.fontName.style}`;
                    const existing = fontPatterns.get(fontKey);
                    if (existing) {
                        existing.count++;
                    } else {
                        fontPatterns.set(fontKey, {
                            family: textNode.fontName.family,
                            style: textNode.fontName.style,
                            count: 1,
                        });
                    }
                }
            }

            // Track layout patterns
            if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
                const frameNode = node as FrameNode | ComponentNode | InstanceNode;

                if (frameNode.layoutMode === "HORIZONTAL") {
                    layoutPatterns.horizontal++;
                } else if (frameNode.layoutMode === "VERTICAL") {
                    layoutPatterns.vertical++;
                } else {
                    layoutPatterns.none++;
                }

                if (frameNode.layoutWrap === "WRAP") {
                    layoutPatterns.wrap++;
                }

                // Track spacing
                if (frameNode.layoutMode !== "NONE") {
                    spacingPatterns.set(frameNode.itemSpacing, (spacingPatterns.get(frameNode.itemSpacing) || 0) + 1);

                    // Track padding values
                    const paddings = [frameNode.paddingTop, frameNode.paddingRight, frameNode.paddingBottom, frameNode.paddingLeft];
                    for (const p of paddings) {
                        if (p > 0) {
                            spacingPatterns.set(p, (spacingPatterns.get(p) || 0) + 1);
                        }
                    }

                    // Track alignment
                    const primary = frameNode.primaryAxisAlignItems;
                    const counter = frameNode.counterAxisAlignItems;
                    alignmentPatterns.primaryAxis.set(primary, (alignmentPatterns.primaryAxis.get(primary) || 0) + 1);
                    alignmentPatterns.counterAxis.set(counter, (alignmentPatterns.counterAxis.get(counter) || 0) + 1);
                }
            }

            // Track component usage
            if (node.type === "INSTANCE") {
                const instance = node as InstanceNode;
                if (instance.mainComponent) {
                    const comp = instance.mainComponent;
                    const existing = componentUsage.get(comp.key);
                    if (existing) {
                        existing.count++;
                    } else {
                        componentUsage.set(comp.key, {
                            name: comp.name,
                            key: comp.key,
                            count: 1,
                            isLibrary: comp.remote === true,
                        });
                    }
                }
            }

            // Recurse into children
            if ("children" in node) {
                for (const child of node.children) {
                    scanNode(child);
                }
            }
        };

        // Scan all pages
        for (const page of pagesToScan) {
            for (const child of page.children) {
                scanNode(child);
            }
        }

        // ===============================================
        // NEW: Page Structure Analysis
        // ===============================================

        // Common structural element patterns (case-insensitive matching)
        const structuralPatterns = {
            header: /^(header|top.?bar|nav.?bar|app.?bar|top.?nav)/i,
            navigation: /^(nav|navigation|menu|sidebar.?nav|tab.?bar|bottom.?nav)/i,
            sidebar: /^(sidebar|side.?bar|left.?panel|right.?panel|drawer)/i,
            footer: /^(footer|bottom.?bar)/i,
            main: /^(main|content|body|container|page.?content)/i,
            hero: /^(hero|banner|jumbotron|cover)/i,
            card: /^(card|tile|item)/i,
            modal: /^(modal|dialog|popup|overlay)/i,
            form: /^(form|input.?group|field)/i,
            button: /^(button|btn|cta)/i,
        };

        // Collect structural elements found
        const structuralElements: Record<string, Array<{
            name: string;
            type: string;
            id: string;
            width: number;
            height: number;
            componentKey?: string;
            isLibrary: boolean;
        }>> = {
            header: [],
            navigation: [],
            sidebar: [],
            footer: [],
            main: [],
            hero: [],
            card: [],
            modal: [],
            form: [],
            button: [],
        };

        // Page templates - capture the structure of top-level frames (screens/pages)
        const pageTemplates: Array<{
            pageName: string;
            frameId: string;
            frameName: string;
            width: number;
            height: number;
            structure: Array<{
                name: string;
                type: string;
                role: string; // detected structural role
                y: number; // vertical position for ordering
                height: number;
                componentKey?: string;
                isLibrary: boolean;
            }>;
        }> = [];

        // Analyze each page
        for (const page of pagesToScan) {
            // Find top-level frames (likely screens/pages)
            const topFrames = page.children.filter(
                node => node.type === "FRAME" || node.type === "COMPONENT" || node.type === "SECTION"
            );

            for (const frame of topFrames) {
                if (!("children" in frame)) continue;

                const frameNode = frame as FrameNode | ComponentNode | SectionNode;
                const structure: typeof pageTemplates[0]["structure"] = [];

                // Analyze direct children to understand page structure
                for (const child of frameNode.children) {
                    const childName = child.name.toLowerCase();
                    let detectedRole = "content"; // default

                    // Try to detect structural role from name
                    for (const [role, pattern] of Object.entries(structuralPatterns)) {
                        if (pattern.test(child.name)) {
                            detectedRole = role;
                            break;
                        }
                    }

                    // Also detect by position heuristics
                    if ("y" in child && "height" in child) {
                        const childY = (child as SceneNode & { y: number }).y;
                        const childHeight = (child as SceneNode & { height: number }).height;
                        const frameHeight = "height" in frameNode ? frameNode.height : 0;

                        // Top of frame = likely header
                        if (childY <= 0 && childHeight < 150 && detectedRole === "content") {
                            detectedRole = "header";
                        }
                        // Bottom of frame = likely footer
                        if (frameHeight > 0 && childY + childHeight >= frameHeight - 10 && childHeight < 150 && detectedRole === "content") {
                            detectedRole = "footer";
                        }
                    }

                    // Get component info if instance
                    let componentKey: string | undefined;
                    let isLibrary = false;
                    if (child.type === "INSTANCE") {
                        const instance = child as InstanceNode;
                        if (instance.mainComponent) {
                            componentKey = instance.mainComponent.key;
                            isLibrary = instance.mainComponent.remote === true;
                        }
                    }

                    structure.push({
                        name: child.name,
                        type: child.type,
                        role: detectedRole,
                        y: "y" in child ? (child as SceneNode & { y: number }).y : 0,
                        height: "height" in child ? (child as SceneNode & { height: number }).height : 0,
                        componentKey,
                        isLibrary,
                    });

                    // Add to structural elements collection
                    if (detectedRole !== "content" && structuralElements[detectedRole]) {
                        structuralElements[detectedRole].push({
                            name: child.name,
                            type: child.type,
                            id: child.id,
                            width: "width" in child ? (child as SceneNode & { width: number }).width : 0,
                            height: "height" in child ? (child as SceneNode & { height: number }).height : 0,
                            componentKey,
                            isLibrary,
                        });
                    }
                }

                // Sort structure by Y position (top to bottom)
                structure.sort((a, b) => a.y - b.y);

                pageTemplates.push({
                    pageName: page.name,
                    frameId: frame.id,
                    frameName: frame.name,
                    width: "width" in frame ? frame.width : 0,
                    height: "height" in frame ? frame.height : 0,
                    structure,
                });
            }
        }

        // Summarize structural elements usage
        const structuralSummary: Record<string, {
            count: number;
            uniqueNames: string[];
            libraryComponents: number;
        }> = {};

        for (const [role, elements] of Object.entries(structuralElements)) {
            const uniqueNames = [...new Set(elements.map(e => e.name))];
            structuralSummary[role] = {
                count: elements.length,
                uniqueNames: uniqueNames.slice(0, 5),
                libraryComponents: elements.filter(e => e.isLibrary).length,
            };
        }

        // Sort and format results
        const sortedColors = Array.from(colorPatterns.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        const sortedFonts = Array.from(fontPatterns.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        const sortedSpacing = Array.from(spacingPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([value, count]) => ({ value, count }));

        const sortedSizes = Array.from(sizePatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([size, count]) => ({ size, count }));

        const sortedCornerRadius = Array.from(cornerRadiusPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([radius, count]) => ({ radius, count }));

        const sortedComponents = Array.from(componentUsage.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        const result = {
            pagesScanned: pagesToScan.map(p => ({ id: p.id, name: p.name })),
            patterns: {
                colors: {
                    topColors: sortedColors,
                    totalUniqueColors: colorPatterns.size,
                },
                typography: {
                    topFonts: sortedFonts,
                    totalUniqueFonts: fontPatterns.size,
                },
                spacing: {
                    commonValues: sortedSpacing,
                    // Detect if there's a spacing scale
                    possibleScale: detectSpacingScale(sortedSpacing.map(s => s.value)),
                },
                sizing: {
                    commonSizes: sortedSizes,
                },
                cornerRadius: {
                    commonRadii: sortedCornerRadius,
                },
                layout: {
                    distribution: layoutPatterns,
                    primaryAxisAlignment: mapToObject(alignmentPatterns.primaryAxis),
                    counterAxisAlignment: mapToObject(alignmentPatterns.counterAxis),
                },
                components: {
                    mostUsed: sortedComponents,
                    totalUniqueComponents: componentUsage.size,
                    libraryComponents: sortedComponents.filter(c => c.isLibrary).length,
                    localComponents: sortedComponents.filter(c => !c.isLibrary).length,
                },
                // NEW: Page structure patterns
                pageStructure: {
                    structuralElements: structuralSummary,
                    pageTemplates: pageTemplates.slice(0, 10), // Limit to prevent huge payloads
                },
            },
        };

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result,
        });
    } catch (error) {
        sendError(requestId, error, "analyze_patterns");
    }
}

// Helper to detect if spacing values follow a scale (4px, 8px, etc.)
function detectSpacingScale(values: number[]): string | null {
    if (values.length < 3) return null;

    // Common spacing scales
    const scales: Record<string, number[]> = {
        "4px base": [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
        "8px base": [8, 16, 24, 32, 40, 48, 64, 80, 96],
        "rem (16px)": [16, 32, 48, 64, 80, 96, 112, 128],
    };

    for (const [scaleName, scaleValues] of Object.entries(scales)) {
        const matchCount = values.filter(v => scaleValues.includes(v)).length;
        if (matchCount >= Math.min(3, values.length * 0.5)) {
            return scaleName;
        }
    }
    return null;
}

// Helper to convert Map to Object (Object.fromEntries replacement)
function mapToObject(map: Map<any, any>): Record<string, any> {
    const obj: Record<string, any> = {};
    map.forEach((value, key) => {
        obj[String(key)] = value;
    });
    return obj;
}

// ============================================================================
// Clone Node - Duplicate frames/components to reuse patterns
// ============================================================================

async function handleCloneNode(
    requestId: string,
    targetNodeId: string,
    newName?: string,
    offsetX?: number,
    offsetY?: number,
    targetParentId?: string
) {
    try {
        // Find the source node
        const sourceNode = figma.getNodeById(targetNodeId);
        if (!sourceNode) {
            sendError(requestId, `Node not found: ${targetNodeId}`, "clone_node");
            return;
        }

        // Check if it's a SceneNode (can be cloned)
        if (!("clone" in sourceNode)) {
            sendError(requestId, `Node type ${sourceNode.type} cannot be cloned`, "clone_node");
            return;
        }

        const sceneNode = sourceNode as SceneNode;

        // Clone the node
        const clonedNode = sceneNode.clone();

        // Rename if requested
        if (newName) {
            clonedNode.name = newName;
        }

        // Apply position offset
        if ("x" in clonedNode && "y" in clonedNode) {
            if (offsetX !== undefined) {
                clonedNode.x = sceneNode.x + offsetX;
            }
            if (offsetY !== undefined) {
                clonedNode.y = sceneNode.y + offsetY;
            }
        }

        // Move to different parent if specified
        if (targetParentId) {
            const targetParent = figma.getNodeById(targetParentId);
            if (targetParent && "appendChild" in targetParent) {
                (targetParent as FrameNode | GroupNode | PageNode).appendChild(clonedNode);
            }
        }

        // Select the cloned node for visibility
        figma.currentPage.selection = [clonedNode];

        // Build response with useful info
        const result: Record<string, unknown> = {
            success: true,
            clonedNodeId: clonedNode.id,
            clonedNodeName: clonedNode.name,
            clonedNodeType: clonedNode.type,
            sourceNodeId: targetNodeId,
            sourceNodeName: sceneNode.name,
        };

        if ("x" in clonedNode && "y" in clonedNode) {
            result.position = { x: clonedNode.x, y: clonedNode.y };
        }
        if ("width" in clonedNode && "height" in clonedNode) {
            result.size = { width: clonedNode.width, height: clonedNode.height };
        }

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result,
        });
    } catch (error) {
        sendError(requestId, error, "clone_node");
    }
}

// ============================================================================
// Presentation Tools - Scan and fill presentation templates with caching
// ============================================================================

// Cache key for presentation data
const PRESENTATION_CACHE_KEY = "presentation_cache";

// Slide classification types
type SlideClassification =
    | "cover"       // Title/intro slide
    | "toc"         // Table of contents / agenda
    | "separator"   // Section divider
    | "content"     // Regular content (default)
    | "quote"       // Quote / testimonial
    | "image"       // Full image slide
    | "team"        // Team / about us
    | "comparison"  // Comparison / vs
    | "stats"       // Statistics / metrics
    | "timeline"    // Timeline / roadmap
    | "big_number"  // Big number / statistic highlight
    | "end";        // Thank you / closing

interface SlotInfo {
    id: string;
    name: string;
    type: "text" | "image";
    content?: string;
    placeholder?: boolean;
    width?: number;
    height?: number;
}

interface SlideInfo {
    id: string;
    name: string;
    classification: SlideClassification;
    width: number;
    height: number;
    slots: SlotInfo[];
}

interface PresentationCache {
    timestamp: number;
    pageId: string;
    pageName: string;
    config: {
        cover?: string;
        toc?: string;
        separators?: string[];
        quotes?: string[];
        end?: string;
    };
    slides: SlideInfo[];
}

// Auto-classify slide based on name patterns
function classifySlide(slideName: string, slideIndex: number, totalSlides: number): SlideClassification {
    const name = slideName.toLowerCase();

    // Cover patterns
    if (name.includes("cover") || name.includes("title slide") ||
        name.includes("intro") || (slideIndex === 0 && name.includes("title"))) {
        return "cover";
    }

    // Table of contents patterns
    if (name.includes("toc") || name.includes("table of content") ||
        name.includes("agenda") || name.includes("contents") || name.includes("outline")) {
        return "toc";
    }

    // Separator patterns
    if (name.includes("separator") || name.includes("divider") ||
        name.includes("section") || name.includes("break") || name.includes("interlude") ||
        name.includes("chapter")) {
        return "separator";
    }

    // Quote patterns
    if (name.includes("quote") || name.includes("testimonial") ||
        name.includes("cited") || name.includes("blockquote")) {
        return "quote";
    }

    // Image patterns (full image slides)
    if (name.includes("image slide") || name.includes("full image") ||
        name.includes("photo slide") || name.includes("gallery")) {
        return "image";
    }

    // Team patterns
    if (name.includes("team") || name.includes("about us") ||
        name.includes("our team") || name.includes("people") || name.includes("staff")) {
        return "team";
    }

    // Comparison patterns
    if (name.includes("comparison") || name.includes("versus") ||
        name.includes(" vs ") || name.includes("compare") || name.includes("before after")) {
        return "comparison";
    }

    // Stats patterns
    if (name.includes("stats") || name.includes("statistics") ||
        name.includes("metrics") || name.includes("data") || name.includes("numbers")) {
        return "stats";
    }

    // Timeline patterns
    if (name.includes("timeline") || name.includes("roadmap") ||
        name.includes("history") || name.includes("milestones") || name.includes("journey")) {
        return "timeline";
    }

    // Big number patterns
    if (name.includes("big number") || name.includes("highlight") ||
        name.includes("key stat") || name.includes("featured number")) {
        return "big_number";
    }

    // End patterns
    if (name.includes("thank") || name.includes("end") || name.includes("closing") ||
        name.includes("q&a") || name.includes("questions") || name.includes("contact") ||
        (slideIndex === totalSlides - 1 && (name.includes("contact") || name.includes("end")))) {
        return "end";
    }

    return "content";
}

// Get cached presentation or null
function getCachedPresentation(): PresentationCache | null {
    try {
        const cached = figma.root.getPluginData(PRESENTATION_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as PresentationCache;
        }
    } catch (e) {
        // Invalid cache
    }
    return null;
}

// Save presentation cache with error handling
function savePresentationCache(cache: PresentationCache): boolean {
    try {
        figma.root.setPluginData(PRESENTATION_CACHE_KEY, JSON.stringify(cache));
        return true;
    } catch (e) {
        console.error("[Figma-Bridge] Failed to save presentation cache:", e);
        // Try saving without slots if it failed
        try {
            const lightCache = { ...cache, slides: cache.slides.map(s => ({ ...s, slots: [] })) };
            figma.root.setPluginData(PRESENTATION_CACHE_KEY, JSON.stringify(lightCache));
            return true;
        } catch (e2) {
            return false;
        }
    }
}

async function handleScanPresentation(requestId: string, slideId?: string, forceRescan?: boolean) {
    try {
        const existingCache = getCachedPresentation();
        if (!forceRescan && !slideId && existingCache && existingCache.pageId === figma.currentPage.id) {
            figma.ui.postMessage({
                type: "execution_result",
                requestId,
                result: {
                    success: true,
                    fromCache: true,
                    ...existingCache,
                },
            });
            return;
        }

        // Determine targets
        let targetNodes: SceneNode[] = [];

        if (slideId) {
            const node = figma.getNodeById(slideId);
            if (node) {
                if (node.type === "SECTION") {
                    targetNodes = node.children.filter(n => n.type === "FRAME" || n.type === "SECTION") as SceneNode[];
                } else {
                    targetNodes = [node as SceneNode];
                }
            }
        } else if (figma.currentPage.selection.length > 0) {
            // If sections are selected, include their children as slides
            for (const node of figma.currentPage.selection) {
                if (node.type === "SECTION") {
                    const children = node.children.filter(n => n.type === "FRAME" || n.type === "SECTION") as SceneNode[];
                    if (children.length > 0) {
                        targetNodes.push(...children);
                    } else {
                        targetNodes.push(node);
                    }
                } else {
                    targetNodes.push(node);
                }
            }
        } else {
            // Scan all top-level frames/sections
            targetNodes = figma.currentPage.children.filter(
                n => n.type === "FRAME" || n.type === "SECTION"
            ) as SceneNode[];
        }

        if (targetNodes.length === 0) {
            sendError(requestId, "No slides found.", "scan_presentation");
            return;
        }

        // Scan slides
        const slides: SlideInfo[] = [];
        const config = existingCache?.config || {};
        const totalSlides = targetNodes.length;

        for (let i = 0; i < targetNodes.length; i++) {
            const slide = targetNodes[i];
            if (!("children" in slide)) continue;

            const slots: SlotInfo[] = [];

            // Text slots
            const textNodes = slide.findAll(n => n.type === "TEXT");
            for (const node of textNodes) {
                const textNode = node as TextNode;
                const isPlaceholder =
                    textNode.name.toLowerCase().includes("placeholder") ||
                    textNode.name.toLowerCase().includes("title") ||
                    textNode.name.toLowerCase().includes("heading") ||
                    textNode.name.toLowerCase().includes("body") ||
                    textNode.name.toLowerCase().includes("subtitle") ||
                    textNode.characters.toLowerCase().includes("enter text") ||
                    textNode.characters.toLowerCase().includes("your text");

                slots.push({
                    id: textNode.id,
                    name: textNode.name,
                    type: "text",
                    content: textNode.characters,
                    placeholder: isPlaceholder,
                });
            }

            // Image slots
            const imageNodes = slide.findAll(n =>
                (n.type === "RECTANGLE" || n.type === "FRAME") &&
                (n.name.toLowerCase().includes("image") ||
                    n.name.toLowerCase().includes("photo") ||
                    n.name.toLowerCase().includes("picture"))
            );
            for (const node of imageNodes) {
                slots.push({
                    id: node.id,
                    name: node.name,
                    type: "image",
                    width: "width" in node ? node.width : undefined,
                    height: "height" in node ? node.height : undefined,
                });
            }

            // Determine classification (user config overrides auto)
            let classification: SlideClassification;
            if (config.cover === slide.id) {
                classification = "cover";
            } else if (config.toc === slide.id) {
                classification = "toc";
            } else if (config.separators?.includes(slide.id)) {
                classification = "separator";
            } else if (config.end === slide.id) {
                classification = "end";
            } else {
                classification = classifySlide(slide.name, i, totalSlides);
            }

            slides.push({
                id: slide.id,
                name: slide.name,
                classification,
                width: "width" in slide ? slide.width : 0,
                height: "height" in slide ? slide.height : 0,
                slots,
            });
        }

        // Save to cache
        const cache: PresentationCache = {
            timestamp: Date.now(),
            pageId: figma.currentPage.id,
            pageName: figma.currentPage.name,
            config,
            slides,
        };
        const cacheSaved = savePresentationCache(cache);

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: {
                success: true,
                fromCache: false,
                cacheSaved,
                ...cache,
            },
        });
    } catch (error) {
        sendError(requestId, error, "scan_presentation");
    }
}

async function handleConfigurePresentation(
    requestId: string,
    config: {
        cover?: string;
        toc?: string;
        separators?: string[];
        end?: string;
    }
) {
    try {
        // Get existing cache or create new
        let cache = getCachedPresentation();

        if (!cache) {
            // Need to scan first
            sendError(requestId, "No presentation cached. Run scan_presentation first.", "configure_presentation");
            return;
        }

        // Update config
        cache.config = {
            ...cache.config,
            ...config,
        };

        // Re-classify slides based on new config
        for (const slide of cache.slides) {
            if (config.cover === slide.id) {
                slide.classification = "cover";
            } else if (config.toc === slide.id) {
                slide.classification = "toc";
            } else if (config.separators?.includes(slide.id)) {
                slide.classification = "separator";
            } else if (config.end === slide.id) {
                slide.classification = "end";
            }
        }

        cache.timestamp = Date.now();
        savePresentationCache(cache);

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: {
                success: true,
                message: "Presentation configuration updated",
                config: cache.config,
            },
        });
    } catch (error) {
        sendError(requestId, error, "configure_presentation");
    }
}

async function handleGetPresentationCache(requestId: string) {
    try {
        const cache = getCachedPresentation();

        if (!cache) {
            figma.ui.postMessage({
                type: "execution_result",
                requestId,
                result: {
                    success: false,
                    cached: false,
                    message: "No presentation cached. Run scan_presentation first.",
                },
            });
            return;
        }

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: {
                success: true,
                cached: true,
                ...cache,
            },
        });
    } catch (error) {
        sendError(requestId, error, "get_presentation_cache");
    }
}

async function handleFillSlide(
    requestId: string,
    slideId: string,
    slots: Array<{ slotId: string; content: string }>
) {
    try {
        const slide = figma.getNodeById(slideId);
        if (!slide) {
            sendError(requestId, `Slide not found: ${slideId}`, "fill_slide");
            return;
        }

        const results: Array<{
            slotId: string;
            success: boolean;
            error?: string;
        }> = [];

        for (const slot of slots) {
            try {
                const node = figma.getNodeById(slot.slotId);
                if (!node) {
                    results.push({
                        slotId: slot.slotId,
                        success: false,
                        error: "Node not found",
                    });
                    continue;
                }

                if (node.type === "TEXT") {
                    const textNode = node as TextNode;

                    // Load the font first
                    if (textNode.fontName !== figma.mixed) {
                        await figma.loadFontAsync(textNode.fontName);
                    } else {
                        // For mixed fonts, load the first range's font
                        const firstFont = textNode.getRangeFontName(0, 1);
                        if (firstFont !== figma.mixed) {
                            await figma.loadFontAsync(firstFont);
                        }
                    }

                    // Update the text content
                    textNode.characters = slot.content;

                    results.push({
                        slotId: slot.slotId,
                        success: true,
                    });
                } else {
                    results.push({
                        slotId: slot.slotId,
                        success: false,
                        error: `Node type ${node.type} not supported for text fill`,
                    });
                }
            } catch (slotError) {
                results.push({
                    slotId: slot.slotId,
                    success: false,
                    error: slotError instanceof Error ? slotError.message : String(slotError),
                });
            }
        }

        figma.ui.postMessage({
            type: "execution_result",
            requestId,
            result: {
                success: results.every(r => r.success),
                slideId,
                results,
            },
        });
    } catch (error) {
        sendError(requestId, error, "fill_slide");
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
