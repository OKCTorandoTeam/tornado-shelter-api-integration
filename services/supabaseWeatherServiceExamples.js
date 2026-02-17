/**
 * Supabase Weather Service - React Native Usage Examples
 * 
 * This file demonstrates how to use supabaseWeatherService.js
 * in your Tornado Shelter Alert App.
 */

import {
  getSupabaseClient,
  ShelterService,
  NWSAlertsService,
  SPCReportsService,
  FEMASheltersService,
  WeatherDataService,
  AppConfigService
} from './supabaseWeatherService';

// ==========================================
// SETUP - Run once at app startup
// ==========================================

function initializeApp() {
  // Verify Supabase is configured
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.error('Supabase not configured! Please update SUPABASE_CONFIG in supabaseWeatherService.js');
    return false;
  }
  
  console.log('Supabase initialized successfully');
  return true;
}

// ==========================================
// EXAMPLE 1: Fetch All Data at Once
// ==========================================

async function fetchCompleteWeatherData(latitude, longitude) {
  try {
    const data = await WeatherDataService.fetchAllData(latitude, longitude, {
      stateCode: 'OK',
      shelterRadiusMiles: 50,
      logToDatabase: true // Log alerts and reports to Supabase
    });

    console.log('=== WEATHER DATA SUMMARY ===');
    console.log(`Threat Level: ${data.threatLevel}`);
    console.log(`Active Alerts: ${data.summary.activeAlerts}`);
    console.log(`Tornado Warnings: ${data.summary.tornadoWarnings}`);
    console.log(`Shelters in DB: ${data.summary.sheltersInDatabase}`);
    console.log(`FEMA Open Shelters: ${data.summary.femaOpenShelters}`);

    return data;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    throw error;
  }
}

// ==========================================
// EXAMPLE 2: Working with Database Shelters
// ==========================================

async function shelterExamples(latitude, longitude) {
  // Get all shelters from your database
  const allShelters = await ShelterService.getAllShelters();
  console.log(`Total shelters in database: ${allShelters.data.length}`);

  // Get nearby shelters (uses database function with distance calculation)
  const nearbyShelters = await ShelterService.getNearbyShelters(latitude, longitude, 30);
  console.log(`Shelters within 30 miles: ${nearbyShelters.data.length}`);
  
  if (nearbyShelters.data.length > 0) {
    const closest = nearbyShelters.data[0];
    console.log(`Closest: ${closest.name} (${closest.distance_miles} miles)`);
  }

  // Search by city
  const tulsaShelters = await ShelterService.getSheltersByCity('Tulsa');
  console.log(`Shelters in Tulsa: ${tulsaShelters.data.length}`);

  return nearbyShelters.data;
}

// ==========================================
// EXAMPLE 3: Working with Weather Alerts
// ==========================================

async function alertExamples(latitude, longitude) {
  // Get current alerts (automatically logged to database)
  const currentAlerts = await NWSAlertsService.getActiveAlerts(latitude, longitude, true);
  console.log(`Current alerts: ${currentAlerts.data.length}`);

  // Get tornado-specific alerts only
  const tornadoAlerts = await NWSAlertsService.getTornadoAlerts(latitude, longitude);
  console.log(`Tornado alerts: ${tornadoAlerts.data.length}`);

  // Get historical alerts from database (last 24 hours)
  const recentHistory = await NWSAlertsService.getAlertHistory(24);
  console.log(`Alerts in last 24 hours: ${recentHistory.data.length}`);

  // Get historical alerts from database (last week)
  const weekHistory = await NWSAlertsService.getAlertHistory(168);
  console.log(`Alerts in last week: ${weekHistory.data.length}`);

  return currentAlerts.data;
}

// ==========================================
// EXAMPLE 4: Working with Storm Reports
// ==========================================

async function stormReportExamples() {
  // Get today's tornado reports
  const tornadoReports = await SPCReportsService.getTodaysReports('tornado');
  console.log(`Tornado reports today: ${tornadoReports.data.length}`);

  // Get all severe weather reports today
  const allReports = await SPCReportsService.getAllTodaysReports();
  console.log('Today\'s reports:', {
    tornado: allReports.tornado.length,
    wind: allReports.wind.length,
    hail: allReports.hail.length
  });

  // Get historical reports from database
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const historicalReports = await SPCReportsService.getReportHistory(
    lastWeek.toISOString().split('T')[0],
    null,
    'tornado' // Filter to tornado only
  );
  console.log(`Tornado reports this week: ${historicalReports.data.length}`);

  return allReports;
}

// ==========================================
// EXAMPLE 5: FEMA Emergency Shelters (Real-time)
// ==========================================

async function femaExamples(latitude, longitude) {
  // Get all open shelters in Oklahoma
  const okShelters = await FEMASheltersService.getOpenShelters('OK');
  console.log(`FEMA open shelters in OK: ${okShelters.data.length}`);

  // Get nearby FEMA shelters
  const nearbyShelters = await FEMASheltersService.getNearbyShelters(latitude, longitude, 50);
  console.log(`FEMA shelters within 50 miles: ${nearbyShelters.data.length}`);

  // Check capacity
  nearbyShelters.data.forEach(shelter => {
    if (shelter.total_capacity && shelter.current_population) {
      const available = shelter.total_capacity - shelter.current_population;
      console.log(`${shelter.name}: ${available} spots available`);
    }
  });

  return nearbyShelters.data;
}

// ==========================================
// EXAMPLE 6: Quick Tornado Danger Check
// ==========================================

async function quickDangerCheck(latitude, longitude) {
  const result = await WeatherDataService.checkTornadoDanger(latitude, longitude);
  
  if (result.hasDanger) {
    console.log('🚨 TORNADO DANGER DETECTED!');
    result.alerts.forEach(alert => {
      console.log(`- ${alert.headline}`);
    });
    return true;
  }
  
  console.log('✅ No immediate tornado danger');
  return false;
}

// ==========================================
// EXAMPLE 7: App Configuration
// ==========================================

async function configExamples() {
  // Get a specific config value
  const cacheSettings = await AppConfigService.getConfig('cache_duration_alerts');
  console.log('Alert cache duration:', cacheSettings);

  // Get all config
  const allConfig = await AppConfigService.getAllConfig();
  console.log('All config:', allConfig);
}

// ==========================================
// EXAMPLE 8: React Native Component Integration
// ==========================================

/*
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import * as Location from 'expo-location';
import { 
  WeatherDataService, 
  ShelterService 
} from './services/supabaseWeatherService';

export default function WeatherDashboard() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Fetch unified weather data
      const data = await WeatherDataService.fetchAllData(latitude, longitude);
      setWeatherData(data);
      
      // Alert if tornado warning
      if (data.hasTornadoWarning) {
        Alert.alert(
          '🌪️ TORNADO WARNING',
          'Seek shelter immediately!',
          [{ text: 'Find Shelter', onPress: () => navigateToShelters() }]
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <ThreatBanner level={weatherData?.threatLevel} />
      
      <Text>Database Shelters: {weatherData?.summary.sheltersInDatabase}</Text>
      <Text>FEMA Open Shelters: {weatherData?.summary.femaOpenShelters}</Text>
      
      <AlertsList alerts={weatherData?.alerts.all} />
      
      <SheltersList 
        dbShelters={weatherData?.shelters.database}
        femaShelters={weatherData?.shelters.femaOpen}
      />
    </View>
  );
}
*/

// ==========================================
// EXAMPLE 9: Combining Database + FEMA Shelters
// ==========================================

async function getCombinedShelters(latitude, longitude, radiusMiles = 50) {
  // Get shelters from both sources
  const [dbResult, femaResult] = await Promise.all([
    ShelterService.getNearbyShelters(latitude, longitude, radiusMiles),
    FEMASheltersService.getNearbyShelters(latitude, longitude, radiusMiles)
  ]);

  const dbShelters = (dbResult.data || []).map(s => ({
    ...s,
    source: 'database',
    isEmergencyShelter: false
  }));

  const femaShelters = (femaResult.data || []).map(s => ({
    ...s,
    source: 'fema',
    isEmergencyShelter: true
  }));

  // Combine and sort by distance
  const allShelters = [...dbShelters, ...femaShelters].sort(
    (a, b) => (a.distance_miles || 999) - (b.distance_miles || 999)
  );

  return {
    all: allShelters,
    database: dbShelters,
    femaEmergency: femaShelters,
    closestShelter: allShelters[0] || null
  };
}

// ==========================================
// EXAMPLE 10: Error Handling Pattern
// ==========================================

async function robustDataFetch(latitude, longitude) {
  const results = {
    alerts: { data: [], error: null },
    shelters: { data: [], error: null },
    stormReports: { data: [], error: null }
  };

  // Fetch each data source independently to handle partial failures
  try {
    results.alerts = await NWSAlertsService.getActiveAlerts(latitude, longitude);
  } catch (error) {
    results.alerts.error = error.message;
    console.warn('Alerts fetch failed:', error.message);
  }

  try {
    results.shelters = await ShelterService.getNearbyShelters(latitude, longitude, 50);
  } catch (error) {
    results.shelters.error = error.message;
    console.warn('Shelters fetch failed:', error.message);
  }

  try {
    const reports = await SPCReportsService.getAllTodaysReports();
    results.stormReports.data = reports;
  } catch (error) {
    results.stormReports.error = error.message;
    console.warn('Storm reports fetch failed:', error.message);
  }

  // Return whatever data we got
  return results;
}

// ==========================================
// EXPORTS
// ==========================================

export {
  initializeApp,
  fetchCompleteWeatherData,
  shelterExamples,
  alertExamples,
  stormReportExamples,
  femaExamples,
  quickDangerCheck,
  configExamples,
  getCombinedShelters,
  robustDataFetch
};
