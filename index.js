import express from "express";
import fetch from "node-fetch"; // اگر Node 18+ داری، میتونی حذفش کنی
import dns from "dns/promises";

const app = express();
const UPSTREAM_URL = "https://ehsan.fazlinejadeh.workers.dev/arista?limit=12";
const CHANGE_PROFILE_TITLE = true;

// گرفتن پرچم کشور از طریق IP
async function getCountryFlag(host) {
  try {
    // اگر host آی‌پی نیست، DNS lookup کن
    const ip = /^[0-9.]+$/.test(host)
      ? host
      : (await dns.lookup(host)).address;

    const resp = await fetch(`https://ipwho.is/${ip}`);
    const data = await resp.json();

    if (data.success) {
      return data.flag?.emoji || "";
    }
  } catch (e) {
    return "";
  }
  return "";
}

app.get("/arista", async (req, res) => {
  try {
    const r = await fetch(UPSTREAM_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        accept: "text/plain,*/*",
      },
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      res
        .status(r.status)
        .type("text/plain; charset=utf-8")
        .send(txt || `Upstream error: ${r.status}`);
      return;
    }

    let text = await r.text();
    text = text.replace(/\r\n/g, "\n");

    // تغییر profile-title
    if (CHANGE_PROFILE_TITLE) {
      const b64Ehsan = Buffer.from("EHSAN", "utf8").toString("base64");
      text = text.replace(
        /(\/\/profile-title:\s*base64:)[A-Za-z0-9+/=]+/,
        (_, p1) => `${p1}${b64Ehsan}`
      );
    }

    // تغییر همه تگ‌های #... به #EHSAN (بدون پرچم فعلاً)
    text = text.replace(/#.*(?=\n|$)/g, "#EHSAN");

    // اضافه کردن پرچم
    const vlessRegex = /(vless:\/\/[^#\n]+)#EHSAN/g;
    const matches = Array.from(text.matchAll(vlessRegex));

    const replacedLinks = await Promise.all(
      matches.map(async (match) => {
        const fullLink = match[0];
        const baseLink = match[1];
        const hostMatch = baseLink.match(/@([^:]+):\d+/);
        if (!hostMatch) return fullLink;

        const flag = await getCountryFlag(hostMatch[1]);
        return `${baseLink}#EHSAN ${flag}`;
      })
    );

    let i = 0;
    text = text.replace(vlessRegex, () => replacedLinks[i++]);

    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (err) {
    res
      .status(500)
      .type("text/plain; charset=utf-8")
      .send(`Server error: ${err}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}/arista`);
});
import express from "express";
import fetch from "node-fetch"; // اگر Node 18+ داری، میتونی حذفش کنی
import dns from "dns/promises";

const app = express();
const UPSTREAM_URL = "https://ehsan.fazlinejadeh.workers.dev/arista?limit=12";
const CHANGE_PROFILE_TITLE = true;

// گرفتن پرچم کشور از طریق IP
async function getCountryFlag(host) {
  try {
    // اگر host آی‌پی نیست، DNS lookup کن
    const ip = /^[0-9.]+$/.test(host)
      ? host
      : (await dns.lookup(host)).address;

    const resp = await fetch(`https://ipwho.is/${ip}`);
    const data = await resp.json();

    if (data.success) {
      return data.flag?.emoji || "";
    }
  } catch (e) {
    return "";
  }
  return "";
}

app.get("/arista", async (req, res) => {
  try {
    const r = await fetch(UPSTREAM_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        accept: "text/plain,*/*",
      },
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      res
        .status(r.status)
        .type("text/plain; charset=utf-8")
        .send(txt || `Upstream error: ${r.status}`);
      return;
    }

    let text = await r.text();
    text = text.replace(/\r\n/g, "\n");

    // تغییر profile-title
    if (CHANGE_PROFILE_TITLE) {
      const b64Ehsan = Buffer.from("EHSAN", "utf8").toString("base64");
      text = text.replace(
        /(\/\/profile-title:\s*base64:)[A-Za-z0-9+/=]+/,
        (_, p1) => `${p1}${b64Ehsan}`
      );
    }

    // تغییر همه تگ‌های #... به #EHSAN (بدون پرچم فعلاً)
    text = text.replace(/#.*(?=\n|$)/g, "#EHSAN");

    // اضافه کردن پرچم
    const vlessRegex = /(vless:\/\/[^#\n]+)#EHSAN/g;
    const matches = Array.from(text.matchAll(vlessRegex));

    const replacedLinks = await Promise.all(
      matches.map(async (match) => {
        const fullLink = match[0];
        const baseLink = match[1];
        const hostMatch = baseLink.match(/@([^:]+):\d+/);
        if (!hostMatch) return fullLink;

        const flag = await getCountryFlag(hostMatch[1]);
        return `${baseLink}#EHSAN ${flag}`;
      })
    );

    let i = 0;
    text = text.replace(vlessRegex, () => replacedLinks[i++]);

    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (err) {
    res
      .status(500)
      .type("text/plain; charset=utf-8")
      .send(`Server error: ${err}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}/arista`);
});

