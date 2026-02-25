import { useEffect, useState } from "preact/hooks";
import { OSM_NOTES } from "../../services/OSMNotes";
import type { OSMNoteFeature } from "../../services/OSMNotes.types";
import "./osm-notes.css";

type NearbyNotesProps = {
  lon: number;
  lat: number;
};

export function NearbyNotes({ lon, lat }: NearbyNotesProps) {
  const [notes, setNotes] = useState<OSMNoteFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lon || !lat) return;

    setLoading(true);
    setError(null);

    OSM_NOTES.fetchNotesNearby(lon, lat)
      .then(setNotes)
      .catch(() => setError("Failed to load OSM notes"))
      .finally(() => setLoading(false));
  }, [lon, lat]);

  if (loading) return <div>Loading nearby notes...</div>;
  if (error) return <div>{error}</div>;
  if (notes.length === 0) return <div className="osm-notes"><i>No nearby OSM notes</i></div>;

  return (
    <div className="osm-notes">
      <h4>Nearby OSM Notes ({notes.length})</h4>
      {notes.map(note => {
        const p = note.properties;
        const lastComment = p.comments?.[p.comments.length - 1];
        const osmUrl = `https://www.openstreetmap.org/note/${p.id}`;

        return (
          <div key={p.id} className="note-item">
            <span className={`note-status-${p.status}`}>
              ● {p.status}
            </span>
            {" · "}
            <span>{new Date(p.date_created).toLocaleDateString()}</span>
            {lastComment?.text && (
              <div className="note-comment">"{lastComment.text}"</div>
            )}
            <div>
              <a className="note-link" href={osmUrl} target="_blank">
                View note #{p.id} on OSM
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
