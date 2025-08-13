// server.js
import express from "express";
import fetch from "node-fetch"; // اگر Node 18+ داری، می‌تونی این خط رو حذف کنی

const app = express();

// آدرس upstream ثابت + limit=12
const UPSTREAM_URL = "https://ehsan.fazlinejadeh.workers.dev/arista?limit=12";

// تغییر عنوان پروفایل به EHSAN فعال است
const CHANGE_PROFILE_TITLE = true;

app.get("/ehsan", async (req, res) => {
  try {
    // درخواست به آدرس اصلی
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

    // تغییر تگ آخر لینک‌ها و خطوط تکی به #EHSAN
    text = text.replace(/#.*(?=\n|$)/g, "#EHSAN");

    // تغییر عنوان پروفایل Base64 به "EHSAN"
    if (CHANGE_PROFILE_TITLE) {
      const b64Ehsan = Buffer.from("EHSAN", "utf8").toString("base64");
      text = text.replace(
        /(\/\/profile-title:\s*base64:)[A-Za-z0-9+/=]+/,
        (_, p1) => `${p1}${b64Ehsan}`
      );
    }

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
  console.log(`Proxy running at http://localhost:${PORT}/ehsan`);
});
