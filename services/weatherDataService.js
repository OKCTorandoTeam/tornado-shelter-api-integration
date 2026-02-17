/**
 * Unified Weather Data Service for Tornado Shelter App
 * Direct API Calls Version (No Backend Required)
 * 
 * This service fetches data from:
 * - National Weather Service (NWS) Alerts API
 * - Storm Prediction Center (SPC) Storm Reports
 * - FEMA National Shelter System (Open Shelters)
 * 
 * Usage in React Native:
 *   import { WeatherDataService } from './services/weatherDataService';
 *   
 *   const service = new WeatherDataService();
 *   const allData = await service.fetchAllData(35.4676, -97.5164);
 * 
 * Note: NWS and FEMA APIs are FREE and do not require API keys.
 * Only a User-Agent header is required for NWS.
 */

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  // App identification for NWS API (required)
  // Replace with your app name and contact email
  APP_USER_AGENT: 'TornadoShelterApp/1.0 (contact@youremail.com)',
  
  // API Base URLs
  NWS_BASE_URL: 'https://api.weather.gov',
  FEMA_SHELTERS_URL: 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query',
  SPC_REPORTS_URL: 'https://www.spc.noaa.gov/climo/reports',
  
  // Cache duration in milliseconds
  CACHE_DURATION: {
    ALERTS: 2 * 60 * 1000,      // 2 minutes for alerts (critical data)
    SHELTERS: 5 * 60 * 1000,    // 5 minutes for shelter status
    STORM_REPORTS: 10 * 60 * 1000  // 10 minutes for storm reports
  },
  
  // Request timeout
  TIMEOUT_MS: 15000
};

// ==========================================
// SIMPLE CACHE IMPLEMENTATION
// ==========================================

class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key, data, durationMs) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + durationMs
    });
  }

  clear() {
    this.cache.clear();
  }
}

// ==========================================
// FETCH WITH TIMEOUT HELPER
// ==========================================

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
// NWS ALERTS SERVICE
// ==========================================

class NWSAlertsService {
  constructor(cache) {
    this.cache = cache;
  }

  /**
   * Fetches active weather alerts for a location
   * FREE API - No key required, just User-Agent header
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Array>} Array of active alerts
   */
  async getActiveAlerts(lat, lon) {
    const cacheKey = `nws_alerts_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const url = `${CONFIG.NWS_BASE_URL}/alerts/active?point=${lat},${lon}`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': CONFIG.APP_USER_AGENT,
          'Accept': 'application/geo+json'
        }
      });

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`);
      }

      const data = await response.json();
      
      const alerts = (data.features || []).map(feature => {
        const props = feature.properties;
        return {
          id: props.id,
          event: props.event,
          headline: props.headline,
          description: props.description,
          instruction: props.instruction,
          severity: props.severity,
          certainty: props.certainty,
          urgency: props.urgency,
          onset: props.onset ? new Date(props.onset) : null,
          expires: props.expires ? new Date(props.expires) : null,
          senderName: props.senderName,
          areaDesc: props.areaDesc,
          // Tornado-specific flags
          isTornadoWarning: props.event?.toLowerCase().includes('tornado'),
          isSevereThunderstorm: props.event?.toLowerCase().includes('severe thunderstorm'),
          // Raw data for debugging
          _raw: props
        };
      });

      // Sort by severity (Extreme > Severe > Moderate > Minor)
      const severityOrder = { 'Extreme': 0, 'Severe': 1, 'Moderate': 2, 'Minor': 3, 'Unknown': 4 };
      alerts.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));

      this.cache.set(cacheKey, alerts, CONFIG.CACHE_DURATION.ALERTS);
      return alerts;

    } catch (error) {
      console.error('NWS Alerts fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Fetches alerts for an entire state
   * Useful for overview screens
   * 
   * @param {string} stateCode - Two-letter state code (e.g., 'OK')
   * @returns {Promise<Array>} Array of active alerts
   */
  async getStateAlerts(stateCode) {
    const cacheKey = `nws_state_alerts_${stateCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const url = `${CONFIG.NWS_BASE_URL}/alerts/active?area=${stateCode}`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': CONFIG.APP_USER_AGENT,
          'Accept': 'application/geo+json'
        }
      });

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`);
      }

      const data = await response.json();
      
      const alerts = (data.features || []).map(feature => ({
        id: feature.properties.id,
        event: feature.properties.event,
        headline: feature.properties.headline,
        severity: feature.properties.severity,
        areaDesc: feature.properties.areaDesc,
        onset: feature.properties.onset,
        expires: feature.properties.expires,
        isTornadoWarning: feature.properties.event?.toLowerCase().includes('tornado')
      }));

      this.cache.set(cacheKey, alerts, CONFIG.CACHE_DURATION.ALERTS);
      return alerts;

    } catch (error) {
      console.error('NWS State Alerts fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Gets tornado-specific alerts only
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Array>} Tornado warnings and watches
   */
  async getTornadoAlerts(lat, lon) {
    const allAlerts = await this.getActiveAlerts(lat, lon);
    return allAlerts.filter(alert => 
      alert.isTornadoWarning || 
      alert.event?.toLowerCase().includes('tornado')
    );
  }
}

// ==========================================
// SPC STORM REPORTS SERVICE
// ==========================================

class SPCStormReportsService {
  constructor(cache) {
    this.cache = cache;
  }

  /**
   * Fetches today's storm reports from SPC
   * Parses CSV data from the SPC website
   * 
   * FREE - No API key required
   * 
   * @param {string} reportType - 'tornado', 'wind', or 'hail'
   * @returns {Promise<Array>} Array of storm reports
   */
  async getTodaysReports(reportType = 'tornado') {
    const validTypes = ['tornado', 'wind', 'hail'];
    if (!validTypes.includes(reportType)) {
      throw new Error(`Invalid report type. Use: ${validTypes.join(', ')}`);
    }

    const cacheKey = `spc_today_${reportType}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // SPC provides CSV files for today's reports
    const typeMap = {
      tornado: 'today_torn.csv',
      wind: 'today_wind.csv',
      hail: 'today_hail.csv'
    };

    const url = `${CONFIG.SPC_REPORTS_URL}/${typeMap[reportType]}`;

    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`SPC Reports error: ${response.status}`);
      }

      const csvText = await response.text();
      const reports = this.parseStormReportsCSV(csvText, reportType);

      this.cache.set(cacheKey, reports, CONFIG.CACHE_DURATION.STORM_REPORTS);
      return reports;

    } catch (error) {
      console.error('SPC Reports fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Parses SPC CSV format into structured objects
   */
  parseStormReportsCSV(csvText, reportType) {
    const lines = csvText.trim().split('\n');
    
    // Skip header row if present
    const dataLines = lines[0].includes('Time') ? lines.slice(1) : lines;
    
    return dataLines.map(line => {
      const parts = line.split(',');
      
      // SPC CSV format varies by report type
      // Common format: Time,Speed/Size,Location,County,State,Lat,Lon,Comments
      
      const report = {
        time: parts[0]?.trim(),
        location: parts[2]?.trim(),
        county: parts[3]?.trim(),
        state: parts[4]?.trim(),
        latitude: parseFloat(parts[5]) || null,
        longitude: parseFloat(parts[6]) || null,
        comments: parts[7]?.trim() || '',
        reportType
      };

      // Type-specific fields
      if (reportType === 'tornado') {
        report.fScale = parts[1]?.trim() || 'UNK';
      } else if (reportType === 'wind') {
        report.speed = parseInt(parts[1]) || null; // in knots
        report.speedMph = report.speed ? Math.round(report.speed * 1.151) : null;
      } else if (reportType === 'hail') {
        report.size = parseFloat(parts[1]) || null; // in inches
      }

      return report;
    }).filter(report => report.latitude && report.longitude);
  }

  /**
   * Gets all today's severe weather reports
   * 
   * @returns {Promise<Object>} Object with tornado, wind, and hail arrays
   */
  async getAllTodaysReports() {
    const [tornado, wind, hail] = await Promise.all([
      this.getTodaysReports('tornado').catch(() => []),
      this.getTodaysReports('wind').catch(() => []),
      this.getTodaysReports('hail').catch(() => [])
    ]);

    return { tornado, wind, hail };
  }

  /**
   * Gets reports near a specific location
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radiusMiles - Search radius in miles
   * @returns {Promise<Object>} Nearby storm reports
   */
  async getNearbyReports(lat, lon, radiusMiles = 50) {
    const allReports = await this.getAllTodaysReports();
    
    const filterByDistance = (reports) => {
      return reports.filter(report => {
        if (!report.latitude || !report.longitude) return false;
        const distance = this.calculateDistanceMiles(
          lat, lon, 
          report.latitude, report.longitude
        );
        report.distanceMiles = Math.round(distance * 10) / 10;
        return distance <= radiusMiles;
      }).sort((a, b) => a.distanceMiles - b.distanceMiles);
    };

    return {
      tornado: filterByDistance(allReports.tornado),
      wind: filterByDistance(allReports.wind),
      hail: filterByDistance(allReports.hail)
    };
  }

  /**
   * Haversine formula for distance calculation
   */
  calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// ==========================================
// FEMA OPEN SHELTERS SERVICE
// ==========================================

class FEMASheltersService {
  constructor(cache) {
    this.cache = cache;
  }

  /**
   * Fetches open emergency shelters from FEMA National Shelter System
   * Data syncs with Red Cross every 20 minutes
   * 
   * FREE - No API key required
   * 
   * @param {string} stateCode - Two-letter state code (e.g., 'OK')
   * @returns {Promise<Array>} Array of open shelters
   */
  async getOpenShelters(stateCode = 'OK') {
    const cacheKey = `fema_shelters_${stateCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // ArcGIS REST API query
    const params = new URLSearchParams({
      where: `SHELTER_STATE='${stateCode}'`,
      outFields: '*',
      f: 'json',
      returnGeometry: 'true'
    });

    const url = `${CONFIG.FEMA_SHELTERS_URL}?${params}`;

    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`FEMA API error: ${response.status}`);
      }

      const data = await response.json();
      
      const shelters = (data.features || []).map(feature => {
        const attrs = feature.attributes;
        const geom = feature.geometry;
        
        return {
          id: attrs.OBJECTID,
          name: attrs.SHELTER_NAME,
          address: attrs.ADDRESS,
          city: attrs.CITY,
          state: attrs.SHELTER_STATE,
          zip: attrs.ZIP,
          county: attrs.COUNTY,
          
          // Coordinates
          latitude: geom?.y || null,
          longitude: geom?.x || null,
          
          // Capacity info
          totalCapacity: attrs.TOTAL_POPULATION || null,
          currentPopulation: attrs.EVACUEES_CURRENT || null,
          availableCapacity: attrs.TOTAL_POPULATION && attrs.EVACUEES_CURRENT 
            ? attrs.TOTAL_POPULATION - attrs.EVACUEES_CURRENT 
            : null,
          
          // Status
          status: attrs.SHELTER_STATUS,
          isOpen: attrs.SHELTER_STATUS === 'OPEN',
          
          // Services
          acceptsPets: attrs.ACCEPTING_PETS === 'Y',
          adaAccessible: attrs.ADA_COMPLIANT === 'Y',
          
          // Organization
          organization: attrs.ORG_NAME,
          
          // Timestamps
          lastUpdated: attrs.LAST_UPDATED 
            ? new Date(attrs.LAST_UPDATED) 
            : null,
          
          // Raw attributes for debugging
          _raw: attrs
        };
      });

      // Sort by available capacity (most space first)
      shelters.sort((a, b) => (b.availableCapacity || 0) - (a.availableCapacity || 0));

      this.cache.set(cacheKey, shelters, CONFIG.CACHE_DURATION.SHELTERS);
      return shelters;

    } catch (error) {
      console.error('FEMA Shelters fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Fetches all open shelters nationwide
   * Use sparingly - large response
   * 
   * @returns {Promise<Array>} All open shelters
   */
  async getAllOpenShelters() {
    const cacheKey = 'fema_shelters_all';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      where: "SHELTER_STATUS='OPEN'",
      outFields: '*',
      f: 'json',
      returnGeometry: 'true'
    });

    const url = `${CONFIG.FEMA_SHELTERS_URL}?${params}`;

    try {
      const response = await fetchWithTimeout(url, {}, 30000); // Longer timeout for large request

      if (!response.ok) {
        throw new Error(`FEMA API error: ${response.status}`);
      }

      const data = await response.json();
      
      const shelters = (data.features || []).map(feature => ({
        id: feature.attributes.OBJECTID,
        name: feature.attributes.SHELTER_NAME,
        address: feature.attributes.ADDRESS,
        city: feature.attributes.CITY,
        state: feature.attributes.SHELTER_STATE,
        latitude: feature.geometry?.y,
        longitude: feature.geometry?.x,
        totalCapacity: feature.attributes.TOTAL_POPULATION,
        currentPopulation: feature.attributes.EVACUEES_CURRENT,
        isOpen: feature.attributes.SHELTER_STATUS === 'OPEN',
        acceptsPets: feature.attributes.ACCEPTING_PETS === 'Y'
      }));

      this.cache.set(cacheKey, shelters, CONFIG.CACHE_DURATION.SHELTERS);
      return shelters;

    } catch (error) {
      console.error('FEMA All Shelters fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Fetches shelters near a specific location
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radiusMiles - Search radius in miles
   * @returns {Promise<Array>} Nearby open shelters
   */
  async getNearbyShelters(lat, lon, radiusMiles = 50) {
    // Convert miles to meters for ArcGIS geometry query
    const radiusMeters = radiusMiles * 1609.34;
    
    const params = new URLSearchParams({
      where: "SHELTER_STATUS='OPEN'",
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      distance: radiusMeters,
      units: 'esriSRUnit_Meter',
      outFields: '*',
      f: 'json',
      returnGeometry: 'true'
    });

    const url = `${CONFIG.FEMA_SHELTERS_URL}?${params}`;

    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`FEMA API error: ${response.status}`);
      }

      const data = await response.json();
      
      return (data.features || []).map(feature => {
        const attrs = feature.attributes;
        const geom = feature.geometry;
        
        // Calculate actual distance
        const distance = this.calculateDistanceMiles(
          lat, lon, 
          geom?.y || 0, geom?.x || 0
        );
        
        return {
          id: attrs.OBJECTID,
          name: attrs.SHELTER_NAME,
          address: attrs.ADDRESS,
          city: attrs.CITY,
          state: attrs.SHELTER_STATE,
          latitude: geom?.y,
          longitude: geom?.x,
          distanceMiles: Math.round(distance * 10) / 10,
          totalCapacity: attrs.TOTAL_POPULATION,
          currentPopulation: attrs.EVACUEES_CURRENT,
          availableCapacity: attrs.TOTAL_POPULATION && attrs.EVACUEES_CURRENT 
            ? attrs.TOTAL_POPULATION - attrs.EVACUEES_CURRENT 
            : null,
          isOpen: true,
          acceptsPets: attrs.ACCEPTING_PETS === 'Y',
          adaAccessible: attrs.ADA_COMPLIANT === 'Y'
        };
      }).sort((a, b) => a.distanceMiles - b.distanceMiles);

    } catch (error) {
      console.error('FEMA Nearby Shelters fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Haversine formula for distance calculation
   */
  calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// ==========================================
// UNIFIED WEATHER DATA SERVICE
// ==========================================

class WeatherDataService {
  constructor() {
    this.cache = new SimpleCache();
    this.nws = new NWSAlertsService(this.cache);
    this.spc = new SPCStormReportsService(this.cache);
    this.fema = new FEMASheltersService(this.cache);
  }

  /**
   * Fetches all weather data for a location in one call
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {Object} options - Optional settings
   * @returns {Promise<Object>} Combined weather data
   * 
   * Example:
   *   const data = await service.fetchAllData(35.4676, -97.5164);
   *   console.log(data.alerts);      // NWS alerts
   *   console.log(data.stormReports); // Today's storm reports
   *   console.log(data.shelters);    // Open shelters
   */
  async fetchAllData(lat, lon, options = {}) {
    const {
      stateCode = 'OK',
      shelterRadiusMiles = 50,
      reportRadiusMiles = 100,
      includeStateAlerts = false
    } = options;

    const startTime = Date.now();

    try {
      // Fetch all data in parallel for speed
      const [
        alerts,
        stateAlerts,
        nearbyReports,
        nearbyShelters,
        stateShelters
      ] = await Promise.all([
        // Location-specific alerts
        this.nws.getActiveAlerts(lat, lon).catch(err => {
          console.warn('NWS alerts failed:', err.message);
          return [];
        }),
        
        // State-wide alerts (optional)
        includeStateAlerts 
          ? this.nws.getStateAlerts(stateCode).catch(() => [])
          : Promise.resolve([]),
        
        // Today's storm reports near location
        this.spc.getNearbyReports(lat, lon, reportRadiusMiles).catch(err => {
          console.warn('SPC reports failed:', err.message);
          return { tornado: [], wind: [], hail: [] };
        }),
        
        // Open shelters near location
        this.fema.getNearbyShelters(lat, lon, shelterRadiusMiles).catch(err => {
          console.warn('FEMA nearby shelters failed:', err.message);
          return [];
        }),
        
        // All open shelters in state
        this.fema.getOpenShelters(stateCode).catch(err => {
          console.warn('FEMA state shelters failed:', err.message);
          return [];
        })
      ]);

      // Extract tornado-specific alerts
      const tornadoAlerts = alerts.filter(a => a.isTornadoWarning);
      const severeThunderstormAlerts = alerts.filter(a => a.isSevereThunderstorm);

      // Determine overall threat level
      const threatLevel = this.calculateThreatLevel(alerts, nearbyReports);

      const result = {
        // Metadata
        location: { latitude: lat, longitude: lon },
        fetchedAt: new Date(),
        fetchDurationMs: Date.now() - startTime,
        
        // Threat Assessment
        threatLevel,
        hasTornadoWarning: tornadoAlerts.length > 0,
        hasSevereThunderstormWarning: severeThunderstormAlerts.length > 0,
        
        // NWS Alerts
        alerts: {
          all: alerts,
          tornado: tornadoAlerts,
          severeThunderstorm: severeThunderstormAlerts,
          state: stateAlerts,
          count: alerts.length
        },
        
        // SPC Storm Reports
        stormReports: {
          nearby: nearbyReports,
          tornadoCount: nearbyReports.tornado.length,
          windCount: nearbyReports.wind.length,
          hailCount: nearbyReports.hail.length,
          totalCount: nearbyReports.tornado.length + nearbyReports.wind.length + nearbyReports.hail.length
        },
        
        // FEMA Shelters
        shelters: {
          nearby: nearbyShelters,
          state: stateShelters,
          nearbyCount: nearbyShelters.length,
          stateCount: stateShelters.length
        },
        
        // Quick access to most critical info
        summary: {
          activeAlerts: alerts.length,
          tornadoWarnings: tornadoAlerts.length,
          nearbyTornadoReports: nearbyReports.tornado.length,
          openSheltersNearby: nearbyShelters.length,
          closestShelter: nearbyShelters[0] || null,
          mostUrgentAlert: alerts[0] || null
        }
      };

      return result;

    } catch (error) {
      console.error('WeatherDataService.fetchAllData error:', error);
      throw error;
    }
  }

  /**
   * Calculates overall threat level based on alerts and reports
   */
  calculateThreatLevel(alerts, reports) {
    // Check for tornado warnings (highest priority)
    const hasTornadoWarning = alerts.some(a => 
      a.event?.toLowerCase().includes('tornado warning')
    );
    if (hasTornadoWarning) return 'EXTREME';

    // Check for tornado watch
    const hasTornadoWatch = alerts.some(a => 
      a.event?.toLowerCase().includes('tornado watch')
    );
    
    // Check for nearby tornado reports today
    const hasNearbyTornado = reports.tornado && reports.tornado.length > 0;
    
    if (hasTornadoWatch && hasNearbyTornado) return 'HIGH';
    if (hasTornadoWatch || hasNearbyTornado) return 'ELEVATED';

    // Check for severe thunderstorm warnings
    const hasSevereWarning = alerts.some(a => 
      a.event?.toLowerCase().includes('severe thunderstorm warning')
    );
    if (hasSevereWarning) return 'ELEVATED';

    // Check for any severe weather watch
    const hasWatch = alerts.some(a => 
      a.event?.toLowerCase().includes('watch')
    );
    if (hasWatch) return 'MODERATE';

    // Check for any advisories
    if (alerts.length > 0) return 'LOW';

    return 'NONE';
  }

  /**
   * Quick check for tornado danger
   * Lightweight call for frequent polling
   */
  async checkTornadoDanger(lat, lon) {
    try {
      const alerts = await this.nws.getTornadoAlerts(lat, lon);
      return {
        hasDanger: alerts.length > 0,
        alerts,
        mostUrgent: alerts[0] || null
      };
    } catch (error) {
      console.error('Tornado danger check failed:', error);
      return { hasDanger: false, alerts: [], error: error.message };
    }
  }

  /**
   * Clears all cached data
   * Call this when user location changes significantly
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Individual service access if needed
   */
  get nwsService() { return this.nws; }
  get spcService() { return this.spc; }
  get femaService() { return this.fema; }
}

// ==========================================
// EXPORTS
// ==========================================

// ES6 Module exports
export { 
  WeatherDataService,
  NWSAlertsService,
  SPCStormReportsService,
  FEMASheltersService,
  CONFIG
};

// Default export for convenience
export default WeatherDataService;

// CommonJS export (uncomment if needed for Node.js)
/*
module.exports = {
  WeatherDataService,
  NWSAlertsService,
  SPCStormReportsService,
  FEMASheltersService,
  CONFIG
};
*/
