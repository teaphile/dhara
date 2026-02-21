# 🏔️ Dhara-Rakshak — Landslide Risk Assessment Tool

**Scientific landslide risk assessment and decision support tool for Indian hill terrain.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-0D47A1?style=for-the-badge)](https://teaphile.github.io/dhara/)

---

## 🔍 What It Does

Dhara-Rakshak analyzes landslide risk for any location using geotechnical slope stability methods, and provides:

- **Multi-method stability analysis** — Infinite Slope, Bishop, Janbu + Monte Carlo simulation
- **Interactive maps** — Site selection with satellite, topographic & street layers (Leaflet.js)
- **Risk classification** — Transparent scoring aligned with NIDM 2019 & IS 14496
- **1 km risk heatmap** — Susceptibility visualization around the selected site
- **Mitigation recommendations** — Engineering measures with cost estimates (₹) per Indian standards
- **Multilingual voice alerts** — English, Hindi, Tamil, Bengali, Regional (Pahari/Garhwali)
- **Professional PDF reports** — Downloadable geotechnical assessment reports
- **Data visualizer** — Interactive charts for all parameters and results

## 📐 Scientific Basis

| Method | Standard |
|--------|----------|
| Infinite Slope Analysis | IS 14496 (Part 2) |
| Bishop Simplified | Circular failure surfaces |
| Janbu Simplified | Non-circular failure surfaces |
| Monte Carlo Simulation | 2000 iterations, probabilistic FoS |
| Rainfall I-D Thresholds | Caine (1980), Guzzetti et al. (2008) |
| Risk Classification | NIDM 2019, GSI LHEF methodology |
| Mitigation Design | IS 14458 (Parts 1-3), IRC:SP:48 |
| Soil Classification | IS 1498:1970 |

## 🚀 Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Maps | Leaflet.js + OpenStreetMap + Esri Satellite |
| Charts | Chart.js |
| Voice | Web Speech API (browser built-in) |
| Backend | **None** — 100% client-side |
| Database | **None** — all data hardcoded in JS |
| API Keys | **None required** |

## 📦 Project Structure

```
├── index.html              ← Main entry point
├── css/
│   └── style.css           ← Complete styling (responsive)
├── js/
│   ├── app.js              ← Main orchestrator
│   ├── geotechnical-engine.js  ← Slope stability calculations
│   ├── risk-classifier.js  ← Risk scoring engine
│   ├── map-module.js       ← Leaflet map integration
│   ├── mitigation-engine.js    ← Mitigation recommendations
│   ├── charts.js           ← Chart.js visualizations
│   ├── voice-system.js     ← Multilingual voice alerts
│   └── report-generator.js ← PDF report generation
└── README.md
```

## 🌐 Deployment

This is a **static website** — just HTML, CSS, JS. No build step, no server needed.

### GitHub Pages (Recommended)
1. Push to GitHub
2. Go to **Settings → Pages**
3. Source: `main` branch, folder: `/ (root)`
4. Your site will be live at `https://<username>.github.io/<repo>/`

### Other Options
- **Netlify** — Drag & drop the folder, or connect GitHub repo
- **Vercel** — Import repo, deploy with zero config
- **Cloudflare Pages** — Connect GitHub, set root directory

## 🎯 Target Users

- Civil / Geotechnical Engineers
- District Disaster Management Authorities (DDMA)
- NDMA / SDMA officials
- Village-level disaster preparedness workers
- Students & Researchers
- NGOs working in hilly regions

## ⚠️ Disclaimer

This tool is for **decision support only**. Final engineering decisions must be approved by a certified geotechnical engineer. The tool does not replace professional site investigation.

---

*Aligned with: NIDM 2019 • IS 14496 • IS 14458 • IRC:SP:48 • IS 1498*
