/**
 * MeterSahi? — Mumbai Auto Rickshaw Fare Checker
 * Official tariff: Maharashtra Motor Vehicle Dept, w.e.f. 1 February 2025
 *
 * Fare formula:
 *   Base fare  = max(MIN_FARE, round(distKm × RATE_PER_KM))
 *   Wait charge = round(waitMin × WAIT_RATE_PER_MIN)
 *   Luggage     = pieces × LUGGAGE_PER_PIECE
 *   Subtotal    = base + wait + luggage
 *   Night ride  = round(subtotal × 1.25)
 *
 * Wait time estimation:
 *   Google Maps returns duration (free-flow) and duration_in_traffic.
 *   Traffic delay = duration_in_traffic − duration (clamped ≥ 0).
 *   ~60% of that delay represents genuine standstill time (signal stops,
 *   congestion queues) — the portion that accrues meter wait charges.
 */

/* ── TARIFF CONSTANTS (w.e.f. 1 Feb 2025) ── */
const TARIFF = {
  MIN_FARE:           26,       // ₹ minimum fare (up to ~1.5 km)
  MIN_KM:             1.5,      // km before per-km kicks in
  RATE_PER_KM:        17.14,    // ₹/km
  WAIT_RATE_PER_MIN:  1.714,    // ₹/min (10% of per-km rate)
  NIGHT_MULTIPLIER:   1.25,     // 12 AM – 5 AM surcharge
  LUGGAGE_PER_PIECE:  6,        // ₹ per oversized piece
  TOLERANCE:          5,        // ₹ acceptable rounding difference
  STANDSTILL_FACTOR:  0.60,     // fraction of traffic delay = true standstill
};

/* ── STATE ── */
let mapInstance        = null;
let directionsService  = null;
let directionsRenderer = null;
let autocompletePickup = null;
let autocompleteDropoff = null;
let mapReady           = false;
let lastRouteData      = null;  // stored for manual recalculate

/* ── MAP INIT (called by Google Maps callback) ── */
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
      mapTypeControl: false,
      streetViewControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    directionsRenderer.setMap(mapInstance);

    // Mumbai bounding box for autocomplete bias
    const mumbaiBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(18.85, 72.75),
      new google.maps.LatLng(19.32, 73.05)
    );
    const acOptions = {
      bounds: mumbaiBounds,
      strictBounds: false,
      componentRestrictions: { country: 'in' },
    };

    autocompletePickup  = new google.maps.places.Autocomplete(document.getElementById('pickup'),  acOptions);
    autocompleteDropoff = new google.maps.places.Autocomplete(document.getElementById('dropoff'), acOptions);

    // Prevent form submit on autocomplete Enter
    autocompletePickup.addListener('keydown', preventEnterSubmit);
    autocompleteDropoff.addListener('keydown', preventEnterSubmit);

  } catch (err) {
    console.warn('Google Maps init error:', err);
    mapReady = false;
  }
};

window.handleMapError = function () {
  mapReady = false;
  console.warn('Google Maps failed to load. Manual fallback will be used.');
};

function preventEnterSubmit(e) {
  if (e.key === 'Enter') e.preventDefault();
}

/* ── MAIN CALCULATE FUNCTION ── */
window.calculateFare = function () {
  const pickup  = document.getElementById('pickup').value.trim();
  const dropoff = document.getElementById('dropoff').value.trim();

  if (!pickup || !dropoff) {
    showInputError('Please enter both a pickup and a drop-off location.');
    return;
  }

  const isNight     = document.getElementById('ride-time').value === 'night';
  const luggage     = parseInt(document.getElementById('luggage').value, 10);
  const actualFare  = parseActualFare();

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
          console.warn('Directions API status:', status);
          showManualFallback(pickup, dropoff, isNight, luggage, actualFare);
        }
      }
    );
  } else {
    // Maps not available — go straight to manual fallback
    setTimeout(() => {
      setLoading(false);
      showManualFallback(pickup, dropoff, isNight, luggage, actualFare);
    }, 500);
  }
};

/* ── HANDLE DIRECTIONS RESULT ── */
function handleDirectionsResult(result, isNight, luggage, actualFare, pickup, dropoff) {
  directionsRenderer.setDirections(result);

  const leg = result.routes[0].legs[0];

  const distKm         = leg.distance.value / 1000;
  const durationFreeSec = leg.duration.value;
  const durationTrafficSec = leg.duration_in_traffic
    ? leg.duration_in_traffic.value
    : durationFreeSec;

  const totalMinutes   = durationTrafficSec / 60;
  const trafficDelaySec = Math.max(0, durationTrafficSec - durationFreeSec);
  const waitMinutes    = (trafficDelaySec * TARIFF.STANDSTILL_FACTOR) / 60;

  lastRouteData = { distKm, totalMinutes, waitMinutes, isNight, luggage, actualFare, pickup, dropoff };

  renderResults(distKm, totalMinutes, waitMinutes, isNight, luggage, actualFare);
}

/* ── FARE CALCULATION ── */
function computeFare(distKm, waitMin, isNight, luggagePieces) {
  let base;
  if (distKm <= TARIFF.MIN_KM) {
    base = TARIFF.MIN_FARE;
  } else {
    base = Math.round(distKm * TARIFF.RATE_PER_KM);
    if (base < TARIFF.MIN_FARE) base = TARIFF.MIN_FARE;
  }

  const waitCharge    = Math.round(waitMin * TARIFF.WAIT_RATE_PER_MIN);
  const luggageCharge = luggagePieces * TARIFF.LUGGAGE_PER_PIECE;

  let subtotal = base + waitCharge + luggageCharge;
  let nightAdd = 0;
  if (isNight) {
    const withNight = Math.round(subtotal * TARIFF.NIGHT_MULTIPLIER);
    nightAdd = withNight - subtotal;
    subtotal = withNight;
  }

  return { base, waitCharge, luggageCharge, nightAdd, subtotal };
}

/* ── RENDER RESULTS ── */
function renderResults(distKm, totalMin, waitMin, isNight, luggage, actualFare) {
  const fare = computeFare(distKm, waitMin, isNight, luggage);
  document.getElementById('empty-state').style.display  = 'none';
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
          <div class="verdict-body">
            Driver charged <strong>₹${actualFare}</strong> — within the acceptable ±₹${TARIFF.TOLERANCE} band
            of the correct fare <strong>₹${fare.subtotal}</strong>. No tampering detected.
          </div>
        </div>`;
    } else if (actualFare > high) {
      const pct = Math.round((diff / fare.subtotal) * 100);
      verdictEl.innerHTML = `
        <div class="verdict--tampered">
          <div class="verdict-emoji">🚨</div>
          <div class="verdict-title">Possible meter tampering</div>
          <div class="verdict-body">
            Driver charged <strong>₹${actualFare}</strong> but the correct fare is <strong>₹${fare.subtotal}</strong>.
            That's <span class="overcharge-amount">₹${diff} extra (${pct}% overcharge)</span>.
            You are within your rights to refuse to pay the excess and file a complaint.
          </div>
        </div>`;
    } else {
      verdictEl.innerHTML = `
        <div class="verdict--neutral">
          <div class="verdict-emoji">ℹ️</div>
          <div class="verdict-title">Fare is lower than expected</div>
          <div class="verdict-body">
            Driver charged <strong>₹${actualFare}</strong>, our estimate is <strong>₹${fare.subtotal}</strong>.
            The driver may have taken a shorter route, or skipped wait charges in your favour.
          </div>
        </div>`;
    }
  } else {
    // No actual fare entered — just show the correct fare
    verdictEl.innerHTML = `
      <div class="verdict--neutral">
        <div class="verdict-emoji">🧮</div>
        <div class="verdict-title">Correct fare: ₹${fare.subtotal}</div>
        <div class="verdict-body">
          Acceptable range: <strong>₹${fare.subtotal - TARIFF.TOLERANCE} – ₹${fare.subtotal + TARIFF.TOLERANCE}</strong>.
          Enter the meter reading above and recalculate to check if you're being overcharged.
        </div>
      </div>`;
  }

  // Breakdown
  let rows = `
    <div class="breakdown-row">
      <span>Base fare (${distKm.toFixed(1)} km${distKm <= TARIFF.MIN_KM ? ', minimum' : ''})</span>
      <span class="amount">₹${fare.base}</span>
    </div>`;

  if (fare.waitCharge > 0) {
    rows += `
    <div class="breakdown-row">
      <span>Wait time (${waitMins}m ${waitSecs}s)</span>
      <span class="amount">₹${fare.waitCharge}</span>
    </div>`;
  }
  if (fare.luggageCharge > 0) {
    rows += `
    <div class="breakdown-row">
      <span>Luggage (${luggage} piece${luggage > 1 ? 's' : ''})</span>
      <span class="amount">₹${fare.luggageCharge}</span>
    </div>`;
  }
  if (isNight && fare.nightAdd > 0) {
    rows += `
    <div class="breakdown-row">
      <span>Night surcharge (+25%) <span class="tag-night">12 AM – 5 AM</span></span>
      <span class="amount">+₹${fare.nightAdd}</span>
    </div>`;
  }
  rows += `
    <div class="breakdown-row">
      <span>Total correct fare</span>
      <span class="amount">₹${fare.subtotal}</span>
    </div>`;

  document.getElementById('breakdown-box').innerHTML = `
    <div class="breakdown-title">Fare breakdown</div>
    ${rows}
    <div class="fare-band-label">Tolerance band: ₹${fare.subtotal - TARIFF.TOLERANCE} – ₹${fare.subtotal + TARIFF.TOLERANCE}</div>`;

  document.getElementById('manual-fallback').style.display = 'none';
}

/* ── MANUAL FALLBACK ── */
function showManualFallback(pickup, dropoff, isNight, luggage, actualFare) {
  document.getElementById('empty-state').style.display   = 'none';
  document.getElementById('result-content').style.display = 'flex';
  document.getElementById('metrics-row').innerHTML = '';
  document.getElementById('verdict-box').innerHTML = '';
  document.getElementById('breakdown-box').innerHTML = '';

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&travelmode=driving`;
  document.getElementById('maps-link').href = mapsUrl;
  document.getElementById('manual-fallback').style.display = 'block';

  // Wire up the recalculate button
  document.getElementById('manual-btn').onclick = function () {
    const km   = parseFloat(document.getElementById('manual-km').value);
    const wait = parseFloat(document.getElementById('manual-wait').value) || 0;
    if (isNaN(km) || km <= 0) {
      alert('Please enter a valid distance in km.');
      return;
    }
    // Rough estimated total duration if no traffic data
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
  if (on) {
    spinner.classList.add('visible');
    spinner.setAttribute('aria-hidden', 'false');
  } else {
    spinner.classList.remove('visible');
    spinner.setAttribute('aria-hidden', 'true');
  }
}

function hideResults() {
  document.getElementById('empty-state').style.display    = 'block';
  document.getElementById('result-content').style.display = 'none';
}

function showInputError(msg) {
  alert(msg); // Simple for now — upgrade to inline error if needed
}

/* ── KEYBOARD: allow Enter key to trigger calculate ── */
document.addEventListener('DOMContentLoaded', () => {
  ['pickup', 'dropoff', 'actual-fare'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          calculateFare();
        }
      });
    }
  });
});
