# WCAG 2.1 Quick Checklist

Simplified checklist for accessibility audits in Figma designs.

---

## Level A (Minimum)

### Perceivable
- [ ] **1.1.1** Non-text content has text alternatives
- [ ] **1.3.1** Info conveyed through structure, not just visually
- [ ] **1.3.3** Instructions don't rely solely on sensory characteristics
- [ ] **1.4.1** Color is not the only means of conveying info

### Operable
- [ ] **2.1.1** All functionality available via keyboard
- [ ] **2.1.2** No keyboard traps
- [ ] **2.4.1** Skip to main content mechanism
- [ ] **2.4.2** Pages have descriptive titles
- [ ] **2.4.3** Focus order is logical
- [ ] **2.4.4** Link purpose clear from text (or context)

### Understandable
- [ ] **3.1.1** Language of page can be determined
- [ ] **3.2.1** No unexpected context changes on focus
- [ ] **3.2.2** No unexpected context changes on input
- [ ] **3.3.1** Errors are identified and described
- [ ] **3.3.2** Labels or instructions provided for input

### Robust
- [ ] **4.1.2** Name, role, value available for UI components

---

## Level AA (Standard Target)

### Perceivable
- [ ] **1.4.3** Text contrast ratio ≥ 4.5:1 (normal) / 3:1 (large)
- [ ] **1.4.4** Text can resize to 200% without loss
- [ ] **1.4.5** No images of text (except logos)
- [ ] **1.4.10** Content reflows at 320px width
- [ ] **1.4.11** UI component contrast ≥ 3:1
- [ ] **1.4.12** Text spacing can be adjusted

### Operable
- [ ] **2.4.5** Multiple ways to find pages
- [ ] **2.4.6** Headings and labels are descriptive
- [ ] **2.4.7** Focus indicator is visible

### Understandable
- [ ] **3.2.3** Navigation is consistent
- [ ] **3.2.4** Components with same function are consistent
- [ ] **3.3.3** Error suggestions provided
- [ ] **3.3.4** Error prevention on legal/financial

---

## Level AAA (Enhanced)

These are stretch goals. Not all content can meet AAA.

- [ ] **1.4.6** Enhanced contrast (7:1 normal, 4.5:1 large)
- [ ] **2.4.8** Location within site indicated
- [ ] **2.4.9** Link purpose clear from text alone
- [ ] **3.1.3** Unusual words defined
- [ ] **3.1.4** Abbreviations expanded

---

## Common Issues in Figma Designs

### Color Contrast
| Element | Minimum Ratio |
|---------|---------------|
| Normal text (<18px) | 4.5:1 |
| Large text (≥18px or 14px bold) | 3:1 |
| UI components & graphics | 3:1 |
| Non-essential decorative | None |

### Focus States
Every interactive element needs:
- Visible focus outline (2px minimum)
- Sufficient contrast from background
- Consistent styling

### Touch Targets
- Minimum 44x44 CSS pixels
- Adequate spacing between targets
- Padding counts toward target size

### Form Fields
Required for each input:
- Visible label (not just placeholder)
- Error state with explanation
- Required field indication
- Input type indicators

---

## Figma-Specific Checks

Things to verify in Figma files:

1. **Component states**: Hover, focus, disabled, error designed
2. **Color documentation**: Contrast ratios noted
3. **Text alternatives**: Alt text specified in docs/specs
4. **Spacing specs**: Touch target sizes documented
5. **Focus order**: Reading/tab order annotations
6. **Motion**: Reduced motion alternatives designed
