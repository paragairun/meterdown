// Loads public/cities.js in a sandboxed Node vm context, mirroring
// exactly how a <script> tag executes it in the browser: top-level
// const/function declarations become properties on the sandbox object,
// the same way they'd become part of the shared global scope across
// <script> tags on a real page.
//
// Deliberately does NOT modify public/cities.js in any way - that file
// is a live production asset served directly to browsers, and adding
// module.exports or import/export syntax to it would risk breaking the
// CITY_SLUG/vehicleType shared-global-scope pattern the real site relies
// on (see app.js's CHANGELOG). Testing it in a vm sandbox gets full
// fidelity to real runtime behavior with zero production risk.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CITIES_JS_PATH = path.join(__dirname, '../../public/cities.js');

export function loadCitiesJs() {
  const source = fs.readFileSync(CITIES_JS_PATH, 'utf8');

  // vi.setSystemTime() (Vitest's fake timers) patches the OUTER Node
  // realm's global Date - it has no effect inside a vm sandbox, which
  // gets its own independent Date belonging to its own realm. To test
  // isNightTime() (which calls `new Date().getHours()` internally) we
  // inject a controllable Date subclass as the sandbox's own global
  // Date before the context is created, and expose a setter for tests
  // to control it directly.
  let mockHour = null;
  class ControllableDate extends Date {
    getHours() {
      return mockHour !== null ? mockHour : super.getHours();
    }
  }

  const sandbox = { console, Date: ControllableDate };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'cities.js' });

  // Node's vm module only reflects top-level `var`/`function` onto the
  // sandbox object automatically - top-level `const`/`let` (which is
  // what cities.js actually uses for CITIES, CITY_LIST, GEO_CITY_MAP,
  // GEO_REGION_MAP) stay in the context's internal lexical scope and
  // aren't visible as sandbox.CITIES etc. They ARE still referenceable
  // by name in further code run in the same context though, so we pull
  // them out explicitly here.
  const extracted = vm.runInContext(
    `({ CITIES, CITY_LIST, GEO_CITY_MAP, GEO_REGION_MAP, GEO_COUNTRY_MAP })`,
    sandbox
  );

  return {
    ...sandbox,
    ...extracted,
    __setMockHour: (h) => { mockHour = h; },
  };
}
