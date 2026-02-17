/**
 * Test Weather APIs - Node.js Test Script
 * 
 * This script tests all the weather APIs directly from Node.js
 * to verify they work before integrating into React Native.
 * 
 * HOW TO RUN:
 * 1. Make sure your package.json has "type": "module"
 * 2. Run: node test-weather-apis.js
 * 
 * WHAT THIS SCRIPT DOES:
 * - Tests NWS Alerts API (free, no key required)
 * - Tests SPC Storm Reports (free, no key required)
 * - Tests FEMA Open Shelters (free, no key required)
 * - Tests the unified fetchAllData function
 * - Prints results in a readable format
 * 
 * TEST LOCATION:
 * Oklahoma City, OK (35.4676, -97.5164)
 * You can change this to test other locations.
 */

// ==========================================
// IMPORT THE WEATHER SERVICE
// ==========================================

import {
  WeatherDataService,
  NWSAlertsService,
  SPCStormReportsService,
  FEMASheltersService,
  CONFIG
} from './weatherDataService.js';

// ==========================================
// TEST CONFIGURATION
// ==========================================

// Test location: Oklahoma City, OK
// Change these coordinates to test other locations
const TEST_LOCATION = {
  name: 'Oklahoma City, OK',
  latitude: 35.4676,
  longitude: -97.5164
};

// State code for shelter queries
const STATE_CODE = 'OK';

// Colors for console output (makes it easier to read)
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

/**
 * Prints a section header
 */
function printHeader(title) {
  console.log('\n' + COLORS.cyan + '='.repeat(60) + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + ' ' + title + COLORS.reset);
  console.log(COLORS.cyan + '='.repeat(60) + COLORS.reset + '\n');
}

/**
 * Prints success message
 */
function printSuccess(message) {
  console.log(COLORS.green + '✓ ' + message + COLORS.reset);
}

/**
 * Prints error message
 */
function printError(message) {
  console.log(COLORS.red + '✗ ' + message + COLORS.reset);
}

/**
 * Prints warning message
 */
function printWarning(message) {
  console.log(COLORS.yellow + '⚠ ' + message + COLORS.reset);
}

/**
 * Prints info message
 */
function printInfo(message) {
  console.log(COLORS.blue + 'ℹ ' + message + COLORS.reset);
}

/**
 * Formats a date for display
 */
function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

/**
 * Waits for specified milliseconds
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// TEST 1: NWS ALERTS API
// ==========================================

async function testNWSAlerts() {
  printHeader('TEST 1: NWS Weather Alerts API');
  
  printInfo(`Testing location: ${TEST_LOCATION.name}`);
  printInfo(`Coordinates: ${TEST_LOCATION.latitude}, ${TEST_LOCATION.longitude}`);
  printInfo(`API Endpoint: ${CONFIG.NWS_BASE_URL}/alerts/active?point=...`);
  console.log('');

  try {
    // Create service instance
    const service = new WeatherDataService();
    const nws = service.nwsService;

    // Fetch alerts
    console.log('Fetching active alerts...');
    const alerts = await nws.getActiveAlerts(
      TEST_LOCATION.latitude,
      TEST_LOCATION.longitude
    );

    printSuccess(`API call successful!`);
    console.log('');

    // Display results
    if (alerts.length === 0) {
      printInfo('No active weather alerts for this location.');
      printInfo('This is normal when there is no severe weather.');
    } else {
      console.log(`Found ${COLORS.bright}${alerts.length}${COLORS.reset} active alert(s):\n`);
      
      alerts.forEach((alert, index) => {
        console.log(COLORS.yellow + `--- Alert ${index + 1} ---` + COLORS.reset);
        console.log(`  Event: ${COLORS.bright}${alert.event}${COLORS.reset}`);
        console.log(`  Severity: ${alert.severity}`);
        console.log(`  Urgency: ${alert.urgency}`);
        console.log(`  Headline: ${alert.headline || 'N/A'}`);
        console.log(`  Area: ${alert.areaDesc || 'N/A'}`);
        console.log(`  Expires: ${formatDate(alert.expires)}`);
        console.log(`  Tornado Related: ${alert.isTornadoWarning ? 'YES ⚠️' : 'No'}`);
        console.log('');
      });
    }

    // Test state-wide alerts
    console.log(`\nFetching state-wide alerts for ${STATE_CODE}...`);
    const stateAlerts = await nws.getStateAlerts(STATE_CODE);
    printSuccess(`Found ${stateAlerts.length} alert(s) across ${STATE_CODE}`);

    return { success: true, alertCount: alerts.length };

  } catch (error) {
    printError(`NWS API test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 2: SPC STORM REPORTS
// ==========================================

async function testSPCReports() {
  printHeader('TEST 2: SPC Storm Reports');
  
  printInfo(`API Endpoint: ${CONFIG.SPC_REPORTS_URL}/today_torn.csv`);
  printInfo('Fetching today\'s severe weather reports...');
  console.log('');

  try {
    // Create service instance
    const service = new WeatherDataService();
    const spc = service.spcService;

    // Fetch all report types
    console.log('Fetching tornado reports...');
    const tornadoReports = await spc.getTodaysReports('tornado');
    printSuccess(`Tornado reports: ${tornadoReports.length}`);

    console.log('Fetching wind reports...');
    const windReports = await spc.getTodaysReports('wind');
    printSuccess(`Wind reports: ${windReports.length}`);

    console.log('Fetching hail reports...');
    const hailReports = await spc.getTodaysReports('hail');
    printSuccess(`Hail reports: ${hailReports.length}`);

    console.log('');

    // Show summary
    const totalReports = tornadoReports.length + windReports.length + hailReports.length;
    
    if (totalReports === 0) {
      printInfo('No severe weather reports today.');
      printInfo('This is normal on calm weather days.');
    } else {
      console.log(COLORS.bright + 'Today\'s Severe Weather Summary:' + COLORS.reset);
      console.log(`  🌪️  Tornado reports: ${tornadoReports.length}`);
      console.log(`  💨 Wind reports: ${windReports.length}`);
      console.log(`  🧊 Hail reports: ${hailReports.length}`);
      console.log(`  📊 Total: ${totalReports}`);
    }

    // Show sample tornado report if any exist
    if (tornadoReports.length > 0) {
      console.log('\n' + COLORS.yellow + 'Sample Tornado Report:' + COLORS.reset);
      const sample = tornadoReports[0];
      console.log(`  Time: ${sample.time}`);
      console.log(`  Location: ${sample.location}, ${sample.county} County, ${sample.state}`);
      console.log(`  F-Scale: ${sample.fScale}`);
      console.log(`  Coordinates: ${sample.latitude}, ${sample.longitude}`);
      console.log(`  Comments: ${sample.comments || 'None'}`);
    }

    // Test nearby reports
    console.log('\n' + `Checking for reports within 100 miles of ${TEST_LOCATION.name}...`);
    const nearbyReports = await spc.getNearbyReports(
      TEST_LOCATION.latitude,
      TEST_LOCATION.longitude,
      100
    );
    
    const nearbyTotal = nearbyReports.tornado.length + nearbyReports.wind.length + nearbyReports.hail.length;
    printInfo(`Found ${nearbyTotal} report(s) within 100 miles`);

    return { 
      success: true, 
      tornado: tornadoReports.length,
      wind: windReports.length,
      hail: hailReports.length
    };

  } catch (error) {
    printError(`SPC Reports test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 3: FEMA OPEN SHELTERS
// ==========================================

async function testFEMAShelters() {
  printHeader('TEST 3: FEMA Open Shelters API');
  
  printInfo('API Endpoint: gis.fema.gov/arcgis/rest/services/NSS/OpenShelters');
  printInfo(`Fetching open shelters in ${STATE_CODE}...`);
  console.log('');

  try {
    // Create service instance
    const service = new WeatherDataService();
    const fema = service.femaService;

    // Fetch state shelters
    console.log(`Fetching open shelters in ${STATE_CODE}...`);
    const stateShelters = await fema.getOpenShelters(STATE_CODE);
    printSuccess(`API call successful!`);

    console.log('');

    if (stateShelters.length === 0) {
      printInfo(`No FEMA emergency shelters currently open in ${STATE_CODE}.`);
      printInfo('This is normal when there is no active disaster.');
      printInfo('Shelters open during emergencies (tornadoes, floods, etc.)');
    } else {
      console.log(`Found ${COLORS.bright}${stateShelters.length}${COLORS.reset} open shelter(s) in ${STATE_CODE}:\n`);
      
      // Show first 5 shelters
      const displayCount = Math.min(5, stateShelters.length);
      for (let i = 0; i < displayCount; i++) {
        const shelter = stateShelters[i];
        console.log(COLORS.yellow + `--- Shelter ${i + 1} ---` + COLORS.reset);
        console.log(`  Name: ${COLORS.bright}${shelter.name}${COLORS.reset}`);
        console.log(`  Address: ${shelter.address}, ${shelter.city}, ${shelter.state}`);
        console.log(`  Status: ${shelter.isOpen ? '🟢 OPEN' : '🔴 Closed'}`);
        console.log(`  Capacity: ${shelter.totalCapacity || 'Unknown'}`);
        console.log(`  Current Population: ${shelter.currentPopulation || 'Unknown'}`);
        console.log(`  Accepts Pets: ${shelter.acceptsPets ? 'Yes 🐕' : 'No'}`);
        console.log(`  ADA Accessible: ${shelter.adaAccessible ? 'Yes ♿' : 'Unknown'}`);
        console.log('');
      }

      if (stateShelters.length > 5) {
        printInfo(`... and ${stateShelters.length - 5} more shelters`);
      }
    }

    // Test nearby shelters
    console.log(`\nFetching shelters within 50 miles of ${TEST_LOCATION.name}...`);
    const nearbyShelters = await fema.getNearbyShelters(
      TEST_LOCATION.latitude,
      TEST_LOCATION.longitude,
      50
    );
    printInfo(`Found ${nearbyShelters.length} shelter(s) within 50 miles`);

    return { success: true, shelterCount: stateShelters.length };

  } catch (error) {
    printError(`FEMA Shelters test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// TEST 4: UNIFIED DATA FETCH
// ==========================================

async function testUnifiedFetch() {
  printHeader('TEST 4: Unified Data Fetch (All APIs Combined)');
  
  printInfo(`This test calls all APIs at once using fetchAllData()`);
  printInfo(`Location: ${TEST_LOCATION.name}`);
  console.log('');

  try {
    // Create service instance
    const service = new WeatherDataService();

    // Fetch all data
    console.log('Fetching all weather data...');
    const startTime = Date.now();
    
    const data = await service.fetchAllData(
      TEST_LOCATION.latitude,
      TEST_LOCATION.longitude,
      {
        stateCode: STATE_CODE,
        shelterRadiusMiles: 50,
        reportRadiusMiles: 100,
        includeStateAlerts: true
      }
    );

    const duration = Date.now() - startTime;
    printSuccess(`All data fetched in ${duration}ms`);

    console.log('');
    console.log(COLORS.bright + '📊 UNIFIED DATA SUMMARY' + COLORS.reset);
    console.log('─'.repeat(40));
    
    // Threat Level
    const threatColors = {
      'EXTREME': COLORS.red,
      'HIGH': COLORS.red,
      'ELEVATED': COLORS.yellow,
      'MODERATE': COLORS.yellow,
      'LOW': COLORS.green,
      'NONE': COLORS.green
    };
    const threatColor = threatColors[data.threatLevel] || COLORS.reset;
    console.log(`\n${COLORS.bright}Threat Level:${COLORS.reset} ${threatColor}${data.threatLevel}${COLORS.reset}`);
    
    if (data.hasTornadoWarning) {
      console.log(COLORS.red + COLORS.bright + '⚠️  TORNADO WARNING ACTIVE!' + COLORS.reset);
    }

    // Alerts Summary
    console.log(`\n${COLORS.bright}Weather Alerts:${COLORS.reset}`);
    console.log(`  Total Active: ${data.alerts.count}`);
    console.log(`  Tornado Alerts: ${data.alerts.tornado.length}`);
    console.log(`  Severe Thunderstorm: ${data.alerts.severeThunderstorm.length}`);
    console.log(`  State-wide (${STATE_CODE}): ${data.alerts.state.length}`);

    // Storm Reports Summary
    console.log(`\n${COLORS.bright}Today's Storm Reports (within 100mi):${COLORS.reset}`);
    console.log(`  Tornado: ${data.stormReports.tornadoCount}`);
    console.log(`  Wind: ${data.stormReports.windCount}`);
    console.log(`  Hail: ${data.stormReports.hailCount}`);
    console.log(`  Total: ${data.stormReports.totalCount}`);

    // Shelters Summary
    console.log(`\n${COLORS.bright}Open Shelters:${COLORS.reset}`);
    console.log(`  Nearby (50mi): ${data.shelters.nearbyCount}`);
    console.log(`  State-wide: ${data.shelters.stateCount}`);

    // Quick Access Summary
    console.log(`\n${COLORS.bright}Quick Access:${COLORS.reset}`);
    if (data.summary.closestShelter) {
      console.log(`  Closest Shelter: ${data.summary.closestShelter.name} (${data.summary.closestShelter.distanceMiles} mi)`);
    } else {
      console.log(`  Closest Shelter: None found nearby`);
    }
    if (data.summary.mostUrgentAlert) {
      console.log(`  Most Urgent Alert: ${data.summary.mostUrgentAlert.event}`);
    } else {
      console.log(`  Most Urgent Alert: None`);
    }

    // Metadata
    console.log(`\n${COLORS.bright}Metadata:${COLORS.reset}`);
    console.log(`  Fetched At: ${data.fetchedAt.toLocaleString()}`);
    console.log(`  Duration: ${data.fetchDurationMs}ms`);

    return { success: true, data };

  } catch (error) {
    printError(`Unified fetch test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllTests() {
  console.log('\n');
  console.log(COLORS.magenta + '╔════════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.magenta + '║' + COLORS.reset + COLORS.bright + '       TORNADO SHELTER APP - WEATHER API TEST SUITE          ' + COLORS.reset + COLORS.magenta + '║' + COLORS.reset);
  console.log(COLORS.magenta + '╚════════════════════════════════════════════════════════════╝' + COLORS.reset);
  
  console.log('\n' + COLORS.cyan + 'Test Location: ' + COLORS.reset + TEST_LOCATION.name);
  console.log(COLORS.cyan + 'Coordinates: ' + COLORS.reset + `${TEST_LOCATION.latitude}, ${TEST_LOCATION.longitude}`);
  console.log(COLORS.cyan + 'State Code: ' + COLORS.reset + STATE_CODE);
  console.log(COLORS.cyan + 'Time: ' + COLORS.reset + new Date().toLocaleString());

  const results = {
    nws: null,
    spc: null,
    fema: null,
    unified: null
  };

  // Run tests with delays to avoid rate limiting
  results.nws = await testNWSAlerts();
  await delay(1000);

  results.spc = await testSPCReports();
  await delay(1000);

  results.fema = await testFEMAShelters();
  await delay(1000);

  results.unified = await testUnifiedFetch();

  // Final Summary
  printHeader('TEST RESULTS SUMMARY');

  console.log('API Test Results:');
  console.log(`  1. NWS Alerts:     ${results.nws.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  2. SPC Reports:    ${results.spc.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  3. FEMA Shelters:  ${results.fema.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);
  console.log(`  4. Unified Fetch:  ${results.unified.success ? COLORS.green + 'PASSED ✓' : COLORS.red + 'FAILED ✗'}${COLORS.reset}`);

  const allPassed = results.nws.success && results.spc.success && 
                    results.fema.success && results.unified.success;

  console.log('');
  if (allPassed) {
    console.log(COLORS.green + COLORS.bright + '🎉 ALL TESTS PASSED!' + COLORS.reset);
    console.log(COLORS.green + 'The weather APIs are working correctly.' + COLORS.reset);
    console.log(COLORS.green + 'You can now integrate weatherDataService.js into your React Native app.' + COLORS.reset);
  } else {
    console.log(COLORS.yellow + '⚠️  Some tests failed.' + COLORS.reset);
    console.log(COLORS.yellow + 'Check the error messages above for details.' + COLORS.reset);
    console.log(COLORS.yellow + 'Common issues: network connectivity, API rate limits.' + COLORS.reset);
  }

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
