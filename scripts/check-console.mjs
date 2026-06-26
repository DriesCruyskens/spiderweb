import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5175/";
const browser = await chromium.launch();
const page = await browser.newPage();
const messages = [];

page.on("console", (msg) => {
  messages.push({ type: msg.type(), text: msg.text() });
});
page.on("pageerror", (err) => {
  messages.push({ type: "pageerror", text: err.message, stack: err.stack });
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.getByText("grow", { exact: true }).click();
await page.waitForTimeout(500);
await page.setViewportSize({ width: 800, height: 600 });
await page.waitForTimeout(500);
await page
  .locator(".dg .property-name", { hasText: "Export SVG" })
  .click()
  .catch(() => {});

const bad = messages.filter(
  (m) => m.type === "error" || m.type === "pageerror" || m.type === "warning"
);
console.log(JSON.stringify(bad, null, 2));
await browser.close();
