import type { Map } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import type { Report } from "./report";

/**
 * Region bounding-box overlay for the report selector.
 *
 * When the user hasn't selected a region yet, we draw coloured
 * rectangles on the map — one per region — so they can visually
 * find their city and click it instead of scrolling through 301 names.
 *
 * Each rectangle comes from report.matchMeta.gtfsBbox which has
 * { left, right, top, bottom } in WGS-84 degrees.
 */

const SOURCE_ID = "region-bboxes";
const FILL_LAYER_ID = "region-bboxes-fill";
const LINE_LAYER_ID = "region-bboxes-line";

// ── helpers ──────────────────────────────────────────────────────

/**
 * Turn a gtfsBbox into a GeoJSON Polygon with rounded corners.
 * We add small arcs at each corner so the shape looks softer
 * than a raw rectangle.
 */
function bboxToPolygon(bbox: { left: number; right: number; top: number; bottom: number }) {
    const w = bbox.right - bbox.left;
    const h = bbox.top - bbox.bottom;
    // Corner radius as 12% of the shorter side (clamped)
    const r = Math.min(w, h) * 0.12;

    // Helper: generate quarter-arc points (from startAngle, 90° sweep)
    function arc(cx: number, cy: number, startDeg: number): [number, number][] {
        const pts: [number, number][] = [];
        const steps = 6; // 6 segments per corner → smooth enough
        for (let i = 0; i <= steps; i++) {
            const a = ((startDeg + (90 * i) / steps) * Math.PI) / 180;
            pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        return pts;
    }

    const ring = [
        // bottom-left corner  (arc from 180° to 270°)
        ...arc(bbox.left + r,  bbox.bottom + r, 180),
        // bottom-right corner (arc from 270° to 360°)
        ...arc(bbox.right - r, bbox.bottom + r, 270),
        // top-right corner    (arc from 0° to 90°)
        ...arc(bbox.right - r, bbox.top - r,    0),
        // top-left corner     (arc from 90° to 180°)
        ...arc(bbox.left + r,  bbox.top - r,    90),
    ];
    // Close the ring
    ring.push(ring[0]);

    return { type: "Polygon" as const, coordinates: [ring] };
}

/** Compute match percentage for colour coding. */
function matchPercent(report: Report): number | null {
    const s = report.matchStats;
    if (!s || !s.total) return null;
    const matched = s.matchId + s.nameMatch + s.manyToOne + s.transitHubs;
    return (matched / s.total) * 100;
}

/** Pick a soft colour based on match quality. */
function matchColor(pct: number | null): string {
    if (pct === null) return "#9e9e9e";   // unknown → soft grey
    if (pct >= 85) return "#4caf50";      // good   → soft green
    if (pct >= 75) return "#ff9800";      // ok     → soft amber
    return "#ef5350";                     // poor   → soft red
}

// ── main API ─────────────────────────────────────────────────────

/**
 * Build a GeoJSON FeatureCollection from the report list.
 * Each feature carries the region name and match % as properties
 * so MapLibre can use them for styling and click handling.
 */
function reportsToGeoJSON(reports: Report[]) {
    const features = reports
        .filter(r => r.matchMeta?.gtfsBbox)          // only regions that have a bbox
        .map((r, i) => {
            const pct = matchPercent(r);
            const bbox = r.matchMeta.gtfsBbox!;
            return {
                type: "Feature" as const,
                id: i,
                properties: {
                    region: r.region,
                    // Short label: take the meaningful part after country prefix
                    label: r.region.replace(/^[a-z]+-/, '').replace(/-/g, ' '),
                    matchPercent: pct !== null ? Math.round(pct) : null,
                    color: matchColor(pct),
                    liveUpdates: !!r.liveUpdates,
                    // Center point for label placement
                    labelLon: (bbox.left + bbox.right) / 2,
                    labelLat: (bbox.top + bbox.bottom) / 2,
                },
                geometry: bboxToPolygon(bbox),
            };
        });

    return { type: "FeatureCollection" as const, features };
}

/** Build a point FeatureCollection for labels at bbox centers. */
function reportsToLabelPoints(reports: Report[]) {
    const features = reports
        .filter(r => r.matchMeta?.gtfsBbox)
        .map((r, i) => {
            const pct = matchPercent(r);
            const bbox = r.matchMeta.gtfsBbox!;
            return {
                type: "Feature" as const,
                id: i,
                properties: {
                    region: r.region,
                    label: r.region.replace(/^[a-z]+-/, '').replace(/-/g, ' '),
                    matchPercent: pct !== null ? Math.round(pct) : null,
                    color: matchColor(pct),
                },
                geometry: {
                    type: "Point" as const,
                    coordinates: [(bbox.left + bbox.right) / 2, (bbox.top + bbox.bottom) / 2],
                },
            };
        });

    return { type: "FeatureCollection" as const, features };
}

const HIGHLIGHT_FILL_ID = "region-bboxes-highlight-fill";
const HIGHLIGHT_LINE_ID = "region-bboxes-highlight-line";
const LABEL_SOURCE_ID = "region-labels";
const LABEL_LAYER_ID = "region-bboxes-labels";

export type BboxLayerHandle = {
    /** Highlight a single region's bbox (pass null to clear). */
    setSelectedRegion: (region: string | null) => void;
    /** Remove all layers and listeners from the map. */
    remove: () => void;
};

/**
 * Add the region bbox layer to the map.
 *
 * Returns a handle with:
 *  - setSelectedRegion(region) — highlights one region's boundary
 *  - remove() — tears everything down
 *
 * The layer stays visible even after a region is selected so the
 * user can see the coverage area while browsing stops.
 */
export function addRegionBboxLayer(
    map: Map,
    reports: Report[],
    onSelectRegion: (region: string) => void,
): BboxLayerHandle {
    const geojson = reportsToGeoJSON(reports);
    const labelPoints = reportsToLabelPoints(reports);

    // ── polygon source ──
    map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson as any,
    });

    // ── label point source ──
    map.addSource(LABEL_SOURCE_ID, {
        type: "geojson",
        data: labelPoints as any,
    });

    // ── fill layer (all regions, always visible, very subtle) ──
    map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.22,
                0.07,
            ],
        },
    });

    // ── outline layer (all regions, dashed) ──
    map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
            "line-color": ["get", "color"],
            "line-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                2.5,
                1,
            ],
            "line-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.9,
                0.4,
            ],
            "line-dasharray": [3, 2],
        },
    });

    // ── highlight layers (selected region — rendered ON TOP, stronger) ──
    map.addLayer({
        id: HIGHLIGHT_FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "region"], ""],   // hidden by default
        paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.20,
        },
    });

    map.addLayer({
        id: HIGHLIGHT_LINE_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "region"], ""],   // hidden by default
        paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
            "line-opacity": 0.95,
        },
    });

    // ── name labels at the center of each region ──
    map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: LABEL_SOURCE_ID,
        layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-anchor": "center",
            "text-max-width": 8,
            "text-allow-overlap": false,
            "text-ignore-placement": false,
        },
        paint: {
            "text-color": "#333",
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
        },
    });

    // ── hover popup ──
    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
    });

    let hoveredId: number | null = null;

    function onMouseMove(e: any) {
        const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID, HIGHLIGHT_FILL_ID] });

        if (features.length > 0) {
            if (hoveredId !== null) {
                map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
            }

            const feat = features[0];
            hoveredId = feat.id as number;
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: true });

            map.getCanvas().style.cursor = "pointer";

            const props = feat.properties;
            const pct = props.matchPercent;
            const label = pct !== null
                ? `<strong>${props.region}</strong><br/>Matched: ${pct}%`
                : `<strong>${props.region}</strong>`;

            popup.setLngLat(e.lngLat).setHTML(label).addTo(map);
        } else {
            if (hoveredId !== null) {
                map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
                hoveredId = null;
            }
            map.getCanvas().style.cursor = "";
            popup.remove();
        }
    }

    function onMouseLeave() {
        if (hoveredId !== null) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
            hoveredId = null;
        }
        map.getCanvas().style.cursor = "";
        popup.remove();
    }

    function onClick(e: any) {
        const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID, HIGHLIGHT_FILL_ID] });
        if (features.length > 0) {
            const region = features[0].properties.region;
            onSelectRegion(region);
        }
    }

    map.on("mousemove", FILL_LAYER_ID, onMouseMove);
    map.on("mouseleave", FILL_LAYER_ID, onMouseLeave);
    map.on("click", FILL_LAYER_ID, onClick);
    map.on("mousemove", HIGHLIGHT_FILL_ID, onMouseMove);
    map.on("mouseleave", HIGHLIGHT_FILL_ID, onMouseLeave);
    map.on("click", HIGHLIGHT_FILL_ID, onClick);

    // ── public handle ──
    return {
        setSelectedRegion(region: string | null) {
            if (region) {
                // Show the selected region's highlight ON TOP of the base layers
                map.setFilter(HIGHLIGHT_FILL_ID, ["==", ["get", "region"], region]);
                map.setFilter(HIGHLIGHT_LINE_ID, ["==", ["get", "region"], region]);
                // All base regions stay visible (no filter change)
            } else {
                // Clear highlight
                map.setFilter(HIGHLIGHT_FILL_ID, ["==", ["get", "region"], ""]);
                map.setFilter(HIGHLIGHT_LINE_ID, ["==", ["get", "region"], ""]);
            }
        },

        remove() {
            map.off("mousemove", FILL_LAYER_ID, onMouseMove);
            map.off("mouseleave", FILL_LAYER_ID, onMouseLeave);
            map.off("click", FILL_LAYER_ID, onClick);
            map.off("mousemove", HIGHLIGHT_FILL_ID, onMouseMove);
            map.off("mouseleave", HIGHLIGHT_FILL_ID, onMouseLeave);
            map.off("click", HIGHLIGHT_FILL_ID, onClick);

            popup.remove();

            for (const id of [LABEL_LAYER_ID, HIGHLIGHT_FILL_ID, HIGHLIGHT_LINE_ID, FILL_LAYER_ID, LINE_LAYER_ID]) {
                if (map.getLayer(id)) map.removeLayer(id);
            }
            if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
            if (map.getSource(LABEL_SOURCE_ID)) map.removeSource(LABEL_SOURCE_ID);

            map.getCanvas().style.cursor = "";
        },
    };
}
