import type { OSMNoteFeature, OSMNotesGeoJSON } from "./OSMNotes.types";

const NOTES_ENDPOINT = "https://api.openstreetmap.org/api/0.6/notes.json";

class OSMNotes {
    private cache = new Map<string, OSMNoteFeature[]>();
    
    dataUpdated: () => void = () => {};

    async fetchNotesNearby(lon: number, lat: number, radiusDeg = 0.005): Promise<OSMNoteFeature[]> {
        const west = lon - radiusDeg;
        const east = lon + radiusDeg;
        const south = lat - radiusDeg;
        const north = lat + radiusDeg;

        const cacheKey = `${west},${south},${east},${north}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const params = new URLSearchParams({
            bbox: `${west},${south},${east},${north}`,
            limit: "100",
            closed: "0"
        });

        const response = await fetch(`${NOTES_ENDPOINT}?${params}`);
        if (!response.ok) throw new Error(`Notes API error ${response.status}`);

        const data: OSMNotesGeoJSON = await response.json();
        const notes = data.features || [];

        this.cache.set(cacheKey, notes);
        this.dataUpdated();

        return notes;
    }
}

export const OSM_NOTES = new OSMNotes();
