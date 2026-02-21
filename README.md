# 🛡️ Dhara-Rakshak — Advanced Landslide Risk Assessment & Decision Support Tool

> **Version 3.0** · 100% Client-Side · 6 Live APIs · Multi-Method Geotechnical Analysis · Aligned to Indian Standards

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-1565C0?style=for-the-badge&logo=github)](https://teaphile.github.io/dhara/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-4CAF50?style=for-the-badge&logo=google-chrome)](https://teaphile.github.io/dhara/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Dhara-Rakshak** (धरा-रक्षक, _Earth Protector_) is an advanced, production-grade landslide risk assessment tool built entirely in the browser. It combines **real-time data from 6 free APIs** with **multi-method geotechnical analysis** (Infinite Slope, Bishop Simplified, Janbu Simplified, Monte Carlo simulation) to deliver comprehensive risk classification aligned to **NIDM 2019** and **Indian Standards (IS/IRC)**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Data Sources — 6 Live APIs](#-data-sources--6-live-apis)
- [Geotechnical Analysis Methods](#-geotechnical-analysis-methods)
- [Risk Classification System](#-risk-classification-system)
- [Mitigation Engine](#-mitigation-engine)
- [Module Reference](#-module-reference)
- [Indian Standards Compliance](#-indian-standards-compliance)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Data Flow](#-data-flow)
- [Export & Reporting](#-export--reporting)
- [Accessibility & PWA](#-accessibility--pwa)
- [Limitations & Disclaimer](#-limitations--disclaimer)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| **6 Live API Integration** | Real-time weather, elevation, seismic, soil, geocoding, and historical rainfall data — no API keys required |
| **Multi-Method FoS Analysis** | Infinite Slope (Fredlund & Rahardjo), Bishop Simplified (circular failure), Janbu Simplified (non-circular) |
| **Monte Carlo Simulation** | 2,000-iteration stochastic analysis with probability of failure estimation |
| **8-Component Risk Scoring** | Weighted composite score: geotechnical (30%), rainfall (20%), vegetation (12%), terrain (10%), seismic (10%), structural (8%), field observations (5%), weather (5%) |
| **NIDM 2019 Classification** | 5-tier risk levels mapped to NIDM zonation categories (Zone I–V) |
| **13-Measure Mitigation Engine** | Drainage, structural, bioengineering, and land management recommendations with cost estimates in ₹ |
| **Interactive Maps** | Leaflet.js maps with OSM/Topo/Satellite layers, draggable markers, 1km risk heatmap, earthquake markers |
| **17+ Chart Visualizations** | Chart.js-powered: FoS comparison, Monte Carlo histogram, sensitivity tornado, risk radar, I-D threshold, and more |
| **5-Language Voice Alerts** | Web Speech API alerts in English, Hindi, Tamil, Bengali, and Regional (Pahari/Garhwali) |
| **Professional Report Generation** | 11-section HTML report with executive summary, data tables, and compliance references |
| **Data Export** | JSON and CSV export of complete analysis results |
| **Analysis History** | Local storage persistence of past analyses with quick re-analysis |
| **PWA / Offline Support** | Service worker caching for offline access |
| **Dark Mode** | Full dark theme with system preference detection |
| **Toast Notifications** | Modern notification system replacing browser alerts |
| **Responsive Design** | Mobile-first responsive layout with hamburger navigation |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
├─────────────┬───────────────┬───────────────┬───────────────┤
│  index.html │  css/style.css│  manifest.json│    sw.js      │
│  (SPA Shell)│  (Full Theme) │  (PWA Config) │(Service Worker)│
├─────────────┴───────────────┴───────────────┴───────────────┤
│                     JavaScript Modules                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  app.js ◄──── Main Orchestrator (State, Navigation, Init)   │
│    │                                                         │
│    ├── api-service.js ◄── 6 API Fetchers + Cache (10min)    │
│    │     ├── Open-Meteo Weather API                          │
│    │     ├── Open-Meteo Historical Archive                   │
│    │     ├── Open-Meteo Elevation API                        │
│    │     ├── Nominatim Geocoding                             │
│    │     ├── USGS Earthquake Hazards                         │
│    │     └── ISRIC SoilGrids v2.0                            │
│    │                                                         │
│    ├── geotechnical-engine.js ◄── Core Analysis Engine       │
│    │     ├── SOIL_DATABASE (8 soil types, IS 1498)           │
│    │     ├── infiniteSlope()                                 │
│    │     ├── bishopSimplified()                               │
│    │     ├── janbuSimplified()                                │
│    │     ├── greenAmptInfiltration()                          │
│    │     ├── monteCarloSimulation() (2000 iterations)        │
│    │     ├── sensitivityAnalysis()                            │
│    │     ├── foundationSafetyCheck()                          │
│    │     ├── retainingWallCheck()                             │
│    │     └── KalmanFilter class                              │
│    │                                                         │
│    ├── risk-classifier.js ◄── 8-Component Weighted Scoring   │
│    │     └── NIDM 2019 Zone I–V mapping                      │
│    │                                                         │
│    ├── mitigation-engine.js ◄── 13 Measures, 4 Categories   │
│    │     └── Cost estimates, standards, monitoring plans      │
│    │                                                         │
│    ├── charts.js ◄── 17+ Chart.js Visualizations             │
│    ├── map-module.js ◄── 3 Leaflet Maps + Heatmap            │
│    ├── voice-system.js ◄── 5-Language Web Speech API         │
│    └── report-generator.js ◄── 11-Section HTML Report        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Architecture Decisions:**
- **Zero backend** — Everything runs in the browser. No server, no database, no build step.
- **IIFE Module Pattern** — Each JS file exports a singleton via `const Module = (function(){...})()` for clean encapsulation without bundlers.
- **Progressive Enhancement** — Works without APIs (static fallback data), enhanced when APIs respond. 6/6 API success is ideal, but partial data is gracefully handled.
- **Cache-First for Static Assets** — Service worker caches HTML, CSS, JS, map tiles. API responses use network-first strategy with fallback.

---

## 🌐 Data Sources — 6 Live APIs

All APIs are **free, open, and require no authentication**. Data is fetched in parallel via `Promise.allSettled()` with a 12-second timeout per request and 10-minute cache TTL.

### 1. Open-Meteo Weather API
| | |
|---|---|
| **Endpoint** | `https://api.open-meteo.com/v1/forecast` |
| **Data** | Real-time temperature, humidity, wind, precipitation, soil moisture (4 depths), weather code |
| **Derived** | 24h rainfall total, max intensity, effective duration, soil moisture average, weather severity score (0-100) |
| **Update** | Hourly |

### 2. Open-Meteo Historical Weather Archive
| | |
|---|---|
| **Endpoint** | `https://archive-api.open-meteo.com/v1/archive` |
| **Data** | Past 30 days of daily rainfall, max precipitation |
| **Derived** | Cumulative antecedent rainfall, 3-day / 7-day / 14-day / 30-day totals |
| **Use** | Antecedent moisture conditions for I-D threshold analysis |

### 3. Open-Meteo Elevation API
| | |
|---|---|
| **Endpoint** | `https://api.open-meteo.com/v1/elevation` |
| **Data** | DEM elevation (SRTM-based) for the site and 4 neighboring points |
| **Derived** | Estimated slope angle, aspect direction (N/S/E/W), relief |
| **Resolution** | ~90m (SRTM) |

### 4. Nominatim / OpenStreetMap Geocoding
| | |
|---|---|
| **Endpoint** | `https://nominatim.openstreetmap.org/reverse` |
| **Data** | Place name, administrative area, state, district |
| **Use** | Location display in results, reports, and history |

### 5. USGS Earthquake Hazards Program
| | |
|---|---|
| **Endpoint** | `https://earthquake.usgs.gov/fdsnws/event/1/query` |
| **Data** | Seismic events within 300km radius, past 1 year, magnitude ≥ 2.5 |
| **Derived** | Max magnitude, nearest event distance, significant event count (M≥4.5), seismic risk classification (LOW/MEDIUM/HIGH/VERY HIGH) |
| **Use** | Seismic component in risk scoring (10% weight) |

### 6. ISRIC SoilGrids v2.0
| | |
|---|---|
| **Endpoint** | `https://rest.isric.org/soilgrids/v2.0/properties/query` |
| **Data** | Clay%, sand%, silt%, pH, organic carbon, bulk density at 15-30cm depth |
| **Derived** | USDA textural classification, IS 1498 Indian classification, recommended soil type for analysis |
| **Resolution** | 250m |

### API Status Tracking

The app tracks API status in real-time with colored dots:
- 🟢 **Green** — Successfully fetched
- 🔴 **Red** — Failed / timeout
- 🟡 **Yellow** — Loading

Display: `"5/6 APIs | 1847ms"` in the API status bar.

---

## 🔬 Geotechnical Analysis Methods

### Factor of Safety (FoS) — 3 Methods

#### 1. Infinite Slope Method (Weight: 40%)
Based on Fredlund & Rahardjo (1993). Computes FoS for infinite planar slides:

```
FoS = [c' + (γ·z·cos²β − u)·tanφ'] / [γ·z·sinβ·cosβ]
```

Where: c' = effective cohesion (includes root cohesion), γ = unit weight, z = depth to failure, β = slope angle, u = pore water pressure, φ' = friction angle.

Includes vegetation root cohesion bonus (up to 5 kPa for > 60% cover) and rainfall saturation factor.

#### 2. Bishop Simplified Method (Weight: 35%)
Circular failure surface analysis with iterative convergence (max 50 iterations, tolerance 0.001):

```
FoS = Σ{[c'·b + (W − u·b)·tanφ'] / mα} / Σ{W·sinα}
where mα = cosα + (sinα·tanφ')/FoS
```

Uses 10 computational slices along the assumed circular failure surface.

#### 3. Janbu Simplified Method (Weight: 25%)
Non-circular failure surface analysis with correction factor:

```
FoS = f₀ · Σ{[c'·b + (W − u·b)·tanφ'] / [cos²α·(1 + tanα·tanφ'/FoS)]} / Σ{W·tanα}
```

Where f₀ is the Janbu correction factor (soil type dependent).

#### Composite FoS
```
FoS_composite = 0.40 × FoS_IS + 0.35 × FoS_Bishop + 0.25 × FoS_Janbu
```

### Monte Carlo Simulation
- **Iterations**: 2,000 per run
- **Distributions**: Gaussian for cohesion, friction angle, unit weight (using mean ± std from soil database)
- **Output**: Mean FoS, std FoS, probability of failure (P(FoS < 1.0))

### Green-Ampt Infiltration Model
Models rainfall infiltration into soil over time:

```
f(t) = Ks · (1 + Ψ·Δθ / F(t))
```

Where: Ks = saturated hydraulic conductivity, Ψ = suction head, Δθ = moisture deficit, F(t) = cumulative infiltration.

### Intensity-Duration Threshold (I-D)
Based on Caine (1980) empirical relationship:

```
I_threshold = 14.82 × D^(-0.39)
```

With modified thresholds for the Himalayan region. The current rainfall point is plotted against the threshold curve.

### Sensitivity Analysis
One-at-a-time parameter variation (±20%) for:
- Cohesion, Friction angle, Slope angle, Saturation, Unit weight

### Kalman Filter
Real-time state estimation for FoS prediction based on noisy observations. Implemented as a generic class.

### Soil Database
8 pre-calibrated soil types based on IS 1498:1970:

| Soil Type | IS Classification | Cohesion (kPa) | Friction (°) | Unit Weight (kN/m³) |
|-----------|------------------|-----------------|---------------|---------------------|
| Clayey Sand | SC (IS:1498) | 8-20 (μ=14) | 22-32 (μ=27) | 17-20 (μ=18.5) |
| Sandy Clay | CL-SC | 15-30 (μ=22) | 18-28 (μ=23) | 17-20 (μ=18.5) |
| Silty Sand | SM (IS:1498) | 3-12 (μ=7) | 26-36 (μ=31) | 16-19 (μ=17.5) |
| Laterite | ML-OH | 25-55 (μ=38) | 20-30 (μ=25) | 18-21 (μ=19.5) |
| Colluvium | GP-GC | 5-15 (μ=10) | 25-35 (μ=30) | 17-20 (μ=18.5) |
| Residual | ML-CL | 10-25 (μ=17) | 20-30 (μ=25) | 16-19 (μ=17.5) |
| Black Cotton | CH (IS:1498) | 20-50 (μ=35) | 10-22 (μ=16) | 15-19 (μ=17.0) |
| Alluvial | SM-SP | 2-8 (μ=5) | 28-38 (μ=33) | 16-19 (μ=17.5) |

---

## 📊 Risk Classification System

### 8-Component Weighted Scoring

| # | Component | Weight | Input Source | Scoring Method |
|---|-----------|--------|-------------|----------------|
| 1 | Geotechnical (FoS) | 30% | Composite FoS | FoS < 1.0 → 95, FoS > 2.0 → 5, linear interpolation |
| 2 | Rainfall (I-D) | 20% | I-D threshold ratio | Ratio ≥ 1.5 → 90, ≤ 0.3 → 10, exponential mapping |
| 3 | Vegetation | 12% | Vegetation cover % | < 10% → 90, > 80% → 5, includes deforestation risk |
| 4 | Terrain | 10% | Slope angle | > 55° → 95, < 15° → 10, elevation bonus from DEM |
| 5 | Seismic | 10% | USGS earthquake data | Based on magnitude, distance, frequency of events |
| 6 | Structural | 8% | House distance, drainage | Setback safety, drainage condition assessment |
| 7 | Field Observations | 5% | Cracks, seepage, past landslides, construction | Boolean indicators → weighted contribution |
| 8 | Weather | 5% | Live weather data | Weather severity score from current conditions |

### Risk Levels & NIDM 2019 Mapping

| Level | Score Range | NIDM Zone | IS 14496 Category | Action |
|-------|------------|-----------|-------------------|--------|
| **VERY LOW** | 0–20 | Zone I (Safe) | Category A | Routine monitoring |
| **LOW** | 20–40 | Zone II (Low) | Category B | Periodic monitoring recommended |
| **MEDIUM** | 40–60 | Zone III (Moderate) | Category C | Active management required |
| **HIGH** | 60–80 | Zone IV (High) | Category D | Immediate intervention needed |
| **CRITICAL** | 80–100 | Zone V (Critical) | Category E | Emergency evacuation recommended |

---

## 🛠️ Mitigation Engine

13 mitigation measures across 4 categories, automatically recommended based on risk level, FoS, slope angle, drainage condition, and vegetation cover:

### Drainage (4 measures)
- Surface Drainage Channels — IS 14458 Part 2
- Sub-surface Drains — IS 14458 Part 3
- Check Dams — IRC:SP:48
- Horizontal Drains

### Structural (5 measures)
- Gabion Retaining Walls — IS 14458 Part 1
- RCC Retaining Walls
- Soil Nailing
- Rock Bolting
- Shotcrete with Wire Mesh

### Bioengineering (4 measures)
- Vetiver Grass Hedgerows
- Bamboo Reinforcement
- Coir Geotextiles
- Native Species Plantation

### Land Management (3 measures)
- Terrace Construction
- Land Use Zoning
- Load Restriction

Each measure includes: description, design concept, installation method, cost estimate (₹), lifespan, maintenance schedule, risk reduction percentage, and applicable standards.

### Monitoring Plan
Automatically generated based on risk level:
- **HIGH/CRITICAL**: Inclinometers (daily), piezometers (daily), rain gauges (continuous), crack monitors (daily)
- **MEDIUM**: Monthly monitoring cycle
- **LOW**: Quarterly visual inspections

---

## 📦 Module Reference

| Module | File | LOC | Purpose |
|--------|------|-----|---------|
| **App** | `js/app.js` | ~1300 | Main orchestrator — state management, navigation, UI rendering, toast system, export, history |
| **API Service** | `js/api-service.js` | ~800 | 6 API fetchers, `Promise.allSettled()` parallel execution, 10-min cache, `AbortController` timeout |
| **Geotechnical Engine** | `js/geotechnical-engine.js` | ~1185 | Core analysis — 3 FoS methods, Monte Carlo, Green-Ampt, Kalman filter, soil database |
| **Risk Classifier** | `js/risk-classifier.js` | ~550 | 8-component weighted scoring, NIDM 2019 mapping, confidence assessment |
| **Charts** | `js/charts.js` | ~1242 | 17+ Chart.js visualizations — bar, radar, doughnut, line, scatter, bubble charts |
| **Map Module** | `js/map-module.js` | ~521 | Leaflet.js maps — primary site, risk heatmap, satellite view, earthquake markers |
| **Mitigation Engine** | `js/mitigation-engine.js` | ~656 | 13 mitigation measures, monitoring plans, outcome analysis |
| **Voice System** | `js/voice-system.js` | ~400 | Web Speech API — 5 languages, 4 risk levels × 3 message types |
| **Report Generator** | `js/report-generator.js` | ~439 | 11-section professional HTML report generation |

---

## 🇮🇳 Indian Standards Compliance

| Standard | Application in Tool |
|----------|-------------------|
| **IS 14496 (Part 2): 1998** | Preparation of landslide hazard zonation maps — risk classification criteria |
| **IS 14458 (Part 1): 1998** | Retaining wall design guidelines — mitigation structural recommendations |
| **IS 14458 (Part 2): 1997** | Surface drainage in landslide areas — drainage mitigation measures |
| **IS 14458 (Part 3): 1998** | Sub-surface drainage in landslide areas — drainage recommendations |
| **IRC:SP:48** | Hill road construction and maintenance — foundation setback requirements |
| **IS 1498: 1970** | Soil classification system — soil database type classification |
| **NIDM 2019** | National Institute of Disaster Management guidelines — 5-tier risk-to-zone mapping |

---

## 🔧 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **UI** | Vanilla HTML5 / CSS3 / ES6 JavaScript | — |
| **Maps** | Leaflet.js | 1.9.4 |
| **Heatmap** | leaflet.heat | 0.2.0 |
| **Charts** | Chart.js | 4.4.0 |
| **Chart Plugins** | chartjs-plugin-annotation | 3.0.1 |
| **Voice** | Web Speech API | Browser native |
| **PWA** | Service Worker + manifest.json | — |
| **Deployment** | GitHub Pages (static hosting) | — |

**No build tools, no bundlers, no frameworks, no node_modules.** Just open `index.html`.

---

## 🚀 Getting Started

### Option 1: Live Demo
Visit **[https://teaphile.github.io/dhara/](https://teaphile.github.io/dhara/)** — nothing to install.

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/teaphile/dhara.git
cd dhara

# Open directly in browser (no build step needed)
open index.html
# or
python -m http.server 8080  # then visit http://localhost:8080

# For VSCode Live Server
# Install "Live Server" extension → Right-click index.html → "Open with Live Server"
```

### Option 3: Run Anywhere
Since this is 100% client-side with no dependencies:
- Copy the entire folder to any web server
- Upload to any static hosting (Netlify, Vercel, Cloudflare Pages)
- Open `index.html` directly from the file system (some APIs may require HTTP due to CORS)

---

## 📁 Project Structure

```
dhara/
├── index.html              # SPA shell — 8 page sections, sidebar nav, forms
├── manifest.json           # PWA manifest with app metadata
├── sw.js                   # Service worker — cache-first (static), network-first (APIs)
├── README.md               # This file
│
├── css/
│   └── style.css           # Complete stylesheet — CSS variables, dark mode, responsive,
│                           #   toast notifications, history panel, validation, accessibility
│
└── js/
    ├── app.js              # Main orchestrator — state, nav, toast, export, history, init
    ├── api-service.js      # 6 API integrations — parallel fetch, caching, status tracking
    ├── geotechnical-engine.js  # Core engine — FoS (3 methods), Monte Carlo, Green-Ampt
    ├── risk-classifier.js  # 8-component weighted risk scoring, NIDM classification
    ├── charts.js           # 17+ Chart.js visualizations
    ├── map-module.js       # Leaflet maps — site, heatmap, satellite, earthquake markers
    ├── mitigation-engine.js# 13 mitigation measures, monitoring, outcome analysis
    ├── voice-system.js     # 5-language voice alerts (Web Speech API)
    └── report-generator.js # Professional 11-section HTML report generation
```

---

## 🔄 Data Flow

```
User Input (Lat/Lon + Parameters)
        │
        ▼
┌─────────────────────────┐
│    api-service.js        │ ──► 6 API calls in parallel (Promise.allSettled)
│    fetchAllLiveData()    │     with 12s timeout + 10min cache
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│    app.js                │ ──► autoFillFromLiveData() — populate sliders
│    performAnalysis()     │     from API responses (rainfall, slope, soil)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  geotechnical-engine.js  │ ──► runComprehensiveAnalysis()
│  3 FoS + Monte Carlo +  │     Returns: FoS, infiltration, sensitivity,
│  Green-Ampt + I-D check │     foundation check, retaining wall analysis
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  risk-classifier.js      │ ──► classifyRisk() — 8 components, weighted
│  8-component scoring     │     Returns: composite score, level, NIDM zone
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  mitigation-engine.js    │ ──► recommendMitigation() — selects measures
│  13 measures + outcome   │     getOutcomeAnalysis() — before/after FoS
└────────┬────────────────┘
         │
         ▼
┌──────┬──────┬──────┬──────┬──────┐
│Charts│ Maps │Voice │Report│ Dash │  ──► All visualization modules
│17+   │3 maps│5 lang│ HTML │History│     render from analysis results
└──────┴──────┴──────┴──────┴──────┘
```

---

## 📤 Export & Reporting

### HTML Report
Professional 11-section report generated in-browser:
1. Executive Summary
2. Site Data & Location
3. Geotechnical Analysis (3 FoS methods)
4. Hydrological Analysis (Green-Ampt, I-D threshold)
5. Risk Classification (8 components)
6. Stochastic Analysis (Monte Carlo)
7. Structural Assessment (foundation, retaining wall)
8. Mitigation Recommendations
9. Outcome Analysis (before vs after)
10. Environmental Assessment
11. Live Data Sources (API attribution)

### JSON Export
Complete analysis payload including all inputs, computed results, risk scores, mitigation recommendations, and metadata. Machine-readable format suitable for integration with other systems.

### CSV Export
Tabular format with key parameters and results — importable to Excel, Google Sheets, or any data analysis tool.

---

## ♿ Accessibility & PWA

### Accessibility
- Skip-to-content link for keyboard users
- ARIA labels on interactive elements
- `:focus-visible` styling for keyboard navigation
- Toast notifications with `role="alert"` for screen readers
- Semantic HTML structure
- High contrast in both light and dark modes

### Progressive Web App
- **Service Worker**: Cache-first for static assets, network-first for APIs
- **Manifest**: Standalone display, custom theme color, installable
- **Offline**: Core functionality works offline with cached data
- Keyboard shortcuts: `Ctrl+Enter` (run analysis), `Escape` (close menus)

---

## ⚠️ Limitations & Disclaimer

### Technical Limitations
- **Heatmap is simulated**: The 1km risk heatmap uses probabilistic modeling based on site analysis, not pixel-level terrain data
- **Satellite vegetation estimation**: Green cover percentage is a proxy calculated from latitude, slope angle, and rainfall zone — not actual satellite imagery classification
- **Elevation data resolution**: ~90m (SRTM via Open-Meteo) — not suitable for micro-topographic analysis
- **Soil data resolution**: 250m (ISRIC SoilGrids) — may not capture local variability
- **Bishop convergence**: The simplified method may not converge for extreme parameter combinations
- **No field validation**: Results are based on input parameters and API data only

### Professional Disclaimer
> **⚠️ THIS TOOL IS FOR PRELIMINARY ASSESSMENT AND EDUCATIONAL PURPOSES ONLY.**
>
> It does **NOT** replace professional geotechnical investigation, field surveys, laboratory testing, or engineering judgment. All results must be verified by a **licensed geotechnical engineer** before any construction, mitigation, or evacuation decisions are made.
>
> The developers assume **no liability** for decisions made based on this tool's output. Always consult IS 14496, IRC:SP:48, and relevant BIS codes for formal landslide hazard zonation.

---

## 🤝 Contributing

Contributions are welcome! Areas where help is needed:

1. **Real satellite imagery integration** — Replace proxy-based vegetation estimation with actual NDVI data
2. **Higher-resolution DEM** — Integrate ALOS PALSAR or Copernicus DEM for better slope estimation
3. **Regional I-D thresholds** — Add empirically calibrated thresholds for specific Indian regions
4. **Field data integration** — Support for inclinometer, piezometer, and rain gauge data input
5. **Multi-language UI** — Extend the interface (not just voice) to Hindi, Tamil, Bengali, etc.
6. **Automated testing** — Unit tests for geotechnical calculations
7. **GIS export** — GeoJSON / KML export for integration with QGIS, ArcGIS

### Development Notes
- No build step required — edit files directly
- Test by opening `index.html` in a browser or using a local HTTP server
- All modules use the IIFE pattern — add functions inside the module closure and expose via the return object

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

<div align="center">

**Dhara-Rakshak v3.0** — _Protecting Earth, Protecting Lives_

धरा-रक्षक — _पृथ्वी की रक्षा, जीवन की रक्षा_

Made with precision for landslide-prone regions of India 🇮🇳

</div>
