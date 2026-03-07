#!/usr/bin/env node

const randomInRange = (min, max) => Math.random() * (max - min) + min;

const toWorld = (lat, lng, zoom) => {
  const scale = 256 * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const clusterSpots = (spots, zoom) => {
  const gridSize = zoom >= 11 ? 42 : zoom >= 9 ? 54 : zoom >= 8 ? 64 : 72;
  const buckets = new Map();

  for (const spot of spots) {
    const world = toWorld(spot.lat, spot.lng, zoom);
    const key = `${Math.floor(world.x / gridSize)}:${Math.floor(world.y / gridSize)}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { lat: spot.lat, lng: spot.lng, spotIds: [spot.id] });
      continue;
    }
    const nextCount = existing.spotIds.length + 1;
    existing.lat = (existing.lat * existing.spotIds.length + spot.lat) / nextCount;
    existing.lng = (existing.lng * existing.spotIds.length + spot.lng) / nextCount;
    existing.spotIds.push(spot.id);
  }

  return [...buckets.values()];
};

const generateSpots = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    lat: randomInRange(4.5, 19),
    lng: randomInRange(116, 127),
  }));

const sampleSize = Number(process.env.SPOT_COUNT || 5000);
const zooms = [6.5, 8, 10, 12];
const spots = generateSpots(sampleSize);

console.log(`[perf] generated ${sampleSize} spots`);
for (const zoom of zooms) {
  const start = performance.now();
  const clusters = clusterSpots(spots, zoom);
  const durationMs = performance.now() - start;
  console.log(`[perf] zoom=${zoom} clusters=${clusters.length} time=${durationMs.toFixed(2)}ms`);
}
