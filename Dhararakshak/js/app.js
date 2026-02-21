/**
 * ============================================================================
 * DHARA-RAKSHAK — Main Application Orchestrator v2.0
 * ============================================================================
 * Coordinates all modules: input collection, analysis, visualization,
 * risk heatmap, data visualizer, mitigation, voice alerts, report, dashboard.
 *
 * New in v2.0:
 *   - goToCoords() — navigate map to typed lat/lon
 *   - fetchSatelliteGreen() — open satellite panel, estimate green %
 *   - applySatelliteGreen() — copy green % to vegetation slider
 *   - showRiskMap() — render 1km risk heatmap
 *   - showVisualizer() / renderVisualizer() — data visualizer page
 *   - switchMitTab() — mitigation tab switching
 *   - 5-language voice integration
 * ============================================================================
 */

const DharaApp = (function () {
    'use strict';

    // ========================================================================
    // STATE
    // ========================================================================
    const state = {
        lat: 30.45,
        lon: 78.07,
        siteData: null,
        analysisResults: null,
        riskAssessment: null,
        recommendations: null,
        outcome: null,
        analysisComplete: false,
        satelliteGreenPct: null
    };

    // ========================================================================
    // NAVIGATION
    // ========================================================================
    function navigateTo(pageId) {
        document.querySelectorAll('.module-page').forEach(function (p) { p.classList.remove('active'); });
        document.querySelectorAll('.sidebar-nav-item').forEach(function (n) { n.classList.remove('active'); });

        var page = document.getElementById(pageId);
        if (page) page.classList.add('active');

        var nav = document.querySelector('[data-page="' + pageId + '"]');
        if (nav) nav.classList.add('active');

        // Initialize map if navigating to input page
        if (pageId === 'page-input') {
            setTimeout(function () {
                MapModule.initMap('mapContainer', state.lat, state.lon, function (lat, lon) {
                    state.lat = lat;
                    state.lon = lon;
                    var latEl = document.getElementById('inp-lat');
                    var lonEl = document.getElementById('inp-lon');
                    if (latEl) latEl.value = lat.toFixed(5);
                    if (lonEl) lonEl.value = lon.toFixed(5);
                });
            }, 100);
        }
    }

    // ========================================================================
    // GO TO COORDINATES (map redirect)
    // ========================================================================
    function goToCoords() {
        var latEl = document.getElementById('inp-lat');
        var lonEl = document.getElementById('inp-lon');
        var lat = parseFloat(latEl?.value);
        var lon = parseFloat(lonEl?.value);

        if (isNaN(lat) || isNaN(lon)) {
            alert('Please enter valid latitude and longitude values.');
            return;
        }
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            alert('Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180.');
            return;
        }

        state.lat = lat;
        state.lon = lon;
        MapModule.flyTo(lat, lon, 14);
    }

    // ========================================================================
    // SATELLITE GREEN PERCENTAGE
    // ========================================================================
    function fetchSatelliteGreen() {
        var panel = document.getElementById('satellite-panel');
        if (panel) panel.style.display = 'block';

        var slopeAngle = parseFloat(document.getElementById('inp-slope')?.value) || 35;

        setTimeout(function () {
            var result = MapModule.initSatelliteView(
                'satellite-map-container',
                state.lat,
                state.lon,
                slopeAngle
            );

            state.satelliteGreenPct = result.estimatedGreenPct;

            var display = document.getElementById('green-pct-display');
            if (display) display.textContent = result.estimatedGreenPct + '%';

            var note = document.getElementById('green-pct-note');
            if (note) {
                note.textContent = 'Estimated from terrain model at ' +
                    state.lat.toFixed(4) + ', ' + state.lon.toFixed(4) +
                    '. Based on latitude, slope (' + slopeAngle + '\u00B0), and rainfall zone.';
            }
        }, 150);
    }

    function applySatelliteGreen() {
        if (state.satelliteGreenPct == null) {
            alert('Fetch satellite view first.');
            return;
        }
        var slider = document.getElementById('inp-veg');
        var display = document.getElementById('inp-veg-val');
        if (slider) {
            slider.value = state.satelliteGreenPct;
            if (display) display.textContent = state.satelliteGreenPct + '%';
        }
    }

    // ========================================================================
    // COLLECT SITE DATA
    // ========================================================================
    function collectSiteData() {
        var data = {
            location: {
                lat: parseFloat(document.getElementById('inp-lat')?.value) || state.lat,
                lon: parseFloat(document.getElementById('inp-lon')?.value) || state.lon
            },
            slopeAngle: parseFloat(document.getElementById('inp-slope')?.value) || 35,
            soilType: document.getElementById('inp-soil')?.value || 'clayey_sand',
            vegetationPct: parseFloat(document.getElementById('inp-veg')?.value) || 40,
            rainfallIntensity: parseFloat(document.getElementById('inp-rain-intensity')?.value) || 5,
            rainfallDuration: parseFloat(document.getElementById('inp-rain-duration')?.value) || 24,
            houseDistance: parseFloat(document.getElementById('inp-distance')?.value) || 6,
            drainageCondition: document.getElementById('inp-drainage')?.value || 'poor',
            saturation: parseFloat(document.getElementById('inp-saturation')?.value) || 50,
            cracks: document.getElementById('inp-cracks')?.checked || false,
            seepage: document.getElementById('inp-seepage')?.checked || false,
            pastLandslides: document.getElementById('inp-past')?.checked || false,
            construction: document.getElementById('inp-construction')?.checked || false
        };

        state.siteData = data;
        return data;
    }

    // ========================================================================
    // RUN ANALYSIS
    // ========================================================================
    function runAnalysis() {
        showLoading('Running comprehensive geotechnical analysis...');

        setTimeout(function () {
            try {
                var siteData = collectSiteData();

                // 1. Run comprehensive geotechnical analysis
                state.analysisResults = GeotechnicalEngine.runComprehensiveAnalysis(siteData);

                // 2. Classify risk
                state.riskAssessment = RiskClassifier.classifyRisk(state.analysisResults);

                // 3. Generate mitigation recommendations
                state.recommendations = MitigationEngine.recommendMitigation(
                    state.riskAssessment, state.analysisResults
                );

                // 4. Outcome analysis
                state.outcome = MitigationEngine.getOutcomeAnalysis(
                    state.analysisResults.compositeFoS,
                    state.recommendations
                );

                state.analysisComplete = true;

                // Navigate to results
                navigateTo('page-results');
                renderResults();

            } catch (err) {
                console.error('Analysis error:', err);
                alert('Analysis error: ' + err.message);
            } finally {
                hideLoading();
            }
        }, 300);
    }

    // ========================================================================
    // RENDER RESULTS
    // ========================================================================
    function renderResults() {
        if (!state.analysisComplete) return;

        var ar = state.analysisResults;
        var ra = state.riskAssessment;
        var cls = ra.classification;

        // Summary metrics
        setMetric('res-fos', ar.compositeFoS?.toFixed(3), fosClass(ar.compositeFoS));
        setMetric('res-risk-score', ra.compositeScore?.toFixed(0), riskClass(cls.level));
        setMetric('res-pf', ar.monteCarlo?.probability_of_failure?.toFixed(1) + '%', riskClass(cls.level));
        setMetric('res-confidence', ra.confidence?.level, '');

        // Risk banner
        var banner = document.getElementById('risk-banner');
        if (banner) {
            banner.style.background = cls.bgColor || '#FFF3E0';
            banner.style.borderColor = cls.color || '#F57F17';
            banner.style.color = cls.color || '#F57F17';
            banner.innerHTML = '<div>' +
                '<div style="font-size:1.3rem;font-weight:700">' + cls.label + ' -- ' + cls.nidmCategory + '</div>' +
                '<div style="font-size:0.85rem;margin-top:4px">' + cls.action + '</div>' +
                '</div>';
        }

        // Charts
        DharaCharts.renderRiskGauge('chart-risk-gauge', ra.compositeScore, cls);
        DharaCharts.renderFoSComparison('chart-fos', ar);
        DharaCharts.renderMonteCarloHistogram('chart-mc', ar.monteCarlo);
        DharaCharts.renderSensitivityTornado('chart-sensitivity', ar.sensitivity);
        DharaCharts.renderRiskRadar('chart-radar', ra);
        DharaCharts.renderIDCurve('chart-id', ar.rainfallThreshold?.current_intensity, ar.rainfallThreshold?.current_duration);
        DharaCharts.renderInfiltrationTimeline('chart-infiltration', ar.infiltration);

        renderDetailTables();
    }

    function renderDetailTables() {
        var ar = state.analysisResults;
        var ra = state.riskAssessment;

        // FoS Table
        var fosTable = document.getElementById('fos-detail-table');
        if (fosTable) {
            fosTable.innerHTML =
                '<tr><td>Infinite Slope</td><td>' + (ar.infiniteSlope?.fos?.toFixed(4)) + '</td><td>' + ar.infiniteSlope?.method + '</td></tr>' +
                '<tr><td>Bishop Simplified</td><td>' + (ar.bishop?.fos?.toFixed(4)) + ' ' + (ar.bishop?.converged ? '(Converged)' : '(Not converged)') + '</td><td>' + ar.bishop?.method + '</td></tr>' +
                '<tr><td>Janbu Simplified</td><td>' + (ar.janbu?.fos?.toFixed(4)) + '</td><td>' + ar.janbu?.method + '</td></tr>' +
                '<tr style="background:#E3F2FD;font-weight:600"><td>Composite</td><td>' + (ar.compositeFoS?.toFixed(4)) + '</td><td>40% IS + 35% Bishop + 25% Janbu</td></tr>';
        }

        // Foundation table
        var foundTable = document.getElementById('foundation-detail');
        if (foundTable) {
            var f = ar.foundation;
            foundTable.innerHTML =
                '<tr><td>Required Setback</td><td>' + f.effectiveSetback + ' m</td></tr>' +
                '<tr><td>Actual Setback</td><td>' + f.actualSetback + ' m</td></tr>' +
                '<tr><td>Status</td><td><strong>' + (f.isSetbackSafe ? 'SAFE' : 'UNSAFE') + '</strong></td></tr>' +
                '<tr><td>Bearing Reduction</td><td>' + f.bearingCapacityReduction + '%</td></tr>';
        }

        // Component breakdown
        var compTable = document.getElementById('component-breakdown');
        if (compTable && ra.components) {
            compTable.innerHTML = '';
            for (var key in ra.components) {
                var val = ra.components[key];
                compTable.innerHTML += '<tr><td>' + key + '</td><td>' + val.score + '</td><td>' + (val.weight * 100).toFixed(0) + '%</td><td>' + val.weighted + '</td><td style="font-size:0.78rem">' + val.input + '</td></tr>';
            }
        }
    }

    // ========================================================================
    // RISK MAP PAGE (1 km heatmap)
    // ========================================================================
    function showRiskMap() {
        if (!state.analysisComplete) {
            alert('Please run analysis first.');
            return navigateTo('page-input');
        }
        navigateTo('page-risk-map');
        setTimeout(function () {
            MapModule.initRiskMap(
                'riskMapContainer',
                state.lat,
                state.lon,
                state.analysisResults,
                state.riskAssessment
            );
        }, 150);
    }

    // ========================================================================
    // DATA VISUALIZER PAGE
    // ========================================================================
    function showVisualizer() {
        if (!state.analysisComplete) {
            alert('Please run analysis first.');
            return navigateTo('page-input');
        }
        navigateTo('page-visualizer');
        setTimeout(function () { renderVisualizer(); }, 100);
    }

    function renderVisualizer() {
        if (!state.analysisComplete) return;

        var sd = state.siteData;
        var ar = state.analysisResults;

        // 1. Input Parameters Radar
        DharaCharts.renderInputRadar('viz-input-radar', sd);

        // 2. Soil Properties Bar
        DharaCharts.renderSoilBar('viz-soil-bar', ar.soilProperties);

        // 3. Risk Weight Pie
        DharaCharts.renderWeightPie('viz-weight-pie');

        // 4. FoS vs Slope Angle Curve
        DharaCharts.renderFosSlopeCurve('viz-fos-slope', sd, ar.soilProperties);

        // 5. Data Table
        var tbody = document.querySelector('#viz-data-table tbody');
        if (tbody) {
            var rows = [
                ['Latitude', sd.location?.lat?.toFixed(5) || '--', 'deg', 'Location'],
                ['Longitude', sd.location?.lon?.toFixed(5) || '--', 'deg', 'Location'],
                ['Slope Angle', sd.slopeAngle, 'deg', 'Terrain'],
                ['Soil Type', ar.soilProperties?.name || sd.soilType, '--', 'Geotechnical'],
                ['Cohesion (mean)', ar.soilProperties?.cohesion?.mean || '--', 'kPa', 'Geotechnical'],
                ['Friction Angle (mean)', ar.soilProperties?.friction?.mean || '--', 'deg', 'Geotechnical'],
                ['Unit Weight (mean)', ar.soilProperties?.unitWeight?.mean || '--', 'kN/m3', 'Geotechnical'],
                ['Vegetation Cover', sd.vegetationPct, '%', 'Environmental'],
                ['Root Cohesion', ar.vegetation?.rootCohesion || 0, 'kPa', 'Environmental'],
                ['Rainfall Intensity', sd.rainfallIntensity, 'mm/hr', 'Hydrological'],
                ['Rainfall Duration', sd.rainfallDuration, 'hr', 'Hydrological'],
                ['Saturation', sd.saturation, '%', 'Hydrological'],
                ['Structure Distance', sd.houseDistance, 'm', 'Structural'],
                ['Drainage Condition', sd.drainageCondition, '--', 'Hydrological'],
                ['Composite FoS', ar.compositeFoS?.toFixed(4) || '--', '--', 'Result'],
                ['Risk Score', state.riskAssessment?.compositeScore?.toFixed(1) || '--', '/100', 'Result'],
                ['Failure Probability', ar.monteCarlo?.probability_of_failure?.toFixed(1) || '--', '%', 'Result']
            ];

            tbody.innerHTML = '';
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i];
                tbody.innerHTML += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>';
            }
        }
    }

    // ========================================================================
    // MITIGATION PAGE
    // ========================================================================
    function showMitigationPage() {
        if (!state.analysisComplete) {
            alert('Please run analysis first.');
            return navigateTo('page-input');
        }
        navigateTo('page-mitigation');
        renderMitigation();
    }

    function renderMitigation() {
        var rec = state.recommendations;
        if (!rec) return;

        renderMitigationList('mit-immediate', rec.immediate);
        renderMitigationList('mit-shortterm', rec.shortTerm);
        renderMitigationList('mit-longterm', rec.longTerm);

        // Monitoring table
        var monEl = document.getElementById('mit-monitoring');
        if (monEl && rec.monitoring) {
            var html = '';
            for (var i = 0; i < rec.monitoring.length; i++) {
                var m = rec.monitoring[i];
                html += '<tr><td>' + m.instrument + '</td><td>' + m.frequency + '</td><td>' + m.purpose + '</td><td>' + m.cost + '</td></tr>';
            }
            monEl.innerHTML = html;
        }

        // Outcome
        if (state.outcome) {
            DharaCharts.renderOutcomeComparison('chart-outcome', state.outcome);
            var outcomeEl = document.getElementById('outcome-summary');
            if (outcomeEl) {
                var o = state.outcome;
                outcomeEl.innerHTML =
                    '<div class="grid-2">' +
                    '<div class="metric-card risk-high"><div class="metric-label">BEFORE</div><div class="metric-value">' + o.before.fos + '</div><div class="metric-delta">Prob: ' + o.before.failureProbability + ' | ' + o.before.riskLabel + '</div></div>' +
                    '<div class="metric-card risk-low"><div class="metric-label">AFTER</div><div class="metric-value">' + o.after.fos + '</div><div class="metric-delta">Prob: ' + o.after.failureProbability + ' | ' + o.after.riskLabel + '</div></div>' +
                    '</div>' +
                    '<div class="alert alert-success" style="margin-top:14px">' +
                    '<div>Risk Reduction: <strong>' + o.improvement.riskReductionPct + '%</strong> | FoS Improvement: +' + o.improvement.fosIncrease + ' (Range: ' + o.improvement.fosIncreaseRange + ')<br><em style="font-size:0.78rem">' + o.note + '</em></div>' +
                    '</div>';
            }
        }

        DharaCharts.renderMitigationCostPie('chart-cost-pie', rec);
    }

    function renderMitigationList(containerId, measures) {
        var el = document.getElementById(containerId);
        if (!el) return;

        if (!measures || measures.length === 0) {
            el.innerHTML = '<p style="color:#888;font-size:0.85rem">No measures recommended for this timeframe.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < measures.length; i++) {
            var m = measures[i];
            var catClass = m.name.indexOf('Drain') >= 0 ? 'drainage' :
                          (m.name.indexOf('Gabion') >= 0 || m.name.indexOf('RCC') >= 0 || m.name.indexOf('Nail') >= 0 || m.name.indexOf('Bolt') >= 0 || m.name.indexOf('Shotcrete') >= 0) ? 'structural' :
                          (m.name.indexOf('Vetiver') >= 0 || m.name.indexOf('Bamboo') >= 0 || m.name.indexOf('Coir') >= 0 || m.name.indexOf('Native') >= 0) ? 'bio' : 'land';

            html += '<div class="mitigation-card">' +
                '<div class="mc-header ' + catClass + '"><span>' + m.name + '</span>' +
                '<span class="card-badge ' + (m.priority === 'CRITICAL' ? 'mandatory' : 'optional') + '" style="margin-left:auto">' + m.priority + '</span>' +
                '</div>' +
                '<div class="mc-body">' +
                '<p style="font-size:0.82rem;color:#555;margin-bottom:10px">' + m.description + '</p>' +
                '<div class="mc-row"><span class="mc-label">Risk Reduction</span><span class="mc-value">' + m.riskReduction + '%</span></div>' +
                '<div class="mc-row"><span class="mc-label">Life Span</span><span class="mc-value">' + m.lifeSpan + '</span></div>' +
                '<div class="mc-row"><span class="mc-label">Cost</span><span class="mc-value">' + formatCostShort(m.costEstimate) + '</span></div>' +
                '<div class="mc-row"><span class="mc-label">Standards</span><span class="mc-value">' + (m.standards?.join(', ') || 'N/A') + '</span></div>' +
                '<details style="margin-top:10px">' +
                '<summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--primary)">View Full Design and Installation Details</summary>' +
                '<div style="margin-top:8px;font-size:0.82rem">' +
                '<h4 style="margin:8px 0 4px;font-size:0.82rem">Design Concept</h4><p>' + m.designConcept + '</p>' +
                '<h4 style="margin:8px 0 4px;font-size:0.82rem">Installation Method</h4><p style="white-space:pre-line">' + m.installationMethod + '</p>' +
                '<h4 style="margin:8px 0 4px;font-size:0.82rem">Maintenance</h4><p>' + m.maintenance + '</p>' +
                '</div></details>' +
                '<div style="font-size:0.72rem;color:#888;margin-top:8px"><em>Reason: ' + m.reason + '</em></div>' +
                '</div></div>';
        }
        el.innerHTML = html;
    }

    // ========================================================================
    // MITIGATION TAB SWITCHING
    // ========================================================================
    function switchMitTab(btn, tabId) {
        // Deactivate all tabs
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });

        // Activate clicked tab
        btn.classList.add('active');
        var tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.classList.add('active');
    }

    // ========================================================================
    // VOICE PAGE
    // ========================================================================
    function showVoicePage() {
        navigateTo('page-voice');
        refreshVoicePanel();
    }

    function refreshVoicePanel() {
        var el = document.getElementById('voice-container');
        if (!el) return;
        var level = state.riskAssessment?.classification?.level || 'MEDIUM';
        el.innerHTML = VoiceSystem.renderVoicePanel(level);
    }

    // ========================================================================
    // REPORT PAGE
    // ========================================================================
    function showReportPage() {
        if (!state.analysisComplete) {
            alert('Please run analysis first.');
            return navigateTo('page-input');
        }
        navigateTo('page-report');

        var previewEl = document.getElementById('report-preview-frame');
        if (previewEl) {
            var html = ReportGenerator.generateFullReport(
                state.siteData,
                state.analysisResults,
                state.riskAssessment,
                state.recommendations,
                state.outcome
            );
            previewEl.srcdoc = html;
        }
    }

    function downloadReport() {
        if (!state.analysisComplete) return alert('Run analysis first.');
        var html = ReportGenerator.generateFullReport(
            state.siteData,
            state.analysisResults,
            state.riskAssessment,
            state.recommendations,
            state.outcome
        );
        ReportGenerator.downloadReport(html);
    }

    // ========================================================================
    // DASHBOARD PAGE
    // ========================================================================
    function showDashboardPage() {
        navigateTo('page-dashboard');
        if (state.analysisComplete) {
            renderDashboardSummary();
        }
    }

    function renderDashboardSummary() {
        var el = document.getElementById('dashboard-content');
        if (!el || !state.analysisComplete) return;

        var ar = state.analysisResults;
        var ra = state.riskAssessment;
        var cls = ra.classification;

        el.innerHTML =
            '<div class="dashboard-summary">' +
            '<div class="metric-card ' + riskClass(cls.level) + '"><div class="metric-label">Risk Score</div><div class="metric-value">' + ra.compositeScore?.toFixed(0) + '</div></div>' +
            '<div class="metric-card ' + fosClass(ar.compositeFoS) + '"><div class="metric-label">Factor of Safety</div><div class="metric-value">' + ar.compositeFoS?.toFixed(3) + '</div></div>' +
            '<div class="metric-card"><div class="metric-label">Failure Probability</div><div class="metric-value">' + ar.monteCarlo?.probability_of_failure?.toFixed(1) + '%</div></div>' +
            '<div class="metric-card"><div class="metric-label">Confidence</div><div class="metric-value">' + ra.confidence?.level + '</div></div>' +
            '</div>' +

            '<div class="card">' +
            '<div class="card-header"><h3>Assessment Summary</h3></div>' +
            '<table class="data-table">' +
            '<thead><tr><th>Parameter</th><th>Value</th><th>Status</th></tr></thead>' +
            '<tbody>' +
            '<tr><td>Location</td><td>' + state.lat?.toFixed(4) + ', ' + state.lon?.toFixed(4) + '</td><td>--</td></tr>' +
            '<tr><td>Slope Angle</td><td>' + ar.slopeAngle + ' deg</td><td>' + (ar.slopeAngle > 35 ? 'Steep' : 'Moderate') + '</td></tr>' +
            '<tr><td>Soil Type</td><td>' + ar.soilProperties?.name + '</td><td>' + ar.soilProperties?.classification + '</td></tr>' +
            '<tr><td>Vegetation</td><td>' + ar.vegetation?.vegetationPct + '% -- ' + ar.vegetation?.category + '</td><td>' + ar.vegetation?.deforestationRisk + ' risk</td></tr>' +
            '<tr><td>Rainfall Status</td><td>' + ar.rainfallThreshold?.status + '</td><td>Level ' + ar.rainfallThreshold?.level + '</td></tr>' +
            '<tr><td>Foundation</td><td>Setback ' + ar.foundation?.actualSetback + 'm / ' + ar.foundation?.effectiveSetback + 'm required</td><td>' + (ar.foundation?.isSetbackSafe ? 'Safe' : 'Unsafe') + '</td></tr>' +
            '</tbody></table></div>' +

            '<div class="card">' +
            '<div class="card-header"><h3>Workflow Status</h3></div>' +
            '<div class="workflow-timeline">' +
            '<div class="wf-step done"><div class="wf-num">1</div><div class="wf-label">Survey</div></div>' +
            '<div class="wf-step done"><div class="wf-num">2</div><div class="wf-label">Upload</div></div>' +
            '<div class="wf-step done"><div class="wf-num">3</div><div class="wf-label">Analysis</div></div>' +
            '<div class="wf-step active"><div class="wf-num">4</div><div class="wf-label">Approval</div></div>' +
            '<div class="wf-step"><div class="wf-num">5</div><div class="wf-label">Execution</div></div>' +
            '<div class="wf-step"><div class="wf-num">6</div><div class="wf-label">Monitoring</div></div>' +
            '</div>' +
            '<div class="alert alert-warning" style="margin-top:12px">' +
            '<div>Final engineering approval required from certified geotechnical engineer before execution of any mitigation measures.</div>' +
            '</div></div>';
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    function setMetric(id, value, cssClass) {
        var el = document.getElementById(id);
        if (el) {
            var valEl = el.querySelector('.metric-value');
            if (valEl) valEl.textContent = value || 'N/A';
            if (cssClass) el.className = 'metric-card ' + cssClass;
        }
    }

    function fosClass(fos) {
        if (fos >= 1.5) return 'risk-low';
        if (fos >= 1.2) return 'risk-medium';
        return 'risk-high';
    }

    function riskClass(level) {
        if (level === 'CRITICAL' || level === 'HIGH') return 'risk-high';
        if (level === 'MEDIUM') return 'risk-medium';
        return 'risk-low';
    }

    function formatCostShort(cost) {
        if (!cost) return 'N/A';
        if (typeof cost === 'string') return cost;
        var vals = Object.values(cost);
        return vals[vals.length - 1] || vals[0] || 'N/A';
    }

    function showLoading(msg) {
        var el = document.getElementById('loading-overlay');
        if (el) {
            el.querySelector('.loading-text').textContent = msg || 'Processing...';
            el.classList.add('active');
        }
    }

    function hideLoading() {
        var el = document.getElementById('loading-overlay');
        if (el) el.classList.remove('active');
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    function init() {
        // Set up navigation
        document.querySelectorAll('.sidebar-nav-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var page = this.getAttribute('data-page');
                if (page === 'page-mitigation') showMitigationPage();
                else if (page === 'page-voice') showVoicePage();
                else if (page === 'page-report') showReportPage();
                else if (page === 'page-dashboard') showDashboardPage();
                else if (page === 'page-risk-map') showRiskMap();
                else if (page === 'page-visualizer') showVisualizer();
                else navigateTo(page);
            });
        });

        // Set up range sliders
        document.querySelectorAll('input[type="range"]').forEach(function (inp) {
            var display = document.getElementById(inp.id + '-val');
            if (display) {
                inp.addEventListener('input', function () {
                    display.textContent = inp.value + (inp.dataset.suffix || '');
                });
            }
        });

        // Navigate to input page
        navigateTo('page-input');
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        init: init,
        navigateTo: navigateTo,
        goToCoords: goToCoords,
        fetchSatelliteGreen: fetchSatelliteGreen,
        applySatelliteGreen: applySatelliteGreen,
        runAnalysis: runAnalysis,
        showRiskMap: showRiskMap,
        showVisualizer: showVisualizer,
        showMitigationPage: showMitigationPage,
        switchMitTab: switchMitTab,
        showVoicePage: showVoicePage,
        showReportPage: showReportPage,
        showDashboardPage: showDashboardPage,
        downloadReport: downloadReport,
        refreshVoicePanel: refreshVoicePanel,
        state: state
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', DharaApp.init);
