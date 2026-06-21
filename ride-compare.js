/**
 * MeterSahi? — ride-compare.js
 * Ride-hailing fare comparison: Uber Auto / Ola Auto / Rapido Auto
 * vs the metered auto rickshaw correct fare.
 *
 * Approach: Published rate-card estimation + deep-links to open each app.
 * Rates verified from official/published sources as of June 2025.
 * Uber Auto follows RTO meter rates in most cities (mandated in Mumbai Sep 2025).
 * All fares are ESTIMATES — actual app fares vary with surge pricing.
 */

'use strict';

/* ════════════════════════════════════════════
   PLATFORM RATE CARDS  (per city)
   ════════════════════════════════════════════
   Each entry:
     baseFare    — fixed booking/base fee (₹)
     perKm       — per km rate (₹)
     perMin      — per minute rate (₹) — used for wait time
     minFare     — minimum fare (₹)
     available   — true if service operates in this city
     type        — 'auto' | 'mini' | 'go'  (primary type shown)
     label       — display name in UI
     surge       — note about surge pricing
     platformFee — typical platform convenience fee (₹)
*/

const RIDE_PLATFORMS = {

  uber: {
    brand:   'Uber',
    color:   '#000000',
    logo:    '🚗',
    cities: {
      mumbai:    { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 30,  perKm: 20.66, perMin: 1.50, minFare: 50,  platformFee: 5,  surge: 'Surge up to 1.5× at peak hours' },
      delhi:     { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 25,  perKm: 14.00, perMin: 1.25, minFare: 50,  platformFee: 5,  surge: 'Surge pricing applicable' },
      bengaluru: { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 30,  perKm: 18.00, perMin: 1.50, minFare: 60,  platformFee: 5,  surge: 'Surge pricing applicable' },
      hyderabad: { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 20,  perKm: 14.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Surge pricing applicable' },
      pune:      { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 30,  perKm: 17.14, perMin: 1.50, minFare: 55,  platformFee: 5,  surge: 'Regulated fares from May 2025' },
      kochi:     { available: true,  type: 'go',   label: 'Uber Go',    baseFare: 40,  perKm: 16.00, perMin: 1.25, minFare: 65,  platformFee: 5,  surge: 'Surge pricing applicable' },
      kolkata:   { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 20,  perKm: 13.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Surge pricing applicable' },
      chennai:   { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 25,  perKm: 16.00, perMin: 1.25, minFare: 50,  platformFee: 5,  surge: 'Surge pricing applicable' },
      ahmedabad: { available: true,  type: 'auto', label: 'Uber Auto',  baseFare: 20,  perKm: 13.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Surge pricing applicable' },
    },
    deepLink: (pickupLat, pickupLng, pickupName, dropLat, dropLng, dropName) =>
      `https://m.uber.com/ul/?action=setPickup` +
      `&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&pickup[nickname]=${encodeURIComponent(pickupName)}` +
      `&dropoff[latitude]=${dropLat}&dropoff[longitude]=${dropLng}&dropoff[nickname]=${encodeURIComponent(dropName)}`,
    fallbackUrl: 'https://m.uber.com/looking',
  },

  ola: {
    brand:   'Ola',
    color:   '#F8511B',
    logo:    '🚕',
    cities: {
      mumbai:    { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 30,  perKm: 20.66, perMin: 1.50, minFare: 50,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      delhi:     { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 25,  perKm: 14.00, perMin: 1.25, minFare: 50,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      bengaluru: { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 30,  perKm: 18.00, perMin: 1.50, minFare: 60,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      hyderabad: { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 20,  perKm: 14.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      pune:      { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 30,  perKm: 17.14, perMin: 1.50, minFare: 55,  platformFee: 5,  surge: 'Regulated fares from May 2025' },
      kochi:     { available: true,  type: 'mini', label: 'Ola Mini',   baseFare: 40,  perKm: 15.00, perMin: 1.25, minFare: 60,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      kolkata:   { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 20,  perKm: 13.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      chennai:   { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 25,  perKm: 16.00, perMin: 1.25, minFare: 50,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      ahmedabad: { available: true,  type: 'auto', label: 'Ola Auto',   baseFare: 20,  perKm: 13.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
    },
    deepLink: (pickupLat, pickupLng, pickupName, dropLat, dropLng, dropName) =>
      `https://book.olacabs.com/?pickup_name=${encodeURIComponent(pickupName)}&pickup_lat=${pickupLat}&pickup_lng=${pickupLng}` +
      `&drop_name=${encodeURIComponent(dropName)}&drop_lat=${dropLat}&drop_lng=${dropLng}&category=auto`,
    fallbackUrl: 'https://www.olacabs.com/',
  },

  rapido: {
    brand:   'Rapido',
    color:   '#FFDD00',
    textColor: '#000',
    logo:    '🛵',
    cities: {
      mumbai:    { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 25,  perKm: 20.66, perMin: 1.25, minFare: 45,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      delhi:     { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 20,  perKm: 14.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      bengaluru: { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 25,  perKm: 18.00, perMin: 1.25, minFare: 50,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      hyderabad: { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 15,  perKm: 13.00, perMin: 1.00, minFare: 35,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      pune:      { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 25,  perKm: 17.14, perMin: 1.25, minFare: 45,  platformFee: 5,  surge: 'Regulated fares from May 2025' },
      kochi:     { available: false, type: 'auto', label: 'Rapido Auto', baseFare: 0,   perKm: 0,     perMin: 0,    minFare: 0,   platformFee: 0,  surge: '' },
      kolkata:   { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 15,  perKm: 13.00, perMin: 0.75, minFare: 35,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      chennai:   { available: true,  type: 'auto', label: 'Rapido Auto', baseFare: 20,  perKm: 15.00, perMin: 1.00, minFare: 40,  platformFee: 5,  surge: 'Dynamic pricing may apply' },
      ahmedabad: { available: false, type: 'auto', label: 'Rapido Auto', baseFare: 0,   perKm: 0,     perMin: 0,    minFare: 0,   platformFee: 0,  surge: '' },
    },
    deepLink: (_pl, _plng, _pn, _dl, _dlng, _dn) => 'https://rapido.bike/',
    fallbackUrl: 'https://rapido.bike/',
  },

};

/* ════════════════════════════════════════════
   FARE ESTIMATOR
   ════════════════════════════════════════════ */
function estimateRideFare(platform, citySlug, distKm, waitMin) {
  const city = platform.cities[citySlug];
  if (!city || !city.available) return null;

  const raw = city.baseFare + (distKm * city.perKm) + (waitMin * city.perMin) + city.platformFee;
  const fare = Math.max(city.minFare, Math.round(raw));
  return { fare, city, platform };
}

/* ════════════════════════════════════════════
   RENDER COMPARISON SECTION
   ════════════════════════════════════════════ */
window.renderRideComparison = function(distKm, waitMin, autoFare, pickupName, dropName, pickupLat, pickupLng, dropLat, dropLng) {

  const section = document.getElementById('ride-compare-section');
  if (!section) return;

  const slug = CITY_SLUG;
  const platforms = [
    { key: 'uber',   data: RIDE_PLATFORMS.uber   },
    { key: 'ola',    data: RIDE_PLATFORMS.ola    },
    { key: 'rapido', data: RIDE_PLATFORMS.rapido },
  ];

  // Build estimates
  const estimates = platforms.map(p => {
    const result = estimateRideFare(p.data, slug, distKm, waitMin);
    return result ? { ...result, key: p.key } : null;
  }).filter(Boolean);

  if (!estimates.length) { section.style.display = 'none'; return; }

  // Sort cheapest first
  estimates.sort((a, b) => a.fare - b.fare);

  const cheapest = estimates[0];
  const autoIsChest = autoFare <= cheapest.fare;

  // Recommendation banner
  let recHTML = '';
  if (autoIsChest) {
    recHTML = `<div class="rc-recommendation rc-rec--auto">
      <span class="rc-rec-icon">🛺</span>
      <div>
        <strong>Auto rickshaw is cheapest</strong>
        <p>The metered auto at ₹${autoFare} is cheaper than all app-based options. Stick with the auto!</p>
      </div>
    </div>`;
  } else {
    recHTML = `<div class="rc-recommendation rc-rec--app">
      <span class="rc-rec-icon">${cheapest.city.logo || '📱'}</span>
      <div>
        <strong>${cheapest.city.label} is cheaper</strong>
        <p>Estimated ₹${cheapest.fare} — saves you about ₹${cheapest.fare - autoFare > 0 ? autoFare - cheapest.fare : cheapest.fare - autoFare} vs the metered auto fare of ₹${autoFare}.</p>
      </div>
    </div>`;
  }

  // Cards
  // Auto card first
  let cardsHTML = `
    <div class="rc-card rc-card--auto${autoIsChest ? ' rc-card--winner' : ''}">
      <div class="rc-card-header">
        <span class="rc-logo">🛺</span>
        <div>
          <div class="rc-brand">Auto Rickshaw <span class="rc-badge rc-badge--meter">Metered</span></div>
          <div class="rc-type">Street hail · No app needed</div>
        </div>
        ${autoIsChest ? '<span class="rc-cheapest-tag">Cheapest</span>' : ''}
      </div>
      <div class="rc-fare">₹${autoFare}</div>
      <div class="rc-fare-note">Correct meter fare · Official tariff</div>
      <div class="rc-surge-note"><i class="ti ti-info-circle"></i> No surge pricing. Government regulated.</div>
    </div>`;

  estimates.forEach((est, i) => {
    const p = est.platform;
    const c = est.city;
    const isWinner = !autoIsChest && i === 0;
    const deepLink = p.deepLink(pickupLat || '', pickupLng || '', pickupName, dropLat || '', dropLng || '', dropName);

    cardsHTML += `
    <div class="rc-card${isWinner ? ' rc-card--winner' : ''}">
      <div class="rc-card-header">
        <span class="rc-logo">${p.logo}</span>
        <div>
          <div class="rc-brand">${p.brand} <span class="rc-badge" style="background:${p.color};color:${p.textColor||'#fff'}">${c.label}</span></div>
          <div class="rc-type">App-based · ${c.type === 'mini' || c.type === 'go' ? 'Cab (fallback)' : 'Auto'}</div>
        </div>
        ${isWinner ? '<span class="rc-cheapest-tag">Cheapest</span>' : ''}
      </div>
      <div class="rc-fare">₹${est.fare}<span class="rc-fare-range">–₹${est.fare + 30}</span></div>
      <div class="rc-fare-note">Est. incl. ₹${c.platformFee} platform fee · excl. surge</div>
      <div class="rc-surge-note"><i class="ti ti-alert-triangle"></i> ${c.surge}</div>
      <a href="${deepLink}" target="_blank" rel="noopener" class="rc-open-btn" style="background:${p.color};color:${p.textColor||'#fff'}">
        Open ${p.brand} <i class="ti ti-external-link"></i>
      </a>
    </div>`;
  });

  section.innerHTML = `
    <div class="rc-header">
      <h2 class="rc-title"><i class="ti ti-arrows-exchange"></i> Should you take an auto or book a ride?</h2>
      <p class="rc-subtitle">Estimated fares for your route — based on published rate cards. Actual app fares may vary with surge pricing.</p>
    </div>
    ${recHTML}
    <div class="rc-cards">${cardsHTML}</div>
    <p class="rc-disclaimer">
      <i class="ti ti-info-circle"></i>
      App fare estimates use published base rates + platform fees. Surge pricing, traffic tolls, and promotions are not included.
      Always check the app for the live fare before booking. Rates last verified June 2025.
    </p>`;

  section.style.display = 'block';
};
