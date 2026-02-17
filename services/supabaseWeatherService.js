/**
 * Supabase Weather Data Service for Tornado Shelter App
 * 
 * This service integrates Supabase database with external weather APIs.
 * 
 * Architecture:
 * - Shelter data: Stored in Supabase database
 * - Weather alerts: Fetched from NWS API, logged to Supabase history
 * - Storm reports: Fetched from SPC, logged to Supabase history
 * - FEMA shelters: Proxied from FEMA API (real-time, not stored)
 * 
 * SECURITY NOTES:
 * - No API keys stored in this file (use environment variables)
 * - No PII collected or stored
 * - Supabase anon key is safe for client-side use (RLS protects data)
 * - External API calls use only public endpoints
 * 
 * Setup:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set environment variables (see CONFIG section)
 * 3. Run the SQL schema in your Supabase project
 */

import { createClient } from '@supabase/supabase-js';

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * IMPORTANT: Replace these with your actual Supabase credentials
 * 
 * In production, use environment variables:
 * - EXPO_PUBLIC_SUPABASE_URL (for Expo)
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY (for Expo)
 * 
 * The anon key is safe for client-side use because:
 * - Row Level Security (RLS) controls data access
 * - It only allows operations permitted by RLS policies
 */
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_PROJECT_URL', // e.g., 'https://xxxxx.supabase.co'
  anonKey: 'YOUR_SUPABASE_ANON_KEY' // Public anon key (safe for client)
};

// External API configuration (no keys required - all public APIs)
const API_CONFIG = {
  NWS_BASE_URL: 'https://api.weather.gov',
  SPC_REPORTS_URL: 'https://www.spc.noaa.gov/climo/reports',
  FEMA_SHELTERS_URL: 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query',
  
  // User agent for NWS API (required)
  APP_USER_AGENT: 'TornadoShelterApp/1.0 (contact@yourapp.com)',
  
  // Request timeout
  TIMEOUT_MS: 15000
};

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================

let supabaseClient = null;

/**
 * Initialize or get the Supabase client
 * Call this once at app startup
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_PROJECT_URL') {
      console.warn('Supabase not configured. Please set SUPABASE_CONFIG values.');
      return null;
    }
    
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          persistSession: false // No user auth in this template
        }
      }
    );
  }
  return supabaseClient;
}

// ==========================================
// FETCH WITH TIMEOUT HELPER
// ==========================================

async function fetchWithTimeout(url, options = {}, timeoutMs = API_CONFIG.TIMEOUT_MS) {
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
// SHELTER SERVICE (Supabase Database)
// ==========================================

const ShelterService = {
  /**
   * Get all active shelters from database
   */
  async getAllShelters() {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('shelters')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching shelters:', error.message);
      return { data: [], error: error.message };
    }

    return { data, error: null };
  },

  /**
   * Get shelters near a location using database function
   */
  async getNearbyShelters(latitude, longitude, radiusMiles = 50) {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .rpc('get_nearby_shelters', {
        user_lat: latitude,
        user_lon: longitude,
        radius_miles: radiusMiles
      });

    if (error) {
      console.error('Error fetching nearby shelters:', error.message);
      return { data: [], error: error.message };
    }

    return { data, error: null };
  },

  /**
   * Get shelters by city
   */
  async getSheltersByCity(city) {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('shelters')
      .select('*')
      .eq('is_active', true)
      .ilike('city', `%${city}%`)
      .order('name');

    if (error) {
      console.error('Error fetching shelters by city:', error.message);
      return { data: [], error: error.message };
    }

    return { data, error: null };
  },

  /**
   * Get a single shelter by ID
   */
  async getShelterById(shelterId) {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('shelters')
      .select('*')
      .eq('id', shelterId)
      .single();

    if (error) {
      console.error('Error fetching shelter:', error.message);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }
};

// ==========================================
// NWS ALERTS SERVICE (API + Logging)
// ==========================================

const NWSAlertsService = {
  /**
   * Fetch active alerts from NWS API and optionally log to database
   */
  async getActiveAlerts(latitude, longitude, logToDatabase = true) {
    const url = `${API_CONFIG.NWS_BASE_URL}/alerts/active?point=${latitude},${longitude}`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': API_CONFIG.APP_USER_AGENT,
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
          nws_alert_id: props.id,
          event_type: props.event,
          headline: props.headline,
          description: props.description,
          instruction: props.instruction,
          severity: props.severity,
          certainty: props.certainty,
          urgency: props.urgency,
          onset_time: props.onset,
          expires_time: props.expires,
          sender_name: props.senderName,
          area_description: props.areaDesc,
          affected_zones: props.affectedZones || [],
          is_tornado_related: props.event?.toLowerCase().includes('tornado'),
          is_severe_thunderstorm: props.event?.toLowerCase().includes('severe thunderstorm'),
          raw_data: props
        };
      });

      // Log new alerts to database (for historical tracking)
      if (logToDatabase && alerts.length > 0) {
        await this.logAlertsToDatabase(alerts);
      }

      return { data: alerts, error: null };

    } catch (error) {
      console.error('NWS Alerts fetch error:', error.message);
      return { data: [], error: error.message };
    }
  },

  /**
   * Log alerts to Supabase for historical tracking
   * Uses upsert to avoid duplicates
   */
  async logAlertsToDatabase(alerts) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Filter to only log significant alerts (tornado, severe thunderstorm, etc.)
      const significantAlerts = alerts.filter(alert => 
        alert.is_tornado_related || 
        alert.is_severe_thunderstorm ||
        alert.severity === 'Extreme' ||
        alert.severity === 'Severe'
      );

      if (significantAlerts.length === 0) return;

      const { error } = await supabase
        .from('weather_alerts_history')
        .upsert(
          significantAlerts.map(alert => ({
            nws_alert_id: alert.nws_alert_id,
            event_type: alert.event_type,
            headline: alert.headline,
            description: alert.description?.substring(0, 5000), // Limit size
            instruction: alert.instruction?.substring(0, 2000),
            severity: alert.severity,
            certainty: alert.certainty,
            urgency: alert.urgency,
            area_description: alert.area_description,
            affected_zones: alert.affected_zones,
            onset_time: alert.onset_time,
            expires_time: alert.expires_time,
            sender_name: alert.sender_name,
            is_tornado_related: alert.is_tornado_related,
            is_severe_thunderstorm: alert.is_severe_thunderstorm,
            raw_data: alert.raw_data
          })),
          { 
            onConflict: 'nws_alert_id,onset_time',
            ignoreDuplicates: true 
          }
        );

      if (error) {
        console.warn('Failed to log alerts to database:', error.message);
      }
    } catch (err) {
      console.warn('Alert logging error:', err.message);
    }
  },

  /**
   * Get tornado alerts only
   */
  async getTornadoAlerts(latitude, longitude) {
    const { data, error } = await this.getActiveAlerts(latitude, longitude);
    
    if (error) return { data: [], error };
    
    const tornadoAlerts = data.filter(alert => alert.is_tornado_related);
    return { data: tornadoAlerts, error: null };
  },

  /**
   * Get historical alerts from database
   */
  async getAlertHistory(hoursBack = 24) {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .rpc('get_recent_tornado_alerts', { hours_back: hoursBack });

    if (error) {
      console.error('Error fetching alert history:', error.message);
      return { data: [], error: error.message };
    }

    return { data, error: null };
  }
};

// ==========================================
// SPC STORM REPORTS SERVICE (API + Logging)
// ==========================================

const SPCReportsService = {
  /**
   * Fetch today's storm reports from SPC
   */
  async getTodaysReports(reportType = 'tornado', logToDatabase = true) {
    const validTypes = ['tornado', 'wind', 'hail'];
    if (!validTypes.includes(reportType)) {
      return { data: [], error: `Invalid report type. Use: ${validTypes.join(', ')}` };
    }

    const typeMap = {
      tornado: 'today_torn.csv',
      wind: 'today_wind.csv',
      hail: 'today_hail.csv'
    };

    const url = `${API_CONFIG.SPC_REPORTS_URL}/${typeMap[reportType]}`;

    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`SPC Reports error: ${response.status}`);
      }

      const csvText = await response.text();
      const reports = this.parseStormReportsCSV(csvText, reportType);

      // Log reports to database
      if (logToDatabase && reports.length > 0) {
        await this.logReportsToDatabase(reports);
      }

      return { data: reports, error: null };

    } catch (error) {
      console.error('SPC Reports fetch error:', error.message);
      return { data: [], error: error.message };
    }
  },

  /**
   * Parse SPC CSV format
   */
  parseStormReportsCSV(csvText, reportType) {
    const lines = csvText.trim().split('\n');
    const dataLines = lines[0].includes('Time') ? lines.slice(1) : lines;
    
    const today = new Date().toISOString().split('T')[0];
    
    return dataLines.map(line => {
      const parts = line.split(',');
      
      const report = {
        report_type: reportType,
        report_time: parts[0]?.trim(),
        report_date: today,
        location_name: parts[2]?.trim(),
        county: parts[3]?.trim(),
        state: parts[4]?.trim(),
        latitude: parseFloat(parts[5]) || null,
        longitude: parseFloat(parts[6]) || null,
        comments: parts[7]?.trim() || ''
      };

      if (reportType === 'tornado') {
        report.f_scale = parts[1]?.trim() || 'UNK';
      } else if (reportType === 'wind') {
        report.wind_speed_knots = parseInt(parts[1]) || null;
      } else if (reportType === 'hail') {
        report.hail_size_inches = parseFloat(parts[1]) || null;
      }

      return report;
    }).filter(report => report.latitude && report.longitude);
  },

  /**
   * Log reports to Supabase database
   */
  async logReportsToDatabase(reports) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('storm_reports_history')
        .insert(reports);

      if (error && !error.message.includes('duplicate')) {
        console.warn('Failed to log storm reports:', error.message);
      }
    } catch (err) {
      console.warn('Storm report logging error:', err.message);
    }
  },

  /**
   * Get all today's reports
   */
  async getAllTodaysReports() {
    const [tornado, wind, hail] = await Promise.all([
      this.getTodaysReports('tornado').catch(() => ({ data: [] })),
      this.getTodaysReports('wind').catch(() => ({ data: [] })),
      this.getTodaysReports('hail').catch(() => ({ data: [] }))
    ]);

    return {
      tornado: tornado.data || [],
      wind: wind.data || [],
      hail: hail.data || []
    };
  },

  /**
   * Get historical reports from database
   */
  async getReportHistory(startDate, endDate = null, reportTypeFilter = null) {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .rpc('get_storm_reports', {
        start_date: startDate,
        end_date: endDate || new Date().toISOString().split('T')[0],
        report_type_filter: reportTypeFilter
      });

    if (error) {
      console.error('Error fetching report history:', error.message);
      return { data: [], error: error.message };
    }

    return { data, error: null };
  }
};

// ==========================================
// FEMA SHELTERS SERVICE (API Proxy Only)
// ==========================================

const FEMASheltersService = {
  /**
   * Fetch open emergency shelters from FEMA
   * This data is NOT stored - proxied directly from FEMA
   */
  async getOpenShelters(stateCode = 'OK') {
    const params = new URLSearchParams({
      where: `SHELTER_STATE='${stateCode}'`,
      outFields: '*',
      f: 'json',
      returnGeometry: 'true'
    });

    const url = `${API_CONFIG.FEMA_SHELTERS_URL}?${params}`;

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
          latitude: geom?.y || null,
          longitude: geom?.x || null,
          total_capacity: attrs.TOTAL_POPULATION || null,
          current_population: attrs.EVACUEES_CURRENT || null,
          available_capacity: attrs.TOTAL_POPULATION && attrs.EVACUEES_CURRENT 
            ? attrs.TOTAL_POPULATION - attrs.EVACUEES_CURRENT 
            : null,
          status: attrs.SHELTER_STATUS,
          is_open: attrs.SHELTER_STATUS === 'OPEN',
          accepts_pets: attrs.ACCEPTING_PETS === 'Y',
          ada_accessible: attrs.ADA_COMPLIANT === 'Y',
          organization: attrs.ORG_NAME,
          last_updated: attrs.LAST_UPDATED 
            ? new Date(attrs.LAST_UPDATED) 
            : null
        };
      });

      return { data: shelters, error: null };

    } catch (error) {
      console.error('FEMA Shelters fetch error:', error.message);
      return { data: [], error: error.message };
    }
  },

  /**
   * Get nearby FEMA shelters
   */
  async getNearbyShelters(latitude, longitude, radiusMiles = 50) {
    const radiusMeters = radiusMiles * 1609.34;
    
    const params = new URLSearchParams({
      where: "SHELTER_STATUS='OPEN'",
      geometry: `${longitude},${latitude}`,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      distance: radiusMeters,
      units: 'esriSRUnit_Meter',
      outFields: '*',
      f: 'json',
      returnGeometry: 'true'
    });

    const url = `${API_CONFIG.FEMA_SHELTERS_URL}?${params}`;

    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`FEMA API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        data: (data.features || []).map(feature => ({
          id: feature.attributes.OBJECTID,
          name: feature.attributes.SHELTER_NAME,
          address: feature.attributes.ADDRESS,
          city: feature.attributes.CITY,
          state: feature.attributes.SHELTER_STATE,
          latitude: feature.geometry?.y,
          longitude: feature.geometry?.x,
          total_capacity: feature.attributes.TOTAL_POPULATION,
          is_open: true,
          accepts_pets: feature.attributes.ACCEPTING_PETS === 'Y'
        })),
        error: null
      };

    } catch (error) {
      console.error('FEMA Nearby Shelters fetch error:', error.message);
      return { data: [], error: error.message };
    }
  }
};

// ==========================================
// UNIFIED WEATHER DATA SERVICE
// ==========================================

const WeatherDataService = {
  /**
   * Fetch all weather data for a location
   */
  async fetchAllData(latitude, longitude, options = {}) {
    const {
      stateCode = 'OK',
      shelterRadiusMiles = 50,
      logToDatabase = true
    } = options;

    const startTime = Date.now();

    // Fetch all data in parallel
    const [
      alertsResult,
      stormReports,
      dbShelters,
      femaShelters
    ] = await Promise.all([
      NWSAlertsService.getActiveAlerts(latitude, longitude, logToDatabase),
      SPCReportsService.getAllTodaysReports(),
      ShelterService.getNearbyShelters(latitude, longitude, shelterRadiusMiles),
      FEMASheltersService.getOpenShelters(stateCode)
    ]);

    const alerts = alertsResult.data || [];
    const tornadoAlerts = alerts.filter(a => a.is_tornado_related);

    // Determine threat level
    const threatLevel = this.calculateThreatLevel(alerts, stormReports);

    return {
      // Metadata
      location: { latitude, longitude },
      fetchedAt: new Date(),
      fetchDurationMs: Date.now() - startTime,
      
      // Threat Assessment
      threatLevel,
      hasTornadoWarning: tornadoAlerts.length > 0,
      
      // Alerts
      alerts: {
        all: alerts,
        tornado: tornadoAlerts,
        count: alerts.length
      },
      
      // Storm Reports
      stormReports: {
        tornado: stormReports.tornado,
        wind: stormReports.wind,
        hail: stormReports.hail,
        tornadoCount: stormReports.tornado.length
      },
      
      // Shelters (combined from database + FEMA)
      shelters: {
        database: dbShelters.data || [],
        femaOpen: femaShelters.data || [],
        databaseCount: (dbShelters.data || []).length,
        femaCount: (femaShelters.data || []).length
      },
      
      // Summary
      summary: {
        activeAlerts: alerts.length,
        tornadoWarnings: tornadoAlerts.length,
        tornadoReportsToday: stormReports.tornado.length,
        sheltersInDatabase: (dbShelters.data || []).length,
        femaOpenShelters: (femaShelters.data || []).length
      }
    };
  },

  /**
   * Calculate threat level
   */
  calculateThreatLevel(alerts, reports) {
    const hasTornadoWarning = alerts.some(a => 
      a.event_type?.toLowerCase().includes('tornado warning')
    );
    if (hasTornadoWarning) return 'EXTREME';

    const hasTornadoWatch = alerts.some(a => 
      a.event_type?.toLowerCase().includes('tornado watch')
    );
    const hasNearbyTornado = reports.tornado && reports.tornado.length > 0;
    
    if (hasTornadoWatch && hasNearbyTornado) return 'HIGH';
    if (hasTornadoWatch || hasNearbyTornado) return 'ELEVATED';

    const hasSevereWarning = alerts.some(a => 
      a.event_type?.toLowerCase().includes('severe thunderstorm warning')
    );
    if (hasSevereWarning) return 'ELEVATED';

    if (alerts.length > 0) return 'MODERATE';

    return 'NONE';
  },

  /**
   * Quick tornado danger check
   */
  async checkTornadoDanger(latitude, longitude) {
    const { data, error } = await NWSAlertsService.getTornadoAlerts(latitude, longitude);
    
    return {
      hasDanger: data.length > 0,
      alerts: data,
      error
    };
  }
};

// ==========================================
// APP CONFIGURATION SERVICE
// ==========================================

const AppConfigService = {
  /**
   * Get a configuration value
   */
  async getConfig(key) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.warn(`Config not found: ${key}`);
      return null;
    }

    return data?.value;
  },

  /**
   * Get all configuration
   */
  async getAllConfig() {
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    const { data, error } = await supabase
      .from('app_config')
      .select('*');

    if (error) {
      console.error('Error fetching config:', error.message);
      return {};
    }

    return data.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }
};

// ==========================================
// EXPORTS
// ==========================================

export {
  // Client
  getSupabaseClient,
  
  // Services
  ShelterService,
  NWSAlertsService,
  SPCReportsService,
  FEMASheltersService,
  WeatherDataService,
  AppConfigService,
  
  // Configuration
  SUPABASE_CONFIG,
  API_CONFIG
};

export default WeatherDataService;
