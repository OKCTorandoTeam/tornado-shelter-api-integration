/**
 * Tornado Shelter App, NWS Weather Data Pipeline (ES Modules)
 *
 * Pulls weather data from the National Weather Service API:
 *   1. NWS Forecast Grid Data (raw hourly: pressure, wind, precipitation)
 *   2. NWS Forecast (14-period human-readable summaries)
 *   3. NWS Active Alerts (per-location point alerts + statewide Oklahoma)
 *
 * Outputs a single consolidated JSON file per location, plus
 * an overall summary file combining all locations.
 *
 * Optimized factors:
 *   - Pressure (barometric, hPa)
 *   - Wind Speed (mph, including gusts)
 *   - Precipitation (probability and quantitative)
 *   - Latest Update (pull timestamp and NWS grid update time)
 *
 * USAGE:
 *   node pull-weather-data-esm.mjs
 *   node pull-weather-data-esm.mjs --locations "Norman,35.2226,-97.4395;Edmond,35.6528,-97.4781"
 *   node pull-weather-data-esm.mjs --output ./my_output_folder
 *
 * REQUIRES: "type": "module" in package.json  OR  use .mjs extension
 *
 * API Reference:
 *   Provider:        NOAA / National Weather Service
 *   Website:         https://www.weather.gov/
 *   Documentation:   https://www.weather.gov/documentation/services-web-api
 *   Specification:   https://api.weather.gov/openapi.json
 *   Authentication:  User-Agent header (no API key)
 *   Rate Limits:     Not publicly specified, reasonable use expected
 *   Response Format: GeoJSON
 */

import fs from 'fs';
import path from 'path';
import { LOCATIONS as ALL_LOCATIONS } from './ok-locations-config.js';

// ──────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────

const CONFIG = {
  // NWS API
  NWS_BASE_URL: 'https://api.weather.gov',
  USER_AGENT: 'TornadoShelterApp/1.0 (okctornadoteam@gmail.com)',
  ACCEPT_HEADER: 'application/geo+json',

  // Timing
  REQUEST_TIMEOUT_MS: 20000,
  REQUEST_DELAY_MS: 500,

  // Output
  OUTPUT_DIR: './weather_data',

  // Oklahoma state code for statewide alerts
  STATE_CODE: 'OK',

  // Grid data extraction, hours of forecast to pull
  GRID_HOURS: 24,

  // Forecast periods to pull from /forecast endpoint
  FORECAST_PERIODS: 14,
};

// Severe weather thresholds
const THRESHOLDS = {
  windGustSevereMph: 58,
  windGustWarningMph: 40,
  windSpeedElevatedMph: 25,
  pressureDropAlertHpa: 4,
  precipProbElevatedPct: 50,
  precipProbHighPct: 80,
};

// Default locations loaded from locations-config.mjs (15 Oklahoma university + high-risk locations)
// Overridable via --locations CLI flag
const DEFAULT_LOCATIONS = ALL_LOCATIONS;

// ──────────────────────────────────────────────
// CONSOLE LOGGING
// ──────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  red:     '\x1b[31m',
};

function logSuccess(msg) { console.log(`${C.green}  [OK] ${msg}${C.reset}`); }
function logError(msg)   { console.log(`${C.red}  [FAIL] ${msg}${C.reset}`); }
function logInfo(msg)    { console.log(`${C.blue}  [INFO] ${msg}${C.reset}`); }
function logWarn(msg)    { console.log(`${C.yellow}  [WARN] ${msg}${C.reset}`); }

function logSection(title) {
  const bar = '─'.repeat(56);
  console.log(`\n${C.cyan}${bar}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title}${C.reset}`);
  console.log(`${C.cyan}${bar}${C.reset}`);
}

// ──────────────────────────────────────────────
// HTTP HELPER
// ──────────────────────────────────────────────

async function fetchJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': CONFIG.ACCEPT_HEADER,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logError(`HTTP ${response.status}: ${url}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      logError(`Request timed out: ${url}`);
    } else {
      logError(`Request failed: ${err.message}`);
    }
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// UNIT CONVERSIONS
// ──────────────────────────────────────────────

function kmhToMph(kmh) {
  if (kmh == null) return null;
  return Math.round(kmh * 0.621371 * 10) / 10;
}

function paToHpa(pa) {
  if (pa == null) return null;
  return Math.round(pa / 100 * 100) / 100;
}

function mmToInches(mm) {
  if (mm == null) return null;
  return Math.round(mm / 25.4 * 1000) / 1000;
}

function celsiusToFahrenheit(c) {
  if (c == null) return null;
  return Math.round((c * 9 / 5 + 32) * 10) / 10;
}

// ──────────────────────────────────────────────
// GRID DATA EXTRACTION HELPERS
// ──────────────────────────────────────────────

function extractGridValues(propBlock, count) {
  if (!propBlock || !propBlock.values) return [];
  return propBlock.values.slice(0, count).map(v => ({
    validTime: v.validTime,
    value: v.value,
  }));
}

// ──────────────────────────────────────────────
// NWS POINT METADATA + RAW GRID DATA
// ──────────────────────────────────────────────

async function resolveGridPoint(lat, lon) {
  const url = `${CONFIG.NWS_BASE_URL}/points/${lat},${lon}`;
  const data = await fetchJSON(url);
  if (!data) return null;

  const props = data.properties || {};
  return {
    gridId: props.gridId,
    gridX: props.gridX,
    gridY: props.gridY,
    forecastGridDataUrl: props.forecastGridData,
    forecastUrl: props.forecast,
    city: props.relativeLocation?.properties?.city || null,
    state: props.relativeLocation?.properties?.state || null,
  };
}

async function pullRawGridData(gridMeta) {
  const url = gridMeta.forecastGridDataUrl;
  if (!url) return { error: 'No forecastGridData URL available' };

  const data = await fetchJSON(url);
  if (!data) return { error: 'Failed to fetch raw grid data' };

  const gp = data.properties || {};
  const hours = CONFIG.GRID_HOURS;

  // Extract raw values
  const rawPressure   = extractGridValues(gp.pressure, hours);
  const rawWindSpeed  = extractGridValues(gp.windSpeed, hours);
  const rawWindGust   = extractGridValues(gp.windGust, hours);
  const rawWindDir    = extractGridValues(gp.windDirection, hours);
  const rawPrecipProb = extractGridValues(gp.probabilityOfPrecipitation, hours);
  const rawPrecipQty  = extractGridValues(gp.quantitativePrecipitation, hours);
  const rawTemp       = extractGridValues(gp.temperature, hours);
  const rawDewpoint   = extractGridValues(gp.dewpoint, hours);
  const rawHumidity   = extractGridValues(gp.relativeHumidity, hours);
  const rawThunder    = extractGridValues(gp.probabilityOfThunder, hours);

  return {
    updateTime: gp.updateTime || null,

    // Core 4 factors with unit conversions
    pressure: rawPressure.map(v => ({
      validTime: v.validTime,
      value_hpa: paToHpa(v.value),
    })),
    windSpeed: rawWindSpeed.map(v => ({
      validTime: v.validTime,
      value_mph: kmhToMph(v.value),
    })),
    windGust: rawWindGust.map(v => ({
      validTime: v.validTime,
      value_mph: kmhToMph(v.value),
    })),
    windDirection: rawWindDir.map(v => ({
      validTime: v.validTime,
      value_degrees: v.value,
    })),
    precipitationProbability: rawPrecipProb.map(v => ({
      validTime: v.validTime,
      value_pct: v.value,
    })),
    precipitationQuantity: rawPrecipQty.map(v => ({
      validTime: v.validTime,
      value_inches: mmToInches(v.value),
    })),

    // Supporting metrics
    temperature: rawTemp.map(v => ({
      validTime: v.validTime,
      value_f: celsiusToFahrenheit(v.value),
    })),
    dewpoint: rawDewpoint.map(v => ({
      validTime: v.validTime,
      value_f: celsiusToFahrenheit(v.value),
    })),
    humidity: rawHumidity.map(v => ({
      validTime: v.validTime,
      value_pct: v.value,
    })),
    thunderProbability: rawThunder.map(v => ({
      validTime: v.validTime,
      value_pct: v.value,
    })),
  };
}

// ──────────────────────────────────────────────
// NWS /FORECAST (14-PERIOD READABLE SUMMARIES)
// ──────────────────────────────────────────────

async function pullForecastPeriods(gridMeta) {
  const url = gridMeta.forecastUrl;
  if (!url) return { error: 'No forecast URL available' };

  const data = await fetchJSON(url);
  if (!data) return { error: 'Failed to fetch forecast' };

  const props = data.properties || {};
  const periods = (props.periods || []).slice(0, CONFIG.FORECAST_PERIODS);

  return {
    generatedAt: props.generatedAt || null,
    updateTime: props.updateTime || null,
    elevation: props.elevation || null,
    periods: periods.map(p => ({
      number: p.number,
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      isDaytime: p.isDaytime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      shortForecast: p.shortForecast,
      detailedForecast: p.detailedForecast,
      probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value || null,
    })),
  };
}

// ──────────────────────────────────────────────
// NWS ACTIVE ALERTS
// ──────────────────────────────────────────────

function parseAlerts(features) {
  return (features || []).map(f => {
    const p = f.properties || {};
    const event = p.event || '';
    return {
      id: p.id,
      event,
      headline: p.headline,
      severity: p.severity,
      urgency: p.urgency,
      certainty: p.certainty,
      onset: p.onset,
      expires: p.expires,
      sender: p.senderName,
      area: p.areaDesc,
      isTornadoRelated: event.toLowerCase().includes('tornado'),
      instruction: p.instruction,
    };
  });
}

async function pullPointAlerts(lat, lon) {
  const url = `${CONFIG.NWS_BASE_URL}/alerts/active?point=${lat},${lon}`;
  const data = await fetchJSON(url);
  if (!data) return { error: 'Failed to fetch point alerts', alerts: [] };

  const alerts = parseAlerts(data.features);
  return {
    alertCount: alerts.length,
    tornadoAlertCount: alerts.filter(a => a.isTornadoRelated).length,
    alerts,
  };
}

async function pullStatewideAlerts() {
  logSection(`Statewide Alerts (${CONFIG.STATE_CODE})`);
  console.log(`  Fetching all active alerts for ${CONFIG.STATE_CODE}...`);

  const url = `${CONFIG.NWS_BASE_URL}/alerts/active?area=${CONFIG.STATE_CODE}`;
  const data = await fetchJSON(url);
  if (!data) {
    logError('Failed to fetch statewide alerts');
    return { error: 'Failed to fetch statewide alerts', alerts: [] };
  }

  const alerts = parseAlerts(data.features);
  const tornadoCount = alerts.filter(a => a.isTornadoRelated).length;
  logSuccess(`Statewide: ${alerts.length} alert(s), ${tornadoCount} tornado-related`);

  return {
    state: CONFIG.STATE_CODE,
    alertCount: alerts.length,
    tornadoAlertCount: tornadoCount,
    alerts,
  };
}

// ──────────────────────────────────────────────
// SEVERITY ANALYSIS
// ──────────────────────────────────────────────

function computeSeverityFlags(gridData) {
  const flags = {
    maxWindGustMph: null,
    maxWindSpeedMph: null,
    windGustSevere: false,
    windGustWarning: false,
    maxPrecipProbPct: null,
    precipElevated: false,
    precipHigh: false,
    pressureMinHpa: null,
    pressureMaxHpa: null,
    pressureRangeHpa: null,
    rapidPressureDrop: false,
    maxThunderProbPct: null,
  };

  // Wind gusts
  const gusts = gridData.windGust
    .map(v => v.value_mph)
    .filter(v => v != null);
  if (gusts.length) {
    flags.maxWindGustMph = Math.max(...gusts);
    flags.windGustSevere = flags.maxWindGustMph >= THRESHOLDS.windGustSevereMph;
    flags.windGustWarning = flags.maxWindGustMph >= THRESHOLDS.windGustWarningMph;
  }

  // Wind speed
  const speeds = gridData.windSpeed
    .map(v => v.value_mph)
    .filter(v => v != null);
  if (speeds.length) {
    flags.maxWindSpeedMph = Math.max(...speeds);
  }

  // Precipitation probability
  const probs = gridData.precipitationProbability
    .map(v => v.value_pct)
    .filter(v => v != null);
  if (probs.length) {
    flags.maxPrecipProbPct = Math.max(...probs);
    flags.precipElevated = flags.maxPrecipProbPct >= THRESHOLDS.precipProbElevatedPct;
    flags.precipHigh = flags.maxPrecipProbPct >= THRESHOLDS.precipProbHighPct;
  }

  // Pressure
  const pressures = gridData.pressure
    .map(v => v.value_hpa)
    .filter(v => v != null);
  if (pressures.length) {
    flags.pressureMinHpa = Math.min(...pressures);
    flags.pressureMaxHpa = Math.max(...pressures);
    flags.pressureRangeHpa = Math.round((flags.pressureMaxHpa - flags.pressureMinHpa) * 100) / 100;
    flags.rapidPressureDrop = flags.pressureRangeHpa >= THRESHOLDS.pressureDropAlertHpa;
  }

  // Thunder probability
  const thunder = gridData.thunderProbability
    .map(v => v.value_pct)
    .filter(v => v != null);
  if (thunder.length) {
    flags.maxThunderProbPct = Math.max(...thunder);
  }

  return flags;
}

function buildSeveritySummary(flags, pointAlerts) {
  const tornadoAlerts = pointAlerts.tornadoAlertCount || 0;
  const totalAlerts = pointAlerts.alertCount || 0;

  let level = 'NONE';
  const reasons = [];

  // Tornado alerts are the highest priority
  if (tornadoAlerts > 0) {
    level = 'EXTREME';
    reasons.push(`${tornadoAlerts} active tornado alert(s)`);
  }

  // Wind analysis
  if (flags.windGustSevere) {
    if (level !== 'EXTREME') level = 'HIGH';
    reasons.push(`Severe wind gusts forecast: ${flags.maxWindGustMph} mph`);
  } else if (flags.windGustWarning) {
    if (level === 'NONE' || level === 'LOW') level = 'MODERATE';
    reasons.push(`High wind gusts forecast: ${flags.maxWindGustMph} mph`);
  }

  // Pressure analysis
  if (flags.rapidPressureDrop) {
    if (level === 'NONE' || level === 'LOW') level = 'MODERATE';
    reasons.push(`Rapid pressure change: ${flags.pressureRangeHpa} hPa range`);
  }

  // Precipitation analysis
  if (flags.precipHigh) {
    if (level === 'NONE' || level === 'LOW') level = 'MODERATE';
    reasons.push(`High precipitation probability: ${flags.maxPrecipProbPct}%`);
  } else if (flags.precipElevated) {
    if (level === 'NONE') level = 'LOW';
    reasons.push(`Elevated precipitation probability: ${flags.maxPrecipProbPct}%`);
  }

  // Thunder probability
  if (flags.maxThunderProbPct != null && flags.maxThunderProbPct >= 60) {
    if (level === 'NONE' || level === 'LOW') level = 'MODERATE';
    reasons.push(`Thunder probability: ${flags.maxThunderProbPct}%`);
  }

  // Non-tornado alerts
  if (totalAlerts > 0 && tornadoAlerts === 0) {
    if (level === 'NONE') level = 'LOW';
    reasons.push(`${totalAlerts} non-tornado alert(s) active`);
  }

  if (reasons.length === 0) {
    reasons.push('No significant weather threats detected');
  }

  return { threatLevel: level, reasons };
}

// ──────────────────────────────────────────────
// CONSOLIDATED LOCATION OUTPUT
// ──────────────────────────────────────────────

async function buildLocationOutput(location) {
  const { name, lat, lon } = location;
  const pullTime = new Date().toISOString();

  logSection(`Pulling data for ${name}`);

  // Step 1: Resolve grid point
  console.log('  Resolving NWS grid point...');
  const gridMeta = await resolveGridPoint(lat, lon);
  if (!gridMeta) {
    logError(`Could not resolve grid point for ${name}`);
    return { location: { name, lat, lon }, error: 'Grid point resolution failed' };
  }
  logSuccess(`Grid: ${gridMeta.gridId} (${gridMeta.gridX},${gridMeta.gridY})`);
  await delay(CONFIG.REQUEST_DELAY_MS);

  // Step 2: Raw grid data (pressure, wind, precipitation hourly)
  console.log('  Fetching raw grid forecast data...');
  const gridData = await pullRawGridData(gridMeta);
  if (gridData.error) {
    logError(`Raw grid: ${gridData.error}`);
  } else {
    logSuccess(`Raw grid data: ${gridData.pressure.length} pressure, ` +
               `${gridData.windSpeed.length} wind, ` +
               `${gridData.precipitationProbability.length} precip readings`);
  }
  await delay(CONFIG.REQUEST_DELAY_MS);

  // Step 3: Forecast periods (readable summaries)
  console.log('  Fetching 14-period forecast...');
  const forecast = await pullForecastPeriods(gridMeta);
  if (forecast.error) {
    logError(`Forecast: ${forecast.error}`);
  } else {
    logSuccess(`Forecast: ${forecast.periods.length} period(s) retrieved`);
  }
  await delay(CONFIG.REQUEST_DELAY_MS);

  // Step 4: Point alerts
  console.log('  Fetching active alerts for this location...');
  const pointAlerts = await pullPointAlerts(lat, lon);
  if (pointAlerts.error) {
    logError(`Alerts: ${pointAlerts.error}`);
  } else {
    logSuccess(`Alerts: ${pointAlerts.alertCount} active, ` +
               `${pointAlerts.tornadoAlertCount} tornado-related`);
  }

  // Step 5: Severity analysis
  const severityFlags = gridData.error ? {} : computeSeverityFlags(gridData);
  const severitySummary = buildSeveritySummary(severityFlags, pointAlerts);

  // Build consolidated output
  return {
    meta: {
      app: 'Tornado Shelter Alert App',
      pipeline: 'NWS Weather Data Pipeline (Node.js ESM)',
      pulledAt: pullTime,
      nwsGridUpdate: gridData.updateTime || null,
      nwsForecastGenerated: forecast.generatedAt || null,
    },
    location: {
      name,
      lat,
      lon,
      gridOffice: gridMeta.gridId,
      gridX: gridMeta.gridX,
      gridY: gridMeta.gridY,
      nearestCity: gridMeta.city,
      nearestState: gridMeta.state,
    },
    factors: {
      pressure: {
        unit: 'hPa',
        forecast24h: gridData.pressure || [],
        minHpa: severityFlags.pressureMinHpa || null,
        maxHpa: severityFlags.pressureMaxHpa || null,
        rangeHpa: severityFlags.pressureRangeHpa || null,
        rapidDropDetected: severityFlags.rapidPressureDrop || false,
      },
      windSpeed: {
        unit: 'mph',
        speedForecast24h: gridData.windSpeed || [],
        gustForecast24h: gridData.windGust || [],
        directionForecast24h: gridData.windDirection || [],
        maxSpeedMph: severityFlags.maxWindSpeedMph || null,
        maxGustMph: severityFlags.maxWindGustMph || null,
        gustWarning: severityFlags.windGustWarning || false,
        gustSevere: severityFlags.windGustSevere || false,
      },
      precipitation: {
        probabilityUnit: '%',
        quantityUnit: 'inches',
        probabilityForecast24h: gridData.precipitationProbability || [],
        quantityForecast24h: gridData.precipitationQuantity || [],
        maxProbabilityPct: severityFlags.maxPrecipProbPct || null,
        elevated: severityFlags.precipElevated || false,
        high: severityFlags.precipHigh || false,
      },
      latestUpdate: {
        pipelinePullUtc: pullTime,
        nwsGridUpdateUtc: gridData.updateTime || null,
        nwsForecastGeneratedUtc: forecast.generatedAt || null,
        pipelinePullLocal: new Date().toLocaleString('en-US', {
          timeZone: 'America/Chicago',
          dateStyle: 'full',
          timeStyle: 'long',
        }),
      },
    },
    forecast: {
      source: 'NWS /forecast (14-period)',
      generatedAt: forecast.generatedAt || null,
      periods: forecast.periods || [],
    },
    supportingMetrics: {
      temperature: gridData.temperature || [],
      dewpoint: gridData.dewpoint || [],
      humidity: gridData.humidity || [],
      thunderProbability: gridData.thunderProbability || [],
      maxThunderProbPct: severityFlags.maxThunderProbPct || null,
    },
    alerts: {
      total: pointAlerts.alertCount || 0,
      tornadoRelated: pointAlerts.tornadoAlertCount || 0,
      items: pointAlerts.alerts || [],
    },
    severitySummary,
  };
}

// ──────────────────────────────────────────────
// FILE I/O
// ──────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function saveJSON(filepath, data) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  logSuccess(`Saved: ${path.basename(filepath)}`);
}

// ──────────────────────────────────────────────
// CLI ARGUMENT PARSING
// ──────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { locations: null, output: CONFIG.OUTPUT_DIR };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--locations' && args[i + 1]) {
      parsed.locations = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      parsed.output = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: node pull-weather-data-esm.mjs [options]

Options:
  --locations "Name,lat,lon;Name,lat,lon"   Custom locations (semicolon-separated)
  --output ./path                           Output directory (default: ./weather_data)
  --help                                    Show this help

Examples:
  node pull-weather-data-esm.mjs
  node pull-weather-data-esm.mjs --locations "Norman,35.2226,-97.4395;Edmond,35.6528,-97.4781"
  node pull-weather-data-esm.mjs --output ./demo_data
      `);
      process.exit(0);
    }
  }

  return parsed;
}

function parseLocationsString(raw) {
  const locations = [];
  for (const entry of raw.split(';')) {
    const parts = entry.trim().split(',');
    if (parts.length !== 3) {
      logWarn(`Skipping malformed location: "${entry.trim()}"`);
      continue;
    }
    const lat = parseFloat(parts[1]);
    const lon = parseFloat(parts[2]);
    if (isNaN(lat) || isNaN(lon)) {
      logWarn(`Invalid coordinates in: "${entry.trim()}"`);
      continue;
    }
    locations.push({ name: parts[0].trim(), lat, lon });
  }
  return locations;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  // Resolve locations
  let locations;
  if (args.locations) {
    locations = parseLocationsString(args.locations);
    if (locations.length === 0) {
      console.log(`${C.red}No valid locations provided. Exiting.${C.reset}`);
      process.exit(1);
    }
  } else {
    locations = DEFAULT_LOCATIONS;
  }

  const outputDir = args.output;
  const pullTime = new Date().toISOString();

  // Banner
  console.log(`\n${C.magenta}${'='.repeat(60)}${C.reset}`);
  console.log(`${C.magenta}${C.bold}  TORNADO SHELTER APP, NWS DATA PIPELINE (NODE.JS ESM)${C.reset}`);
  console.log(`${C.magenta}${'='.repeat(60)}${C.reset}`);
  console.log(`\n${C.cyan}  Pull Time : ${C.reset}${new Date().toLocaleString()}`);
  console.log(`${C.cyan}  Locations : ${C.reset}${locations.map(l => l.name).join(', ')}`);
  console.log(`${C.cyan}  Output    : ${C.reset}${outputDir}/`);
  console.log(`${C.cyan}  Sources   : ${C.reset}NWS Grid Data + NWS Forecast + NWS Alerts`);
  console.log(`${C.cyan}  Factors   : ${C.reset}Pressure, Wind Speed, Precipitation, Latest Update`);

  // Pull statewide alerts first (shared across all locations)
  const statewideAlerts = await pullStatewideAlerts();
  await delay(CONFIG.REQUEST_DELAY_MS);

  // Pull data for each location
  const allOutputs = [];
  for (const loc of locations) {
    const output = await buildLocationOutput(loc);
    allOutputs.push(output);

    // Save individual location file
    const slug = slugify(loc.name);
    const filepath = path.join(outputDir, `nws_${slug}.json`);
    saveJSON(filepath, output);

    await delay(CONFIG.REQUEST_DELAY_MS);
  }

  // Save statewide alerts
  const statewideFilepath = path.join(outputDir, `nws_alerts_statewide_${CONFIG.STATE_CODE.toLowerCase()}.json`);
  saveJSON(statewideFilepath, {
    meta: {
      app: 'Tornado Shelter Alert App',
      pulledAt: pullTime,
    },
    ...statewideAlerts,
  });

  // Build and save combined summary
  logSection('Combined Summary');

  const threatOrder = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'EXTREME'];
  let highestThreat = 'NONE';

  const summary = {
    meta: {
      app: 'Tornado Shelter Alert App',
      pipeline: 'NWS Weather Data Pipeline (Node.js ESM)',
      pulledAt: pullTime,
      locationCount: allOutputs.length,
    },
    statewideAlerts: {
      state: CONFIG.STATE_CODE,
      total: statewideAlerts.alertCount || 0,
      tornadoRelated: statewideAlerts.tornadoAlertCount || 0,
    },
    locations: allOutputs.map(out => {
      const threat = out.severitySummary?.threatLevel || 'NONE';
      if (threatOrder.indexOf(threat) > threatOrder.indexOf(highestThreat)) {
        highestThreat = threat;
      }
      return {
        name: out.location?.name,
        lat: out.location?.lat,
        lon: out.location?.lon,
        threatLevel: threat,
        reasons: out.severitySummary?.reasons || [],
        maxWindGustMph: out.factors?.windSpeed?.maxGustMph || null,
        maxPrecipProbPct: out.factors?.precipitation?.maxProbabilityPct || null,
        pressureRangeHpa: out.factors?.pressure?.rangeHpa || null,
        alertCount: out.alerts?.total || 0,
        tornadoAlerts: out.alerts?.tornadoRelated || 0,
      };
    }),
    overallThreatLevel: highestThreat,
  };

  const summaryPath = path.join(outputDir, 'nws_summary.json');
  saveJSON(summaryPath, summary);

  // Final report
  logSection('PULL COMPLETE');
  console.log(`${C.bold}  Overall Threat : ${highestThreat}${C.reset}`);

  for (const loc of summary.locations) {
    const threat = loc.threatLevel;
    const color = (threat === 'HIGH' || threat === 'EXTREME') ? C.red :
                  threat === 'MODERATE' ? C.yellow : C.green;
    console.log(`\n  ${loc.name.padEnd(20)} ${color}${threat}${C.reset}`);
    console.log(`    Wind Gust Max : ${loc.maxWindGustMph ?? 'N/A'} mph`);
    console.log(`    Precip Prob   : ${loc.maxPrecipProbPct ?? 'N/A'}%`);
    console.log(`    Pressure Range: ${loc.pressureRangeHpa ?? 'N/A'} hPa`);
    console.log(`    Alerts        : ${loc.alertCount} total, ${loc.tornadoAlerts} tornado`);
  }

  console.log(`\n  ${C.bold}Statewide (${CONFIG.STATE_CODE}):${C.reset} ${statewideAlerts.alertCount || 0} alerts`);

  const fileCount = allOutputs.length + 2; // per-location + statewide + summary
  console.log(`\n${C.green}${C.bold}  ${fileCount} file(s) saved to ${outputDir}/${C.reset}\n`);
}

main().catch(err => {
  console.error(`${C.red}Pipeline failed:${C.reset}`, err);
  process.exit(1);
});
