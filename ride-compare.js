/**
 * MeterSahi? - ride-compare.js
 * Ride-hailing fare comparison: Uber/Ola/Rapido vs the metered
 * vehicle (auto rickshaw or taxi) correct fare.
 *
 * Fare formula (corrected):
 *   App fare = computeFare(same RTO tariff as the selected vehicle) + platformFee
 *
 * This mirrors how Uber/Ola/Rapido actually charge for autos - they
 * follow the RTO meter rate for the city and add a small platform fee.
 * The earlier formula (baseFare + perKm + perMin) was over-estimating by ~20%.
 *
 * Kochi / Ahmedabad fallback to Uber Go / Ola Mini where Auto is unavailable -
 * those use a separate per-km rate since they're not meter-regulated autos.
 *
 * CHANGELOG:
 * - Added taxi-mode support (Mumbai, Pune only). Each platform's
 *   per-city config can carry an optional `.taxi` sub-object; when the
 *   app.js vehicle-type toggle is set to 'taxi', estimateRideFare()
 *   and renderRideComparison() use that sub-object + CITY.taxiTariff
 *   instead of the auto config. Reflects the Sept 2025 MMRTA order
 *   requiring aggregators to follow the black-yellow taxi tariff in
 *   Mumbai (until a separate aggregator tariff is finalised).
 */

'use strict';

/* ════════════════════════════════════════════
   PLATFORM CONFIG  (per city)
   platform fee, availability, surge note.
   Fare is computed via RTO tariff — not a separate rate card.
   ════════════════════════════════════════════ */
const RIDE_PLATFORMS = {

  uber: {
    brand:     'Uber',
    color:     '#000000',
    logo:      '🚗',
    cities: {
      mumbai:    { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge up to 1.5× at peak hours',
                   taxi: { available: true, label: 'Uber Taxi', platformFee: 10, surge: 'Must follow RTO black-yellow taxi tariff (MMRTA order, Sept 2025)' } },
      delhi:     { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge pricing applicable' },
      bengaluru: { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge pricing applicable' },
      hyderabad: { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge pricing applicable' },
      pune:      { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Regulated fares from May 2025',
                   taxi: { available: true, label: 'Uber Taxi', platformFee: 10, surge: 'Must follow RTO black-yellow taxi tariff (statewide Maharashtra order)' } },
      kochi:     { available: true,  type: 'go',   label: 'Uber Go',    platformFee: 15,  surge: 'Surge pricing applicable',
                   // Uber Go (cab) — separate rate since it's not an auto
                   goPerKm: 16, goBase: 40, goMin: 65 },
      kolkata:   { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge pricing applicable' },
      chennai:   { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge pricing applicable' },
      ahmedabad: { available: true,  type: 'auto', label: 'Uber Auto',  platformFee: 8,   surge: 'Surge pricing applicable' },
    },
    deepLink: (pickupLat, pickupLng, pickupName, dropLat, dropLng, dropName) =>
      `https://m.uber.com/ul/?action=setPickup` +
      `&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&pickup[nickname]=${encodeURIComponent(pickupName)}` +
      `&dropoff[latitude]=${dropLat}&dropoff[longitude]=${dropLng}&dropoff[nickname]=${encodeURIComponent(dropName)}`,
    fallbackUrl: 'https://m.uber.com/looking',
  },

  ola: {
    brand:     'Ola',
    color:     '#F8511B',
    logo:      '🚕',
    cities: {
      mumbai:    { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply',
                   taxi: { available: true, label: 'Ola Taxi', platformFee: 10, surge: 'Must follow RTO black-yellow taxi tariff (MMRTA order, Sept 2025)' } },
      delhi:     { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply' },
      bengaluru: { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply' },
      hyderabad: { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply' },
      pune:      { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Regulated fares from May 2025',
                   taxi: { available: true, label: 'Ola Taxi', platformFee: 10, surge: 'Must follow RTO black-yellow taxi tariff (statewide Maharashtra order)' } },
      kochi:     { available: true,  type: 'mini', label: 'Ola Mini',   platformFee: 15,  surge: 'Dynamic pricing may apply',
                   goPerKm: 15, goBase: 40, goMin: 60 },
      kolkata:   { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply' },
      chennai:   { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply' },
      ahmedabad: { available: true,  type: 'auto', label: 'Ola Auto',   platformFee: 8,   surge: 'Dynamic pricing may apply' },
    },
    deepLink: (pickupLat, pickupLng, pickupName, dropLat, dropLng, dropName) =>
      `https://book.olacabs.com/?pickup_name=${encodeURIComponent(pickupName)}&pickup_lat=${pickupLat}&pickup_lng=${pickupLng}` +
      `&drop_name=${encodeURIComponent(dropName)}&drop_lat=${dropLat}&drop_lng=${dropLng}&category=auto`,
    fallbackUrl: 'https://www.olacabs.com/',
  },

  rapido: {
    brand:     'Rapido',
    color:     '#FFDD00',
    textColor: '#000000',
    logo:      '🛵',
    cities: {
      mumbai:    { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Dynamic pricing may apply',
                   taxi: { available: true, label: 'Rapido Taxi', platformFee: 7, surge: 'Must follow RTO black-yellow taxi tariff (MMRTA order, Sept 2025)' } },
      delhi:     { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Dynamic pricing may apply' },
      bengaluru: { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Dynamic pricing may apply' },
      hyderabad: { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Dynamic pricing may apply' },
      pune:      { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Regulated fares from May 2025',
                   taxi: { available: true, label: 'Rapido Taxi', platformFee: 7, surge: 'Must follow RTO black-yellow taxi tariff (statewide Maharashtra order)' } },
      kochi:     { available: false, type: 'auto', label: 'Rapido Auto', platformFee: 0,  surge: '' },
      kolkata:   { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Dynamic pricing may apply' },
      chennai:   { available: true,  type: 'auto', label: 'Rapido Auto', platformFee: 5,  surge: 'Dynamic pricing may apply' },
      ahmedabad: { available: false, type: 'auto', label: 'Rapido Auto', platformFee: 0,  surge: '' },
    },
    deepLink: () => 'https://rapido.bike/',
    fallbackUrl: 'https://rapido.bike/',
  },

};

/* ════════════════════════════════════════════
   FARE ESTIMATOR
   Uses the same RTO computeFare() as the auto meter,
   then adds platform fee on top.
   For Kochi/Ahmedabad cab fallbacks (Uber Go / Ola Mini),
   uses a simple base + perKm formula.
   ════════════════════════════════════════════ */
function estimateRideFare(platform, citySlug, distKm, waitMin, isNight, vehicleType) {
  const cityBase = platform.cities[citySlug];
  if (!cityBase) return null;

  // In taxi mode, use the platform's `.taxi` sub-config if present;
  // if a platform has no taxi variant for this city, it's simply
  // omitted from the taxi-mode comparison (not shown as auto).
  const city = (vehicleType === 'taxi') ? cityBase.taxi : cityBase;
  if (!city || !city.available) return null;

  const cityData = CITIES[citySlug];
  const tariff = cityData && (vehicleType === 'taxi' ? cityData.taxiTariff : cityData.tariff);
  if (!tariff) return null;

  let fare;

  if ((cityBase.type === 'go' || cityBase.type === 'mini') && cityBase.goPerKm) {
    // Cab fallback (not meter-regulated) — simple formula
    const raw = cityBase.goBase + (distKm * cityBase.goPerKm);
    fare = Math.max(cityBase.goMin, Math.round(raw));
  } else {
    // Auto/Taxi - same RTO formula as the meter, + platform fee
    const result = computeFare(distKm, waitMin, isNight, 0, tariff);
    fare = result.subtotal;
  }

  fare = Math.round(fare + city.platformFee);
  return { fare, city, platform };
}

/* ════════════════════════════════════════════
   RENDER COMPARISON SECTION
   ════════════════════════════════════════════ */
window.renderRideComparison = function(distKm, waitMin, autoFare, pickupName, dropName, pickupLat, pickupLng, dropLat, dropLng) {

  const section = document.getElementById('ride-compare-section');
  if (!section) return;

  const slug    = CITY_SLUG;
  const isNight = document.getElementById('ride-time').value === 'night';
  // `vehicleType` is declared in app.js ('auto' or 'taxi'); classic
  // <script> tags on the same page share one top-level lexical scope,
  // so this reads the live value without needing app.js to pass it in.
  const vt = (typeof vehicleType !== 'undefined') ? vehicleType : 'auto';
  const vehicleLabel = vt === 'taxi' ? 'Taxi' : 'Auto Rickshaw';
  const vehicleIcon  = vt === 'taxi' ? '🚕' : '🛺';

  const platforms = [
    { key: 'uber',   data: RIDE_PLATFORMS.uber   },
    { key: 'ola',    data: RIDE_PLATFORMS.ola    },
    { key: 'rapido', data: RIDE_PLATFORMS.rapido },
  ];

  const estimates = platforms.map(p => {
    const result = estimateRideFare(p.data, slug, distKm, waitMin, isNight, vt);
    return result ? { ...result, key: p.key } : null;
  }).filter(Boolean);

  if (!estimates.length) { section.style.display = 'none'; return; }

  estimates.sort((a, b) => a.fare - b.fare);

  const cheapest    = estimates[0];
  const autoIsChest = autoFare <= cheapest.fare;

  // Recommendation banner
  let recHTML = '';
  if (autoIsChest) {
    recHTML = `<div class="rc-recommendation rc-rec--auto">
      <span class="rc-rec-icon">${vehicleIcon}</span>
      <div>
        <strong>${vehicleLabel} is cheapest</strong>
        <p>The metered ${vehicleLabel.toLowerCase()} at ₹${autoFare} is cheaper than all app-based options. Stick with it!</p>
      </div>
    </div>`;
  } else {
    const saving = autoFare - cheapest.fare;
    recHTML = `<div class="rc-recommendation rc-rec--app">
      <span class="rc-rec-icon">${cheapest.platform.logo}</span>
      <div>
        <strong>${cheapest.city.label} is cheaper</strong>
        <p>Estimated ₹${cheapest.fare} — saves you ₹${saving} vs the metered ${vehicleLabel.toLowerCase()} fare of ₹${autoFare}.</p>
      </div>
    </div>`;
  }

  // Metered vehicle card (auto or taxi, depending on toggle)
  let cardsHTML = `
    <div class="rc-card rc-card--auto${autoIsChest ? ' rc-card--winner' : ''}">
      <div class="rc-card-header">
        <span class="rc-logo">${vehicleIcon}</span>
        <div>
          <div class="rc-brand">${vehicleLabel} <span class="rc-badge rc-badge--meter">Metered</span></div>
          <div class="rc-type">Street hail · No app needed</div>
        </div>
        ${autoIsChest ? '<span class="rc-cheapest-tag">Cheapest</span>' : ''}
      </div>
      <div class="rc-fare">₹${autoFare}</div>
      <div class="rc-fare-note">Correct meter fare · Official tariff</div>
      <div class="rc-surge-note"><i class="ti ti-info-circle"></i> No surge pricing. Government regulated.</div>
    </div>`;

  estimates.forEach((est, i) => {
    const p        = est.platform;
    const c        = est.city;
    const isWinner = !autoIsChest && i === 0;
    const deepLink = p.deepLink(pickupLat || '', pickupLng || '', pickupName, dropLat || '', dropLng || '', dropName);
    const isCab    = c.type === 'mini' || c.type === 'go';

    cardsHTML += `
    <div class="rc-card${isWinner ? ' rc-card--winner' : ''}">
      <div class="rc-card-header">
        <span class="rc-logo">${p.logo}</span>
        <div>
          <div class="rc-brand">${p.brand} <span class="rc-badge" style="background:${p.color};color:${p.textColor||'#fff'}">${c.label}</span></div>
          <div class="rc-type">App-based · ${isCab ? 'Cab (auto unavailable)' : vehicleLabel}</div>
        </div>
        ${isWinner ? '<span class="rc-cheapest-tag">Cheapest</span>' : ''}
      </div>
      <div class="rc-fare">₹${est.fare}</div>
      <div class="rc-fare-note">RTO meter rate + ₹${c.platformFee} platform fee · excl. surge</div>
      <div class="rc-surge-note"><i class="ti ti-alert-triangle"></i> ${c.surge}</div>
      <a href="${deepLink}" target="_blank" rel="noopener" class="rc-open-btn" style="background:${p.color};color:${p.textColor||'#fff'}">
        Open ${p.brand} <i class="ti ti-external-link"></i>
      </a>
    </div>`;
  });

  section.innerHTML = `
    <div class="rc-header">
      <h2 class="rc-title"><i class="ti ti-arrows-exchange"></i> Should you take a ${vehicleLabel.toLowerCase()} or book a ride?</h2>
      <p class="rc-subtitle">App fares use the same RTO meter rate as the ${vehicleLabel.toLowerCase()}, plus platform fee. Excludes surge pricing.</p>
    </div>
    ${recHTML}
    <div class="rc-cards">${cardsHTML}</div>
    <p class="rc-disclaimer">
      <i class="ti ti-info-circle"></i>
      Uber, Ola and Rapido follow the official RTO tariff for this city.
      App fare shown = correct meter fare + platform convenience fee. Surge pricing, tolls and
      promotions are not included. Always check the app for the live fare before booking.
      Rates last verified June 2025.
    </p>`;

  section.style.display = 'block';
};
