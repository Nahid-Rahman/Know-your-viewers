# Public content: where each editable field appears

Checked 2026-11-22 against the code (Fix K). Two separate content stores feed the public site.

## 1. Site-wide content (Researcher → Settings → Stimulus Content)

One database row (`site_contents`, id `singleton`). When the row does not exist, every page uses
`DEFAULT_SITE_CONTENT` (`src/lib/site-content-defaults.ts`). Once **any** tab is saved, the row is
created from the defaults *at that moment* and from then on the row wins — later changes to the
defaults in code do **not** reach a site whose row already exists.

| Tab / field | Shown on | Refreshed on save |
| --- | --- | --- |
| Brand & nav: `siteName`, `siteDescription`, `navContent`, `footerContent` | Navbar and footer on every public page; page titles | `revalidatePath("/", "layout")` — all pages |
| Landing: `trustBadges`, `gameCategories` | Homepage (open and idle) | `/` (always rendered per request anyway) |
| Landing: `heroHeadline`, `heroSubtext`, `faqItems`, `rewardPool`, `claimedCount`, … | **Not used** by the live homepage (see §2) | — |
| About: `aboutContent` | `/about` | `/about` |
| Support: `supportContent` | `/support` | `/support` |
| Terms: `termsContent` | `/terms` | `/terms` |
| Debrief, Entry confirmation tabs | **Not used** (`/debrief` redirects home; the confirmation page has fixed text) | — |

`/about`, `/support` and `/terms` are pre-rendered and regenerated on the next request after a save.
Any researcher account can edit this content; it is site-wide, not per campaign.

## 2. Per-session homepage and wheel (Campaign → Sessions → session → configuration)

Each save creates a new, immutable `session_configs` version. The homepage hero, subtext,
"how it works", FAQ, wheel items and result text come from the **active session's current
version**; each visit and submission keeps the version that was on screen. Defaults
(`DEFAULT_HOMEPAGE_CONTENT`, `DEFAULT_REWARD_CONFIG`) are copied in only when a session's first
config is created. Editing requires write access to that session's campaign; other campaigns are
unaffected. This is intentional snapshotting, not a sync bug.

The confirmation page shows the submission's own config `resultExplanation` and fixed text.

## 3. Draw-timing wording: what still needs a manual edit

The source defaults now use the approved sentence (`DRAW_TIMING_COPY` in `src/lib/study/constants.ts`).
Saved copies are **not** changed by the code update. The owner should check these in production and
edit them through the panels if they still say "after the session" or "within 1 week after the stream":

- Site content row, if it exists: `aboutContent.steps[2].description`, `supportContent.infoCards[1].description`,
  `termsContent.summaryItems[1]`, `termsContent.section4Description`.
- Each session config (including the active one): `homepageContent.heroSubtext`, `homepageContent.howItWorks[2]`,
  `homepageContent.faqItems` ("Does everyone win?", "How soon will I get my reward?"), and `rewardConfig.resultExplanation`.
  A new version only affects visits that start after it is saved.

The optional-information FAQ ("Do optional fields improve my chances?") and the entry form's social-contact line
are study stimulus and were deliberately left unchanged; see the ethics notes in the delivery report.
