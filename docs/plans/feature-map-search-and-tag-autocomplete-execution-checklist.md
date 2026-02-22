# Execution checklist: Map/Stop Search + Tag Auto-complete

## Planning / setup
- [ ] Confirm geocoder provider choice (Nominatim-compatible default).
- [ ] Confirm minimum supported devices (mobile + desktop).

## Search implementation
- [ ] Add `search.types.ts` and provider interface.
- [ ] Add local stop index builder and scoring utils.
- [ ] Implement `map-search.tsx` + CSS.
- [ ] Integrate with `app.tsx` for `flyTo` + optional selection.
- [ ] Add request cancelation, query debounce, and cache.

## Tag autocomplete implementation
- [ ] Add autocomplete types/service with base dictionaries.
- [ ] Add popover component + CSS.
- [ ] Integrate key suggestions into `osm-tags.tsx` key input.
- [ ] Integrate value suggestions based on chosen key.
- [ ] Add keyboard controls (up/down/enter/tab/esc).

## QA
- [ ] Verify search on short/long queries and no-result state.
- [ ] Verify stop result selects/focuses map correctly.
- [ ] Verify key suggestion insertion without duplicate-key regressions.
- [ ] Verify value suggestion insertion keeps focus and row state stable.
- [ ] Verify mobile layout and overlap with existing panels.
- [ ] Run typecheck and build.

## Ship
- [ ] Capture screenshots/GIF for both features.
- [ ] Document behavior and keyboard shortcuts in README.
