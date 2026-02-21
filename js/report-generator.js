/**
 * ============================================================================
 * DHARA-RAKSHAK — Report Generator
 * ============================================================================
 * Generates professional PDF-style HTML reports for download.
 * ============================================================================
 */

const ReportGenerator = (function () {
    'use strict';

    function generateFullReport(siteData, analysisResults, riskAssessment, recommendations, outcome) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN');
        const soil = analysisResults.soilProperties || {};
        const cls = riskAssessment?.classification || {};
        const prob = riskAssessment?.probabilityIndex || {};
        const conf = riskAssessment?.confidence || {};

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dhara-Rakshak — Geotechnical Risk Assessment Report</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #222; line-height: 1.7; font-size: 13px; background: #fff; }
    .page { max-width: 850px; margin: 0 auto; padding: 40px 50px; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 4px solid #0D47A1; margin-bottom: 30px; }
    .header h1 { font-size: 26px; color: #0D47A1; letter-spacing: 3px; text-transform: uppercase; }
    .header .subtitle { font-size: 14px; color: #555; margin-top: 4px; }
    .header .meta { font-size: 11px; color: #888; margin-top: 10px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 16px; color: #0D47A1; border-bottom: 2px solid #E0E0E0; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .section h3 { font-size: 13px; color: #333; margin: 12px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #0A2E6E; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
    td { padding: 7px 12px; border-bottom: 1px solid #E0E0E0; }
    tr:nth-child(even) { background: #F8F9FA; }
    .risk-box { padding: 16px 20px; border-radius: 8px; text-align: center; margin: 16px 0; font-weight: 700; font-size: 18px; }
    .risk-critical { background: #FFCDD2; color: #B71C1C; border: 2px solid #B71C1C; }
    .risk-high { background: #FFEBEE; color: #D32F2F; border: 2px solid #D32F2F; }
    .risk-medium { background: #FFF3E0; color: #E65100; border: 2px solid #F57F17; }
    .risk-low { background: #E8F5E9; color: #1B5E20; border: 2px solid #2E7D32; }
    .eq { background: #F5F5F5; border: 1px solid #DDD; padding: 12px; margin: 10px 0; font-family: 'Consolas', monospace; font-size: 12px; text-align: center; border-radius: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .disclaimer { background: #FFF8E1; border: 1px solid #FFE082; padding: 14px; margin: 20px 0; border-radius: 6px; font-size: 11px; color: #795548; }
    .footer { text-align: center; padding-top: 20px; border-top: 2px solid #0D47A1; margin-top: 40px; font-size: 10px; color: #888; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    ul { padding-left: 20px; }
    li { margin: 3px 0; }
    @media print { .page { padding: 20px; } }
</style>
</head>
<body>
<div class="page">

    <!-- HEADER -->
    <div class="header">
        <h1>DHARA-RAKSHAK</h1>
        <div class="subtitle">Integrated Landslide Risk Assessment & Mitigation Report</div>
        <div class="meta">
            Generated: ${dateStr} at ${timeStr} | System Version: 2.0 | Classification: OFFICIAL<br>
            Aligned: NIDM 2019 • IS 14496 • IRC:SP:48 • BIS Codes
        </div>
    </div>

    <!-- 1. EXECUTIVE SUMMARY -->
    <div class="section">
        <h2>1. Executive Summary</h2>
        <p>This report presents a comprehensive multi-disciplinary landslide risk assessment for the specified site. Analysis integrates geotechnical stability (Infinite Slope, Bishop, Janbu methods), hydrological models (Green-Ampt infiltration, I-D thresholds), environmental assessment (vegetation factor, NDVI proxy), and stochastic reliability analysis (Monte Carlo simulation, ${analysisResults.monteCarlo?.iterations || 2000} iterations).</p>
        <div class="risk-box risk-${(cls.level || 'medium').toLowerCase()}">${cls.label || 'Risk Assessment'} — Composite Score: ${riskAssessment?.compositeScore || 'N/A'}/100</div>
        <p><strong>Action Required:</strong> ${cls.action || 'See detailed recommendations below.'}</p>
    </div>

    <!-- 2. SITE DATA -->
    <div class="section">
        <h2>2. Site Input Data</h2>
        <div class="grid-2">
            <table>
                <tr><th colspan="2">Mandatory Parameters</th></tr>
                <tr><td>Location</td><td>${siteData.location?.name || siteData.location?.lat?.toFixed(4) + ', ' + siteData.location?.lon?.toFixed(4) || 'Not specified'}</td></tr>
                <tr><td>Slope Angle</td><td>${siteData.slopeAngle || 'N/A'}°</td></tr>
                <tr><td>Soil Type</td><td>${soil.name || siteData.soilType || 'N/A'} (${soil.classification || ''})</td></tr>
                <tr><td>Vegetation Cover</td><td>${siteData.vegetationPct || 'N/A'}%</td></tr>
                <tr><td>Rainfall Intensity</td><td>${siteData.rainfallIntensity || 'N/A'} mm/hr</td></tr>
                <tr><td>Rainfall Duration</td><td>${siteData.rainfallDuration || 'N/A'} hr</td></tr>
                <tr><td>House/Road Distance</td><td>${siteData.houseDistance || 'N/A'} m</td></tr>
                <tr><td>Drainage Condition</td><td>${siteData.drainageCondition || 'N/A'}</td></tr>
                <tr><td>Saturation</td><td>${siteData.saturation || 'N/A'}%</td></tr>
            </table>
            <table>
                <tr><th colspan="2">Field Observations</th></tr>
                <tr><td>Cracks Observed</td><td>${siteData.cracks ? 'Yes' : 'No'}</td></tr>
                <tr><td>Seepage</td><td>${siteData.seepage ? 'Yes' : 'No'}</td></tr>
                <tr><td>Past Landslides</td><td>${siteData.pastLandslides ? 'Yes' : 'No'}</td></tr>
                <tr><td>Construction Activity</td><td>${siteData.construction ? 'Yes' : 'No'}</td></tr>
                <tr><th colspan="2">Soil Properties (${soil.classification || 'N/A'})</th></tr>
                <tr><td>Cohesion (c')</td><td>${soil.cohesion?.mean || 'N/A'} ± ${soil.cohesion?.stddev || 'N/A'} kPa</td></tr>
                <tr><td>Friction Angle (φ')</td><td>${soil.friction?.mean || 'N/A'} ± ${soil.friction?.stddev || 'N/A'}°</td></tr>
                <tr><td>Unit Weight (γ)</td><td>${soil.unitWeight?.mean || 'N/A'} ± ${soil.unitWeight?.stddev || 'N/A'} kN/m³</td></tr>
                <tr><td>Permeability (K)</td><td>${soil.permeability?.mean || 'N/A'} m/s</td></tr>
            </table>
        </div>
    </div>

    <!-- 3. GEOTECHNICAL ANALYSIS -->
    <div class="section">
        <h2>3. Geotechnical Stability Analysis</h2>
        <div class="eq">
            <div style="font-size:10px;color:#888;margin-bottom:4px">INFINITE SLOPE METHOD (IS 14496 Part 2)</div>
            FoS = [c' + (γz·cos²β − u)·tan φ'] / [γz·sin β·cos β]
        </div>
        <table>
            <tr><th>Method</th><th>Factor of Safety</th><th>Status</th><th>Reference</th></tr>
            <tr>
                <td>Infinite Slope</td>
                <td><strong>${analysisResults.infiniteSlope?.fos?.toFixed(4) || 'N/A'}</strong></td>
                <td>${getFoSStatus(analysisResults.infiniteSlope?.fos)}</td>
                <td>IS 14496 Part 2</td>
            </tr>
            <tr>
                <td>Bishop Simplified</td>
                <td><strong>${analysisResults.bishop?.fos?.toFixed(4) || 'N/A'}</strong></td>
                <td>${getFoSStatus(analysisResults.bishop?.fos)}</td>
                <td>Bishop (1955)</td>
            </tr>
            <tr>
                <td>Janbu Simplified</td>
                <td><strong>${analysisResults.janbu?.fos?.toFixed(4) || 'N/A'}</strong></td>
                <td>${getFoSStatus(analysisResults.janbu?.fos)}</td>
                <td>Janbu (1973)</td>
            </tr>
            <tr style="background:#E3F2FD">
                <td><strong>Composite FoS (Weighted)</strong></td>
                <td><strong>${analysisResults.compositeFoS?.toFixed(4) || 'N/A'}</strong></td>
                <td>${getFoSStatus(analysisResults.compositeFoS)}</td>
                <td>40% IS + 35% Bishop + 25% Janbu</td>
            </tr>
        </table>
        <h3>Stress Analysis</h3>
        <table>
            <tr><td>Effective Cohesion (c'_eff)</td><td>${analysisResults.infiniteSlope?.c_eff?.toFixed(2) || 'N/A'} kPa</td></tr>
            <tr><td>Normal Stress (σ_n)</td><td>${analysisResults.infiniteSlope?.sigma_n?.toFixed(2) || 'N/A'} kPa</td></tr>
            <tr><td>Effective Normal Stress (σ')</td><td>${analysisResults.infiniteSlope?.sigma_prime?.toFixed(2) || 'N/A'} kPa</td></tr>
            <tr><td>Pore Water Pressure (u)</td><td>${analysisResults.infiniteSlope?.pore_pressure?.toFixed(2) || 'N/A'} kPa</td></tr>
            <tr><td>Resisting Force</td><td>${analysisResults.infiniteSlope?.resisting?.toFixed(2) || 'N/A'} kPa</td></tr>
            <tr><td>Driving Force</td><td>${analysisResults.infiniteSlope?.driving?.toFixed(2) || 'N/A'} kPa</td></tr>
        </table>
    </div>

    <!-- 4. HYDROLOGICAL ANALYSIS -->
    <div class="section">
        <h2>4. Hydrological Analysis</h2>
        <h3>Rainfall Intensity-Duration Threshold</h3>
        <div class="eq">
            <div style="font-size:10px;color:#888;margin-bottom:4px">CAINE (1980) GLOBAL</div>
            I = 14.82 × D<sup>−0.39</sup> &nbsp;&nbsp;|&nbsp;&nbsp; Himalayan: I = 9.0 × D<sup>−0.25</sup>
        </div>
        <table>
            <tr><td>Current Intensity</td><td>${analysisResults.rainfallThreshold?.current_intensity || 'N/A'} mm/hr</td></tr>
            <tr><td>Current Duration</td><td>${analysisResults.rainfallThreshold?.current_duration || 'N/A'} hr</td></tr>
            <tr><td>Caine Threshold</td><td>${analysisResults.rainfallThreshold?.threshold_caine || 'N/A'} mm/hr</td></tr>
            <tr><td>Himalayan Threshold</td><td>${analysisResults.rainfallThreshold?.threshold_himalaya || 'N/A'} mm/hr</td></tr>
            <tr><td>Status</td><td><strong>${analysisResults.rainfallThreshold?.status || 'N/A'}</strong></td></tr>
        </table>
        <h3>Green-Ampt Infiltration</h3>
        <table>
            <tr><td>Cumulative Infiltration</td><td>${analysisResults.infiltration?.cumulative_infiltration_mm || 'N/A'} mm</td></tr>
            <tr><td>Final Infiltration Rate</td><td>${analysisResults.infiltration?.final_rate_mmhr || 'N/A'} mm/hr</td></tr>
            <tr><td>Surface Saturation Time</td><td>${analysisResults.infiltration?.saturation_time_hr ? analysisResults.infiltration.saturation_time_hr + ' hr' : 'Not reached'}</td></tr>
            <tr><td>Runoff Onset</td><td>${analysisResults.infiltration?.runoff_onset ? 'Yes' : 'No'}</td></tr>
        </table>
    </div>

    <!-- 5. RISK CLASSIFICATION -->
    <div class="section">
        <h2>5. Risk Classification (NIDM-Aligned)</h2>
        <table>
            <tr><th>FoS Range</th><th>Rainfall</th><th>Vegetation</th><th>Risk Level</th></tr>
            <tr><td>> 1.5</td><td>Low</td><td>High (>60%)</td><td style="color:#2E7D32;font-weight:700">LOW</td></tr>
            <tr><td>1.2 – 1.5</td><td>Moderate</td><td>Medium (30-60%)</td><td style="color:#F57F17;font-weight:700">MEDIUM</td></tr>
            <tr><td>< 1.2</td><td>High</td><td>Low (<30%)</td><td style="color:#D32F2F;font-weight:700">HIGH</td></tr>
        </table>
        <h3>Current Site Assessment</h3>
        <table>
            <tr><td>Composite Risk Score</td><td><strong>${riskAssessment?.compositeScore || 'N/A'} / 100</strong></td></tr>
            <tr><td>Classification</td><td><strong>${cls.label || 'N/A'}</strong> (${cls.nidmCategory || ''})</td></tr>
            <tr><td>Combined Probability Index</td><td>${prob.combined || 'N/A'}</td></tr>
            <tr><td>Annual Probability</td><td>${prob.annualProbability || 'N/A'}</td></tr>
            <tr><td>Return Period</td><td>${prob.returnPeriod_years || 'N/A'} years</td></tr>
            <tr><td>Confidence Level</td><td>${conf.level || 'N/A'} (${conf.percentage || 0}% — ${conf.dataPointsAvailable || 0}/${conf.dataPointsMaximum || 10} data points)</td></tr>
        </table>
        ${renderComponentTable(riskAssessment)}
    </div>

    <!-- 6. STOCHASTIC ANALYSIS -->
    <div class="section">
        <h2>6. Stochastic Reliability Analysis</h2>
        <h3>Monte Carlo Simulation</h3>
        <table>
            <tr><td>Iterations</td><td>${analysisResults.monteCarlo?.iterations || 'N/A'}</td></tr>
            <tr><td>Mean FoS</td><td>${analysisResults.monteCarlo?.mean_fos || 'N/A'}</td></tr>
            <tr><td>Std Deviation</td><td>${analysisResults.monteCarlo?.std_fos || 'N/A'}</td></tr>
            <tr><td>Min FoS</td><td>${analysisResults.monteCarlo?.min_fos || 'N/A'}</td></tr>
            <tr><td>Max FoS</td><td>${analysisResults.monteCarlo?.max_fos || 'N/A'}</td></tr>
            <tr><td>Probability of Failure</td><td><strong>${analysisResults.monteCarlo?.probability_of_failure || 'N/A'}%</strong></td></tr>
            <tr><td>Reliability Index (β)</td><td>${analysisResults.monteCarlo?.reliability_index || 'N/A'}</td></tr>
        </table>
        <h3>Sensitivity Analysis</h3>
        <p>Most Sensitive Parameter: <strong>${analysisResults.sensitivity?.mostSensitiveLabel || 'N/A'}</strong></p>
        ${renderSensitivityTable(analysisResults.sensitivity)}
    </div>

    <!-- 7. STRUCTURAL ASSESSMENT -->
    <div class="section">
        <h2>7. Structural & Foundation Safety</h2>
        <table>
            <tr><td>Setback (IS 14458)</td><td>${analysisResults.foundation?.minSetback_IS || 'N/A'} m</td></tr>
            <tr><td>Setback (IRC:SP:48)</td><td>${analysisResults.foundation?.minSetback_IRC || 'N/A'} m</td></tr>
            <tr><td>Required Setback</td><td>${analysisResults.foundation?.effectiveSetback || 'N/A'} m</td></tr>
            <tr><td>Actual Setback</td><td>${analysisResults.foundation?.actualSetback || 'N/A'} m</td></tr>
            <tr><td>Status</td><td><strong>${analysisResults.foundation?.isSetbackSafe ? 'SAFE' : 'UNSAFE'}</strong></td></tr>
            <tr><td>Bearing Capacity Reduction</td><td>${analysisResults.foundation?.bearingCapacityReduction || 'N/A'}%</td></tr>
        </table>
        <p>${analysisResults.foundation?.recommendation || ''}</p>
    </div>

    <!-- 8. MITIGATION RECOMMENDATIONS -->
    <div class="section">
        <h2>8. Mitigation Recommendations</h2>
        ${renderMitigationSection('Immediate Actions (0-30 days)', recommendations?.immediate)}
        ${renderMitigationSection('Short-Term Measures (1-6 months)', recommendations?.shortTerm)}
        ${renderMitigationSection('Long-Term Measures (6-24 months)', recommendations?.longTerm)}
        <h3>Monitoring Plan</h3>
        ${renderMonitoringTable(recommendations?.monitoring)}
        <p><strong>Expected Combined Risk Reduction:</strong> ${recommendations?.expectedRiskReduction || 'N/A'}%</p>
    </div>

    <!-- 9. OUTCOME ANALYSIS -->
    <div class="section">
        <h2>9. Outcome & Impact Analysis</h2>
        ${outcome ? `
        <div class="grid-2">
            <div style="background:#FFEBEE;padding:16px;border-radius:8px;text-align:center">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Before Mitigation</div>
                <div style="font-size:28px;font-weight:700;color:#D32F2F;margin:8px 0">${outcome.before.fos}</div>
                <div style="font-size:12px">Failure Probability: ${outcome.before.failureProbability}</div>
                <div style="font-size:11px;color:#D32F2F;font-weight:600">${outcome.before.riskLabel}</div>
            </div>
            <div style="background:#E8F5E9;padding:16px;border-radius:8px;text-align:center">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">After Mitigation</div>
                <div style="font-size:28px;font-weight:700;color:#2E7D32;margin:8px 0">${outcome.after.fos}</div>
                <div style="font-size:12px">FoS Range: ${outcome.after.fosRange}</div>
                <div style="font-size:12px">Failure Probability: ${outcome.after.failureProbability}</div>
                <div style="font-size:11px;color:#2E7D32;font-weight:600">${outcome.after.riskLabel}</div>
            </div>
        </div>
        <table style="margin-top:14px">
            <tr><td>FoS Improvement</td><td>+${outcome.improvement.fosIncrease} (Range: ${outcome.improvement.fosIncreaseRange})</td></tr>
            <tr><td>Probability Reduction</td><td>${outcome.improvement.probabilityReduction}</td></tr>
            <tr><td>Risk Reduction</td><td><strong>${outcome.improvement.riskReductionPct}%</strong></td></tr>
        </table>
        <p style="font-size:11px;color:#795548;margin-top:8px">${outcome.note}</p>
        ` : '<p>Outcome analysis not available.</p>'}
    </div>

    <!-- 10. VEGETATION ASSESSMENT -->
    <div class="section">
        <h2>10. Environmental Assessment</h2>
        <table>
            <tr><td>Vegetation Cover</td><td>${analysisResults.vegetation?.vegetationPct || 'N/A'}%</td></tr>
            <tr><td>Category</td><td>${analysisResults.vegetation?.category || 'N/A'}</td></tr>
            <tr><td>NDVI Estimate</td><td>${analysisResults.vegetation?.ndvi_estimate || 'N/A'}</td></tr>
            <tr><td>Root Cohesion Addition</td><td>${analysisResults.vegetation?.rootCohesion || 'N/A'} kPa</td></tr>
            <tr><td>Tree Density Estimate</td><td>${analysisResults.vegetation?.treeDensity_est || 'N/A'} trees/ha</td></tr>
            <tr><td>Deforestation Risk</td><td>${analysisResults.vegetation?.deforestationRisk || 'N/A'}</td></tr>
        </table>
    </div>

    <!-- 11. LIVE DATA SOURCES -->
    <div class="section">
        <h2>11. Live Data Sources</h2>
        ${renderLiveDataSources(analysisResults)}
    </div>

    <!-- DISCLAIMER -->
    <div class="disclaimer">
        <strong>Engineering Disclaimer</strong><br>
        This report is generated by the Dhara-Rakshak Decision Support System for preliminary assessment purposes only. All analysis results, risk classifications, and mitigation recommendations must be reviewed, validated, and approved by a certified geotechnical engineer before any implementation. The system uses published soil property ranges from IS 1498/IS 2720 — site-specific laboratory testing is recommended for detailed design. No autonomous decisions are made by this system. AI is used only for pattern recognition, visualization, and optimization. Final engineering approval is mandatory as per NIDM 2019 guidelines.
        <br><br>
        <strong>Standards Referenced:</strong> IS 14496 (Part 2), IS 14458 (Parts 1-3), IRC:SP:48-1998, IS 456:2000, IS 1904:1986, NIDM 2019, NDMA Guidelines
        <br>
        <strong>Data Policy:</strong> No artificial data generated. Missing values marked. All soil parameters from IS code database.
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <strong>DHARA-RAKSHAK</strong> — Integrated Landslide Risk Assessment System<br>
        © ${now.getFullYear()} | Developed for Indian Municipal & Disaster Authorities<br>
        Report ID: DR-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.random().toString(36).substr(2,6).toUpperCase()}
    </div>
</div>
</body>
</html>`;

        return html;
    }

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    function getFoSStatus(fos) {
        if (fos == null) return 'N/A';
        if (fos >= 1.5) return '<span style="color:#2E7D32;font-weight:600">SAFE</span>';
        if (fos >= 1.2) return '<span style="color:#F57F17;font-weight:600">MARGINAL</span>';
        if (fos >= 1.0) return '<span style="color:#E65100;font-weight:600">UNSTABLE</span>';
        return '<span style="color:#D32F2F;font-weight:600">FAILURE</span>';
    }

    function renderComponentTable(ra) {
        if (!ra?.components) return '';
        const comp = ra.components;
        let html = '<h3>Risk Component Breakdown</h3><table><tr><th>Component</th><th>Score</th><th>Weight</th><th>Weighted</th><th>Input</th></tr>';
        for (const [key, val] of Object.entries(comp)) {
            html += `<tr><td>${key.charAt(0).toUpperCase() + key.slice(1)}</td><td>${val.score}</td><td>${(val.weight*100).toFixed(0)}%</td><td>${val.weighted}</td><td>${val.input}</td></tr>`;
        }
        html += '</table>';
        return html;
    }

    function renderLiveDataSources(analysisResults) {
        var ds = analysisResults.dataSourcesUsed;
        if (!ds) return '<p>No live data sources were used for this analysis. All parameters from user input and IS code database.</p>';

        var sources = [
            { name: 'Open-Meteo Weather API', used: ds.openMeteoWeather, url: 'https://open-meteo.com/', desc: 'Real-time temperature, humidity, rainfall, wind, soil moisture' },
            { name: 'Open-Meteo Historical Archive', used: ds.openMeteoHistorical, url: 'https://open-meteo.com/', desc: '90-day antecedent rainfall analysis' },
            { name: 'Open-Meteo Elevation API', used: ds.openMeteoElevation, url: 'https://open-meteo.com/', desc: 'DEM-based elevation and slope estimation' },
            { name: 'USGS Earthquake Hazards', used: ds.usgsEarthquakes, url: 'https://earthquake.usgs.gov/', desc: 'Seismic events within 300km radius (past 1 year)' },
            { name: 'ISRIC SoilGrids v2.0', used: ds.soilGrids, url: 'https://soilgrids.org/', desc: 'Real soil composition (clay%, sand%, pH, bulk density) at 250m resolution' },
            { name: 'Nominatim/OpenStreetMap', used: ds.nominatimGeocode, url: 'https://nominatim.openstreetmap.org/', desc: 'Reverse geocoding for location identification' }
        ];

        var html = '<table><tr><th>Data Source</th><th>Status</th><th>Description</th></tr>';
        for (var i = 0; i < sources.length; i++) {
            var s = sources[i];
            html += '<tr><td><a href="' + s.url + '" target="_blank">' + s.name + '</a></td>' +
                '<td style="color:' + (s.used ? '#2E7D32' : '#999') + ';font-weight:600">' + (s.used ? '✓ USED' : '✗ NOT AVAILABLE') + '</td>' +
                '<td>' + s.desc + '</td></tr>';
        }
        html += '</table>';

        if (analysisResults.elevation) {
            html += '<p style="margin-top:8px;font-size:11px">Elevation: <strong>' + analysisResults.elevation + 'm</strong>';
            if (analysisResults.locationName) html += ' | Location: <strong>' + analysisResults.locationName + '</strong>';
            html += '</p>';
        }
        if (analysisResults.seismicNote) {
            html += '<p style="font-size:11px">Seismic: ' + analysisResults.seismicNote + '</p>';
        }

        html += '<p style="font-size:10px;color:#888;margin-top:8px"><em>All APIs are free, open-access, and require no API keys. Data freshness depends on API availability at analysis time.</em></p>';
        return html;
    }

    function renderSensitivityTable(sens) {
        if (!sens?.results) return '<p>Sensitivity analysis not performed.</p>';
        let html = '<table><tr><th>Parameter</th><th>Base Value</th><th>FoS (+10%)</th><th>FoS (-10%)</th><th>Swing</th><th>Sensitivity %</th></tr>';
        for (const key of sens.sortedKeys) {
            const r = sens.results[key];
            html += `<tr><td>${r.label}</td><td>${r.baseValue}</td><td>${r.fos_high}</td><td>${r.fos_low}</td><td>${r.swing}</td><td>${r.sensitivity_pct}%</td></tr>`;
        }
        html += '</table>';
        return html;
    }

    function renderMitigationSection(title, measures) {
        if (!measures || measures.length === 0) return `<h3>${title}</h3><p>No measures recommended for this timeframe.</p>`;
        let html = `<h3>${title}</h3>`;
        for (const m of measures) {
            html += `<div style="border:1px solid #E0E0E0;border-radius:6px;padding:14px;margin:10px 0">
                <div style="font-weight:700;font-size:13px;margin-bottom:6px">${m.name} <span class="badge" style="background:${m.priority === 'CRITICAL' ? '#FFCDD2' : m.priority === 'HIGH' ? '#FFF3E0' : '#E8F5E9'};color:${m.priority === 'CRITICAL' ? '#B71C1C' : m.priority === 'HIGH' ? '#E65100' : '#1B5E20'}">${m.priority}</span></div>
                <p style="font-size:12px;color:#555;margin-bottom:8px">${m.description}</p>
                <table>
                    <tr><td><strong>Design Concept</strong></td><td>${m.designConcept}</td></tr>
                    <tr><td><strong>Installation</strong></td><td>${m.installationMethod?.replace(/\n/g, '<br>')}</td></tr>
                    <tr><td><strong>Cost Estimate</strong></td><td>${formatCost(m.costEstimate)}</td></tr>
                    <tr><td><strong>Life Span</strong></td><td>${m.lifeSpan}</td></tr>
                    <tr><td><strong>Maintenance</strong></td><td>${m.maintenance}</td></tr>
                    <tr><td><strong>Risk Reduction</strong></td><td>${m.riskReduction}%</td></tr>
                    <tr><td><strong>Standards</strong></td><td>${m.standards?.join(', ') || 'N/A'}</td></tr>
                </table>
                <p style="font-size:11px;color:#888;margin-top:4px"><em>Reason: ${m.reason}</em></p>
            </div>`;
        }
        return html;
    }

    function renderMonitoringTable(monitoring) {
        if (!monitoring || monitoring.length === 0) return '<p>No monitoring instruments recommended.</p>';
        let html = '<table><tr><th>Instrument</th><th>Frequency</th><th>Purpose</th><th>Est. Cost</th></tr>';
        for (const m of monitoring) {
            html += `<tr><td>${m.instrument}</td><td>${m.frequency}</td><td>${m.purpose}</td><td>${m.cost}</td></tr>`;
        }
        html += '</table>';
        return html;
    }

    function formatCost(cost) {
        if (!cost) return 'N/A';
        if (typeof cost === 'string') return cost;
        return Object.entries(cost).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }

    /**
     * Download report as HTML file
     */
    function downloadReport(html, filename) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `Dhara-Rakshak_Report_${new Date().toISOString().slice(0,10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        generateFullReport,
        downloadReport
    };
})();
