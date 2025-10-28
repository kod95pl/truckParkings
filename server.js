// server.js
import express from "express";
import path from "path";
import fs from "fs";
import morgan from "morgan";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();
app.use(morgan("tiny"));

const PORT = process.env.PORT || 3000;
const MAPTRIP_TOKEN = process.env.MAPTRIP_TOKEN || ""; // set in env / Render secret
const MAPTRIP_BASE = "https://api.maptrip.de/v1";

if (!MAPTRIP_TOKEN) {
  console.warn("Warning: MAPTRIP_TOKEN is empty. MapTrip endpoints will fail.");
}

// Serve static frontend
app.use(express.static(path.join(__dirname)));

// Simple health
app.get("/health", (req, res) => res.json({ ok: true }));

// Proxy helper
async function proxyFetch(url, res) {
  try {
    const r = await fetch(url, { headers: { "accept": "application/json", "Authorization": `Bearer ${MAPTRIP_TOKEN}` }});
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    console.error("proxyFetch error:", err);
    res.status(500).json({ error: "proxy error", details: String(err) });
  }
}

/*
  Endpoints:
  - GET /api/parking/:from/:to
  - GET /api/fuelstations/:fuel/:from/:to   (returns only requested fuelType)
  - GET /api/roadworks/points/:from/:to
  - GET /api/roadworks/lines/:from/:to
*/
app.get("/api/parking/:from/:to", (req, res) => {
  const url = `${MAPTRIP_BASE}/poi/parking/${encodeURIComponent(req.params.from)}/${encodeURIComponent(req.params.to)}`;
  return proxyFetch(url, res);
});

app.get("/api/fuelstations/:fuel/:from/:to", (req, res) => {
  const fuel = req.params.fuel || "Diesel";
  const url = `${MAPTRIP_BASE}/poi/fuelstations/${encodeURIComponent(fuel)}/${encodeURIComponent(req.params.from)}/${encodeURIComponent(req.params.to)}`;
  return proxyFetch(url, res);
});

app.get("/api/roadworks/points/:from/:to", (req, res) => {
  const url = `${MAPTRIP_BASE}/poi/roadworks/points/${encodeURIComponent(req.params.from)}/${encodeURIComponent(req.params.to)}`;
  return proxyFetch(url, res);
});

app.get("/api/roadworks/lines/:from/:to", (req, res) => {
  const url = `${MAPTRIP_BASE}/poi/roadworks/lines/${encodeURIComponent(req.params.from)}/${encodeURIComponent(req.params.to)}`;
  return proxyFetch(url, res);
});

// optional endpoint to serve cached JSON (from fetchParkings script)
app.get("/cache/parkings/:id", (req, res) => {
  const p = path.join(__dirname, "data", "parkings", `${req.params.id}.json`);
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.status(404).json({ error: "not found" });
});

app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
