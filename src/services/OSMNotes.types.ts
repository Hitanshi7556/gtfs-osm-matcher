export type OSMNoteComment = {
  date: string;
  uid?: number;
  user?: string;
  action: "opened" | "closed" | "commented" | string;
  text?: string;
};

export type OSMNoteProperties = {
  id: number;
  url: string;
  date_created: string;
  status: "open" | "closed";
  comments: OSMNoteComment[];
};

export type OSMNoteFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: OSMNoteProperties;
};

export type OSMNotesGeoJSON = {
  type: "FeatureCollection";
  features: OSMNoteFeature[];
};
