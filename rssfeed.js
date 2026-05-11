import { countries } from "./countries.js";

// ---------------------------------------------
// RSS Feed Loader + Anzeige (PROXY + XML)
// ---------------------------------------------
export async function loadNews() {

  const feeds = [
    // --- Guardian ---
    { url: "https://www.theguardian.com/world/africa/rss", defaultCountry: null },
    { url: "https://www.theguardian.com/world/asia/rss", defaultCountry: null },
    { url: "https://www.theguardian.com/australia-news/rss", defaultCountry: null },
    { url: "https://www.theguardian.com/europe/rss", defaultCountry: null },
    { url: "https://www.theguardian.com/world/americas/rss", defaultCountry: null },

    // --- DW ---
    { url: "https://rss.dw.com/xml/rss-en-all", defaultCountry: null },
    { url: "https://rss.dw.com/xml/rss-en-top", defaultCountry: null },

    // --- NYT ---
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", defaultCountry: null },

    // --- USA FIX ---
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml", defaultCountry: "USA" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", defaultCountry: "USA" },

    // --- India ---
    { url: "https://www.thehindu.com/news/international/feeder/default.rss", defaultCountry: null },
    { url: "https://www.thehindu.com/news/national/feeder/default.rss", defaultCountry: "India" },

    // --- Pakistan ---
    { url: "https://www.dawn.com/feeds/home", defaultCountry: "Pakistan" },

    // --- Asia ---
    { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", defaultCountry: null },
    { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511", defaultCountry: null },
    { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6311", defaultCountry: null },
    { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=679471", defaultCountry: null },

    // --- Africa ---
    { url: "https://www.africanews.com/feed/rss", defaultCountry: null },
    { url: "https://allafrica.com/tools/headlines/rdf/africa/headlines.rdf", defaultCountry: null },

    // --- Extras ---
    { url: "https://continent.substack.com/feed", defaultCountry: null },
    { url: "https://www.ajplus.net/stories?format=rss", defaultCountry: null },
    { url: "https://japantoday.com/category/world/feed", defaultCountry: null },

    // --- SCMP ---
    { url: "https://www.scmp.com/rss/91/feed/", defaultCountry: null },
    { url: "https://www.scmp.com/rss/3/feed/", defaultCountry: null }
  ];

  const newsByCountry = {};
  const articleSources = {};
  const seenLinks = new Set();

  for (let feed of feeds) {
    try {

      // ---------------------------------------------
      // 🔥 PROXY CALL (DEIN NODE SERVER)
      // ---------------------------------------------
      const proxyUrl = `http://localhost:3000/rss?url=${encodeURIComponent(feed.url)}`;

      const res = await fetch(proxyUrl);
      const xmlText = await res.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      const items = [...xml.querySelectorAll("item")];
      if (!items.length) continue;

      articleSources[feed.url] = 0;

      // ---------------------------------------------
      // ITEMS LOOP
      // ---------------------------------------------
      items.forEach(item => {

        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        const description = item.querySelector("description")?.textContent || "";

        if (!link || seenLinks.has(link)) return;

        seenLinks.add(link);
        articleSources[feed.url]++;

        const text = (
          title + " " + description + " " + link
        ).toLowerCase();

        let assigned = false;

        // ---------------------------------------------
        // 1. DEFAULT COUNTRY (WICHTIG: NYT USA FIX)
        // ---------------------------------------------
        if (feed.defaultCountry) {

          if (!newsByCountry[feed.defaultCountry]) {
            newsByCountry[feed.defaultCountry] = [];
          }

          newsByCountry[feed.defaultCountry].push({
            title,
            link,
            source: new URL(feed.url).hostname
          });

          assigned = true;
        }

        // ---------------------------------------------
        // 2. COUNTRY KEYWORDS
        // ---------------------------------------------
        if (!assigned) {
          for (let country of countries) {

            const nameMatch = text.includes(country.name.toLowerCase());

            const keywordMatch =
              country.keywords?.some(k =>
                text.includes(k.toLowerCase())
              );

            if (nameMatch || keywordMatch) {

              if (!newsByCountry[country.name]) {
                newsByCountry[country.name] = [];
              }

              newsByCountry[country.name].push({
                title,
                link,
                source: new URL(feed.url).hostname
              });

              assigned = true;
              break;
            }
          }
        }
      });

    } catch (e) {
      console.warn("RSS error:", feed.url, e);
    }
  }

  // ---------------------------------------------
  // UI COUNTER
  // ---------------------------------------------
  displayNewsCounter(articleSources);

  return newsByCountry;
}

// ---------------------------------------------
// COUNTER UI
// ---------------------------------------------
function displayNewsCounter(articleSources) {

  let el = document.getElementById("news-counter");

  if (!el) {
    el = document.createElement("div");
    el.id = "news-counter";
    el.style.position = "fixed";
    el.style.top = "10px";
    el.style.left = "10px";
    el.style.background = "rgba(0,0,0,0.6)";
    el.style.color = "#fff";
    el.style.padding = "6px 10px";
    el.style.fontFamily = "sans-serif";
    el.style.fontSize = "13px";
    el.style.borderRadius = "6px";
    el.style.zIndex = "999";
    document.body.appendChild(el);
  }

  const total = Object.values(articleSources).reduce((a, b) => a + b, 0);
  el.textContent = `News loaded: ${total}`;
}