// Render a promo tile (HTML+inline SVG) via real Chrome so CJK + color emoji both render.
// Usage: PLAYWRIGHT=/path/to/playwright node webstore/render-promo.mjs <input.html> <outPrefix> <w> <h>
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");

const [, , input, outPrefix, wStr, hStr] = process.argv;
const w = Number(wStr);
const h = Number(hStr);
const fileUrl = "file://" + path.resolve(input);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(fileUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outPrefix}@2x.png`, clip: { x: 0, y: 0, width: w, height: h } });
await browser.close();
console.log(`rendered ${outPrefix}@2x.png`);
