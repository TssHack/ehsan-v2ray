// server.js
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Regex تشخیص پرچم (جفت حروف Regional Indicator)
const FLAG_RE = /([\u{1F1E6}-\u{1F1FF}]{2})/gu;

// کمک‌کننده‌ها
const safeDecodeURIComponent = (s) => {
  try { return decodeURIComponent(s.replace(/\+/g, "%20")); } catch { return s; }
};
const safeEncodeURIComponent = (s) => encodeURIComponent(s);

// Base64 امن برای vmess
const b64Decode = (b64) => {
  try {
    let str = b64.trim().replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return Buffer.from(str, "base64").toString("utf8");
  } catch {
    return null;
  }
};
const b64Encode = (txt) => Buffer.from(txt, "utf8").toString("base64");

// ساخت برچسب جدید با حفظ پرچم‌ها
const buildLabel = (sourceText, desired = "NEXZO") => {
  const flags = (sourceText || "").match(FLAG_RE) || [];
  const prefix = flags.length ? flags.join(" ") + " " : "";
  return (prefix + desired).trim();
};

// پردازش یک خط
function rewriteLine(line, desiredLabel = "NEXZO") {
  if (!line || !line.includes("://")) return line;

  // جدا کردن بخش قبل و بعد از #
  const hashPos = line.indexOf("#");
  const beforeHash = hashPos >= 0 ? line.slice(0, hashPos) : line;
  const tagEncoded = hashPos >= 0 ? line.slice(hashPos + 1) : "";
  const tagDecoded = safeDecodeURIComponent(tagEncoded);

  // اگر vmess بود، JSON داخل Base64 رو هم ویرایش کن
  const schemeMatch = beforeHash.match(/^\s*([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : null;

  let newBeforeHash = beforeHash;
  let finalTagDecoded = buildLabel(tagDecoded, desiredLabel);

  if (scheme === "vmess") {
    const payload = beforeHash.slice("vmess://".length);
    const jsonText = b64Decode(payload);
    if (jsonText) {
      try {
        const obj = JSON.parse(jsonText);
        // پرچم‌ها رو از ps یا از برچسب فعلی (اگه هست) استخراج کن
        const flagSource = (obj.ps && String(obj.ps)) || tagDecoded || "";
        obj.ps = buildLabel(flagSource, desiredLabel);
        const newB64 = b64Encode(JSON.stringify(obj));
        newBeforeHash = "vmess://" + newB64;

        // اگر قبلاً # نداشت، برای سازگاری برچسب رو هم اضافه می‌کنیم (اختیاری)
        if (hashPos < 0) {
          finalTagDecoded = obj.ps; // همان ps
        }
      } catch {
        // اگر JSON خراب بود، فقط برچسب بعد از # را دستکاری می‌کنیم
      }
    }
  }

  const newTag = safeEncodeURIComponent(finalTagDecoded);
  return newBeforeHash + "#" + newTag;
}

// Route اصلی: می‌ره از سرور مبدا می‌خونه و خروجی اصلاح‌شده رو برمی‌گردونه
app.get("/", async (req, res) => {
  try {
    // اجازه برای تغییر متن مقصد از طریق query ?label=...
    const desiredLabel = (req.query.label || "NEXZO").toString();

    const upstream = "https://dev1.irdevs.sbs/";
    const { data } = await axios.get(upstream, { responseType: "text" });

    // حفظ نوع پایان‌خط
    const newline = data.includes("\r\n") ? "\r\n" : "\n";
    const lines = String(data).split(/\r?\n/);

    const out = lines.map((ln) => {
      if (!ln.trim()) return ln;            // خط خالی
      if (!ln.includes("#") && !ln.startsWith("vmess://")) return ln; // چیزی برای تغییر نیست
      return rewriteLine(ln, desiredLabel);
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(out.join(newline));
  } catch (err) {
    console.error(err?.response?.status, err?.message);
    res.status(502).send("خطا در دریافت/پردازش پاسخ مبدا");
  }
});

app.listen(PORT, () => {
  console.log("Proxy label server listening on http://localhost:" + PORT);
});

