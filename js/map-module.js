/**
 * ============================================================================
 * DHARA-RAKSHAK — Map Module (Leaflet-based)
 * ============================================================================
 * Interactive map with terrain layers, satellite view,
 * green cover estimation, and 1km risk heatmap.
 *
 * Tile Sources:
 *   - OpenStreetMap — Street basemap
 *   - OpenTopoMap  — Topographic contour basemap
 *   - Esri World Imagery — High-res satellite imagery
 *
 * Plugins: leaflet.heat for risk heatmap rendering
 * ============================================================================
 */

const MapModule = (function () {
    'use strict';

    let map = null;
    let marker = null;
    let clickCallback = null;

    let riskMap = null;
    let riskHeatLayer = null;

    let satMap = null;

    // ========================================================================
    // A. PRIMARY MAP (Site Input Page)
    // ========================================================================

    /**
     * Initialize the primary interactive map for site selection.
     * Layers: OSM (default), Topo, Satellite.
     * Click / drag marker → callback with (lat, lon).
     *
     * @param {string} containerId — DOM element ID
     * @param {number} lat — initial latitude
     * @param {number} lon — initial longitude
     * @param {Function} onClickFn — callback(lat, lon) on marker placement
     * @returns {L.Map}
     */
    function initMap(containerId, lat, lon, onClickFn) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        if (map) { map.remove(); map = null; }

        clickCallback = onClickFn;

        map = L.map(containerId, {
            center: [lat || 30.45, lon || 78.07],
            zoom: 12,
            zoomControl: true
        });

        // Base layers
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        });

        const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenTopoMap',
            maxZoom: 17
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery',
            maxZoom: 18
        });

        osm.addTo(map);

        L.control.layers({
            'Street Map': osm,
            'Topographic': topo,
            'Satellite': satellite
        }, {}, { position: 'topright' }).addTo(map);

        L.control.scale({ imperial: false }).addTo(map);

        // Click handler
        map.on('click', function (e) {
            setMarker(e.latlng.lat, e.latlng.lng);
            if (clickCallback) clickCallback(e.latlng.lat, e.latlng.lng);
        });

        // Initial marker
        setMarker(lat || 30.45, lon || 78.07);

        return map;
    }

    function setMarker(lat, lon) {
        if (!map) return;
        if (marker) map.removeLayer(marker);

        marker = L.marker([lat, lon], { draggable: true }).addTo(map);
        marker.bindPopup(
            '<strong>Assessment Site</strong><br>Lat: ' + lat.toFixed(5) + '<br>Lon: ' + lon.toFixed(5)
        ).openPopup();

        marker.on('dragend', function (e) {
            const pos = e.target.getLatLng();
            marker.setPopupContent(
                '<strong>Assessment Site</strong><br>Lat: ' + pos.lat.toFixed(5) + '<br>Lon: ' + pos.lng.toFixed(5)
            );
            if (clickCallback) clickCallback(pos.lat, pos.lng);
        });
    }

    function flyTo(lat, lon, zoom) {
        if (map) {
            map.flyTo([lat, lon], zoom || 14);
            setMarker(lat, lon);
        }
    }

    function getMap() { return map; }
    function getRiskMap() { return riskMap; }
    function getMarker() { return marker; }

    // ========================================================================
    // B. RISK HEATMAP (Page 3 — 1 km Radius)
    // ========================================================================

    /**
     * Initialize a Leaflet map showing risk heatmap within ~1km radius.
     * Uses leaflet.heat with simulated risk data points.
     *
     * How the heatmap is generated:
     *   We create a grid of points in a 1km radius around the site.
     *   Each point's "risk intensity" is computed from:
     *     - Distance from the analysis site center (closer = higher risk)
     *     - Base risk score from the composite analysis
     *     - Slope angle influence (steeper areas modeled as higher risk)
     *     - Random variation to simulate terrain heterogeneity
     *
     * Color scale: Red = high risk, Yellow = low risk
     *
     * @param {string} containerId
     * @param {number} lat
     * @param {number} lon
     * @param {Object} analysisResults — from GeotechnicalEngine
     * @param {Object} riskAssessment — from RiskClassifier
     */
    function initRiskMap(containerId, lat, lon, analysisResults, riskAssessment) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (riskMap) { riskMap.remove(); riskMap = null; }

        riskMap = L.map(containerId, {
            center: [lat, lon],
            zoom: 14,
            zoomControl: true
        });

        // Satellite base for risk map
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery',
            maxZoom: 18
        }).addTo(riskMap);

        // Add topo overlay option
        const topoOverlay = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenTopoMap',
            maxZoom: 17,
            opacity: 0.5
        });
        L.control.layers({}, { 'Topographic Overlay': topoOverlay }, { position: 'topright' }).addTo(riskMap);

        L.control.scale({ imperial: false }).addTo(riskMap);

        // Generate heatmap data
        const heatData = generateRiskHeatData(lat, lon, analysisResults, riskAssessment);

        // Create heat layer
        if (riskHeatLayer) riskMap.removeLayer(riskHeatLayer);

        riskHeatLayer = L.heatLayer(heatData, {
            radius: 30,
            blur: 20,
            maxZoom: 16,
            max: 1.0,
            gradient: {
                0.0: '#1a9850',   // Low — green
                0.25: '#d9ef8b',  // Low-moderate — light green
                0.5: '#fee08b',   // Moderate — yellow
                0.75: '#fc8d59',  // Moderate-high — orange
                1.0: '#d73027'    // High — red
            }
        }).addTo(riskMap);

        // Add center marker
        L.marker([lat, lon]).addTo(riskMap)
            .bindPopup('<strong>Analysis Center</strong><br>1 km risk zone shown')
            .openPopup();

        // Add 1km radius circle
        L.circle([lat, lon], {
            radius: 1000,
            color: '#D32F2F',
            weight: 2,
            dashArray: '8, 4',
            fill: false,
            opacity: 0.6
        }).addTo(riskMap);
    }

    /**
     * Generate simulated risk data points in a 1km radius.
     *
     * Each point is [lat, lon, intensity] where intensity ∈ [0, 1].
     *
     * Risk factors considered:
     * - Proximity to center (closer to unstable site → higher risk)
     * - Composite risk score from analysis
     * - Slope orientation effect (simulated angular variation)
     * - Terrain heterogeneity (random seed per grid cell)
     *
     * @returns {Array} [[lat, lon, intensity], ...]
     */
    function generateRiskHeatData(lat, lon, analysisResults, riskAssessment) {
        const points = [];
        const baseRisk = (riskAssessment?.compositeScore || 50) / 100;
        const slopeAngle = analysisResults?.slopeAngle || 35;

        // 1 km ≈ 0.009 degrees latitude
        const radiusDeg = 0.009;
        const step = radiusDeg / 12; // ~24 points across diameter → ~450 total points

        // Pseudo-random seed based on coordinates (deterministic per location)
        function seededRandom(x, y) {
            const dot = x * 12.9898 + y * 78.233;
            const s = Math.sin(dot) * 43758.5453;
            return s - Math.floor(s);
        }

        for (let dlat = -radiusDeg; dlat <= radiusDeg; dlat += step) {
            for (let dlon = -radiusDeg; dlon <= radiusDeg; dlon += step) {
                const dist = Math.sqrt(dlat * dlat + dlon * dlon);
                if (dist > radiusDeg) continue; // Circular boundary

                const normalizedDist = dist / radiusDeg; // 0 at center, 1 at edge

                // Distance decay: risk is highest near center
                const distanceFactor = Math.pow(1 - normalizedDist, 1.5);

                // Angular variation (simulates slope orientation / aspect)
                const angle = Math.atan2(dlon, dlat);
                const aspectFactor = 0.85 + 0.15 * Math.sin(angle * 2 + slopeAngle * 0.05);

                // Terrain noise
                const noise = seededRandom(lat + dlat, lon + dlon) * 0.25;

                // Slope influence: steeper slopes have wider high-risk zone
                const slopeFactor = 0.7 + 0.3 * Math.min(1, slopeAngle / 60);

                // Composite intensity
                let intensity = baseRisk * distanceFactor * aspectFactor * slopeFactor + noise * 0.15;
                intensity = Math.max(0, Math.min(1, intensity));

                points.push([lat + dlat, lon + dlon, intensity]);
            }
        }

        return points;
    }

    // ========================================================================
    // C. SATELLITE VIEW (Green Cover Estimation)
    // ========================================================================

    /**
     * Initialize satellite view map for green cover estimation.
     *
     * How green percentage is estimated:
     *   This module uses Esri World Imagery satellite tiles as a visual reference.
     *   Since we cannot access raw NDVI data from a free tile server in a
     *   client-side web app, we use a proxy estimation approach:
     *
     *   1. A 500m radius circle is drawn around the selected location.
     *   2. The vegetation percentage is estimated using a terrain-based model:
     *      - Elevation proxy from latitude (higher latitudes in India ≈ higher elevation)
     *      - Slope angle influence (steeper slopes → less vegetation)
     *      - Rainfall zone estimation from longitude
     *      - Coordinate-based pseudo-random local variation
     *   3. The result is calibrated against typical NDVI ranges for Indian terrain.
     *
     *   For production use, this should be replaced with:
     *   - Google Earth Engine NDVI API
     *   - Sentinel-2 NDVI via Copernicus Open Access Hub
     *   - ISRO Bhuvan LISS-III / ResourceSat-2 data
     *
     *   Satellite data sources referenced in report:
     *   - Esri World Imagery: Maxar, DigitalGlobe, GeoEye, CNES/Airbus DS
     *   - Resolution: ~0.5m urban, ~15m rural (depending on zoom level)
     *
     * @param {string} containerId
     * @param {number} lat
     * @param {number} lon
     * @param {number} currentSlopeAngle
     * @returns {Object} { map, estimatedGreenPct }
     */
    function initSatelliteView(containerId, lat, lon, currentSlopeAngle) {
        const container = document.getElementById(containerId);
        if (!container) return { map: null, estimatedGreenPct: 0 };

        if (satMap) { satMap.remove(); satMap = null; }

        satMap = L.map(containerId, {
            center: [lat, lon],
            zoom: 15,
            zoomControl: true
        });

        // Satellite only
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery (Maxar, DigitalGlobe, GeoEye)',
            maxZoom: 18
        }).addTo(satMap);

        L.control.scale({ imperial: false }).addTo(satMap);

        // 500m analysis circle
        L.circle([lat, lon], {
            radius: 500,
            color: '#4CAF50',
            weight: 2,
            dashArray: '6, 4',
            fillColor: '#4CAF50',
            fillOpacity: 0.08
        }).addTo(satMap);

        // Center marker
        L.marker([lat, lon]).addTo(satMap)
            .bindPopup('<strong>Satellite Analysis Center</strong><br>500m radius shown')
            .openPopup();

        // Estimate green percentage
        const greenPct = estimateGreenPercentage(lat, lon, currentSlopeAngle || 35);

        return {
            map: satMap,
            estimatedGreenPct: greenPct
        };
    }

    /**
     * Estimate vegetation green percentage from location parameters.
     *
     * Model description (for report):
     *   Green% = f(latitude, longitude, slope_angle, local_noise)
     *
     *   Components:
     *   1. Latitude factor: Indian latitudes 8°–35°N.
     *      - Lower latitudes (southern India): higher base vegetation (~60-80%)
     *      - Higher latitudes (Himalayan): moderate (~40-60%) due to altitude
     *      - Very high latitudes (>32°): reduced due to alpine conditions
     *
     *   2. Slope factor: Steeper slopes have less vegetation
     *      - 0-20°: 100% of potential (flat/gentle terrain)
     *      - 20-45°: Linear reduction to 60% of potential
     *      - >45°: Rapid reduction (rocky/exposed slopes)
     *
     *   3. Longitude/rainfall factor: Western Ghats, NE India have higher rainfall
     *      - 73-78°E (Western Ghats belt): +10% bonus
     *      - 88-97°E (Northeast): +15% bonus
     *      - 76-82°E (Central): neutral
     *
     *   4. Local variation: Pseudo-random ±10% based on coordinates
     *
     *   Calibration: Output range 5-90%, mean ~45-55% for typical Indian terrain.
     *
     * @param {number} lat
     * @param {number} lon
     * @param {number} slopeAngle
     * @returns {number} Estimated green percentage (0-100)
     */
    function estimateGreenPercentage(lat, lon, slopeAngle) {
        // Base vegetation by latitude
        let latFactor;
        if (lat < 12) latFactor = 70;        // Southern coastal
        else if (lat < 18) latFactor = 65;   // Deccan
        else if (lat < 24) latFactor = 55;   // Central
        else if (lat < 30) latFactor = 50;   // Northern plains / Sub-Himalayan
        else if (lat < 33) latFactor = 45;   // Mid-Himalayan
        else latFactor = 35;                 // High Himalayan / Alpine

        // Slope reduction
        let slopeFactor = 1.0;
        if (slopeAngle > 45) slopeFactor = 0.4;
        else if (slopeAngle > 35) slopeFactor = 0.6;
        else if (slopeAngle > 25) slopeFactor = 0.75;
        else if (slopeAngle > 15) slopeFactor = 0.9;

        // Rainfall / longitude bonus
        let rainBonus = 0;
        if (lon >= 73 && lon <= 78) rainBonus = 10;       // Western Ghats
        else if (lon >= 88 && lon <= 97) rainBonus = 15;  // Northeast India
        else if (lon >= 76 && lon <= 82) rainBonus = 3;   // Central

        // Pseudo-random local noise (deterministic per coordinate)
        const seed = Math.sin(lat * 127.1 + lon * 311.7) * 43758.5453;
        const noise = ((seed - Math.floor(seed)) - 0.5) * 20; // ±10

        let greenPct = (latFactor * slopeFactor) + rainBonus + noise;
        greenPct = Math.max(5, Math.min(90, Math.round(greenPct)));

        return greenPct;
    }

    // ========================================================================
    // EARTHQUAKE MARKERS ON RISK MAP (from USGS live data)
    // ========================================================================
    let earthquakeLayerGroup = null;

    function addEarthquakeMarkers(mapInstance, earthquakeData) {
        if (!mapInstance || !earthquakeData || !earthquakeData.events) return;

        // Remove old markers
        if (earthquakeLayerGroup) {
            mapInstance.removeLayer(earthquakeLayerGroup);
        }
        earthquakeLayerGroup = L.layerGroup();

        earthquakeData.events.forEach(function(eq) {
            var color = eq.magnitude >= 5 ? '#F44336' :
                        eq.magnitude >= 4 ? '#FF9800' :
                        eq.magnitude >= 3 ? '#FFC107' : '#4CAF50';
            var radius = Math.max(4, eq.magnitude * 4);

            var marker = L.circleMarker([eq.lat, eq.lon], {
                radius: radius,
                fillColor: color,
                color: '#333',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.7
            });

            marker.bindPopup(
                '<div style="min-width:150px">' +
                '<strong style="font-size:14px">M ' + eq.magnitude.toFixed(1) + '</strong><br>' +
                '<span style="color:#666">' + (eq.place || 'Unknown') + '</span><br>' +
                '<span style="font-size:11px">Depth: ' + (eq.depth || 0).toFixed(1) + ' km</span><br>' +
                '<span style="font-size:11px">Distance: ' + eq.distance.toFixed(0) + ' km</span><br>' +
                '<span style="font-size:10px;color:#999">' + (eq.time ? new Date(eq.time).toLocaleDateString() : '') + '</span>' +
                '</div>'
            );

            earthquakeLayerGroup.addLayer(marker);
        });

        earthquakeLayerGroup.addTo(mapInstance);
    }

    // ========================================================================
    // WEATHER OVERLAY (wind direction indicators)
    // ========================================================================
    let weatherOverlayGroup = null;

    function addWeatherOverlay(mapInstance, weatherData, lat, lon) {
        if (!mapInstance || !weatherData || !weatherData.current) return;

        if (weatherOverlayGroup) {
            mapInstance.removeLayer(weatherOverlayGroup);
        }
        weatherOverlayGroup = L.layerGroup();

        var w = weatherData.current;
        var icon = L.divIcon({
            className: 'weather-map-icon',
            html: '<div style="background:rgba(33,150,243,0.9);color:#fff;padding:4px 8px;border-radius:6px;font-size:11px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">' +
                  '<strong>' + w.temperature + '°C</strong> | ' +
                  w.humidity + '% | ' + w.windSpeed + ' km/h' +
                  (w.precipitation > 0 ? ' | 🌧 ' + w.precipitation + 'mm' : '') +
                  '</div>',
            iconSize: [200, 30],
            iconAnchor: [100, 35]
        });

        L.marker([lat, lon], { icon: icon, interactive: false })
            .addTo(weatherOverlayGroup);

        weatherOverlayGroup.addTo(mapInstance);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        // Primary map
        initMap,
        setMarker,
        flyTo,
        getMap,
        getRiskMap,
        getMarker,

        // Risk heatmap
        initRiskMap,
        generateRiskHeatData,

        // Satellite & green cover
        initSatelliteView,
        estimateGreenPercentage,

        // Live data overlays
        addEarthquakeMarkers,
        addWeatherOverlay
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapModule;
}
