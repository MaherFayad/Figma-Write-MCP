# Auto-Layout Reference

Quick reference for Figma auto-layout properties.

## Basic Setup

```javascript
const frame = figma.createFrame();

// 1. Set layout mode (MUST be first)
frame.layoutMode = "VERTICAL"; // or "HORIZONTAL"

// 2. Configure sizing
frame.primaryAxisSizingMode = "AUTO";   // or "FIXED"
frame.counterAxisSizingMode = "AUTO";   // or "FIXED"

// 3. Set alignment
frame.primaryAxisAlignItems = "CENTER";   // MIN, CENTER, MAX, SPACE_BETWEEN
frame.counterAxisAlignItems = "CENTER";   // MIN, CENTER, MAX, STRETCH

// 4. Set spacing
frame.itemSpacing = 16;

// 5. Set padding
frame.paddingTop = 24;
frame.paddingBottom = 24;
frame.paddingLeft = 24;
frame.paddingRight = 24;
```

## Child Sizing

**IMPORTANT**: Set after `appendChild()`

```javascript
parent.appendChild(child);

// Now set child sizing
child.layoutSizingHorizontal = "FILL";  // or "FIXED", "HUG"
child.layoutSizingVertical = "HUG";     // or "FIXED", "FILL"
```

## Wrap Layout (Grid)

```javascript
frame.layoutMode = "HORIZONTAL";
frame.layoutWrap = "WRAP";
frame.itemSpacing = 24;           // Horizontal gap
frame.counterAxisSpacing = 24;    // Vertical gap (new rows)
```

## Alignment Options

| Property | Values |
|----------|--------|
| `primaryAxisAlignItems` | `MIN`, `CENTER`, `MAX`, `SPACE_BETWEEN` |
| `counterAxisAlignItems` | `MIN`, `CENTER`, `MAX`, `STRETCH` |

## Common Layouts

### Centered Hero

```javascript
frame.layoutMode = "VERTICAL";
frame.primaryAxisAlignItems = "CENTER";
frame.counterAxisAlignItems = "CENTER";
frame.itemSpacing = 32;
frame.paddingTop = 96;
frame.paddingBottom = 96;
```

### Header (Space Between)

```javascript
frame.layoutMode = "HORIZONTAL";
frame.primaryAxisAlignItems = "SPACE_BETWEEN";
frame.counterAxisAlignItems = "CENTER";
frame.paddingLeft = 64;
frame.paddingRight = 64;
```

### Card Grid

```javascript
frame.layoutMode = "HORIZONTAL";
frame.layoutWrap = "WRAP";
frame.itemSpacing = 24;
frame.counterAxisSpacing = 24;
```
