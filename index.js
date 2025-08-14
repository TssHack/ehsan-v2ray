// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ----------- تنظیمات -----------
const flagEmojis = ["🇩🇪", "🇳🇱", "🇬🇧", "🇺🇸", "🇹🇷", "🇦🇪", "🇯🇵"];
const specialName = "Telegram; @abj0o";
const ORIGINAL_URL = "https://k-k52ofvtqgahidu8f-h97e91surzlxu.fazlinejadeh.workers.dev/sub/normal/Ej9*yU%3B09Ug%2Cu%264B";

// ----------- فانکشن برای /ehsan -----------
async function getMergedProxies() {
  const urls = [
    "https://dev1.irdevs.sbs/",
    "https://nextjs.irdevs.sbs/"
  ];

  const results = await Promise.all(urls.map(url => fetch(url).then(r => r.text())));
  let merged = results.join("\n").trim();
  let lines = merged.split("\n").filter(l => l.trim() !== "");

  const randomIndex = Math.floor(Math.random() * lines.length);

  lines = lines.map((line, index) => {
    const randomFlag = flagEmojis[Math.floor(Math.random() * flagEmojis.length)];
    const fancyName = `𝙀𝙃𝙎𝘼𝙉 ${randomFlag}`;

    if (line.includes("#")) {
      line = line.replace(/#.*/, "");
    }

    if (index === randomIndex) {
      return `${line}#${specialName}`;
    } else {
      return `${line}#${fancyName}`;
    }
  });

  return lines.join("\n");
}

// ----------- مسیر / -----------
app.get("/", async (req, res) => {
  try {
    const response = await fetch(ORIGINAL_URL);
    const base64Data = await response.text();

    const decoded = Buffer.from(base64Data.trim(), "base64").toString("utf8");

    const modified = decoded
      .split("\n")
      .map(line => {
        if (!line.trim()) return "";
        const [config] = line.split("#");
        return config + "#𝙀𝙃𝙎𝘼𝙉";
      })
      .join("\n");

    const encoded = Buffer.from(modified, "utf8").toString("base64");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(encoded);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing subscription");
  }
});

// ----------- مسیر /ehsan -----------
app.get("/ehsan", async (req, res) => {
  try {
    const output = await getMergedProxies();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(output);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching or processing data");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

