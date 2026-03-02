# Sample API Responses

Point-in-time snapshots of predictive weather API responses for development, testing, and documentation.

## Files

| File | Source | Description |
|------|--------|-------------|
| `open_meteo_tornado_metrics.json` | Open-Meteo | 16-day tornado prediction metrics (CAPE, Lifted Index, CIN) |
| `open_meteo_16day_tornado_metrics.json` | Open-Meteo | Extended 16-day forecast example |
| `spc_convective_outlook.json` | NOAA SPC | Convective outlook risk zone polygons (GeoJSON) |
| `spc_mesoscale_discussions.json` | NOAA SPC | Mesoscale discussions (pre-watch early warnings) |
| `spc_tornado_reports_today.json` | NOAA SPC | Daily confirmed tornado reports |

## Purpose

These files serve as:
- **Frontend Development** - Mock data for UI development without live API calls
- **Unit/Integration Testing** - Predictable test fixtures
- **Documentation** - Shows exact structure the app will receive from each API

## Naming Convention

| Style | Usage | Example |
|-------|-------|---------|
| `snake_case` | External API fields (preserved as-is) | `cape_max`, `lifted_index`, `idp_source` |
| `camelCase` | Our computed/metadata fields | `pulledAt`, `oklahomaAssessment`, `appIntegration` |

This mixed convention is intentional - we preserve original API field names for consistency with documentation while using camelCase for our additions.

## Data Sources

| Source | API Endpoint | License | Cost |
|--------|--------------|---------|------|
| **Open-Meteo** | https://api.open-meteo.com/v1/forecast | CC BY 4.0 | FREE |
| **NOAA SPC Outlooks** | https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer | Public Domain | FREE |
| **NOAA SPC MCDs** | https://www.spc.noaa.gov/products/md | Public Domain | FREE |
| **NOAA SPC Reports** | https://www.spc.noaa.gov/climo/reports/today_torn.csv | Public Domain | FREE |

## Key Metrics Explained

### Tornado Prediction (Open-Meteo)

| Metric | Unit | Tornado Threshold |
|--------|------|-------------------|
| `cape` | J/kg | ≥1000 = Moderate, ≥2500 = High |
| `lifted_index` | °C | ≤-3 = Unstable, ≤-6 = Very Unstable |
| `convective_inhibition` | J/kg | <50 = Weak cap (storms develop easily) |

### SPC Risk Levels

| Code | Name | Tornado Probability |
|------|------|---------------------|
| TSTM | General Thunder | <2% |
| MRGL | Marginal | 2% |
| SLGT | Slight | 5% |
| ENH | Enhanced | 10% |
| MDT | Moderate | 15% |
| HIGH | High | 30%+ |

## Integration Priority

For the Tornado Shelter App, implement in this order:

1. **NWS Alerts API** - Real-time tornado warnings (immediate)
2. **SPC Mesoscale Discussions** - 1-3 hour advance warning
3. **Open-Meteo CAPE/LI** - Tornado environment metrics
4. **SPC Convective Outlook** - Daily risk assessment

## Usage Example

```javascript
// Load sample data for testing
import sampleMetrics from './open_meteo_tornado_metrics.json';

// Use in tests
test('displays HIGH threat when CAPE >= 2500', () => {
  const assessment = calculateThreat(sampleMetrics.locations.okc);
  expect(assessment.level).toBe('HIGH');
});
```

## Important Notes

⚠️ **These are SAMPLE files** - Production app should fetch live data from APIs.

⚠️ **Snapshots are time-bound** - Data reflects conditions at `pulledAt` timestamp.

⚠️ **Schema may change** - If APIs update their response format, these samples should be refreshed.

## Related Documentation

- `tornado_app_data_resources_v2.docx` - Full API documentation with metrics comparison
- `pull-weather-data.js` - Script that generates these files
- `test-weather-apis.js` - API testing script

---

*Last updated: March 2026*
