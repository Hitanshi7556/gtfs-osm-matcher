import type { GeoJSONFeature, MapGeoJSONFeature } from 'maplibre-gl';
import { useContext, useMemo, useState } from 'preact/hooks';
import { MapContext, SelectionContext } from '../app';
import { datasetKeys } from './report';
import { parseUrlReportRegion, useHashRoute } from './routing';
import './map-search.css';

type SearchResult = {
    id: string;
    label: string;
    subtitle: string;
    lon: number;
    lat: number;
    datasetName?: string;
    feature?: MapGeoJSONFeature;
};

function parseCoordinates(query: string) {
    const parts = query.split(',').map(p => p.trim());
    if (parts.length !== 2) return;

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;

    return {
        id: `coord:${lat.toFixed(5)},${lon.toFixed(5)}`,
        label: `Coordinates ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        subtitle: 'Jump to coordinates',
        lat,
        lon,
    } as SearchResult;
}

function stringifyProperties(feature: GeoJSONFeature) {
    const props = feature.properties || {};
    const properties = Object.fromEntries(Object.entries(props).map(([k, v]) => {
        if (Array.isArray(v) || typeof v === 'object') {
            return [k, JSON.stringify(v)];
        }

        return [k, v];
    }));

    return {
        ...feature,
        properties
    } as MapGeoJSONFeature;
}

function scoreCandidate(values: string[], query: string) {
    const startsWith = values.some(v => v.startsWith(query));
    return startsWith ? 0 : 1;
}

export function MapSearch() {
    const map = useContext(MapContext)?.map;
    const { updateSelection } = useContext(SelectionContext);

    const reportRegion = useHashRoute(parseUrlReportRegion);

    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);

    const results = useMemo(() => {
        const trimmed = query.trim();
        if (!map || trimmed.length < 2) return [] as SearchResult[];

        const q = trimmed.toLowerCase();
        const out: SearchResult[] = [];

        const coordResult = parseCoordinates(trimmed);
        if (coordResult) {
            out.push(coordResult);
        }

        const added = new Set<string>();

        for (const datasetName of datasetKeys) {
            const sourceId = `stops-${datasetName}`;
            if (!map.getSource(sourceId)) continue;

            const features = map.querySourceFeatures(sourceId);
            for (const feature of features) {
                const properties = feature.properties || {};

                const stopName = String(properties.gtfsStopName || properties.name || '').trim();
                const stopId = String(properties.gtfsStopId || properties.id || '').trim();
                const stopCode = String(properties.gtfsStopCode || '').trim();

                const haystack = [stopName, stopId, stopCode]
                    .filter(Boolean)
                    .map(v => v.toLowerCase());

                if (!haystack.some(v => v.includes(q))) {
                    continue;
                }

                const [lon, lat] = (feature.geometry as any)?.coordinates || [];
                if (typeof lon !== 'number' || typeof lat !== 'number') {
                    continue;
                }

                const id = `${datasetName}:${stopId || stopName}:${lon.toFixed(5)}:${lat.toFixed(5)}`;
                if (added.has(id)) {
                    continue;
                }
                added.add(id);

                out.push({
                    id,
                    label: stopName || stopId || `${datasetName} stop`,
                    subtitle: [datasetName, stopId && `id ${stopId}`, stopCode && `code ${stopCode}`].filter(Boolean).join(' · '),
                    lon,
                    lat,
                    datasetName,
                    feature: stringifyProperties(feature),
                });
            }
        }

        return out
            .sort((a, b) => {
                const sa = scoreCandidate([a.label.toLowerCase(), a.subtitle.toLowerCase()], q);
                const sb = scoreCandidate([b.label.toLowerCase(), b.subtitle.toLowerCase()], q);
                return sa - sb;
            })
            .slice(0, 25);
    }, [map, query]);

    const handleSelect = (result: SearchResult) => {
        if (!map) return;

        map.flyTo({ center: [result.lon, result.lat], zoom: Math.max(map.getZoom(), 14) });

        if (result.feature && reportRegion && result.datasetName) {
            updateSelection({
                feature: result.feature,
                datasetName: result.datasetName,
                reportRegion,
            }, 'map-click');
        }

        setExpanded(false);
    };

    return (
        <div id={'map-search'}>
            <input
                value={query}
                onFocus={() => setExpanded(true)}
                onInput={(e) => {
                    setQuery((e.target as HTMLInputElement).value);
                    setExpanded(true);
                }}
                placeholder={'Search map / stop (or lat,lon)'}
            />
            {expanded && query.trim().length >= 2 &&
                <div className={'search-results'}>
                    {results.length === 0 ?
                        <div className={'search-empty'}>No matches in loaded map layers</div> :
                        results.map(r =>
                            <div key={r.id} className={'search-result-row'} onClick={() => handleSelect(r)}>
                                <div className={'search-result-label'}>{r.label}</div>
                                <div className={'search-result-subtitle'}>{r.subtitle}</div>
                            </div>
                        )}
                </div>}
        </div>
    );
}
