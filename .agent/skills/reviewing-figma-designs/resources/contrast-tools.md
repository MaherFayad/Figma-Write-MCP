# Contrast Checking Tools & Formulas

Resources for verifying color contrast in Figma designs.

---

## WCAG Contrast Requirements

| Content Type | AA Level | AAA Level |
|--------------|----------|-----------|
| Normal text (<18px) | 4.5:1 | 7:1 |
| Large text (≥18px or ≥14px bold) | 3:1 | 4.5:1 |
| UI components | 3:1 | 3:1 |
| Graphical objects | 3:1 | 3:1 |

---

## Online Tools

### WebAIM Contrast Checker
- **URL**: https://webaim.org/resources/contrastchecker/
- Enter foreground and background hex colors
- Shows pass/fail for WCAG AA and AAA

### Contrast Ratio by Lea Verou
- **URL**: https://contrast-ratio.com
- Simple, visual interface
- Real-time ratio calculation

### Coolors Contrast Checker
- **URL**: https://coolors.co/contrast-checker
- Color picker integration
- Suggests accessible alternatives

---

## Figma Plugins

### Stark
- Comprehensive accessibility checker
- Contrast analysis
- Color blindness simulation
- **Install**: Figma Community → "Stark"

### A11y - Color Contrast Checker
- Lightweight contrast tool
- Quick AA/AAA verification
- **Install**: Figma Community → "A11y"

### Contrast
- Simple contrast checker
- Multiple format support
- **Install**: Figma Community → "Contrast"

---

## Manual Calculation

### Relative Luminance Formula
```
L = 0.2126 × R + 0.7152 × G + 0.0722 × B

Where R, G, B are:
- If sRGB value ≤ 0.03928: value / 12.92
- Else: ((value + 0.055) / 1.055) ^ 2.4
```

### Contrast Ratio Formula
```
Ratio = (L1 + 0.05) / (L2 + 0.05)

Where L1 is the lighter color's luminance
      L2 is the darker color's luminance
```

---

## Quick Reference: Common Failing Combinations

Avoid these often-failing color pairs:

| Combination | Typical Issue |
|-------------|---------------|
| Light gray on white | Low contrast text |
| Blue on black | Insufficient dark mode contrast |
| Red on green | Color blindness collision |
| Yellow on white | Near-invisible text |
| Light text on gradients | Variable contrast |
| Placeholder gray | Often fails 4.5:1 |

---

## Safe Contrast Choices

### Light Mode (white background)
- Body text: `#333333` or darker (≈7:1)
- Secondary text: `#595959` (5.9:1)
- Disabled/hint: `#767676` (4.5:1 minimum)

### Dark Mode (near-black background)
- Body text: `#E0E0E0` or lighter
- Secondary: `#A0A0A0`  
- Avoid pure white `#FFFFFF` (harsh)

---

## Testing Workflow

1. **Identify color pairs** - Extract foreground/background combos
2. **Test critical pairs** - Body text, buttons, links, placeholders
3. **Check overlays** - Text on images, gradients
4. **Verify states** - Hover, focus, error colors
5. **Document findings** - Note failing ratios and locations
