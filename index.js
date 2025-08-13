import express from "express";
import fetch from "node-fetch";
import dns from "dns/promises";

const app = express();
const UPSTREAM_URL = "https://ehsan.fazlinejadeh.workers.dev/EHSAN?limit=12";
const CHANGE_PROFILE_TITLE = true;

// فقط یک فونت ثابت
const STYLED_NAME = "𝙀𝙃𝙎𝘼𝙉";

// بهبود Cache برای پرچم‌ها
const flagCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقیقه

// گرفتن پرچم کشور با کش بهتر
async function getCountryFlag(host) {
  // چک کردن کش
  const cached = flagCache.get(host);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.flag;
  }

  try {
    let ip;
    
    // بهتر شدن تشخیص IP
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      ip = host;
    } else {
      const result = await dns.lookup(host, { family: 4 });
      ip = result.address;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const resp = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FlagLookup/1.0)'
      }
    });
    
    clearTimeout(timeoutId);

    if (!resp.ok) {
      console.warn(`Flag lookup failed for ${ip}: ${resp.status}`);
      flagCache.set(host, { flag: "", timestamp: Date.now() });
      return "";
    }
    
    const data = await resp.json();
    const countryCode = data.country_code;
    
    if (countryCode) {
      // تبدیل کد کشور به emoji پرچم
      const flag = countryCode
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
      
      flagCache.set(host, { flag, timestamp: Date.now() });
      return flag;
    } else {
      flagCache.set(host, { flag: "", timestamp: Date.now() });
      return "";
    }
  } catch (error) {
    console.warn(`Error getting flag for ${host}:`, error.message);
    flagCache.set(host, { flag: "", timestamp: Date.now() });
    return "";
  }
}

// پاک کردن کش قدیمی
setInterval(() => {
  const now = Date.now();
  for (const [host, data] of flagCache.entries()) {
    if (now - data.timestamp > CACHE_TTL) {
      flagCache.delete(host);
    }
  }
}, CACHE_TTL);

app.get("/ehsan", async (req, res) => {
  console.log("📡 Processing VLESS request...");
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(UPSTREAM_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache"
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ Upstream error: ${response.status}`);
      const errorText = await response.text().catch(() => "");
      return res
        .status(response.status)
        .type("text/plain; charset=utf-8")
        .send(errorText || `Upstream error: ${response.status}`);
    }

    let text = await response.text();
    console.log(`📦 Received ${text.length} characters`);
    
    // نرمال‌سازی خطوط
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // تغییر profile-title
    if (CHANGE_PROFILE_TITLE) {
      const encodedName = Buffer.from(STYLED_NAME, "utf8").toString("base64");
      const originalText = text;
      
      text = text.replace(
        /(\/\/profile-title:\s*base64:)[A-Za-z0-9+/=]+/g,
        `$1${encodedName}`
      );
      
      if (text !== originalText) {
        console.log("✨ Profile title updated");
      }
    }

    // بهبود regex برای VLESS
    const vlessRegex = /(vless:\/\/[a-f0-9-]+@[^#\n\r]+)(?:#[^\n\r]*)?/gi;
    const matches = [...text.matchAll(vlessRegex)];
    
    console.log(`🔍 Found ${matches.length} VLESS configs`);

    if (matches.length === 0) {
      console.log("⚠️ No VLESS configs found");
      return res
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        .send(text);
    }

    // پردازش موثرتر لینک‌ها
    const processedConfigs = await Promise.allSettled(
      matches.map(async (match, index) => {
        const baseConfig = match[1];
        const hostMatch = baseConfig.match(/@([^:]+):(\d+)/);
        
        if (!hostMatch) {
          console.warn(`⚠️ Invalid config format at index ${index + 1}`);
          return `${baseConfig}#${STYLED_NAME}`;
        }

        const [, host] = hostMatch;
        
        try {
          const flag = await getCountryFlag(host);
          return flag ? `${baseConfig}#${STYLED_NAME} ${flag}` : `${baseConfig}#${STYLED_NAME}`;
        } catch (error) {
          console.warn(`⚠️ Flag lookup failed for ${host}:`, error.message);
          return `${baseConfig}#${STYLED_NAME}`;
        }
      })
    );

    // جایگزینی با نتایج
    let configIndex = 0;
    text = text.replace(vlessRegex, () => {
      const result = processedConfigs[configIndex++];
      return result.status === 'fulfilled' ? result.value : matches[configIndex - 1][1] + `#${STYLED_NAME}`;
    });

    console.log("✅ All configs processed successfully");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(text);
    
  } catch (error) {
    console.error("💥 Server error:", error);
    
    if (error.name === 'AbortError') {
      return res
        .status(408)
        .type("text/plain; charset=utf-8")
        .send("Request timeout");
    }
    
    res
      .status(500)
      .type("text/plain; charset=utf-8")
      .send(`Server error: ${error.message}`);
  }
});

// Health check با اطلاعات بیشتر
app.get("/health", (req, res) => {
  res.json({ 
    status: "✅ Online",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cacheSize: flagCache.size
  });
});

// صفحه اصلی
app.get("/", (req, res) => {
  res.type("text/plain; charset=utf-8").send(
    `🚀 VLESS Proxy Server - ONLINE\n\n` +
    `📡 Endpoint: /ehsan\n` +
    `💚 Health: /health\n` +
    `⏰ Server Time: ${new Date().toISOString()}\n\n` +
    `Made with 💥 by EHSAN`
  );
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 EHSAN VLESS Proxy Server`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`🎯 VLESS Endpoint: http://localhost:${PORT}/ehsan`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed successfully");
    flagCache.clear();
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});
