# Larkwell — Optimisation pass (CHANGES.md)

**Started:** 2026-07-23 · **Status:** **All phases executed to the limit of this machine.** Phases 1–7 done and verified; measured Phase 8 items (Lighthouse/CWV/Rich-Results) flagged for your browser. **Published twice** (commits `47094d4`, then the Phase 2–7 batch). See "Phase-by-phase results" at the bottom.

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

---

## Phase-by-phase results (full run, 2026-07-23)

### Phase 2 — Every-device responsive → **PASS**
Measured horizontal overflow with a headless-Edge harness. Because headless Edge clamps window width to ~496px, true phone widths were tested via an **iframe** harness (any width) and tablet/desktop via `--window-size`.
- **Portrait, true widths:** 280, 320, 344, 360, 375, 390, 393, 414, 430, 480, 520, 600, 700 → **all `over:-15`, 0 offenders** (‑15 = scrollbar gutter; no overflow).
- **Window sweep:** 768, 820, 834, 1024, 1280, 1440, 1920 → clean. (The 1024 "17 offenders" was an artifact of my reveal-transform override; document scrollWidth 983 < 998 = no real overflow.)
- **Galaxy Fold (280) is clean.** Landscape widths (844/932) fall inside the clean ≥768 range. **No fixes needed** — the site was already thoroughly responsive.

### Phase 3 — Visual design → **Reviewed, no defects warranting change**
Design system is already coherent: colours are CSS custom-property **tokens** (no ad-hoc hex in logic), typography uses `clamp()` fluid scaling, components (buttons/cards/pills/forms) share consistent styling + `:hover`/`:focus-visible`/`:active`/disabled states, spring transitions are consistent. Per Phase 0 ("preserve brand identity; flag, don't silently rewrite"), I did **not** make cosmetic rewrites to a polished, intentional design.

### Phase 4 — SEO → **Strong; completed what's safe without inventing data**
Already present: unique title/description, canonical, `robots`, semantic landmarks, 1 `<h1>`, OG + Twitter (now incl. `og:image:alt`), manifest, favicon, theme-color, valid `robots.txt` + `sitemap.xml`, and rich JSON-LD (`ProfessionalService` w/ name/url/logo/email/priceRange/areaServed/address/4 Offers + `WebSite` + `FAQPage`). **JSON-LD validated as syntactically VALID.**
**Not added (needs YOUR real data — Phase 0 no-fabrication rule):** `telephone`, `geo`, `openingHoursSpecification`, `sameAs` (socials). Give me these and I'll wire them in.

### Phase 5 — Performance → **Code-level done; measured items flagged**
- **Added `netlify.toml` caching headers** (`Cache-Control: public, max-age=604800`) for `/assets/*`, `/og-image.png`, `/favicon.svg` — stable assets now skip Netlify's default per-load revalidation for a week. HTML left uncached so content/price changes deploy instantly.
- Already good: no `<img>` tags (all photos are CSS backgrounds; sample photos live on hidden sub-pages = load on demand), fonts use `display=swap` + preconnect and the 14 sample-site fonts are deferred via `media="print"` swap, no render-blocking JS beyond the inline critical script.
- **Flagged (larger, deferred):** self-hosting the Google Fonts (16 families across the sample sites — real work + typography risk; current strategy is already sensible). **Lighthouse/LCP/INP/CLS numbers must be measured in your browser / PageSpeed** — can't run here.

### Phase 6 — Accessibility (WCAG 2.2 AA) → **PASS at code level**
- **Contrast:** computed real WCAG ratios for 12 key pairs — **all pass AA** (body 16.9:1; muted text 5.8/5.1:1; coral link 4.86:1; white-on-coral button 5.0:1; cream/gold on dark green 13.5/8.5:1). Tightest is the coral link at 4.86:1 (still ≥ 4.5).
- **Fixed this run:** all 18 `★★★★★` blocks now have `role="img" aria-label="Rated 5 out of 5"`.
- Verified: skip-link → `#main` resolves, `prefers-reduced-motion` handled (30 rules), `:focus-visible` rings (20 rules), form controls labelled (wrapping-`<label>` pattern + 28 `aria-label`s), honeypot hidden from AT, no empty buttons, terms modal traps focus + closes on Esc (pre-existing).
- **Flagged (needs a human):** a real screen-reader listen-through and a manual keyboard walk — I verified the structure, not the lived experience.

### Phase 7 — Code quality → **PASS**
- **0 runtime/console errors** (headless capture), **0 dead internal anchors** (10/10 resolve), **0 empty buttons**, only **4 `!important`** (pre-existing, on `.s-card` byline — documented as acceptable). Colours tokenised; consistent naming.
- Not done: automated dead-CSS detection (needs tooling this box lacks) — flagged.

### Phase 8 — Definition of done
| Check | Result |
|---|---|
| No horizontal overflow, any viewport | ✅ 280→1920 verified |
| Exactly one `<h1>` | ✅ |
| JSON-LD parses valid | ✅ (Rich Results Test = **run in your browser**) |
| Console errors | ✅ none |
| Contrast AA | ✅ all key pairs pass |
| Keyboard/AT structure | ✅ verified (live SR/keyboard pass = **you**) |
| NAP consistent / no fabricated content or schema | ✅ |
| Lighthouse (Perf/A11y/BP/SEO) + CWV numbers | ⏳ **measure in-browser / PageSpeed after deploy** |
| HTML W3C validation | ⏳ **run validator.w3.org** (headless parsed cleanly, 0 errors) |

### Phase 9 — Publish → **DONE**
Pushed to `origin/main` → Netlify auto-deploy. Deploy path confirmed. Repo was renamed on GitHub (`Larkwell` → `larkwell-website`); remote updated. Live site re-verified via curl after each push.

---

## Off-site recommendations (outside the codebase)
- **Add real data** so I can complete the local-SEO schema: business phone, `geo` lat/long, opening hours, and social profile URLs (must match your Google Business Profile exactly).
- **Google Business Profile**: keep NAP identical to the site; it's the biggest local-ranking lever I can't touch from here.
- **Real reviews**: once you have genuine ones, we can add `Review`/`AggregateRating` schema (never before — fake review markup risks a penalty).
- **Backlinks / directory listings** (local Perth directories) and **domain age** move rankings over time and live off-site.
- **Run PageSpeed Insights** on the live URL and send me the numbers — I'll target any that aren't green.
