// fetchParkings.js
import fs from "fs/promises";
import path from "path";

const MAPTRIP_BASE = "https://api.maptrip.de/v1";
const TOKEN = process.env.MAPTRIP_TOKEN;
if (!TOKEN) {
  console.error("MAPTRIP_TOKEN missing in environment");
  process.exit(1);
}

function MT_HEADERS() {
  return { "accept": "application/json", "Authorization": `Bearer ${TOKEN}` };
}

// helper to fetch and parse json
async function fetchJson(url) {
  const res = await fetch(url, { headers: MT_HEADERS() });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

// ensure directories
async function ensureDirs() {
  await fs.mkdir(path.join("data","parkings"), { recursive: true });
  await fs.mkdir(path.join("data","fuel"), { recursive: true });
}

function bboxForWorldTiling() {
  // Example: you can implement tiling to iterate over world - here we just use a few boxes
  // For production, generate many bounding boxes that cover Europe/world at your chosen zoom.
  return [
    { name: "europe-1", from: "34.0,-10.0", to: "72.0,40.0" } // wide area - adjust to smaller tiles for reliability
  ];
}

async function saveFeature(dir, id, feature) {
  const file = path.join("data", dir, `${id}.json`);
  await fs.writeFile(file, JSON.stringify(feature, null, 2), "utf8");
}

async function loadParkings() {
  await ensureDirs();
  const tiles = bboxForWorldTiling();
  for (const t of tiles) {
    const url = `${MAPTRIP_BASE}/poi/parking/${encodeURIComponent(t.from)}/${encodeURIComponent(t.to)}`;
    console.log("Fetching", url);
    try {
      const gc = await fetchJson(url);
      const features = gc.features || [];
      console.log("Got", features.length, "parkings for", t.name);
      for (const f of features) {
        const id = (f.properties && f.properties.id) || `${f.geometry.coordinates[1]}_${f.geometry.coordinates[0]}`;
        await saveFeature("parkings", id, f);
      }
    } catch (err) {
      console.error("Error fetching parkings for", t.name, err.message);
    }
  }
}

async function loadFuel(fuelType="Diesel") {
  await ensureDirs();
  const tiles = bboxForWorldTiling();
  for (const t of tiles) {
    const url = `${MAPTRIP_BASE}/poi/fuelstations/${encodeURIComponent(fuelType)}/${encodeURIComponent(t.from)}/${encodeURIComponent(t.to)}`;
    console.log("Fetching", url);
    try {
      const gc = await fetchJson(url);
      const features = gc.features || [];
      console.log("Got", features.length, "fuel stations for", t.name);
      for (const f of features) {
        const id = (f.properties && f.properties.id) || `${f.geometry.coordinates[1]}_${f.geometry.coordinates[0]}`;
        await saveFeature("fuel", id, f);
      }
    } catch (err) {
      console.error("Error fetching fuel for", t.name, err.message);
    }
  }
}

(async ()=>{
  await loadParkings();
  await loadFuel("Diesel");
  console.log("Done.");
})();
