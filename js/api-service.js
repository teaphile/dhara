/**
 * ============================================================================
 * DHARA-RAKSHAK — Live Data API Service
 * ============================================================================
 * Fetches REAL data from free, public APIs (no API keys required):
 *
 *   1. Open-Meteo Weather API — Real-time weather, rainfall, soil moisture
 *   2. Open-Meteo Historical — Past 30 days rainfall for I-D validation
 *   3. Open-Meteo Elevation — Real DEM elevation at point
 *   4. Nominatim (OpenStreetMap) — Reverse geocoding (place name)
 *   5. USGS Earthquake API — Recent seismic events within 300km
 *   6. ISRIC SoilGrids API — Real soil properties (clay%, sand%, pH, etc.)
 *
 * ALL APIs are FREE and require NO API keys.
 * Graceful fallback to static data on failure.
 * ============================================================================
 */

const ApiService = (function () {
    'use strict';

    // ========================================================================
    // CACHE (avoid repeat calls for same coordinates)
    // ========================================================================
    const cache = {};
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    function getCached(key) {
        const entry = cache[key];
        if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) return entry.data;
        return null;
    }

    function setCache(key, data) {
        cache[key] = { data, timestamp: Date.now() };
    }

    // ========================================================================
    // STATUS TRACKING
    // ========================================================================
    const apiStatus = {
        weather: { status: 'idle', lastFetch: null, error: null },
        historical: { status: 'idle', lastFetch: null, error: null },
        elevation: { status: 'idle', lastFetch: null, error: null },
        geocode: { status: 'idle', lastFetch: null, error: null },
        earthquake: { status: 'idle', lastFetch: null, error: null },
        soilgrids: { status: 'idle', lastFetch: null, error: null }
    };

    function updateStatus(api, status, error) {
        apiStatus[api].status = status;
        apiStatus[api].lastFetch = new Date().toISOString();
        if (error) apiStatus[api].error = error;
        else apiStatus[api].error = null;
    }

    // ========================================================================
    // GENERIC FETCH WITH TIMEOUT & ERROR HANDLING
    // ========================================================================
    async function safeFetch(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout || 12000);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                ...options
            });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (err) {
            clearTimeout(timeout);
            throw err;
        }
    }

    // ========================================================================
    // 1. OPEN-METEO: CURRENT WEATHER + FORECAST
    // ========================================================================
    /**
     * Fetch real-time weather data including rainfall, temperature,
     * humidity, wind, soil moisture, and 3-day forecast.
     *
     * API: https://open-meteo.com (Free, no key)
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object} weather data
     */
    async function fetchWeather(lat, lon) {
        const cacheKey = `weather_${lat.toFixed(3)}_${lon.toFixed(3)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        updateStatus('weather', 'loading');

        try {
            const url = `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${lat}&longitude=${lon}` +
                `&current=temperature_2m,relative_humidity_2m,rain,showers,precipitation,` +
                `wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,cloud_cover` +
                `&hourly=rain,showers,precipitation,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,` +
                `soil_temperature_0cm,temperature_2m,relative_humidity_2m` +
                `&daily=rain_sum,showers_sum,precipitation_sum,temperature_2m_max,temperature_2m_min,` +
                `wind_speed_10m_max,precipitation_hours` +
                `&timezone=auto&forecast_days=7&past_days=2`;

            const data = await safeFetch(url);

            const result = {
                source: 'Open-Meteo Weather API',
                timestamp: new Date().toISOString(),
                current: {
                    temperature: data.current?.temperature_2m,
                    humidity: data.current?.relative_humidity_2m,
                    rain: data.current?.rain || 0,
                    showers: data.current?.showers || 0,
                    precipitation: data.current?.precipitation || 0,
                    windSpeed: data.current?.wind_speed_10m,
                    windDirection: data.current?.wind_direction_10m,
                    pressure: data.current?.surface_pressure,
                    weatherCode: data.current?.weather_code,
                    cloudCover: data.current?.cloud_cover,
                    weatherDescription: weatherCodeToText(data.current?.weather_code)
                },
                hourly: {
                    time: data.hourly?.time || [],
                    rain: data.hourly?.rain || [],
                    showers: data.hourly?.showers || [],
                    precipitation: data.hourly?.precipitation || [],
                    soilMoisture0to7: data.hourly?.soil_moisture_0_to_7cm || [],
                    soilMoisture7to28: data.hourly?.soil_moisture_7_to_28cm || [],
                    soilTemperature: data.hourly?.soil_temperature_0cm || [],
                    temperature: data.hourly?.temperature_2m || [],
                    humidity: data.hourly?.relative_humidity_2m || []
                },
                daily: {
                    time: data.daily?.time || [],
                    rainSum: data.daily?.rain_sum || [],
                    showersSum: data.daily?.showers_sum || [],
                    precipitationSum: data.daily?.precipitation_sum || [],
                    tempMax: data.daily?.temperature_2m_max || [],
                    tempMin: data.daily?.temperature_2m_min || [],
                    windMax: data.daily?.wind_speed_10m_max || [],
                    precipHours: data.daily?.precipitation_hours || []
                },
                units: data.current_units || {}
            };

            // Compute useful derived values
            result.derived = computeWeatherDerived(result);

            setCache(cacheKey, result);
            updateStatus('weather', 'success');
            return result;

        } catch (err) {
            console.warn('Weather API failed:', err.message);
            updateStatus('weather', 'error', err.message);
            return null;
        }
    }

    /**
     * Compute derived weather metrics useful for landslide analysis
     */
    function computeWeatherDerived(weather) {
        const hourlyRain = weather.hourly.precipitation || [];

        // Last 24 hours total rainfall
        const now = new Date();
        const hourlyTimes = weather.hourly.time.map(t => new Date(t));
        let rainfall24h = 0;
        let rainfall48h = 0;
        let rainfall72h = 0;
        let currentIntensity = 0;
        let maxIntensity = 0;
        let rainHours = 0;

        for (let i = 0; i < hourlyTimes.length; i++) {
            const diffHrs = (now - hourlyTimes[i]) / (1000 * 3600);
            const rain = hourlyRain[i] || 0;

            if (diffHrs >= 0 && diffHrs <= 24) {
                rainfall24h += rain;
                if (rain > 0) rainHours++;
                if (rain > maxIntensity) maxIntensity = rain;
            }
            if (diffHrs >= 0 && diffHrs <= 48) rainfall48h += rain;
            if (diffHrs >= 0 && diffHrs <= 72) rainfall72h += rain;
            if (diffHrs >= 0 && diffHrs <= 1) currentIntensity = rain;
        }

        // Soil moisture average (recent)
        const sm = weather.hourly.soilMoisture0to7 || [];
        const recentSm = sm.slice(-24).filter(v => v != null);
        const avgSoilMoisture = recentSm.length > 0
            ? recentSm.reduce((a, b) => a + b, 0) / recentSm.length
            : null;

        // Antecedent rainfall index (API) — weighted sum of past days
        const dailyRain = weather.daily.precipitationSum || [];
        let api = 0;
        for (let d = 0; d < dailyRain.length && d < 7; d++) {
            api += (dailyRain[d] || 0) * Math.pow(0.85, d); // Decay factor 0.85
        }

        // Weather severity score (0-100) for risk modifier
        let weatherSeverity = 0;
        if (rainfall24h > 100) weatherSeverity += 40;
        else if (rainfall24h > 50) weatherSeverity += 25;
        else if (rainfall24h > 20) weatherSeverity += 15;
        else if (rainfall24h > 5) weatherSeverity += 5;

        if (maxIntensity > 30) weatherSeverity += 30;
        else if (maxIntensity > 15) weatherSeverity += 20;
        else if (maxIntensity > 5) weatherSeverity += 10;

        if (avgSoilMoisture && avgSoilMoisture > 0.35) weatherSeverity += 15;
        else if (avgSoilMoisture && avgSoilMoisture > 0.25) weatherSeverity += 8;

        if (api > 50) weatherSeverity += 15;
        else if (api > 25) weatherSeverity += 8;

        return {
            rainfall24h: parseFloat(rainfall24h.toFixed(1)),
            rainfall48h: parseFloat(rainfall48h.toFixed(1)),
            rainfall72h: parseFloat(rainfall72h.toFixed(1)),
            currentIntensity: parseFloat(currentIntensity.toFixed(1)),
            maxIntensity24h: parseFloat(maxIntensity.toFixed(1)),
            rainHours24h: rainHours,
            avgSoilMoisture: avgSoilMoisture ? parseFloat(avgSoilMoisture.toFixed(3)) : null,
            antecedentRainfallIndex: parseFloat(api.toFixed(1)),
            weatherSeverityScore: Math.min(100, weatherSeverity),
            effectiveDuration: rainHours > 0 ? rainHours : null
        };
    }

    // ========================================================================
    // 2. OPEN-METEO: HISTORICAL RAINFALL (30 DAYS)
    // ========================================================================
    /**
     * Fetch past 30 days daily rainfall for I-D threshold validation
     * and antecedent moisture analysis.
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object}
     */
    async function fetchHistoricalRainfall(lat, lon) {
        const cacheKey = `historical_${lat.toFixed(3)}_${lon.toFixed(3)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        updateStatus('historical', 'loading');

        try {
            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 30);

            const fmt = d => d.toISOString().split('T')[0];

            const url = `https://archive-api.open-meteo.com/v1/archive?` +
                `latitude=${lat}&longitude=${lon}` +
                `&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}` +
                `&daily=rain_sum,showers_sum,precipitation_sum,temperature_2m_max,` +
                `temperature_2m_min,wind_speed_10m_max` +
                `&timezone=auto`;

            const data = await safeFetch(url);

            const result = {
                source: 'Open-Meteo Historical Archive',
                period: { start: fmt(startDate), end: fmt(endDate) },
                daily: {
                    time: data.daily?.time || [],
                    rainSum: data.daily?.rain_sum || [],
                    precipitationSum: data.daily?.precipitation_sum || [],
                    tempMax: data.daily?.temperature_2m_max || [],
                    tempMin: data.daily?.temperature_2m_min || [],
                    windMax: data.daily?.wind_speed_10m_max || []
                }
            };

            // Derived stats
            const precip = result.daily.precipitationSum.filter(v => v != null);
            result.stats = {
                totalRainfall30d: parseFloat(precip.reduce((a, b) => a + b, 0).toFixed(1)),
                maxDailyRainfall: parseFloat(Math.max(...precip, 0).toFixed(1)),
                rainyDays: precip.filter(v => v > 0.1).length,
                avgDailyRainfall: parseFloat((precip.reduce((a, b) => a + b, 0) / Math.max(1, precip.length)).toFixed(1)),
                heavyRainDays: precip.filter(v => v > 50).length,
                maxTemp: Math.max(...(result.daily.tempMax || [0])),
                minTemp: Math.min(...(result.daily.tempMin || [99]))
            };

            setCache(cacheKey, result);
            updateStatus('historical', 'success');
            return result;

        } catch (err) {
            console.warn('Historical API failed:', err.message);
            updateStatus('historical', 'error', err.message);
            return null;
        }
    }

    // ========================================================================
    // 3. OPEN-METEO: ELEVATION (DEM)
    // ========================================================================
    /**
     * Fetch real elevation from DEM (Digital Elevation Model) data.
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object}
     */
    async function fetchElevation(lat, lon) {
        const cacheKey = `elevation_${lat.toFixed(4)}_${lon.toFixed(4)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        updateStatus('elevation', 'loading');

        try {
            const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
            const data = await safeFetch(url);

            const elevation = data.elevation?.[0] ?? data.elevation ?? null;

            // Also get nearby points for slope estimation
            const delta = 0.001; // ~111m
            const urlMulti = `https://api.open-meteo.com/v1/elevation?` +
                `latitude=${lat},${lat + delta},${lat - delta},${lat},${lat}` +
                `&longitude=${lon},${lon},${lon},${lon + delta},${lon - delta}`;

            const multiData = await safeFetch(urlMulti);
            const elevations = multiData.elevation || [elevation, elevation, elevation, elevation, elevation];

            // Estimate slope from 4-point neighbors
            const elevCenter = elevations[0];
            const elevN = elevations[1];
            const elevS = elevations[2];
            const elevE = elevations[3];
            const elevW = elevations[4];

            const dx = delta * 111000 * Math.cos(lat * Math.PI / 180); // meters
            const dy = delta * 111000; // meters

            const dzdx = (elevE - elevW) / (2 * dx);
            const dzdy = (elevN - elevS) / (2 * dy);
            const slopeRadians = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
            const slopeDegrees = slopeRadians * 180 / Math.PI;

            // Aspect (direction slope faces)
            const aspectRadians = Math.atan2(-dzdx, dzdy);
            const aspectDegrees = ((aspectRadians * 180 / Math.PI) + 360) % 360;

            const result = {
                source: 'Open-Meteo Elevation API (Copernicus DEM)',
                elevation: elevation,
                unit: 'm (above sea level)',
                estimatedSlope: parseFloat(slopeDegrees.toFixed(1)),
                aspect: parseFloat(aspectDegrees.toFixed(0)),
                aspectDirection: degreeToDirection(aspectDegrees),
                neighborElevations: {
                    center: elevCenter, north: elevN, south: elevS,
                    east: elevE, west: elevW
                },
                terrainRoughness: parseFloat(
                    Math.sqrt(
                        Math.pow(elevN - elevCenter, 2) + Math.pow(elevS - elevCenter, 2) +
                        Math.pow(elevE - elevCenter, 2) + Math.pow(elevW - elevCenter, 2)
                    ).toFixed(1)
                )
            };

            setCache(cacheKey, result);
            updateStatus('elevation', 'success');
            return result;

        } catch (err) {
            console.warn('Elevation API failed:', err.message);
            updateStatus('elevation', 'error', err.message);
            return null;
        }
    }

    // ========================================================================
    // 4. NOMINATIM: REVERSE GEOCODING (PLACE NAME)
    // ========================================================================
    /**
     * Get human-readable place name from coordinates.
     * API: Nominatim (OpenStreetMap), free, no key.
     * Rate limit: 1 req/sec — cached aggressively.
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object}
     */
    async function fetchGeocode(lat, lon) {
        const cacheKey = `geocode_${lat.toFixed(3)}_${lon.toFixed(3)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        updateStatus('geocode', 'loading');

        try {
            const url = `https://nominatim.openstreetmap.org/reverse?` +
                `lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=14` +
                `&accept-language=en`;

            const data = await safeFetch(url, {
                headers: { 'User-Agent': 'DharaRakshak/2.0 (landslide-risk-tool)' },
                timeout: 8000
            });

            const result = {
                source: 'Nominatim (OpenStreetMap)',
                displayName: data.display_name || 'Unknown Location',
                name: data.name || '',
                address: {
                    village: data.address?.village || data.address?.town || data.address?.city || '',
                    county: data.address?.county || data.address?.state_district || '',
                    state: data.address?.state || '',
                    country: data.address?.country || '',
                    postcode: data.address?.postcode || ''
                },
                shortName: buildShortName(data.address),
                type: data.type || ''
            };

            setCache(cacheKey, result);
            updateStatus('geocode', 'success');
            return result;

        } catch (err) {
            console.warn('Geocode API failed:', err.message);
            updateStatus('geocode', 'error', err.message);
            return null;
        }
    }

    // ========================================================================
    // 5. USGS: EARTHQUAKE DATA (SEISMIC RISK)
    // ========================================================================
    /**
     * Fetch recent earthquakes within 300km radius.
     * API: USGS Earthquake Hazards Program — free, no key.
     *
     * Seismic activity is a significant landslide trigger.
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object}
     */
    async function fetchEarthquakes(lat, lon) {
        const cacheKey = `earthquake_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        updateStatus('earthquake', 'loading');

        try {
            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 365); // Past 1 year

            const fmt = d => d.toISOString().split('T')[0];

            const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
                `&starttime=${fmt(startDate)}&endtime=${fmt(endDate)}` +
                `&latitude=${lat}&longitude=${lon}&maxradiuskm=300` +
                `&minmagnitude=2&orderby=magnitude&limit=100`;

            const data = await safeFetch(url, { timeout: 15000 });

            const events = (data.features || []).map(f => ({
                magnitude: f.properties?.mag,
                place: f.properties?.place,
                time: new Date(f.properties?.time).toISOString(),
                depth: f.geometry?.coordinates?.[2],
                lat: f.geometry?.coordinates?.[1],
                lon: f.geometry?.coordinates?.[0],
                type: f.properties?.type,
                distance: haversineDistance(
                    lat, lon,
                    f.geometry?.coordinates?.[1],
                    f.geometry?.coordinates?.[0]
                )
            }));

            // Seismic risk scoring
            let seismicScore = 0;
            let significantQuakes = 0;
            let maxMagnitude = 0;
            let nearestDistance = Infinity;

            for (const eq of events) {
                if (eq.magnitude > maxMagnitude) maxMagnitude = eq.magnitude;
                if (eq.distance < nearestDistance) nearestDistance = eq.distance;
                if (eq.magnitude >= 4.0) significantQuakes++;

                // Distance-weighted magnitude contribution
                const distFactor = Math.max(0.1, 1 - eq.distance / 300);
                const magFactor = Math.pow(eq.magnitude, 1.5) / 10;
                seismicScore += distFactor * magFactor;
            }

            // Normalize to 0-100
            seismicScore = Math.min(100, seismicScore * 3);

            // Seismic risk classification  
            let seismicRisk = 'LOW';
            if (seismicScore >= 60) seismicRisk = 'HIGH';
            else if (seismicScore >= 30) seismicRisk = 'MODERATE';

            const result = {
                source: 'USGS Earthquake Hazards Program',
                period: { start: fmt(startDate), end: fmt(endDate) },
                radius: '300 km',
                totalEvents: events.length,
                significantEvents: significantQuakes,
                maxMagnitude: maxMagnitude,
                nearestDistance: parseFloat(nearestDistance.toFixed(1)),
                seismicScore: parseFloat(seismicScore.toFixed(1)),
                seismicRisk: seismicRisk,
                events: events.slice(0, 50), // Top 50 by magnitude
                riskModifier: seismicScore >= 60 ? 0.15 : seismicScore >= 30 ? 0.08 : 0.02
            };

            setCache(cacheKey, result);
            updateStatus('earthquake', 'success');
            return result;

        } catch (err) {
            console.warn('Earthquake API failed:', err.message);
            updateStatus('earthquake', 'error', err.message);
            return null;
        }
    }

    // ========================================================================
    // 6. ISRIC SOILGRIDS: REAL SOIL PROPERTIES
    // ========================================================================
    /**
     * Fetch real soil properties from ISRIC SoilGrids (250m resolution).
     * Properties: clay%, sand%, silt%, bulk density, pH, organic carbon.
     * These can refine the geotechnical model significantly.
     *
     * API: https://rest.isric.org (free, no key)
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object}
     */
    async function fetchSoilData(lat, lon) {
        const cacheKey = `soil_${lat.toFixed(3)}_${lon.toFixed(3)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        updateStatus('soilgrids', 'loading');

        try {
            const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?` +
                `lon=${lon}&lat=${lat}` +
                `&property=clay&property=sand&property=silt` +
                `&property=bdod&property=phh2o&property=soc&property=cec` +
                `&depth=0-30cm&value=mean`;

            const data = await safeFetch(url, { timeout: 15000 });

            const props = {};
            for (const layer of (data.properties?.layers || [])) {
                const name = layer.name;
                const depth = layer.depths?.[0];
                const value = depth?.values?.mean;
                props[name] = {
                    value: value,
                    unit: layer.unit_measure?.mapped_units || '',
                    label: layer.name
                };
            }

            // Convert SoilGrids units (they use special units)
            const clayPct = (props.clay?.value || 0) / 10;     // g/kg → %
            const sandPct = (props.sand?.value || 0) / 10;     // g/kg → %
            const siltPct = (props.silt?.value || 0) / 10;     // g/kg → %
            const bulkDensity = (props.bdod?.value || 0) / 100; // cg/cm³ → g/cm³
            const pH = (props.phh2o?.value || 0) / 10;          // pH×10 → pH
            const organicCarbon = (props.soc?.value || 0) / 10; // dg/kg → g/kg
            const cec = (props.cec?.value || 0) / 10;           // mmol/kg → cmol/kg

            // Estimate engineering properties from compositional data
            const estimated = estimateEngineeringProps(clayPct, sandPct, siltPct, bulkDensity);

            const result = {
                source: 'ISRIC SoilGrids v2.0 (250m resolution)',
                depth: '0-30 cm',
                composition: {
                    clay: parseFloat(clayPct.toFixed(1)),
                    sand: parseFloat(sandPct.toFixed(1)),
                    silt: parseFloat(siltPct.toFixed(1))
                },
                properties: {
                    bulkDensity: parseFloat(bulkDensity.toFixed(2)),
                    pH: parseFloat(pH.toFixed(1)),
                    organicCarbon: parseFloat(organicCarbon.toFixed(1)),
                    cec: parseFloat(cec.toFixed(1))
                },
                classification: classifySoil(clayPct, sandPct, siltPct),
                engineering: estimated,
                raw: props
            };

            setCache(cacheKey, result);
            updateStatus('soilgrids', 'success');
            return result;

        } catch (err) {
            console.warn('SoilGrids API failed:', err.message);
            updateStatus('soilgrids', 'error', err.message);
            return null;
        }
    }

    // ========================================================================
    // MASTER: FETCH ALL DATA IN PARALLEL
    // ========================================================================
    /**
     * Fetch all live data sources in parallel (fast).
     * Each API call is independent — failures are isolated.
     *
     * @param {number} lat
     * @param {number} lon
     * @returns {Object} Combined live data from all sources
     */
    async function fetchAllLiveData(lat, lon) {
        const startTime = Date.now();

        const [weather, historical, elevation, geocode, earthquakes, soil] =
            await Promise.allSettled([
                fetchWeather(lat, lon),
                fetchHistoricalRainfall(lat, lon),
                fetchElevation(lat, lon),
                fetchGeocode(lat, lon),
                fetchEarthquakes(lat, lon),
                fetchSoilData(lat, lon)
            ]);

        const result = {
            weather: weather.status === 'fulfilled' ? weather.value : null,
            historical: historical.status === 'fulfilled' ? historical.value : null,
            elevation: elevation.status === 'fulfilled' ? elevation.value : null,
            geocode: geocode.status === 'fulfilled' ? geocode.value : null,
            earthquakes: earthquakes.status === 'fulfilled' ? earthquakes.value : null,
            soil: soil.status === 'fulfilled' ? soil.value : null,
            fetchTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            apiStatus: { ...apiStatus }
        };

        // Count successes
        result.successCount = [
            result.weather, result.historical, result.elevation,
            result.geocode, result.earthquakes, result.soil
        ].filter(v => v !== null).length;

        result.totalApis = 6;

        return result;
    }

    // ========================================================================
    // HELPER UTILITIES
    // ========================================================================

    function weatherCodeToText(code) {
        const codes = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            66: 'Light freezing rain', 67: 'Heavy freezing rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
        };
        return codes[code] || 'Unknown';
    }

    function degreeToDirection(deg) {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(deg / 45) % 8];
    }

    function buildShortName(addr) {
        if (!addr) return 'Unknown';
        const parts = [
            addr.village || addr.town || addr.city || '',
            addr.county || addr.state_district || '',
            addr.state || ''
        ].filter(Boolean);
        return parts.join(', ') || 'Unknown Location';
    }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Classify soil using USDA texture triangle (simplified)
     */
    function classifySoil(clay, sand, silt) {
        if (clay >= 40) return { usda: 'Clay', is1498: 'CH/CI', recommended: 'silty_clay' };
        if (sand >= 85) return { usda: 'Sand', is1498: 'SP/SW', recommended: 'sandy_gravel' };
        if (silt >= 80) return { usda: 'Silt', is1498: 'ML', recommended: 'silty_clay' };
        if (clay >= 27 && sand <= 52 && sand >= 20)
            return { usda: 'Clay Loam', is1498: 'CL', recommended: 'silty_clay' };
        if (sand >= 52 && clay >= 20)
            return { usda: 'Sandy Clay', is1498: 'SC', recommended: 'clayey_sand' };
        if (clay < 27 && silt >= 28 && sand <= 52)
            return { usda: 'Silt Loam', is1498: 'ML', recommended: 'residual_soil' };
        if (sand >= 52 && clay < 20)
            return { usda: 'Sandy Loam', is1498: 'SM/SC', recommended: 'clayey_sand' };
        return { usda: 'Loam', is1498: 'ML/CL', recommended: 'residual_soil' };
    }

    /**
     * Estimate engineering properties from soil composition
     * Using empirical correlations from geotechnical literature
     */
    function estimateEngineeringProps(clay, sand, silt, bulkDensity) {
        // Cohesion estimation (kPa) — empirical from clay content
        let cohesion = 2 + clay * 0.6;
        if (clay > 40) cohesion = 20 + (clay - 40) * 0.5;

        // Friction angle estimation (degrees) — from sand/gravel content
        let frictionAngle = 20 + sand * 0.2;
        if (clay > 30) frictionAngle = Math.max(12, frictionAngle - (clay - 30) * 0.3);

        // Unit weight from bulk density (kN/m³)
        let unitWeight = bulkDensity > 0 ? bulkDensity * 9.81 : 18.0;
        unitWeight = Math.max(14, Math.min(24, unitWeight));

        // Permeability estimation (m/s)
        let permeability;
        if (sand > 60) permeability = 1e-4;
        else if (clay > 40) permeability = 1e-8;
        else if (silt > 50) permeability = 1e-6;
        else permeability = 1e-5;

        // Porosity estimation
        const porosity = bulkDensity > 0 ? 1 - bulkDensity / 2.65 : 0.40;

        return {
            estimatedCohesion: parseFloat(cohesion.toFixed(1)),
            estimatedFriction: parseFloat(frictionAngle.toFixed(1)),
            estimatedUnitWeight: parseFloat(unitWeight.toFixed(1)),
            estimatedPermeability: permeability,
            estimatedPorosity: parseFloat(Math.max(0.2, Math.min(0.6, porosity)).toFixed(2)),
            confidence: bulkDensity > 0 ? 'moderate' : 'low',
            note: 'Estimated from SoilGrids composition data. Site-specific testing recommended.'
        };
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        fetchWeather,
        fetchHistoricalRainfall,
        fetchElevation,
        fetchGeocode,
        fetchEarthquakes,
        fetchSoilData,
        fetchAllLiveData,
        getApiStatus: () => ({ ...apiStatus }),
        clearCache: () => Object.keys(cache).forEach(k => delete cache[k])
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
