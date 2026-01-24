export class CreationEngine {
    private figma: PluginAPI;
    private cache: {
        fonts: Record<string, FontName> | null;
        styles: Record<string, string> | null;
    } = { fonts: null, styles: null };

    constructor(figma: PluginAPI) {
        this.figma = figma;
    }

    /**
     * core: Create a node with props and children
     */
    async create(type: NodeType, props: Record<string, any> = {}, children: any[] = []) {
        let node: SceneNode;

        // 1. Create Node
        switch (type) {
            case "FRAME": node = this.figma.createFrame(); break;
            case "TEXT": node = this.figma.createText(); break;
            case "RECTANGLE": node = this.figma.createRectangle(); break;
            case "ELLIPSE": node = this.figma.createEllipse(); break;
            case "line": node = this.figma.createLine(); break;
            case "vector": node = this.figma.createVector(); break;
            case "component": node = this.figma.createComponent(); break;
            default: throw new Error(`Unsupported type: ${type}`);
        }

        // 2. Apply Props (Smartly)
        await this.modify(node, props);

        // 3. Append Children
        if ("appendChild" in node && children.length > 0) {
            for (const child of children) {
                if (child) {
                    // Check if child is a promise or a node
                    const childNode = child instanceof Promise ? await child : child;
                    (node as FrameNode).appendChild(childNode);
                }
            }
        }

        return node;
    }

    /**
     * Helper: Clone a node and apply overrides
     */
    async clone(targetId: string, overrides: Record<string, Record<string, any>> = {}) {
        const source = this.figma.getNodeById(targetId) as SceneNode;
        if (!source) throw new Error(`Node not found: ${targetId}`);

        const clone = source.clone();

        // Apply overrides to specific descendents by Name
        for (const [name, props] of Object.entries(overrides)) {
            // Find node by name (BFS)
            const target = this.findNodeByName(clone, name);
            if (target) {
                await this.modify(target, props);
            }
        }

        return clone;
    }

    /**
     * Helper: Modify an existing node
     */
    async modify(node: SceneNode | string, props: Record<string, any>) {
        const target = typeof node === 'string' ? this.figma.getNodeById(node) as SceneNode : node;
        if (!target) return;

        // Special handling for Text
        if (target.type === "TEXT" && (props.text || props.characters)) {
            await this.ensureFontLoaded(target as TextNode);
            (target as TextNode).characters = props.text || props.characters;
        }

        for (const [key, value] of Object.entries(props)) {
            if (key === "text" || key === "characters") continue; // Handled above

            // Smart Color/Fill
            if (key === "fill") {
                await this.applyFill(target, value);
                continue;
            }
            if (key === "stroke") {
                await this.applyStroke(target, value);
                continue;
            }

            // Layout Shorthands
            if (key === "layout") {
                if ("layoutMode" in target) {
                    if (value === "VERTICAL") target.layoutMode = "VERTICAL";
                    if (value === "HORIZONTAL") target.layoutMode = "HORIZONTAL";
                    if (value === "GRID") target.layoutMode = "NONE"; // TODO support grid
                }
                continue;
            }

            // Padding shorthand
            if (key === "pad" || key === "padding") {
                this.applyPadding(target, value);
                continue;
            }

            // Gap shorthand
            if (key === "gap" && "itemSpacing" in target) {
                target.itemSpacing = Number(value);
                continue;
            }

            // Corner shorthand
            if (key === "corner" || key === "radius") {
                if ("cornerRadius" in target) target.cornerRadius = Number(value);
                continue;
            }

            // Standard Prop
            if (key in target) {
                try {
                    (target as any)[key] = value;
                } catch (e) { console.warn(`Failed to set ${key}`, e) }
            }
        }
    }

    // --- Internals ---

    private async ensureFontLoaded(node: TextNode) {
        if (node.fontName !== this.figma.mixed) {
            await this.figma.loadFontAsync(node.fontName);
        }
    }

    private async applyFill(node: SceneNode, value: string) {
        // Hex?
        if (value.startsWith("#")) {
            if ("fills" in node) {
                const rgb = this.hexToRgb(value);
                node.fills = [{ type: "SOLID", color: rgb }];
            }
        } else {
            // Style Name?
            const styleId = await this.findStyleId(value, "PAINT");
            if (styleId && "fillStyleId" in node) {
                node.fillStyleId = styleId;
            }
        }
    }

    private async applyStroke(node: SceneNode, value: string) {
        if (value.startsWith("#")) {
            if ("strokes" in node) {
                const rgb = this.hexToRgb(value);
                node.strokes = [{ type: "SOLID", color: rgb }];
            }
        } else {
            const styleId = await this.findStyleId(value, "PAINT");
            if (styleId && "strokeStyleId" in node) {
                node.strokeStyleId = styleId;
            }
        }
    }

    private applyPadding(node: SceneNode, value: any) {
        if (!("paddingLeft" in node)) return;
        const frame = node as FrameNode;

        if (typeof value === "number") {
            frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = value;
        } else if (Array.isArray(value)) {
            if (value.length === 2) {
                frame.paddingTop = frame.paddingBottom = value[0];
                frame.paddingLeft = frame.paddingRight = value[1];
            } else if (value.length === 4) {
                frame.paddingTop = value[0];
                frame.paddingRight = value[1];
                frame.paddingBottom = value[2];
                frame.paddingLeft = value[3];
            }
        }
    }

    private async findStyleId(name: string, type: "PAINT" | "TEXT" | "EFFECT"): Promise<string | null> {
        // Simple cache
        // In real impl, we should cache all styles on init
        const styles = type === "PAINT" ? this.figma.getLocalPaintStyles()
            : type === "TEXT" ? this.figma.getLocalTextStyles()
                : this.figma.getLocalEffectStyles();

        // Fuzzy match
        const match = styles.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
        return match ? match.id : null;
    }

    private findNodeByName(root: SceneNode, name: string): SceneNode | null {
        if (root.name === name) return root;
        if ("children" in root) {
            for (const child of root.children) {
                const found = this.findNodeByName(child, name);
                if (found) return found;
            }
        }
        return null;
    }

    private hexToRgb(hex: string) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { r, g, b };
    }
}
