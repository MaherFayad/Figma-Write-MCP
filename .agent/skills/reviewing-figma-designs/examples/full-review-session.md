# Example: Full Review Session

Step-by-step example of using the Figma Design Review skill.

---

## Scenario
Reviewing a mobile banking app design in Figma.

---

## Step 1: Connect and Discover

```
get_figma_state
```
**Response**: Connected, plugin active

```
get_document_manifest
```
**Response**:
```json
{
  "pages": [
    { "id": "1:2", "name": "Onboarding" },
    { "id": "2:3", "name": "Dashboard" },
    { "id": "3:4", "name": "Transfers" },
    { "id": "4:5", "name": "Settings" }
  ]
}
```

---

## Step 2: Get Design Context

```
get_design_context
```
**Note**:
- 18 color styles found
- 12 text styles found
- 6 local components
- No external libraries

---

## Step 3: Deep Scan Priority Pages

```
deep_scan_page (pageId: "1:2")  # Onboarding
deep_scan_page (pageId: "2:3")  # Dashboard (high traffic)
```

---

## Step 4: Capture Evidence

```
export_node_image (nodeId: "1:234", scale: 2)  # Login screen
export_node_image (nodeId: "2:567", scale: 2)  # Dashboard
export_node_image (nodeId: "3:890", scale: 2)  # Transfer form
```

---

## Step 5: Conduct Heuristic Evaluation

### H1: Visibility of System Status
**Finding**: Transfer confirmation lacks loading indicator
**Rating**: ⚠️ Needs Work
**Location**: Transfers > Confirmation Screen
**Recommendation**: Add progress spinner during transaction processing

### H4: Consistency
**Finding**: Two different button styles for primary actions
**Rating**: ⚠️ Needs Work  
**Location**: Dashboard vs. Settings
**Recommendation**: Standardize to single primary button component

### H9: Error Messages
**Finding**: Login error says "Error occurred"
**Rating**: ❌ Fail
**Location**: Onboarding > Login
**Recommendation**: Use specific message like "Incorrect password. Please try again."

---

## Step 6: Accessibility Check

### Color Contrast
- Body text on white: `#333333` on `#FFFFFF` = **12.6:1** ✅
- Placeholder text: `#AAAAAA` on `#F5F5F5` = **2.3:1** ❌
- Button text: `#FFFFFF` on `#2563EB` = **8.6:1** ✅

**Finding**: Placeholder text fails contrast
**Recommendation**: Darken to `#757575` minimum

### Touch Targets
- Most buttons 48x48 ✅
- Small "Forgot password?" link 28x28 ❌

---

## Step 7: Generate Report

```markdown
# Design Review: Mobile Banking App

**Date**: 2026-01-18
**Reviewer**: AI Design Auditor

## Executive Summary
Well-structured design system with consistent typography and 
good component reuse. Key issues in error messaging and some 
accessibility gaps need attention before launch.

## Scores

| Category | Score |
|----------|-------|
| Usability | 7/10 |
| UI Quality | 8/10 |
| Accessibility | 6/10 |
| Business Fit | 8/10 |

## Critical Issues
1. Placeholder contrast fails WCAG AA (2.3:1 < 4.5:1)
2. Error messages too vague ("Error occurred")
3. "Forgot password" touch target too small (28px)

## Major Issues
1. Inconsistent primary button styles
2. No loading state on transfer confirmation
3. Missing empty state for transaction history

## Recommendations Priority
1. Fix contrast issues (accessibility risk)
2. Improve error messaging (user trust)
3. Standardize button components (maintainability)
```

---

## Key Takeaways

1. **Start with discovery** - Don't guess, get real data
2. **Capture evidence** - Screenshots support findings
3. **Be specific** - Include exact locations and values
4. **Prioritize** - Critical > Major > Minor
5. **Be constructive** - Every issue needs a recommendation
