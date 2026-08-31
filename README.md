# MeterSahi?

A fare-tampering checker for auto-rickshaws and taxis. Enter your pickup and
drop-off, get the officially-tariffed fare for your city, and see immediately
if a driver is overcharging you.

**Live site:** https://metersahi.in
**Android app:** Capacitor wrapper around the live site (see [`android/`](#android-app))

---

## Tech stack

- **Astro** (static site generator) for the city pages
- Plain **vanilla JavaScript** for all calculator logic (`public/app.js`, `public/cities.js`) — deliberately no framework, so the same code can be dropped into a WebView unmodified
- **Google Maps Platform** (Maps JS, Places, Routes, Geocoding APIs) for live routing and address autocomplete
- **Supabase** (Postgres + REST API) for vehicle reports, fare-calculation analytics, and user feedback — anonymous insert-only, no accounts
- **Capacitor** for the Android app — loads the live site remotely rather than bundling a frozen copy, so web updates reach the app with zero new app-store release needed
- **Vitest** for the fare-calculation test suite

---

## Local development

```bash
npm install
npm run dev
```

`npm run build` and `npm run dev` both run a `prebuild`/`predev` hook first —
see [Why the prebuild hooks exist](#why-the-prebuild-hooks-exist) below before
you skip or remove them.

Run the test suite:
```bash
npm test
```

---

## Project structure

```
public/
  cities.js           # single source of truth: every city's tariff, geo-detection
                       # rules, fare-calculation engine (computeFare, etc.)
  app.js              # all calculator UI logic - form handling, Routes API calls,
                       # rendering results, the feedback dialog, vehicle reporting
  ride-compare.js      # Uber/Ola/Rapido fare comparison widget
  style.css
src/
  layouts/CityLayout.astro   # the one shared template every city page renders through
  data/cities.json           # auto-generated from cities.js - see below, never edit by hand
  pages/[city]/index.astro   # dynamic route, one page per city in CITY_LIST
scripts/
  extract-cities.js    # regenerates src/data/cities.json from public/cities.js
  generate-sitemap.js  # regenerates public/sitemap.xml from public/cities.js
tests/
  fareCalc.test.js     # tests every fare-calculation engine, geo-detection, and
                        # known regressions we've actually hit in production
android/                # Capacitor native Android project
.github/workflows/       # CI: site deploy, Android builds, uptime check
```

---

## Why the prebuild hooks exist

`src/data/cities.json` and `public/sitemap.xml` are **generated files** — they
exist because Astro's routing and the sitemap both need city data in a format
that isn't `public/cities.js`'s raw JS. They used to be hand-maintained.

That went wrong twice, in production:
- A new city was added to `cities.js` but `cities.json` never got
  regenerated → the page 404'd despite the code being "correct."
- The sitemap silently fell 16 cities behind reality over several rounds of
  city additions, because nobody remembered to update it by hand.

`npm run build` and `npm run dev` now run `extract-cities.js` and
`generate-sitemap.js` automatically via `prebuild`/`predev` in
`package.json`, every single time. **If you ever see a city 404, or the
sitemap looks stale, check whether these hooks are still wired up in
`package.json` before debugging anything else.**

---

## Adding a new city

1. Research the tariff from a real source — an official government/RTO
   notification, a major newspaper reporting on one, or (for statewide
   tariffs) confirmation that the same document covers multiple cities. See
   the extensive sourcing comments throughout `cities.js` for the bar this
   project holds itself to — several cities were deliberately **not** added
   because no traceable current government-published rate could be found.
2. Add an entry to the `CITIES` object in `public/cities.js`. Pick the right
   fare-calculation shape (see below) and fill in every field — currency,
   country, regulator naming, contact info.
3. Add the slug to `CITY_LIST`.
4. Add geo-detection entries to `GEO_CITY_MAP` (and `GEO_REGION_MAP` /
   `GEO_COUNTRY_MAP` **only** if the state/country has exactly one covered
   city — multi-city states/countries must resolve by city name only, or a
   visitor can get silently redirected to the wrong city's tariff. This has
   been a real bug more than once; there are regression tests for it in
   `fareCalc.test.js`).
5. Add an emoji to `src/data/city-emoji.json` — check it isn't already used
   by another city.
6. Run `npm test`, then `npm run build` and spot-check the new page.

### The four fare-calculation shapes

`computeFare()` in `cities.js` dispatches between these based on which fields
are present on the tariff object:

| Shape | Trigger field | Used for | Example |
|---|---|---|---|
| Flat rate | (default) | `fare = max(MIN_FARE, distance × RATE_PER_KM)` | Mumbai |
| Tiered/bracket | `BANDS` | Whole trip billed at whichever bracket it falls into | Gangtok |
| Progressive/cumulative | `PROGRESSIVE_BANDS` | Each band only charges its own portion (like a tax bracket) | Bangkok |
| + Flag-fall | `FLAG_FALL` (combinable with flat or progressive) | Fixed charge added on top of the per-km rate | Istanbul |
| + Ceiling billing | `CEIL_TO_KM: true` (combinable with progressive) | Partial km round UP to a full km before billing | Shillong |

Get the shape wrong and the fare will be confidently, silently incorrect —
verify any new tariff against a real worked example from the source before
trusting it.

---

## Supabase tables

Three tables, same RLS pattern throughout: anonymous `INSERT` only, no
`SELECT`/`UPDATE`/`DELETE` for the public key. View/export data via the
Supabase dashboard, not the app.

- **`vehicle_reports`** — filled in when someone reports a vehicle (plate
  number, price charged, trip details).
- **`fare_calculations`** — one row per "Calculate correct fare" press,
  successful or not. Useful for usage analytics and Routes API failure rate.
- **`user_feedback`** — star rating + optional text from the feedback dialog
  (see [Feedback dialog logic](#feedback-dialog-logic) below).

Schema files aren't committed to this repo (SQL run directly in Supabase's
SQL Editor) — ask if they need reconstructing.

---

## Feedback dialog logic

Appears 5 seconds after a successful "Calculate" press. Suppression state
lives in `localStorage` (`ms_feedback_status`), tunable via two constants
near the top of the feedback section in `app.js`:

- `FEEDBACK_DELAY_MS` — how long after pressing Calculate the dialog appears.
- `FEEDBACK_VISITS_COOLDOWN` — currently 10. Governs **both** post-submit and
  post-dismiss cooldowns, but not symmetrically: a visitor who has **never**
  submitted gets no cooldown at all on dismiss (shows again next visit). Once
  someone has submitted even once, *every* future dismissal also gets the
  same visit-count cooldown as a submission would.

---

## Android app

`android/` is a Capacitor project (`in.metersahi.app`) that loads
`https://metersahi.in` directly — see `capacitor.config.ts`. It does **not**
bundle a frozen copy of the site.

### Why a custom `MainActivity.java` exists
A stock Android WebView does not support the browser-standard
`navigator.geolocation` API at all, even with the permission declared in the
manifest — the host app has to implement the runtime-permission handshake
itself. `MainActivity.java` does this so the existing web code (`app.js`'s
`attemptAutoLocate()`) works completely unmodified inside the app.

### GitHub Actions workflows
- **`android-build.yml`** — auto-signed debug APK on every push, for
  sideloading/testing. No secrets required.
- **`android-release.yml`** — signed release `.aab`, manual trigger only.
  Signs directly with `jarsigner` rather than through Gradle's
  `signingConfig` mechanism (a real, previously-unresolved bug where Gradle
  had the correct keystore available but never applied it to `bundleRelease`
  specifically). Requires two repository secrets:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`

  **Note:** the keystore's store password and key password must be the
  *same* value. PKCS12-format keystores (what `keytool` creates by default)
  don't actually support a distinct per-key password — `keytool` accepts two
  different values silently at creation time, but only the store password
  ever really unlocks the key. This cost a lot of debugging time; don't
  reintroduce a separate key password.
- **`generate-keystore.yml`** — one-time keystore generator, run entirely on
  GitHub's infrastructure (no local Java install needed). Outputs the
  keystore and its password as a downloadable artifact — **never** printed
  in logs. Delete the workflow run after downloading.

No Play Console upload automation exists currently — the signed `.aab` is
downloaded from the workflow's Artifacts and uploaded to Play Console
manually. (An automated version using a Play Console service account was
built and then deliberately removed in favor of this simpler, more reliable
path.)

---

## Uptime monitoring

`.github/workflows/uptime-check.yml` pings the live site every 10 minutes
and fails loudly (retrying twice first) if it's down. No third-party
service — GitHub's own default failure-notification email is the alert.

---

## Cities covered vs. deliberately not covered

The `cities.js` sourcing comments document, city by city, why each included
tariff is trusted — and, just as importantly, several cities were
**researched and explicitly not added** because no reliable current source
existed, or because the local regulatory model doesn't fit this tool's
assumptions at all (e.g. a city with no meters and a zone-fare matrix
instead, or a country where fares became legally negotiable). If you're
asked to add a city that was previously skipped, check `cities.js`'s
comments first — the reason it was skipped may still apply.

---

## Contact

parag.airun@gmail.com
