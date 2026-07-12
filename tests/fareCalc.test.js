import { describe, it, expect, beforeAll } from 'vitest';
import { loadCitiesJs } from './helpers/loadCitiesJs.js';

let sandbox;

beforeAll(() => {
  sandbox = loadCitiesJs();
});

describe('computeFare - flat-rate cities', () => {
  it('matches Maharashtra MVD\'s own worked example (2.40km => Rs 41)', () => {
    // Straight from the official Mumbai tariff card: "for 2.40 KMs the
    // fare will be 17.14 x 2.40 = 41.13 i.e. Rs. 41"
    const T = sandbox.CITIES.mumbai.tariff;
    const fare = sandbox.computeFare(2.4, 0, false, 0, T);
    expect(fare.subtotal).toBe(41);
  });

  it('charges the minimum fare for trips at or under MIN_KM', () => {
    const T = sandbox.CITIES.mumbai.tariff; // MIN_FARE 26, MIN_KM 1.5
    expect(sandbox.computeFare(1.5, 0, false, 0, T).subtotal).toBe(26);
    expect(sandbox.computeFare(0.5, 0, false, 0, T).subtotal).toBe(26);
  });

  it('never charges less than the minimum fare even if distance*rate is lower', () => {
    const T = sandbox.CITIES.mumbai.tariff;
    // 1.6km * 17.14 = 27.4 -> rounds to 27, still above min, sanity check
    // the Math.max(MIN_FARE, ...) guard with a rate that WOULD dip below
    const lowRateTariff = { ...T, RATE_PER_KM: 1 }; // 1.6km * 1 = 1.6 -> 2
    expect(sandbox.computeFare(1.6, 0, false, 0, lowRateTariff).subtotal).toBe(T.MIN_FARE);
  });

  it('applies the night surcharge multiplicatively on top of base+wait+luggage', () => {
    const T = sandbox.CITIES.mumbai.tariff; // 25% night multiplier
    const day = sandbox.computeFare(5, 0, false, 0, T);
    const night = sandbox.computeFare(5, 0, true, 0, T);
    expect(night.subtotal).toBe(Math.round(day.subtotal * 1.25));
    expect(night.nightAdd).toBe(night.subtotal - day.subtotal);
  });

  it('adds waiting charge based on WAIT_RATE_PER_MIN', () => {
    const T = sandbox.CITIES.mumbai.tariff; // 1.714/min
    const fare = sandbox.computeFare(1.5, 10, false, 0, T); // min-fare distance + 10 min wait
    expect(fare.waitCharge).toBe(Math.round(10 * T.WAIT_RATE_PER_MIN));
    expect(fare.subtotal).toBe(T.MIN_FARE + fare.waitCharge);
  });

  it('adds luggage charge per piece', () => {
    const T = sandbox.CITIES.mumbai.tariff; // Rs 6/piece
    const noLuggage = sandbox.computeFare(1.5, 0, false, 0, T);
    const withLuggage = sandbox.computeFare(1.5, 0, false, 2, T);
    expect(withLuggage.luggageCharge).toBe(2 * T.LUGGAGE_PER_PIECE);
    expect(withLuggage.subtotal).toBe(noLuggage.subtotal + withLuggage.luggageCharge);
  });

  it('respects WAIT_FREE_MINS when a tariff defines free waiting minutes', () => {
    const T = { ...sandbox.CITIES.mumbai.tariff, WAIT_FREE_MINS: 5 };
    const fare = sandbox.computeFare(1.5, 5, false, 0, T); // exactly the free allowance
    expect(fare.waitCharge).toBe(0);
    const fareOver = sandbox.computeFare(1.5, 8, false, 0, T); // 3 billable minutes
    expect(fareOver.waitCharge).toBe(Math.round(3 * T.WAIT_RATE_PER_MIN));
  });
});

describe('computeFare - tiered/band cities (Gangtok/Sikkim)', () => {
  // Verified by hand against the official "Sikkim Cab" tariff notification
  // before this data went live - see cities.js CHANGELOG for the source.
  const T = () => sandbox.CITIES.gangtok.tariff;

  it('charges the flat 0-2km band fare regardless of exact distance within it', () => {
    expect(sandbox.computeFare(1.5, 0, false, 0, T()).subtotal).toBe(100);
    expect(sandbox.computeFare(2, 0, false, 0, T()).subtotal).toBe(100);
  });

  it('charges the flat 2-4km band fare', () => {
    expect(sandbox.computeFare(3, 0, false, 0, T()).subtotal).toBe(200);
  });

  it('applies the per-km rate to the FULL trip distance, not incrementally by band', () => {
    // 10km falls in the 4-15km band (Rs 40/km) - the whole 10km is
    // billed at 40/km, not a blend of the cheaper bands below it.
    expect(sandbox.computeFare(10, 0, false, 0, T()).subtotal).toBe(400); // 10 * 40
    expect(sandbox.computeFare(60, 0, false, 0, T()).subtotal).toBe(1980); // 60 * 33
    expect(sandbox.computeFare(100, 0, false, 0, T()).subtotal).toBe(2400); // 100 * 24
  });

  it('applies the night surcharge on top of the tiered base fare', () => {
    const day = sandbox.computeFare(10, 0, false, 0, T());
    const night = sandbox.computeFare(10, 0, true, 0, T());
    expect(day.subtotal).toBe(400);
    expect(night.subtotal).toBe(Math.round(400 * T().NIGHT_MULTIPLIER)); // 600 at 1.5x
  });

  it('falls back to the last band\'s rate for a distance beyond every defined upTo', () => {
    const weirdTariff = { ...T(), BANDS: [{ upTo: 5, perKm: 10 }] };
    const fare = sandbox.computeFare(50, 0, false, 0, weirdTariff);
    expect(fare.subtotal).toBe(500); // 50 * 10, using the only (last) band
  });
});

describe('computeFare - flat vs tiered dispatch', () => {
  it('routes to the tiered calculator only when tariff.BANDS is present', () => {
    const flatResult = sandbox.computeFare(10, 0, false, 0, sandbox.CITIES.mumbai.tariff);
    const tieredResult = sandbox.computeFare(10, 0, false, 0, sandbox.CITIES.gangtok.tariff);
    // Same distance, genuinely different pricing models - just a smoke
    // test that dispatch actually branches rather than always taking one path.
    expect(flatResult.subtotal).not.toBe(tieredResult.subtotal);
  });
});

describe('isNightTime', () => {
  it('handles a normal (non-wraparound) night window', () => {
    // Ahmedabad-style pattern used as a hypothetical non-wraparound
    // window for this test: 22:00-06:00 wraps too, so use a synthetic
    // same-day window to isolate the non-wraparound branch.
    const T = { NIGHT_START: 13, NIGHT_END: 18 };
    sandbox.__setMockHour(15); // 3 PM, inside window
    expect(sandbox.isNightTime(T)).toBe(true);
    sandbox.__setMockHour(20); // 8 PM, outside window
    expect(sandbox.isNightTime(T)).toBe(false);
  });

  it('handles a midnight-wraparound night window (e.g. Mumbai 12AM-5AM)', () => {
    const T = sandbox.CITIES.mumbai.tariff; // NIGHT_START 0, NIGHT_END 5
    sandbox.__setMockHour(2); // 2 AM - inside
    expect(sandbox.isNightTime(T)).toBe(true);
    sandbox.__setMockHour(12); // noon - outside
    expect(sandbox.isNightTime(T)).toBe(false);
  });

  it('handles a wraparound window starting late in the day (Delhi 11PM-5AM)', () => {
    const T = sandbox.CITIES.delhi.tariff; // NIGHT_START 23, NIGHT_END 5
    sandbox.__setMockHour(23); // 11 PM - inside
    expect(sandbox.isNightTime(T)).toBe(true);
    sandbox.__setMockHour(4); // 4 AM - inside
    expect(sandbox.isNightTime(T)).toBe(true);
    sandbox.__setMockHour(10); // 10 AM - outside
    expect(sandbox.isNightTime(T)).toBe(false);
  });
});

describe('cityFromString - geo-detection matching', () => {
  it('matches the exact regression case that motivated the geo-fix (Borivali -> mumbai)', () => {
    // ipapi.co returned city:"Borivali", region:"Maharashtra" for a real
    // Mumbai visitor; the original GEO_CITY_MAP only had 'mumbai',
    // 'navi mumbai', 'thane' and missed this, sending them to the manual
    // chooser instead of auto-redirecting. See cities.js CHANGELOG.
    expect(sandbox.cityFromString('Borivali', 'Maharashtra')).toBe('mumbai');
  });

  it('matches other Mumbai/Pune suburbs directly by name', () => {
    expect(sandbox.cityFromString('Andheri', 'Maharashtra')).toBe('mumbai');
    expect(sandbox.cityFromString('Baner', 'Maharashtra')).toBe('pune');
    expect(sandbox.cityFromString('Hinjewadi', 'Maharashtra')).toBe('pune');
  });

  it('falls back to region-level matching for single-city states', () => {
    // Koramangala isn't itself in GEO_CITY_MAP, but Karnataka has exactly
    // one covered city, so the region fallback safely resolves it.
    expect(sandbox.cityFromString('Koramangala', 'Karnataka')).toBe('bengaluru');
    expect(sandbox.cityFromString('Whitefield', 'Karnataka')).toBe('bengaluru');
    expect(sandbox.cityFromString('Dwarka', 'Delhi')).toBe('delhi');
  });

  it('does NOT use region fallback for Maharashtra (ambiguous: Mumbai vs Pune)', () => {
    // This is the one state where guessing wrong would actually be worse
    // than showing the manual chooser - Maharashtra covers both Mumbai
    // and Pune, so an unrecognized suburb must return null, not guess.
    expect(sandbox.cityFromString('SomeRandomVillage', 'Maharashtra')).toBeNull();
  });

  it('returns null for a city/region with no coverage at all', () => {
    expect(sandbox.cityFromString('Springfield', 'Illinois')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(sandbox.cityFromString('BORIVALI', 'MAHARASHTRA')).toBe('mumbai');
    expect(sandbox.cityFromString('borivali', 'maharashtra')).toBe('mumbai');
  });
});

describe('city data integrity', () => {
  it('every city in CITY_LIST exists in CITIES', () => {
    for (const slug of sandbox.CITY_LIST) {
      expect(sandbox.CITIES[slug], `CITY_LIST references missing city "${slug}"`).toBeDefined();
    }
  });

  it('every city has the fields the UI/layout depends on', () => {
    for (const [slug, city] of Object.entries(sandbox.CITIES)) {
      expect(city.name, `${slug}.name`).toBeTruthy();
      expect(city.state, `${slug}.state`).toBeTruthy();
      expect(city.tariffDate, `${slug}.tariffDate`).toBeTruthy();
      expect(city.tariff, `${slug}.tariff`).toBeTruthy();
      expect(city.rtoContact, `${slug}.rtoContact`).toSatisfy(Array.isArray);
      expect(city.helpline, `${slug}.helpline`).toBeTruthy();
    }
  });

  it('every tariff is either flat-rate (MIN_FARE+RATE_PER_KM) or tiered (BANDS), never neither', () => {
    for (const [slug, city] of Object.entries(sandbox.CITIES)) {
      const T = city.tariff;
      const isFlat = T.MIN_FARE !== undefined && T.RATE_PER_KM !== undefined;
      const isTiered = Array.isArray(T.BANDS) && T.BANDS.length > 0;
      expect(isFlat || isTiered, `${slug}.tariff is neither flat nor tiered`).toBe(true);
    }
  });

  it('tiered tariffs have bands sorted ascending by upTo with no gaps', () => {
    for (const [slug, city] of Object.entries(sandbox.CITIES)) {
      const bands = city.tariff.BANDS;
      if (!bands) continue;
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i].upTo, `${slug} BANDS not ascending at index ${i}`).toBeGreaterThan(bands[i - 1].upTo);
      }
    }
  });

  it('cities with primaryVehicleType "taxi" have no auto-only vehicle-toggle expectation (no taxiTariff needed)', () => {
    // Taxi-primary cities (Goa, Gangtok) use `tariff` directly as the
    // taxi rate - they should NOT also define taxiTariff, since that
    // field means "this city has BOTH auto and taxi" in the toggle sense.
    for (const [slug, city] of Object.entries(sandbox.CITIES)) {
      if (city.primaryVehicleType === 'taxi') {
        expect(city.taxiTariff, `${slug} is taxi-primary but also has taxiTariff (ambiguous)`).toBeUndefined();
      }
    }
  });
});
