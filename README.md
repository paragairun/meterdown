# 🛺 MeterSahi? — Mumbai Auto Rickshaw Fare Checker

A civic utility portal that helps Mumbai commuters verify whether their autorickshaw meter is correct or tampered, using real-time Google Maps routing and the official Maharashtra tariff.

**Live demo:** Upload to GitHub Pages or any static host and open `index.html`.

---

## What it does

1. **Enter pickup & drop-off** — Google Maps Places autocomplete suggests Mumbai locations.
2. **Fetch live route** — Uses Google Maps Directions API with real-time traffic to get distance (km) and journey duration.
3. **Estimate wait time** — Traffic delay (difference between free-flow and traffic-adjusted duration) × 0.60 approximates genuine standstill time — the portion that accrues meter wait charges.
4. **Calculate the correct fare** — Applies the exact official formula.
5. **Compare with your meter** — Enter what the driver asked. The portal tells you if it's ✅ correct, 🚨 tampered, or just unexpectedly low.

---

## Fare formula (w.e.f. 1 February 2025)

| Component | Rate |
|---|---|
| Minimum fare | ₹26 (up to ~1.5 km) |
| Per km rate | ₹17.14/km |
| Waiting charge | ₹1.71/min (10% of per-km rate) |
| Night surcharge | +25% (12:00 AM – 5:00 AM) |
| Luggage (>60×40 cm) | ₹6 per piece |
| Tolerance band | ±₹5 (for meter rounding) |

**Source:** Maharashtra Motor Vehicle Department — [Official Tariff Card PDF](https://transport.maharashtra.gov.in/Site/Upload/GR/Auto%20Rickshaw%20Tariff%20Card.pdf)

---

## File structure

```
mumbai-auto-fare-checker/
├── index.html   ← Page structure and layout
├── style.css    ← All styles (no frameworks)
├── app.js       ← Fare logic, Google Maps integration
└── README.md    ← This file
```

No build step. No dependencies beyond Google Maps JS API and two Google Fonts. Pure HTML + CSS + JS.

---

## Setup

### 1. Google Maps API key

The project uses the **Maps JavaScript API** with these libraries:
- `places` — autocomplete for location inputs
- `directions` — route fetching with traffic

In `index.html`, the Maps script tag near the bottom already has the API key:

```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap"
  async defer onerror="handleMapError()"
></script>
```

Replace `YOUR_API_KEY` with your key from [Google Cloud Console](https://console.cloud.google.com/).

**Required APIs to enable in your Google Cloud project:**
- Maps JavaScript API
- Places API
- Directions API

### 2. Restrict your API key (important)

Go to Google Cloud Console → Credentials → your key → **Application restrictions**:
- Select **HTTP referrers (websites)**
- Add your domain (e.g. `https://yourusername.github.io/*`)

This prevents unauthorised use of your key.

### 3. Deploy to GitHub Pages

1. Push all files to a GitHub repository.
2. Go to **Settings → Pages**.
3. Set source to `main` branch, `/ (root)`.
4. Your site will be live at `https://yourusername.github.io/repo-name/`.

---

## How wait time is calculated

Auto meters charge for waiting time — every minute the vehicle is stationary (at signals, in traffic jams). Google Maps does not directly expose standstill seconds, so we estimate it:

```
trafficDelaySec  = duration_in_traffic − duration (free-flow)
waitMinutes      = trafficDelaySec × 0.60 / 60
```

The 0.60 factor reflects that roughly 60% of traffic delay is genuine standstill (not slow rolling). This is conservative — real standstill can be higher in heavy Mumbai traffic, so the estimate errs slightly in the passenger's favour.

---

## Manual fallback

If Google Maps fails to load (network issue, API quota, etc.), the portal shows a fallback form where you can type in the distance manually and get a direct link to check the route on Google Maps.

---

## Complaint options if meter is tampered

| Channel | Details |
|---|---|
| Maharashtra Transport Helpline | **1800-233-1922** (toll-free, 24×7) |
| Regional Transport Office | Visit with the auto's number plate and your trip details |
| Online | [Aaple Sarkar portal](https://aaplesarkar.mahaonline.gov.in) |

---

## Contributing

Pull requests welcome. Some ideas:
- Add a fare history / trip log (localStorage)
- Add Pune / Nashik / Nagpur tariff support
- PWA offline support
- Marathi language toggle

---

## Licence

MIT — free to use, share, and modify. Not an official government portal.
