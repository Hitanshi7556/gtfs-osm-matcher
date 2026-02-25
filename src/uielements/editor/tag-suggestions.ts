export const COMMON_TAG_KEYS = [
    'public_transport',
    'highway',
    'railway',
    'bus',
    'tram',
    'subway',
    'ferry',
    'name',
    'ref',
    'operator',
    'network',
    'gtfs:id',
    'gtfs:stop_id',
    'gtfs:stop_code',
    'ref:IFOPT',
];

export function suggestKeys(prefix: string): string[] {
    if (!prefix || prefix.length < 1) return [];
    const q = prefix.toLowerCase();
    return COMMON_TAG_KEYS.filter(k => k.toLowerCase().includes(q)).slice(0, 6);
}
