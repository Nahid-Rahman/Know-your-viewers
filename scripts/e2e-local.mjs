// Browser checks + screenshots against the LOCAL dev server (synthetic data).
//   1. npm run localdb                      (keep running)
//   2. npm run local -- npx tsx --conditions=react-server scripts/seed-study-demo.mts
//   3. LDA_DEV_AUTH_AS=researcher@example.edu npm run local -- npx next dev -p 3100
//   4. npm run local -- node scripts/e2e-local.mjs
// Use LDA_LOCAL_DATABASE=livedrop_e2e on every step to keep this run away from
// your livedrop_dev data (see README "Browser checks").
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

  const alerts = () => page.$$eval('[role="dialog"] [role="alert"]', (els) => els.map((e) => e.textContent ?? ""));
  const submit = async () => {
    await page.click('[role="dialog"] button[type="submit"]');
    await new Promise((r) => setTimeout(r, 400));
  };

  // Required fields: name, phone and age group.
  await submit();
  const errs = await alerts();
  check(`${label}: name, phone and age required`, errs.length >= 3 && errs.some((e) => /name/i.test(e)), errs.join(" | "));
  if (label === "desktop") await shot(page, `${label}-03-validation`, false);

  // Invalid optional formats are blocked (then cleared — optional means optional).
  await page.type("#entry-name", "Synthetic Tester");
  await page.type("#entry-phone", phone);
  await page.click('input[value="AGE_18_30"]');
  await page.type("#entry-email", "not-an-email");
  await page.type("#entry-discord", "a");
  await submit();
  const fmt = await alerts();
  check(`${label}: invalid optional email/Discord blocked`, fmt.some((e) => /email/i.test(e)) && fmt.some((e) => /Discord/i.test(e)), fmt.join(" | "));
  for (const sel of ["#entry-email", "#entry-discord"]) {
    // Ctrl+A: triple-click can't select text in type="email" inputs.
    await page.focus(sel);
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
  }

  // Each optional field independently: skipped, or filled per `opts`.
  if (opts.email) await page.type("#entry-email", opts.email);
  if (opts.ign) await page.type("#entry-ign", opts.ign);
  if (opts.discord) await page.type("#entry-discord", opts.discord);
  if (opts.facebook) await page.type("#entry-facebook", opts.facebook);
  // Submit with Enter from the name field (keyboard path).
  await page.focus("#entry-name");
  await page.keyboard.press("Enter");
  try {
    await page.waitForFunction(() => location.pathname === "/entry/received", { timeout: 20000 });
  } catch (err) {
    await shot(page, `${label}-FAILED-submit`, false);
    const vals = await page.$$eval('[role="dialog"] input', (els) => els.map((e) => `${e.id}=${e.type === "radio" ? e.checked : e.value.length}`));
    console.error("Submit did not navigate. Alerts:", await alerts(), "Field lengths:", vals.join(" "));
    throw err;
  }
  await page.waitForSelector("h1");
  const conf = await page.content();
  const code = (conf.match(/LD-[A-Z2-9]{4}-[A-Z2-9]{4}/) ?? [])[0];
  check(`${label}: confirmation shows response code`, Boolean(code), code);
  const digits = phone.replace(/\D/g, "").slice(-9);
  check(`${label}: confirmation does not show full phone`, !conf.includes(digits));
  const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
  check(`${label}: no contact data in browser storage`, !storage.includes(digits), storage.slice(0, 80));
  check(`${label}: phone not sent to analytics/activity endpoints`, !analyticsBodies.filter((b) => !b.includes('"phone"')).some((b) => b.includes(digits)));
  check(`${label}: name not sent to analytics/activity endpoints`, !analyticsBodies.filter((b) => !b.includes('"phone"')).some((b) => b.includes("Synthetic Tester")));
  await shot(page, `${label}-04-confirmation`);
  const confirmationUrl = page.url();

  // Same visit continues across public pages; time is credited per page.
  await new Promise((r) => setTimeout(r, 1500));
  // JS click: on mobile the nav links sit in a collapsed menu.
  await page.evaluate(() => document.querySelector('a[href="/about"]')?.click());
  await page.waitForFunction(() => location.pathname === "/about", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => document.querySelector('a[href="/terms"]')?.click());
  await page.waitForFunction(() => location.pathname === "/terms", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  // Another browser cannot view this confirmation.
  const other = await (await browser.createBrowserContext()).newPage();
  await other.goto(confirmationUrl, { waitUntil: "networkidle0" });
  check(`${label}: confirmation is not viewable from another browser`, (await other.content()).includes("Confirmation not available"));
  await other.browserContext().close();
  await ctx.close(); // closing fires pagehide → final partial interval
  await new Promise((r) => setTimeout(r, 800));
  return code;
}

// Fresh synthetic number per run; the mobile run enters the same number in international format.
const tail = String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
const code1 = await participantFlow(DESKTOP, "desktop", `01722${tail}`, { ign: "ShadowFox#BD1", discord: "shadow.fox" });
const code2 = await participantFlow(MOBILE, "mobile", `+880 1722-${tail}`, { facebook: "facebook.com/shadow.fox" });
const code3 = await participantFlow(DESKTOP, "desktop-all-optional", `01733${tail}`, {
  email: "tester@example.org",
  ign: "Fox#22",
  discord: "fox_22",
  facebook: "Fox Twenty",
});
const opt = await db.query(
  `SELECT "responseCode", "emailProvided" e, "ignProvided" i, "discordProvided" d, "facebookProvided" f FROM submissions WHERE "responseCode" = ANY($1)`,
  [[code1, code2, code3]],
);
const flags = Object.fromEntries(opt.rows.map((r) => [r.responseCode, [r.e, r.i, r.d, r.f].map(Number).join("")]));
check("optional fields are independent (IGN+Discord / Facebook only / all four)", flags[code1] === "0110" && flags[code2] === "0001" && flags[code3] === "1111", JSON.stringify(flags));

const ev = await db.query(
  `SELECT e.type::text AS type, e.element, e.detail FROM study_events e JOIN submissions s ON s."visitId" = e."visitId" WHERE s."responseCode" = $1`,
  [code1],
);
const types = ev.rows.map((r) => r.type);
check("every submit attempt counted, including invalid ones", types.filter((t) => t === "SUBMISSION_ATTEMPTED").length === 3, String(types.filter((t) => t === "SUBMISSION_ATTEMPTED").length));
const vf = ev.rows.filter((r) => r.type === "SUBMISSION_VALIDATION_FAILED").map((r) => r.detail?.reasons);
check("invalid attempts carry reason codes only", vf.length === 2 && /AGE_MISSING/.test(vf[0]) && /EMAIL_INVALID/.test(vf[1]) && !JSON.stringify(ev.rows).includes("not-an-email"), JSON.stringify(vf));
const routes = ev.rows.filter((r) => r.type === "ROUTE_VIEWED").map((r) => r.element);
check("route views recorded in the same visit (home → confirmation → about → terms)", ["home", "confirmation", "about", "terms"].every((k) => routes.includes(k)), routes.join(","));
const vt = await db.query(`SELECT v."measurementVersion" ver, v."routeActiveMs" r, v."activeMs" a FROM visits v JOIN submissions s ON s."visitId" = v.id WHERE s."responseCode" = $1`, [code1]);
const rm = vt.rows[0]?.r ?? {};
check("visible time credited per page and adds up", vt.rows[0]?.ver === 2 && rm.home > 0 && rm.confirmation > 0 && rm.about > 0 && Object.values(rm).reduce((x, y) => x + y, 0) === vt.rows[0].a, JSON.stringify(vt.rows[0]));
const dupQ = await db.query(`SELECT s.status, c."responseCode" AS canonical FROM submissions s LEFT JOIN submissions c ON c.id = s."canonicalId" WHERE s."responseCode" = $1`, [code2]);
check("equivalent phone from another browser saved as DUPLICATE linked to the first", dupQ.rows[0]?.status === "DUPLICATE" && dupQ.rows[0]?.canonical === code1, JSON.stringify(dupQ.rows[0]));
const rv = await db.query(`SELECT count(*)::int n FROM study_events e JOIN submissions s ON s."visitId" = e."visitId" WHERE s."responseCode" = $1 AND e.type = 'REWARD_SECTION_VIEWED'`, [code1]);
check("reward-section view recorded after real visibility", rv.rows[0].n === 1);

// Wheel spin failure recovery (Fix B). CDP Fetch fails the spin server action
// either before it reaches the server or after the server saved the result.
async function spinFailure(stage) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(DESKTOP);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector("#spin button")?.hasAttribute("disabled"), { timeout: 20000 });
  const count = async () => (await db.query(`SELECT count(*)::int n FROM spin_outcomes`)).rows[0].n;
  const before = await count();
  const cdp = await page.createCDPSession();
  let failed = 0;
  cdp.on("Fetch.requestPaused", async (e) => {
    const isAction = e.request.method === "POST" && Object.keys(e.request.headers).some((h) => h.toLowerCase() === "next-action");
    if (isAction && failed === 0) {
      failed++;
      await cdp.send("Fetch.failRequest", { requestId: e.requestId, errorReason: "ConnectionReset" });
    } else if (e.responseStatusCode !== undefined) {
      await cdp.send("Fetch.continueResponse", { requestId: e.requestId }).catch(() => cdp.send("Fetch.continueRequest", { requestId: e.requestId }));
    } else {
      await cdp.send("Fetch.continueRequest", { requestId: e.requestId });
    }
  });
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: stage }] });
  await page.click("#spin button");
  await page.waitForFunction(() => document.querySelector('#spin-status[role="alert"]'), { timeout: 15000 });
  const st = await page.evaluate(() => ({
    msg: document.querySelector("#spin-status")?.textContent ?? "",
    btn: document.querySelector("#spin button")?.textContent ?? "",
    disabled: document.querySelector("#spin button")?.hasAttribute("disabled"),
    dialog: Boolean(document.querySelector('[role="dialog"]')),
  }));
  const tag = stage === "Request" ? "lost before server" : "lost after server saved";
  check(`spin failure (${tag}): error announced, button usable again, no form`, failed === 1 && /Couldn't reach the server/.test(st.msg) && /Spin the wheel/.test(st.btn) && !st.disabled && !st.dialog, JSON.stringify(st));
  if (stage === "Request") await shot(page, "desktop-08-spin-failed", false);
  const mid = await count();
  check(`spin failure (${tag}): server spin count as expected`, mid - before === (stage === "Request" ? 0 : 1), `${mid - before}`);
  await page.click("#spin button");
  await page.waitForSelector('[role="dialog"]', { timeout: 20000 });
  const after = await count();
  check(`spin failure (${tag}): retry opens the form with exactly one stored spin`, after - before === 1, `${after - before}`);
  const alertGone = await page.evaluate(() => !document.querySelector('#spin-status[role="alert"]'));
  check(`spin failure (${tag}): error cleared after retry`, alertGone);
  await cdp.send("Fetch.disable");
  await ctx.close();
}
await spinFailure("Request");
await spinFailure("Response");

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
check("admin: research eligibility reasons shown", /Duplicate of an earlier entry/.test(await admin.content()));
const adminRoutes = await db.query(`SELECT count(*)::int n FROM study_events WHERE type::text = 'ROUTE_VIEWED' AND element NOT IN ('home','about','terms','support','confirmation')`);
check("researcher pages are never tracked", adminRoutes.rows[0].n === 0);
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
for (const q of ["?includeTest=1", "?includeTest=1&phase=live"]) {
  const res = await admin.goto(`${BASE}/researcher/experiments/${sess.experimentId}/streams${q}`, { waitUntil: "networkidle0" });
  const html = await admin.content();
  check(`admin: campaign-wide engagement groups render (${q})`, res?.status() === 200 && html.includes("whole campaign (") && html.includes("Started during the stream"));
}
await shot(admin, "admin-desktop-campaign-groups");
await admin.goto(`${BASE}/researcher/experiments/${sess.experimentId}/streams/${sess.id}?phase=post`, { waitUntil: "networkidle0" });
check("admin: session engagement groups filter by phase", (await admin.content()).includes("started in the selected phase"));
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

// Config changes between page render and visit start: the page re-renders with
// the new config and the visit starts; the Spin button must not stay disabled.
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(DESKTOP);
  const cdp = await page.createCDPSession();
  let swapped = false;
  cdp.on("Fetch.requestPaused", async (e) => {
    const isAction = e.request.method === "POST" && Object.keys(e.request.headers).some((h) => h.toLowerCase() === "next-action");
    if (isAction && !swapped) {
      swapped = true;
      const cur = (await db.query(`SELECT "currentConfigId" c FROM stream_sessions WHERE id = $1`, [sess.id])).rows[0].c;
      const next = (
        await db.query(
          `INSERT INTO session_configs SELECT (jsonb_populate_record(NULL::session_configs, to_jsonb(c) || jsonb_build_object('id', gen_random_uuid()::text, 'version', c.version + 100, 'createdAt', now()))).* FROM session_configs c WHERE id = $1 RETURNING id`,
          [cur],
        )
      ).rows[0].id;
      await db.query(`UPDATE stream_sessions SET "currentConfigId" = $1 WHERE id = $2`, [next, sess.id]);
    }
    await cdp.send("Fetch.continueRequest", { requestId: e.requestId });
  });
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const ok = await page
    .waitForFunction(() => !document.querySelector("#spin button")?.hasAttribute("disabled"), { timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  const btn = await page.$eval("#spin button", (b) => b.textContent ?? "").catch(() => "");
  check("config changed mid-start: page refreshes and Spin becomes usable", swapped && ok && /Spin the wheel/.test(btn), `${swapped} ${ok} ${btn}`);
  await ctx.close();
}

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
