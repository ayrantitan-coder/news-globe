import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------
// FIX PATH (wichtig für Render)
// ----------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------
// STATIC FRONTEND SERVING
// ----------------------------------
app.use(express.static(__dirname));

// ----------------------------------
// RSS PROXY
// ----------------------------------
app.get("/rss", async (req, res) => {
  const url = req.query.url;

  try {
    const response = await fetch(url);
    const text = await response.text();

    res.set("Access-Control-Allow-Origin", "*");
    res.send(text);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching RSS");
  }
});

// ----------------------------------
// ROOT ROUTE (WICHTIG!)
// ----------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ----------------------------------
// START SERVER
// ----------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});