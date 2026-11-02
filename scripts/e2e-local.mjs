// Browser checks + screenshots against the LOCAL dev server (synthetic data).
//   1. npm run localdb                      (keep running)
//   2. npm run local -- npx tsx --conditions=react-server scripts/seed-study-demo.mts
//   3. LDA_DEV_AUTH_AS=researcher@example.edu npm run local -- npx next dev -p 3100
//   4. npm run local -- node scripts/e2e-local.mjs
// Screenshots go to .localdb/screenshots/. Uses the locally installed Chrome.
import puppeteer from "puppeteer-core";
import pg from "pg";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const OUT = path.resolve(".localdb/screenshots");
mkdirSync(OUT, { recursive: true });
if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Refusing: DATABASE_URL must be the local database.");
  process.exit(1);
}
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const DESKTOP = { width: 1366, height: 900 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
}

async function participantFlow(viewport, label, phone, opts = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  const analyticsBodies = [];
  page.on("request", (r) => {
    if (r.method() === "POST") analyticsBodies.push(r.postData() ?? "");
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  const html = await page.content();
  check(`${label}: streamer branding shown`, html.includes("RafiqPlaysBD"));
  check(`${label}: no streamer dropdown`, !/Which streamer/i.test(html));
  check(`${label}: no official/certified claims`, !/100% Official|certified/i.test(html));
  await shot(page, `${label}-01-home`);

  await page.waitForFunction(() => !document.querySelector("#spin button")?.hasAttribute("disabled"), { timeout: 20000 });
  await page.evaluate(() => document.querySelector("#spin")?.scrollIntoView());
  await new Promise((r) => setTimeout(r, 1600)); // ≥1 s visible → reward-section view
  await page.click("#spin button");
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, `${label}-02-form`, false);

  // Required-field validation.
  await page.click('[role="dialog"] button[type="submit"]');
  await new Promise((r) => setTimeout(r, 300));
  const errs = await page.$$eval('[role="dialog"] [role="alert"]', (els) => els.map((e) => e.textContent));
  check(`${label}: phone and age required`, errs.length >= 2, errs.join(" | "));
  if (label === "desktop") await shot(page, `${label}-03-validation`, false);

  await page.type("#entry-phone", phone);
  await page.click('input[value="AGE_18_30"]');
  if (opts.ign) await page.type("#entry-ign", opts.ign);
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/entry/received", { timeout: 20000 });
  await page.waitForSelector("h1");
  const conf = await page.content();
  const code = (conf.match(/LD-[A-Z2-9]{4}-[A-Z2-9]{4}/) ?? [])[0];
  check(`${label}: confirmation shows response code`, Boolean(code), code);
  const digits = phone.replace(/\D/g, "").slice(-9);
  check(`${label}: confirmation does not show full phone`, !conf.includes(digits));
  const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
  check(`${label}: no contact data in browser storage`, !storage.includes(digits), storage.slice(0, 80));
  check(`${label}: phone not sent to analytics/activity endpoints`, !analyticsBodies.filter((b) => !b.includes('"phone"')).some((b) => b.includes(digits)));
  await shot(page, `${label}-04-confirmation`);

  // Another browser cannot view this confirmation.
  const url = page.url();
  const other = await (await browser.createBrowserContext()).newPage();
  await other.goto(url, { waitUntil: "networkidle0" });
  check(`${label}: confirmation is not viewable from another browser`, (await other.content()).includes("Confirmation not available"));
  await other.browserContext().close();
  await ctx.close();
  return code;
}

// Fresh synthetic number per run; the mobile run enters the same number in international format.
const tail = String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
const code1 = await participantFlow(DESKTOP, "desktop", `01722${tail}`, { ign: "ShadowFox" });
const code2 = await participantFlow(MOBILE, "mobile", `+880 1722-${tail}`);
const dup = await db.query(`SELECT s.status, c."responseCode" AS canonical FROM submissions s LEFT JOIN submissions c ON c.id = s."canonicalId" WHERE s."responseCode" = $1`, [code2]);
check("equivalent phone from another browser saved as DUPLICATE linked to the first", dup.rows[0]?.status === "DUPLICATE" && dup.rows[0]?.canonical === code1, JSON.stringify(dup.rows[0]));
const rv = await db.query(`SELECT count(*)::int n FROM study_events e JOIN submissions s ON s."visitId" = e."visitId" WHERE s."responseCode" = $1 AND e.type = 'REWARD_SECTION_VIEWED'`, [code1]);
check("reward-section view recorded after real visibility", rv.rows[0].n === 1);

// Admin pages (dev auth as the seeded researcher).
const admin = await browser.newPage();
for (const [vp, label] of [[DESKTOP, "desktop"], [MOBILE, "mobile"]]) {
  await admin.setViewport(vp);
  await admin.goto(`${BASE}/researcher/submissions?includeTest=1`, { waitUntil: "networkidle0" });
  const html = await admin.content();
  check(`admin ${label}: submissions list shows codes`, html.includes(code1));
  check(`admin ${label}: phone masked in list`, !html.includes(`1722${tail}`));
  await shot(admin, `admin-${label}-submissions`);
}
await admin.setViewport(DESKTOP);
await admin.goto(`${BASE}/researcher/submissions?includeTest=1&view=duplicates`, { waitUntil: "networkidle0" });
check("admin: duplicates view lists the duplicate", (await admin.content()).includes(code2));
await shot(admin, "admin-desktop-duplicates");
const subId = (await db.query(`SELECT id FROM submissions WHERE "responseCode" = $1`, [code2])).rows[0].id;
await admin.goto(`${BASE}/researcher/submissions/${subId}`, { waitUntil: "networkidle0" });
check("admin: duplicate detail links original code", (await admin.content()).includes(code1));
await shot(admin, "admin-desktop-submission-detail");

const sess = (await db.query(`SELECT id, "experimentId" FROM stream_sessions WHERE status = 'ACTIVE' AND "sessionType" = 'STUDY'`)).rows[0];
for (const [p, name] of [
  [`/researcher/experiments/${sess.experimentId}/streams/${sess.id}`, "admin-desktop-session"],
  [`/researcher/experiments/${sess.experimentId}/policy`, "admin-desktop-policy"],
  [`/researcher/experiments/${sess.experimentId}/draw`, "admin-desktop-draw"],
  [`/researcher/experiments/${sess.experimentId}/comparison`, "admin-desktop-comparison"],
  [`/researcher/research-dataset/study-exports`, "admin-desktop-exports"],
  [`/researcher/audit`, "admin-desktop-audit"],
]) {
  const res = await admin.goto(`${BASE}${p}`, { waitUntil: "networkidle0" });
  check(`admin page ${p.split("/").slice(-1)[0]} renders`, res?.status() === 200 && !(await admin.content()).includes("Unhandled Runtime Error"));
  await shot(admin, name);
}
await admin.setViewport(MOBILE);
await admin.goto(`${BASE}/researcher/experiments/${sess.experimentId}/streams/${sess.id}`, { waitUntil: "networkidle0" });
await shot(admin, "admin-mobile-session");

// Streamer photo upload from the admin config editor → shown in the homepage hero.
await admin.setViewport(DESKTOP);
await admin.goto(`${BASE}/researcher/experiments/${sess.experimentId}/streams/${sess.id}`, { waitUntil: "networkidle0" });
const photoPage = await browser.newPage();
await photoPage.setViewport({ width: 400, height: 400 });
await photoPage.setContent('<div style="width:400px;height:400px;background:linear-gradient(135deg,#ff2d55,#7b2cff)"></div>');
const photoPath = path.join(OUT, "test-streamer.png");
await photoPage.screenshot({ path: photoPath });
await photoPage.close();
const fileInput = await admin.$('input[type="file"][aria-label="Upload streamer photo"]');
await fileInput.uploadFile(photoPath);
await admin.waitForFunction(() => [...document.querySelectorAll("img")].some((i) => i.src.includes("/api/media/")), { timeout: 20000 });
await admin.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Save as new version"))?.click());
await new Promise((r) => setTimeout(r, 2500));
const home = await browser.newPage();
await home.setViewport(DESKTOP);
await home.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const heroImg = await home.$eval("section img", (i) => i.getAttribute("src")).catch(() => null);
check("admin photo upload appears in the homepage hero", Boolean(heroImg?.startsWith("/api/media/")), heroImg ?? "none");
await shot(home, "desktop-07-home-with-photo", false);
await home.close();

// Closed and no-session public states.
await db.query(`UPDATE stream_sessions SET "actualEndAt" = (now() AT TIME ZONE 'UTC') - interval '3 hours', "entryDeadlineAt" = (now() AT TIME ZONE 'UTC') - interval '1 hour' WHERE id = $1`, [sess.id]);
const pub = await browser.newPage();
await pub.setViewport(MOBILE);
await pub.goto(`${BASE}/`, { waitUntil: "networkidle0" });
check("public: closed state after deadline", (await pub.content()).includes("are closed"));
await shot(pub, "mobile-05-closed");
await db.query(`UPDATE stream_sessions SET status = 'CLOSED' WHERE id = $1`, [sess.id]);
const resp = await pub.goto(`${BASE}/`, { waitUntil: "networkidle0" });
check("public: full idle page without form when no session (no redirect loop)", resp?.status() === 200 && (await pub.content()).includes("Entries open during the next collaborating stream") && !(await pub.content()).includes("entry-phone"));
check("public: idle page shows the last streamer", (await pub.content()).includes("/api/media/"));
await shot(pub, "mobile-06-no-session");
// restore for further manual testing
await db.query(`UPDATE stream_sessions SET status = 'ACTIVE', "actualEndAt" = NULL, "entryDeadlineAt" = NULL WHERE id = $1`, [sess.id]);

await browser.close();
await db.end();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed. Screenshots: ${OUT}`);
process.exit(failed.length ? 1 : 0);
