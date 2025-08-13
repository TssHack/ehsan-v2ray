// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// لیست ایموجی‌های مجاز
const flagEmojis = ["🇩🇪", "🇳🇱", "🇬🇧", "🇺🇸", "🇹🇷", "🇦🇪", "🇯🇵"];

// نام ویژه برای یک سرویس
const specialName = "Telegram; @abj0o";

async function getMergedProxies() {
  const urls = [
    "https://dev1.irdevs.sbs/",
    "https://nextjs.irdevs.sbs/"
  ];

  // گرفتن داده‌ها از همه URLها
  const results = await Promise.all(urls.map(url => fetch(url).then(r => r.text())));
  let merged = results.join("\n").trim();

  // تقسیم به خطوط
  let lines = merged.split("\n").filter(l => l.trim() !== "");

  // انتخاب یک سرویس به صورت رندوم برای specialName
  const randomIndex = Math.floor(Math.random() * lines.length);

  lines = lines.map((line, index) => {
    // ایموجی رندوم انتخاب کن
    const randomFlag = flagEmojis[Math.floor(Math.random() * flagEmojis.length)];
    const fancyName = `𝙀𝙃𝙎𝘼𝙉 ${randomFlag}`;

    // حذف هر چیزی بعد از #
    if (line.includes("#")) {
      line = line.replace(/#.*/, "");
    }

    // اضافه کردن اسم جدید
    if (index === randomIndex) {
      return `${line}#${specialName}`;
    } else {
      return `${line}#${fancyName}`;
    }
  });

  return lines.join("\n");
}

app.get("/", async (req, res) => {
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
