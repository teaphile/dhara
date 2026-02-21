/**
 * ============================================================================
 * DHARARAKSHAK — Geotechnical Analytical Engine
 * ============================================================================
 * Physics-based slope stability analysis module implementing:
 *   - Infinite Slope Method (IS 14496, Part 2)
 *   - Simplified Bishop Method
 *   - Janbu Simplified Method
 *   - Monte Carlo Stochastic Simulation
 *   - Kalman Filter for sensor fusion
 *   - Hydrological models (infiltration, saturation, pore pressure)
 *   - Environmental indices (NDVI proxy, vegetation factor)
 *
 * References:
 *   - IS 14496 (Part 2): 1998 — Guidelines for Classification of Landslides
 *   - IS 14458 (Part 1-3): Retaining wall design for hill areas
 *   - IRC:SP:48-1998 — Hill Road Manual
 *   - Caine (1980) — Rainfall Intensity-Duration Thresholds
 *   - Guzzetti et al. (2008) — Himalayan thresholds
 *
 * DISCLAIMER: Decision support tool only.
 * Final engineering approval required from certified geotechnical engineer.
 * ============================================================================
 */

const GeotechnicalEngine = (function () {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================
    const GRAVITY = 9.81;            // m/s²
    const WATER_DENSITY = 9.81;      // kN/m³ (γw)
    const DEFAULT_DEPTH = 5.0;       // m — assumed failure depth
    const MC_ITERATIONS = 2000;      // Monte Carlo default

    // Soil property database (IS 1498:1970 & IS 2720 series)
    const SOIL_DATABASE = {
        'clayey_sand': {
            name: 'Clayey Sand (SC)',
            cohesion: { mean: 8, stddev: 2.5, unit: 'kPa' },
            friction: { mean: 28, stddev: 3, unit: '°' },
            unitWeight: { mean: 18.5, stddev: 1.0, unit: 'kN/m³' },
            permeability: { mean: 1e-5, unit: 'm/s' },
            porosity: 0.38,
            classification: 'SC (IS 1498)'
        },
        'silty_clay': {
            name: 'Silty Clay (CL)',
            cohesion: { mean: 20, stddev: 5, unit: 'kPa' },
            friction: { mean: 18, stddev: 2, unit: '°' },
            unitWeight: { mean: 17.5, stddev: 0.8, unit: 'kN/m³' },
            permeability: { mean: 1e-7, unit: 'm/s' },
            porosity: 0.45,
            classification: 'CL (IS 1498)'
        },
        'sandy_gravel': {
            name: 'Sandy Gravel (GW/GP)',
            cohesion: { mean: 0, stddev: 0, unit: 'kPa' },
            friction: { mean: 36, stddev: 3, unit: '°' },
            unitWeight: { mean: 20.0, stddev: 1.2, unit: 'kN/m³' },
            permeability: { mean: 1e-3, unit: 'm/s' },
            porosity: 0.32,
            classification: 'GW/GP (IS 1498)'
        },
        'residual_soil': {
            name: 'Residual Soil (Himalayan)',
            cohesion: { mean: 12, stddev: 4, unit: 'kPa' },
            friction: { mean: 25, stddev: 4, unit: '°' },
            unitWeight: { mean: 17.0, stddev: 1.5, unit: 'kN/m³' },
            permeability: { mean: 1e-4, unit: 'm/s' },
            porosity: 0.42,
            classification: 'Residual (Site-specific)'
        },
        'weathered_rock': {
            name: 'Weathered Rock',
            cohesion: { mean: 25, stddev: 8, unit: 'kPa' },
            friction: { mean: 32, stddev: 4, unit: '°' },
            unitWeight: { mean: 22.0, stddev: 1.5, unit: 'kN/m³' },
            permeability: { mean: 1e-6, unit: 'm/s' },
            porosity: 0.25,
            classification: 'Weathered Rock'
        },
        'colluvial_deposit': {
            name: 'Colluvial Deposit',
            cohesion: { mean: 5, stddev: 2, unit: 'kPa' },
            friction: { mean: 30, stddev: 5, unit: '°' },
            unitWeight: { mean: 18.0, stddev: 1.8, unit: 'kN/m³' },
            permeability: { mean: 1e-4, unit: 'm/s' },
            porosity: 0.40,
            classification: 'Colluvial'
        },
        'black_cotton': {
            name: 'Black Cotton Soil (CH)',
            cohesion: { mean: 30, stddev: 8, unit: 'kPa' },
            friction: { mean: 12, stddev: 2, unit: '°' },
            unitWeight: { mean: 16.5, stddev: 0.8, unit: 'kN/m³' },
            permeability: { mean: 1e-8, unit: 'm/s' },
            porosity: 0.50,
            classification: 'CH (IS 1498)'
        },
        'laterite': {
            name: 'Laterite Soil',
            cohesion: { mean: 15, stddev: 5, unit: 'kPa' },
            friction: { mean: 22, stddev: 3, unit: '°' },
            unitWeight: { mean: 19.0, stddev: 1.0, unit: 'kN/m³' },
            permeability: { mean: 1e-5, unit: 'm/s' },
            porosity: 0.38,
            classification: 'Laterite'
        }
    };

    // ========================================================================
    // A. INFINITE SLOPE METHOD
    // ========================================================================
    /**
     * Calculate Factor of Safety using Infinite Slope Method
     * 
     * FoS = [c' + (γz·cos²β − u)·tan φ'] / [γz·sin β·cos β]
     * 
     * Where:
     *   c'    = effective cohesion (kPa)
     *   φ'    = effective friction angle (degrees)
     *   β     = slope angle (degrees)
     *   γ     = unit weight of soil (kN/m³)
     *   z     = depth of failure surface (m)
     *   u     = pore water pressure (kPa)
     * 
     * Ref: IS 14496 Part 2, Sec 5.2 — Infinite slope analysis
     * 
     * @param {Object} params
     * @returns {Object} { fos, resisting, driving, sigma_n, pore_pressure, details }
     */
    function infiniteSlope(params) {
        const {
            cohesion = 5,          // kPa
            frictionAngle = 30,    // degrees
            slopeAngle = 35,       // degrees
            unitWeight = 19,       // kN/m³
            depth = DEFAULT_DEPTH, // m
            saturation = 50,       // percentage (0-100)
            crackReduction = 0,    // 0-1 fractional reduction in cohesion
            rootCohesion = 0,      // kPa — additional cohesion from vegetation
            structuralAdd = 0      // kPa — additional resistance from structures
        } = params;

        const beta = slopeAngle * Math.PI / 180;
        const phi = frictionAngle * Math.PI / 180;

        // Effective cohesion with crack reduction & vegetation/structural add
        const c_eff = (cohesion * (1.0 - crackReduction)) + rootCohesion + structuralAdd;

        // Pore water pressure: u = γw × hw × cos²β
        // hw = saturation fraction × depth
        const hw = (saturation / 100) * depth;
        const u = WATER_DENSITY * hw * Math.pow(Math.cos(beta), 2);

        // Normal stress on failure plane
        const sigma_n = unitWeight * depth * Math.pow(Math.cos(beta), 2);

        // Effective normal stress
        const sigma_prime = Math.max(0, sigma_n - u);

        // Resisting force (per unit area)
        const resisting = c_eff + (sigma_prime * Math.tan(phi));

        // Driving force (per unit area)
        const driving = unitWeight * depth * Math.sin(beta) * Math.cos(beta);

        // Factor of Safety
        let fos = driving <= 0 ? 10.0 : resisting / driving;
        fos = Math.min(fos, 10.0); // Cap at 10 for display

        return {
            fos: parseFloat(fos.toFixed(4)),
            resisting: parseFloat(resisting.toFixed(2)),
            driving: parseFloat(driving.toFixed(2)),
            sigma_n: parseFloat(sigma_n.toFixed(2)),
            sigma_prime: parseFloat(sigma_prime.toFixed(2)),
            pore_pressure: parseFloat(u.toFixed(2)),
            c_eff: parseFloat(c_eff.toFixed(2)),
            method: 'Infinite Slope (IS 14496)',
            details: {
                beta_rad: beta,
                phi_rad: phi,
                hw: hw,
                saturation: saturation,
                depth: depth
            }
        };
    }

    // ========================================================================
    // B. SIMPLIFIED BISHOP METHOD
    // ========================================================================
    /**
     * Simplified Bishop's Method for circular failure surfaces
     * 
     * FoS = Σ [c'·b + (W - u·b)·tan φ'] / m_α
     *        ÷ Σ W·sin α
     * 
     * Where m_α = cos α + (sin α · tan φ') / FoS
     * 
     * Iterative solution - converges to stable FoS
     * Ref: Bishop (1955), applicable per IS 14496 Part 2
     * 
     * @param {Array} slices - Array of slice objects
     * @param {number} maxIter - Maximum iterations for convergence
     * @returns {Object} { fos, iterations, converged }
     */
    function bishopSimplified(slices, maxIter = 50) {
        let fos_prev = 1.5; // Initial guess
        let converged = false;
        let iterations = 0;

        for (let iter = 0; iter < maxIter; iter++) {
            let numerator = 0;
            let denominator = 0;

            for (const slice of slices) {
                const alpha_rad = slice.alpha * Math.PI / 180;
                const phi_rad = slice.phi * Math.PI / 180;

                const m_alpha = Math.cos(alpha_rad) +
                    (Math.sin(alpha_rad) * Math.tan(phi_rad)) / fos_prev;

                if (Math.abs(m_alpha) < 0.001) continue;

                const num_slice = (slice.cohesion * slice.width +
                    (slice.weight - slice.pore_pressure * slice.width) * Math.tan(phi_rad)) / m_alpha;

                numerator += num_slice;
                denominator += slice.weight * Math.sin(alpha_rad);
            }

            const fos_new = denominator === 0 ? 10.0 : numerator / denominator;
            iterations = iter + 1;

            if (Math.abs(fos_new - fos_prev) < 0.001) {
                converged = true;
                fos_prev = fos_new;
                break;
            }

            fos_prev = fos_new;
        }

        return {
            fos: parseFloat(fos_prev.toFixed(4)),
            iterations: iterations,
            converged: converged,
            method: 'Bishop Simplified'
        };
    }

    /**
     * Generate synthetic slices for Bishop analysis based on slope geometry
     * Used when detailed slice data is not available from field survey
     * 
     * @param {Object} params - Slope parameters (same as infiniteSlope)
     * @param {number} nSlices - Number of slices
     * @returns {Array} Array of slice objects
     */
    function generateSlices(params, nSlices = 10) {
        const {
            cohesion = 5,
            frictionAngle = 30,
            slopeAngle = 35,
            unitWeight = 19,
            depth = DEFAULT_DEPTH,
            saturation = 50
        } = params;

        const slices = [];
        const slopeLength = depth / Math.sin(slopeAngle * Math.PI / 180);
        const sliceWidth = slopeLength / nSlices;

        for (let i = 0; i < nSlices; i++) {
            const position = (i + 0.5) / nSlices; // Normalized position
            // Alpha varies from slopeAngle at top to 0 at toe (simplified circular arc)
            const alpha = slopeAngle * (1 - position * 0.7);
            const sliceDepth = depth * (0.5 + 0.5 * Math.sin(Math.PI * position));
            const weight = unitWeight * sliceDepth * sliceWidth;
            const u = WATER_DENSITY * sliceDepth * (saturation / 100);

            slices.push({
                id: i + 1,
                width: sliceWidth,
                alpha: alpha,
                weight: weight,
                cohesion: cohesion,
                phi: frictionAngle,
                pore_pressure: u
            });
        }

        return slices;
    }

    // ========================================================================
    // C. JANBU SIMPLIFIED METHOD
    // ========================================================================
    /**
     * Janbu Simplified Method (for non-circular failure surfaces)
     * 
     * FoS = f₀ × Σ[c'b + (W - ub)tanφ'] × (1/cosα)
     *        ÷ Σ W·tan α
     * 
     * Where f₀ is a correction factor (typically 1.0–1.1)
     * Ref: Janbu (1973)
     * 
     * @param {Array} slices
     * @param {number} f0 - Janbu correction factor
     * @returns {Object}
     */
    function janbuSimplified(slices, f0 = 1.05) {
        let numerator = 0;
        let denominator = 0;

        for (const slice of slices) {
            const alpha_rad = slice.alpha * Math.PI / 180;
            const phi_rad = slice.phi * Math.PI / 180;
            const cos_alpha = Math.cos(alpha_rad);

            if (cos_alpha === 0) continue;

            numerator += (slice.cohesion * slice.width +
                (slice.weight - slice.pore_pressure * slice.width) * Math.tan(phi_rad)) / cos_alpha;

            denominator += slice.weight * Math.tan(alpha_rad);
        }

        const fos = denominator === 0 ? 10.0 : (f0 * numerator) / denominator;

        return {
            fos: parseFloat(fos.toFixed(4)),
            f0: f0,
            method: 'Janbu Simplified'
        };
    }

    // ========================================================================
    // D. HYDROLOGICAL MODELS
    // ========================================================================

    /**
     * Green-Ampt Infiltration Model
     * Estimates wetting front depth and infiltration rate
     * 
     * F(t) = K·t + ψ·Δθ·ln(1 + F(t)/(ψ·Δθ))
     * f(t) = K·(1 + ψ·Δθ/F(t))
     * 
     * @param {Object} params
     * @returns {Object}
     */
    function greenAmptInfiltration(params) {
        const {
            K = 1e-5,           // Hydraulic conductivity (m/s)
            psi = 0.2,          // Suction head at wetting front (m)
            theta_i = 0.2,      // Initial moisture content
            theta_s = 0.45,     // Saturated moisture content
            rainfall_rate = 10, // mm/hr
            duration = 24       // hours
        } = params;

        const delta_theta = theta_s - theta_i;
        const rainfall_ms = rainfall_rate / (1000 * 3600); // Convert mm/hr to m/s
        const dt = 60; // Time step: 60 seconds
        const totalSteps = Math.floor(duration * 3600 / dt);

        let F = 0.001; // Cumulative infiltration (m)
        let infiltrationHistory = [];
        let saturationTime = null;

        for (let step = 0; step < totalSteps; step++) {
            const t = step * dt;
            // Infiltration capacity
            const f_capacity = K * (1 + (psi * delta_theta) / F);

            // Actual infiltration
            const f_actual = Math.min(f_capacity, rainfall_ms);
            F += f_actual * dt;

            if (step % 60 === 0) { // Record hourly
                infiltrationHistory.push({
                    time_hr: t / 3600,
                    infiltration_rate_mmhr: f_actual * 1000 * 3600,
                    cumulative_mm: F * 1000,
                    capacity_mmhr: f_capacity * 1000 * 3600
                });
            }

            // Check if surface saturates
            if (f_capacity <= rainfall_ms && saturationTime === null) {
                saturationTime = t / 3600; // hours
            }
        }

        return {
            cumulative_infiltration_mm: parseFloat((F * 1000).toFixed(2)),
            final_rate_mmhr: parseFloat((infiltrationHistory[infiltrationHistory.length - 1]?.infiltration_rate_mmhr || 0).toFixed(3)),
            saturation_time_hr: saturationTime ? parseFloat(saturationTime.toFixed(1)) : null,
            runoff_onset: saturationTime !== null,
            history: infiltrationHistory,
            method: 'Green-Ampt Infiltration Model'
        };
    }

    /**
     * Pore Pressure Ratio (ru) Calculator
     * ru = u / (γ × z)
     * 
     * @param {number} porePressure - kPa
     * @param {number} unitWeight - kN/m³
     * @param {number} depth - m
     * @returns {number} ru (0 to 1)
     */
    function porePressureRatio(porePressure, unitWeight, depth) {
        const totalStress = unitWeight * depth;
        if (totalStress <= 0) return 0;
        return Math.min(1.0, porePressure / totalStress);
    }

    /**
     * Saturation Index Calculator
     * Based on topographic wetness index concept
     * 
     * SI = ln(a / (tan β))
     * Where a = upslope contributing area per unit contour, β = slope
     * 
     * @param {number} upslopeArea - Contributing area (m²/m)
     * @param {number} slopeAngle - degrees
     * @returns {number}
     */
    function saturationIndex(upslopeArea, slopeAngle) {
        const tanBeta = Math.tan(slopeAngle * Math.PI / 180);
        if (tanBeta <= 0) return 0;
        return Math.log(upslopeArea / tanBeta);
    }

    /**
     * Rainfall Intensity-Duration Threshold Check
     * 
     * Caine (1980) Global: I = 14.82 × D^(-0.39)
     * Himalayan Regional: I = 9.0 × D^(-0.25) [Guzzetti et al., 2008]
     * 
     * @param {number} intensity_mmhr
     * @param {number} duration_hr
     * @returns {Object}
     */
    function checkIDThreshold(intensity_mmhr, duration_hr) {
        const threshold_caine = 14.82 * Math.pow(duration_hr, -0.39);
        const threshold_himalaya = 9.0 * Math.pow(duration_hr, -0.25);

        let status = 'SAFE';
        let level = 0;
        if (intensity_mmhr > threshold_caine) {
            status = 'CRITICAL — Exceeds Global Threshold';
            level = 3;
        } else if (intensity_mmhr > threshold_himalaya) {
            status = 'WARNING — Exceeds Himalayan Regional Threshold';
            level = 2;
        } else if (intensity_mmhr > threshold_himalaya * 0.7) {
            status = 'CAUTION — Approaching Regional Threshold';
            level = 1;
        }

        return {
            threshold_caine: parseFloat(threshold_caine.toFixed(3)),
            threshold_himalaya: parseFloat(threshold_himalaya.toFixed(3)),
            current_intensity: intensity_mmhr,
            current_duration: duration_hr,
            status: status,
            level: level,
            exceedance_pct_global: parseFloat(((intensity_mmhr / threshold_caine) * 100).toFixed(1)),
            exceedance_pct_regional: parseFloat(((intensity_mmhr / threshold_himalaya) * 100).toFixed(1))
        };
    }

    /**
     * Generate I-D threshold curve data for visualization
     * @returns {Object} { durations, caine, himalaya }
     */
    function generateIDCurveData() {
        const durations = [];
        const caine = [];
        const himalaya = [];

        for (let d = 1; d <= 72; d += 0.5) {
            durations.push(d);
            caine.push(14.82 * Math.pow(d, -0.39));
            himalaya.push(9.0 * Math.pow(d, -0.25));
        }

        return { durations, caine, himalaya };
    }

    // ========================================================================
    // E. ENVIRONMENTAL MODELS
    // ========================================================================

    /**
     * NDVI-based vegetation factor estimation
     * NDVI = (NIR - RED) / (NIR + RED)
     * 
     * Maps vegetation cover to root cohesion addition
     * 
     * @param {number} vegetationPct - Vegetation cover % (0-100)
     * @returns {Object}
     */
    function vegetationFactor(vegetationPct) {
        // Root cohesion based on vegetation density
        // Ref: Wu et al. (1979) root reinforcement model
        // cr = tR × (AR/A) × (cos θ × tan φ + sin θ)
        // Simplified: cr ≈ f(vegetation cover)
        let rootCohesion = 0;
        let category = '';
        let deforestationRisk = '';

        if (vegetationPct >= 80) {
            rootCohesion = 12;  // kPa
            category = 'Dense Forest';
            deforestationRisk = 'Low';
        } else if (vegetationPct >= 60) {
            rootCohesion = 8;
            category = 'Moderate Forest';
            deforestationRisk = 'Low-Medium';
        } else if (vegetationPct >= 40) {
            rootCohesion = 5;
            category = 'Sparse Vegetation';
            deforestationRisk = 'Medium';
        } else if (vegetationPct >= 20) {
            rootCohesion = 2;
            category = 'Degraded/Grassland';
            deforestationRisk = 'High';
        } else {
            rootCohesion = 0;
            category = 'Barren/Exposed';
            deforestationRisk = 'Critical';
        }

        // NDVI estimate (approximate from cover %)
        const ndvi_estimate = vegetationPct / 100 * 0.7 + 0.1;

        return {
            rootCohesion: rootCohesion,
            category: category,
            deforestationRisk: deforestationRisk,
            ndvi_estimate: parseFloat(ndvi_estimate.toFixed(2)),
            vegetationPct: vegetationPct,
            treeDensity_est: Math.round(vegetationPct * 8) // trees per hectare estimate
        };
    }

    // ========================================================================
    // F. MONTE CARLO STOCHASTIC SIMULATION
    // ========================================================================

    /**
     * Monte Carlo Simulation for reliability analysis
     * Generates random parameter sets from distributions,
     * computes FoS for each, estimates probability of failure
     * 
     * @param {Object} params - Mean values
     * @param {number} iterations
     * @returns {Object}
     */
    function monteCarloSimulation(params, iterations = MC_ITERATIONS) {
        const {
            cohesion = 5,
            frictionAngle = 30,
            slopeAngle = 35,
            unitWeight = 19,
            saturation = 50,
            depth = DEFAULT_DEPTH
        } = params;

        // Standard deviations (coefficient of variation-based)
        const cv_c = 0.3;      // Cohesion: 30% CoV
        const cv_phi = 0.1;    // Friction: 10% CoV
        const cv_gamma = 0.05; // Unit weight: 5% CoV
        const sd_slope = 2.0;  // degrees

        const fosResults = [];
        let failureCount = 0;

        for (let i = 0; i < iterations; i++) {
            const c_i = Math.max(0.1, normalRandom(cohesion, cohesion * cv_c));
            const phi_i = Math.max(5, normalRandom(frictionAngle, frictionAngle * cv_phi));
            const gamma_i = normalRandom(unitWeight, unitWeight * cv_gamma);
            const slope_i = Math.max(5, normalRandom(slopeAngle, sd_slope));

            const result = infiniteSlope({
                cohesion: c_i,
                frictionAngle: phi_i,
                slopeAngle: slope_i,
                unitWeight: gamma_i,
                depth: depth,
                saturation: saturation
            });

            fosResults.push(result.fos);
            if (result.fos < 1.0) failureCount++;
        }

        const mean_fos = fosResults.reduce((a, b) => a + b, 0) / iterations;
        const std_fos = Math.sqrt(
            fosResults.reduce((sum, f) => sum + Math.pow(f - mean_fos, 2), 0) / (iterations - 1)
        );
        const pf = (failureCount / iterations) * 100;
        const beta_index = std_fos > 0 ? (mean_fos - 1) / std_fos : 99;

        // Histogram data
        const bins = 40;
        const min_fos = Math.min(...fosResults);
        const max_fos = Math.max(...fosResults);
        const binWidth = (max_fos - min_fos) / bins;
        const histogram = Array(bins).fill(0);
        const binEdges = [];

        for (let b = 0; b <= bins; b++) {
            binEdges.push(parseFloat((min_fos + b * binWidth).toFixed(3)));
        }

        for (const f of fosResults) {
            const idx = Math.min(Math.floor((f - min_fos) / binWidth), bins - 1);
            histogram[idx]++;
        }

        return {
            mean_fos: parseFloat(mean_fos.toFixed(4)),
            std_fos: parseFloat(std_fos.toFixed(4)),
            min_fos: parseFloat(min_fos.toFixed(4)),
            max_fos: parseFloat(max_fos.toFixed(4)),
            probability_of_failure: parseFloat(pf.toFixed(2)),
            reliability_index: parseFloat(beta_index.toFixed(3)),
            iterations: iterations,
            histogram: histogram,
            binEdges: binEdges,
            rawResults: fosResults,
            method: `Monte Carlo (${iterations} iterations)`
        };
    }

    // ========================================================================
    // G. SENSITIVITY ANALYSIS
    // ========================================================================

    /**
     * Tornado Sensitivity Analysis
     * Varies each parameter ±10% and measures FoS change
     * 
     * @param {Object} baseParams
     * @returns {Object}
     */
    function sensitivityAnalysis(baseParams) {
        const {
            cohesion = 5,
            frictionAngle = 30,
            slopeAngle = 35,
            unitWeight = 19,
            saturation = 50,
            depth = DEFAULT_DEPTH
        } = baseParams;

        const base_fos = infiniteSlope(baseParams).fos;
        const results = {};
        const paramMap = {
            cohesion: { label: 'Cohesion (c\')', value: cohesion },
            frictionAngle: { label: 'Friction Angle (φ\')', value: frictionAngle },
            slopeAngle: { label: 'Slope Angle (β)', value: slopeAngle },
            unitWeight: { label: 'Unit Weight (γ)', value: unitWeight },
            saturation: { label: 'Saturation (%)', value: saturation }
        };

        for (const [key, info] of Object.entries(paramMap)) {
            // +10% case
            const highParams = { ...baseParams };
            highParams[key] = info.value * 1.1;
            if (key === 'saturation') highParams[key] = Math.min(100, highParams[key]);
            const fos_high = infiniteSlope(highParams).fos;

            // -10% case
            const lowParams = { ...baseParams };
            lowParams[key] = info.value * 0.9;
            const fos_low = infiniteSlope(lowParams).fos;

            results[key] = {
                label: info.label,
                baseValue: info.value,
                fos_high: parseFloat(fos_high.toFixed(4)),
                fos_low: parseFloat(fos_low.toFixed(4)),
                swing: parseFloat(Math.abs(fos_high - fos_low).toFixed(4)),
                sensitivity_pct: parseFloat((Math.abs(fos_high - fos_low) / base_fos * 100).toFixed(1))
            };
        }

        // Sort by sensitivity
        const sortedKeys = Object.keys(results).sort((a, b) => results[b].swing - results[a].swing);
        const mostSensitive = sortedKeys[0];

        return {
            base_fos: parseFloat(base_fos.toFixed(4)),
            results: results,
            sortedKeys: sortedKeys,
            mostSensitive: mostSensitive,
            mostSensitiveLabel: results[mostSensitive].label,
            method: 'Tornado Sensitivity (±10%)'
        };
    }

    // ========================================================================
    // H. KALMAN FILTER
    // ========================================================================

    /**
     * Simple 1D Kalman Filter for sensor data fusion
     * Useful for filtering noisy field sensor readings
     */
    class KalmanFilter {
        constructor(Q = 0.1, R = 1.0, P = 1.0) {
            this.Q = Q; // Process noise
            this.R = R; // Measurement noise
            this.P = P; // Estimate error
            this.K = 0; // Kalman gain
            this.X = 0; // State estimate
            this.initialized = false;
        }

        update(measurement) {
            if (!this.initialized) {
                this.X = measurement;
                this.initialized = true;
                return this.X;
            }
            // Predict
            this.P = this.P + this.Q;
            // Update
            this.K = this.P / (this.P + this.R);
            this.X = this.X + this.K * (measurement - this.X);
            this.P = (1 - this.K) * this.P;
            return this.X;
        }

        reset() {
            this.K = 0;
            this.X = 0;
            this.P = 1.0;
            this.initialized = false;
        }
    }

    // ========================================================================
    // I. STRUCTURAL ASSESSMENT
    // ========================================================================

    /**
     * Foundation safety check for structures near slopes
     * Based on IS 1904:1986 / IS 14458 guidelines
     * 
     * @param {Object} params
     * @returns {Object}
     */
    function foundationSafetyCheck(params) {
        const {
            slopeAngle = 35,
            distanceFromCrest = 6,     // m
            foundationDepth = 1.5,     // m
            slopeHeight = 10,          // m
            buildingLoad = 150         // kN/m (typical 2-story)
        } = params;

        // IS 14458 Part 1 — Minimum setback distance
        // Setback ≥ H × tan(45° - φ/2) but not less than 3m
        const minSetback_IS = Math.max(3, slopeHeight * Math.tan((45 - 15) * Math.PI / 180));

        // IRC:SP:48 — Setback from slope crest
        const minSetback_IRC = slopeHeight / 3;

        const effectiveSetback = Math.max(minSetback_IS, minSetback_IRC);
        const isSetbackSafe = distanceFromCrest >= effectiveSetback;

        // Bearing capacity reduction near slope (Meyerhof method simplified)
        const reductionFactor = Math.min(1.0,
            distanceFromCrest / (effectiveSetback * 1.5));

        return {
            minSetback_IS: parseFloat(minSetback_IS.toFixed(1)),
            minSetback_IRC: parseFloat(minSetback_IRC.toFixed(1)),
            effectiveSetback: parseFloat(effectiveSetback.toFixed(1)),
            actualSetback: distanceFromCrest,
            isSetbackSafe: isSetbackSafe,
            bearingCapacityReduction: parseFloat(((1 - reductionFactor) * 100).toFixed(1)),
            recommendation: isSetbackSafe
                ? 'Foundation within safe setback distance as per IS 14458 / IRC:SP:48.'
                : `UNSAFE: Foundation is ${(effectiveSetback - distanceFromCrest).toFixed(1)}m closer than minimum setback. Relocation or retaining structure required.`,
            method: 'IS 14458 / IRC:SP:48 Setback Analysis'
        };
    }

    /**
     * Retaining wall preliminary design check
     * Based on IS 14458 Part 3 — Retaining walls for hill areas
     * 
     * @param {Object} params
     * @returns {Object}
     */
    function retainingWallCheck(params) {
        const {
            wallHeight = 3,        // m
            slopeAngle = 35,       // degrees
            unitWeight = 19,       // kN/m³
            frictionAngle = 30,    // degrees
            cohesion = 5,          // kPa
            wallType = 'gabion'    // gabion, rcc, masonry
        } = params;

        const phi_rad = frictionAngle * Math.PI / 180;
        const beta_rad = slopeAngle * Math.PI / 180;

        // Rankine active earth pressure coefficient
        const Ka = Math.pow(Math.tan(Math.PI / 4 - phi_rad / 2), 2);

        // Active earth pressure
        const Pa = 0.5 * Ka * unitWeight * Math.pow(wallHeight, 2);

        // Minimum base width (IS 14458 guidelines)
        const minBaseWidth = {
            'gabion': wallHeight * 0.5,
            'rcc': wallHeight * 0.4,
            'masonry': wallHeight * 0.6
        }[wallType] || wallHeight * 0.5;

        // Overturning check
        const overturningMoment = Pa * wallHeight / 3;
        const wallWeight = minBaseWidth * wallHeight * (wallType === 'rcc' ? 24 : 18);
        const resistingMoment = wallWeight * minBaseWidth / 2;
        const fosOverturning = resistingMoment / overturningMoment;

        // Sliding check
        const friction_base = wallWeight * Math.tan(phi_rad * 0.67); // 2/3 of soil friction
        const fosSliding = friction_base / Pa;

        return {
            Ka: parseFloat(Ka.toFixed(4)),
            activePressure_kN: parseFloat(Pa.toFixed(2)),
            minBaseWidth: parseFloat(minBaseWidth.toFixed(2)),
            wallWeight_kN: parseFloat(wallWeight.toFixed(1)),
            fosOverturning: parseFloat(fosOverturning.toFixed(3)),
            fosSliding: parseFloat(fosSliding.toFixed(3)),
            isStable: fosOverturning >= 2.0 && fosSliding >= 1.5,
            overturningStatus: fosOverturning >= 2.0 ? 'SAFE (≥2.0)' : 'INADEQUATE (<2.0)',
            slidingStatus: fosSliding >= 1.5 ? 'SAFE (≥1.5)' : 'INADEQUATE (<1.5)',
            wallType: wallType,
            method: 'IS 14458 Part 3 — Retaining Wall Check'
        };
    }

    // ========================================================================
    // J. COMPREHENSIVE ANALYSIS (MULTI-DISCIPLINARY)
    // ========================================================================

    /**
     * Run complete site analysis combining all modules
     * This is the main entry point for the risk assessment
     * 
     * @param {Object} siteData - All field inputs
     * @returns {Object} Comprehensive analysis results
     */
    function runComprehensiveAnalysis(siteData) {
        const {
            location = {},
            slopeAngle = 35,
            soilType = 'clayey_sand',
            vegetationPct = 40,
            rainfallIntensity = 5,
            rainfallDuration = 24,
            houseDistance = 6,
            drainageCondition = 'poor',
            saturation = 50,
            cracks = false,
            seepage = false,
            pastLandslides = false,
            construction = false
        } = siteData;

        // Get soil properties
        const soil = SOIL_DATABASE[soilType] || SOIL_DATABASE['clayey_sand'];

        // Crack reduction factor
        const crackReduction = cracks ? 0.25 : 0;

        // Vegetation analysis
        const vegAnalysis = vegetationFactor(vegetationPct);

        // Drainage condition modifier
        const drainageSatModifier = {
            'good': 0.7,
            'moderate': 0.85,
            'poor': 1.0,
            'blocked': 1.15
        }[drainageCondition] || 1.0;

        const effectiveSaturation = Math.min(100, saturation * drainageSatModifier);

        // 1. Infinite Slope Analysis
        const infiniteSlopeResult = infiniteSlope({
            cohesion: soil.cohesion.mean,
            frictionAngle: soil.friction.mean,
            slopeAngle: slopeAngle,
            unitWeight: soil.unitWeight.mean,
            depth: DEFAULT_DEPTH,
            saturation: effectiveSaturation,
            crackReduction: crackReduction,
            rootCohesion: vegAnalysis.rootCohesion
        });

        // 2. Bishop Analysis
        const slices = generateSlices({
            cohesion: soil.cohesion.mean,
            frictionAngle: soil.friction.mean,
            slopeAngle: slopeAngle,
            unitWeight: soil.unitWeight.mean,
            depth: DEFAULT_DEPTH,
            saturation: effectiveSaturation
        });
        const bishopResult = bishopSimplified(slices);

        // 3. Janbu Analysis
        const janbuResult = janbuSimplified(slices);

        // 4. Rainfall Threshold
        const idResult = checkIDThreshold(rainfallIntensity, rainfallDuration);

        // 5. Infiltration Analysis
        const infiltrationResult = greenAmptInfiltration({
            K: soil.permeability.mean,
            theta_i: soil.porosity * (1 - saturation / 100),
            theta_s: soil.porosity,
            rainfall_rate: rainfallIntensity,
            duration: rainfallDuration
        });

        // 6. Foundation Safety
        const foundationResult = foundationSafetyCheck({
            slopeAngle: slopeAngle,
            distanceFromCrest: houseDistance,
            slopeHeight: DEFAULT_DEPTH / Math.sin(slopeAngle * Math.PI / 180) * Math.cos(slopeAngle * Math.PI / 180)
        });

        // 7. Monte Carlo
        const mcResult = monteCarloSimulation({
            cohesion: soil.cohesion.mean,
            frictionAngle: soil.friction.mean,
            slopeAngle: slopeAngle,
            unitWeight: soil.unitWeight.mean,
            saturation: effectiveSaturation,
            depth: DEFAULT_DEPTH
        });

        // 8. Sensitivity
        const sensResult = sensitivityAnalysis({
            cohesion: soil.cohesion.mean,
            frictionAngle: soil.friction.mean,
            slopeAngle: slopeAngle,
            unitWeight: soil.unitWeight.mean,
            saturation: effectiveSaturation,
            depth: DEFAULT_DEPTH
        });

        // Composite FoS (weighted average of methods)
        const compositeFoS = (
            infiniteSlopeResult.fos * 0.4 +
            bishopResult.fos * 0.35 +
            janbuResult.fos * 0.25
        );

        // Additional risk modifiers
        let riskModifier = 0;
        if (seepage) riskModifier += 0.15;
        if (pastLandslides) riskModifier += 0.2;
        if (construction) riskModifier += 0.1;
        if (idResult.level >= 2) riskModifier += 0.15;

        return {
            timestamp: new Date().toISOString(),
            location: location,
            soilProperties: soil,
            slopeAngle: slopeAngle,
            effectiveSaturation: effectiveSaturation,

            // Analysis Results
            infiniteSlope: infiniteSlopeResult,
            bishop: bishopResult,
            janbu: janbuResult,
            compositeFoS: parseFloat(compositeFoS.toFixed(4)),

            // Hydrological
            rainfallThreshold: idResult,
            infiltration: infiltrationResult,

            // Environmental
            vegetation: vegAnalysis,

            // Structural
            foundation: foundationResult,

            // Stochastic
            monteCarlo: mcResult,
            sensitivity: sensResult,

            // Risk Modifiers
            riskModifier: riskModifier,
            fieldObservations: {
                cracks: cracks,
                seepage: seepage,
                pastLandslides: pastLandslides,
                construction: construction
            },

            // Engineering disclaimer
            disclaimer: 'Decision support output only. Final engineering approval required from certified geotechnical engineer per NIDM 2019 guidelines.'
        };
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function normalRandom(mean, stddev) {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * stddev;
    }

    function degreesToRadians(deg) {
        return deg * Math.PI / 180;
    }

    function radiansToDegrees(rad) {
        return rad * 180 / Math.PI;
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        // Core Analyses
        infiniteSlope,
        bishopSimplified,
        janbuSimplified,
        generateSlices,

        // Hydrology
        greenAmptInfiltration,
        porePressureRatio,
        saturationIndex,
        checkIDThreshold,
        generateIDCurveData,

        // Environment
        vegetationFactor,

        // Stochastic
        monteCarloSimulation,
        sensitivityAnalysis,
        KalmanFilter,

        // Structural
        foundationSafetyCheck,
        retainingWallCheck,

        // Comprehensive
        runComprehensiveAnalysis,

        // Data
        SOIL_DATABASE,

        // Constants
        GRAVITY,
        WATER_DENSITY,
        DEFAULT_DEPTH,

        // Utilities
        normalRandom,
        degreesToRadians,
        radiansToDegrees
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeotechnicalEngine;
}
