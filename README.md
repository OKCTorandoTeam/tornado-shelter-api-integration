🌪️ ## **Tornado Shelter Alert App - API Integration**
Weather API integration files for the Tornado Shelter Alert App, designed to help Oklahoma residents find nearby tornado shelters and receive real-time weather alerts.

📋 ## **Table of Contents**

Overview
Architecture Options
Quick Start
Project Structure
API Reference
Cost Analysis
Setup Instructions
Testing
Environment Variables
Contributing


## **Overview**
This repository contains all the weather API integration code for the Tornado Shelter Alert App. The app provides:

- Real-time weather alerts from the National Weather Service (NWS)
- Tornado probability calculations using OpenWeather data
- Today's storm reports from the Storm Prediction Center (SPC)
- Emergency shelter locations from FEMA and local databases
- Historical tornado data for Oklahoma

Current Status
ComponentStatusNWS Alerts API ✅ Tested & Working 
SPC Storm Reports ✅ Tested & Working
FEMA Open Shelters ✅ Tested & Working
OpenWeather API ✅ Configured 
Supabase Schema ✅ Verified in PostgreSQL

Architecture Options
We have implemented two architecture approaches. The team should decide which to use:
Option A: Direct API Calls (Simpler)
┌─────────────────┐     ┌─────────────────┐
│  React Native   │────▶│   NWS API       │
│      App        │────▶│   SPC API       │
│                 │────▶│   FEMA API      │
│                 │────▶│   OpenWeather   │
└─────────────────┘     └─────────────────┘
Pros: Simple, no backend needed, faster to implement
Cons: No data persistence, shelter updates require app release
Files: services/weatherDataService.js

Option B: Supabase Backend (More Robust)
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Native   │────▶│    Supabase     │────▶│   External      │
│      App        │     │   (PostgreSQL)  │     │     APIs        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Shelter Data   │
                        │  Alert History  │
                        │  Storm Reports  │
                        └─────────────────┘
Pros: Data persistence, easy shelter updates, historical tracking
Cons: Requires Supabase setup, slight additional complexity
Files: database/supabase_schema.sql, services/supabaseWeatherService.js

## **Quick Start**
**Prerequisites**

- Node.js 18+ installed
- npm or yarn
- Git

1. Clone the Repository
```bash
git clone [YOUR_REPO_URL]
cd tornado-shelter-api-integration
```
2. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API keys
# (Get keys from team's private Google Doc)
```
3. Install Dependencies
```bash
npm install
```
5. Test the APIs
```bash
node scripts/test-weather-apis.js
```
You should see all tests pass with green checkmarks.

## **Project Structure**
```bash
tornado-shelter-api-integration/
│
├── README.md                    # This file
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── package.json                 # Node.js dependencies
│
├── docs/                        # Documentation
│   ├── API_INTEGRATION_INFO.txt # Complete API reference
│   ├── team_architecture_decision.docx
│   └── tornado_app_data_resources.docx
│
├── services/                    # API Service Files
│   ├── weatherDataService.js        # Direct API approach
│   ├── weatherDataServiceExamples.js
│   ├── supabaseWeatherService.js    # Supabase approach
│   └── supabaseWeatherServiceExamples.js
│
├── database/                    # Database Files
│   └── supabase_schema.sql      # PostgreSQL/Supabase schema
│
└── scripts/                     # Utility Scripts
    ├── test-weather-apis.js     # API test script
    └── pull-meeting-data.js     # Demo data pull script
```

## **API Reference**
Key Endpoints
NWS Alerts API
```bash
GET https://api.weather.gov/alerts/active?point={lat},{lon}
GET https://api.weather.gov/alerts/active?area=OK
```
SPC Storm Reports
```bash
GET https://www.spc.noaa.gov/climo/reports/today_torn.csv
GET https://www.spc.noaa.gov/climo/reports/today_wind.csv
GET https://www.spc.noaa.gov/climo/reports/today_hail.csv
```
FEMA Open Shelters
```bash
GET https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query
    ?where=SHELTER_STATE='OK'
    &outFields=*
    &f=json
    &returnGeometry=true
```
OpenWeather (One Call API 3.0)
```bash
GET https://api.openweathermap.org/data/3.0/onecall
    ?lat={lat}
    &lon={lon}
    &appid={API_KEY}
```

## **Cost Analysis**
**Summary:** Estimated Monthly Costs
1. **Development/Testing:** $0 (all free tiers)
2. **Small Launch (< 1,000 users):** $0 - $25
3. **Medium Scale (1,000 - 10,000 users):** $25 - $75
4. **Large Scale (10,000+ users):** $75 - $200+

## **Detailed API Pricing**
1. **OpenWeather API**
Plan          Cost           Limits
Free Tier     $0             1,000 calls/day
One Call 3.0  $0 + overage   1,000 calls/day free, then $0.0015/call

Notes:
- Free tier requires credit card on file but won't charge if under limit
- Set daily limit in dashboard to avoid surprise charges
- Our app with 1,000 users making 5 calls/day = 5,000 calls/day = ~$6/day overage

**My Recommendation:** For production, budget ~$50-100/month for OpenWeather or implement aggressive caching.

2. **National Weather Service (NWS) API**
Plan          Cost             Limits
Public API    $0 (Always Free) Reasonable use (no hard limit)

Notes:
- Government-funded, completely free
- Only requires User-Agent header

**My Recommendation:** Cache responses for 2 minutes

3. **Storm Prediction Center (SPC)**
Plan          Cost             Limits
Public Data   $0 (Always Free) No limits

Notes: Public CSV files, no authentication
**My Recommendation:** Cache for 10 minutes


4. **FEMA National Shelter System**
Plan          Cost             Limits
Public API    $0 (Always Free) No limits

Notes:
- ArcGIS REST API, no authentication
- Data syncs with Red Cross every 20 minutes

5. Supabase (If Using Backend Option)
Plan          Cost             Includes
Free Tier     $0               500 MB database, 1 GB storage, 50K MAUs
Pro Plan      $25/month        8 GB database, 100 GB storage, 100K MAUs
Team Plan     $599/month       Pro features + SSO, SOC2

Notes:
- Free tier is generous and sufficient for MVP/hackathon
- Projects pause after 7 days of inactivity on free tier
- Pro plan recommended for production

## **Our Expected Usage:**
**Database size:** < 50 MB (well under 500 MB free limit)
**Storage:** Minimal (no file uploads)
**MAUs:** Depends on user base

**My Recommendation:** Start with Free tier, upgrade to Pro ($25/mo) for production.

## **Cost Optimization Tips**
1. Implement Caching
- Cache NWS alerts: 2 minutes
- Cache SPC reports: 10 minutes
- Cache FEMA shelters: 5 minutes
- Cache OpenWeather: 10 minutes

2. Set API Limits
- Configure OpenWeather daily limit in dashboard
- Prevents unexpected charges
  
3. Use Free APIs First
- NWS provides official alerts for free
- Only use OpenWeather for additional weather data
  
4. Batch Requests
- Fetch all data at once when app opens
- Don't make separate calls for each component

## **Setup Instructions**
**For Direct API Approach (Option A)**

1. Copy services/weatherDataService.js to your React Native project
2. Install no additional dependencies (uses native fetch)
3. Update the User-Agent in the config:
```javascript
APP_USER_AGENT: 'TornadoShelterApp/1.0 (your-email@example.com)'
```

4. Import and use:
```javascript
import { WeatherDataService } from './services/weatherDataService';
   
   const service = new WeatherDataService();
   const data = await service.fetchAllData(35.4676, -97.5164);
```

**For Supabase Approach (Option B)**

**Step 1: Create Supabase Project**
1. Go to supabase.com and create account
2. Click "New Project"
3. Choose organization and set project name
4. Set a secure database password (save this!)
5. Select region closest to Oklahoma (e.g., US East)
6. Click "Create new project"

**Step 2: Run Database Schema**
In Supabase dashboard, go to SQL Editor
1. Click New Query
2. Copy contents of database/supabase_schema.sql
3. Paste into editor
4. Click Run (or press Ctrl+Enter)
5. Verify tables created in Table Editor

**Step 3: Get Credentials**

Go to **Settings → API**
Copy:
- **Project URL** (e.g., https://xxxxx.supabase.co)
- **anon public** key (safe for client-side)

**Step 4: Configure App**

1. Add to your .env file:
```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
```
2. Install Supabase SDK:
```bash
npm install @supabase/supabase-js
```
3. Import and use:
```javascript
  import { WeatherDataService } from './services/supabaseWeatherService';
  const data = await WeatherDataService.fetchAllData(35.4676, -97.5164);
```

## **Testing**
Run API Tests
```bash
# Test all weather APIs
node scripts/test-weather-apis.js
```
Expected output:
```
✓ NWS Alerts:     PASSED
✓ SPC Reports:    PASSED
✓ FEMA Shelters:  PASSED
✓ Unified Fetch:  PASSED
🎉 ALL TESTS PASSED!
```

Pull Demo Data
```bash
# Pull live data and save as JSON files
node scripts/pull-meeting-data.js
This creates JSON files in ./meeting_demo_data/ folder.

Environment Variables
Create a .env file based on .env.example:
bash# OpenWeather API (required)
OPENWEATHER_API_KEY=your_api_key_here

# Supabase (only if using Option B)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# App Configuration
APP_USER_AGENT=TornadoShelterApp/1.0 (team@email.com)
DEFAULT_STATE=OK
⚠️ IMPORTANT: Never commit .env to git. It's already in .gitignore.
```

Oklahoma Test Locations
Use these coordinates for testing:
City            Latitude        Longitude
Oklahoma City   35.4676         -97.5164
Tulsa           36.1540         -95.9928
Stillwater      36.1156         -97.0584
Norman          35.2226         -97.4395
Edmond          35.6528         -97.4781

Data Flow Diagram
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER OPENS APP                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      GET USER LOCATION (GPS)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FETCH ALL DATA IN PARALLEL                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ NWS Alerts  │ │ SPC Reports │ │ FEMA Shelt. │ │ OpenWeather │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CALCULATE THREAT LEVEL                              │
│         EXTREME → HIGH → ELEVATED → MODERATE → LOW → NONE               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DISPLAY TO USER                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                       │
│  │ Alert Banner│ │ Shelter Map │ │Weather Info │                       │
│  └─────────────┘ └─────────────┘ └─────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘

Threat Level Logic
```javascript
if (hasTornadoWarning) return 'EXTREME';      // 🔴 Red
if (hasTornadoWatch && nearbyTornadoReports) return 'HIGH';  // 🟠 Orange-Red
if (hasTornadoWatch || nearbyTornadoReports) return 'ELEVATED'; // 🟡 Orange
if (hasSevereThunderstormWarning) return 'ELEVATED';  // 🟡 Orange
if (hasAnyWatch) return 'MODERATE';           // 🟡 Yellow
if (hasAnyAdvisory) return 'LOW';             // 🟢 Light Green
return 'NONE';                                 // 🟢 Green
```
Contributing

1. Create a feature branch: ```git checkout -b feature/your-feature```
2. Make changes
3. Test: ```node scripts/test-weather-apis.js```
4. Commit: ```git commit -m "Add your feature"```
5. Push: ```git push origin feature/your-feature```
6. Open a Pull Request


Team Resources

GitHub Repo: [This repository]
Team Communication: okctornadoteam@gmail.com
API Keys: [Private Google Doc - ask team lead]
Supabase Project: [To be set up]


Questions?
Check docs/API_INTEGRATION_INFO.txt for detailed API documentation, or reach out to the team.
