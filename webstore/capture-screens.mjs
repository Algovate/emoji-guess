// Capture Chrome Web Store screenshots (1280x800) by serving dist/ and driving the real UI.
// Usage: node webstore/capture-screens.mjs
//        PLAYWRIGHT=/path/to/playwright node webstore/capture-screens.mjs   (if not installed locally)
import { createRequire } from "node:module";
import http from "node:http";
import url from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");

const DIST = path.resolve("dist");
const OUT = path.resolve("webstore/screens");
fs.mkdirSync(OUT, { recursive: true });

// ---- emoji -> answer map parsed from questions.ts (tuples: [answer, emoji, explanation]) ----
const src = fs.readFileSync("src/content/questions.ts", "utf8");
const tupleRe = /"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g;
const norm = (s) => Array.from(String(s).trim()).join("");
const stripFE0F = (s) => s.replace(/️/g, "");
const answerByEmoji = new Map();
let mm;
while ((mm = tupleRe.exec(src))) {
  const answer = mm[1];
  for (const key of [norm(mm[2]), stripFE0F(norm(mm[2]))]) {
    if (!answerByEmoji.has(key)) answerByEmoji.set(key, answer);
  }
}
console.log(`parsed ${answerByEmoji.size} emoji->answer entries`);

function answerFor(rawEmoji) {
  const e = norm(rawEmoji);
  return answerByEmoji.get(e) || answerByEmoji.get(stripFE0F(e));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- embedded static server for dist/ (so /assets/* absolute paths resolve) ----
const types = { ".html": "text/html;charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname || "/");
  if (p === "/") p = "/game.html";
  const fp = path.join(DIST, p);
  if (!fp.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; return res.end("404"); }
    res.setHeader("Content-Type", types[path.extname(fp)] || "application/octet-stream");
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;
console.log("serving dist at", BASE);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "zh-CN" });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);

async function shot(name) {
  const p = path.join(OUT, `${name}@2x.png`);
  await page.screenshot({ path: p, clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log("  captured", name);
}

async function currentEmoji() {
  return norm(await page.locator(".emoji-puzzle").innerText());
}

async function solveCurrent() {
  const emoji = await currentEmoji();
  const answer = answerFor(emoji);
  if (!answer) { console.log("  (no answer for emoji, skipping solve)"); return false; }
  if ((await page.locator(".choice-grid").count()) > 0) {
    const choices = await page.locator(".answer-choice").allTextContents();
    const idx = choices.findIndex((c) => c.trim() === answer);
    if (idx < 0) return false;
    await page.locator(".answer-choice").nth(idx).click();
  } else {
    for (const ch of Array.from(answer)) {
      const tiles = page.locator(".letter-tile:not([disabled])");
      const texts = await tiles.allTextContents();
      const idx = texts.findIndex((t) => t.trim() === ch);
      if (idx < 0) return false;
      await tiles.nth(idx).click();
      await sleep(110);
    }
  }
  return true;
}

async function waitForAdvance(prevEmoji) {
  await page.waitForSelector(".feedback-slot strong", { timeout: 3000 }).catch(() => {});
  await page.waitForFunction(
    (prev) => {
      const e = Array.from((document.querySelector(".emoji-puzzle")?.textContent || "").trim()).join("");
      return !!document.querySelector(".result-screen") || (!!e && e !== prev);
    },
    prevEmoji,
    { timeout: 7000 },
  ).catch(() => {});
  await sleep(450);
}

async function skipUntil(predicate, maxTries = 20) {
  for (let i = 0; i < maxTries; i++) {
    if (await predicate()) return true;
    if ((await page.locator(".result-screen").count()) > 0) return false;
    await page.locator(".game-tools button:last-child").click();
    await sleep(420);
    await page.waitForSelector(".game-screen .question-card", { timeout: 5000 }).catch(() => {});
  }
  return predicate();
}

async function startMode(cardClass) {
  await page.click(`.mode-card.mode-card--${cardClass}`);
  await page.waitForSelector(".game-screen");
}

try {
  // ---- 01 HOME ----
  await page.goto(`${BASE}/game.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".home-screen .mode-card");
  await sleep(700);
  await shot("01-home");

  // ---- 02 PROFILE ----
  await page.click(".profile-pill");
  await page.waitForSelector(".profile-screen");
  await sleep(600);
  await shot("02-profile");
  await page.click(".profile-screen .icon-button"); // back
  await page.waitForSelector(".home-screen .mode-card");

  // ---- 03 LETTER GAMEPLAY + 04 SHARE (one timed session) ----
  await startMode("hero"); // 60秒快猜 (timed): free skips, big pool
  await skipUntil(async () => (await page.locator(".letter-grid").count()) > 0);
  await sleep(700);
  await shot("03-play-letter");

  await page.locator(".game-tools button:nth-child(2)").click(); // ↗ 分享这题
  await page.waitForSelector(".share-overlay");
  await page.waitForFunction(
    () => /放心分享|题目不会包含答案/.test(document.querySelector(".share-status")?.textContent || ""),
    { timeout: 8000 },
  ).catch(() => {});
  await sleep(900);
  await shot("04-share");
  await page.locator(".share-overlay .icon-button").click(); // close
  await page.waitForSelector(".game-screen .question-card");

  // ---- 05 CHOICE GAMEPLAY (fresh timed session) ----
  await page.locator(".game-header .icon-button").click(); // exit to home
  await page.waitForSelector(".home-screen .mode-card");
  await startMode("hero");
  await skipUntil(async () => (await page.locator(".choice-grid").count()) > 0);
  await sleep(700);
  await shot("05-play-choice");

  // ---- 06 RESULTS (endless: solve 8 for a record, then end via skips) ----
  await page.locator(".game-header .icon-button").click(); // exit home
  await page.waitForSelector(".home-screen .mode-card");
  await startMode("blue"); // 无尽 endless
  let solved = 0;
  for (let i = 0; i < 8; i++) {
    if ((await page.locator(".result-screen").count()) > 0) break;
    const prev = await currentEmoji();
    const ok = await solveCurrent();
    if (ok) { solved++; await waitForAdvance(prev); }
  }
  console.log(`  solved ${solved} in endless, ending via skip...`);
  for (let i = 0; i < 6; i++) {
    if ((await page.locator(".result-screen").count()) > 0) break;
    await page.locator(".game-tools button:last-child").click(); // skip burns a life
    await sleep(750);
  }
  await page.waitForSelector(".result-screen", { timeout: 6000 });
  await sleep(900);
  await shot("06-result");
} catch (err) {
  console.error("capture error:", err);
} finally {
  await browser.close();
  server.close();
}
console.log("done");
