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

export function MapSearch() {
    const map = useContext(MapContext)?.map;
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`)
                .then(r => r.json())
                .then(data => setResults(data))
                .catch(() => setResults([]));
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    const handleSelect = (result: NominatimResult) => {
        if (!map) return;
        map.flyTo({ center: [parseFloat(result.lon), parseFloat(result.lat)], zoom: 12 });
        setExpanded(false);
        setQuery(result.display_name.split(',')[0]);
    };

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
                    {results.length === 0 ?
                        <div className='search-empty'>No results found</div> :
                        results.map(r =>
                            <div key={r.place_id} className='search-result-row' onClick={() => handleSelect(r)}>
                                <div className='search-result-label'>{r.display_name.split(',')[0]}</div>
                                <div className='search-result-subtitle'>{r.display_name}</div>
                            </div>
                        )}
                </div>}
        </div>
    );
}
