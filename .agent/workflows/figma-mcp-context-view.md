---
description: Extract comprehensive design context from Figma including patterns, styles, variables, components with IDs for AI reuse
---

# Figma MCP Context View Workflow

Extract and save comprehensive design context from Figma for AI-powered design automation.

## Prerequisites

- Figma Desktop app open with target file
- figma-bridge plugin running (verify with `get_figma_state`)
- figma-dev-mode-mcp-server available

---

## Step 1: Verify Connection

```
1. Call `mcp_figma-bridge_get_figma_state`
2. Confirm connected: true and ready: true
3. If not connected, ask user to run the Figma plugin
```

---

## Step 2: Get Document Overview

```
1. Call `mcp_figma-bridge_get_document_manifest`
2. Capture: document name, pages list with IDs, top-level frames
3. Store page IDs for deep scanning
```

---

## Step 3: Extract Design Context

```
1. Call `mcp_figma-bridge_get_design_context` with includeLibraryStyles: true
2. Capture all design tokens as detailed below
```

### Fonts
| Data | Description |
|------|-------------|
| Family names | Inter, Roboto, SF Pro |
| Style variants | Regular, Medium, Bold, Italic |
| Load commands | `figma.loadFontAsync({ family, style })` |

### Paint Styles
| Data | Description |
|------|-------------|
| Style IDs | `S:abc123` for `fillStyleId` |
| Names | Primary/500, Background/Light |
| Values | HEX, RGB, opacity |
| Gradients | Linear/radial with stops |

### Text Styles
| Data | Description |
|------|-------------|
| Style IDs | For `textStyleId` binding |
| Font settings | Family, size, weight, line-height |
| Letter spacing | Tracking values |

### Effect Styles
| Data | Description |
|------|-------------|
| Shadow styles | Drop shadow values |
| Blur effects | Background blur settings |
| Style IDs | For `effectStyleId` |

### Variables
| Data | Description |
|------|-------------|
| Collections | Organized token groups |
| Variable IDs | For binding to properties |
| Values by mode | Light/dark mode values |

### Components
| Data | Description |
|------|-------------|
| Local components | Keys and node IDs |
| Library components | External component keys |
| Variant properties | Size, type, state options |

---

## Step 4: Analyze Design Patterns

```
Call `mcp_figma-bridge_analyze_patterns` to extract comprehensive pattern data
```

### 4.1 Colors
| Data Point | Description | Example |
|------------|-------------|---------|
| Top colors | Ranked by usage | #0066FF (47×) |
| Style names | Linked names | Primary/500 |
| Style IDs | Reusable IDs | S:abc123 |
| Color formats | HEX, RGB, HSL | rgb(0,102,255) |
| Opacity variants | Alpha variations | 80%, 50%, 20% |
| Color roles | Semantic usage | Primary, Background, Text |
| Gradients | Gradient stops | linear-gradient(180deg...) |
| Palette groups | By hue family | Blues, Grays, Warm |

### 4.2 Typography
| Data Point | Description | Example |
|------------|-------------|---------|
| Font families | All fonts used | Inter, Roboto |
| Font weights | Style variants | 400, 500, 700 |
| Style IDs | Text style IDs | S:text123 |
| Font sizes | Size frequency | 14px (45×), 16px (67×) |
| Line heights | Height values | 1.5, 24px, 150% |
| Letter spacing | Tracking | -0.5%, 0, 2% |
| Text transforms | Case changes | Uppercase, Capitalize |
| Paragraph spacing | Block spacing | 16px, 24px |
| Alignment | Text align | Center, Left, Right |
| Type scale | Modular scale | 1.25 ratio |
| Heading hierarchy | H1-H6 sizes | 48, 36, 24, 20, 16 |

### 4.3 Spacing
| Data Point | Description | Example |
|------------|-------------|---------|
| Base unit | Grid base | 4px or 8px |
| Spacing scale | Token set | 4, 8, 16, 24, 32, 48 |
| Padding | Internal space | Cards: 24px |
| Margins | External space | Sections: 64px |
| Gap values | Auto-layout gaps | 8px, 16px, 24px |
| Asymmetric | Uneven spacing | 16px top, 24px bottom |
| Container padding | Edge spacing | 24px mobile, 64px desktop |
| Item spacing | List gaps | 12px between items |
| Section rhythm | Vertical rhythm | 48px sections |

### 4.4 Sizing
| Data Point | Description | Example |
|------------|-------------|---------|
| Frame sizes | Common dimensions | 1440×900, 375×812 |
| Component sizes | Element dimensions | Button: 40px height |
| Icon sizes | Icon standards | 16, 20, 24, 32px |
| Input heights | Form sizing | 40, 48, 56px |
| Card dimensions | Card sizing | 320px width |
| Aspect ratios | Image ratios | 16:9, 4:3, 1:1 |
| Max-widths | Constraints | 1200px, 1440px |
| Touch targets | Tap minimums | 44×44px |

### 4.5 Corner Radius
| Data Point | Description | Example |
|------------|-------------|---------|
| Radius values | All values | 0, 4, 8, 12, 16, 9999 |
| By element | Per-type | Buttons: 8px, Cards: 16px |
| Mixed radius | Asymmetric | 16px top, 0 bottom |
| Radius scale | System | sm:4, md:8, lg:16, full |
| Usage frequency | Count | 8px (67×), 16px (34×) |

### 4.6 Layout
| Data Point | Description | Example |
|------------|-------------|---------|
| Layout modes | Distribution | Vertical 45%, Horizontal 35% |
| Alignment | Combinations | Center-center, Top-left |
| Primary axis | Main axis | Start, Center, Space-between |
| Counter axis | Cross axis | Stretch, Center, Start |
| Wrap behavior | Multi-line | Wrap for tag groups |
| Layout sizing | Size modes | Fill width, Hug height |
| Nesting depth | Hierarchy | 3-4 levels average |
| Grid patterns | Grid layouts | 3-column, 24px gap |
| Absolute items | Positioned | Floating buttons, badges |

### 4.7 Components
| Data Point | Description | Example |
|------------|-------------|---------|
| Local components | In-file | Button, Card, Input |
| Component keys | Import IDs | abc123def456 |
| Library components | External | Design System v2.0 |
| Instance counts | Usage | Button/Primary: 34× |
| Variant props | Options | size: sm/md/lg |
| Categories | Grouping | Forms, Navigation, Cards |
| Override patterns | Common overrides | Text, icon swaps |
| Hierarchy | Nesting | Card contains Button |
| Slot patterns | Named slots | header, content, footer |
| Boolean props | Toggles | hasIcon, isDisabled |

### 4.8 Page Structure
| Data Point | Description | Example |
|------------|-------------|---------|
| Headers | Top elements | Fixed nav, 64px height |
| Navigation | Nav patterns | Sidebar 240px, Top nav |
| Sidebars | Side panels | Left 280px, collapsible |
| Footers | Bottom elements | 4-column layout |
| Hero sections | Intro areas | Full-width, centered |
| Content areas | Main content | Max-width 800px |
| Card grids | Card layouts | 3-column, 24px gap |
| List patterns | Repeated items | Vertical, 12px spacing |
| Modals | Overlays | Centered, 480px width |
| Form layouts | Form structure | Stacked, 16px gap |
| Section patterns | Templates | Hero → Features → CTA |
| Page templates | Full pages | Dashboard, Settings |
| Breakpoints | Responsive | Desktop, Tablet, Mobile |

### 4.9 Effects
| Data Point | Description | Example |
|------------|-------------|---------|
| Drop shadows | Shadow values | 0 4px 12px rgba(0,0,0,0.1) |
| Shadow scale | Elevation | sm, md, lg, xl |
| Inner shadows | Inset | Input focus states |
| Blur effects | Background | 20px blur |
| Effect IDs | Reusable | S:shadowMd123 |
| Elevation map | By layer | Cards:md, Modals:xl |

### 4.10 Borders
| Data Point | Description | Example |
|------------|-------------|---------|
| Border widths | Stroke size | 1px, 2px, 3px |
| Border colors | Stroke color | #E5E7EB |
| Border styles | Type | Solid, dashed, dotted |
| Border position | Placement | Inside, outside, center |
| Dividers | Separators | 1px #E5E7EB, 16px margin |

---

## Step 5: Deep Scan Pages

```
For each important page:
1. Call `mcp_figma-bridge_deep_scan_page` with pageId
2. Capture complete node tree with styles and bindings
```

---

## Step 6: Export Visual References

```
1. Call `mcp_figma-bridge_export_node_image` for key frames
2. Parameters: nodeId, format: "png", scale: 2
3. Save to `.figma/screenshots/references/` for use by review workflow
```

> ⚠️ **Important**: Save reference screenshots to `/references/` subdirectory to separate from created design screenshots during review.

---

## Step 7: Save Structured Context

Create `.figma/context/{document-name}.json`:

```json
{
  "extractedAt": "ISO timestamp",
  "document": { "name": "", "pages": [] },
  "designSystem": {
    "fonts": [],
    "paintStyles": [],
    "textStyles": [],
    "effectStyles": [],
    "variables": {}
  },
  "components": { "local": [], "library": [] },
  "patterns": {
    "spacing": { "base": 8, "scale": [] },
    "cornerRadius": [],
    "typography": [],
    "colors": {}
  },
  "lookup": {
    "styles": { "Primary/500": "S:123" },
    "components": { "Card": "key123" }
  }
}
```

---

## Step 8: Generate Quick Reference

Create `.figma/context/{document-name}.md` with fonts, styles, spacing, components summary.

---

## Usage

```
/figma-mcp-context-view
```

## AI Tips

1. **Always use IDs** - Never hardcode values, use extracted style IDs
2. **Clone patterns** - Use `clone_node` with discovered component IDs
3. **Follow spacing** - Use detected spacing scale for consistency
4. **Load fonts first** - Always load fonts before text operations
5. **Match structure** - Follow detected page structure patterns
6. **Respect variants** - Use component variant properties correctly
7. **Check effects** - Apply shadow and blur from effect styles
8. **Use variables** - Bind to variable IDs for theming support
9. **Follow hierarchy** - Maintain detected nesting and layout depth
10. **Match colors** - Use semantic color roles consistently

---

## Common Patterns Reference

### Button Pattern
- Height: 40px (sm), 48px (md), 56px (lg)
- Padding: 12px 24px horizontal
- Border radius: 8px standard, 9999px pill
- Typography: Medium weight, 14-16px

### Card Pattern
- Padding: 16-24px internal
- Border radius: 12-16px
- Shadow: sm or md elevation
- Gap: 12-16px between elements

### Form Pattern
- Label: Above input, 8px gap
- Input height: 40-48px
- Field gap: 16-24px vertical
- Error: Below input, 4px gap

### Navigation Pattern
- Height: 56-64px header
- Sidebar: 240-280px width
- Item gap: 4-8px vertical
- Active indicator: Left border or background

---

## Output Files

| File | Purpose |
|------|---------|
| `.figma/context/{name}.json` | Structured data |
| `.figma/context/{name}.md` | Quick reference |
| `.figma/screenshots/references/` | Visual references for review workflow |

---

*Workflow v1.0 - Enables AI agents to understand and replicate design patterns with precision.*

