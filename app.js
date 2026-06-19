/**
 * MeterSahi? — app.js
 * Shared calculator logic for all city pages.
 * Requires cities.js to be loaded first.
 * CITY_SLUG must be defined in the page before this script loads.
 */

'use strict';

/* ── State ── */
let mapInstance        = null;
let directionsService  = null;
let directionsRenderer = null;
let mapReady           = false;
let lastRouteData      = null;

const CITY   = CITIES[CITY_SLUG];
const TARIFF = CITY.tariff;

/* ════════════════════════════════════════════
   CITY DROPDOWN (BookMyShow style)
   ════════════════════════════════════════════ */
function buildCityDropdown() {
  const trigger  = document.getElementById('city-dropdown-trigger');
  const panel    = document.getElementById('city-dropdown-panel');
  const search   = document.getElementById('city-search-input');
  const grid     = document.getElementById('city-dropdown-grid');
  if (!trigger || !panel) return;

  // Populate grid
  function renderCities(filter) {
    const q = (filter || '').toLowerCase();
    grid.innerHTML = '';
    CITY_LIST
      .filter(slug => !q || CITIES[slug].name.toLowerCase().includes(q))
      .forEach(slug => {
        const c   = CITIES[slug];
        const btn = document.createElement('a');
        btn.href  = `/${slug}/`;
        btn.className = 'cd-city-btn' + (slug === CITY_SLUG ? ' active' : '');
        btn.innerHTML = `<span class="cd-city-name">${c.name}</span><span class="cd-city-state">${c.state}</span>`;
        grid.appendChild(btn);
      });
    if (!grid.innerHTML) grid.innerHTML = '<div class="cd-no-results">No cities found</div>';
  }
  renderCities('');

  // Toggle
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle('open');
    if (open) { search.value = ''; renderCities(''); setTimeout(() => search.focus(), 50); }
  });
  search.addEventListener('input', () => renderCities(search.value));
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== trigger) panel.classList.remove('open');
  });
  search.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
}

/* ════════════════════════════════════════════
   GOOGLE MAPS INIT
   ════════════════════════════════════════════ */
window.initMap = function () {
  try {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      preserveViewport: false,
      polylineOptions: { strokeColor: '#f59e0b', strokeWeight: 4, strokeOpacity: 0.85 },
    });
    mapInstance = new google.maps.Map(document.getElementById('map'), {
      zoom: 13,
      center: CITY.mapCenter,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
    directionsRenderer.setMap(mapInstance);

    const b = CITY.acBounds;
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(b.sw.lat, b.sw.lng),
      new google.maps.LatLng(b.ne.lat, b.ne.lng)
    );
    const acOptions = { bounds, strictBounds: false, componentRestrictions: { country: 'in' } };
    new google.maps.places.Autocomplete(document.getElementById('pickup'),  acOptions);
    new google.maps.places.Autocomplete(document.getElementById('dropoff'), acOptions);

    mapReady = true;
  } catch (err) {
    console.warn('Maps init error:', err);
    mapReady = false;
  }
};

window.handleMapError = function () { mapReady = false; };

/* ════════════════════════════════════════════
   FARE CALCULATION
   ════════════════════════════════════════════ */
window.calculateFare = function () {
  const pickup  = document.getElementById('pickup').value.trim();
  const dropoff = document.getElementById('dropoff').value.trim();
  if (!pickup || !dropoff) { alert('Please enter both pickup and drop-off.'); return; }

  const isNight     = document.getElementById('ride-time').value === 'night';
  const luggage     = parseInt(document.getElementById('luggage').value, 10);
  const actualFare  = parseActualFare();
  const waitOverride = parseWaitOverride();

  setLoading(true);
  hideResults();

  if (mapReady && directionsService) {
    const cityName = CITY.name;
    directionsService.route(
      {
        origin:      pickup  + (pickup.toLowerCase().includes(cityName.toLowerCase())  ? '' : `, ${cityName}`),
        destination: dropoff + (dropoff.toLowerCase().includes(cityName.toLowerCase()) ? '' : `, ${cityName}`),
        travelMode:  google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
      },
      (result, status) => {
        setLoading(false);
        if (status === google.maps.DirectionsStatus.OK) {
          handleDirectionsResult(result, isNight, luggage, actualFare, pickup, dropoff, waitOverride);
        } else {
          showManualFallback(pickup, dropoff, isNight, luggage, actualFare, waitOverride);
        }
      }
    );
  } else {
    setLoading(false);
    showManualFallback(pickup, dropoff, isNight, luggage, actualFare, waitOverride);
  }
};

function handleDirectionsResult(result, isNight, luggage, actualFare, pickup, dropoff, waitOverride) {
  const leg = result.routes[0].legs[0];
  const distKm             = leg.distance.value / 1000;
  const durationFreeSec    = leg.duration.value;
  const durationTrafficSec = leg.duration_in_traffic ? leg.duration_in_traffic.value : durationFreeSec;
  const totalMinutes       = durationTrafficSec / 60;
  const trafficDelaySec    = Math.max(0, durationTrafficSec - durationFreeSec);
  const estimatedWait      = (trafficDelaySec * TARIFF.STANDSTILL_FACTOR) / 60;
  const waitMinutes        = (waitOverride !== null && waitOverride !== undefined) ? waitOverride : estimatedWait;
  const isWaitOverridden   = (waitOverride !== null && waitOverride !== undefined);

  lastRouteData = { distKm, totalMinutes, waitMinutes, isNight, luggage, actualFare, isWaitOverridden };
  renderResults(distKm, totalMinutes, waitMinutes, isNight, luggage, actualFare, isWaitOverridden);

  directionsRenderer.setDirections(result);
  google.maps.event.trigger(mapInstance, 'resize');
}

/* ════════════════════════════════════════════
   RENDER RESULTS
   ════════════════════════════════════════════ */
function renderResults(distKm, totalMin, waitMin, isNight, luggage, actualFare, isWaitOverridden) {
  const fare = computeFare(distKm, waitMin, isNight, luggage, TARIFF);

  document.getElementById('empty-state').style.display    = 'none';
  document.getElementById('result-content').style.display = 'flex';

  const waitMins = Math.floor(waitMin);
  const waitSecs = Math.round((waitMin % 1) * 60);
  const waitLabel = isWaitOverridden ? 'your reported time' : 'est. standstill';
  const waitClass = isWaitOverridden ? 'metric-unit overridden' : 'metric-unit';

  document.getElementById('metrics-row').innerHTML = `
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-road"></i> Distance</div>
      <div class="metric-value">${distKm.toFixed(1)}</div>
      <div class="metric-unit">km</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-clock"></i> Journey</div>
      <div class="metric-value">${Math.round(totalMin)}</div>
      <div class="metric-unit">min (traffic)</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-traffic-cone"></i> Wait</div>
      <div class="metric-value">${waitMins}m ${waitSecs}s</div>
      <div class="${waitClass}">${waitLabel}</div>
    </div>`;

  // Verdict
  const verdictEl = document.getElementById('verdict-box');
  if (actualFare !== null) {
    const low  = fare.subtotal - TARIFF.TOLERANCE;
    const high = fare.subtotal + TARIFF.TOLERANCE;
    const diff = actualFare - fare.subtotal;
    if (actualFare >= low && actualFare <= high) {
      verdictEl.innerHTML = `<div class="verdict--ok">
        <div class="verdict-emoji">✅</div>
        <div class="verdict-title">Meter looks correct</div>
        <div class="verdict-body">Driver charged <strong>₹${actualFare}</strong> — within ±₹${TARIFF.TOLERANCE} of the correct fare <strong>₹${fare.subtotal}</strong>.</div>
      </div>`;
    } else if (actualFare > high) {
      const pct = Math.round((diff / fare.subtotal) * 100);
      verdictEl.innerHTML = `<div class="verdict--tampered">
        <div class="verdict-emoji">🚨</div>
        <div class="verdict-title">Possible meter tampering</div>
        <div class="verdict-body">Driver charged <strong>₹${actualFare}</strong> but correct fare is <strong>₹${fare.subtotal}</strong>. That's <span class="overcharge-amount">₹${diff} extra (${pct}% overcharge)</span>.</div>
      </div>`;
    } else {
      verdictEl.innerHTML = `<div class="verdict--neutral">
        <div class="verdict-emoji">ℹ️</div>
        <div class="verdict-title">Fare is lower than expected</div>
        <div class="verdict-body">Driver charged <strong>₹${actualFare}</strong>, estimate is <strong>₹${fare.subtotal}</strong>. Driver may have taken a shorter route.</div>
      </div>`;
    }
  } else {
    verdictEl.innerHTML = `<div class="verdict--neutral">
      <div class="verdict-emoji">🧮</div>
      <div class="verdict-title">Correct fare: ₹${fare.subtotal}</div>
      <div class="verdict-body">Acceptable range: <strong>₹${fare.subtotal - TARIFF.TOLERANCE} – ₹${fare.subtotal + TARIFF.TOLERANCE}</strong>.</div>
    </div>`;
  }

  // Breakdown
  const freeWait = TARIFF.WAIT_FREE_MINS || 0;
  let rows = `<div class="breakdown-row"><span>Base fare (${distKm.toFixed(1)} km${distKm <= TARIFF.MIN_KM ? ', minimum' : ''})</span><span class="amount">₹${fare.base}</span></div>`;
  if (fare.waitCharge > 0) {
    rows += `<div class="breakdown-row"><span>Wait time (${waitMins}m ${waitSecs}s${freeWait > 0 ? `, first ${freeWait}m free` : ''})</span><span class="amount">₹${fare.waitCharge}</span></div>`;
  }
  if (fare.luggageCharge > 0) {
    rows += `<div class="breakdown-row"><span>Luggage (${luggage} piece${luggage > 1 ? 's' : ''})</span><span class="amount">₹${fare.luggageCharge}</span></div>`;
  }
  if (isNight && fare.nightAdd > 0) {
    const pct = Math.round((TARIFF.NIGHT_MULTIPLIER - 1) * 100);
    rows += `<div class="breakdown-row"><span>Night surcharge (+${pct}%)</span><span class="amount">+₹${fare.nightAdd}</span></div>`;
  }
  rows += `<div class="breakdown-row total-row"><span>Total correct fare</span><span class="amount">₹${fare.subtotal}</span></div>`;

  document.getElementById('breakdown-box').innerHTML = `
    <div class="breakdown-title">Fare breakdown</div>
    ${rows}
    <div class="fare-band-label">Tolerance band: ₹${fare.subtotal - TARIFF.TOLERANCE} – ₹${fare.subtotal + TARIFF.TOLERANCE}</div>`;

  // Feedback
  const fb = document.getElementById('feedback-section');
  if (fb) {
    fb.style.display = 'block';
    document.querySelectorAll('.feedback-btn').forEach(b => {
      b.classList.remove('selected', 'pulse');
      const icon = b.querySelector('.ti');
      if (icon && icon.dataset.originalClass) icon.className = icon.dataset.originalClass;
    });
    const reportSection = document.getElementById('report-vehicle-section');
    if (reportSection) reportSection.style.display = 'none';
    const conf = document.getElementById('report-confirmation');
    if (conf) conf.style.display = 'none';
    const btn = document.getElementById('btn-submit-report');
    if (btn) btn.style.display = 'flex';
    const thanks = document.getElementById('feedback-thanks');
    if (thanks) thanks.style.display = 'none';
  }

  document.getElementById('manual-fallback').style.display = 'none';
}

/* ════════════════════════════════════════════
   FEEDBACK FLOW
   ════════════════════════════════════════════ */
window.handleFeedback = function (answer) {
  document.querySelectorAll('.feedback-btn').forEach(b => {
    b.classList.remove('selected', 'pulse');
    const icon = b.querySelector('.ti');
    if (icon && icon.dataset.originalClass) icon.className = icon.dataset.originalClass;
  });
  const btn = document.querySelector(answer === 'yes' ? '.feedback-btn--yes' : '.feedback-btn--no');
  if (btn) {
    btn.classList.add('selected');
    const icon = btn.querySelector('.ti');
    if (icon) { if (!icon.dataset.originalClass) icon.dataset.originalClass = icon.className; icon.className = 'ti ti-check'; }
    requestAnimationFrame(() => btn.classList.add('pulse'));
  }
  const reportSection = document.getElementById('report-vehicle-section');
  const thanksBox     = document.getElementById('feedback-thanks');
  if (answer === 'no') {
    if (thanksBox) thanksBox.style.display = 'none';
    if (reportSection) {
      reportSection.style.display = 'block';
      document.getElementById('report-confirmation').style.display = 'none';
      document.getElementById('btn-submit-report').style.display = 'flex';
      initVehicleSelects();
      reportSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    if (reportSection) reportSection.style.display = 'none';
    if (thanksBox) thanksBox.style.display = 'flex';
  }
};

window.submitReport = function () {
  const s1 = document.getElementById('vn-state-input').value;
  const s2 = document.getElementById('vn-district-input').value;
  const s3 = document.getElementById('vn-series-input').value;
  const s4 = document.getElementById('vn-number-input').value;
  if (!s1 || !s2 || !s3 || !s4) { alert('Please select all four parts of the number plate.'); return; }
  const plateNo = `${s1} ${s2} ${s3} ${s4}`;
  console.log('Report:', plateNo, CITY_SLUG, lastRouteData);
  document.getElementById('btn-submit-report').style.display = 'none';
  const conf = document.getElementById('report-confirmation');
  conf.innerHTML = `<i class="ti ti-circle-check"></i> Report for <strong>${plateNo}</strong> submitted. Thank you!`;
  conf.style.display = 'flex';
};

/* ════════════════════════════════════════════
   SEARCHABLE SELECT (vehicle number plate)
   ════════════════════════════════════════════ */
const STATE_CODES   = ['AN','AP','AR','AS','BR','CG','CH','DD','DL','DN','GA','GJ','HP','HR','JH','JK','KA','KL','LA','LD','MH','ML','MN','MP','MZ','NL','OD','PB','PY','RJ','SK','TN','TR','TS','UK','UP','WB'];
const DISTRICT_CODES = Array.from({length:99}, (_,i) => String(i+1).padStart(2,'0'));
function generateSeries() {
  const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const s=[];
  a.forEach(x=>s.push(x));
  a.forEach(x=>a.forEach(y=>s.push(x+y)));
  a.forEach(x=>a.forEach(y=>a.forEach(z=>s.push(x+y+z))));
  return s;
}
const SERIES_CODES = generateSeries();
const NUMBER_CODES = Array.from({length:9999}, (_,i) => String(i+1).padStart(4,'0'));

function buildSearchableSelect(wrapperId, inputId, dropdownId, options, onChange) {
  const wrapper  = document.getElementById(wrapperId);
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!wrapper||!input||!dropdown) return;
  dropdown.innerHTML = `<div class="ss-search-wrap"><input class="ss-search" type="text" placeholder="Type to search…" autocomplete="off"/></div><div class="ss-list"></div>`;
  const searchInput = dropdown.querySelector('.ss-search');
  const list        = dropdown.querySelector('.ss-list');

  function renderList(filter) {
    const q = (filter||'').toUpperCase().trim();
    const filtered = q ? options.filter(o=>o.toUpperCase().includes(q)) : options;
    if (!filtered.length) { list.innerHTML='<div class="ss-no-results">No results</div>'; return; }
    list.innerHTML = filtered.map(o=>`<div class="ss-option${input.value===o?' selected':''}" data-value="${o}">${o}</div>`).join('');
    list.querySelectorAll('.ss-option').forEach(el=>el.addEventListener('mousedown',e=>{e.preventDefault();selectOption(el.dataset.value);}));
  }
  function selectOption(v) { input.value=v; input.classList.add('has-value'); closeDropdown(); if(onChange)onChange(v); }
  function openDropdown() { dropdown.classList.add('open'); searchInput.value=''; renderList(''); setTimeout(()=>searchInput.focus(),50); }
  function closeDropdown() { dropdown.classList.remove('open'); }
  input.addEventListener('click',e=>{e.stopPropagation();dropdown.classList.contains('open')?closeDropdown():(document.querySelectorAll('.ss-dropdown.open').forEach(d=>d.classList.remove('open')),openDropdown());});
  searchInput.addEventListener('input',()=>renderList(searchInput.value));
  searchInput.addEventListener('keydown',e=>{if(e.key==='Escape')closeDropdown();if(e.key==='Enter'){const f=list.querySelector('.ss-option');if(f)selectOption(f.dataset.value);}});
  document.addEventListener('click',e=>{if(!wrapper.contains(e.target))closeDropdown();});
  renderList('');
}

function initVehicleSelects() {
  buildSearchableSelect('ss-state','vn-state-input','ss-state-dropdown',STATE_CODES,()=>{});
  buildSearchableSelect('ss-district','vn-district-input','ss-district-dropdown',DISTRICT_CODES,()=>{});
  buildSearchableSelect('ss-series','vn-series-input','ss-series-dropdown',SERIES_CODES,()=>{});
  buildSearchableSelect('ss-number','vn-number-input','ss-number-dropdown',NUMBER_CODES,()=>{});
}

/* ════════════════════════════════════════════
   MANUAL FALLBACK
   ════════════════════════════════════════════ */
function showManualFallback(pickup, dropoff, isNight, luggage, actualFare, waitOverride) {
  document.getElementById('empty-state').style.display    = 'none';
  document.getElementById('result-content').style.display = 'flex';
  document.getElementById('metrics-row').innerHTML        = '';
  document.getElementById('verdict-box').innerHTML        = '';
  document.getElementById('breakdown-box').innerHTML      = '';
  const fb = document.getElementById('feedback-section');
  if (fb) fb.style.display = 'none';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&travelmode=driving`;
  document.getElementById('maps-link').href = mapsUrl;
  document.getElementById('manual-fallback').style.display = 'block';
  if (waitOverride !== null && waitOverride !== undefined) {
    document.getElementById('manual-wait').value = (Math.round(waitOverride * 100) / 100);
  }
  document.getElementById('manual-btn').onclick = function () {
    const km   = parseFloat(document.getElementById('manual-km').value);
    const wait = parseFloat(document.getElementById('manual-wait').value) || 0;
    if (isNaN(km)||km<=0){alert('Enter a valid distance.');return;}
    const isOverridden = waitOverride !== null && waitOverride !== undefined;
    renderResults(km, (km/20)*60+wait, wait, isNight, luggage, actualFare, isOverridden);
  };
}

/* ════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════ */
function parseActualFare() {
  const raw = document.getElementById('actual-fare').value.trim();
  if (!raw) return null;
  const val = parseFloat(raw);
  return isNaN(val)||val<=0 ? null : val;
}

function parseWaitOverride() {
  const toggle = document.getElementById('wait-override-toggle');
  if (!toggle||!toggle.checked) return null;
  const mins = parseFloat(document.getElementById('wait-min').value) || 0;
  const secs = parseFloat(document.getElementById('wait-sec').value) || 0;
  const total = mins + secs / 60;
  return total >= 0 ? total : null;
}

function setLoading(on) {
  const btn     = document.getElementById('calc-btn');
  const spinner = document.getElementById('spinner');
  btn.disabled  = on;
  spinner.classList.toggle('visible', on);
}

function hideResults() {
  document.getElementById('empty-state').style.display    = 'block';
  document.getElementById('result-content').style.display = 'none';
}

/* ════════════════════════════════════════════
   AUTO-SET NIGHT/DAY BASED ON CURRENT TIME
   ════════════════════════════════════════════ */
function autoSetRideTime() {
  const sel = document.getElementById('ride-time');
  if (!sel) return;
  sel.value = isNightTime(TARIFF) ? 'night' : 'day';
}

/* ════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  buildCityDropdown();
  autoSetRideTime();
  ['pickup','dropoff','actual-fare','wait-min','wait-sec'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key==='Enter'){e.preventDefault();calculateFare();} });
  });
  const toggle = document.getElementById('wait-override-toggle');
  const inputs = document.getElementById('wait-time-inputs');
  if (toggle && inputs) {
    toggle.addEventListener('change', () => {
      inputs.style.display = toggle.checked ? 'flex' : 'none';
      if (toggle.checked) document.getElementById('wait-min').focus();
    });
  }
});
