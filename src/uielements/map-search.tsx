import { useContext, useEffect, useState } from 'preact/hooks';
import { MapContext } from '../app';
import './map-search.css';

type NominatimResult = {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
};

type StopResult = {
    id: string;
    name: string;
    code?: string;
    dataset: string;
    lon: number;
    lat: number;
};

/** Search loaded map sources for stops matching the query by name, id or code. */
function searchLoadedStops(map: maplibregl.Map | undefined, query: string): StopResult[] {
    if (!map || query.trim().length < 2) return [];

    const q = query.toLowerCase();
    const seen = new Set<string>();
    const results: StopResult[] = [];

    // Dataset source IDs follow the pattern "stops-{name}"
    const style = map.getStyle();
    if (!style?.sources) return [];

    for (const sourceId of Object.keys(style.sources)) {
        if (!sourceId.startsWith('stops-')) continue;
        const dataset = sourceId.replace('stops-', '');

        let features: maplibregl.MapGeoJSONFeature[];
        try {
            features = map.querySourceFeatures(sourceId);
        } catch { continue; }

        for (const f of features) {
            const props = f.properties;
            if (!props) continue;

            const stopName: string = props.gtfsStopName || '';
            const stopId: string = props.gtfsStopId || '';
            const stopCode: string = props.gtfsStopCode || '';

            const matches =
                stopName.toLowerCase().includes(q) ||
                stopId.toLowerCase().includes(q) ||
                stopCode.toLowerCase().includes(q);

            if (!matches) continue;

            // Deduplicate by stop id
            const key = `${stopId}-${dataset}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const coords = (f.geometry as any)?.coordinates;
            if (!coords) continue;

            results.push({
                id: stopId,
                name: stopName,
                code: stopCode || undefined,
                dataset,
                lon: coords[0],
                lat: coords[1],
            });

            if (results.length >= 15) return results;
        }
    }

    return results;
}

export function MapSearch() {
    const mapCtx = useContext(MapContext);
    const map = mapCtx?.map;
    const [query, setQuery] = useState('');
    const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
    const [stopResults, setStopResults] = useState<StopResult[]>([]);
    const [expanded, setExpanded] = useState(false);

    // Search Nominatim for places
    useEffect(() => {
        if (query.trim().length < 2) {
            setNominatimResults([]);
            return;
        }

        const timeout = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`)
                .then(r => r.json())
                .then(data => setNominatimResults(data))
                .catch(() => setNominatimResults([]));
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    // Search loaded stops on map
    useEffect(() => {
        if (query.trim().length < 2) {
            setStopResults([]);
            return;
        }

        // Small delay to batch keystrokes
        const timeout = setTimeout(() => {
            setStopResults(searchLoadedStops(map, query));
        }, 150);

        return () => clearTimeout(timeout);
    }, [query, map]);

    const handleSelectPlace = (result: NominatimResult) => {
        if (!map) return;
        map.flyTo({ center: [parseFloat(result.lon), parseFloat(result.lat)], zoom: 12 });
        setExpanded(false);
        setQuery(result.display_name.split(',')[0]);
    };

    const handleSelectStop = (stop: StopResult) => {
        if (!map) return;
        map.flyTo({ center: [stop.lon, stop.lat], zoom: 18, duration: 1000 });
        setExpanded(false);
        setQuery(stop.name || stop.id);
    };

    const hasStops = stopResults.length > 0;
    const hasPlaces = nominatimResults.length > 0;
    const hasResults = hasStops || hasPlaces;

    return (
        <div id='map-search'>
            <input
                value={query}
                onFocus={() => setExpanded(true)}
                onInput={(e) => {
                    setQuery((e.target as HTMLInputElement).value);
                    setExpanded(true);
                }}
                placeholder='Search map / stop (or lat,lon)'
            />
            {expanded && query.trim().length >= 2 &&
                <div className='search-results'>
                    {!hasResults &&
                        <div className='search-empty'>No results found</div>
                    }

                    {hasStops && <>
                        <div className='search-section-header'>🚏 Stops</div>
                        {stopResults.map(s =>
                            <div key={`${s.id}-${s.dataset}`} className='search-result-row' onClick={() => handleSelectStop(s)}>
                                <div className='search-result-label'>
                                    {s.name || s.id}
                                    {s.code && <span className='search-stop-code'> #{s.code}</span>}
                                </div>
                                <div className='search-result-subtitle'>
                                    ID: {s.id} · {s.dataset}
                                </div>
                            </div>
                        )}
                    </>}

                    {hasPlaces && <>
                        <div className='search-section-header'>📍 Places</div>
                        {nominatimResults.map(r =>
                            <div key={r.place_id} className='search-result-row' onClick={() => handleSelectPlace(r)}>
                                <div className='search-result-label'>{r.display_name.split(',')[0]}</div>
                                <div className='search-result-subtitle'>{r.display_name}</div>
                            </div>
                        )}
                    </>}
                </div>}
        </div>
    );
}
