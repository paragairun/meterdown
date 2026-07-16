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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    // Black & Yellow Taxi (CNG), Maharashtra Motor Vehicles Dept,
    // w.e.f. 1 Feb 2025. Source: transport.maharashtra.gov.in
    // (Black Yellow Taxi Tariff Card PDF). Non-AC only for now —
    // AC taxi is +10% per the same tariff card but not yet wired
    // into the calculator.
    taxiTariffDate: '1 Feb 2025',
    taxiTariff: {
      MIN_FARE:          31,
      MIN_KM:            1.5,
      RATE_PER_KM:       20.66,
      WAIT_RATE_PER_MIN: 2.066,  // 10% of per-km rate, per tariff card note
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       0,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 6,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'RTO Mumbai Central', phone: '9076201010', email: 'mh01taxicomplaint@gmail.com' },
      { label: 'RTO Mumbai West',    phone: '9920240202', email: 'mh02.autotaxicomplaint@gmail.com' },
    ],
    onlineComplaint: { label: 'Online complaint', value: 'Aaple Sarkar / State portal', hint: 'File via state transport website' },
    helpline: '1800-233-1922',
  },

  pune: {
    name:         'Pune',
    slug:         'pune',
    state:        'Maharashtra',
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    // Same statewide Maharashtra Black & Yellow Taxi tariff as Mumbai.
    taxiTariffDate: '1 Feb 2025',
    taxiTariff: {
      MIN_FARE:          31,
      MIN_KM:            1.5,
      RATE_PER_KM:       20.66,
      WAIT_RATE_PER_MIN: 2.066,
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
    onlineComplaint: { label: 'Online complaint', value: 'Aaple Sarkar / State portal', hint: 'File via state transport website' },
    helpline: '1800-233-1922',
  },

  delhi: {
    name:         'New Delhi',
    slug:         'delhi',
    state:        'Delhi',
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    // Black & Yellow Taxi (non-AC), Delhi Transport Dept notification
    // dated 9 Jan 2023 - still the current listed rate on
    // transport.delhi.gov.in as of this writing.
    taxiTariffDate: '9 Jan 2023',
    taxiTariff: {
      MIN_FARE:          40,
      MIN_KM:            1,
      RATE_PER_KM:       17,
      WAIT_RATE_PER_MIN: 1,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       23,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 15,
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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    // Yellow Taxi (metered). CAUTION - lower confidence than Mumbai/
    // Pune/Delhi: West Bengal's Transport Dept has NOT revised yellow
    // taxi fares since 2016 (confirmed via a Jan 2025 PTI news report
    // quoting a taxi union leader), and no clean, fetchable official
    // notification PDF could be found to cite directly (transport.wb.gov.in
    // blocks automated access). These figures are compiled from
    // multiple secondary sources describing the post-2018-recalibration
    // meter reading, not a single authoritative document. If you have
    // the actual WB govt notification, send it and this should be
    // corrected/confirmed against it.
    taxiTariffDate: '~2016 (unrevised since, per Jan 2025 news report) - unconfirmed against original notification',
    taxiTariff: {
      MIN_FARE:          30,
      MIN_KM:            2,
      RATE_PER_KM:       15,
      WAIT_RATE_PER_MIN: 1,
      NIGHT_MULTIPLIER:  1.25,
      NIGHT_START:       22,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 5,
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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
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

  // Taxi-primary city: no auto-rickshaw tariff exists in any meaningful
  // sense in Goa (multiple firsthand accounts confirm autos are rare to
  // nonexistent, especially North Goa). The regulated vehicle is the
  // Yellow-Black Taxi. Rate blends GoaMiles (govt-backed taxi app,
  // clean per-km + per-min figures) with the Jan 2021 state gazette's
  // night surcharge. CAUTION: multiple independent accounts (locals,
  // Quora) report the taxi union resists government meters and drivers
  // often don't follow the official rate in practice - shown here
  // anyway since the point is giving users the correct number to push
  // back with, same reasoning as Kolkata's stale-but-official tariff.
  goa: {
    name:         'Goa',
    slug:         'goa',
    state:        'Goa',
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
    primaryVehicleType: 'taxi',
    mapCenter:    { lat: 15.4909, lng: 73.8278 },
    acBounds:     { sw: { lat: 14.90, lng: 73.70 }, ne: { lat: 15.80, lng: 74.35 } },
    tariffDate:   'GoaMiles / 2021 gazette',
    tariff: {
      MIN_FARE:          22,
      MIN_KM:            1,
      RATE_PER_KM:       21.50,
      WAIT_RATE_PER_MIN: 1.00,
      NIGHT_MULTIPLIER:  1.35,
      NIGHT_START:       22,
      NIGHT_END:         5,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'Transport Dept Panaji', phone: '0832-2225606', email: '' },
      { label: 'Transport Dept Margao', phone: '0832-2741962', email: '' },
    ],
    helpline: '0832-2225606',
  },

  // Taxi-primary city (see Goa comment above - same reasoning). Sikkim's
  // official data is specifically for the government's own "Sikkim Cab"
  // app, tiered by distance band (see computeFareTiered in this file).
  // CAUTION: WAIT_RATE_PER_MIN is an assumption - the source notification
  // only gives hourly/day-hire rates for extended hire, not a clean
  // point-to-point per-minute waiting rate. Flagged here for correction
  // if a better source turns up.
  gangtok: {
    name:         'Gangtok',
    slug:         'gangtok',
    state:        'Sikkim',
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
    primaryVehicleType: 'taxi',
    mapCenter:    { lat: 27.3389, lng: 88.6065 },
    acBounds:     { sw: { lat: 27.28, lng: 88.55 }, ne: { lat: 27.40, lng: 88.65 } },
    tariffDate:   'Sikkim Cab tariff',
    tariff: {
      BANDS: [
        { upTo: 2,      flatFare: 100 },
        { upTo: 4,      flatFare: 200 },
        { upTo: 15,     perKm: 40 },
        { upTo: 50,     perKm: 38 },
        { upTo: 75,     perKm: 33 },
        { upTo: 999999, perKm: 24 },
      ],
      WAIT_RATE_PER_MIN: 2.00, // ASSUMPTION - see comment above
      NIGHT_MULTIPLIER:  1.50,
      NIGHT_START:       22,
      NIGHT_END:         4,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'State Transport Authority', phone: '03592-202483', email: 'secy-transport-skm@sikkim.gov.in' },
    ],
    helpline: '03592-202483',
  },

  // Same statewide Maharashtra MVD auto-rickshaw (CNG) tariff card as
  // Mumbai/Pune (w.e.f. 1 Feb 2025) - the tariff card itself is issued
  // once for the whole state, not per-city, and no Nagpur-specific
  // deviation notification was found. One low-quality aggregator site
  // showed different numbers (Rs18 min / Rs11/km) but its own citation
  // linked to a Mysuru (Karnataka) news article as its "source" for
  // Nagpur data - a clear sign of templated/unreliable content, so
  // discounted. Revisit if a genuine Nagpur-specific notification turns up.
  nagpur: {
    name:         'Nagpur',
    slug:         'nagpur',
    state:        'Maharashtra',
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
    mapCenter:    { lat: 21.1458, lng: 79.0882 },
    acBounds:     { sw: { lat: 21.00, lng: 78.95 }, ne: { lat: 21.30, lng: 79.20 } },
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
      { label: 'RTO Nagpur City (MH-31)',  phone: '0712-2560781', email: 'rto.31-mh@gov.in' },
      { label: 'RTO Nagpur Rural (MH-40)', phone: '0712-2728461', email: 'rto.40-mh@gov.in' },
    ],
    helpline: '1800-233-1922',
  },

  // Same statewide Maharashtra MVD auto-rickshaw (CNG) tariff card as
  // Mumbai/Pune/Nagpur (w.e.f. 1 Feb 2025) - no Nashik-specific
  // deviation notification found.
  nashik: {
    name:         'Nashik',
    slug:         'nashik',
    state:        'Maharashtra',
    country:      'India',
    countryCode:  'IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
    mapCenter:    { lat: 19.9975, lng: 73.7898 },
    acBounds:     { sw: { lat: 19.85, lng: 73.65 }, ne: { lat: 20.15, lng: 73.95 } },
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
      { label: 'RTO Nashik City (MH-15)', phone: '0253-2576001', email: 'rto-nashik@mahatranscom.in' },
    ],
    helpline: '1800-233-1922',
  },

  // First international city (pilot for the currency/country/progressive-
  // fare architecture). Source: Jan 2023 Royal Gazette notification,
  // reported consistently across 5 independent contemporaneous news
  // outlets (Bangkok Post, Nation Thailand x2, Thaiger, Tripadvisor
  // forum quoting the same announcement). Cross-validated against a
  // real-world example (~26km Bangkok airport trip, sourced ~267 THB):
  // this tariff's own formula gives 217 THB base + 50 THB airport
  // surcharge = 267 THB exactly.
  //
  // IMPORTANT: this is a PROGRESSIVE/cumulative meter (see
  // computeFareProgressive) - each band only charges its own portion of
  // the distance, unlike Gangtok's bracket-for-the-whole-trip model.
  //
  // Airport surcharge (50 THB) and toll charges are NOT modeled here -
  // the calculator will under-quote airport trips by that amount. Same
  // limitation as the site not modeling city-specific surcharges
  // elsewhere; flagged rather than silently wrong.
  bangkok: {
    name:         'Bangkok',
    slug:         'bangkok',
    state:        'Bangkok',
    country:      'Thailand',
    countryCode:  'TH',
    currencyCode: 'THB',
    currencySymbol: '\u0e3f',
    regulatorName: 'Department of Land Transport, Thailand',
    regulatorShortName: 'DLT',
    primaryVehicleType: 'taxi',
    mapCenter:    { lat: 13.7563, lng: 100.5018 },
    acBounds:     { sw: { lat: 13.55, lng: 100.30 }, ne: { lat: 13.95, lng: 100.75 } },
    tariffDate:   '13 Jan 2023 (Royal Gazette)',
    tariff: {
      PROGRESSIVE_BANDS: [
        { upTo: 1,      flatFare: 40 },
        { upTo: 10,     perKm: 6.5 },
        { upTo: 20,     perKm: 7.0 },
        { upTo: 40,     perKm: 8.0 },
        { upTo: 60,     perKm: 8.5 },
        { upTo: 999999, perKm: 8.5 }, // rate beyond 60km not directly
        // sourced - continuing the last confirmed rate rather than
        // guessing a higher number. City calculator, so low real-world impact.
      ],
      WAIT_RATE_PER_MIN: 3.00, // "traffic congestion" charge, <6km/h
      NIGHT_MULTIPLIER:  1,    // No official night surcharge found for
      // Bangkok metered taxis (unlike Indian auto tariffs). Set to 1
      // (no surcharge) rather than assuming one exists.
      NIGHT_START:       0,
      NIGHT_END:         0,
      LUGGAGE_PER_PIECE: 0,
      TOLERANCE:         5,
      STANDSTILL_FACTOR: 0.90,
    },
    rtoContact: [
      { label: 'Tourist Police', phone: '1155', email: 'yourfirstfriend@touristpolice.go.th' },
    ],
    helpline: '1584',
  },
};

/* ── Ordered list for the dropdown ── */
const CITY_LIST = [
  'mumbai', 'delhi', 'bengaluru', 'hyderabad',
  'pune', 'kochi', 'kolkata', 'chennai', 'ahmedabad',
  'goa', 'gangtok', 'nagpur', 'nashik',
  'bangkok',
];

/* ════════════════════════════════════════════
   CITY DETECTION & REDIRECT
   Uses IP-based geolocation — no browser permission
   needed, works instantly on all browsers.
   Falls back to city chooser if API fails.
   ════════════════════════════════════════════ */

var GEO_CITY_MAP = {
  // Mumbai + suburbs. Maharashtra has four covered cities (Mumbai,
  // Pune, Nagpur, and Nashik), so - unlike every other state below - it can't
  // be resolved by region name alone. IP geolocation frequently returns
  // a specific suburb/locality rather than "Mumbai" itself, so this
  // list needs to
  // be broad rather than just the umbrella city name.
  'mumbai':        'mumbai',
  'navi mumbai':   'mumbai',
  'thane':         'mumbai',
  'borivali':      'mumbai',
  'dahisar':       'mumbai',
  'kandivali':     'mumbai',
  'malad':         'mumbai',
  'goregaon':      'mumbai',
  'jogeshwari':    'mumbai',
  'andheri':       'mumbai',
  'vile parle':    'mumbai',
  'santacruz':     'mumbai',
  'khar':          'mumbai',
  'bandra':        'mumbai',
  'juhu':          'mumbai',
  'versova':       'mumbai',
  'mira road':     'mumbai',
  'mira bhayandar':'mumbai',
  'bhayandar':     'mumbai',
  'vasai':         'mumbai',
  'virar':         'mumbai',
  'nalasopara':    'mumbai',
  'kalyan':        'mumbai',
  'dombivli':      'mumbai',
  'ambernath':     'mumbai',
  'ulhasnagar':    'mumbai',
  'badlapur':      'mumbai',
  'mulund':        'mumbai',
  'bhandup':       'mumbai',
  'vikhroli':      'mumbai',
  'kanjurmarg':    'mumbai',
  'ghatkopar':     'mumbai',
  'chembur':       'mumbai',
  'powai':         'mumbai',
  'kurla':         'mumbai',
  'sion':          'mumbai',
  'dadar':         'mumbai',
  'wadala':        'mumbai',
  'parel':         'mumbai',
  'worli':         'mumbai',
  'mahim':         'mumbai',
  'lower parel':   'mumbai',
  'colaba':        'mumbai',
  'fort':          'mumbai',
  'churchgate':    'mumbai',

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

  // Pune + suburbs (same reasoning as Mumbai above)
  'pune':          'pune',
  'pimpri':        'pune',
  'chinchwad':     'pune',
  'hinjewadi':     'pune',
  'wakad':         'pune',
  'baner':         'pune',
  'aundh':         'pune',
  'kothrud':       'pune',
  'hadapsar':      'pune',
  'viman nagar':   'pune',
  'kharadi':       'pune',
  'magarpatta':    'pune',
  'wagholi':       'pune',
  'nigdi':         'pune',
  'akurdi':        'pune',
  'katraj':        'pune',
  'warje':         'pune',
  'shivajinagar':  'pune',

  'nagpur':        'nagpur',

  'nashik':        'nashik',
  'nasik':         'nashik',

  'bangkok':       'bangkok',
  'krung thep':    'bangkok',

  'kochi':        'kochi',
  'ernakulam':    'kochi',
  'thrissur':     'kochi',
  'kolkata':      'kolkata',
  'howrah':       'kolkata',
  'chennai':      'chennai',
  'ahmedabad':    'ahmedabad',

  'panaji':       'goa',
  'panjim':       'goa',
  'margao':       'goa',
  'madgaon':      'goa',
  'vasco':        'goa',
  'mapusa':       'goa',
  'calangute':    'goa',
  'candolim':     'goa',
  'anjuna':       'goa',
  'baga':         'goa',
  'ponda':        'goa',

  'gangtok':      'gangtok',
};

// Fallback for states where we cover exactly one city - safe to use
// region alone since there's no ambiguity. (Maharashtra is excluded:
// it has four covered cities (Mumbai, Pune, Nagpur, Nashik), so it must be
// resolved via GEO_CITY_MAP above instead.)
var GEO_REGION_MAP = {
  'delhi':          'delhi',
  'nct of delhi':   'delhi',
  'karnataka':      'bengaluru',
  'telangana':      'hyderabad',
  'kerala':         'kochi',
  'west bengal':    'kolkata',
  'tamil nadu':     'chennai',
  'gujarat':        'ahmedabad',
  'goa':            'goa',
  'sikkim':         'gangtok',
};

// Country-level fallback - used only when BOTH city and region-level
// matching fail. Safe today because every covered country has exactly
// one city (Thailand -> Bangkok); if a second Thai city is ever added,
// this entry must move to city-level matching only, same as Maharashtra
// already had to do above.
var GEO_COUNTRY_MAP = {
  'thailand': 'bangkok',
};

function cityFromString(cityStr, regionStr, countryStr) {
  var lowerCity = (cityStr || '').toLowerCase();
  for (var key in GEO_CITY_MAP) {
    if (lowerCity.indexOf(key) !== -1) return GEO_CITY_MAP[key];
  }
  var lowerRegion = (regionStr || '').toLowerCase();
  for (var rkey in GEO_REGION_MAP) {
    if (lowerRegion.indexOf(rkey) !== -1) return GEO_REGION_MAP[rkey];
  }
  var lowerCountry = (countryStr || '').toLowerCase();
  for (var ckey in GEO_COUNTRY_MAP) {
    if (lowerCountry.indexOf(ckey) !== -1) return GEO_COUNTRY_MAP[ckey];
  }
  return null;
}

function detectCityAndRedirect() {
  // IP-based detection — no user permission, works on all browsers instantly
  var done = false;

  // Safety net — show chooser after 5s if API hasn't responded
  var safetyTimer = setTimeout(function() {
    if (!done) { done = true; showCityChooser(); }
  }, 5000);

  fetch('https://ipapi.co/json/')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (done) return;
      done = true;
      clearTimeout(safetyTimer);
      // ipapi.co returns city, region, and country_name fields
      var slug = cityFromString(data.city, data.region, data.country_name);
      if (slug) {
        window.location.href = '/' + slug + '/';
      } else {
        showCityChooser();
      }
    })
    .catch(function() {
      if (done) return;
      done = true;
      clearTimeout(safetyTimer);
      showCityChooser();
    });
}

function showCityChooser() {
  var el = document.getElementById('city-chooser');
  if (el) el.style.display = 'block';
  var spinner = document.getElementById('geo-spinner');
  if (spinner) spinner.style.display = 'none';
}


function computeFare(distKm, waitMin, isNight, luggagePieces, tariff) {
  if (tariff.BANDS) return computeFareTiered(distKm, waitMin, isNight, luggagePieces, tariff);
  if (tariff.PROGRESSIVE_BANDS) return computeFareProgressive(distKm, waitMin, isNight, luggagePieces, tariff);

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
 * Tiered/slab fare calculation - used by cities where the rate changes
 * by distance band and the WHOLE trip is billed at that band's rate
 * (not cumulative like income tax brackets). E.g. Sikkim's "Sikkim Cab"
 * tariff: 0-2km flat Rs100, 2-4km flat Rs200, 4-15km @ Rs40/km applied
 * to the full distance, 15-50km @ Rs38/km applied to the full distance,
 * and so on - a 10km trip costs 10 x 40 = Rs400, not a blend of bands.
 * tariff.BANDS = [{upTo, flatFare} | {upTo, perKm}, ...] sorted ascending.
 */
function computeFareTiered(distKm, waitMin, isNight, luggagePieces, tariff) {
  const T = tariff;
  const freeWaitMins = T.WAIT_FREE_MINS || 0;
  const billableWaitMin = Math.max(0, waitMin - freeWaitMins);

  let base = null;
  for (const band of T.BANDS) {
    if (distKm <= band.upTo) {
      base = (band.flatFare !== undefined) ? band.flatFare : Math.round(distKm * band.perKm);
      break;
    }
  }
  if (base === null) {
    // Distance exceeded every band (shouldn't happen if the last band's
    // upTo is a large sentinel) - fall back to the last band's rate.
    const lastBand = T.BANDS[T.BANDS.length - 1];
    base = (lastBand.flatFare !== undefined) ? lastBand.flatFare : Math.round(distKm * lastBand.perKm);
  }

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
 * Progressive/cumulative banded fare calculation - used by cities whose
 * meter increments continuously as distance increases, with each band
 * only charging its OWN portion (like income tax brackets), unlike
 * computeFareTiered above (which bills the whole trip at one bracket's
 * rate). E.g. Bangkok's official meter: first 1km flat 40 THB, then
 * 6.50 THB/km for km 1-10, 7.00 THB/km for km 10-20, 8.00 THB/km for
 * km 20-40, 8.50 THB/km for km 40-60. A 15km trip costs
 * 40 + (9km x 6.50) + (5km x 7.00) = 133.5 -> 134 THB, not 15 x any
 * single rate. Verified against a real-world example (~26km Bangkok
 * airport trip, sourced fare ~267 THB): this formula gives 216 THB
 * base + 50 THB airport surcharge = 266 THB, matching within rounding.
 * tariff.PROGRESSIVE_BANDS = [{upTo, flatFare} | {upTo, perKm}, ...],
 * sorted ascending, each entry describing ONLY that band's own segment.
 */
function computeFareProgressive(distKm, waitMin, isNight, luggagePieces, tariff) {
  const T = tariff;
  const freeWaitMins = T.WAIT_FREE_MINS || 0;
  const billableWaitMin = Math.max(0, waitMin - freeWaitMins);

  let base = 0;
  let prevUpTo = 0;
  for (const band of T.PROGRESSIVE_BANDS) {
    if (distKm <= prevUpTo) break;
    if (band.flatFare !== undefined) {
      base += band.flatFare;
    } else {
      const portionKm = Math.min(distKm, band.upTo) - prevUpTo;
      base += portionKm * band.perKm;
    }
    prevUpTo = band.upTo;
  }
  base = Math.round(base);

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

