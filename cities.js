/**
 * MeterSahi? — cities.js
 * Shared city config, tariff data, geolocation city mapping,
 * and fare calculation engine for all city pages.
 *
 * Tariff sources:
 *   Mumbai/Pune : Maharashtra MVD, w.e.f. 1 Feb 2025
 *   Delhi       : Delhi Transport Dept, w.e.f. Oct 2022
 *   Bengaluru   : Karnataka DTA, w.e.f. 1 Aug 2025
 *   Hyderabad   : Telangana RTA (latest published rates)
 *   Kochi       : Kerala MVD, w.e.f. May 2022
 *   Kolkata     : West Bengal Transport Dept
 *   Chennai     : Tamil Nadu RTA
 *   Ahmedabad   : Gujarat RTA, w.e.f. Nov 2021
 */

'use strict';

/* ════════════════════════════════════════════
   CITY TARIFF DATABASE
   ════════════════════════════════════════════ */
const CITIES = {
  mumbai: {
    name:         'Mumbai',
    slug:         'mumbai',
    state:        'Maharashtra',
    mapCenter:    { lat: 19.0760, lng: 72.8777 },
    acBounds:     { sw: { lat: 18.85, lng: 72.75 }, ne: { lat: 19.32, lng: 73.05 } },
    tariffDate:   '1 Feb 2025',
    tariff: {
      MIN_FARE:          26,
      MIN_KM:            1.5,
      RATE_PER_KM:       17.14,
      WAIT_RATE_PER_MIN: 1.714,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       0,    // 12 AM
      NIGHT_END:         5,    // 5 AM
      LUGGAGE_PER_PIECE: 6,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'RTO Mumbai Central', phone: '9076201010', email: 'mh01taxicomplaint@gmail.com' },
      { label: 'RTO Mumbai West',    phone: '9920240202', email: 'mh02.autotaxicomplaint@gmail.com' },
    ],
    helpline: '1800-233-1922',
  },

  pune: {
    name:         'Pune',
    slug:         'pune',
    state:        'Maharashtra',
    mapCenter:    { lat: 18.5204, lng: 73.8567 },
    acBounds:     { sw: { lat: 18.40, lng: 73.70 }, ne: { lat: 18.65, lng: 74.00 } },
    tariffDate:   '1 Feb 2025',
    tariff: {
      MIN_FARE:          26,
      MIN_KM:            1.5,
      RATE_PER_KM:       17.14,
      WAIT_RATE_PER_MIN: 1.714,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       0,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 6,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'RTO Pune', phone: '020-26051400', email: '' },
    ],
    helpline: '1800-233-1922',
  },

  delhi: {
    name:         'New Delhi',
    slug:         'delhi',
    state:        'Delhi',
    mapCenter:    { lat: 28.6139, lng: 77.2090 },
    acBounds:     { sw: { lat: 28.40, lng: 76.84 }, ne: { lat: 28.88, lng: 77.35 } },
    tariffDate:   'Oct 2022',
    tariff: {
      MIN_FARE:          30,
      MIN_KM:            1.5,
      RATE_PER_KM:       11.00,
      WAIT_RATE_PER_MIN: 1.00,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       23,   // 11 PM
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'STA Delhi', phone: '011-23370004', email: '' },
    ],
    helpline: '1800-11-0443',
  },

  bengaluru: {
    name:         'Bengaluru',
    slug:         'bengaluru',
    state:        'Karnataka',
    mapCenter:    { lat: 12.9716, lng: 77.5946 },
    acBounds:     { sw: { lat: 12.80, lng: 77.40 }, ne: { lat: 13.15, lng: 77.80 } },
    tariffDate:   '1 Aug 2025',
    tariff: {
      MIN_FARE:          36,
      MIN_KM:            2.0,
      RATE_PER_KM:       18.00,
      WAIT_RATE_PER_MIN: 0.667,  // ₹10 per 15 min after first 5 free mins
      WAIT_FREE_MINS:    5,
      NIGHT_MULTIPLIER:  1.50,
      NIGHT_START:       22,   // 10 PM
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'RTO Bengaluru East', phone: '080-22372109', email: '' },
      { label: 'RTO Bengaluru West', phone: '080-23323233', email: '' },
    ],
    helpline: '1800-425-1616',
  },

  hyderabad: {
    name:         'Hyderabad',
    slug:         'hyderabad',
    state:        'Telangana',
    mapCenter:    { lat: 17.3850, lng: 78.4867 },
    acBounds:     { sw: { lat: 17.20, lng: 78.25 }, ne: { lat: 17.60, lng: 78.65 } },
    tariffDate:   'Current official',
    tariff: {
      MIN_FARE:          20,
      MIN_KM:            2.0,
      RATE_PER_KM:       11.00,
      WAIT_RATE_PER_MIN: 0,
      NIGHT_MULTIPLIER:  1.50,
      NIGHT_START:       23,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'TS Transport Dept', phone: '040-23450145', email: '' },
    ],
    helpline: '1800-425-1616',
  },

  kochi: {
    name:         'Kochi',
    slug:         'kochi',
    state:        'Kerala',
    mapCenter:    { lat: 9.9312, lng: 76.2673 },
    acBounds:     { sw: { lat: 9.75, lng: 76.10 }, ne: { lat: 10.15, lng: 76.45 } },
    tariffDate:   'May 2022',
    tariff: {
      MIN_FARE:          30,
      MIN_KM:            1.5,
      RATE_PER_KM:       15.00,
      WAIT_RATE_PER_MIN: 1.50,
      NIGHT_MULTIPLIER:  1.50,
      NIGHT_START:       22,  // 10 PM
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'Kerala MVD Helpdesk', phone: '91 88 96 11 00', email: 'complaints.mvd@kerala.gov.in' },
    ],
    helpline: '91 88 96 11 00',
  },

  kolkata: {
    name:         'Kolkata',
    slug:         'kolkata',
    state:        'West Bengal',
    mapCenter:    { lat: 22.5726, lng: 88.3639 },
    acBounds:     { sw: { lat: 22.40, lng: 88.20 }, ne: { lat: 22.75, lng: 88.55 } },
    tariffDate:   'Current official',
    tariff: {
      MIN_FARE:          25,
      MIN_KM:            2.0,
      RATE_PER_KM:       13.00,
      WAIT_RATE_PER_MIN: 0.50,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       22,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'WB Transport Dept', phone: '033-22143053', email: '' },
    ],
    helpline: '1800-345-5555',
  },

  chennai: {
    name:         'Chennai',
    slug:         'chennai',
    state:        'Tamil Nadu',
    mapCenter:    { lat: 13.0827, lng: 80.2707 },
    acBounds:     { sw: { lat: 12.85, lng: 80.05 }, ne: { lat: 13.25, lng: 80.45 } },
    tariffDate:   'Current official',
    tariff: {
      MIN_FARE:          25,
      MIN_KM:            1.8,
      RATE_PER_KM:       16.00,
      WAIT_RATE_PER_MIN: 0.70,  // ₹3.50 per 5 min
      NIGHT_MULTIPLIER:  1.50,
      NIGHT_START:       23,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'TN Transport Dept', phone: '044-24333220', email: '' },
    ],
    helpline: '1800-425-1616',
  },

  ahmedabad: {
    name:         'Ahmedabad',
    slug:         'ahmedabad',
    state:        'Gujarat',
    mapCenter:    { lat: 23.0225, lng: 72.5714 },
    acBounds:     { sw: { lat: 22.85, lng: 72.40 }, ne: { lat: 23.20, lng: 72.75 } },
    tariffDate:   'Nov 2021',
    tariff: {
      MIN_FARE:          18,
      MIN_KM:            1.25,
      RATE_PER_KM:       13.00,
      WAIT_RATE_PER_MIN: 1.00,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       23,
      NIGHT_END:         6,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'RTO Ahmedabad', phone: '079-26580701', email: '' },
    ],
    helpline: '1800-233-1022',
  },
};

/* ── Ordered list for the dropdown ── */
const CITY_LIST = [
  'mumbai', 'delhi', 'bengaluru', 'hyderabad',
  'pune', 'kochi', 'kolkata', 'chennai', 'ahmedabad',
];

/* ════════════════════════════════════════════
   GEOLOCATION REDIRECT (used on root index.html)
   ════════════════════════════════════════════ */

// Maps address fragments → city slug (used by Nominatim + Google geocoder)
const GEO_CITY_MAP = {
  'mumbai':       'mumbai',
  'navi mumbai':  'mumbai',
  'thane':        'mumbai',
  'delhi':        'delhi',
  'new delhi':    'delhi',
  'noida':        'delhi',
  'gurugram':     'delhi',
  'gurgaon':      'delhi',
  'faridabad':    'delhi',
  'ghaziabad':    'delhi',
  'bengaluru':    'bengaluru',
  'bangalore':    'bengaluru',
  'hyderabad':    'hyderabad',
  'secunderabad': 'hyderabad',
  'pune':         'pune',
  'pimpri':       'pune',
  'kochi':        'kochi',
  'ernakulam':    'kochi',
  'thrissur':     'kochi',
  'kolkata':      'kolkata',
  'howrah':       'kolkata',
  'chennai':      'chennai',
  'ahmedabad':    'ahmedabad',
};


 * No API key needed. Works independently of Google Maps loading state.
 * Falls back to bounding-box matching if API fails.
 */

// City bounding boxes for fast coordinate-based fallback
// [minLat, maxLat, minLng, maxLng]
const CITY_BOUNDS = {
  mumbai:    [18.85, 19.32, 72.75, 73.05],
  delhi:     [28.40, 28.88, 76.84, 77.35],
  bengaluru: [12.80, 13.15, 77.40, 77.80],
  hyderabad: [17.20, 17.60, 78.25, 78.65],
  pune:      [18.40, 18.65, 73.70, 74.00],
  kochi:     [9.75,  10.15, 76.10, 76.45],
  kolkata:   [22.40, 22.75, 88.20, 88.55],
  chennai:   [12.85, 13.25, 80.05, 80.45],
  ahmedabad: [22.85, 23.20, 72.40, 72.75],
};

function cityFromCoords(lat, lng) {
  for (const [slug, [minLat, maxLat, minLng, maxLng]] of Object.entries(CITY_BOUNDS)) {
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return slug;
    }
  }
  return null;
}

function cityFromAddress(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const [key, slug] of Object.entries(GEO_CITY_MAP)) {
    if (lower.includes(key)) return slug;
  }
  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Try city, town, state_district, county fields from Nominatim
    const candidates = [
      data.address?.city,
      data.address?.town,
      data.address?.state_district,
      data.address?.county,
      data.address?.suburb,
      data.display_name,
    ].filter(Boolean).join(' ');
    return cityFromAddress(candidates);
  } catch {
    return null;
  }
}

function detectCityAndRedirect() {
  if (!navigator.geolocation) { showCityChooser(); return; }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;

      // 1. Fast path — bounding box check (instant, no network)
      let slug = cityFromCoords(lat, lng);

      // 2. If not in any box, try Nominatim reverse geocode
      if (!slug) {
        slug = await reverseGeocode(lat, lng);
      }

      // 3. If still nothing, try Google Maps geocoder if available
      if (!slug && window.google && google.maps) {
        slug = await new Promise((resolve) => {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === 'OK' && results[0]) {
                resolve(cityFromAddress(results[0].formatted_address));
              } else {
                resolve(null);
              }
            }
          );
        });
      }

      if (slug) {
        window.location.href = `/${slug}/`;
      } else {
        showCityChooser();
      }
    },
    (err) => {
      console.warn('Geolocation error:', err.code, err.message);
      showCityChooser();
    },
    {
      timeout: 12000,       // longer timeout — iOS asks permission first
      maximumAge: 300000,   // accept cached position up to 5 min old
      enableHighAccuracy: false  // faster, less battery drain
    }
  );
}

function showCityChooser() {
  const el = document.getElementById('city-chooser');
  if (el) el.style.display = 'block';
  const spinner = document.getElementById('geo-spinner');
  if (spinner) spinner.style.display = 'none';
}

function computeFare(distKm, waitMin, isNight, luggagePieces, tariff) {
  const T = tariff;

  // Effective wait (subtract free minutes for cities that have them)
  const freeWaitMins = T.WAIT_FREE_MINS || 0;
  const billableWaitMin = Math.max(0, waitMin - freeWaitMins);

  let base = distKm <= T.MIN_KM
    ? T.MIN_FARE
    : Math.max(T.MIN_FARE, Math.round(distKm * T.RATE_PER_KM));

  const waitCharge    = Math.round(billableWaitMin * T.WAIT_RATE_PER_MIN);
  const luggageCharge = luggagePieces * (T.LUGGAGE_PER_PIECE || 0);
  let subtotal        = base + waitCharge + luggageCharge;
  let nightAdd        = 0;

  if (isNight) {
    const withNight = Math.round(subtotal * T.NIGHT_MULTIPLIER);
    nightAdd  = withNight - subtotal;
    subtotal  = withNight;
  }

  return { base, waitCharge, luggageCharge, nightAdd, subtotal };
}

/**
 * Determine if the current hour is within night hours for this city's tariff.
 */
function isNightTime(tariff) {
  const hour = new Date().getHours();
  const s = tariff.NIGHT_START;
  const e = tariff.NIGHT_END;
  // Night wraps around midnight when START > END (e.g. 23 to 5)
  if (s > e) return hour >= s || hour < e;
  return hour >= s && hour < e;
}

/* ════════════════════════════════════════════
   GEOLOCATION REDIRECT (used on root index.html)
   ════════════════════════════════════════════ */
function detectCityAndRedirect() {
  if (!navigator.geolocation) { showCityChooser(); return; }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      // Reverse geocode using Google Maps Geocoder
      if (window.google && google.maps) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              const addr = results[0].formatted_address;
              const slug = cityFromAddress(addr);
              if (slug) {
                window.location.href = `/${slug}/`;
              } else {
                showCityChooser();
              }
            } else {
              showCityChooser();
            }
          }
        );
      } else {
        showCityChooser();
      }
    },
    () => { showCityChooser(); },
    { timeout: 6000 }
  );
}

function showCityChooser() {
  const el = document.getElementById('city-chooser');
  if (el) el.style.display = 'block';
  const spinner = document.getElementById('geo-spinner');
  if (spinner) spinner.style.display = 'none';
}
