#!/usr/bin/env node
/**
 * MeterSahi? - generate-sitemap.js
 *
 * Regenerates public/sitemap.xml from public/cities.js's CITY_LIST.
 *
 * WHY THIS EXISTS: sitemap.xml used to be a hand-maintained static
 * file. Every time a new city was added to cities.js, someone had to
 * remember to also add it here - and for 16 cities in a row, nobody
 * did. The sitemap silently fell 16 cities behind reality (Bangkok,
 * Istanbul, Mexico City, and everything after were all missing) with
 * no error, no build failure, nothing to notice. Exactly the same
 * failure mode as the Nagpur/Nashik 404 caused by src/data/cities.json
 * not auto-regenerating - see scripts/extract-cities.js.
 *
 * Runs automatically before every build (see package.json's prebuild
 * hook) so this can't happen again regardless of how many more cities
 * get added later.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CITIES_JS_PATH = path.join(__dirname, '../public/cities.js');
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap.xml');
const SITE_URL = 'https://metersahi.in';

// Non-city pages that don't come from CITY_LIST - add entries here if
// more standalone pages (like the blog post) are ever added.
const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'monthly' },
  { loc: '/blog/protect-yourself-from-tampered-autorickshaw-meters/', priority: '0.7', changefreq: 'yearly' },
];

function extractCityList(source) {
  const start = source.indexOf('const CITY_LIST');
  if (start === -1) {
    throw new Error('Could not find "const CITY_LIST" in public/cities.js - has the variable been renamed?');
  }
  const afterEq = source.indexOf('=', start) + 1;

  let i = afterEq, depth = 0, started = false, end = -1;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '[') { depth++; started = true; }
    else if (c === ']') {
      depth--;
      if (started && depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) {
    throw new Error('Could not find the closing bracket of CITY_LIST - is public/cities.js valid?');
  }

  const arrText = source.slice(afterEq, end).trim();
  // eslint-disable-next-line no-eval
  return eval(arrText);
}

function main() {
  const source = fs.readFileSync(CITIES_JS_PATH, 'utf8');
  const cityList = extractCityList(source);
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    ...STATIC_PAGES.map(p => ({ ...p, lastmod: p.loc === '/blog/protect-yourself-from-tampered-autorickshaw-meters/' ? '2025-06-25' : today })),
    ...cityList.map(slug => ({ loc: `/${slug}/`, priority: '0.9', changefreq: 'monthly', lastmod: today })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n\n')}

</urlset>
`;

  fs.writeFileSync(OUTPUT_PATH, xml);
  console.log(`Generated sitemap.xml with ${urls.length} URLs (${cityList.length} cities + ${STATIC_PAGES.length} static pages)`);
}

main();
