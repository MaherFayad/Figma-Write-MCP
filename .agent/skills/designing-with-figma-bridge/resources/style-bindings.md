# Style Binding Reference

Quick reference for applying design tokens in Figma.

## Fill Styles

```javascript
const styles = figma.getLocalPaintStyles();
const style = styles.find(s => s.name === "Primary/500");
if (style) node.fillStyleId = style.id;
```

## Text Styles

```javascript
const textStyles = figma.getLocalTextStyles();
const style = textStyles.find(s => s.name === "Heading/H1");
if (style) text.textStyleId = style.id;
```

## Effect Styles

```javascript
const effectStyles = figma.getLocalEffectStyles();
const style = effectStyles.find(s => s.name === "Shadow/Medium");
if (style) node.effectStyleId = style.id;
```

## Stroke Styles

```javascript
const strokeStyle = figma.getLocalPaintStyles().find(s => s.name === "Border/Default");
if (strokeStyle) node.strokeStyleId = strokeStyle.id;
```

## Variable Bindings

```javascript
// Using variables for responsive values
const collection = figma.variables.getLocalVariableCollections()[0];
const variable = figma.variables.getLocalVariables().find(v => v.name === "spacing/md");
if (variable) {
  node.setBoundVariable("itemSpacing", variable);
}
```

## Common Style Patterns

| Element | Style Property | Example Name |
|---------|---------------|--------------|
| Background | `fillStyleId` | `Background/Primary` |
| Button Fill | `fillStyleId` | `Primary/500` |
| Text Color | `fillStyleId` | `Text/Primary` |
| Heading | `textStyleId` | `Heading/H1` |
| Body | `textStyleId` | `Body/Regular` |
| Card Shadow | `effectStyleId` | `Shadow/Card` |
| Border | `strokeStyleId` | `Border/Default` |
