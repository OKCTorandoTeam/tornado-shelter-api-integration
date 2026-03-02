/**
 * Test Weather APIs - Node.js Test Script
 * 
 * This script tests all weather APIs directly from Node.js
 * including the NEW predictive weather APIs for tornado forecasting.
 * 
 * HOW TO RUN:
 * 1. Make sure your package.json has "type": "module"
 * 2. Run: node test-weather-apis.js
 * 
 * APIS TESTED:
 * 
 * CURRENT WEATHER:
 * - NWS Alerts API (active warnings)
 * - SPC Storm Reports (today's tornado/wind/hail)
 * - FEMA Open Shelters (emergency shelters)
 * 
 * PREDICTIVE WEATHER (NEW):
 * - SPC Convective Outlook (tornado probability Day 1-3)
 * - SPC Mesoscale Discussions (pre-watch alerts)
 * - NWS Forecast Grid Data (severe weather indicators)
 * 
 * TEST LOCATION:
 * Oklahoma City, OK (35.4676, -97.5164)
 */

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  // API endpoints - Current Weather
  NWS_BASE_URL: 'https://api.weather.gov',
  SPC_REPORTS_URL: 'https://www.spc.noaa.gov/climo/reports',
  FEMA_SHELTERS_URL: 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query',
  
  // API endpoints - Predictive Weather
  SPC_OUTLOOK_URL: 'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer',
  SPC_MCD_URL: 'https://www.spc.noaa.gov/products/md',
  
  // API endpoints - Open-Meteo (FREE tornado prediction metrics)
  OPEN_METEO_URL: 'https://api.open-meteo.com/v1/forecast',
  
  // Required headers
  APP_USER_AGENT: 'TornadoShelterApp/1.0 (api-test)',
  
  // Request timeout
  TIMEOUT_MS: 15000
};

// Test location: Oklahoma City, OK
const TEST_LOCATION = {
  name: 'Oklahoma City, OK',
  latitude: 35.4676,
  longitude: -97.5164
};

const STATE_CODE = 'OK';

// Console colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function printHeader(title) {
  console.log('\n' + COLORS.cyan + '═'.repeat(60) + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + ' ' + title + COLORS.reset);
  console.log(COLORS.cyan + '═'.repeat(60) + COLORS.reset + '\n');
}

function printSuccess(message) {
  console.log(COLORS.green + '✓ ' + message + COLORS.reset);
}

function printError(message) {
  console.log(COLORS.red + '✗ ' + message + COLORS.reset);
}

function printWarning(message) {
  console.log(COLORS.yellow + '⚠ ' + message + COLORS.reset);
}

function printInfo(message) {
  console.log(COLORS.blue + 'ℹ ' + message + COLORS.reset);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// ==========================================
// TEST 1: NWS ALERTS API
// ==========================================

async function testNWSAlerts() {
  printHeader('TEST 1: NWS Weather Alerts API');
  
  printInfo(`Location: ${TEST_LOCATION.name}`);
  printInfo(`Endpoint: ${CONFIG.NWS_BASE_URL}/alerts/active?point=...`);
  console.log('');

  try {
    const url = `${CONFIG.NWS_BASE_URL}/alerts/active?point=${TEST_LOCATION.latitude},${TEST_LOCATION.longitude}`;
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
    const alerts = data.features || [];

    printSuccess(`API call successful!`);
    console.log(`  Found ${alerts.length} active alert(s)`);

    if (alerts.length > 0) {
      console.log('\n  Sample alert:');
      const alert = alerts[0].properties;
      console.log(`    Event: ${alert.event}`);
      console.log(`    Severity: ${alert.severity}`);
      console.log(`    Headline: ${alert.headline?.substring(0, 60)}...`);
    }

    return { success: true, alertCount: alerts.length };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 2: SPC STORM REPORTS
// ==========================================

async function testSPCReports() {
  printHeader('TEST 2: SPC Storm Reports (Today)');
  
  printInfo(`Endpoint: ${CONFIG.SPC_REPORTS_URL}/today_torn.csv`);
  console.log('');

  try {
    const reportTypes = ['tornado', 'wind', 'hail'];
    const files = ['today_torn.csv', 'today_wind.csv', 'today_hail.csv'];
    const results = {};

    for (let i = 0; i < reportTypes.length; i++) {
      const url = `${CONFIG.SPC_REPORTS_URL}/${files[i]}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${reportTypes[i]}`);
      }

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const count = lines.length > 1 ? lines.length - 1 : 0;
      
      results[reportTypes[i]] = count;
      printSuccess(`${reportTypes[i]}: ${count} report(s)`);
      
      await delay(300);
    }

    return { success: true, ...results };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 3: FEMA SHELTERS
// ==========================================

async function testFEMAShelters() {
  printHeader('TEST 3: FEMA Open Shelters');
  
  printInfo(`Endpoint: gis.fema.gov/arcgis/rest/services/NSS/OpenShelters`);
  printInfo(`State: ${STATE_CODE}`);
  console.log('');

  try {
    const params = new URLSearchParams({
      where: `STATE='${STATE_CODE}'`,
      outFields: 'SHELTER_NAME,CITY,SHELTER_STATUS',
      f: 'json'
    });

    const url = `${CONFIG.FEMA_SHELTERS_URL}?${params}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const shelters = data.features || [];

    printSuccess(`API call successful!`);
    console.log(`  Found ${shelters.length} shelter(s) in ${STATE_CODE}`);

    if (shelters.length === 0) {
      printInfo('  No emergency shelters currently open (normal during calm weather)');
    }

    return { success: true, shelterCount: shelters.length };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 4: SPC CONVECTIVE OUTLOOK (PREDICTIVE)
// ==========================================

async function testSPCConvectiveOutlook() {
  printHeader('TEST 4: SPC Convective Outlook (Tornado Probability)');
  
  printInfo(`Endpoint: ${CONFIG.SPC_OUTLOOK_URL}`);
  printInfo('Data: Day 1-3 tornado probability forecasts');
  console.log('');

  try {
    // Test Day 1 Categorical Outlook
    const categoricalUrl = `${CONFIG.SPC_OUTLOOK_URL}/1/query?where=1%3D1&outFields=*&f=json`;
    const categoricalResponse = await fetchWithTimeout(categoricalUrl, {
      headers: { 'User-Agent': CONFIG.APP_USER_AGENT }
    });

    if (!categoricalResponse.ok) {
      throw new Error(`HTTP ${categoricalResponse.status} for categorical outlook`);
    }

    const categoricalData = await categoricalResponse.json();
    const categoricalFeatures = categoricalData.features || [];
    printSuccess(`Day 1 Categorical Outlook: ${categoricalFeatures.length} risk zone(s)`);

    // Show risk levels found
    if (categoricalFeatures.length > 0) {
      const riskLevels = categoricalFeatures.map(f => f.attributes.LABEL || f.attributes.LABEL2 || 'Unknown');
      console.log(`    Risk levels: ${[...new Set(riskLevels)].join(', ')}`);
    }

    await delay(500);

    // Test Day 1 Tornado Probability
    const tornadoUrl = `${CONFIG.SPC_OUTLOOK_URL}/7/query?where=1%3D1&outFields=*&f=json`;
    const tornadoResponse = await fetchWithTimeout(tornadoUrl, {
      headers: { 'User-Agent': CONFIG.APP_USER_AGENT }
    });

    if (!tornadoResponse.ok) {
      throw new Error(`HTTP ${tornadoResponse.status} for tornado outlook`);
    }

    const tornadoData = await tornadoResponse.json();
    const tornadoFeatures = tornadoData.features || [];
    printSuccess(`Day 1 Tornado Probability: ${tornadoFeatures.length} zone(s)`);

    // Show probability levels
    if (tornadoFeatures.length > 0) {
      const probLevels = tornadoFeatures.map(f => f.attributes.LABEL2 || 'Unknown');
      console.log(`    Probabilities: ${[...new Set(probLevels)].join(', ')}`);
    }

    await delay(500);

    // Test Day 1 Significant Tornado
    const sigTornUrl = `${CONFIG.SPC_OUTLOOK_URL}/8/query?where=1%3D1&outFields=*&f=json`;
    const sigTornResponse = await fetchWithTimeout(sigTornUrl, {
      headers: { 'User-Agent': CONFIG.APP_USER_AGENT }
    });

    if (!sigTornResponse.ok) {
      throw new Error(`HTTP ${sigTornResponse.status} for significant tornado`);
    }

    const sigTornData = await sigTornResponse.json();
    const sigTornFeatures = sigTornData.features || [];
    printSuccess(`Day 1 Significant Tornado (EF2+): ${sigTornFeatures.length} zone(s)`);

    console.log('\n' + COLORS.bright + '  JSON Response Structure:' + COLORS.reset);
    console.log('  {');
    console.log('    features: [');
    console.log('      {');
    console.log('        attributes: { LABEL, LABEL2, VALID, EXPIRE, ISSUE },');
    console.log('        geometry: { rings: [[lon, lat], ...] }');
    console.log('      }');
    console.log('    ]');
    console.log('  }');

    return { 
      success: true, 
      categoricalZones: categoricalFeatures.length,
      tornadoZones: tornadoFeatures.length,
      significantTornadoZones: sigTornFeatures.length
    };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 5: SPC MESOSCALE DISCUSSIONS (PREDICTIVE)
// ==========================================

async function testSPCMesoscaleDiscussions() {
  printHeader('TEST 5: SPC Mesoscale Discussions (Pre-Watch Alerts)');
  
  printInfo(`Endpoint: ${CONFIG.SPC_MCD_URL}/`);
  printInfo('Data: Pre-watch analysis (1-3 hours advance notice)');
  console.log('');

  try {
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
    const uniqueMCDs = [...new Set(mcdMatches)];

    printSuccess(`API call successful!`);
    console.log(`  Found ${uniqueMCDs.length} recent Mesoscale Discussion(s)`);

    if (uniqueMCDs.length > 0) {
      console.log(`  Latest MCDs: ${uniqueMCDs.slice(0, 5).join(', ')}`);
      
      // Try to fetch details for the most recent MCD
      const latestMCD = uniqueMCDs[0];
      const mcdUrl = `${CONFIG.SPC_MCD_URL}/${latestMCD}.html`;
      
      try {
        const mcdResponse = await fetchWithTimeout(mcdUrl);
        if (mcdResponse.ok) {
          const mcdHtml = await mcdResponse.text();
          
          // Extract concerning line
          const concerningMatch = mcdHtml.match(/CONCERNING[.]{3}([^<\n]+)/i);
          if (concerningMatch) {
            console.log(`\n  Latest MCD (${latestMCD}):`);
            console.log(`    Concerning: ${concerningMatch[1].trim().substring(0, 60)}...`);
          }
        }
      } catch (e) {
        // Ignore individual MCD fetch errors
      }
    } else {
      printInfo('  No active MCDs (normal during calm weather)');
    }

    console.log('\n' + COLORS.bright + '  Why MCDs Matter:' + COLORS.reset);
    console.log('  • Issued 1-3 hours BEFORE tornado watches');
    console.log('  • Best early warning tool for your app');
    console.log('  • Push notification when watch_probability >= 80%');

    return { 
      success: true, 
      mcdCount: uniqueMCDs.length,
      latestMCDs: uniqueMCDs.slice(0, 5)
    };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 6: NWS FORECAST GRID DATA (PREDICTIVE)
// ==========================================

async function testNWSForecastGridData() {
  printHeader('TEST 6: NWS Forecast Grid Data (Severe Weather Indicators)');
  
  printInfo(`Location: ${TEST_LOCATION.name}`);
  printInfo(`Endpoint: ${CONFIG.NWS_BASE_URL}/gridpoints/{office}/{x},{y}`);
  console.log('');

  try {
    // Step 1: Get grid point info
    const pointUrl = `${CONFIG.NWS_BASE_URL}/points/${TEST_LOCATION.latitude},${TEST_LOCATION.longitude}`;
    const pointResponse = await fetchWithTimeout(pointUrl, {
      headers: {
        'User-Agent': CONFIG.APP_USER_AGENT,
        'Accept': 'application/geo+json'
      }
    });

    if (!pointResponse.ok) {
      throw new Error(`HTTP ${pointResponse.status} for points lookup`);
    }

    const pointData = await pointResponse.json();
    const gridId = pointData.properties.gridId;
    const gridX = pointData.properties.gridX;
    const gridY = pointData.properties.gridY;
    const forecastUrl = pointData.properties.forecastGridData;

    printSuccess(`Grid location: ${gridId} (${gridX}, ${gridY})`);

    await delay(500);

    // Step 2: Get grid forecast data
    const gridResponse = await fetchWithTimeout(forecastUrl, {
      headers: {
        'User-Agent': CONFIG.APP_USER_AGENT,
        'Accept': 'application/geo+json'
      }
    });

    if (!gridResponse.ok) {
      throw new Error(`HTTP ${gridResponse.status} for grid data`);
    }

    const gridData = await gridResponse.json();
    const props = gridData.properties;

    printSuccess(`Grid forecast data retrieved!`);

    // Show available parameters
    const availableParams = Object.keys(props).filter(k => 
      props[k]?.values && Array.isArray(props[k].values) && props[k].values.length > 0
    );

    console.log(`\n  Available parameters: ${availableParams.length}`);
    
    // Show key severe weather parameters
    const keyParams = ['temperature', 'dewpoint', 'windSpeed', 'windGust', 'windDirection', 
                       'probabilityOfPrecipitation', 'probabilityOfThunder'];
    
    console.log('\n' + COLORS.bright + '  Key Severe Weather Parameters:' + COLORS.reset);
    
    for (const param of keyParams) {
      if (props[param]?.values?.length > 0) {
        const firstValue = props[param].values[0];
        console.log(`    ${param}: ${firstValue.value} (next hour)`);
      }
    }

    // Calculate simple severe weather indicators
    console.log('\n' + COLORS.bright + '  Severe Weather Indicators:' + COLORS.reset);
    
    const dewpoints = props.dewpoint?.values?.slice(0, 5).map(v => v.value) || [];
    const avgDewpoint = dewpoints.length > 0 ? (dewpoints.reduce((a, b) => a + b, 0) / dewpoints.length).toFixed(1) : 'N/A';
    console.log(`    Avg Dewpoint (next 5hr): ${avgDewpoint}°C`);
    
    const thunderProbs = props.probabilityOfThunder?.values?.slice(0, 5).map(v => v.value) || [];
    const maxThunder = thunderProbs.length > 0 ? Math.max(...thunderProbs) : 0;
    console.log(`    Max Thunder Probability: ${maxThunder}%`);
    
    const gusts = props.windGust?.values?.slice(0, 5).map(v => v.value) || [];
    const maxGust = gusts.length > 0 ? Math.max(...gusts).toFixed(1) : 'N/A';
    console.log(`    Max Wind Gust: ${maxGust} km/h`);

    console.log('\n' + COLORS.bright + '  JSON Response Structure:' + COLORS.reset);
    console.log('  {');
    console.log('    properties: {');
    console.log('      temperature: { values: [{ validTime, value }] },');
    console.log('      dewpoint: { values: [...] },');
    console.log('      windSpeed: { values: [...] },');
    console.log('      probabilityOfThunder: { values: [...] },');
    console.log('      // ... many more parameters');
    console.log('    }');
    console.log('  }');

    return { 
      success: true, 
      gridId,
      gridX,
      gridY,
      parameterCount: availableParams.length
    };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 7: OPEN-METEO TORNADO METRICS (NEW)
// ==========================================

async function testOpenMeteoTornadoMetrics() {
  printHeader('TEST 7: Open-Meteo 16-Day Tornado Prediction Metrics');
  
  printInfo(`Endpoint: ${CONFIG.OPEN_METEO_URL}`);
  printInfo('Data: CAPE, Lifted Index, CIN, Dewpoint, Wind Speed/Gusts');
  printInfo('Forecast Range: 16 DAYS');
  printInfo('Cost: FREE - No API key required');
  console.log('');

  try {
    // Parameters for tornado prediction
    const hourlyParams = [
      'cape',
      'lifted_index',
      'convective_inhibition',
      'temperature_2m',
      'dewpoint_2m',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_gusts_10m',
      'pressure_msl'
    ].join(',');

    const dailyParams = [
      'cape_max',
      'cape_min', 
      'cape_mean',
      'precipitation_sum',
      'wind_gusts_10m_max'
    ].join(',');

    const url = `${CONFIG.OPEN_METEO_URL}?latitude=${TEST_LOCATION.latitude}&longitude=${TEST_LOCATION.longitude}&hourly=${hourlyParams}&daily=${dailyParams}&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago&forecast_days=16`;

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    printSuccess(`API call successful!`);
    console.log(`  Timezone: ${data.timezone}`);
    console.log(`  Elevation: ${data.elevation}m`);
    console.log(`  Forecast Days: 16`);

    // Get current hour's data
    const hourlyData = data.hourly;
    const dailyData = data.daily;
    const currentHourIndex = new Date().getHours();

    console.log('\n' + COLORS.bright + '  Current Tornado Prediction Metrics:' + COLORS.reset);
    
    // CAPE
    const cape = hourlyData.cape?.[currentHourIndex] || 0;
    const capeLevel = cape >= 2500 ? COLORS.red + 'HIGH' : 
                      cape >= 1000 ? COLORS.yellow + 'MODERATE' : 
                      cape >= 300 ? COLORS.green + 'LOW' : COLORS.green + 'MINIMAL';
    console.log(`    CAPE: ${cape} J/kg (${capeLevel}${COLORS.reset})`);

    // Lifted Index
    const li = hourlyData.lifted_index?.[currentHourIndex];
    if (li !== null && li !== undefined) {
      const liLevel = li <= -6 ? COLORS.red + 'VERY UNSTABLE' :
                      li <= -3 ? COLORS.yellow + 'UNSTABLE' :
                      li < 0 ? COLORS.yellow + 'MARGINAL' : COLORS.green + 'STABLE';
      console.log(`    Lifted Index: ${li}°C (${liLevel}${COLORS.reset})`);
    } else {
      console.log(`    Lifted Index: N/A`);
    }

    // CIN
    const cin = hourlyData.convective_inhibition?.[currentHourIndex] || 0;
    const cinLevel = cin < 50 ? COLORS.red + 'WEAK CAP' :
                     cin < 200 ? COLORS.yellow + 'MODERATE CAP' : COLORS.green + 'STRONG CAP';
    console.log(`    CIN: ${cin} J/kg (${cinLevel}${COLORS.reset})`);

    // Dewpoint
    const dewpoint = hourlyData.dewpoint_2m?.[currentHourIndex];
    if (dewpoint !== undefined) {
      const dewpointC = (dewpoint - 32) * 5/9;
      const dpLevel = dewpointC >= 20 ? COLORS.red + 'HIGH MOISTURE' :
                      dewpointC >= 15 ? COLORS.yellow + 'GOOD MOISTURE' : COLORS.green + 'DRY';
      console.log(`    Dewpoint: ${dewpoint}°F (${dpLevel}${COLORS.reset})`);
    }

    // Wind Gusts
    const windGust = hourlyData.wind_gusts_10m?.[currentHourIndex] || 0;
    const gustLevel = windGust >= 50 ? COLORS.red + 'SEVERE' :
                      windGust >= 30 ? COLORS.yellow + 'STRONG' : COLORS.green + 'LIGHT';
    console.log(`    Wind Gusts: ${windGust} mph (${gustLevel}${COLORS.reset})`);

    // 16-Day Daily CAPE Summary
    console.log('\n' + COLORS.bright + '  16-Day CAPE Forecast:' + COLORS.reset);
    
    const maxCape7day = Math.max(...(dailyData.cape_max?.slice(0, 7) || [0]));
    const maxCape16day = Math.max(...(dailyData.cape_max || [0]));
    
    console.log(`    Max CAPE (Days 1-7): ${maxCape7day} J/kg`);
    console.log(`    Max CAPE (Days 1-16): ${maxCape16day} J/kg`);

    // Show high-risk days
    const highRiskDays = [];
    dailyData.time?.forEach((date, i) => {
      const dayMax = dailyData.cape_max?.[i] || 0;
      if (dayMax >= 1000) {
        highRiskDays.push({ date, cape: dayMax });
      }
    });

    if (highRiskDays.length > 0) {
      console.log('\n' + COLORS.yellow + '  ⚠️  High-Risk Days (CAPE >= 1000):' + COLORS.reset);
      highRiskDays.forEach(day => {
        const riskColor = day.cape >= 2500 ? COLORS.red : COLORS.yellow;
        console.log(`    ${day.date}: ${riskColor}${day.cape} J/kg${COLORS.reset}`);
      });
    } else {
      console.log('\n' + COLORS.green + '  ✓ No high-risk days in 16-day forecast' + COLORS.reset);
    }

    // Show daily summary table
    console.log('\n' + COLORS.bright + '  Daily CAPE Summary (First 7 Days):' + COLORS.reset);
    console.log('    Date       | Max CAPE | Risk Level');
    console.log('    ' + '-'.repeat(40));
    
    dailyData.time?.slice(0, 7).forEach((date, i) => {
      const dayMax = dailyData.cape_max?.[i] || 0;
      let risk = 'MINIMAL';
      let color = COLORS.green;
      if (dayMax >= 4000) { risk = 'EXTREME'; color = COLORS.red; }
      else if (dayMax >= 2500) { risk = 'HIGH'; color = COLORS.red; }
      else if (dayMax >= 1000) { risk = 'MODERATE'; color = COLORS.yellow; }
      else if (dayMax >= 300) { risk = 'LOW'; color = COLORS.green; }
      
      console.log(`    ${date} | ${String(dayMax).padStart(8)} | ${color}${risk}${COLORS.reset}`);
    });

    // Tornado threat assessment
    let threatScore = 0;
    if (maxCape16day >= 2500) threatScore += 30;
    else if (maxCape16day >= 1000) threatScore += 20;
    else if (maxCape16day >= 300) threatScore += 10;

    if (highRiskDays.length >= 3) threatScore += 15;
    else if (highRiskDays.length >= 1) threatScore += 10;

    const threatLevel = threatScore >= 40 ? COLORS.red + 'HIGH' :
                        threatScore >= 25 ? COLORS.yellow + 'MODERATE' :
                        threatScore >= 10 ? COLORS.green + 'LOW' : COLORS.green + 'MINIMAL';
    
    console.log(`\n  ${COLORS.bright}16-Day Tornado Threat Level: ${threatLevel}${COLORS.reset} (Score: ${threatScore})`);

    return { 
      success: true, 
      currentCAPE: cape,
      currentLI: li,
      maxCAPE_7day: maxCape7day,
      maxCAPE_16day: maxCape16day,
      highRiskDays: highRiskDays.length,
      threatScore
    };

  } catch (error) {
    printError(`Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllTests() {
  console.log('\n');
  console.log(COLORS.magenta + '╔════════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.magenta + '║' + COLORS.reset + COLORS.bright + '   TORNADO SHELTER APP - WEATHER API TEST SUITE (COMPLETE)   ' + COLORS.reset + COLORS.magenta + '║' + COLORS.reset);
  console.log(COLORS.magenta + '╚════════════════════════════════════════════════════════════╝' + COLORS.reset);
  
  console.log('\n' + COLORS.cyan + 'Test Location: ' + COLORS.reset + TEST_LOCATION.name);
  console.log(COLORS.cyan + 'Coordinates: ' + COLORS.reset + `${TEST_LOCATION.latitude}, ${TEST_LOCATION.longitude}`);
  console.log(COLORS.cyan + 'Time: ' + COLORS.reset + new Date().toLocaleString());

  const results = {
    // Current Weather APIs
    nwsAlerts: null,
    spcReports: null,
    femaShelters: null,
    // Predictive Weather APIs
    spcConvectiveOutlook: null,
    spcMesoscaleDiscussions: null,
    nwsForecastGrid: null,
    // Tornado Metrics (NEW)
    openMeteoTornadoMetrics: null
  };

  console.log('\n' + COLORS.bright + '─── CURRENT WEATHER APIS ───' + COLORS.reset);

  results.nwsAlerts = await testNWSAlerts();
  await delay(1000);

  results.spcReports = await testSPCReports();
  await delay(1000);

  results.femaShelters = await testFEMAShelters();
  await delay(1000);

  console.log('\n' + COLORS.bright + '─── PREDICTIVE WEATHER APIS ───' + COLORS.reset);

  results.spcConvectiveOutlook = await testSPCConvectiveOutlook();
  await delay(1000);

  results.spcMesoscaleDiscussions = await testSPCMesoscaleDiscussions();
  await delay(1000);

  results.nwsForecastGrid = await testNWSForecastGridData();
  await delay(1000);

  console.log('\n' + COLORS.bright + '─── TORNADO PREDICTION METRICS ───' + COLORS.reset);

  results.openMeteoTornadoMetrics = await testOpenMeteoTornadoMetrics();

  // Final Summary
  printHeader('TEST RESULTS SUMMARY');

  console.log(COLORS.bright + 'Current Weather APIs:' + COLORS.reset);
  console.log(`  1. NWS Alerts:        ${results.nwsAlerts.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  2. SPC Reports:       ${results.spcReports.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  3. FEMA Shelters:     ${results.femaShelters.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);

  console.log('\n' + COLORS.bright + 'Predictive Weather APIs:' + COLORS.reset);
  console.log(`  4. SPC Convective:    ${results.spcConvectiveOutlook.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  5. SPC MCDs:          ${results.spcMesoscaleDiscussions.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  6. NWS Forecast Grid: ${results.nwsForecastGrid.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);

  console.log('\n' + COLORS.bright + 'Tornado Prediction Metrics (16-Day):' + COLORS.reset);
  console.log(`  7. Open-Meteo:        ${results.openMeteoTornadoMetrics.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  if (results.openMeteoTornadoMetrics.success) {
    console.log(`     Current CAPE: ${results.openMeteoTornadoMetrics.currentCAPE} J/kg`);
    console.log(`     Max CAPE (7-day): ${results.openMeteoTornadoMetrics.maxCAPE_7day} J/kg`);
    console.log(`     Max CAPE (16-day): ${results.openMeteoTornadoMetrics.maxCAPE_16day} J/kg`);
    console.log(`     High-Risk Days: ${results.openMeteoTornadoMetrics.highRiskDays}`);
  }

  const allPassed = Object.values(results).every(r => r?.success);

  console.log('');
  if (allPassed) {
    console.log(COLORS.green + COLORS.bright + '🎉 ALL TESTS PASSED!' + COLORS.reset);
    console.log(COLORS.green + 'All weather APIs are working correctly.' + COLORS.reset);
    console.log(COLORS.green + 'You can now use pull-weather-data.js to fetch full data.' + COLORS.reset);
  } else {
    console.log(COLORS.yellow + '⚠️  Some tests failed.' + COLORS.reset);
    console.log(COLORS.yellow + 'Check error messages above for details.' + COLORS.reset);
  }

  // Show API summary
  console.log('\n' + COLORS.bright + '─── API REFERENCE ───' + COLORS.reset);
  console.log('\n' + COLORS.cyan + 'Current Weather (What\'s happening now):' + COLORS.reset);
  console.log('  • NWS Alerts: Active warnings and watches');
  console.log('  • SPC Reports: Today\'s confirmed tornado/wind/hail events');
  console.log('  • FEMA Shelters: Open emergency shelters');

  console.log('\n' + COLORS.cyan + 'Predictive Weather (What might happen):' + COLORS.reset);
  console.log('  • SPC Convective Outlook: Tornado probability (2%, 5%, 10%+)');
  console.log('  • SPC Mesoscale Discussions: Pre-watch alerts (1-3 hr advance)');
  console.log('  • NWS Forecast Grid: Detailed forecast with severe indicators');

  console.log('\n' + COLORS.cyan + 'Tornado Prediction Metrics (Open-Meteo):' + COLORS.reset);
  console.log('  • CAPE: Convective Available Potential Energy (storm fuel)');
  console.log('  • Lifted Index: Atmospheric instability indicator');
  console.log('  • CIN: Convective Inhibition (cap strength)');
  console.log('  • Dewpoint: Moisture content');
  console.log('  • Wind Gusts: Surface instability indicator');

  console.log('\n' + COLORS.cyan + 'Integration Priority for App:' + COLORS.reset);
  console.log('  1. NWS Alerts (immediate warnings)');
  console.log('  2. SPC MCDs (best early warning - push notifications)');
  console.log('  3. Open-Meteo CAPE/LI (tornado environment metrics)');
  console.log('  4. SPC Convective Outlook (daily risk level)');
  console.log('  5. NWS Forecast Grid (background analysis)');

  console.log('\n' + COLORS.cyan + '─'.repeat(60) + COLORS.reset);
  console.log(COLORS.cyan + 'Test completed at: ' + new Date().toLocaleString() + COLORS.reset);
  console.log('');
}

// ==========================================
// RUN THE TESTS
// ==========================================

runAllTests().catch(error => {
  console.error(COLORS.red + 'Test suite crashed:' + COLORS.reset, error);
  process.exit(1);
});
