import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});