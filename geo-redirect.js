/**
 * MeterSahi? - geo-redirect.js
 * Lightweight homepage-only script: IP-based city detection and
 * redirect. Extracted from cities.js so the homepage doesn't have to
 * download tariff data, computeFare, and RTO contact info for all 9
 * cities just to run one redirect check (PageSpeed flagged ~123 KiB
 * of unused JS on the homepage - this was the main cause).
 * City pages still load the full cities.js as before; this file is
 * homepage-only.
 */

'use strict';

/* ════════════════════════════════════════════
   CITY DETECTION & REDIRECT
   Uses IP-based geolocation — no browser permission
   needed, works instantly on all browsers.
   Falls back to city chooser if API fails.
   ════════════════════════════════════════════ */

var GEO_CITY_MAP = {
  // Mumbai + suburbs. Maharashtra has two covered cities (Mumbai and
  // Pune), so - unlike every other state below - it can't be resolved
  // by region name alone. IP geolocation frequently returns a specific
  // suburb/locality rather than "Mumbai" itself, so this list needs to
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

  'kochi':        'kochi',
  'ernakulam':    'kochi',
  'thrissur':     'kochi',
  'kolkata':      'kolkata',
  'howrah':       'kolkata',
  'chennai':      'chennai',
  'ahmedabad':    'ahmedabad',
};

// Fallback for states where we cover exactly one city - safe to use
// region alone since there's no ambiguity. (Maharashtra is excluded:
// it has two covered cities, Mumbai and Pune, so it must be resolved
// via GEO_CITY_MAP above instead.)
var GEO_REGION_MAP = {
  'delhi':          'delhi',
  'nct of delhi':   'delhi',
  'karnataka':      'bengaluru',
  'telangana':      'hyderabad',
  'kerala':         'kochi',
  'west bengal':    'kolkata',
  'tamil nadu':     'chennai',
  'gujarat':        'ahmedabad',
};

function cityFromString(cityStr, regionStr) {
  var lowerCity = (cityStr || '').toLowerCase();
  for (var key in GEO_CITY_MAP) {
    if (lowerCity.indexOf(key) !== -1) return GEO_CITY_MAP[key];
  }
  var lowerRegion = (regionStr || '').toLowerCase();
  for (var rkey in GEO_REGION_MAP) {
    if (lowerRegion.indexOf(rkey) !== -1) return GEO_REGION_MAP[rkey];
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
      // ipapi.co returns city, region fields
      var slug = cityFromString(data.city, data.region);
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

