# Execution checklist for Issue #3 (mobile fit)

## Pre-work
- [ ] Reproduce issue on iPhone SE viewport in devtools.
- [ ] Capture before screenshot.

## Implementation
- [ ] Update `.overlay-content` width strategy in `src/uielements/report-selector.css`.
- [ ] Add mobile media query (`max-width: 640px`) for modal/table behavior.
- [ ] Add `.reports { overflow-x: auto; }` for table overflow handling.
- [ ] Add responsive rules for `.right-top` selected-report panel.
- [ ] (Conditional) switch `.overlay` to `position: fixed` in `src/app.css` if absolute positioning causes viewport mismatch.

## Validation
- [ ] Test 320×568, 375×667, 390×844, 768×1024.
- [ ] Confirm no clipping of modal content.
- [ ] Confirm no global horizontal page scroll.
- [ ] Confirm footer links are accessible.
- [ ] Confirm selected-report panel remains usable on mobile.
- [ ] Run typecheck/build.

## Review readiness
- [ ] Capture after screenshot(s).
- [ ] Summarize exact CSS changes and rationale in PR description.
- [ ] Link issue #3 in PR body and mark closure intent.
