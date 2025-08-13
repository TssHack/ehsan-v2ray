import express from "express";
import fetch from "node-fetch"; // اگر Node 18+ داری، میتونی حذفش کنی
import dns from "dns/promises";

const app = express();
const UPSTREAM_URL = "https://ehsan.fazlinejadeh.workers.dev/arista?limit=12";
const CHANGE_PROFILE_TITLE = true;

// فونت‌های یونیکد برای EHSAN
const FONT_VARIANTS = {
  bold: "𝐄𝐇𝐒𝐀𝐍",
  italic: "𝐸𝐻𝑆𝐴𝑁", 
  script: "𝒪𝐻𝒮𝒜𝒩", // O به جای E چون E script نداره
  fraktur: "𝔈𝔥𝔬𝔞𝔫", // تقریبی
  monospace: "𝙀𝙃𝙎𝘼𝙉",
  double: "𝔼ℍ𝕊𝔸ℕ"
};

// انتخاب تصادفی فونت
function getRandomFont() {
  const fonts = Object.values(FONT_VARIANTS);
  return fonts[Math.floor(Math.random() * fonts.length)];
}

// گرفتن پرچم کشور از طریق IP
async function getCountryFlag(host) {
  try {
    // اگر host آی‌پی نیست، DNS lookup کن
    let ip;
    if (/^[0-9.]+$/.test(host)) {
      ip = host;
    } else {
      const result = await dns.lookup(host);
      ip = result.address;
    }

    const resp = await fetch(`https://ipwho.is/${ip}`, {
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FlagLookup/1.0)'
      }
    });
    
    if (!resp.ok) {
      console.warn(`Flag lookup failed for ${ip}: ${resp.status}`);
      return "";
    }
    
    const data = await resp.json();
    
    if (data.success && data.flag?.emoji) {
      return data.flag.emoji;
    } else {
      console.warn(`No flag data for ${ip}`);
      return "";
    }
  } catch (error) {
    console.warn(`Error getting flag for ${host}:`, error.message);
    return "";
  }
}

app.get("/arista", async (req, res) => {
  console.log("Received request to /arista");
  
  try {
    console.log("Fetching from upstream...");
    const r = await fetch(UPSTREAM_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "text/plain,*/*",
        "accept-language": "en-US,en;q=0.9",
      },
      timeout: 10000, // 10 second timeout
    });

    if (!r.ok) {
      console.error(`Upstream returned status ${r.status}`);
      const txt = await r.text().catch(() => "");
      return res
        .status(r.status)
        .type("text/plain; charset=utf-8")
        .send(txt || `Upstream error: ${r.status}`);
    }

    let text = await r.text();
    console.log(`Received ${text.length} characters from upstream`);
    
    // نرمال کردن line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // تغییر profile-title
    if (CHANGE_PROFILE_TITLE) {
      const styledEhsan = getRandomFont();
      const b64Ehsan = Buffer.from(styledEhsan, "utf8").toString("base64");
      const oldText = text;
      text = text.replace(
        /(\/\/profile-title:\s*base64:)[A-Za-z0-9+/=]+/,
        `$1${b64Ehsan}`
      );
      
      if (text !== oldText) {
        console.log("Profile title updated with styled font");
      } else {
        console.log("No profile-title found to update");
      }
    }

    // پیدا کردن همه لینک‌های VLESS
    const vlessRegex = /(vless:\/\/[^#\n\r]+)(?:#[^\n\r]*)?/g;
    const matches = Array.from(text.matchAll(vlessRegex));
    
    console.log(`Found ${matches.length} VLESS links`);

    if (matches.length === 0) {
      console.log("No VLESS links found, returning original text");
      return res
        .setHeader("content-type", "text/plain; charset=utf-8")
        .send(text);
    }

    // پردازش همزمان همه لینک‌ها
    const processedLinks = await Promise.all(
      matches.map(async (match, index) => {
        const baseLink = match[1];
        const hostMatch = baseLink.match(/@([^:]+):\d+/);
        
        if (!hostMatch) {
          console.warn(`No host found in link ${index + 1}`);
          const styledEhsan = getRandomFont();
          return `${baseLink}#${styledEhsan}`;
        }

        const host = hostMatch[1];
        console.log(`Getting flag for host: ${host}`);
        
        const flag = await getCountryFlag(host);
        const styledEhsan = getRandomFont();
        
        if (flag) {
          return `${baseLink}#${styledEhsan} ${flag}`;
        } else {
          return `${baseLink}#${styledEhsan}`;
        }
      })
    );

    // جایگزینی لینک‌ها
    let linkIndex = 0;
    text = text.replace(vlessRegex, () => {
      return processedLinks[linkIndex++];
    });

    console.log("All links processed successfully");

    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
    res.send(text);
    
  } catch (err) {
    console.error("Server error:", err);
    res
      .status(500)
      .type("text/plain; charset=utf-8")
      .send(`Server error: ${err.message}`);
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.type("text/plain; charset=utf-8").send("VLESS Proxy Server is running!\nUse /arista endpoint for VLESS configs.");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
  console.log(`📡 VLESS endpoint: http://localhost:${PORT}/arista`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
