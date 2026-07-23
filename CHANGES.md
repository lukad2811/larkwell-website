# Larkwell — Optimisation pass (CHANGES.md)

**Started:** 2026-07-23 · **Status:** Phase 1 audit complete; verified quick-wins applied; **NOT yet published** (awaiting your go-ahead — see "Publish gate" below).

> ⚠️ **Environment limitation (read this).** This machine has **no Node, no Python, and works offline**, so I cannot generate real Lighthouse / PageSpeed / Rich-Results *numbers* here. Everything below is verified by reading the source and by headless-Edge render tests. The **measured** items in Phase 8 (Lighthouse scores, CWV field data, the Rich Results Test) must be run in your browser / PageSpeed Insights **after** deploy. I've flagged exactly which those are.

---

## Phase 1 — Audit

### Stack & structure
- **Single static `index.html`** (~5,300 lines) + `terms.html`, deployed on **Netlify** (`netlify.toml`, `publish = "."`).
- **CSS:** hand-written vanilla CSS in one `<style>` block, driven by CSS custom properties (design tokens). No Tailwind/SCSS/build step.
- **JS:** vanilla, wrapped in one IIFE. No framework, no bundler for the page itself.
- **One serverless function:** `netlify/functions/create-checkout-session.js` (Stripe Checkout). **Off-limits** per standing rules — untouched.
- **Sample "client sites"** are inline HTML sections (`#s-realestate`, `#s-auto`, …) styled to look like real sites — **not iframes**. Photography is CSS `background-image`; **there are zero `<img>` tags** in the document.
- Assets: `favicon.svg`, `site.webmanifest`, `og-image.png`, `robots.txt`, `sitemap.xml`, `assets/` (fonts/images/svg), Google verification file.

### Verification of the 23-Jul external review findings
The outside review looked at the *rendered* page. Checked against source:

| Finding (external) | Verdict | Action |
|---|---|---|
| Countdown shows `00d:00h:00m:00s` | **Stale deploy, not a code bug.** `LAUNCH_OFFER_END = 2026-08-25` (33 days out); on expiry the code *hides* the banner, it never shows zeros. | **Redeploy fixes the live symptom.** No source change needed. |
| Terms link text `/terms.html` but points to `/terms` | **False positive.** Link label and `href` both = `/terms.html`; no redirect in `netlify.toml`. | Verified; no change. |
| Stanford "75% … before they've read a word" overstated | **Confirmed.** The 75% figure is shaky/misattributed. | **Fixed** — softened to a defensible claim. |
| No JSON-LD | **False.** Rich JSON-LD present: `ProfessionalService` (priceRange, areaServed Perth/WA/AU, address, 4 Offers), `WebSite`, `FAQPage`. | Verified; see enhancements below. |
| More than one `<h1>` / duplicate-H1 from previews | **False.** Exactly **1 `<h1>`**; samples use `<h2>/<h3>`. Not iframes, so no duplicate-content issue. | Verified; no change. |
| Missing `robots.txt` / `sitemap.xml` | **False.** Both exist and are valid; robots points to sitemap. | Verified; refreshed sitemap date. |
| Previews need `loading="lazy"` | **N/A.** No `<img>` tags; previews are CSS backgrounds on hidden sub-pages (load on demand). | No change. |
| Honeypot must be hidden + `aria-hidden` | **Already correct.** `.hp{position:absolute;left:-9999px…}` + `aria-hidden="true"` + `tabindex="-1"` + `netlify-honeypot="bot-field"`. | Verified; no change. |
| `★★★★★` blocks need a text equivalent | **Confirmed** (18 blocks in the sample sites, no accessible name). | **Fixed** — added `role="img" aria-label="Rated 5 out of 5"`. |
| One `<h1>`, favicon/theme-color/OG/Twitter | **Already present:** canonical, `theme-color`, full OG + Twitter card w/ 1200×630 PNG, `manifest`, `favicon.svg`. | Verified; added `og:image:alt`. |

### Already-strong (no work needed)
Mobile is heavily optimised already (`viewport-fit=cover` + safe-area insets, `clamp()` typography, 44px tap targets, no horizontal overflow — from prior sessions). `prefers-reduced-motion` handled (30 hits), `:focus-visible` rings (20 hits), skip-link present (6 hits), `color-scheme` handled, honeypot correct, JSON-LD rich, one `<h1>`, semantic landmarks.

### Prioritised plan
**Quick wins (done this pass — all safe, verified, no visual regressions):**
1. Soften the Stanford credibility stat to a bulletproof claim.
2. Give all 18 `★★★★★` rating blocks an accessible name (WCAG).
3. Refresh `sitemap.xml` `<lastmod>` for `/` (was 2026-07-06).
4. Add `og:image:alt` to complete the social-card meta.

**Needs YOUR real data (won't fabricate — Phase 0 rule):**
- JSON-LD `geo` (lat/long), `telephone`, `openingHoursSpecification`, and `sameAs` (real social profile URLs). High local-SEO value, but only with true values from your Google Business Profile. Give me these and I'll add them.
- `apple-touch-icon.png` (180×180): iOS ignores the current SVG. I can generate one from `favicon.svg` via headless Edge on request.
- Real reviews → **no** `AggregateRating`/`Review` schema until genuine reviews exist (fake review markup risks a Google penalty). Correctly absent today.

**Bigger / measured (need more turns or your browser):**
- Full 12-viewport responsive sweep (portrait+landscape) — spot-verified clean historically; a fresh exhaustive pass is a larger task.
- Phase 5 perf + Phase 8 Lighthouse/CWV numbers — **must be measured in-browser/PageSpeed after deploy.**
- Optional Netlify `[[headers]]` asset-caching (deferred: assets aren't content-hashed, so aggressive immutable caching would strand updates — needs a considered max-age, not immutable).

---

## Decisions log
- **Kept the countdown's "hide on expiry" behaviour** rather than adding an all-zeros "expired" state — a dead timer is worse UX than no banner. The live zeros are a stale deploy; redeploy resolves them.
- **Did not touch** Stripe function / price IDs / keys, or any copy beyond the one authorised Stanford stat.
- **Did not invent** NAP, geo, phone, socials, or reviews — flagged for you to supply.

## Changed this pass (2026-07-23)
- `index.html`: Stanford stat reworded; `role="img" aria-label="Rated 5 out of 5"` on 18 star blocks; added `og:image:alt`.
- `sitemap.xml`: `/` `<lastmod>` → 2026-07-23.
- (Earlier this session, separate feature: Rush delivery re-added as a $199 get-started-form add-on — front-end wiring only, Stripe untouched.)

## Publish gate
Phase 9 says publish once Phase 8 passes — but the **measured** Phase 8 gate (Lighthouse/CWV/Rich-Results) can't run on this offline, Node-less box. The code-level checks all pass. Deploy path is confirmed: `git push` → Netlify auto-deploy. **Say the word and I'll push** (which also fixes the stale-countdown live symptom), or I'll hold for your review.
