// CARTO basemaps now answer every request without an API key with an "API KEY REQUIRED" tile,
// so the dark style uses Esri's Dark Gray Canvas (base + labels), served without a key.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

export const DARK_BASE_URL = `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
export const DARK_LABELS_URL = `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
export const SATELLITE_URL = `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;

export const ESRI_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

// Dark Gray Canvas has no tiles past zoom 16; Leaflet upscales them for closer zoom levels.
export const DARK_MAX_NATIVE_ZOOM = 16;
