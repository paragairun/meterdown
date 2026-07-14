#!/usr/bin/env node
/**
 * MeterSahi? - extract-cities.js
 *
 * Regenerates src/data/cities.json from public/cities.js.
 *
 * WHY THIS EXISTS: public/cities.js is the single source of truth for
 * all tariff/city data - it's what the browser actually loads and runs
 * the calculator with. But Astro's build step (which decides which
 * /city-slug/ pages to generate) reads a separate file,
 * src/data/cities.json, since it needs the data at BUILD time, before
 * any browser is involved.
 *
 * These two files can drift out of sync: if you edit public/cities.js
 * (add a city, change a tariff) but don't also update
 * src/data/cities.json, Astro's build will silently keep generating
 * the OLD set of pages - your new city will 404 on the live site even
 * though the calculator data for it is technically present in
 * cities.js. This is exactly what happened with Nagpur/Nashik.
 *
 * You don't need to run this manually in normal use - `npm run build`
 * now runs it automatically first (see package.json). It's still
 * available standalone if you just want to check the extraction works
 * without doing a full build:
 *
 *   npm run extract-cities
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CITIES_JS_PATH = path.join(__dirname, '../public/cities.js');
const OUTPUT_PATH = path.join(__dirname, '../src/data/cities.json');

function extractCitiesObject(source) {
  const start = source.indexOf('const CITIES');
  if (start === -1) {
    throw new Error('Could not find "const CITIES" in public/cities.js - has the variable been renamed?');
  }
  const afterEq = source.indexOf('=', start) + 1;

  let i = afterEq, depth = 0, started = false, end = -1;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '{') { depth++; started = true; }
    else if (c === '}') {
      depth--;
      if (started && depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) {
    throw new Error('Could not find the closing brace of the CITIES object - is public/cities.js valid?');
  }

  const objText = source.slice(afterEq, end).trim();
  // eslint-disable-next-line no-eval
  return eval('(' + objText + ')');
}

function main() {
  const source = fs.readFileSync(CITIES_JS_PATH, 'utf8');
  const CITIES = extractCitiesObject(source);
  const slugs = Object.keys(CITIES);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(CITIES, null, 2) + '\n');

  console.log(`Extracted ${slugs.length} cities to src/data/cities.json:`);
  console.log('  ' + slugs.join(', '));
}

main();
