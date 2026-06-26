import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push({ msg: err.message, stack: err.stack }));

await page.goto("http://localhost:5175/?seed=42");
await page.waitForTimeout(500);

const debug = await page.evaluate(() => {
  return {
    errors: window.__dbg || null,
  };
});

console.log("errors", JSON.stringify(errors, null, 2));
await browser.close();
