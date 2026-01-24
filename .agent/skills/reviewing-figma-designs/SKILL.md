---
name: reviewing-figma-designs
description: Conducts comprehensive design audits of Figma files using MCP tools. Use when the user mentions design review, UX audit, accessibility check, usability evaluation, Jakob Nielsen heuristics, UI critique, or design quality assessment.
---

# Figma Design Review & Audit

Systematic framework for reviewing Figma designs across usability, UI quality, accessibility, and business alignment.

## When to Use This Skill

- User asks for a "design review" or "design audit"
- User mentions "UX evaluation" or "usability check"
- User wants to apply "Jakob Nielsen heuristics"
- User requests "accessibility audit" or "WCAG compliance"
- User needs "UI quality assessment"
- User asks about "design direction" or "business alignment"

## Prerequisites

The Figma MCP server must be connected. Verify with:
```
get_figma_state
```

---

## Review Workflow

Copy and track progress:

```markdown
## Design Review Progress
- [ ] 1. Setup & Discovery
- [ ] 2. Capture Visual Evidence
- [ ] 3. Usability Audit (Nielsen Heuristics)
- [ ] 4. UI Design Quality Audit
- [ ] 5. Accessibility Audit
- [ ] 6. Business & Direction Alignment
- [ ] 7. Generate Report
```

---

## Phase 1: Setup & Discovery

### 1.1 Connect and Get Document Overview
```
get_figma_state           → Verify connection
get_document_manifest     → Get page/frame structure
get_design_context        → Retrieve styles, variables, components
```

### 1.2 Deep Scan Target Pages
For each page to review:
```
deep_scan_page (pageId: "<page-id>")
```

### 1.3 Note Key Information
Document before proceeding:
- **Total pages**: ___
- **Total frames/screens**: ___
- **Design system present**: Yes/No
- **Component library**: Local / External / None
- **Color styles count**: ___
- **Text styles count**: ___

---

## Phase 2: Capture Visual Evidence

For key screens, capture screenshots:
```
export_node_image (nodeId: "<frame-id>", scale: 2)
```

Create a visual inventory of:
- [ ] Homepage / Landing
- [ ] Key user flows (onboarding, checkout, etc.)
- [ ] Error states
- [ ] Empty states
- [ ] Navigation patterns

---

## Phase 3: Usability Audit (Jakob Nielsen's 10 Heuristics)

Rate each heuristic: ✅ Pass | ⚠️ Needs Work | ❌ Fail

### H1: Visibility of System Status
> System should keep users informed through timely feedback

**Check for:**
- Loading indicators present
- Progress bars for multi-step flows
- Confirmation messages after actions
- Active/selected state indicators
- Breadcrumbs or navigation state

**Rating**: ___ | **Evidence**: ___

---

### H2: Match Between System and Real World
> Use familiar language, conventions, and logical order

**Check for:**
- Plain language (no jargon)
- Familiar icons with clear meaning
- Information in natural, logical order
- Metaphors that match user mental models

**Rating**: ___ | **Evidence**: ___

---

### H3: User Control and Freedom
> Support undo, redo, and easy escape routes

**Check for:**
- Cancel buttons on forms/modals
- Back navigation available
- Undo capability for destructive actions
- Clear exit points from flows
- "Escape hatches" from wizards

**Rating**: ___ | **Evidence**: ___

---

### H4: Consistency and Standards
> Follow platform and internal conventions

**Check for:**
- Consistent button styles across screens
- Same icons used for same actions
- Uniform spacing patterns
- Consistent terminology
- Design tokens/variables usage

**Rating**: ___ | **Evidence**: ___

---

### H5: Error Prevention
> Prevent errors before they happen

**Check for:**
- Constraints on inputs (date pickers vs. text)
- Confirmation dialogs for destructive actions
- Clear form field requirements
- Disabled states for invalid actions
- Input validation before submission

**Rating**: ___ | **Evidence**: ___

---

### H6: Recognition Rather Than Recall
> Minimize memory load with visible options

**Check for:**
- Visible navigation (not hidden menus)
- Labeled icons
- Autocomplete suggestions
- Recent/history features
- Contextual help

**Rating**: ___ | **Evidence**: ___

---

### H7: Flexibility and Efficiency of Use
> Accelerators for expert users

**Check for:**
- Keyboard shortcuts indicated
- Quick actions/shortcuts
- Customization options
- Power user features
- Batch operations

**Rating**: ___ | **Evidence**: ___

---

### H8: Aesthetic and Minimalist Design
> Remove unnecessary elements

**Check for:**
- No visual clutter
- Clear visual hierarchy
- Focused content per screen
- Strategic use of white space
- No competing calls-to-action

**Rating**: ___ | **Evidence**: ___

---

### H9: Help Users Recognize, Diagnose, Fix Errors
> Clear, helpful error messages

**Check for:**
- Error messages in plain language
- Specific problem identification
- Constructive suggestions for resolution
- Visual indicators (red, icons)
- Inline validation feedback

**Rating**: ___ | **Evidence**: ___

---

### H10: Help and Documentation
> Accessible help when needed

**Check for:**
- Help icons/tooltips on complex features
- Onboarding/tutorial screens
- FAQ or help section
- Contextual guidance
- Empty state instructions

**Rating**: ___ | **Evidence**: ___

---

## Phase 4: UI Design Quality Audit

### 4.1 Visual Hierarchy
- [ ] Clear primary, secondary, tertiary actions
- [ ] Logical reading flow (F/Z patterns)
- [ ] Proper heading hierarchy (size progression)
- [ ] Focus areas draw attention correctly

### 4.2 Typography
- [ ] Maximum 2-3 font families
- [ ] Consistent type scale
- [ ] Adequate line-height (1.4-1.6 for body)
- [ ] Readable font sizes (min 14px body)
- [ ] Proper text alignment

### 4.3 Color & Contrast
- [ ] Cohesive color palette
- [ ] Primary accent used consistently
- [ ] Sufficient text contrast
- [ ] Semantic colors (success/error/warning)
- [ ] **Consistency Score > 90%** (Check `analyze_patterns` output)

### 4.4 Spacing & Layout
- [ ] Consistent spacing system (4px/8px grid)
- [ ] Proper margins and padding
- [ ] Aligned elements (grid adherence)
- [ ] Balanced white space
- [ ] Responsive considerations

### 4.5 Components & Patterns
- [ ] Consistent button styles
- [ ] Uniform input fields
- [ ] Standardized cards/containers
- [ ] Consistent iconography
- [ ] Reusable component usage

### 4.6 Microinteractions & States
- [ ] Hover states defined
- [ ] Active/pressed states
- [ ] Focus states (keyboard nav)
- [ ] Disabled states
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

---

## Phase 5: Accessibility Audit (WCAG 2.1)

### 5.1 Perceivable

**Color Contrast:**
- [ ] Normal text: 4.5:1 ratio minimum
- [ ] Large text (18px+): 3:1 ratio minimum
- [ ] UI components: 3:1 ratio

**Non-Text Content:**
- [ ] Images have alt text (or marked decorative)
- [ ] Icons have labels or aria-labels
- [ ] Complex graphics have descriptions

**Text:**
- [ ] Text can resize to 200% without loss
- [ ] No images of text (except logos)

---

### 5.2 Operable

**Keyboard:**
- [ ] All functions keyboard accessible
- [ ] Visible focus indicators
- [ ] Logical focus order
- [ ] No keyboard traps

**Timing:**
- [ ] Sufficient time for reading (no auto-advance <5s)
- [ ] Pause/stop controls for animations

**Navigation:**
- [ ] Skip to main content option
- [ ] Descriptive page titles
- [ ] Clear link purposes
- [ ] Multiple navigation methods

---

### 5.3 Understandable

**Readability:**
- [ ] Clear, simple language
- [ ] Abbreviations explained
- [ ] Reading level appropriate

**Predictability:**
- [ ] Consistent navigation
- [ ] Consistent identification
- [ ] No unexpected context changes

**Input Assistance:**
- [ ] Clear labels on inputs
- [ ] Error identification
- [ ] Error suggestions
- [ ] Error prevention for legal/financial

---

### 5.4 Robust

**Compatibility:**
- [ ] Proper heading structure
- [ ] Valid ARIA usage
- [ ] Name, role, value for components

---

## Phase 6: Business & Direction Alignment

### 6.1 Brand Consistency
- [ ] Brand colors applied correctly
- [ ] Logo usage follows guidelines
- [ ] Typography matches brand
- [ ] Imagery style consistent
- [ ] Tone of voice appropriate

### 6.2 Target Audience Fit
- [ ] Design matches user expectations
- [ ] Appropriate complexity level
- [ ] Cultural considerations addressed
- [ ] Age-appropriate design

### 6.3 Competitive Positioning
- [ ] Differentiating elements present
- [ ] Industry conventions followed where expected
- [ ] Innovation balanced with familiarity

### 6.4 Business Goals
- [ ] Primary CTAs prominent
- [ ] Conversion path clear
- [ ] Value proposition visible
- [ ] Trust signals present
- [ ] Key metrics can be measured

---

## Phase 7: Generate Report

### Report Template

```markdown
# Design Review Report

**Project**: [Name]
**Date**: [Date]
**Reviewer**: AI Design Auditor

## Executive Summary
[2-3 sentence overview of design quality]

## Scores Overview
| Category | Score | Status |
|----------|-------|--------|
| Usability (Nielsen) | X/10 | ✅⚠️❌ |
| UI Design Quality | X/10 | ✅⚠️❌ |
| Accessibility | X/10 | ✅⚠️❌ |
| Business Alignment | X/10 | ✅⚠️❌ |

## Critical Issues (Must Fix)
1. [Issue + Location + Recommendation]
2. ...

## Major Issues (Should Fix)
1. [Issue + Location + Recommendation]
2. ...

## Minor Issues (Could Fix)
1. [Issue + Location + Recommendation]
2. ...

## Strengths
- [What's working well]

## Recommendations Summary
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

## Screenshots & Evidence
[Include exported images with annotations]
```

---

## Quick Reference: MCP Tools Used

| Tool | Purpose |
|------|---------|
| `get_figma_state` | Verify connection |
| `get_document_manifest` | Document structure |
| `get_design_context` | Styles, variables, components |
| `deep_scan_page` | Detailed node analysis |
| `get_selection_context` | Selected element details |
| `export_node_image` | Capture screenshots |
| `analyze_patterns` | Design system usage patterns |

---

## Resources

- [Nielsen's Heuristics](resources/nielsen-heuristics.md)
- [WCAG Checklist](resources/wcag-checklist.md)
- [Contrast Tools](resources/contrast-tools.md)
