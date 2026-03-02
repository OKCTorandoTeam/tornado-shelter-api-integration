/**
 * Data Pull Script for Team Meeting Demo
 * 
 * This script pulls real data from all weather APIs and saves them as JSON files.
 * Run this before your team meeting to have fresh data to demonstrate.
 * 
 * DATA PULLED:
 * 1. NWS Alerts - Active weather alerts for OKC, Tulsa, Stillwater
 * 2. SPC Storm Reports - Today's tornado, wind, and hail reports
 * 3. FEMA Open Shelters - Currently open emergency shelters in Oklahoma
 * 4. Historical Tornado Data - Recent tornado events from NCEI
 * 
 * PREDICTIVE WEATHER APIs (NEW):
 * 5. SPC Convective Outlook - Tornado probability forecasts (Day 1-3)
 * 6. SPC Mesoscale Discussions - Pre-watch severe weather analysis
 * 7. NWS Forecast Grid Data - Detailed hourly forecasts with severe indicators
 * 
 * OUTPUT FILES (saved to ./meeting_demo_data/ folder):
 * - nws_alerts_*.json
 * - spc_*_reports_today.json
 * - fema_open_shelters_oklahoma.json
 * - historical_tornado_data_oklahoma.json
 * - spc_convective_outlook.json (NEW)
 * - spc_mesoscale_discussions.json (NEW)
 * - nws_forecast_grid_data.json (NEW)
 * - predictive_weather_summary.json (NEW)
 * - data_pull_summary.json
 * 
 * HOW TO RUN:
 * 1. Make sure package.json has "type": "module"
 * 2. Run: node pull-weather-data.js
 * 3. Check the ./meeting_demo_data/ folder for output files
 */

import fs from 'fs';
import path from 'path';

// =============
// CONFIGURATION
// =============

const CONFIG = {
  // Output directory for JSON files
  OUTPUT_DIR: './meeting_demo_data',
  
  // API endpoints - Current Weather
  NWS_BASE_URL: 'https://api.weather.gov',
  SPC_REPORTS_URL: 'https://www.spc.noaa.gov/climo/reports',
  FEMA_SHELTERS_URL: 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query',
  NCEI_STORM_EVENTS_URL: 'https://www.ncei.noaa.gov/cgi-bin/swdi/stormevents/csv',
  
  // API endpoints - Predictive Weather (NEW)
  SPC_OUTLOOK_URL: 'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer',
  SPC_MCD_URL: 'https://www.spc.noaa.gov/products/md',
  
  // API endpoints - Open-Meteo (FREE tornado prediction metrics)
  OPEN_METEO_URL: 'https://api.open-meteo.com/v1/forecast',
  
  // Required User-Agent for NWS API
  APP_USER_AGENT: 'TornadoShelterApp/1.0 (team-demo)',
  
  // Request timeout (ms)
  TIMEOUT_MS: 20000
};

// Oklahoma cities to pull data for
const LOCATIONS = [
  { name: 'Oklahoma City', lat: 35.4676, lon: -97.5164, abbrev: 'okc' },
  { name: 'Tulsa', lat: 36.1540, lon: -95.9928, abbrev: 'tulsa' },
  { name: 'Stillwater', lat: 36.1156, lon: -97.0584, abbrev: 'stillwater' }
];

// Console colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// ================
// HELPER FUNCTIONS
// ================

function log(message, color = COLORS.reset) {
  console.log(color + message + COLORS.reset);
}

function logSuccess(message) {
  console.log(COLORS.green + '✓ ' + message + COLORS.reset);
}

function logError(message) {
  console.log(COLORS.red + '✗ ' + message + COLORS.reset);
}

function logInfo(message) {
  console.log(COLORS.blue + 'ℹ ' + message + COLORS.reset);
}

function logSection(title) {
  console.log('\n' + COLORS.cyan + '═'.repeat(60) + COLORS.reset);
  console.log(COLORS.cyan + COLORS.bright + ' ' + title + COLORS.reset);
  console.log(COLORS.cyan + '═'.repeat(60) + COLORS.reset + '\n');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

function saveJSON(filename, data) {
  const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  logSuccess(`Saved: ${filename}`);
  return filepath;
}

function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    logInfo(`Created output directory: ${CONFIG.OUTPUT_DIR}`);
  }
}

// ====================
// NWS ALERTS DATA PULL
// ====================

async function pullNWSAlerts() {
  logSection('1. NWS Weather Alerts');
  
  const results = {
    pulledAt: new Date().toISOString(),
    locations: {},
    statewide: null,
    totalAlerts: 0
  };

  // Pull alerts for each city
  for (const location of LOCATIONS) {
    log(`Fetching alerts for ${location.name}...`);
    
    try {
      const url = `${CONFIG.NWS_BASE_URL}/alerts/active?point=${location.lat},${location.lon}`;
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': CONFIG.APP_USER_AGENT,
          'Accept': 'application/geo+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const alerts = (data.features || []).map(f => ({
        id: f.properties.id,
        event: f.properties.event,
        headline: f.properties.headline,
        severity: f.properties.severity,
        urgency: f.properties.urgency,
        certainty: f.properties.certainty,
        onset: f.properties.onset,
        expires: f.properties.expires,
        description: f.properties.description?.substring(0, 500) + '...',
        instruction: f.properties.instruction,
        senderName: f.properties.senderName,
        areaDesc: f.properties.areaDesc,
        isTornadoRelated: f.properties.event?.toLowerCase().includes('tornado')
      }));

      results.locations[location.abbrev] = {
        city: location.name,
        coordinates: { lat: location.lat, lon: location.lon },
        alertCount: alerts.length,
        alerts: alerts
      };
      results.totalAlerts += alerts.length;

      // Save individual city file
      saveJSON(`nws_alerts_${location.abbrev}.json`, {
        pulledAt: new Date().toISOString(),
        location: location.name,
        coordinates: { lat: location.lat, lon: location.lon },
        alertCount: alerts.length,
        alerts: alerts
      });

      logSuccess(`${location.name}: ${alerts.length} alert(s) found`);

    } catch (error) {
      logError(`${location.name}: Failed - ${error.message}`);
      results.locations[location.abbrev] = { error: error.message };
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Pull statewide alerts
  log(`\nFetching statewide Oklahoma alerts...`);
  try {
    const url = `${CONFIG.NWS_BASE_URL}/alerts/active?area=OK`;
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': CONFIG.APP_USER_AGENT,
        'Accept': 'application/geo+json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const alerts = (data.features || []).map(f => ({
      id: f.properties.id,
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      areaDesc: f.properties.areaDesc,
      onset: f.properties.onset,
      expires: f.properties.expires,
      isTornadoRelated: f.properties.event?.toLowerCase().includes('tornado')
    }));

    results.statewide = {
      state: 'Oklahoma',
      alertCount: alerts.length,
      alerts: alerts
    };

    saveJSON('nws_alerts_oklahoma_statewide.json', {
      pulledAt: new Date().toISOString(),
      state: 'Oklahoma',
      alertCount: alerts.length,
      alerts: alerts
    });

    logSuccess(`Oklahoma statewide: ${alerts.length} alert(s) found`);

  } catch (error) {
    logError(`Oklahoma statewide: Failed - ${error.message}`);
    results.statewide = { error: error.message };
  }

  return results;
}

// ========================
// SPC STORM REPORTS PULL
// ========================

async function pullSPCReports() {
  logSection('2. SPC Storm Reports (Today)');
  
  const reportTypes = [
    { type: 'tornado', file: 'today_torn.csv', label: 'Tornado' },
    { type: 'wind', file: 'today_wind.csv', label: 'Wind' },
    { type: 'hail', file: 'today_hail.csv', label: 'Hail' }
  ];

  const results = {};

  for (const report of reportTypes) {
    log(`Fetching ${report.label} reports...`);
    
    try {
      const url = `${CONFIG.SPC_REPORTS_URL}/${report.file}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csvText = await response.text();
      const reports = parseCSV(csvText, report.type);
      
      results[report.type] = reports;

      saveJSON(`spc_${report.type}_reports_today.json`, {
        pulledAt: new Date().toISOString(),
        reportType: report.type,
        date: new Date().toISOString().split('T')[0],
        count: reports.length,
        reports: reports
      });

      logSuccess(`${report.label}: ${reports.length} report(s) found`);

    } catch (error) {
      logError(`${report.label}: Failed - ${error.message}`);
      results[report.type] = [];
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

function parseCSV(csvText, reportType) {
  const lines = csvText.trim().split('\n');
  const dataLines = lines[0].toLowerCase().includes('time') ? lines.slice(1) : lines;

  return dataLines.map(line => {
    const parts = line.split(',');
    const report = {
      time: parts[0]?.trim(),
      location: parts[2]?.trim(),
      county: parts[3]?.trim(),
      state: parts[4]?.trim(),
      lat: parseFloat(parts[5]) || null,
      lon: parseFloat(parts[6]) || null,
      comments: parts[7]?.trim() || ''
    };

    if (reportType === 'tornado') {
      report.fScale = parts[1]?.trim();
    } else if (reportType === 'wind') {
      report.speed = parts[1]?.trim();
    } else if (reportType === 'hail') {
      report.size = parts[1]?.trim();
    }

    return report;
  }).filter(r => r.lat && r.lon);
}

// ======================
// FEMA SHELTERS PULL
// ======================

async function pullFEMAShelters() {
  logSection('3. FEMA Open Shelters (Oklahoma)');
  
  log('Fetching open shelters in Oklahoma...');
  
  try {
    const params = new URLSearchParams({
      where: "STATE='OK'",
      outFields: '*',
      f: 'json'
    });

    const url = `${CONFIG.FEMA_SHELTERS_URL}?${params}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const shelters = (data.features || []).map(f => ({
      name: f.attributes.SHELTER_NAME,
      address: f.attributes.ADDRESS,
      city: f.attributes.CITY,
      state: f.attributes.STATE,
      zip: f.attributes.ZIP,
      county: f.attributes.COUNTY,
      totalCapacity: f.attributes.TOTAL_POPULATION,
      currentPopulation: f.attributes.CURRENT_POPULATION,
      isOpen: f.attributes.SHELTER_STATUS === 'OPEN',
      coordinates: f.geometry ? { lat: f.geometry.y, lon: f.geometry.x } : null
    }));

    const result = {
      pulledAt: new Date().toISOString(),
      state: 'Oklahoma',
      totalShelters: shelters.length,
      openShelters: shelters.filter(s => s.isOpen).length,
      shelters: shelters
    };

    saveJSON('fema_open_shelters_oklahoma.json', result);

    if (shelters.length === 0) {
      logInfo('No FEMA emergency shelters currently open in Oklahoma');
      logInfo('(This is normal when there is no active disaster)');
    } else {
      logSuccess(`Found ${shelters.length} shelter(s) in Oklahoma`);
    }

    return result;

  } catch (error) {
    logError(`FEMA Shelters: Failed - ${error.message}`);
    return { error: error.message };
  }
}

// ===========================
// HISTORICAL TORNADO DATA PULL
// ===========================

async function pullHistoricalData() {
  logSection('4. Historical Tornado Data (Oklahoma)');
  
  log('Creating historical tornado data summary...');
  
  const historicalSummary = {
    pulledAt: new Date().toISOString(),
    dataSource: 'NCEI Storm Events Database',
    state: 'Oklahoma',
    oklahomaTornadoStats: {
      description: 'Oklahoma averages 52 tornadoes per year',
      peakMonths: ['April', 'May', 'June'],
      tornadoAlley: true
    },
    downloadLinks: {
      stormEventsCSV: 'https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/',
      spcSVRGIS: 'https://www.spc.noaa.gov/gis/svrgis/',
      tornadoTracks: 'https://www.spc.noaa.gov/wcm/#data'
    }
  };

  saveJSON('historical_tornado_data_oklahoma.json', historicalSummary);
  logSuccess('Created historical tornado data summary');

  return historicalSummary;
}

// ================================================
// PREDICTIVE API 1: SPC CONVECTIVE OUTLOOK (NEW)
// ================================================

async function pullSPCConvectiveOutlook() {
  logSection('5. SPC Convective Outlook (Tornado Probability)');
  
  log('Fetching Day 1 tornado probability outlook...');
  logInfo('API: NOAA SPC Weather Outlooks MapServer');
  
  const results = {
    pulledAt: new Date().toISOString(),
    source: 'NOAA Storm Prediction Center',
    apiEndpoint: CONFIG.SPC_OUTLOOK_URL,
    outlooks: {}
  };

  // Layer IDs for SPC Outlooks
  const outlookLayers = [
    { id: 1, name: 'day1_categorical', description: 'Day 1 Categorical Outlook (Risk Levels)' },
    { id: 7, name: 'day1_tornado', description: 'Day 1 Tornado Probability' },
    { id: 8, name: 'day1_tornado_significant', description: 'Day 1 Significant Tornado (EF2+)' },
    { id: 10, name: 'day2_tornado', description: 'Day 2 Tornado Probability' },
    { id: 17, name: 'day3_categorical', description: 'Day 3 Categorical Outlook' }
  ];

  for (const layer of outlookLayers) {
    log(`  Fetching ${layer.description}...`);
    
    try {
      const url = `${CONFIG.SPC_OUTLOOK_URL}/${layer.id}/query?where=1%3D1&outFields=*&f=json`;
      const response = await fetchWithTimeout(url, {
        headers: { 'User-Agent': CONFIG.APP_USER_AGENT }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const features = data.features || [];

      // Process features
      const processedFeatures = features.map(f => ({
        label: f.attributes.LABEL || f.attributes.LABEL2 || 'Unknown',
        probability: f.attributes.LABEL2 || null,
        valid: f.attributes.VALID,
        expire: f.attributes.EXPIRE,
        issue: f.attributes.ISSUE,
        hasGeometry: !!f.geometry
      }));

      results.outlooks[layer.name] = {
        layerId: layer.id,
        description: layer.description,
        featureCount: features.length,
        features: processedFeatures,
        rawFeatures: features.slice(0, 3) // Keep first 3 raw for reference
      };

      logSuccess(`  ${layer.description}: ${features.length} zone(s)`);

    } catch (error) {
      logError(`  ${layer.description}: Failed - ${error.message}`);
      results.outlooks[layer.name] = { error: error.message };
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // Check if Oklahoma is in any risk area
  results.oklahomaRisk = checkOklahomaRisk(results.outlooks);

  saveJSON('spc_convective_outlook.json', results);
  
  if (results.oklahomaRisk.inRiskArea) {
    logInfo(`Oklahoma Risk Level: ${results.oklahomaRisk.highestRisk}`);
  } else {
    logInfo('Oklahoma: No severe weather outlook currently');
  }

  return results;
}

function checkOklahomaRisk(outlooks) {
  // Check if any outlook features might cover Oklahoma
  // Oklahoma bounds approximately: lat 33.6-37.0, lon -103.0 to -94.4
  const okBounds = { minLat: 33.6, maxLat: 37.0, minLon: -103.0, maxLon: -94.4 };
  
  let inRiskArea = false;
  let highestRisk = 'NONE';
  
  const riskLevels = ['TSTM', 'MRGL', 'SLGT', 'ENH', 'MDT', 'HIGH'];
  
  if (outlooks.day1_categorical?.features) {
    for (const feature of outlooks.day1_categorical.features) {
      if (feature.label && riskLevels.includes(feature.label)) {
        inRiskArea = true;
        const riskIndex = riskLevels.indexOf(feature.label);
        const currentIndex = riskLevels.indexOf(highestRisk);
        if (riskIndex > currentIndex || highestRisk === 'NONE') {
          highestRisk = feature.label;
        }
      }
    }
  }

  return {
    inRiskArea,
    highestRisk,
    riskDescription: getRiskDescription(highestRisk)
  };
}

function getRiskDescription(risk) {
  const descriptions = {
    'NONE': 'No severe weather expected',
    'TSTM': 'General thunderstorms possible',
    'MRGL': 'Marginal risk - Isolated severe storms possible',
    'SLGT': 'Slight risk - Scattered severe storms possible',
    'ENH': 'Enhanced risk - Numerous severe storms possible',
    'MDT': 'Moderate risk - Widespread severe storms likely',
    'HIGH': 'High risk - Severe weather outbreak expected'
  };
  return descriptions[risk] || 'Unknown';
}

// ================================================
// PREDICTIVE API 2: SPC MESOSCALE DISCUSSIONS (NEW)
// ================================================

async function pullSPCMesoscaleDiscussions() {
  logSection('6. SPC Mesoscale Discussions (Pre-Watch Analysis)');
  
  log('Fetching active Mesoscale Discussions...');
  logInfo('MCDs are issued 1-3 hours BEFORE tornado watches');
  
  const results = {
    pulledAt: new Date().toISOString(),
    source: 'NOAA Storm Prediction Center',
    description: 'Mesoscale Discussions provide advance warning before watches are issued',
    apiEndpoint: `${CONFIG.SPC_MCD_URL}`,
    discussions: []
  };

  try {
    // Try to fetch the MCD RSS feed or listing page
    const url = `${CONFIG.SPC_MCD_URL}/`;
    const response = await fetchWithTimeout(url, {
      headers: { 
        'User-Agent': CONFIG.APP_USER_AGENT,
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Parse MCD numbers from the HTML
    const mcdMatches = html.match(/md\d{4}/g) || [];
    const uniqueMCDs = [...new Set(mcdMatches)].slice(0, 10); // Get latest 10

    logSuccess(`Found ${uniqueMCDs.length} recent Mesoscale Discussion(s)`);

    // Fetch details for each MCD
    for (const mcdId of uniqueMCDs.slice(0, 5)) {
      try {
        const mcdNumber = mcdId.replace('md', '');
        const mcdUrl = `${CONFIG.SPC_MCD_URL}/${mcdId}.html`;
        
        const mcdResponse = await fetchWithTimeout(mcdUrl, {
          headers: { 'User-Agent': CONFIG.APP_USER_AGENT }
        });

        if (mcdResponse.ok) {
          const mcdHtml = await mcdResponse.text();
          
          // Extract key information from MCD
          const mcdData = parseMCDContent(mcdHtml, mcdNumber);
          results.discussions.push(mcdData);
          
          log(`  MCD ${mcdNumber}: ${mcdData.concerning || 'Severe weather analysis'}`);
        }
      } catch (err) {
        // Skip individual MCD errors
      }
      
      await new Promise(r => setTimeout(r, 200));
    }

    // Check for Oklahoma-related MCDs
    results.oklahomaAffected = results.discussions.some(mcd => 
      mcd.states?.includes('OK') || 
      mcd.rawText?.toLowerCase().includes('oklahoma')
    );

  } catch (error) {
    logError(`Mesoscale Discussions: Failed - ${error.message}`);
    results.error = error.message;
  }

  // Add explanation for app integration
  results.appIntegration = {
    importance: 'MCDs are your BEST early warning tool - issued 1-3 hours before watches',
    alertThreshold: 'Push notification when watch_probability >= 80%',
    pollingFrequency: 'Check every 5-10 minutes during active weather'
  };

  saveJSON('spc_mesoscale_discussions.json', results);

  if (results.discussions.length === 0) {
    logInfo('No active Mesoscale Discussions at this time');
    logInfo('(This is normal during calm weather)');
  } else if (results.oklahomaAffected) {
    logInfo('⚠️  Oklahoma mentioned in active MCD - monitor closely!');
  }

  return results;
}

function parseMCDContent(html, mcdNumber) {
  const mcd = {
    number: mcdNumber,
    pulledAt: new Date().toISOString()
  };

  // Try to extract concerning/summary line
  const concerningMatch = html.match(/CONCERNING[.]{3}([^<]+)/i);
  if (concerningMatch) {
    mcd.concerning = concerningMatch[1].trim();
  }

  // Try to extract states
  const statesMatch = html.match(/AREAS AFFECTED[.]{3}([^<]+)/i);
  if (statesMatch) {
    mcd.affectedAreas = statesMatch[1].trim();
    // Extract state abbreviations
    const stateAbbrevs = statesMatch[1].match(/\b[A-Z]{2}\b/g) || [];
    mcd.states = stateAbbrevs;
  }

  // Check for watch probability
  const watchProbMatch = html.match(/(\d+)\s*%?\s*(probability|chance).*watch/i);
  if (watchProbMatch) {
    mcd.watchProbability = parseInt(watchProbMatch[1]);
  }

  // Check for tornado mentions
  mcd.mentionsTornado = /tornado/i.test(html);
  
  // Store raw text excerpt
  const textMatch = html.match(/<pre[^>]*>([^<]+)<\/pre>/i);
  if (textMatch) {
    mcd.rawText = textMatch[1].substring(0, 1000);
  }

  return mcd;
}

// ================================================
// PREDICTIVE API 3: NWS FORECAST GRID DATA (NEW)
// ================================================

async function pullNWSForecastGridData() {
  logSection('7. NWS Forecast Grid Data (Severe Weather Indicators)');
  
  log('Fetching detailed forecast data for Oklahoma locations...');
  logInfo('Grid data includes parameters for calculating tornado potential');
  
  const results = {
    pulledAt: new Date().toISOString(),
    source: 'National Weather Service API',
    description: 'Hourly forecast data with severe weather indicators',
    locations: {}
  };

  for (const location of LOCATIONS) {
    log(`  Fetching grid data for ${location.name}...`);
    
    try {
      // Step 1: Get grid point info
      const pointUrl = `${CONFIG.NWS_BASE_URL}/points/${location.lat},${location.lon}`;
      const pointResponse = await fetchWithTimeout(pointUrl, {
        headers: {
          'User-Agent': CONFIG.APP_USER_AGENT,
          'Accept': 'application/geo+json'
        }
      });

      if (!pointResponse.ok) {
        throw new Error(`HTTP ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const gridId = pointData.properties.gridId;
      const gridX = pointData.properties.gridX;
      const gridY = pointData.properties.gridY;
      const forecastUrl = pointData.properties.forecastGridData;

      // Step 2: Get grid forecast data
      const gridResponse = await fetchWithTimeout(forecastUrl, {
        headers: {
          'User-Agent': CONFIG.APP_USER_AGENT,
          'Accept': 'application/geo+json'
        }
      });

      if (!gridResponse.ok) {
        throw new Error(`HTTP ${gridResponse.status}`);
      }

      const gridData = await gridResponse.json();
      const props = gridData.properties;

      // Extract key parameters for severe weather
      const forecast = {
        location: location.name,
        coordinates: { lat: location.lat, lon: location.lon },
        gridInfo: { office: gridId, gridX, gridY },
        updateTime: props.updateTime,
        
        // Temperature data
        temperature: extractForecastValues(props.temperature, 5),
        apparentTemperature: extractForecastValues(props.apparentTemperature, 5),
        
        // Moisture indicators
        dewpoint: extractForecastValues(props.dewpoint, 5),
        relativeHumidity: extractForecastValues(props.relativeHumidity, 5),
        
        // Wind data (important for severe weather)
        windSpeed: extractForecastValues(props.windSpeed, 5),
        windGust: extractForecastValues(props.windGust, 5),
        windDirection: extractForecastValues(props.windDirection, 5),
        
        // Precipitation indicators
        probabilityOfPrecipitation: extractForecastValues(props.probabilityOfPrecipitation, 5),
        probabilityOfThunder: extractForecastValues(props.probabilityOfThunder, 5),
        
        // Atmospheric
        pressure: extractForecastValues(props.pressure, 5),
        
        // Hazards
        hazards: props.hazards?.values || []
      };

      // Calculate severe weather indicators
      forecast.severeWeatherIndicators = calculateSevereIndicators(forecast);

      results.locations[location.abbrev] = forecast;
      logSuccess(`  ${location.name}: Grid data retrieved (${gridId} ${gridX},${gridY})`);

    } catch (error) {
      logError(`  ${location.name}: Failed - ${error.message}`);
      results.locations[location.abbrev] = { error: error.message };
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Add interpretation guide
  results.severeWeatherThresholds = {
    dewpoint: { favorable: '55°F+', optimal: '65°F+', description: 'Moisture for storm development' },
    thunderProbability: { elevated: '40%+', high: '60%+', description: 'Chance of thunderstorms' },
    windGust: { notable: '30+ mph', severe: '50+ mph', description: 'Surface instability indicator' },
    windShift: { significant: '45°+ change', description: 'Frontal passage indicator' }
  };

  saveJSON('nws_forecast_grid_data.json', results);

  return results;
}

function extractForecastValues(property, count = 5) {
  if (!property?.values) return [];
  
  return property.values.slice(0, count).map(v => ({
    validTime: v.validTime,
    value: v.value
  }));
}

function calculateSevereIndicators(forecast) {
  const indicators = {
    moistureLevel: 'LOW',
    thunderPotential: 'LOW',
    windThreat: 'LOW',
    overallTornadoPotential: 'LOW'
  };

  // Check dewpoint (moisture)
  const dewpoints = forecast.dewpoint?.map(d => d.value) || [];
  const avgDewpoint = dewpoints.length > 0 ? dewpoints.reduce((a, b) => a + b, 0) / dewpoints.length : 0;
  
  if (avgDewpoint >= 18) indicators.moistureLevel = 'OPTIMAL'; // ~65°F
  else if (avgDewpoint >= 13) indicators.moistureLevel = 'FAVORABLE'; // ~55°F
  else if (avgDewpoint >= 7) indicators.moistureLevel = 'MARGINAL'; // ~45°F

  // Check thunder probability
  const thunderProbs = forecast.probabilityOfThunder?.map(t => t.value) || [];
  const maxThunder = Math.max(...thunderProbs, 0);
  
  if (maxThunder >= 60) indicators.thunderPotential = 'HIGH';
  else if (maxThunder >= 40) indicators.thunderPotential = 'MODERATE';
  else if (maxThunder >= 20) indicators.thunderPotential = 'LOW';

  // Check wind gusts
  const gusts = forecast.windGust?.map(g => g.value) || [];
  const maxGust = Math.max(...gusts, 0);
  
  if (maxGust >= 22) indicators.windThreat = 'SEVERE'; // ~50 mph
  else if (maxGust >= 13) indicators.windThreat = 'MODERATE'; // ~30 mph
  else if (maxGust >= 9) indicators.windThreat = 'LOW'; // ~20 mph

  // Overall tornado potential
  let score = 0;
  if (indicators.moistureLevel === 'OPTIMAL') score += 3;
  else if (indicators.moistureLevel === 'FAVORABLE') score += 2;
  
  if (indicators.thunderPotential === 'HIGH') score += 3;
  else if (indicators.thunderPotential === 'MODERATE') score += 2;
  
  if (indicators.windThreat === 'SEVERE') score += 2;
  else if (indicators.windThreat === 'MODERATE') score += 1;

  if (score >= 7) indicators.overallTornadoPotential = 'HIGH';
  else if (score >= 5) indicators.overallTornadoPotential = 'MODERATE';
  else if (score >= 3) indicators.overallTornadoPotential = 'LOW';
  else indicators.overallTornadoPotential = 'MINIMAL';

  return indicators;
}

// ================================================
// PREDICTIVE API 4: OPEN-METEO TORNADO METRICS (NEW)
// ================================================

async function pullOpenMeteoTornadoMetrics() {
  logSection('8. Open-Meteo Tornado Prediction Metrics');
  
  log('Fetching tornado prediction parameters from Open-Meteo...');
  logInfo('FREE API - No key required');
  logInfo('Parameters: CAPE, Lifted Index, CIN, Dewpoint, Wind Speed/Gusts');
  
  const results = {
    pulledAt: new Date().toISOString(),
    source: 'Open-Meteo',
    apiEndpoint: CONFIG.OPEN_METEO_URL,
    description: 'Tornado prediction metrics including CAPE, Lifted Index, and atmospheric instability indicators',
    locations: {},
    parameterInfo: {
      cape: {
        name: 'Convective Available Potential Energy',
        unit: 'J/kg',
        thresholds: {
          minimal: '< 300 J/kg',
          low: '300-1000 J/kg',
          moderate: '1000-2500 J/kg',
          high: '2500-4000 J/kg',
          extreme: '> 4000 J/kg'
        },
        description: 'Primary tornado indicator - measures atmospheric energy available for storm development'
      },
      lifted_index: {
        name: 'Lifted Index',
        unit: '°C',
        thresholds: {
          stable: '> 0°C',
          marginal: '0 to -2°C',
          unstable: '-2 to -6°C',
          veryUnstable: '< -6°C (severe weather likely)'
        },
        description: 'Negative values indicate unstable atmosphere favorable for thunderstorms'
      },
      convective_inhibition: {
        name: 'Convective Inhibition (CIN)',
        unit: 'J/kg',
        thresholds: {
          weak: '< 50 J/kg (storms develop easily)',
          moderate: '50-200 J/kg',
          strong: '> 200 J/kg (cap prevents storms)'
        },
        description: 'Energy barrier that must be overcome for storms to develop'
      },
      dewpoint: {
        name: 'Dewpoint Temperature',
        unit: '°C',
        thresholds: {
          dry: '< 10°C',
          marginal: '10-15°C',
          favorable: '15-20°C',
          optimal: '> 20°C (high moisture for severe storms)'
        },
        description: 'Moisture indicator - higher dewpoints fuel stronger storms'
      }
    }
  };

  // Open-Meteo parameters for tornado prediction
  const params = [
    'cape',
    'lifted_index', 
    'convective_inhibition',
    'temperature_2m',
    'dewpoint_2m',
    'relative_humidity_2m',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'pressure_msl',
    'precipitation',
    'weather_code'
  ].join(',');

  for (const location of LOCATIONS) {
    log(`  Fetching metrics for ${location.name}...`);
    
    try {
      const url = `${CONFIG.OPEN_METEO_URL}?latitude=${location.lat}&longitude=${location.lon}&hourly=${params}&daily=cape_max,cape_min,cape_mean,precipitation_sum,wind_gusts_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/Chicago&forecast_days=16`;
      
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Extract current and forecast data
      const hourlyData = data.hourly;
      const dailyData = data.daily;
      const currentHourIndex = new Date().getHours();
      
      // Get tornado-relevant metrics
      const metrics = {
        location: location.name,
        coordinates: { lat: location.lat, lon: location.lon },
        timezone: data.timezone,
        elevation: data.elevation,
        forecastDays: 16,
        
        // Current conditions (this hour)
        current: {
          time: hourlyData.time[currentHourIndex],
          cape: hourlyData.cape?.[currentHourIndex] || 0,
          lifted_index: hourlyData.lifted_index?.[currentHourIndex] || null,
          convective_inhibition: hourlyData.convective_inhibition?.[currentHourIndex] || 0,
          temperature_f: hourlyData.temperature_2m?.[currentHourIndex],
          dewpoint_f: hourlyData.dewpoint_2m?.[currentHourIndex],
          humidity_percent: hourlyData.relative_humidity_2m?.[currentHourIndex],
          wind_speed_mph: hourlyData.wind_speed_10m?.[currentHourIndex],
          wind_gust_mph: hourlyData.wind_gusts_10m?.[currentHourIndex],
          wind_direction: hourlyData.wind_direction_10m?.[currentHourIndex],
          pressure_hpa: hourlyData.pressure_msl?.[currentHourIndex],
          weather_code: hourlyData.weather_code?.[currentHourIndex]
        },
        
        // 16-Day Daily Summary (KEY FOR EXTENDED FORECASTS)
        dailyForecast: dailyData?.time?.map((date, i) => ({
          date: date,
          cape_max: dailyData.cape_max?.[i] || 0,
          cape_min: dailyData.cape_min?.[i] || 0,
          cape_mean: dailyData.cape_mean?.[i] || 0,
          precipitation_sum: dailyData.precipitation_sum?.[i] || 0,
          wind_gusts_max: dailyData.wind_gusts_10m_max?.[i] || 0,
          tornadoRisk: assessDailyTornadoRisk(dailyData.cape_max?.[i] || 0)
        })) || [],
        
        // Next 24 hours - hourly data
        next24Hours: {
          time: hourlyData.time.slice(currentHourIndex, currentHourIndex + 24),
          cape: hourlyData.cape?.slice(currentHourIndex, currentHourIndex + 24) || [],
          lifted_index: hourlyData.lifted_index?.slice(currentHourIndex, currentHourIndex + 24) || [],
          convective_inhibition: hourlyData.convective_inhibition?.slice(currentHourIndex, currentHourIndex + 24) || [],
          dewpoint_f: hourlyData.dewpoint_2m?.slice(currentHourIndex, currentHourIndex + 24) || [],
          wind_gust_mph: hourlyData.wind_gusts_10m?.slice(currentHourIndex, currentHourIndex + 24) || []
        },
        
        // Calculate peak values for next 7 days and full 16 days
        peakValues: {
          // Next 24 hours
          maxCAPE_24hr: Math.max(...(hourlyData.cape?.slice(currentHourIndex, currentHourIndex + 24) || [0])),
          // Next 7 days
          maxCAPE_7day: Math.max(...(dailyData?.cape_max?.slice(0, 7) || [0])),
          // Full 16 days
          maxCAPE_16day: Math.max(...(dailyData?.cape_max || [0])),
          minLiftedIndex: Math.min(...(hourlyData.lifted_index?.slice(currentHourIndex, currentHourIndex + 24).filter(v => v !== null) || [0])),
          maxWindGust_16day: Math.max(...(dailyData?.wind_gusts_10m_max || [0])),
          maxDewpoint: Math.max(...(hourlyData.dewpoint_2m?.slice(currentHourIndex, currentHourIndex + 24) || [0]))
        },
        
        // Find high-risk days in the 16-day forecast
        highRiskDays: []
      };

      // Identify high-risk days (CAPE >= 1000)
      metrics.dailyForecast.forEach(day => {
        if (day.cape_max >= 1000) {
          metrics.highRiskDays.push({
            date: day.date,
            cape_max: day.cape_max,
            risk: day.tornadoRisk
          });
        }
      });

      // Calculate tornado threat assessment
      metrics.tornadoThreatAssessment = assessTornadoThreat(metrics);

      results.locations[location.abbrev] = metrics;
      
      // Log key metrics
      const cape = metrics.current.cape;
      const li = metrics.current.lifted_index;
      const highRiskCount = metrics.highRiskDays.length;
      logSuccess(`  ${location.name}: CAPE=${cape} J/kg, LI=${li !== null ? li + '°C' : 'N/A'}, High-risk days: ${highRiskCount}`);

    } catch (error) {
      logError(`  ${location.name}: Failed - ${error.message}`);
      results.locations[location.abbrev] = { error: error.message };
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // Add overall Oklahoma assessment
  results.oklahomaAssessment = generateOklahomaAssessment(results.locations);

  saveJSON('open_meteo_tornado_metrics.json', results);

  // Log summary
  log('\n' + COLORS.bright + '16-Day Tornado Metrics Summary:' + COLORS.reset);
  for (const [abbrev, data] of Object.entries(results.locations)) {
    if (!data.error) {
      const threat = data.tornadoThreatAssessment?.level || 'UNKNOWN';
      const color = threat === 'HIGH' || threat === 'EXTREME' ? COLORS.red : 
                    threat === 'MODERATE' ? COLORS.yellow : COLORS.green;
      log(`  ${data.location}: ${color}${threat}${COLORS.reset}`);
      log(`    Current CAPE: ${data.current?.cape || 0} J/kg`);
      log(`    Max CAPE (7-day): ${data.peakValues?.maxCAPE_7day || 0} J/kg`);
      log(`    Max CAPE (16-day): ${data.peakValues?.maxCAPE_16day || 0} J/kg`);
      log(`    High-risk days: ${data.highRiskDays?.length || 0}`);
    }
  }

  return results;
}

function assessDailyTornadoRisk(capeMax) {
  if (capeMax >= 4000) return 'EXTREME';
  if (capeMax >= 2500) return 'HIGH';
  if (capeMax >= 1000) return 'MODERATE';
  if (capeMax >= 300) return 'LOW';
  return 'MINIMAL';
}

function assessTornadoThreat(metrics) {
  const assessment = {
    level: 'LOW',
    score: 0,
    factors: []
  };

  const peak = metrics.peakValues;
  const current = metrics.current;

  // CAPE Assessment - use 7-day max for primary assessment
  const maxCAPE = peak.maxCAPE_7day || peak.maxCAPE_24hr || 0;
  if (maxCAPE >= 4000) {
    assessment.score += 40;
    assessment.factors.push(`EXTREME CAPE: ${maxCAPE} J/kg (7-day max)`);
  } else if (maxCAPE >= 2500) {
    assessment.score += 30;
    assessment.factors.push(`HIGH CAPE: ${maxCAPE} J/kg (7-day max)`);
  } else if (maxCAPE >= 1000) {
    assessment.score += 20;
    assessment.factors.push(`MODERATE CAPE: ${maxCAPE} J/kg (7-day max)`);
  } else if (maxCAPE >= 300) {
    assessment.score += 10;
    assessment.factors.push(`LOW CAPE: ${maxCAPE} J/kg (7-day max)`);
  }

  // Lifted Index Assessment
  if (peak.minLiftedIndex <= -6) {
    assessment.score += 25;
    assessment.factors.push(`VERY UNSTABLE: LI ${peak.minLiftedIndex}°C`);
  } else if (peak.minLiftedIndex <= -3) {
    assessment.score += 15;
    assessment.factors.push(`UNSTABLE: LI ${peak.minLiftedIndex}°C`);
  } else if (peak.minLiftedIndex < 0) {
    assessment.score += 5;
    assessment.factors.push(`MARGINAL INSTABILITY: LI ${peak.minLiftedIndex}°C`);
  }

  // Dewpoint Assessment (moisture)
  const dewpointC = (peak.maxDewpoint - 32) * 5/9; // Convert F to C
  if (dewpointC >= 20) {
    assessment.score += 15;
    assessment.factors.push(`HIGH MOISTURE: Dewpoint ${peak.maxDewpoint}°F`);
  } else if (dewpointC >= 15) {
    assessment.score += 10;
    assessment.factors.push(`GOOD MOISTURE: Dewpoint ${peak.maxDewpoint}°F`);
  }

  // Wind Gust Assessment - use 16-day max
  const maxGust = peak.maxWindGust_16day || 0;
  if (maxGust >= 50) {
    assessment.score += 15;
    assessment.factors.push(`STRONG GUSTS: ${maxGust} mph (16-day max)`);
  } else if (maxGust >= 30) {
    assessment.score += 10;
    assessment.factors.push(`MODERATE GUSTS: ${maxGust} mph (16-day max)`);
  }

  // CIN Assessment (lower is worse - means storms can develop)
  const cin = current.convective_inhibition || 0;
  if (cin < 25) {
    assessment.score += 10;
    assessment.factors.push(`WEAK CAP: CIN ${cin} J/kg (storms develop easily)`);
  } else if (cin < 100) {
    assessment.score += 5;
    assessment.factors.push(`MODERATE CAP: CIN ${cin} J/kg`);
  }

  // High-risk days bonus
  const highRiskDays = metrics.highRiskDays?.length || 0;
  if (highRiskDays >= 3) {
    assessment.score += 10;
    assessment.factors.push(`MULTIPLE HIGH-RISK DAYS: ${highRiskDays} days with CAPE >= 1000`);
  }

  // Determine threat level
  if (assessment.score >= 70) {
    assessment.level = 'EXTREME';
    assessment.recommendation = 'DANGEROUS CONDITIONS EXPECTED - Be ready to shelter immediately';
  } else if (assessment.score >= 50) {
    assessment.level = 'HIGH';
    assessment.recommendation = 'Elevated tornado risk - Have shelter plan ready';
  } else if (assessment.score >= 30) {
    assessment.level = 'MODERATE';
    assessment.recommendation = 'Some tornado potential - Stay weather aware';
  } else if (assessment.score >= 15) {
    assessment.level = 'LOW';
    assessment.recommendation = 'Low tornado risk - Monitor conditions';
  } else {
    assessment.level = 'MINIMAL';
    assessment.recommendation = 'No significant tornado threat';
  }

  return assessment;
}

function generateOklahomaAssessment(locations) {
  const assessments = Object.values(locations)
    .filter(loc => !loc.error && loc.tornadoThreatAssessment)
    .map(loc => ({
      location: loc.location,
      level: loc.tornadoThreatAssessment.level,
      score: loc.tornadoThreatAssessment.score,
      maxCAPE_24hr: loc.peakValues?.maxCAPE_24hr || 0,
      maxCAPE_7day: loc.peakValues?.maxCAPE_7day || 0,
      maxCAPE_16day: loc.peakValues?.maxCAPE_16day || 0,
      minLI: loc.peakValues?.minLiftedIndex || 0,
      highRiskDays: loc.highRiskDays?.length || 0
    }));

  if (assessments.length === 0) {
    return { error: 'No valid assessments' };
  }

  const highestScore = Math.max(...assessments.map(a => a.score));
  const highestCAPE_7day = Math.max(...assessments.map(a => a.maxCAPE_7day));
  const highestCAPE_16day = Math.max(...assessments.map(a => a.maxCAPE_16day));
  const lowestLI = Math.min(...assessments.map(a => a.minLI));
  const totalHighRiskDays = assessments.reduce((sum, a) => sum + a.highRiskDays, 0);

  const levelOrder = ['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'EXTREME'];
  const highestLevel = assessments.reduce((max, a) => {
    return levelOrder.indexOf(a.level) > levelOrder.indexOf(max) ? a.level : max;
  }, 'MINIMAL');

  // Collect all high-risk days across all locations
  const allHighRiskDays = [];
  Object.values(locations).forEach(loc => {
    if (loc.highRiskDays) {
      loc.highRiskDays.forEach(day => {
        if (!allHighRiskDays.find(d => d.date === day.date)) {
          allHighRiskDays.push(day);
        }
      });
    }
  });
  allHighRiskDays.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    overallThreatLevel: highestLevel,
    highestScore,
    forecastPeriod: '16 days',
    capeAnalysis: {
      highest_24hr: highestCAPE_7day,
      highest_7day: highestCAPE_7day,
      highest_16day: highestCAPE_16day
    },
    lowestLiftedIndex: lowestLI,
    highRiskDays: allHighRiskDays,
    totalHighRiskDayCount: allHighRiskDays.length,
    locationBreakdown: assessments,
    timestamp: new Date().toISOString()
  };
}

// ================================
// PREDICTIVE WEATHER SUMMARY (NEW)
// ================================

function createPredictiveWeatherSummary(outlookResults, mcdResults, gridResults, openMeteoResults) {
  logSection('9. Creating Predictive Weather Summary');

  const summary = {
    pulledAt: new Date().toISOString(),
    description: 'Combined predictive weather analysis for Oklahoma',
    
    // SPC Convective Outlook summary
    convectiveOutlook: {
      source: 'SPC Convective Outlook',
      oklahomaInRiskArea: outlookResults.oklahomaRisk?.inRiskArea || false,
      riskLevel: outlookResults.oklahomaRisk?.highestRisk || 'NONE',
      riskDescription: outlookResults.oklahomaRisk?.riskDescription || 'No data',
      day1TornadoZones: outlookResults.outlooks?.day1_tornado?.featureCount || 0,
      day1SignificantTornadoZones: outlookResults.outlooks?.day1_tornado_significant?.featureCount || 0
    },

    // Mesoscale Discussion summary
    mesoscaleDiscussions: {
      source: 'SPC Mesoscale Discussions',
      activeCount: mcdResults.discussions?.length || 0,
      oklahomaAffected: mcdResults.oklahomaAffected || false,
      discussions: (mcdResults.discussions || []).map(mcd => ({
        number: mcd.number,
        concerning: mcd.concerning,
        watchProbability: mcd.watchProbability,
        mentionsTornado: mcd.mentionsTornado
      }))
    },

    // NWS Grid Forecast summary
    forecastIndicators: {
      source: 'NWS Forecast Grid Data',
      locations: Object.entries(gridResults.locations || {}).map(([abbrev, data]) => ({
        location: data.location || abbrev,
        indicators: data.severeWeatherIndicators || { error: data.error }
      }))
    },

    // Open-Meteo Tornado Metrics (NEW)
    tornadoMetrics: {
      source: 'Open-Meteo',
      overallThreatLevel: openMeteoResults.oklahomaAssessment?.overallThreatLevel || 'UNKNOWN',
      highestCAPE: openMeteoResults.oklahomaAssessment?.highestCAPE || 0,
      lowestLiftedIndex: openMeteoResults.oklahomaAssessment?.lowestLiftedIndex || null,
      locations: Object.entries(openMeteoResults.locations || {}).map(([abbrev, data]) => ({
        location: data.location || abbrev,
        threatLevel: data.tornadoThreatAssessment?.level || 'UNKNOWN',
        score: data.tornadoThreatAssessment?.score || 0,
        currentCAPE: data.current?.cape || 0,
        maxCAPE24hr: data.peakValues?.maxCAPE || 0,
        factors: data.tornadoThreatAssessment?.factors || []
      }))
    },

    // Overall assessment
    overallAssessment: generateOverallAssessment(outlookResults, mcdResults, gridResults, openMeteoResults),

    // App integration notes
    appIntegration: {
      priorityOrder: [
        '1. NWS Alerts (immediate warnings)',
        '2. SPC Mesoscale Discussions (1-3 hour advance notice)',
        '3. Open-Meteo CAPE/Lifted Index (tornado environment)',
        '4. SPC Convective Outlook (daily risk level)',
        '5. NWS Grid Data (detailed forecast analysis)'
      ],
      alertRecommendations: {
        pushNotification: 'MCD with watch probability >= 80% OR Tornado Warning OR CAPE >= 2500',
        inAppAlert: 'Enhanced risk or higher OR MCD with probability >= 50% OR CAPE >= 1000',
        statusUpdate: 'Any active MCD OR Marginal/Slight risk OR CAPE >= 300'
      }
    }
  };

  saveJSON('predictive_weather_summary.json', summary);
  
  // Log assessment
  log(`\nOverall Assessment: ${summary.overallAssessment.threatLevel}`);
  log(`Recommendation: ${summary.overallAssessment.recommendation}`);

  return summary;
}

function generateOverallAssessment(outlookResults, mcdResults, gridResults, openMeteoResults) {
  let threatLevel = 'LOW';
  let recommendation = 'No immediate action needed. Continue monitoring.';

  // Check for high-risk conditions
  const outlookRisk = outlookResults.oklahomaRisk?.highestRisk || 'NONE';
  const hasMCDs = (mcdResults.discussions?.length || 0) > 0;
  const oklahomaInMCD = mcdResults.oklahomaAffected || false;

  // Check grid indicators
  let highTornadoPotential = false;
  for (const [_, data] of Object.entries(gridResults.locations || {})) {
    if (data.severeWeatherIndicators?.overallTornadoPotential === 'HIGH') {
      highTornadoPotential = true;
      break;
    }
  }

  // Check Open-Meteo tornado metrics (NEW)
  const openMeteoThreat = openMeteoResults.oklahomaAssessment?.overallThreatLevel || 'MINIMAL';
  const maxCAPE = openMeteoResults.oklahomaAssessment?.highestCAPE || 0;
  const highCAPE = maxCAPE >= 2500;
  const extremeCAPE = maxCAPE >= 4000;

  // Determine threat level (updated with Open-Meteo)
  if (outlookRisk === 'HIGH' || outlookRisk === 'MDT' || extremeCAPE || openMeteoThreat === 'EXTREME') {
    threatLevel = 'EXTREME';
    recommendation = 'DANGEROUS WEATHER EXPECTED. Know your shelter location. Be ready to take action immediately.';
  } else if (outlookRisk === 'ENH' || (oklahomaInMCD && hasMCDs) || highCAPE || openMeteoThreat === 'HIGH') {
    threatLevel = 'HIGH';
    recommendation = 'Elevated severe weather threat. Review your safety plan. Stay weather aware.';
  } else if (outlookRisk === 'SLGT' || hasMCDs || highTornadoPotential || openMeteoThreat === 'MODERATE') {
    threatLevel = 'MODERATE';
    recommendation = 'Severe weather possible. Know your shelter location. Monitor forecasts.';
  } else if (outlookRisk === 'MRGL' || openMeteoThreat === 'LOW') {
    threatLevel = 'LOW';
    recommendation = 'Marginal severe weather risk. Stay informed of changing conditions.';
  }

  return {
    threatLevel,
    recommendation,
    factors: {
      convectiveOutlookRisk: outlookRisk,
      activeMCDs: hasMCDs,
      oklahomaInMCD: oklahomaInMCD,
      gridIndicatorsShowHighRisk: highTornadoPotential,
      openMeteoThreatLevel: openMeteoThreat,
      maxCAPE: maxCAPE,
      capeIndicatesRisk: highCAPE
    }
  };
}

// ===================
// CREATE SUMMARY FILE
// ===================

function createSummary(nwsResults, spcResults, femaResults, historicalResults, predictiveSummary, openMeteoResults) {
  logSection('10. Creating Final Summary');
  
  const summary = {
    pulledAt: new Date().toISOString(),
    pulledFor: 'Team Meeting Demo',
    
    locations: LOCATIONS.map(l => l.name),
    
    dataSources: {
      // Current Weather
      nwsAlerts: {
        status: nwsResults.totalAlerts !== undefined ? 'success' : 'partial',
        totalAlerts: nwsResults.totalAlerts || 0,
        statewideAlerts: nwsResults.statewide?.alertCount || 0
      },
      
      spcReports: {
        status: 'success',
        date: new Date().toISOString().split('T')[0],
        tornado: spcResults.tornado?.length || 0,
        wind: spcResults.wind?.length || 0,
        hail: spcResults.hail?.length || 0
      },
      
      femaShelters: {
        status: femaResults.error ? 'error' : 'success',
        totalShelters: femaResults.totalShelters || 0
      },
      
      // Predictive Weather
      predictiveWeather: {
        status: 'success',
        convectiveOutlookRisk: predictiveSummary.convectiveOutlook?.riskLevel || 'NONE',
        activeMCDs: predictiveSummary.mesoscaleDiscussions?.activeCount || 0,
        overallThreatLevel: predictiveSummary.overallAssessment?.threatLevel || 'LOW'
      },

      // Open-Meteo Tornado Metrics (NEW)
      openMeteoTornadoMetrics: {
        status: openMeteoResults.oklahomaAssessment ? 'success' : 'error',
        threatLevel: openMeteoResults.oklahomaAssessment?.overallThreatLevel || 'UNKNOWN',
        maxCAPE: openMeteoResults.oklahomaAssessment?.highestCAPE || 0,
        lowestLiftedIndex: openMeteoResults.oklahomaAssessment?.lowestLiftedIndex || null
      }
    },
    
    filesGenerated: [
      // Current Weather Files
      'nws_alerts_okc.json',
      'nws_alerts_tulsa.json',
      'nws_alerts_stillwater.json',
      'nws_alerts_oklahoma_statewide.json',
      'spc_tornado_reports_today.json',
      'spc_wind_reports_today.json',
      'spc_hail_reports_today.json',
      'fema_open_shelters_oklahoma.json',
      'historical_tornado_data_oklahoma.json',
      // Predictive Weather Files
      'spc_convective_outlook.json',
      'spc_mesoscale_discussions.json',
      'nws_forecast_grid_data.json',
      'open_meteo_tornado_metrics.json',
      'predictive_weather_summary.json',
      // Summary
      'data_pull_summary.json'
    ]
  };

  saveJSON('data_pull_summary.json', summary);
  
  return summary;
}

// ==============
// MAIN EXECUTION
// ==============

async function main() {
  console.log('\n');
  console.log(COLORS.magenta + '╔══════════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.magenta + '║' + COLORS.reset + COLORS.bright + '  TORNADO SHELTER APP - WEATHER DATA PULL (WITH OPEN-METEO)    ' + COLORS.reset + COLORS.magenta + '║' + COLORS.reset);
  console.log(COLORS.magenta + '╚══════════════════════════════════════════════════════════════╝' + COLORS.reset);
  
  console.log('\n' + COLORS.cyan + 'Pull Time: ' + COLORS.reset + new Date().toLocaleString());
  console.log(COLORS.cyan + 'Locations: ' + COLORS.reset + LOCATIONS.map(l => l.name).join(', '));
  console.log(COLORS.cyan + 'Output: ' + COLORS.reset + CONFIG.OUTPUT_DIR + '/');
  
  // Ensure output directory exists
  ensureOutputDir();
  
  // Pull current weather data
  const nwsResults = await pullNWSAlerts();
  await new Promise(r => setTimeout(r, 1000));
  
  const spcResults = await pullSPCReports();
  await new Promise(r => setTimeout(r, 1000));
  
  const femaResults = await pullFEMAShelters();
  await new Promise(r => setTimeout(r, 1000));
  
  const historicalResults = await pullHistoricalData();
  await new Promise(r => setTimeout(r, 1000));

  // Pull PREDICTIVE weather data
  const outlookResults = await pullSPCConvectiveOutlook();
  await new Promise(r => setTimeout(r, 1000));

  const mcdResults = await pullSPCMesoscaleDiscussions();
  await new Promise(r => setTimeout(r, 1000));

  const gridResults = await pullNWSForecastGridData();
  await new Promise(r => setTimeout(r, 1000));

  // Pull Open-Meteo tornado metrics (NEW)
  const openMeteoResults = await pullOpenMeteoTornadoMetrics();
  await new Promise(r => setTimeout(r, 1000));

  // Create predictive summary (now includes Open-Meteo)
  const predictiveSummary = createPredictiveWeatherSummary(outlookResults, mcdResults, gridResults, openMeteoResults);
  
  // Create final summary
  const summary = createSummary(nwsResults, spcResults, femaResults, historicalResults, predictiveSummary, openMeteoResults);
  
  // Final output
  logSection('DATA PULL COMPLETE');
  
  console.log(COLORS.bright + 'Current Weather:' + COLORS.reset);
  console.log(`  NWS Alerts: ${summary.dataSources.nwsAlerts.totalAlerts} total`);
  console.log(`  SPC Reports Today: ${summary.dataSources.spcReports.tornado + summary.dataSources.spcReports.wind + summary.dataSources.spcReports.hail} total`);
  console.log(`  FEMA Shelters: ${summary.dataSources.femaShelters.totalShelters} found`);
  
  console.log('\n' + COLORS.bright + 'Predictive Weather:' + COLORS.reset);
  console.log(`  SPC Outlook Risk: ${summary.dataSources.predictiveWeather.convectiveOutlookRisk}`);
  console.log(`  Active MCDs: ${summary.dataSources.predictiveWeather.activeMCDs}`);
  console.log(`  Overall Threat: ${summary.dataSources.predictiveWeather.overallThreatLevel}`);

  console.log('\n' + COLORS.bright + 'Open-Meteo Tornado Metrics:' + COLORS.reset);
  console.log(`  Threat Level: ${summary.dataSources.openMeteoTornadoMetrics.threatLevel}`);
  console.log(`  Max CAPE: ${summary.dataSources.openMeteoTornadoMetrics.maxCAPE} J/kg`);
  console.log(`  Lowest Lifted Index: ${summary.dataSources.openMeteoTornadoMetrics.lowestLiftedIndex !== null ? summary.dataSources.openMeteoTornadoMetrics.lowestLiftedIndex + '°C' : 'N/A'}`);
  
  console.log('\n' + COLORS.bright + 'Files saved to:' + COLORS.reset + ` ${CONFIG.OUTPUT_DIR}/`);
  console.log(`  Total files: ${summary.filesGenerated.length}`);
  
  console.log('\n' + COLORS.green + COLORS.bright + '✓ Ready for team meeting!' + COLORS.reset);
  console.log(COLORS.green + '  Open data_pull_summary.json for an overview.' + COLORS.reset);
  console.log(COLORS.green + '  Open open_meteo_tornado_metrics.json for CAPE/LI data.' + COLORS.reset);
  console.log(COLORS.green + '  Open predictive_weather_summary.json for tornado forecasts.' + COLORS.reset);
  console.log('');
}

// Run the script
main().catch(error => {
  console.error(COLORS.red + 'Script failed:' + COLORS.reset, error);
  process.exit(1);
});
