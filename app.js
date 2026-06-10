/**
 * MeterSahi? — Mumbai Auto Rickshaw Fare Checker
 * Official tariff: Maharashtra Motor Vehicle Dept, w.e.f. 1 February 2025
 */

/* ── TARIFF CONSTANTS ── */
const TARIFF = {
  MIN_FARE:           26,
  MIN_KM:             1.5,
  RATE_PER_KM:        17.14,
  WAIT_RATE_PER_MIN:  1.714,
  NIGHT_MULTIPLIER:   1.25,
  LUGGAGE_PER_PIECE:  6,
  TOLERANCE:          5,
  STANDSTILL_FACTOR:  0.60,
};

/* ── STATE ── */
let mapInstance         = null;
let directionsService   = null;
let directionsRenderer  = null;
let mapReady            = false;
let lastRouteData       = null;

/* ════════════════════════════════════════════
   SEARCHABLE SELECT — custom dropdown widget
   ════════════════════════════════════════════ */

/**
 * Build and wire up a searchable select dropdown.
 * @param {string} wrapperId  — id of .searchable-select div
 * @param {string} inputId    — id of the .ss-input element
 * @param {string} dropdownId — id of the .ss-dropdown element
 * @param {string[]} options  — full list of option strings
 * @param {function} onChange — called with selected value string
 */
function buildSearchableSelect(wrapperId, inputId, dropdownId, options, onChange) {
  const wrapper   = document.getElementById(wrapperId);
  const input     = document.getElementById(inputId);
  const dropdown  = document.getElementById(dropdownId);

  // Build dropdown inner HTML (search box + list)
  dropdown.innerHTML = `
    <div class="ss-search-wrap">
      <input class="ss-search" type="text" placeholder="Type to search…" autocomplete="off" />
    </div>
    <div class="ss-list"></div>`;

  const searchInput = dropdown.querySelector('.ss-search');
  const list        = dropdown.querySelector('.ss-list');

  function renderList(filter) {
    const q = (filter || '').toUpperCase().trim();
    const filtered = q ? options.filter(o => o.toUpperCase().includes(q)) : options;
    if (filtered.length === 0) {
      list.innerHTML = '<div class="ss-no-results">No results</div>';
      return;
    }
    list.innerHTML = filtered.map(o =>
      `<div class="ss-option${input.value === o ? ' selected' : ''}" data-value="${o}">${o}</div>`
    ).join('');
    list.querySelectorAll('.ss-option').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectOption(el.dataset.value);
      });
    });
  }

  function selectOption(value) {
    input.value = value;
    input.classList.add('has-value');
    closeDropdown();
    updatePlatePreview();
    if (onChange) onChange(value);
  }

  function openDropdown() {
    dropdown.classList.add('open');
    searchInput.value = '';
    renderList('');
    setTimeout(() => searchInput.focus(), 50);
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
  }

  // Open on input click
  input.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('open')) {
      closeDropdown();
    } else {
      // Close all other dropdowns first
      document.querySelectorAll('.ss-dropdown.open').forEach(d => d.classList.remove('open'));
      openDropdown();
    }
  });

  // Live search filter
  searchInput.addEventListener('input', () => renderList(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
    if (e.key === 'Enter') {
      const first = list.querySelector('.ss-option');
      if (first) selectOption(first.dataset.value);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeDropdown();
  });

  // Initial render
  renderList('');
}

/* ── VEHICLE NUMBER DATA ── */

// All Indian state/UT codes
const STATE_CODES = [
  'AN','AP','AR','AS','BR','CG','CH','DD','DL','DN',
  'GA','GJ','HP','HR','JH','JK','KA','KL','LA','LD',
  'MH','ML','MN','MP','MZ','NL','OD','PB','PY','RJ',
  'SK','TN','TR','TS','UK','UP','WB'
];

// District numbers 01–99
const DISTRICT_CODES = Array.from({length: 99}, (_, i) => String(i + 1).padStart(2, '0'));

// Series: A, B, … Z, AA, AB, … ZZ, AAA, … ZZZ
function generateSeries() {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const series = [];
  // Single letters A–Z
  alpha.forEach(a => series.push(a));
  // Two letters AA–ZZ
  alpha.forEach(a => alpha.forEach(b => series.push(a + b)));
  // Three letters AAA–ZZZ
  alpha.forEach(a => alpha.forEach(b => alpha.forEach(c => series.push(a + b + c))));
  return series;
}
const SERIES_CODES = generateSeries(); // 26 + 676 + 17576 = 18278 entries

// Numbers 0001–9999
const NUMBER_CODES = Array.from({length: 9999}, (_, i) => String(i + 1).padStart(4, '0'));

/* ── INIT SEARCHABLE SELECTS ── */
function initVehicleSelects() {
  buildSearchableSelect('ss-state',    'vn-state-input',    'ss-state-dropdown',    STATE_CODES,    updatePlatePreview);
  buildSearchableSelect('ss-district', 'vn-district-input', 'ss-district-dropdown', DISTRICT_CODES, updatePlatePreview);
  buildSearchableSelect('ss-series',   'vn-series-input',   'ss-series-dropdown',   SERIES_CODES,   updatePlatePreview);
  buildSearchableSelect('ss-number',   'vn-number-input',   'ss-number-dropdown',   NUMBER_CODES,   updatePlatePreview);
}

function updatePlatePreview() {
  const s1 = document.getElementById('vn-state-input').value;
  const s2 = document.getElementById('vn-district-input').value;
  const s3 = document.getElementById('vn-series-input').value;
  const s4 = document.getElementById('vn-number-input').value;

  // Show or update the plate preview
  let preview = document.getElementById('plate-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'plate-preview';
    preview.className = 'plate-preview';
    const row = document.querySelector('.vehicle-number-row');
    if (row) row.insertAdjacentElement('afterend', preview);
  }
  const parts = [s1 || 'XX', s2 || '00', s3 || 'XXX', s4 || '0000'];
  preview.textContent = parts.join(' – ');
}

/* ── FEEDBACK FLOW ── */
window.handleFeedback = function(answer) {
  // Highlight selected button
  document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(answer === 'yes' ? '.feedback-btn--yes' : '.feedback-btn--no');
  if (btn) btn.classList.add('selected');

  const reportSection = document.getElementById('report-vehicle-section');
  if (answer === 'no') {
    reportSection.style.display = 'block';
    // Reset confirmation
    document.getElementById('report-confirmation').style.display = 'none';
    document.getElementById('btn-submit-report').style.display = 'flex';
    // Init selects (safe to call multiple times)
    initVehicleSelects();
    // Scroll to report section smoothly
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    reportSection.style.display = 'none';
  }
};

window.submitReport = function() {
  const state    = document.getElementById('vn-state-input').value;
  const district = document.getElementById('vn-district-input').value;
  const series   = document.getElementById('vn-series-input').value;
  const number   = document.getElementById('vn-number-input').value;

  if (!state || !district || !series || !number) {
    alert('Please select all four parts of the vehicle number plate.');
    return;
  }

  const plateNo = `${state} ${district} ${series} ${number}`;
  console.log('Report submitted for vehicle:', plateNo, '| Route data:', lastRouteData);

  // Hide submit button, show confirmation
  document.getElementById('btn-submit-report').style.display = 'none';
  const conf = document.getElementById('report-confirmation');
  conf.style.display = 'flex';
  conf.querySelector
    ? conf.innerHTML = `<i class="ti ti-circle-check" aria-hidden="true"></i> Report for <strong>${plateNo}</strong> submitted. Thank you for helping keep Mumbai's autos honest!`
    : null;
};

/* ════════════════════════════════════════════
   GOOGLE MAPS INIT
   ════════════════════════════════════════════ */
window.initMap = function () {
  mapReady = true;
  try {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#f59e0b',
        strokeWeight: 4,
        strokeOpacity: 0.85,
      },
    });

    mapInstance = new google.maps.Map(document.getElementById('map'), {
      zoom: 13,
      center: { lat: 19.076, lng: 72.8777 },
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    directionsRenderer.setMap(mapInstance);

    const mumbaiBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(18.85, 72.75),
      new google.maps.LatLng(19.32, 73.05)
    );
    const acOptions = {
      bounds: mumbaiBounds,
      strictBounds: false,
      componentRestrictions: { country: 'in' },
    };

    new google.maps.places.Autocomplete(document.getElementById('pickup'),  acOptions);
    new google.maps.places.Autocomplete(document.getElementById('dropoff'), acOptions);

  } catch (err) {
    console.warn('Google Maps init error:', err);
    mapReady = false;
  }
};

window.handleMapError = function () {
  mapReady = false;
};

/* ════════════════════════════════════════════
   FARE CALCULATION
   ════════════════════════════════════════════ */
window.calculateFare = function () {
  const pickup  = document.getElementById('pickup').value.trim();
  const dropoff = document.getElementById('dropoff').value.trim();

  if (!pickup || !dropoff) {
    alert('Please enter both a pickup and a drop-off location.');
    return;
  }

  const isNight    = document.getElementById('ride-time').value === 'night';
  const luggage    = parseInt(document.getElementById('luggage').value, 10);
  const actualFare = parseActualFare();

  setLoading(true);
  hideResults();

  if (mapReady && directionsService) {
    directionsService.route(
      {
        origin:      pickup  + (pickup.toLowerCase().includes('mumbai')  ? '' : ', Mumbai'),
        destination: dropoff + (dropoff.toLowerCase().includes('mumbai') ? '' : ', Mumbai'),
        travelMode:  google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel:  google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setLoading(false);
        if (status === google.maps.DirectionsStatus.OK) {
          handleDirectionsResult(result, isNight, luggage, actualFare, pickup, dropoff);
        } else {
          showManualFallback(pickup, dropoff, isNight, luggage, actualFare);
        }
      }
    );
  } else {
    setTimeout(() => {
      setLoading(false);
      showManualFallback(pickup, dropoff, isNight, luggage, actualFare);
    }, 500);
  }
};

function handleDirectionsResult(result, isNight, luggage, actualFare, pickup, dropoff) {
  directionsRenderer.setDirections(result);
  const leg = result.routes[0].legs[0];

  const distKm              = leg.distance.value / 1000;
  const durationFreeSec     = leg.duration.value;
  const durationTrafficSec  = leg.duration_in_traffic ? leg.duration_in_traffic.value : durationFreeSec;
  const totalMinutes        = durationTrafficSec / 60;
  const trafficDelaySec     = Math.max(0, durationTrafficSec - durationFreeSec);
  const waitMinutes         = (trafficDelaySec * TARIFF.STANDSTILL_FACTOR) / 60;

  lastRouteData = { distKm, totalMinutes, waitMinutes, isNight, luggage, actualFare, pickup, dropoff };
  renderResults(distKm, totalMinutes, waitMinutes, isNight, luggage, actualFare);
}

function computeFare(distKm, waitMin, isNight, luggagePieces) {
  let base = distKm <= TARIFF.MIN_KM
    ? TARIFF.MIN_FARE
    : Math.max(TARIFF.MIN_FARE, Math.round(distKm * TARIFF.RATE_PER_KM));

  const waitCharge    = Math.round(waitMin * TARIFF.WAIT_RATE_PER_MIN);
  const luggageCharge = luggagePieces * TARIFF.LUGGAGE_PER_PIECE;
  let subtotal = base + waitCharge + luggageCharge;
  let nightAdd = 0;

  if (isNight) {
    const withNight = Math.round(subtotal * TARIFF.NIGHT_MULTIPLIER);
    nightAdd  = withNight - subtotal;
    subtotal  = withNight;
  }

  return { base, waitCharge, luggageCharge, nightAdd, subtotal };
}

/* ════════════════════════════════════════════
   RENDER RESULTS
   ════════════════════════════════════════════ */
function renderResults(distKm, totalMin, waitMin, isNight, luggage, actualFare) {
  const fare = computeFare(distKm, waitMin, isNight, luggage);

  document.getElementById('empty-state').style.display    = 'none';
  document.getElementById('result-content').style.display = 'flex';

  // Metrics
  const waitMins = Math.floor(waitMin);
  const waitSecs = Math.round((waitMin % 1) * 60);
  document.getElementById('metrics-row').innerHTML = `
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-road" aria-hidden="true"></i> Distance</div>
      <div class="metric-value">${distKm.toFixed(1)}</div>
      <div class="metric-unit">km</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-clock" aria-hidden="true"></i> Journey</div>
      <div class="metric-value">${Math.round(totalMin)}</div>
      <div class="metric-unit">min (with traffic)</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-traffic-cone" aria-hidden="true"></i> Wait time</div>
      <div class="metric-value">${waitMins}m ${waitSecs}s</div>
      <div class="metric-unit">est. standstill</div>
    </div>`;

  // Verdict
  const verdictEl = document.getElementById('verdict-box');
  if (actualFare !== null) {
    const low  = fare.subtotal - TARIFF.TOLERANCE;
    const high = fare.subtotal + TARIFF.TOLERANCE;
    const diff = actualFare - fare.subtotal;

    if (actualFare >= low && actualFare <= high) {
      verdictEl.innerHTML = `
        <div class="verdict--ok">
          <div class="verdict-emoji">✅</div>
          <div class="verdict-title">Meter looks correct</div>
          <div class="verdict-body">Driver charged <strong>₹${actualFare}</strong> — within the acceptable ±₹${TARIFF.TOLERANCE} band of the correct fare <strong>₹${fare.subtotal}</strong>. No tampering detected.</div>
        </div>`;
    } else if (actualFare > high) {
      const pct = Math.round((diff / fare.subtotal) * 100);
      verdictEl.innerHTML = `
        <div class="verdict--tampered">
          <div class="verdict-emoji">🚨</div>
          <div class="verdict-title">Possible meter tampering</div>
          <div class="verdict-body">Driver charged <strong>₹${actualFare}</strong> but correct fare is <strong>₹${fare.subtotal}</strong>. That's <span class="overcharge-amount">₹${diff} extra (${pct}% overcharge)</span>. You are within your rights to refuse the excess and file a complaint.</div>
        </div>`;
    } else {
      verdictEl.innerHTML = `
        <div class="verdict--neutral">
          <div class="verdict-emoji">ℹ️</div>
          <div class="verdict-title">Fare is lower than expected</div>
          <div class="verdict-body">Driver charged <strong>₹${actualFare}</strong>, our estimate is <strong>₹${fare.subtotal}</strong>. The driver may have taken a shorter route or skipped wait charges in your favour.</div>
        </div>`;
    }
  } else {
    verdictEl.innerHTML = `
      <div class="verdict--neutral">
        <div class="verdict-emoji">🧮</div>
        <div class="verdict-title">Correct fare: ₹${fare.subtotal}</div>
        <div class="verdict-body">Acceptable range: <strong>₹${fare.subtotal - TARIFF.TOLERANCE} – ₹${fare.subtotal + TARIFF.TOLERANCE}</strong>. Enter the meter reading above and recalculate to check for tampering.</div>
      </div>`;
  }

  // Breakdown
  let rows = `
    <div class="breakdown-row">
      <span>Base fare (${distKm.toFixed(1)} km${distKm <= TARIFF.MIN_KM ? ', minimum' : ''})</span>
      <span class="amount">₹${fare.base}</span>
    </div>`;
  if (fare.waitCharge > 0) rows += `
    <div class="breakdown-row">
      <span>Wait time (${waitMins}m ${waitSecs}s)</span>
      <span class="amount">₹${fare.waitCharge}</span>
    </div>`;
  if (fare.luggageCharge > 0) rows += `
    <div class="breakdown-row">
      <span>Luggage (${luggage} piece${luggage > 1 ? 's' : ''})</span>
      <span class="amount">₹${fare.luggageCharge}</span>
    </div>`;
  if (isNight && fare.nightAdd > 0) rows += `
    <div class="breakdown-row">
      <span>Night surcharge (+25%) <span class="tag-night">12 AM – 5 AM</span></span>
      <span class="amount">+₹${fare.nightAdd}</span>
    </div>`;
  rows += `
    <div class="breakdown-row">
      <span>Total correct fare</span>
      <span class="amount">₹${fare.subtotal}</span>
    </div>`;

  document.getElementById('breakdown-box').innerHTML = `
    <div class="breakdown-title">Fare breakdown</div>
    ${rows}
    <div class="fare-band-label">Tolerance band: ₹${fare.subtotal - TARIFF.TOLERANCE} – ₹${fare.subtotal + TARIFF.TOLERANCE}</div>`;

  // Show feedback section
  const fb = document.getElementById('feedback-section');
  fb.style.display = 'block';
  // Reset feedback state
  document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('report-vehicle-section').style.display = 'none';
  document.getElementById('report-confirmation').style.display = 'none';
  document.getElementById('btn-submit-report').style.display = 'flex';

  document.getElementById('manual-fallback').style.display = 'none';
}

/* ── MANUAL FALLBACK ── */
function showManualFallback(pickup, dropoff, isNight, luggage, actualFare) {
  document.getElementById('empty-state').style.display    = 'none';
  document.getElementById('result-content').style.display = 'flex';
  document.getElementById('metrics-row').innerHTML        = '';
  document.getElementById('verdict-box').innerHTML        = '';
  document.getElementById('breakdown-box').innerHTML      = '';
  document.getElementById('feedback-section').style.display = 'none';

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&travelmode=driving`;
  document.getElementById('maps-link').href = mapsUrl;
  document.getElementById('manual-fallback').style.display = 'block';

  document.getElementById('manual-btn').onclick = function () {
    const km   = parseFloat(document.getElementById('manual-km').value);
    const wait = parseFloat(document.getElementById('manual-wait').value) || 0;
    if (isNaN(km) || km <= 0) { alert('Please enter a valid distance in km.'); return; }
    const totalMin = (km / 20) * 60 + wait;
    renderResults(km, totalMin, wait, isNight, luggage, actualFare);
  };
}

/* ── HELPERS ── */
function parseActualFare() {
  const raw = document.getElementById('actual-fare').value.trim();
  if (!raw) return null;
  const val = parseFloat(raw);
  return isNaN(val) || val <= 0 ? null : val;
}

function setLoading(on) {
  const btn     = document.getElementById('calc-btn');
  const spinner = document.getElementById('spinner');
  btn.disabled  = on;
  spinner.classList.toggle('visible', on);
  spinner.setAttribute('aria-hidden', on ? 'false' : 'true');
}

function hideResults() {
  document.getElementById('empty-state').style.display    = 'block';
  document.getElementById('result-content').style.display = 'none';
}

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('DOMContentLoaded', () => {
  ['pickup', 'dropoff', 'actual-fare'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculateFare(); } });
  });
});
