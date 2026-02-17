/**
 * Weather Data Service - React Native Usage Examples
 * 
 * This file demonstrates how to integrate weatherDataService.js
 * into your Tornado Shelter Alert App.
 */

import { WeatherDataService } from './weatherDataService';

// ==========================================
// BASIC SETUP
// ==========================================

// Create a single instance to share across your app
const weatherService = new WeatherDataService();

// ==========================================
// EXAMPLE 1: Fetch All Data at Once
// ==========================================

async function fetchCompleteWeatherData(latitude, longitude) {
  try {
    const data = await weatherService.fetchAllData(latitude, longitude, {
      stateCode: 'OK',           // Oklahoma
      shelterRadiusMiles: 50,    // Find shelters within 50 miles
      reportRadiusMiles: 100,    // Storm reports within 100 miles
      includeStateAlerts: true   // Include statewide alerts
    });

    console.log('=== WEATHER DATA SUMMARY ===');
    console.log(`Threat Level: ${data.threatLevel}`);
    console.log(`Active Alerts: ${data.summary.activeAlerts}`);
    console.log(`Tornado Warnings: ${data.summary.tornadoWarnings}`);
    console.log(`Nearby Tornado Reports Today: ${data.summary.nearbyTornadoReports}`);
    console.log(`Open Shelters Nearby: ${data.summary.openSheltersNearby}`);
    
    if (data.summary.closestShelter) {
      console.log(`Closest Shelter: ${data.summary.closestShelter.name} (${data.summary.closestShelter.distanceMiles} mi)`);
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    throw error;
  }
}

// ==========================================
// EXAMPLE 2: Quick Tornado Danger Check
// Use this for frequent polling (every 1-2 minutes)
// ==========================================

async function quickTornadoCheck(latitude, longitude) {
  const result = await weatherService.checkTornadoDanger(latitude, longitude);
  
  if (result.hasDanger) {
    console.log('🚨 TORNADO DANGER DETECTED!');
    console.log('Alert:', result.mostUrgent.headline);
    // Trigger push notification, alert UI, etc.
    return true;
  }
  
  console.log('✅ No tornado danger');
  return false;
}

// ==========================================
// EXAMPLE 3: React Native Component Integration
// ==========================================

/*
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import * as Location from 'expo-location';
import { WeatherDataService } from './services/weatherDataService';

const weatherService = new WeatherDataService();

export default function WeatherDashboard() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWeatherData();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadWeatherData, 5 * 60 * 1000);
    
    // Quick tornado check every 2 minutes
    const tornadoInterval = setInterval(checkForTornado, 2 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(tornadoInterval);
    };
  }, []);

  async function loadWeatherData() {
    try {
      setLoading(true);
      
      // Get user location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Fetch all weather data
      const data = await weatherService.fetchAllData(latitude, longitude);
      setWeatherData(data);
      setError(null);
      
      // Check for immediate danger
      if (data.hasTornadoWarning) {
        Alert.alert(
          '🌪️ TORNADO WARNING',
          data.summary.mostUrgentAlert?.headline || 'Seek shelter immediately!',
          [{ text: 'Find Shelter', onPress: () => navigateToShelters() }]
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkForTornado() {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const result = await weatherService.checkTornadoDanger(
        location.coords.latitude,
        location.coords.longitude
      );
      
      if (result.hasDanger && !weatherData?.hasTornadoWarning) {
        // New tornado warning detected
        Alert.alert('🚨 NEW TORNADO WARNING', result.mostUrgent?.headline);
        loadWeatherData(); // Refresh full data
      }
    } catch (err) {
      console.error('Tornado check failed:', err);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <View>
      <ThreatLevelBanner level={weatherData.threatLevel} />
      
      <AlertsList alerts={weatherData.alerts.all} />
      
      <SheltersList 
        shelters={weatherData.shelters.nearby}
        onSelectShelter={navigateToShelter}
      />
      
      <StormReportsSummary reports={weatherData.stormReports} />
    </View>
  );
}
*/

// ==========================================
// EXAMPLE 4: Individual Service Usage
// ==========================================

async function individualServiceExamples(lat, lon) {
  // Access individual services directly
  const nws = weatherService.nwsService;
  const spc = weatherService.spcService;
  const fema = weatherService.femaService;

  // Get only NWS alerts
  const alerts = await nws.getActiveAlerts(lat, lon);
  console.log('NWS Alerts:', alerts.length);

  // Get Oklahoma-wide alerts
  const okAlerts = await nws.getStateAlerts('OK');
  console.log('Oklahoma Alerts:', okAlerts.length);

  // Get only tornado-related alerts
  const tornadoAlerts = await nws.getTornadoAlerts(lat, lon);
  console.log('Tornado Alerts:', tornadoAlerts.length);

  // Get today's tornado reports
  const tornadoReports = await spc.getTodaysReports('tornado');
  console.log('Tornado Reports Today:', tornadoReports.length);

  // Get all severe weather reports
  const allReports = await spc.getAllTodaysReports();
  console.log('All Reports:', {
    tornado: allReports.tornado.length,
    wind: allReports.wind.length,
    hail: allReports.hail.length
  });

  // Get open shelters in Oklahoma
  const okShelters = await fema.getOpenShelters('OK');
  console.log('OK Open Shelters:', okShelters.length);

  // Get nearby shelters
  const nearbyShelters = await fema.getNearbyShelters(lat, lon, 30);
  console.log('Shelters within 30 miles:', nearbyShelters.length);
}

// ==========================================
// EXAMPLE 5: Threat Level Color Mapping
// ==========================================

function getThreatLevelColor(threatLevel) {
  const colors = {
    'EXTREME': '#8B0000',  // Dark red
    'HIGH': '#FF0000',     // Red
    'ELEVATED': '#FFA500', // Orange
    'MODERATE': '#FFD700', // Yellow
    'LOW': '#90EE90',      // Light green
    'NONE': '#00FF00'      // Green
  };
  return colors[threatLevel] || '#GRAY';
}

function getThreatLevelMessage(threatLevel) {
  const messages = {
    'EXTREME': 'TORNADO WARNING - Seek shelter immediately!',
    'HIGH': 'High tornado risk - Be ready to shelter',
    'ELEVATED': 'Severe weather possible - Stay alert',
    'MODERATE': 'Weather watch in effect - Monitor conditions',
    'LOW': 'Minor weather advisory - Stay informed',
    'NONE': 'No active weather threats'
  };
  return messages[threatLevel] || 'Unknown threat level';
}

// ==========================================
// EXAMPLE 6: Error Handling Pattern
// ==========================================

async function robustWeatherFetch(lat, lon) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await weatherService.fetchAllData(lat, lon);
      return { success: true, data };
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // All retries failed
  return { 
    success: false, 
    error: lastError.message,
    // Return partial data if available from cache
    partialData: {
      alerts: [],
      shelters: [],
      stormReports: { tornado: [], wind: [], hail: [] }
    }
  };
}

// ==========================================
// EXAMPLE 7: Combining with Your OpenWeather Data
// ==========================================

async function getCombinedWeatherData(lat, lon, openWeatherData) {
  // openWeatherData comes from your existing OpenWeather integration
  
  const additionalData = await weatherService.fetchAllData(lat, lon);
  
  return {
    // Your existing OpenWeather data
    current: openWeatherData.current,
    forecast: openWeatherData.forecast,
    tornadoProbability: openWeatherData.tornadoProbability,
    
    // New data from this service
    officialAlerts: additionalData.alerts.all,
    tornadoWarnings: additionalData.alerts.tornado,
    todaysStormReports: additionalData.stormReports,
    openShelters: additionalData.shelters.nearby,
    
    // Combined threat assessment
    threatLevel: additionalData.threatLevel,
    
    // Overall danger indicator
    immediateDanger: additionalData.hasTornadoWarning || 
                     openWeatherData.tornadoProbability > 80
  };
}

// ==========================================
// EXPORTS
// ==========================================

export {
  weatherService,
  fetchCompleteWeatherData,
  quickTornadoCheck,
  individualServiceExamples,
  getThreatLevelColor,
  getThreatLevelMessage,
  robustWeatherFetch,
  getCombinedWeatherData
};
