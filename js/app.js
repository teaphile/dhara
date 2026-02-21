/**
 * ============================================================================
 * DHARA-RAKSHAK — Main Application Orchestrator v3.0
 * ============================================================================
 * Coordinates all modules: input collection, analysis, visualization,
 * risk heatmap, data visualizer, mitigation, voice alerts, report, dashboard.
 *
 * v3.0 Enhancements:
 *   - Toast notification system (replaces alert())
 *   - Data export (JSON / CSV)
 *   - Analysis history with localStorage persistence
 *   - Enhanced dashboard with analytics
 *   - Input validation feedback
 *   - Accessibility improvements
 *
 * v2.0:
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
        satelliteGreenPct: null,
        // Live API data
        liveData: null,
        liveDataFetched: false,
        // Analysis history
        history: []
    };

    // ========================================================================
    // TOAST NOTIFICATION SYSTEM
    // ========================================================================
    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 4000;
        var container = document.getElementById('toast-container');
        if (!container) { console.warn('[Toast]', message); return; }

        var icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.setAttribute('role', 'alert');
        toast.innerHTML =
            '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span>' +
            '<span class="toast-body">' + message + '</span>' +
            '<button class="toast-close" aria-label="Dismiss">&times;</button>';

        container.appendChild(toast);

        var closeBtn = toast.querySelector('.toast-close');
        var timer = setTimeout(function () { dismissToast(toast); }, duration);
        closeBtn.addEventListener('click', function () {
            clearTimeout(timer);
            dismissToast(toast);
        });
    }

    function dismissToast(toast) {
        if (!toast || toast.classList.contains('toast-exit')) return;
        toast.classList.add('toast-exit');
        setTimeout(function () { toast.remove(); }, 300);
    }

    // ========================================================================
    // DATA EXPORT FUNCTIONS
    // ========================================================================
    function exportJSON() {
        if (!state.analysisComplete) {
            showToast('Run analysis first before exporting.', 'warning');
            return;
        }
        var exportData = buildExportPayload();
        var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        downloadBlob(blob, 'dhara-analysis-' + formatTimestamp() + '.json');
        showToast('JSON report exported successfully.', 'success');
    }

    function exportCSV() {
        if (!state.analysisComplete) {
            showToast('Run analysis first before exporting.', 'warning');
            return;
        }
        var rows = buildCSVRows();
        var csv = rows.map(function (r) { return r.join(','); }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, 'dhara-analysis-' + formatTimestamp() + '.csv');
        showToast('CSV report exported successfully.', 'success');
    }

    function buildExportPayload() {
        var ar = state.analysisResults;
        var ra = state.riskAssessment;
        return {
            meta: { version: '3.0', exportedAt: new Date().toISOString(), tool: 'Dhara-Rakshak' },
            location: { lat: state.lat, lon: state.lon, name: ar.locationName || '' },
            siteData: state.siteData,
            analysis: {
                compositeFoS: ar.compositeFoS,
                infiniteSlope: ar.infiniteSlope,
                bishop: ar.bishop,
                janbu: ar.janbu,
                monteCarlo: ar.monteCarlo,
                rainfallThreshold: ar.rainfallThreshold,
                infiltration: ar.infiltration,
                foundation: ar.foundation
            },
            risk: {
                score: ra.compositeScore,
                level: ra.classification.level,
                nidmCategory: ra.classification.nidmCategory,
                confidence: ra.confidence,
                components: ra.components
            },
            mitigation: state.recommendations,
            outcome: state.outcome
        };
    }

    function buildCSVRows() {
        var ar = state.analysisResults;
        var ra = state.riskAssessment;
        var sd = state.siteData;
        var rows = [['Parameter', 'Value', 'Unit', 'Category']];
        rows.push(['Latitude', state.lat, 'deg', 'Location']);
        rows.push(['Longitude', state.lon, 'deg', 'Location']);
        rows.push(['Location Name', '"' + (ar.locationName || '') + '"', '', 'Location']);
        rows.push(['Slope Angle', sd.slopeAngle, 'deg', 'Terrain']);
        rows.push(['Soil Type', '"' + (ar.soilProperties?.name || sd.soilType) + '"', '', 'Geotechnical']);
        rows.push(['Vegetation Cover', sd.vegetationPct, '%', 'Environmental']);
        rows.push(['Rainfall Intensity', sd.rainfallIntensity, 'mm/hr', 'Hydrological']);
        rows.push(['Rainfall Duration', sd.rainfallDuration, 'hr', 'Hydrological']);
        rows.push(['Saturation', sd.saturation, '%', 'Hydrological']);
        rows.push(['FoS (Infinite Slope)', ar.infiniteSlope?.fos?.toFixed(4), '', 'Result']);
        rows.push(['FoS (Bishop)', ar.bishop?.fos?.toFixed(4), '', 'Result']);
        rows.push(['FoS (Janbu)', ar.janbu?.fos?.toFixed(4), '', 'Result']);
        rows.push(['FoS (Composite)', ar.compositeFoS?.toFixed(4), '', 'Result']);
        rows.push(['Risk Score', ra.compositeScore?.toFixed(1), '/100', 'Result']);
        rows.push(['Risk Level', ra.classification.level, '', 'Result']);
        rows.push(['Failure Probability', ar.monteCarlo?.probability_of_failure?.toFixed(1), '%', 'Result']);
        rows.push(['NIDM Category', '"' + ra.classification.nidmCategory + '"', '', 'Result']);
        rows.push(['Confidence', ra.confidence?.level || '', '', 'Result']);
        return rows;
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function formatTimestamp() {
        var d = new Date();
        return d.getFullYear() + '' +
            String(d.getMonth() + 1).padStart(2, '0') +
            String(d.getDate()).padStart(2, '0') + '-' +
            String(d.getHours()).padStart(2, '0') +
            String(d.getMinutes()).padStart(2, '0');
    }

    // ========================================================================
    // ANALYSIS HISTORY
    // ========================================================================
    function saveToHistory() {
        if (!state.analysisComplete) return;
        var ra = state.riskAssessment;
        var ar = state.analysisResults;
        var entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            lat: state.lat,
            lon: state.lon,
            locationName: ar.locationName || (state.lat.toFixed(4) + ', ' + state.lon.toFixed(4)),
            riskScore: ra.compositeScore,
            riskLevel: ra.classification.level,
            fos: ar.compositeFoS,
            failureProb: ar.monteCarlo?.probability_of_failure
        };
        state.history.unshift(entry);
        if (state.history.length > 50) state.history.pop();
        try {
            localStorage.setItem('dhara-history', JSON.stringify(state.history));
        } catch (e) { /* quota */ }
    }

    function loadHistory() {
        try {
            var saved = localStorage.getItem('dhara-history');
            if (saved) state.history = JSON.parse(saved);
        } catch (e) { state.history = []; }
    }

    function clearHistory() {
        state.history = [];
        localStorage.removeItem('dhara-history');
        renderHistoryPanel();
        showToast('Analysis history cleared.', 'info');
    }

    function renderHistoryPanel() {
        var container = document.getElementById('analysis-history-list');
        if (!container) return;

        if (state.history.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px">No analysis history yet. Run an analysis to see results here.</p>';
            return;
        }

        var riskColors = { CRITICAL: '#D32F2F', HIGH: '#E65100', MEDIUM: '#F9A825', LOW: '#2E7D32', 'VERY LOW': '#1565C0' };
        var html = '';
        for (var i = 0; i < Math.min(20, state.history.length); i++) {
            var h = state.history[i];
            var dt = new Date(h.timestamp);
            var dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            var timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            html += '<div class="history-item" onclick="DharaApp.loadHistoryEntry(' + h.id + ')">' +
                '<div class="history-risk-dot" style="background:' + (riskColors[h.riskLevel] || '#888') + '"></div>' +
                '<div class="history-details">' +
                '<div class="h-location">' + (h.locationName || 'Unknown') + '</div>' +
                '<div class="h-meta">' + h.lat.toFixed(4) + ', ' + h.lon.toFixed(4) + '</div>' +
                '<div class="h-score">Risk: ' + (h.riskScore?.toFixed(0) || '--') + '/100 | FoS: ' + (h.fos?.toFixed(3) || '--') + ' | ' + h.riskLevel + '</div>' +
                '</div>' +
                '<div class="history-date">' + dateStr + '<br>' + timeStr + '</div>' +
                '</div>';
        }
        container.innerHTML = html;
    }

    function loadHistoryEntry(id) {
        var entry = state.history.find(function (h) { return h.id === id; });
        if (!entry) return;
        state.lat = entry.lat;
        state.lon = entry.lon;
        var latEl = document.getElementById('inp-lat');
        var lonEl = document.getElementById('inp-lon');
        if (latEl) latEl.value = entry.lat;
        if (lonEl) lonEl.value = entry.lon;
        navigateTo('page-input');
        showToast('Loaded coordinates from history. Click "Run Analysis" to re-analyze.', 'info');
    }

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

        // Scroll to top on page switch
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Close hamburger sidebar on mobile after navigation
        var sidebar = document.getElementById('sidebar');
        var hamburger = document.getElementById('hamburger-btn');
        if (sidebar) sidebar.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');

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
            showToast('Please enter valid latitude and longitude values.', 'warning');
            return;
        }
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            showToast('Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180.', 'warning');
            return;
        }

        state.lat = lat;
        state.lon = lon;
        state.liveDataFetched = false; // Reset live data on coord change
        MapModule.flyTo(lat, lon, 14);
        // Auto-fetch live data on coordinate change
        fetchLiveData();
    }

    // ========================================================================
    // LIVE DATA FETCHING (ALL 6 APIs)
    // ========================================================================
    async function fetchLiveData() {
        showLoading('Fetching live data from 6 APIs...');
        updateApiStatusUI('all', 'loading');

        try {
            var lat = parseFloat(document.getElementById('inp-lat')?.value) || state.lat;
            var lon = parseFloat(document.getElementById('inp-lon')?.value) || state.lon;
            state.lat = lat;
            state.lon = lon;

            state.liveData = await ApiService.fetchAllLiveData(lat, lon);
            state.liveDataFetched = true;

            // Update UI with fetched data
            renderLiveDataUI(state.liveData);
            updateApiStatusFromResult(state.liveData);

            // Auto-fill parameters from live data
            autoFillFromLiveData(state.liveData);

        } catch (err) {
            console.error('Live data fetch error:', err);
        } finally {
            hideLoading();
        }
    }

    function updateApiStatusUI(api, status) {
        var apis = ['weather', 'elevation', 'earthquake', 'soilgrids', 'geocode', 'historical'];
        if (api === 'all') {
            apis.forEach(function(a) {
                var dot = document.getElementById('dot-' + a);
                if (dot) { dot.className = 'api-dot ' + status; }
            });
        } else {
            var dot = document.getElementById('dot-' + api);
            if (dot) { dot.className = 'api-dot ' + status; }
        }
    }

    function updateApiStatusFromResult(liveData) {
        if (!liveData) return;
        var map = { weather: 'weather', historical: 'historical', elevation: 'elevation',
                    geocode: 'geocode', earthquakes: 'earthquake', soil: 'soilgrids' };
        for (var key in map) {
            updateApiStatusUI(map[key], liveData[key] ? 'success' : 'error');
        }
        var timeEl = document.getElementById('api-fetch-time');
        if (timeEl) timeEl.textContent = liveData.successCount + '/6 APIs | ' + liveData.fetchTime + 'ms';
    }

    function renderLiveDataUI(data) {
        if (!data) return;

        // Location banner
        var banner = document.getElementById('live-location-banner');
        if (banner) {
            banner.style.display = 'flex';
            var nameEl = document.getElementById('live-location-name');
            var weatherEl = document.getElementById('live-weather-summary');
            var elevEl = document.getElementById('live-elevation');

            if (nameEl && data.geocode) {
                nameEl.textContent = data.geocode.shortName || data.geocode.displayName || '';
            }
            if (weatherEl && data.weather) {
                var w = data.weather.current;
                weatherEl.textContent = w.weatherDescription + ' | ' +
                    w.temperature + '°C | ' + w.humidity + '% humidity | ' +
                    'Wind ' + w.windSpeed + ' km/h | Rain: ' + w.precipitation + ' mm';
            }
            if (elevEl && data.elevation) {
                elevEl.textContent = 'Elevation: ' + data.elevation.elevation + 'm | ' +
                    'DEM Slope: ' + data.elevation.estimatedSlope + '° ' +
                    data.elevation.aspectDirection;
            }
        }

        // Live soil info box
        if (data.soil) {
            var soilBox = document.getElementById('live-soil-info');
            var soilBadge = document.getElementById('soil-live-badge');
            if (soilBadge) soilBadge.style.display = 'inline';
            if (soilBox) {
                soilBox.innerHTML = '<strong>' + data.soil.classification.usda + '</strong> (' +
                    data.soil.classification.is1498 + ') | Clay: ' + data.soil.composition.clay +
                    '% | Sand: ' + data.soil.composition.sand + '% | pH: ' + data.soil.properties.pH +
                    ' | BD: ' + data.soil.properties.bulkDensity + ' g/cm³';
            }
        }
    }

    function autoFillFromLiveData(data) {
        if (!data) return;

        // Auto-fill rainfall from live weather
        if (data.weather && data.weather.derived) {
            var d = data.weather.derived;
            if (d.currentIntensity > 0 || d.maxIntensity24h > 0) {
                var intensity = Math.max(d.currentIntensity, d.maxIntensity24h);
                var rainSlider = document.getElementById('inp-rain-intensity');
                var rainDisplay = document.getElementById('inp-rain-intensity-val');
                if (rainSlider && intensity > 0) {
                    rainSlider.value = Math.min(50, intensity);
                    if (rainDisplay) rainDisplay.textContent = Math.min(50, intensity).toFixed(1) + ' mm/hr';
                }
            }
            if (d.effectiveDuration) {
                var durSlider = document.getElementById('inp-rain-duration');
                var durDisplay = document.getElementById('inp-rain-duration-val');
                if (durSlider) {
                    durSlider.value = Math.min(120, d.effectiveDuration);
                    if (durDisplay) durDisplay.textContent = Math.min(120, d.effectiveDuration) + ' hrs';
                }
            }
            // Soil moisture → saturation
            if (d.avgSoilMoisture != null) {
                var satPct = Math.min(100, Math.round(d.avgSoilMoisture * 100 / 0.5));
                var satSlider = document.getElementById('inp-saturation');
                var satDisplay = document.getElementById('inp-saturation-val');
                if (satSlider) {
                    satSlider.value = satPct;
                    if (satDisplay) satDisplay.textContent = satPct + '%';
                }
            }
        }

        // Auto-fill slope from DEM elevation data
        if (data.elevation && data.elevation.estimatedSlope > 0) {
            var slopeSlider = document.getElementById('inp-slope');
            var slopeDisplay = document.getElementById('inp-slope-val');
            var demSlope = Math.round(data.elevation.estimatedSlope);
            if (slopeSlider && demSlope >= 5 && demSlope <= 80) {
                slopeSlider.value = demSlope;
                if (slopeDisplay) slopeDisplay.textContent = demSlope + ' deg';
            }
        }

        // Auto-select soil type from SoilGrids
        if (data.soil && data.soil.classification.recommended) {
            var soilSelect = document.getElementById('inp-soil');
            if (soilSelect) {
                soilSelect.value = data.soil.classification.recommended;
            }
        }
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
            showToast('Fetch satellite view first.', 'warning');
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

        // If live data not fetched yet, fetch first then analyze
        if (!state.liveDataFetched) {
            showLoading('Fetching live data before analysis...');
            ApiService.fetchAllLiveData(state.lat, state.lon).then(function(liveData) {
                state.liveData = liveData;
                state.liveDataFetched = true;
                renderLiveDataUI(liveData);
                updateApiStatusFromResult(liveData);
                autoFillFromLiveData(liveData);
                performAnalysis();
            }).catch(function() {
                // Continue without live data
                performAnalysis();
            });
        } else {
            setTimeout(performAnalysis, 100);
        }
    }

    function performAnalysis() {
        showLoading('Running multi-method geotechnical analysis...');

        setTimeout(function () {
            try {
                var siteData = collectSiteData();

                // Inject live data into site data
                if (state.liveData) {
                    siteData.liveWeather = state.liveData.weather || null;
                    siteData.liveHistorical = state.liveData.historical || null;
                    siteData.liveElevation = state.liveData.elevation || null;
                    siteData.liveEarthquakes = state.liveData.earthquakes || null;
                    siteData.liveSoil = state.liveData.soil || null;
                    siteData.liveGeocode = state.liveData.geocode || null;
                    siteData.locationName = state.liveData.geocode?.shortName || '';
                    siteData.elevation = state.liveData.elevation?.elevation || null;
                    siteData.demSlope = state.liveData.elevation?.estimatedSlope || null;
                    siteData.aspect = state.liveData.elevation?.aspectDirection || null;
                }

                // 1. Run comprehensive geotechnical analysis
                state.analysisResults = GeotechnicalEngine.runComprehensiveAnalysis(siteData);

                // Inject live data into analysis results for downstream use
                if (state.liveData) {
                    state.analysisResults.liveWeather = state.liveData.weather;
                    state.analysisResults.liveHistorical = state.liveData.historical;
                    state.analysisResults.liveEarthquakes = state.liveData.earthquakes;
                    state.analysisResults.liveSoil = state.liveData.soil;
                    state.analysisResults.liveElevation = state.liveData.elevation;
                    state.analysisResults.elevation = state.liveData.elevation?.elevation || null;
                    state.analysisResults.locationName = state.liveData.geocode?.shortName || '';

                    // Pass weather severity for risk classification (scored as weather component at 5% weight)
                    if (state.liveData.weather?.derived) {
                        state.analysisResults.weatherSeverity = state.liveData.weather.derived.weatherSeverityScore;
                        // Note: weather severity is scored as a dedicated 5% weighted component
                        // in RiskClassifier — do NOT add to riskModifier to avoid double-counting
                    }
                    // Pass earthquake data for risk classification (scored as seismic component)
                    if (state.liveData.earthquakes) {
                        state.analysisResults.seismicRisk = state.liveData.earthquakes.seismicRisk;
                        // Note: seismic risk is scored as a dedicated 10% weighted component
                        // in RiskClassifier — do NOT add to riskModifier to avoid double-counting
                    }
                }

                // 2. Classify risk (with augmented risk modifier)
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
                saveStateToStorage();
                saveToHistory();

                // Navigate to results
                navigateTo('page-results');
                renderResults();
                renderLiveDataPanels();

                showToast('Analysis complete — ' + (state.riskAssessment?.classification?.level || '') + ' risk detected.', 
                    state.riskAssessment?.classification?.level === 'CRITICAL' || state.riskAssessment?.classification?.level === 'HIGH' ? 'error' : 'success', 6000);

            } catch (err) {
                console.error('Analysis error:', err);
                showToast('Analysis error: ' + err.message, 'error', 8000);
            } finally {
                hideLoading();
            }
        }, 300);
    }

    // ========================================================================
    // RENDER LIVE DATA PANELS IN RESULTS
    // ========================================================================
    function renderLiveDataPanels() {
        var panelsEl = document.getElementById('live-data-panels');
        if (!panelsEl || !state.liveData) return;
        panelsEl.style.display = 'block';

        // Weather detail
        if (state.liveData.weather) {
            var w = state.liveData.weather;
            var wd = w.derived || {};
            var weatherHtml = '<div class="grid-2" style="gap:8px;font-size:12px">' +
                '<div><strong>Current:</strong> ' + w.current.weatherDescription + '</div>' +
                '<div><strong>Temperature:</strong> ' + w.current.temperature + '°C</div>' +
                '<div><strong>Humidity:</strong> ' + w.current.humidity + '%</div>' +
                '<div><strong>Wind:</strong> ' + w.current.windSpeed + ' km/h</div>' +
                '<div><strong>Rain (24h):</strong> ' + wd.rainfall24h + ' mm</div>' +
                '<div><strong>Max Intensity:</strong> ' + wd.maxIntensity24h + ' mm/hr</div>' +
                '<div><strong>Soil Moisture:</strong> ' + (wd.avgSoilMoisture ? (wd.avgSoilMoisture * 100).toFixed(0) + '%' : 'N/A') + '</div>' +
                '<div><strong>Weather Severity:</strong> ' + wd.weatherSeverityScore + '/100</div>' +
                '</div>';
            var wEl = document.getElementById('live-weather-detail');
            if (wEl) wEl.innerHTML = weatherHtml;

            // Render weather chart
            DharaCharts.renderWeatherTimeline('chart-weather-timeline', w);
        }

        // Earthquake detail
        if (state.liveData.earthquakes) {
            var eq = state.liveData.earthquakes;
            var eqHtml = '<div style="font-size:12px;margin-bottom:8px">' +
                '<span class="seismic-badge seismic-' + eq.seismicRisk.toLowerCase() + '">' + eq.seismicRisk + ' RISK</span>' +
                ' | Total: ' + eq.totalEvents + ' events (1yr, 300km) | ' +
                'Max: M' + eq.maxMagnitude.toFixed(1) + ' | ' +
                'Nearest: ' + eq.nearestDistance.toFixed(0) + ' km</div>';

            if (eq.events.length > 0) {
                eqHtml += '<table class="data-table eq-table"><thead><tr><th>Mag</th><th>Location</th><th>Dist</th><th>Depth</th></tr></thead><tbody>';
                for (var i = 0; i < Math.min(5, eq.events.length); i++) {
                    var e = eq.events[i];
                    eqHtml += '<tr><td><strong>' + e.magnitude.toFixed(1) + '</strong></td><td>' +
                        (e.place || '') + '</td><td>' + e.distance.toFixed(0) + ' km</td><td>' +
                        (e.depth || 0).toFixed(0) + ' km</td></tr>';
                }
                eqHtml += '</tbody></table>';
            }
            var eqEl = document.getElementById('live-earthquake-detail');
            if (eqEl) eqEl.innerHTML = eqHtml;

            DharaCharts.renderSeismicChart('chart-seismic', eq);
        }

        // Historical rainfall chart
        if (state.liveData.historical) {
            DharaCharts.renderHistoricalRainfall('chart-historical-rain', state.liveData.historical);
        }

        // Soil composition
        if (state.liveData.soil) {
            var s = state.liveData.soil;
            var soilHtml = '<div style="font-size:12px">' +
                '<strong>' + s.classification.usda + '</strong> (' + s.classification.is1498 + ')<br>' +
                'Clay: ' + s.composition.clay + '% | Sand: ' + s.composition.sand + '% | Silt: ' + s.composition.silt + '%<br>' +
                'pH: ' + s.properties.pH + ' | Organic C: ' + s.properties.organicCarbon + ' g/kg | BD: ' + s.properties.bulkDensity + ' g/cm³<br>' +
                '<em style="color:#888">Source: ISRIC SoilGrids v2.0 (250m resolution)</em></div>';
            var sEl = document.getElementById('live-soil-detail');
            if (sEl) sEl.innerHTML = soilHtml;

            DharaCharts.renderSoilComposition('chart-soil-composition', s);
        }
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
        setMetric('res-confidence', ra.confidence?.level || 'N/A', '');

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
            showToast('Please run analysis first.', 'warning');
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
            // Add earthquake markers if available
            if (state.liveData && state.liveData.earthquakes && state.liveData.earthquakes.events.length > 0) {
                // riskMap is created by MapModule.initRiskMap — use a short delay for it to be ready
                setTimeout(function() {
                    // The riskMap instance is internal to MapModule, so use a getter or pass it
                    // MapModule exposes addEarthquakeMarkers which needs the map instance
                    // We can access the risk map via the container
                    var riskMapContainer = document.getElementById('riskMapContainer');
                    if (riskMapContainer) {
                        // Leaflet stores map ref on the container element
                        var mapKeys = Object.keys(riskMapContainer).filter(function(k) {
                            return k.startsWith('_leaflet_id');
                        });
                        // Use L.Map instances stored internally
                        var allMaps = [];
                        riskMapContainer.querySelectorAll('.leaflet-container');
                        // Simpler: MapModule tracks riskMap internally, add a getRiskMap getter
                        // For now, we'll use the last created map approach
                        MapModule.addEarthquakeMarkers(
                            MapModule.getRiskMap ? MapModule.getRiskMap() : null,
                            state.liveData.earthquakes
                        );
                    }
                }, 300);
            }
            // Add weather overlay to risk map (not input map)
            if (state.liveData && state.liveData.weather) {
                setTimeout(function() {
                    var riskMapInstance = MapModule.getRiskMap ? MapModule.getRiskMap() : null;
                    if (riskMapInstance) {
                        MapModule.addWeatherOverlay(riskMapInstance, state.liveData.weather, state.lat, state.lon);
                    }
                }, 350);
            }
        }, 150);
    }

    // ========================================================================
    // DATA VISUALIZER PAGE
    // ========================================================================
    function showVisualizer() {
        if (!state.analysisComplete) {
            showToast('Please run analysis first.', 'warning');
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
            showToast('Please run analysis first.', 'warning');
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
            showToast('Please run analysis first.', 'warning');
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
        if (!state.analysisComplete) { showToast('Run analysis first.', 'warning'); return; }
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
        renderHistoryPanel();
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
        var mc = ar.monteCarlo || {};
        var apiCount = state.liveData ? state.liveData.successCount : 0;

        el.innerHTML =
            '<div class="dashboard-summary">' +
            '<div class="metric-card animated ' + riskClass(cls.level) + '"><div class="metric-label">Risk Score</div><div class="metric-value">' + ra.compositeScore?.toFixed(0) + '/100</div><div class="metric-delta">' + cls.level + ' — ' + cls.nidmCategory + '</div></div>' +
            '<div class="metric-card animated ' + fosClass(ar.compositeFoS) + '"><div class="metric-label">Factor of Safety</div><div class="metric-value">' + ar.compositeFoS?.toFixed(3) + '</div><div class="metric-delta">' + (ar.compositeFoS >= 1.5 ? 'Stable' : ar.compositeFoS >= 1.0 ? 'Marginal' : 'Unstable') + '</div></div>' +
            '<div class="metric-card animated"><div class="metric-label">Failure Probability</div><div class="metric-value">' + (mc.probability_of_failure?.toFixed(1) || '--') + '%</div><div class="metric-delta">' + (mc.iterations || 2000) + ' Monte Carlo iterations</div></div>' +
            '<div class="metric-card animated"><div class="metric-label">Confidence</div><div class="metric-value">' + (ra.confidence?.level || 'N/A') + '</div><div class="metric-delta">' + apiCount + '/6 live data sources</div></div>' +
            '</div>' +

            '<div class="grid-2" style="gap:16px;margin-top:16px">' +

            '<div class="card">' +
            '<div class="card-header"><h3>Assessment Summary</h3></div>' +
            '<table class="data-table">' +
            '<thead><tr><th>Parameter</th><th>Value</th><th>Status</th></tr></thead>' +
            '<tbody>' +
            '<tr><td>Location</td><td>' + (ar.locationName || (state.lat?.toFixed(4) + ', ' + state.lon?.toFixed(4))) + '</td><td>' + state.lat?.toFixed(4) + ', ' + state.lon?.toFixed(4) + '</td></tr>' +
            '<tr><td>Slope Angle</td><td>' + ar.slopeAngle + '°</td><td>' + (ar.slopeAngle > 45 ? '⚠ Very Steep' : ar.slopeAngle > 35 ? '⚠ Steep' : '✓ Moderate') + '</td></tr>' +
            '<tr><td>Soil Type</td><td>' + (ar.soilProperties?.name || '--') + '</td><td>' + (ar.soilProperties?.classification || '--') + '</td></tr>' +
            '<tr><td>Vegetation</td><td>' + (ar.vegetation?.vegetationPct || '--') + '% — ' + (ar.vegetation?.category || '') + '</td><td>' + (ar.vegetation?.deforestationRisk || '') + ' risk</td></tr>' +
            '<tr><td>Rainfall Status</td><td>' + (ar.rainfallThreshold?.status || '--') + '</td><td>Level ' + (ar.rainfallThreshold?.level || '--') + '</td></tr>' +
            '<tr><td>Foundation</td><td>Setback ' + (ar.foundation?.actualSetback || '--') + 'm / ' + (ar.foundation?.effectiveSetback || '--') + 'm</td><td>' + (ar.foundation?.isSetbackSafe ? '✓ Safe' : '⚠ Unsafe') + '</td></tr>' +
            (ar.elevation ? '<tr><td>Elevation</td><td>' + ar.elevation + ' m (DEM)</td><td>--</td></tr>' : '') +
            '</tbody></table></div>' +

            '<div class="card">' +
            '<div class="card-header"><h3>Analysis Methods</h3></div>' +
            '<table class="data-table">' +
            '<thead><tr><th>Method</th><th>FoS</th><th>Weight</th></tr></thead>' +
            '<tbody>' +
            '<tr><td>Infinite Slope (Fredlund & Rahardjo)</td><td><strong>' + (ar.infiniteSlope?.fos?.toFixed(4) || '--') + '</strong></td><td>40%</td></tr>' +
            '<tr><td>Bishop Simplified ' + (ar.bishop?.converged ? '✓' : '(NC)') + '</td><td><strong>' + (ar.bishop?.fos?.toFixed(4) || '--') + '</strong></td><td>35%</td></tr>' +
            '<tr><td>Janbu Simplified</td><td><strong>' + (ar.janbu?.fos?.toFixed(4) || '--') + '</strong></td><td>25%</td></tr>' +
            '<tr style="background:var(--primary);color:#fff;font-weight:700"><td>Composite FoS</td><td>' + (ar.compositeFoS?.toFixed(4) || '--') + '</td><td>100%</td></tr>' +
            '</tbody></table>' +
            '<div style="font-size:0.75rem;color:var(--text-muted);padding:8px;border-top:1px solid var(--border)">Monte Carlo: μ=' + (mc.mean_fos?.toFixed(3) || '--') + ', σ=' + (mc.std_fos?.toFixed(3) || '--') + ', P(fail)=' + (mc.probability_of_failure?.toFixed(1) || '--') + '%</div>' +
            '</div>' +

            '</div>' +

            '<div class="card" style="margin-top:16px">' +
            '<div class="card-header"><h3>Workflow Status</h3></div>' +
            '<div class="workflow-timeline">' +
            '<div class="wf-step done"><div class="wf-num">1</div><div class="wf-label">Survey</div></div>' +
            '<div class="wf-step done"><div class="wf-num">2</div><div class="wf-label">Data</div></div>' +
            '<div class="wf-step done"><div class="wf-num">3</div><div class="wf-label">Analysis</div></div>' +
            '<div class="wf-step active"><div class="wf-num">4</div><div class="wf-label">Review</div></div>' +
            '<div class="wf-step"><div class="wf-num">5</div><div class="wf-label">Execution</div></div>' +
            '<div class="wf-step"><div class="wf-num">6</div><div class="wf-label">Monitoring</div></div>' +
            '</div>' +
            '<div class="alert alert-warning" style="margin-top:12px">' +
            '<div>⚠ Final engineering approval required from a certified geotechnical engineer (IS 14496 / IRC:SP:48) before execution.</div>' +
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
    // ==================================================================
    // DARK MODE
    // ==================================================================
    function initDarkMode() {
        var toggle = document.getElementById('dark-mode-toggle');
        if (!toggle) return;

        // Restore saved preference
        if (localStorage.getItem('dhara-dark-mode') === '1') {
            document.body.classList.add('dark-mode');
            toggle.innerHTML = '☀️ <span>Light Mode</span>';
        }

        toggle.addEventListener('click', function () {
            document.body.classList.toggle('dark-mode');
            var isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('dhara-dark-mode', isDark ? '1' : '0');
            toggle.innerHTML = isDark ? '☀️ <span>Light Mode</span>' : '🌙 <span>Dark Mode</span>';
        });
    }

    // ==================================================================
    // HAMBURGER / MOBILE MENU
    // ==================================================================
    function initHamburger() {
        var btn = document.getElementById('hamburger-btn');
        var sidebar = document.getElementById('sidebar');
        if (!btn || !sidebar) return;

        btn.addEventListener('click', function () {
            btn.classList.toggle('open');
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function (e) {
            if (window.innerWidth > 900) return;
            if (!sidebar.contains(e.target) && !btn.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                btn.classList.remove('open');
            }
        });
    }

    // ==================================================================
    // CONNECTIVITY INDICATOR
    // ==================================================================
    function initConnectivity() {
        var badge = document.getElementById('connectivity-status');
        if (!badge) return;

        function update() {
            if (navigator.onLine) {
                badge.className = 'connectivity-badge online';
                badge.innerHTML = '<span class="conn-dot"></span> Online';
            } else {
                badge.className = 'connectivity-badge offline';
                badge.innerHTML = '<span class="conn-dot"></span> Offline';
            }
        }
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
    }

    // ==================================================================
    // LOCAL STORAGE PERSISTENCE
    // ==================================================================
    function saveStateToStorage() {
        try {
            var saveData = {
                lat: state.lat,
                lon: state.lon,
                analysisComplete: state.analysisComplete,
                timestamp: Date.now()
            };
            localStorage.setItem('dhara-state', JSON.stringify(saveData));
        } catch (e) { /* quota exceeded or private mode */ }
    }

    function restoreStateFromStorage() {
        try {
            var saved = localStorage.getItem('dhara-state');
            if (!saved) return;
            var data = JSON.parse(saved);
            // Only restore if less than 24 hours old
            if (Date.now() - data.timestamp > 86400000) return;
            if (data.lat) state.lat = data.lat;
            if (data.lon) state.lon = data.lon;
            var latEl = document.getElementById('inp-lat');
            var lonEl = document.getElementById('inp-lon');
            if (latEl) latEl.value = state.lat;
            if (lonEl) lonEl.value = state.lon;
        } catch (e) { /* ignore parse errors */ }
    }

    // ==================================================================
    // KEYBOARD SHORTCUTS
    // ==================================================================
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            // Ctrl+Enter or Cmd+Enter → Run Analysis
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runAnalysis();
            }
            // Escape → close hamburger on mobile
            if (e.key === 'Escape') {
                var sidebar = document.getElementById('sidebar');
                var hamburger = document.getElementById('hamburger-btn');
                if (sidebar) sidebar.classList.remove('open');
                if (hamburger) hamburger.classList.remove('open');
            }
        });
    }

    function init() {
        // Restore saved state and history
        restoreStateFromStorage();
        loadHistory();

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

        // Fetch Live Data button
        var fetchBtn = document.getElementById('btn-fetch-live');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', function() {
                fetchLiveData();
            });
        }

        // Initialize feature modules
        initDarkMode();
        initHamburger();
        initConnectivity();
        initKeyboardShortcuts();

        // Navigate to input page
        navigateTo('page-input');

        // Auto-fetch live data for default coordinates on load
        setTimeout(function() { fetchLiveData(); }, 500);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        init: init,
        navigateTo: navigateTo,
        fetchLiveData: fetchLiveData,
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
        exportJSON: exportJSON,
        exportCSV: exportCSV,
        clearHistory: clearHistory,
        loadHistoryEntry: loadHistoryEntry,
        showToast: showToast,
        state: state
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', DharaApp.init);
