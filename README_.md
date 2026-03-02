# 🌪️ Tornado Shelter Alert App - API Integration

Weather API integration files for the Tornado Shelter Alert App, designed to help Oklahoma residents find nearby tornado shelters and receive real-time weather alerts with **predictive tornado metrics**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Predictive APIs](#predictive-apis)
- [API Metrics Comparison](#api-metrics-comparison)
- [Tornado Prediction Metrics](#tornado-prediction-metrics)
- [Alert Priority System](#alert-priority-system)
- [Sample API Responses](#sample-api-responses)
- [Cost Analysis](#cost-analysis)
- [Setup Instructions](#setup-instructions)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

---

## Overview

This repository contains all the weather API integration code for the Tornado Shelter Alert App. The app provides:

- **Real-time weather alerts** from the National Weather Service (NWS)
- **Tornado prediction metrics** (CAPE, Lifted Index, CIN) from Open-Meteo
- **16-day tornado forecasts** with high-risk day identification
- **Tornado probability zones** from SPC Convective Outlooks
- **Early warning alerts** from SPC Mesoscale Discussions (1-3 hours before watches)
- **Today's storm reports** from the Storm Prediction Center (SPC)
- **Emergency shelter locations** from FEMA and local databases
- **66+ verified Oklahoma shelters** including OSU campus locations

---

## Current Status

| Component | Status | Description |
|-----------|--------|-------------|
| NWS Alerts API | ✅ Tested & Working | Official tornado warnings |
| SPC Storm Reports | ✅ Tested & Working | Confirmed tornado/wind/hail |
| FEMA Open Shelters | ✅ Tested & Working | Emergency shelter locations |
| OpenWeather API | ✅ Configured | Current weather conditions |
| **Open-Meteo API** | ✅ **NEW** | CAPE, Lifted Index, CIN (16-day) |
| **SPC Convective Outlook** | ✅ **NEW** | Tornado probability zones |
| **SPC Mesoscale Discussions** | ✅ **NEW** | Pre-watch early warnings |

---

## Architecture

The app uses a **Direct API approach** - calling weather APIs directly from the React Native app without a backend server.

```
┌─────────────────────┐
│    React Native     │
│        App          │
└─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEATHER DATA SOURCES                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   NWS API    │  Open-Meteo  │  SPC APIs    │  OpenWeather   │
│  (Alerts)    │  (CAPE/LI)   │  (Outlooks)  │  (Current Wx)  │
│    FREE      │    FREE      │    FREE      │   Freemium     │
└──────────────┴──────────────┴──────────────┴────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                 THREAT LEVEL CALCULATION                     │
│  Inputs: NWS Warnings + CAPE + SPC Risk + MCD Watch Prob    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │Alert Banner │  │ Shelter Map │  │ 16-Day Risk Outlook │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Why Direct API?

- ✅ **Simple** - No backend infrastructure needed
- ✅ **Fast to implement** - Code is ready to integrate
- ✅ **Lower cost** - No database hosting fees
- ✅ **Works offline** - For cached data and bundled shelters
- ✅ **Fewer points of failure** - Direct API connections

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git

### 1. Clone the Repository

```bash
git clone [YOUR_REPO_URL]
cd tornado-shelter-api-integration
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your OpenWeather API key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the APIs

```bash
node scripts/test-weather-apis.js
```

You should see all 7 tests pass with color-coded output.

### 5. Pull Weather Data

```bash
node scripts/pull-weather-data.js
```

This generates 15 JSON files with current and predictive weather data.

---

## Project Structure

```
tornado-shelter-api-integration/
│
├── README.md                           # This file
├── .env.example                        # Environment variables template
├── .gitignore                          # Git ignore rules
├── package.json                        # Node.js dependencies
│
├── docs/                               # Documentation
│   ├── API_INTEGRATION_INFO.txt        # Complete API reference
│   ├── tornado_app_data_resources_v2.docx  # Full API docs with metrics
│   └── team_architecture_decision.docx # Architecture decisions
│
├── scripts/                            # Utility Scripts
│   ├── test-weather-apis.js            # Tests all 7 APIs
│   └── pull-weather-data.js            # Pulls all weather data (15 files)
│
├── sample-api-responses/               # Sample JSON outputs
│   ├── README.md                       # Sample file documentation
│   ├── open_meteo_tornado_metrics.json # CAPE, LI, CIN data
│   ├── spc_convective_outlook.json     # Risk zone polygons
│   ├── spc_mesoscale_discussions.json  # MCD early warnings
│   └── spc_tornado_reports_today.json  # Daily tornado reports
│
└── services/                           # API Service Files
    ├── weatherDataService.js           # Unified API service
    └── weatherDataServiceExamples.js   # Usage examples
```

---

## API Reference

### Current Weather APIs

| API | Endpoint | Auth | Cost |
|-----|----------|------|------|
| **NWS Alerts** | `api.weather.gov/alerts/active` | User-Agent header | FREE |
| **OpenWeather** | `api.openweathermap.org/data/3.0/onecall` | API Key | Freemium |
| **SPC Reports** | `spc.noaa.gov/climo/reports/today_torn.csv` | None | FREE |
| **FEMA Shelters** | `gis.fema.gov/arcgis/rest/services/NSS/OpenShelters` | None | FREE |

### NWS Alerts API

```bash
# Get active alerts for a location
GET https://api.weather.gov/alerts/active?point=35.4676,-97.5164

# Get all Oklahoma alerts
GET https://api.weather.gov/alerts/active?area=OK
```

**Headers Required:**
```
User-Agent: TornadoShelterApp/1.0 (team@email.com)
Accept: application/geo+json
```

### SPC Storm Reports

```bash
# Today's tornado reports
GET https://www.spc.noaa.gov/climo/reports/today_torn.csv

# Today's wind reports
GET https://www.spc.noaa.gov/climo/reports/today_wind.csv

# Today's hail reports
GET https://www.spc.noaa.gov/climo/reports/today_hail.csv
```

### FEMA Open Shelters

```bash
GET https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query
    ?where=SHELTER_STATE='OK'
    &outFields=*
    &f=json
    &returnGeometry=true
```

---

## Predictive APIs

These APIs provide **forecast data for tornado prediction**, allowing the app to warn users hours to days in advance.

### Open-Meteo - Tornado Prediction Metrics

**The ONLY free source for CAPE, Lifted Index, and CIN.**

```bash
GET https://api.open-meteo.com/v1/forecast
    ?latitude=35.4676
    &longitude=-97.5164
    &hourly=cape,lifted_index,convective_inhibition,temperature_2m,dewpoint_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,precipitation,weather_code
    &daily=cape_max,cape_min,cape_mean,precipitation_sum,wind_gusts_10m_max
    &temperature_unit=fahrenheit
    &wind_speed_unit=mph
    &precipitation_unit=inch
    &timezone=America/Chicago
    &forecast_days=16
```

| Feature | Value |
|---------|-------|
| **Cost** | FREE - No API key required |
| **Forecast Range** | Up to 16 days |
| **Update Frequency** | Hourly |
| **Key Metrics** | CAPE, Lifted Index, CIN, Dewpoint, Wind Gusts |

### SPC Convective Outlook - Tornado Probability

Official NOAA tornado probability zones (2%, 5%, 10%, 15%, 30%+).

```bash
GET https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer/7/query
    ?where=1%3D1
    &outFields=*
    &f=json
```

| Layer ID | Description |
|----------|-------------|
| 1 | Day 1 Categorical Outlook |
| 7 | Day 1 Tornado Probability |
| 8 | Day 1 Significant Tornado (EF2+) |
| 10 | Day 2 Tornado Probability |
| 17 | Day 3 Categorical Outlook |

### SPC Mesoscale Discussions - Early Warning

**Best early warning tool** - issued 1-3 hours BEFORE tornado watches.

```bash
GET https://www.spc.noaa.gov/products/md/md.geojson
```

| Watch Probability | App Action |
|-------------------|------------|
| ≥ 95% | 🔴 EMERGENCY PUSH - "Tornado Watch imminent" |
| ≥ 80% | 🟠 PUSH NOTIFICATION - "Watch likely in 1-2 hrs" |
| ≥ 50% | 🟡 IN-APP ALERT - "Severe weather watch possible" |
| < 50% | 🟢 MONITOR - Update app status |

---

## API Metrics Comparison

**Which API provides which metrics?**

| Metric | OpenWeather | NWS | Open-Meteo | SPC Outlook | SPC MCD |
|--------|:-----------:|:---:|:----------:|:-----------:|:-------:|
| **Basic Weather** |||||
| Temperature | ✅ | ✅ | ✅ | ❌ | ❌ |
| Dewpoint | ✅ | ✅ | ✅ | ❌ | ❌ |
| Humidity | ✅ | ✅ | ✅ | ❌ | ❌ |
| Wind Speed/Gusts | ✅ | ✅ | ✅ | ❌ | ✅ |
| Pressure | ✅ | ✅ | ✅ | ❌ | ❌ |
| Precipitation | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tornado Prediction** |||||
| CAPE | ❌ | ❌ | ✅ | ❌ | ❌ |
| Lifted Index | ❌ | ❌ | ✅ | ❌ | ❌ |
| CIN | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Alerts & Probability** |||||
| Tornado Warnings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tornado Probability % | ❌ | ❌ | ❌ | ✅ | ❌ |
| Watch Probability % | ❌ | ❌ | ❌ | ❌ | ✅ |
| Risk Zone Polygons | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Forecast** |||||
| Range | 5 days | 7 days | **16 days** | 1-8 days | 1-3 hrs |
| Cost | Freemium | FREE | FREE | FREE | FREE |

> **Key Insight:** Open-Meteo is the ONLY source for CAPE, Lifted Index, and CIN - the critical tornado prediction metrics NOT available from OpenWeather or NWS.

---

## Tornado Prediction Metrics

### CAPE (Convective Available Potential Energy)

The **PRIMARY indicator** of tornado potential. Measures atmospheric energy available for storm development.

| CAPE Value | Risk Level | Interpretation |
|------------|------------|----------------|
| < 300 J/kg | 🟢 MINIMAL | Stable atmosphere, no tornado threat |
| 300-1000 J/kg | 🟢 LOW | Weak instability, marginal potential |
| 1000-2500 J/kg | 🟡 MODERATE | Strong storms possible |
| 2500-4000 J/kg | 🟠 HIGH | Severe storms likely, tornado potential |
| > 4000 J/kg | 🔴 EXTREME | Violent storms, significant tornado risk |

### Lifted Index (LI)

Measures atmospheric instability. **Negative values = unstable = storm potential.**

| LI Value | Stability | Interpretation |
|----------|-----------|----------------|
| > 0°C | 🟢 Stable | Thunderstorms unlikely |
| 0 to -2°C | 🟡 Marginal | Weak storms possible |
| -2 to -6°C | 🟠 Unstable | Thunderstorms likely |
| < -6°C | 🔴 Very Unstable | Severe storms expected |

### Convective Inhibition (CIN)

Energy barrier ("cap") preventing storm development. **Lower = storms develop easier.**

| CIN Value | Cap Strength | Interpretation |
|-----------|--------------|----------------|
| < 50 J/kg | 🔴 Weak | Storms develop easily (dangerous with high CAPE) |
| 50-200 J/kg | 🟡 Moderate | Storms need a trigger |
| > 200 J/kg | 🟢 Strong | Suppresses storm development |

### Supporting Metrics

| Metric | Favorable for Tornadoes | Optimal |
|--------|------------------------|---------|
| **Dewpoint** | ≥ 55°F | ≥ 65°F |
| **Wind Gusts** | ≥ 30 mph | ≥ 50 mph |

### SPC Risk Levels

| Code | Name | Tornado Prob. | App Action |
|------|------|---------------|------------|
| TSTM | General Thunder | <2% | Status update only |
| MRGL | Marginal | 2% | Low alert |
| SLGT | Slight | 5% | Moderate alert |
| ENH | Enhanced | 10% | High alert |
| MDT | Moderate | 15% | **Push notification** |
| HIGH | High | 30%+ | **Emergency push** |

---

## Alert Priority System

The app uses a 5-level priority system for notifications:

| Priority | Source | Lead Time | Action |
|----------|--------|-----------|--------|
| 🔴 **1** | NWS Tornado Warning | 0-30 min | **EMERGENCY PUSH** - Seek shelter immediately |
| 🟠 **2** | SPC MCD (≥80%) | 1-3 hours | **Push notification** - Watch likely soon |
| 🟡 **3** | Open-Meteo CAPE ≥1000 | Daily | **In-app alert** - Stay weather aware |
| 🟡 **4** | SPC Outlook (ENH+) | 1-3 days | **Home screen banner** - Risk level display |
| 🟢 **5** | 16-Day High-Risk Days | 1-16 days | **Calendar flag** - Planning awareness |

### Threat Level Calculation

```javascript
// Priority 1: Official Warnings (immediate)
if (hasNWSTornadoWarning) return 'EXTREME';      // 🔴

// Priority 2: MCD Watch Probability (1-3 hours)
if (mcdWatchProbability >= 80) return 'HIGH';    // 🟠

// Priority 3: Atmospheric Instability + SPC Risk
if (cape >= 2500 || spcRisk === 'MDT' || spcRisk === 'HIGH') return 'HIGH';     // 🟠
if (cape >= 1000 || spcRisk === 'ENH') return 'ELEVATED';                        // 🟡

// Priority 4: General Watches
if (hasAnyWatch || spcRisk === 'SLGT') return 'MODERATE';  // 🟡
if (hasAnyAdvisory || cape >= 300) return 'LOW';           // 🟢

return 'NONE';  // 🟢
```

---

## Sample API Responses

The `sample-api-responses/` folder contains example JSON outputs for development and testing.

| File | Source | Description |
|------|--------|-------------|
| `open_meteo_tornado_metrics.json` | Open-Meteo | 16-day CAPE, LI, CIN forecasts |
| `spc_convective_outlook.json` | NOAA SPC | Risk zone polygons (GeoJSON) |
| `spc_mesoscale_discussions.json` | NOAA SPC | MCD early warnings |
| `spc_tornado_reports_today.json` | NOAA SPC | Daily confirmed reports |

### Sample Data Structure (Open-Meteo)

```json
{
  "source": "Open-Meteo",
  "pulledAt": "2026-03-01T17:57:14.586Z",
  "locations": {
    "okc": {
      "location": "Oklahoma City",
      "coordinates": { "lat": 35.4676, "lon": -97.5164 },
      "current": {
        "cape": 960,
        "lifted_index": -3.2,
        "convective_inhibition": 0,
        "dewpoint_f": 58,
        "wind_gust_mph": 25
      },
      "peakValues": {
        "maxCAPE_24hr": 960,
        "maxCAPE_7day": 1500,
        "maxCAPE_16day": 1510
      },
      "highRiskDays": [
        { "date": "2026-03-04", "cape_max": 1250, "risk": "MODERATE" },
        { "date": "2026-03-05", "cape_max": 1150, "risk": "MODERATE" },
        { "date": "2026-03-06", "cape_max": 1500, "risk": "MODERATE" }
      ],
      "tornadoThreatAssessment": {
        "level": "HIGH",
        "score": 65,
        "factors": ["CAPE 1500+ in 7-day window", "Multiple high-risk days"],
        "recommendation": "Elevated tornado risk - Have shelter plan ready"
      }
    }
  },
  "oklahomaAssessment": {
    "overallThreat": "HIGH",
    "highestScore": 65,
    "totalHighRiskDays": 3
  }
}
```

### Sample Data Structure (SPC MCD)

```json
{
  "source": "NOAA Storm Prediction Center",
  "pulledAt": "2026-03-01T17:57:14.586Z",
  "discussions": [
    {
      "number": "0124",
      "url": "https://www.spc.noaa.gov/products/md/md0124.html",
      "concerning": "Severe potential...Watch likely",
      "affectedAreas": "South Florida",
      "watchProbability": 20,
      "mentionsTornado": false,
      "states": ["FL"]
    }
  ],
  "oklahomaAffected": false,
  "appIntegration": {
    "alertThreshold": "Push notification when watch_probability >= 80%",
    "importance": "MCDs are your BEST early warning tool for tornado watches"
  }
}
```

---

## Cost Analysis

### Summary: All Predictive APIs are FREE

| API | Cost | Rate Limits |
|-----|------|-------------|
| Open-Meteo | **FREE** | 10,000 requests/day |
| SPC Convective Outlook | **FREE** | No limit |
| SPC Mesoscale Discussions | **FREE** | No limit |
| NWS Alerts | **FREE** | Reasonable use |
| SPC Storm Reports | **FREE** | No limit |
| FEMA Shelters | **FREE** | No limit |
| OpenWeather | Freemium | 1,000 calls/day free |

### Estimated Monthly Costs

| Scale | Cost | Notes |
|-------|------|-------|
| Development/Testing | **$0** | All free tiers |
| Small Launch (<1,000 users) | **$0-25** | May need OpenWeather paid tier |
| Medium (1,000-10,000 users) | **$25-75** | OpenWeather + caching |
| Large (10,000+ users) | **$75-200+** | Aggressive caching recommended |

### Cost Optimization Tips

1. **Use Free APIs First** - NWS, Open-Meteo, and SPC are completely free
2. **Implement Caching:**
   - NWS alerts: 2 minutes
   - Open-Meteo: 1 hour
   - SPC Outlook: 6 hours
   - SPC Reports: 10 minutes
3. **Batch Requests** - Fetch all data at once when app opens
4. **Set OpenWeather Limits** - Configure daily limit in dashboard

---

## Setup Instructions

### 1. Environment Setup

```bash
# Create .env file
cp .env.example .env

# Add your OpenWeather API key
echo "OPENWEATHER_API_KEY=your_key_here" >> .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Integrate Weather Service

```javascript
// Import the service
import { WeatherDataService } from './services/weatherDataService';

// Create instance
const service = new WeatherDataService();

// Fetch all data for a location
const data = await service.fetchAllData(35.4676, -97.5164);

// Access predictive metrics
console.log(data.openMeteo.current.cape);          // Current CAPE
console.log(data.openMeteo.peakValues.maxCAPE_7day); // 7-day max
console.log(data.openMeteo.highRiskDays);          // High-risk days array
console.log(data.spcOutlook.riskLevel);            // SPC risk code
console.log(data.spcMCD.watchProbability);         // MCD watch probability
```

---

## Testing

### Run All API Tests

```bash
node scripts/test-weather-apis.js
```

**Expected Output:**

```
╔════════════════════════════════════════════════════════════╗
║   TORNADO SHELTER APP - WEATHER API TEST SUITE (COMPLETE)   ║
╚════════════════════════════════════════════════════════════╝

─── CURRENT WEATHER APIS ───
  1. NWS Alerts:        PASSED ✓
  2. SPC Reports:       PASSED ✓
  3. FEMA Shelters:     PASSED ✓

─── PREDICTIVE WEATHER APIS ───
  4. SPC Convective:    PASSED ✓
  5. SPC MCDs:          PASSED ✓
  6. NWS Forecast Grid: PASSED ✓

─── TORNADO PREDICTION METRICS (16-Day) ───
  7. Open-Meteo:        PASSED ✓
     Current CAPE: 960 J/kg
     Max CAPE (7-day): 1500 J/kg
     High-Risk Days: 3

════════════════════════════════════════════════════════════
🎉 ALL 7 TESTS PASSED!
════════════════════════════════════════════════════════════
```

### Pull Full Weather Data

```bash
node scripts/pull-weather-data.js
```

Generates 15 JSON files including predictive forecasts.

### Oklahoma Test Locations

| City | Latitude | Longitude |
|------|----------|-----------|
| Oklahoma City | 35.4676 | -97.5164 |
| Tulsa | 36.1540 | -95.9928 |
| Stillwater | 36.1156 | -97.0584 |
| Norman | 35.2226 | -97.4395 |
| Edmond | 35.6528 | -97.4781 |

---

## Data Flow Diagram

```
┌─────────────────────────┐
│      USER OPENS APP     │
└─────────────────────────┘
             │
             ▼
┌───────────────────────────┐
│  GET USER LOCATION (GPS)  │
└───────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FETCH ALL DATA IN PARALLEL                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐ │
│  │NWS Alerts │ │Open-Meteo │ │SPC Outlook│ │ SPC MCDs  │ │  FEMA  │ │
│  │(Warnings) │ │(CAPE/LI)  │ │(Risk Zone)│ │(Pre-Watch)│ │Shelters│ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CALCULATE THREAT LEVEL                            │
│  Inputs: NWS Warning + CAPE Value + SPC Risk + MCD Watch Prob        │
│  Output: EXTREME → HIGH → ELEVATED → MODERATE → LOW → NONE          │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DISPLAY TO USER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │Alert Banner │  │ Shelter Map │  │16-Day CAPE  │  │High-Risk    │ │
│  │(Risk Level) │  │ (Nearest)   │  │  Forecast   │  │  Days       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

Create a `.env` file:

```bash
# OpenWeather API (required for current weather)
OPENWEATHER_API_KEY=your_api_key_here

# App Configuration
APP_USER_AGENT=TornadoShelterApp/1.0 (team@email.com)
DEFAULT_STATE=OK

# Alert Thresholds (optional - can also be in code)
CAPE_HIGH_THRESHOLD=2500
CAPE_MODERATE_THRESHOLD=1000
MCD_PUSH_THRESHOLD=80
```

⚠️ **IMPORTANT:** Never commit `.env` to git. It's already in `.gitignore`.

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Test: `node scripts/test-weather-apis.js`
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request

---

## Team Resources

| Resource | Location |
|----------|----------|
| GitHub Repo | [This repository] |
| API Keys | Private team document |
| Full API Docs | `docs/API_INTEGRATION_INFO.txt` |
| Metrics Reference | `docs/tornado_app_data_resources_v2.docx` |

## Additional Links

- [Open-Meteo Documentation](https://open-meteo.com/en/docs)
- [NWS API Documentation](https://www.weather.gov/documentation/services-web-api)
- [SPC Products Overview](https://www.spc.noaa.gov/products/)
- [Oklahoma Emergency Management](https://oklahoma.gov/oem.html)
- [SoonerSafe Program](https://oklahoma.gov/oem/programs-and-services/soonersafe-safe-room-rebate-program.html)

---

*Last Updated: March 2026*
