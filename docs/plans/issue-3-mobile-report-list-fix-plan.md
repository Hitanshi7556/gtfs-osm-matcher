# Issue #3 plan: make report list fit mobile screens

## 1) Problem summary

On mobile viewport sizes (for example iPhone SE width), the report list modal overflows the screen and can be partially cut off. The current root cause is the desktop-biased sizing in `.overlay-content`:

- `width: 50%`
- `min-width: 600px`

Those values force a panel wider than small mobile screens.

## 2) Why this happens in the current implementation

The report list view is rendered by `MatchReportSelector` when no report is selected. It uses:

- `<div className="overlay">`
- `<div className="overlay-content">`

The CSS for `.overlay-content` currently mandates a hard minimum width (`600px`) and desktop-width ratio (`50%`). On devices around ~320-430px wide, the content cannot shrink to viewport width, so horizontal clipping appears.

## 3) Implementation plan (code-level)

### Step A — Replace hard desktop sizing with responsive defaults

Update `.overlay-content` in `src/uielements/report-selector.css`:

- Remove `min-width: 600px`
- Replace fixed width with viewport-safe sizing:
  - `width: min(50rem, calc(100vw - 2rem));`
  - keep centered with `margin: 1em auto;`
- Keep vertical scroll behavior with `max-height` + `overflow-y`

**Why this works:**
`calc(100vw - 2rem)` guarantees the panel never exceeds the visible viewport minus side margins; `min(50rem, ...)` preserves large-screen behavior.

### Step B — Add a mobile breakpoint for table-heavy content

Add media query for narrow devices (e.g. `max-width: 640px`) in `src/uielements/report-selector.css`:

- Reduce panel padding and border radius for usable space.
- Allow horizontal scrolling inside table wrapper instead of page overflow:
  - ensure `.reports { overflow-x: auto; }`
- Reduce table cell padding/font where needed for readability.

**Why this works:**
The report table has many columns; forcing it to shrink can make it unreadable. Letting the table scroll horizontally inside the modal avoids layout breakage while preserving data visibility.

### Step C — Ensure overlay anchoring is robust on mobile

In `src/app.css`, evaluate whether `.overlay` should be `position: fixed` (instead of absolute) for consistency with mobile browser UI chrome and scrolling.

- If testing shows content shift/cutoff while page scrolls, change to `position: fixed`.
- Keep full-screen bounds (`top/left/right/bottom: 0`) and existing z-index.

**Why this works:**
A fixed overlay tracks viewport directly and avoids container-height coupling issues.

### Step D — Verify selected-report side panel on mobile

`right-top` block is desktop-oriented (`width: 275px; right: 10px`). Add responsive override in `src/uielements/report-selector.css` for narrow screens:

- `left: 0.5rem; right: 0.5rem; width: auto;`
- optionally move below top controls if overlap appears.

**Why this works:**
Prevents side panel clipping and control collisions on small widths.

## 4) Validation plan

### Automated checks

1. Run lint/typecheck/build:
   - `yarn lint` (if configured)
   - `yarn tsc --noEmit`
   - `yarn build`

2. Add/adjust UI tests only if project already has frontend test harness.

### Manual visual checks

Test at least these widths in browser devtools:

- 320×568 (iPhone SE)
- 375×667 (iPhone 8/SE2 logical)
- 390×844 (iPhone 12/13)
- 768×1024 (tablet portrait)

Verify:

- Overlay container fully visible with side margins.
- No page-level horizontal scroll when modal is open.
- Table stays usable (scrollable if needed).
- Footer links remain accessible.
- Selected-report panel (`right-top`) remains reachable and not clipped.

## 5) Suggested commit breakdown

1. `fix(ui): make report overlay responsive on small screens`
   - CSS sizing + mobile media query.

2. `fix(ui): adapt selected-report side panel for narrow viewports`
   - responsive `right-top` behavior.

3. `test(ui): document mobile viewport verification`
   - add notes to README or a short QA checklist.

## 6) Risk and mitigation

- **Risk:** table becomes too compressed.
  - **Mitigation:** prefer horizontal scrolling in `.reports` rather than forcing tiny text.

- **Risk:** changing overlay positioning affects desktop behavior.
  - **Mitigation:** validate both mobile and desktop widths before merge.

- **Risk:** map controls overlap panel.
  - **Mitigation:** add mobile-specific top offsets/z-index tuning after visual test.

## 7) Definition of done

- Issue reproducible before change, not reproducible after change.
- Mobile widths render the report list without clipping.
- No regressions in desktop layout.
- Build/typecheck pass.
