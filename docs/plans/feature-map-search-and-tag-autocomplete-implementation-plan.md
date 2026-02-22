# Feature plan: Map/Stop Search + Tag Editor Auto-complete

## Scope

This plan covers two new frontend features requested from scratch:

1. **Map search / stop search** (search places and GTFS/OSM stops, then move map + select result)
2. **Auto-complete in tag editor** (suggest tag keys and context-aware values while editing)

The goal is to deliver these features without breaking existing selection/report workflows.

---

## 1) Current architecture summary (what we build on)

- App shell + map lifecycle live in `src/app.tsx` and `src/map/map.ts`.
- Floating controls are currently plain DOM (`#map-location` input + "Goto OSM") created inside `createMap`.
- Selection panel and tag editing are rendered by Preact components in:
  - `src/uielements/selection-info.tsx`
  - `src/uielements/editor/osm-tags.tsx`
- OSM entities/edits are managed via in-memory service `src/services/OSMData.ts`.

**Why this matters:**
- Search UX should be a Preact UI component (not manual DOM), but still integrated with map instance.
- Tag auto-complete should enhance the existing `TagEditor` state model, not replace it.

---

## 2) Deliverables (files to add/change)

## A. Map/Stop Search

### New files

1. `src/services/search.types.ts`
   - Common types:
     - `SearchResult` (`id`, `kind`, `label`, `subtitle`, `lon`, `lat`, `source`, `score`, optional refs)
     - `SearchQueryContext` (active region/report/dataset)
   - **Why:** avoids ad-hoc typed objects across UI/services.

2. `src/services/search.providers.ts`
   - Provider interfaces + implementations:
     - `searchStopsLocal(query, context)` — searches currently loaded GTFS/OSM stop data
     - `searchNominatim(query)` (or configurable geocoder)
   - Request cancelation with `AbortController`.
   - **Why:** provider separation lets us blend local stop results + global map geocoding.

3. `src/services/search.index.ts`
   - Lightweight in-memory index builder from report data + known OSM stop tags.
   - Normalization helpers (case-folding, diacritics stripping, token splitting).
   - **Why:** local stop search must be fast and work with incomplete network conditions.

4. `src/uielements/map-search.tsx`
   - Search input + result list + keyboard navigation.
   - Emits selected `SearchResult` to parent.
   - Debounced query updates.
   - **Why:** keeps search UX encapsulated and testable.

5. `src/uielements/map-search.css`
   - Styling for dropdown, highlighted row, mobile layout behavior.

### Existing files to change

6. `src/app.tsx`
   - Mount `<MapSearch />` in app overlay layer.
   - On result select:
     - `map.flyTo({ center, zoom })`
     - trigger selection when result is tied to known feature/element.
   - **Why:** app has shared access to map + selection context.

7. `src/app.css`
   - Add positioning rules for search component to avoid overlap with `#map-location` and side panels.

8. `src/map/map.ts`
   - Keep location hash control, but stop adding overlapping hardcoded UI assumptions that conflict with search placement.
   - Optionally expose helper to parse/format location string if reused by search component.

9. `src/uielements/routing.ts` (optional enhancement)
   - Parse `#/search/<query>` and keep query in URL hash for shareability.

---

## B. Tag Editor Auto-complete

### New files

10. `src/services/tag-autocomplete.ts`
   - Tag key dictionary and value providers:
     - static transport-focused keys (`public_transport`, `highway`, `bus`, `name`, `ref`, `network`, `operator`, etc.)
     - context-driven values (from existing element tags in `OSM_DATA`, selected GTFS routes/types)
   - APIs:
     - `suggestTagKeys(prefix, ctx)`
     - `suggestTagValues(key, prefix, ctx)`
   - Ranking function (exact prefix > contains > frequency).
   - **Why:** central source of truth for suggestions; UI stays thin.

11. `src/services/tag-autocomplete.types.ts`
   - `AutocompleteItem`, `AutocompleteContext`, `SuggestionSource`.

12. `src/uielements/editor/tag-autocomplete-popover.tsx`
   - Reusable popover list with keyboard interactions (`ArrowUp/Down`, `Enter`, `Tab`, `Escape`).

13. `src/uielements/editor/tag-autocomplete-popover.css`
   - Visual style and focus state.

### Existing files to change

14. `src/uielements/editor/osm-tags.tsx`
   - Per-row editing mode (`editing: 'key' | 'value' | null`).
   - Show auto-complete popover near active input.
   - Accept suggestion and update entry value/key.
   - Ensure duplicate-key validation still works.
   - **Why:** this is where keystrokes/state already exist.

15. `src/uielements/editor/osm-tags.css`
   - Layout support for popover placement and selected suggestion style.

16. `src/uielements/selection-info.tsx`
   - Pass contextual data to tag editor (route types, report region, nearby tags) for better value suggestions.

---

## 3) Implementation phases (step-by-step)

## Phase 0 — Foundation and guardrails

1. Add shared search and autocomplete types first.
2. Add minimal utility helpers (normalization, scoring) with pure functions.

**Why it works:** shared type contracts prevent drift between UI and service modules.

---

## Phase 1 — Map/Stop Search MVP

1. Build `search.index.ts` to index available stop candidates from currently loaded match report payloads.
2. Implement `search.providers.ts` local provider (no external API yet).
3. Build `map-search.tsx`:
   - debounced input (200–300ms)
   - result list
   - keyboard navigation
4. Integrate into `app.tsx` and fly-to selected item.

**Why it works:** local stop search delivers user value even without geocoder and validates UX quickly.

---

## Phase 2 — Map geocoder integration

1. Add configurable geocoder endpoint (default Nominatim-compatible).
2. Merge local + geocoder results with scoring buckets:
   - local stop exact matches first
   - local partials
   - global geocoder results
3. Add network controls:
   - minimum query length (>=2 or 3)
   - cancel stale requests
   - simple in-memory query cache (LRU-ish map)

**Why it works:** reduces API noise, avoids race-condition flicker, and keeps stop results prioritized for this tool.

---

## Phase 3 — Tag auto-complete MVP

1. Add key suggestion provider using static PT tag dictionary.
2. Wire key input in `osm-tags.tsx` to popover component.
3. Support keyboard pick/commit.

**Why it works:** tag key completion gives immediate speedup with low risk and no backend dependency.

---

## Phase 4 — Contextual value auto-complete

1. Implement value suggestions scoped by key:
   - `public_transport` -> `platform`, `stop_position`, `station`
   - `highway` -> `bus_stop`
   - `bus` -> `yes`
   - `railway` -> `platform`, `station`, `tram_stop`
2. Add dynamic suggestions from in-memory OSM data frequencies.
3. Add GTFS-aware values where applicable (e.g., network/operator candidates from existing tags in region).

**Why it works:** key-specific constraints make value suggestions accurate and reduce invalid tagging.

---

## Phase 5 — URL/state polish and accessibility

1. Optional hash sync for search query/result.
2. ARIA roles:
   - combobox/listbox/options for search and tag popovers.
3. Focus management (Esc closes; Tab confirms/continues).

**Why it works:** improves keyboard/mobile usability and supports long-term maintainability.

---

## 4) Detailed behavior specs

## Map/Stop Search behavior

- Input placeholder: `Search place or stop…`
- Enter key: choose top highlighted result.
- Click result:
  - map flies to point
  - if result maps to current dataset feature, set selection and open left panel.
- Empty query:
  - show recent searches (localStorage) or hide dropdown.
- No results:
  - show "No matches" state.

## Tag autocomplete behavior

- While editing key input:
  - show key suggestions after 1+ chars.
- While editing value input:
  - only show suggestions if key is non-empty.
- Selecting suggestion:
  - replaces only active field
  - keeps row focused
- Escape:
  - closes dropdown without mutating value.

---

## 5) Risk analysis + mitigation

1. **Race conditions in async search**
   - Mitigation: `AbortController`, request tokens, ignore stale responses.

2. **Too many irrelevant geocoder results**
   - Mitigation: rank local stops first; cap external results; optional region bias.

3. **Tag editor complexity/regression risk**
   - Mitigation: keep existing row model; add autocomplete as additive UI layer only.

4. **Performance on large tag dictionaries**
   - Mitigation: precompute lowercased arrays and cap rendered suggestions.

5. **UI overlap with existing floating controls**
   - Mitigation: explicit z-index + responsive CSS checks for `#selection-info` and right-top panel.

---

## 6) Validation plan

## Programmatic checks

- `yarn exec tsc --noEmit`
- `yarn build`

## Manual checks

- Desktop + mobile widths (320/375/768/1440):
  - search box placement and overlap
  - dropdown usability
  - map fly-to correctness
  - tag key/value autocomplete keyboard handling

## Regression checks

- Existing edit actions still work:
  - add/delete/restore tag
  - duplicate-key prevention
  - protected key read-only behavior

---

## 7) Proposed implementation order (PR slicing)

1. **PR1**: Search types/index/provider + basic search UI + fly-to.
2. **PR2**: External geocoder integration + ranking/cache.
3. **PR3**: Tag key autocomplete.
4. **PR4**: Tag value/context autocomplete + accessibility polish.

**Why this order works:** each PR is testable and independently useful, reducing merge risk.

---

## 8) Definition of done

- User can search place/stop and move map from a single search box.
- Stop search returns local matches quickly.
- Tag editor provides key and value suggestions with keyboard selection.
- No regression in existing report selection and tag editing behavior.
- Typecheck/build pass.
