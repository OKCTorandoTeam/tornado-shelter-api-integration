/**
 * Tornado Shelter App, Oklahoma University Locations Configuration
 *
 * 15 public university campus locations across Oklahoma, selected for:
 *   - Major public universities in high-population metro areas
 *   - Geographic spread across tornado-prone zones
 *   - High student density (demand for shelter alerts)
 *   - Proximity to historically active tornado corridors
 *
 * Tornado Risk Context:
 *   Oklahoma averages 50+ tornadoes per year and sits at the heart of
 *   Tornado Alley. Central Oklahoma (Oklahoma County, Cleveland County,
 *   Canadian County) is the highest-risk zone, with Moore alone hit by
 *   20+ documented tornadoes since 1890, including two EF5 events
 *   (1999 and 2013). The corridor from Norman through Moore to OKC
 *   is where warm Gulf air, cold Canadian air, and dry western air
 *   converge most frequently.
 *
 * Usage (with the NWS data pipeline):
 *   import { LOCATIONS } from './locations-config.mjs';
 *   // or: const { LOCATIONS } = require('./locations-config.js');
 *
 *   // Use all 15
 *   for (const loc of LOCATIONS) { ... }
 *
 *   // Filter by risk zone
 *   const highRisk = LOCATIONS.filter(l => l.tornadoRiskZone === 'EXTREME');
 *
 *   // CLI override format
 *   const cliString = LOCATIONS.map(l => `${l.name},${l.lat},${l.lon}`).join(';');
 *
 * Sources:
 *   - Coordinates: latitude.to, latlong.net, countrycoordinate.com
 *   - Tornado data: NWS Norman (weather.gov/oun/tornadodata-city-ok)
 *   - University info: Oklahoma State Regents (okhighered.org)
 *   - Risk zones: NOAA SPC, Oklahoma Dept of Emergency Management
 */

// ─────────────────────────────────────────────────────────────
// ALL 15 LOCATIONS
// ─────────────────────────────────────────────────────────────

export const LOCATIONS = [

  // ── CENTRAL OKLAHOMA / OKC METRO (EXTREME TORNADO RISK) ──
  // This corridor from Norman through Moore to Edmond is the
  // most tornado-active urban area in the United States.

  {
    name: 'University of Oklahoma',
    abbrev: 'ou',
    city: 'Norman',
    lat: 35.2059,
    lon: -97.4457,
    metro: 'Oklahoma City',
    tornadoRiskZone: 'EXTREME',
    notes: 'R1 research university. Norman is in Cleveland County, one of the highest tornado-frequency counties in Oklahoma. Home to the National Weather Center and NOAA Storm Prediction Center.',
  },
  {
    name: 'University of Central Oklahoma',
    abbrev: 'uco',
    city: 'Edmond',
    lat: 35.6550,
    lon: -97.4698,
    metro: 'Oklahoma City',
    tornadoRiskZone: 'EXTREME',
    notes: 'Third-largest university in Oklahoma with 17,000+ students. Edmond sits in Oklahoma County, the most populous and tornado-prone county in the state.',
  },
  {
    name: 'OU Health Sciences Center',
    abbrev: 'ouhsc',
    city: 'Oklahoma City',
    lat: 35.4818,
    lon: -97.4956,
    metro: 'Oklahoma City',
    tornadoRiskZone: 'EXTREME',
    notes: 'Major medical campus in central OKC. Oklahoma City has been struck by 100+ tornadoes since 1890 across the immediate metro area.',
  },
  {
    name: 'Langston University',
    abbrev: 'langston',
    city: 'Langston',
    lat: 35.9448,
    lon: -97.2612,
    metro: 'Oklahoma City',
    tornadoRiskZone: 'HIGH',
    notes: 'Oklahoma\'s only historically Black university. Located in Logan County, north of the OKC metro, in the central Oklahoma tornado corridor.',
  },

  // ── NORTH CENTRAL OKLAHOMA (HIGH TORNADO RISK) ──

  {
    name: 'Oklahoma State University',
    abbrev: 'osu',
    city: 'Stillwater',
    lat: 36.1260,
    lon: -97.0752,
    metro: 'Stillwater',
    tornadoRiskZone: 'HIGH',
    notes: 'Land-grant R1 research university. Stillwater is in Payne County, which has recorded significant tornado events. Stillwater itself was hit by a tornado in 2015.',
  },
  {
    name: 'Northwestern Oklahoma State University',
    abbrev: 'nwosu',
    city: 'Alva',
    lat: 36.8050,
    lon: -98.6665,
    metro: 'Alva',
    tornadoRiskZone: 'HIGH',
    notes: 'Located in Woods County in northwest Oklahoma. The northwest region sees frequent tornado activity, particularly from supercells that form along the dryline.',
  },

  // ── TULSA METRO (HIGH TORNADO RISK) ──

  {
    name: 'University of Tulsa',
    abbrev: 'tu',
    city: 'Tulsa',
    lat: 36.1514,
    lon: -95.9460,
    metro: 'Tulsa',
    tornadoRiskZone: 'HIGH',
    notes: 'Private research university in the Tulsa metro, Oklahoma\'s second-largest city. Tulsa County has significant tornado history.',
  },
  {
    name: 'OSU-Tulsa',
    abbrev: 'osutulsa',
    city: 'Tulsa',
    lat: 36.1520,
    lon: -95.9453,
    metro: 'Tulsa',
    tornadoRiskZone: 'HIGH',
    notes: 'Oklahoma State University\'s Tulsa campus serves the greater Tulsa metro area of 1M+ residents.',
  },
  {
    name: 'Northeastern State University',
    abbrev: 'nsu',
    city: 'Tahlequah',
    lat: 35.9205,
    lon: -94.9671,
    metro: 'Tahlequah',
    tornadoRiskZone: 'MODERATE',
    notes: 'Oklahoma\'s oldest public university. Located in Cherokee County at the foothills of the Ozark Mountains, east of the primary tornado corridor but still tornado-active.',
  },

  // ── SOUTHWEST OKLAHOMA (HIGH TORNADO RISK) ──

  {
    name: 'Cameron University',
    abbrev: 'cameron',
    city: 'Lawton',
    lat: 34.6087,
    lon: -98.4345,
    metro: 'Lawton',
    tornadoRiskZone: 'HIGH',
    notes: 'Located in Comanche County, southwest Oklahoma. Lawton is the state\'s fifth-largest city and sits in a high-risk zone for spring supercell development.',
  },
  {
    name: 'Southwestern Oklahoma State University',
    abbrev: 'swosu',
    city: 'Weatherford',
    lat: 35.5384,
    lon: -98.6884,
    metro: 'Weatherford',
    tornadoRiskZone: 'HIGH',
    notes: 'Located in Custer County along the I-40 corridor in western Oklahoma. The western dryline frequently initiates severe storms in this area.',
  },

  // ── SOUTHEAST OKLAHOMA (MODERATE TORNADO RISK) ──

  {
    name: 'East Central University',
    abbrev: 'ecu',
    city: 'Ada',
    lat: 34.7746,
    lon: -96.6783,
    metro: 'Ada',
    tornadoRiskZone: 'MODERATE',
    notes: 'Located in Pontotoc County in south-central Oklahoma. Ada is in the transition zone between the central tornado corridor and the southeastern hills.',
  },
  {
    name: 'Southeastern Oklahoma State University',
    abbrev: 'se',
    city: 'Durant',
    lat: 33.9943,
    lon: -96.3926,
    metro: 'Durant',
    tornadoRiskZone: 'MODERATE',
    notes: 'Located in Bryan County near the Texas border, 150 miles from OKC. Southeast Oklahoma sees fewer tornadoes than central, but is still within Tornado Alley.',
  },

  // ── HIGH-RISK SUPPLEMENTAL LOCATIONS ──
  // These are additional high-demand areas not tied to a
  // specific university but critical for app coverage.

  {
    name: 'Moore (OKC Metro)',
    abbrev: 'moore',
    city: 'Moore',
    lat: 35.3395,
    lon: -97.4867,
    metro: 'Oklahoma City',
    tornadoRiskZone: 'EXTREME',
    notes: 'The most tornado-struck city in Oklahoma. Hit by 20+ documented tornadoes since 1890, including two EF5 events (1999 and 2013). Essential coverage point between Norman and OKC.',
  },
  {
    name: 'Midwest City (Tinker AFB)',
    abbrev: 'midwestcity',
    city: 'Midwest City',
    lat: 35.4495,
    lon: -97.3967,
    metro: 'Oklahoma City',
    tornadoRiskZone: 'EXTREME',
    notes: 'Adjacent to Tinker Air Force Base, where the first-ever tornado warning in US history was issued in 1948. Midwest City is in the OKC metro tornado corridor.',
  },
];

// ─────────────────────────────────────────────────────────────
// HELPER EXPORTS
// ─────────────────────────────────────────────────────────────

/** Get locations filtered by tornado risk zone */
export function getByRiskZone(zone) {
  return LOCATIONS.filter(l => l.tornadoRiskZone === zone);
}

/** Get locations for a specific metro area */
export function getByMetro(metro) {
  return LOCATIONS.filter(l => l.metro.toLowerCase() === metro.toLowerCase());
}

/** Get the CLI-formatted string for use with --locations flag */
export function toCLIString(locations = LOCATIONS) {
  return locations.map(l => `${l.name},${l.lat},${l.lon}`).join(';');
}

/** University-only locations (excludes supplemental) */
export function getUniversitiesOnly() {
  return LOCATIONS.filter(l =>
    !['moore', 'midwestcity'].includes(l.abbrev)
  );
}

// ─────────────────────────────────────────────────────────────
// DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────

export default LOCATIONS;
