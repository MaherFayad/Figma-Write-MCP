# Jakob Nielsen's 10 Usability Heuristics

Quick reference for conducting heuristic evaluations.

---

## H1: Visibility of System Status
**Principle**: Keep users informed about what's happening through appropriate feedback within reasonable time.

**Look for**:
- Loading spinners and progress indicators
- Success/failure notifications
- Current state indicators (active tab, selected item)
- Real-time updates

**Red flags**:
- Actions with no feedback
- Long operations without progress indication
- Unclear current state

---

## H2: Match Between System and Real World
**Principle**: Speak the user's language. Use words, phrases, and concepts familiar to the user.

**Look for**:
- Plain, jargon-free language
- Familiar icons and metaphors
- Natural information order
- Cultural appropriateness

**Red flags**:
- Technical jargon in user-facing text
- Unclear abbreviations
- Unfamiliar iconography

---

## H3: User Control and Freedom
**Principle**: Provide "emergency exits" for mistaken actions without requiring an extended process.

**Look for**:
- Cancel buttons
- Undo/redo functionality
- Back navigation
- Easy exit from processes

**Red flags**:
- No way to cancel
- Irreversible actions without warning
- Trapped in workflows

---

## H4: Consistency and Standards
**Principle**: Follow platform conventions. Same words, situations, and actions should mean the same thing.

**Look for**:
- Consistent visual elements
- Standard terminology
- Predictable placement
- Platform convention adherence

**Red flags**:
- Different buttons for same action
- Inconsistent terminology
- Unexpected placements

---

## H5: Error Prevention
**Principle**: Prevent problems from occurring. Eliminate error-prone conditions.

**Look for**:
- Input constraints (date pickers, dropdowns)
- Confirmation for destructive actions
- Inline validation
- Clear requirements

**Red flags**:
- Free-form input for structured data
- No confirmation for deletes
- Validation only on submit

---

## H6: Recognition Rather Than Recall
**Principle**: Minimize memory load. Make elements, actions, and options visible.

**Look for**:
- Visible navigation options
- Labeled icons
- Recent/history features
- Contextual help

**Red flags**:
- Hidden menus
- Icon-only interfaces
- Reliance on user memory

---

## H7: Flexibility and Efficiency of Use
**Principle**: Provide accelerators for expert users while remaining accessible to novices.

**Look for**:
- Keyboard shortcuts
- Customization options
- Power user features
- Quick actions

**Red flags**:
- Single interaction method only
- No expert features
- Rigid workflows

---

## H8: Aesthetic and Minimalist Design
**Principle**: Remove irrelevant or rarely needed information. Every element competes for attention.

**Look for**:
- Clear visual hierarchy
- Strategic white space
- Focused content
- Essential elements only

**Red flags**:
- Visual clutter
- Competing CTAs
- Information overload

---

## H9: Help Users Recognize, Diagnose, and Recover from Errors
**Principle**: Error messages should be expressed in plain language, indicate the problem, and suggest a solution.

**Look for**:
- Plain language errors
- Specific problem identification
- Constructive suggestions
- Clear visual indicators

**Red flags**:
- Technical error codes
- Vague messages ("Something went wrong")
- No recovery path

---

## H10: Help and Documentation
**Principle**: Even though better if system is usable without documentation, help should be available, searchable, and task-focused.

**Look for**:
- Tooltips on complex features
- Onboarding flows
- Contextual help
- Searchable documentation

**Red flags**:
- No help available
- Help that's hard to find
- Generic, non-contextual help

---

## Severity Rating Scale

| Rating | Description | Action |
|--------|-------------|--------|
| 0 | Not a usability problem | None |
| 1 | Cosmetic problem only | Fix if time |
| 2 | Minor usability problem | Low priority |
| 3 | Major usability problem | High priority |
| 4 | Usability catastrophe | Must fix |
