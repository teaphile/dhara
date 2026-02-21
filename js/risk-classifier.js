/**
 * ============================================================================
 * DHARARAKSHAK — Risk Classification Engine
 * ============================================================================
 * Transparent, auditable risk scoring system aligned with:
 *   - NIDM (2019) — National Landslide Risk Management Strategy
 *   - GSI Landslide Hazard Evaluation Factor (LHEF) methodology
 *   - BIS IS 14496 (Part 2) — Classification system
 *
 * Risk Classification Matrix:
 *   FoS > 1.5  + Low Rainfall  + High Vegetation → LOW RISK
 *   FoS 1.2–1.5 + Moderate Rain + Medium Veg     → MEDIUM RISK
 *   FoS < 1.2  + High Rainfall + Low Vegetation  → HIGH RISK
 *
 * DISCLAIMER: Decision support only.
 * Final approval by certified geotechnical engineer required.
 * ============================================================================
 */

const RiskClassifier = (function () {
    'use strict';

    // ========================================================================
    // RISK CLASSIFICATION MATRIX (TRANSPARENT)
    // ========================================================================

    /**
     * Multi-parameter risk score generator
     * 
     * Inputs are normalized to 0–100 risk scale, then weighted
     * All weights and thresholds are visible and auditable
     * 
     * @param {Object} analysisResults — Output from GeotechnicalEngine.runComprehensiveAnalysis()
     * @returns {Object} Complete risk assessment
     */
    function classifyRisk(analysisResults) {
        const {
            compositeFoS = 1.0,
            infiniteSlope = {},
            monteCarlo = {},
            rainfallThreshold = {},
            vegetation = {},
            foundation = {},
            riskModifier = 0,
            fieldObservations = {},
            slopeAngle = 35,
            effectiveSaturation = 50
        } = analysisResults;

        // ----------------------------------------------------------------
        // COMPONENT SCORING (each 0–100, higher = more risk)
        // ----------------------------------------------------------------

        // 1. GEOTECHNICAL STABILITY SCORE (Weight: 35%)
        const fosScore = fosToRiskScore(compositeFoS);

        // 2. RAINFALL / HYDROLOGICAL SCORE (Weight: 25%)
        const rainfallScore = rainfallToRiskScore(rainfallThreshold);

        // 3. VEGETATION / ENVIRONMENTAL SCORE (Weight: 15%)
        const vegScore = vegetationToRiskScore(vegetation);

        // 4. STRUCTURAL PROXIMITY SCORE (Weight: 10%)
        const structScore = structuralToRiskScore(foundation);

        // 5. TERRAIN SCORE (Weight: 10%)
        const terrainScore = terrainToRiskScore(slopeAngle, effectiveSaturation);

        // 6. FIELD OBSERVATION SCORE (Weight: 5%)
        const fieldScore = fieldObsToRiskScore(fieldObservations);

        // ----------------------------------------------------------------
        // WEIGHTED COMPOSITE
        // ----------------------------------------------------------------
        const weights = {
            geotechnical: 0.35,
            rainfall: 0.25,
            vegetation: 0.15,
            structural: 0.10,
            terrain: 0.10,
            field: 0.05
        };

        const compositeScore = (
            fosScore * weights.geotechnical +
            rainfallScore * weights.rainfall +
            vegScore * weights.vegetation +
            structScore * weights.structural +
            terrainScore * weights.terrain +
            fieldScore * weights.field
        );

        // Apply risk modifier from field observations (capped)
        const adjustedScore = Math.min(100, compositeScore + riskModifier * 100 * 0.15);

        // ----------------------------------------------------------------
        // CLASSIFICATION
        // ----------------------------------------------------------------
        const classification = scoreToClassification(adjustedScore);

        // ----------------------------------------------------------------
        // PROBABILITY INDEX
        // ----------------------------------------------------------------
        const probabilityIndex = calculateProbabilityIndex(
            compositeFoS,
            monteCarlo.probability_of_failure,
            adjustedScore
        );

        // ----------------------------------------------------------------
        // CONFIDENCE LEVEL
        // ----------------------------------------------------------------
        const confidence = calculateConfidence(analysisResults);

        return {
            // Composite
            compositeScore: parseFloat(adjustedScore.toFixed(1)),
            classification: classification,
            probabilityIndex: probabilityIndex,
            confidence: confidence,

            // Component breakdown
            components: {
                geotechnical: {
                    score: parseFloat(fosScore.toFixed(1)),
                    weight: weights.geotechnical,
                    weighted: parseFloat((fosScore * weights.geotechnical).toFixed(1)),
                    input: `FoS = ${compositeFoS.toFixed(3)}`
                },
                rainfall: {
                    score: parseFloat(rainfallScore.toFixed(1)),
                    weight: weights.rainfall,
                    weighted: parseFloat((rainfallScore * weights.rainfall).toFixed(1)),
                    input: `Threshold Level = ${rainfallThreshold.level || 0}`
                },
                vegetation: {
                    score: parseFloat(vegScore.toFixed(1)),
                    weight: weights.vegetation,
                    weighted: parseFloat((vegScore * weights.vegetation).toFixed(1)),
                    input: `Cover = ${vegetation.vegetationPct || 0}%`
                },
                structural: {
                    score: parseFloat(structScore.toFixed(1)),
                    weight: weights.structural,
                    weighted: parseFloat((structScore * weights.structural).toFixed(1)),
                    input: `Setback Safe: ${foundation.isSetbackSafe ? 'Yes' : 'No'}`
                },
                terrain: {
                    score: parseFloat(terrainScore.toFixed(1)),
                    weight: weights.terrain,
                    weighted: parseFloat((terrainScore * weights.terrain).toFixed(1)),
                    input: `Slope = ${slopeAngle}°, Sat = ${effectiveSaturation}%`
                },
                field: {
                    score: parseFloat(fieldScore.toFixed(1)),
                    weight: weights.field,
                    weighted: parseFloat((fieldScore * weights.field).toFixed(1)),
                    input: formatFieldObs(fieldObservations)
                }
            },

            // Audit trail
            weights: weights,
            riskModifier: riskModifier,
            method: 'NIDM-aligned Multi-Parameter Weighted Score',
            disclaimer: 'Risk classification is for decision support. Certified geotechnical engineer must validate before action.',
            timestamp: new Date().toISOString()
        };
    }

    // ========================================================================
    // COMPONENT SCORING FUNCTIONS
    // ========================================================================

    /**
     * Convert Factor of Safety to risk score (0-100)
     * Based on IS 14496 and NIDM guidelines:
     *   FoS ≥ 2.0 → Very Low Risk (0-10)
     *   FoS 1.5-2.0 → Low Risk (10-30)
     *   FoS 1.2-1.5 → Medium Risk (30-60)
     *   FoS 1.0-1.2 → High Risk (60-85)
     *   FoS < 1.0 → Critical Risk (85-100)
     */
    function fosToRiskScore(fos) {
        if (fos >= 2.0) return Math.max(0, 10 - (fos - 2.0) * 10);
        if (fos >= 1.5) return 10 + (2.0 - fos) * 40;       // 10–30
        if (fos >= 1.2) return 30 + (1.5 - fos) * 100;       // 30–60
        if (fos >= 1.0) return 60 + (1.2 - fos) * 125;       // 60–85
        if (fos >= 0.8) return 85 + (1.0 - fos) * 50;        // 85–95
        return Math.min(100, 95 + (0.8 - fos) * 25);         // 95-100
    }

    /**
     * Convert rainfall threshold status to risk score
     */
    function rainfallToRiskScore(threshold) {
        const level = threshold.level || 0;
        const exceedance = threshold.exceedance_pct_regional || 0;

        if (level >= 3) return 90 + Math.min(10, exceedance / 10);
        if (level >= 2) return 60 + Math.min(30, exceedance / 5);
        if (level >= 1) return 30 + Math.min(30, exceedance / 3);
        return Math.max(0, exceedance * 0.3);
    }

    /**
     * Convert vegetation cover to risk score
     */
    function vegetationToRiskScore(veg) {
        const pct = veg.vegetationPct || 0;
        // Higher vegetation → lower risk
        if (pct >= 80) return 5;
        if (pct >= 60) return 20;
        if (pct >= 40) return 40;
        if (pct >= 20) return 65;
        return 85;
    }

    /**
     * Convert structural proximity to risk score
     */
    function structuralToRiskScore(foundation) {
        if (!foundation || Object.keys(foundation).length === 0) return 50;

        if (foundation.isSetbackSafe) {
            // Degree of safety matters
            const margin = foundation.actualSetback - foundation.effectiveSetback;
            if (margin > 5) return 5;
            if (margin > 2) return 15;
            return 25;
        } else {
            const deficit = foundation.effectiveSetback - foundation.actualSetback;
            return Math.min(100, 50 + deficit * 10);
        }
    }

    /**
     * Convert terrain parameters to risk score
     */
    function terrainToRiskScore(slopeAngle, saturation) {
        let slopeScore = 0;
        if (slopeAngle >= 45) slopeScore = 80;
        else if (slopeAngle >= 35) slopeScore = 55;
        else if (slopeAngle >= 25) slopeScore = 35;
        else if (slopeAngle >= 15) slopeScore = 15;
        else slopeScore = 5;

        let satScore = saturation * 0.7;

        return (slopeScore * 0.6 + satScore * 0.4);
    }

    /**
     * Convert field observations to risk score
     */
    function fieldObsToRiskScore(obs) {
        let score = 0;
        if (obs.cracks) score += 25;
        if (obs.seepage) score += 25;
        if (obs.pastLandslides) score += 30;
        if (obs.construction) score += 20;
        return Math.min(100, score);
    }

    // ========================================================================
    // CLASSIFICATION & PROBABILITY
    // ========================================================================

    /**
     * Map composite score to classification with color and action
     */
    function scoreToClassification(score) {
        if (score >= 80) {
            return {
                level: 'CRITICAL',
                label: 'Very High Risk',
                color: '#B71C1C',
                bgColor: '#FFCDD2',
                icon: '🔴',
                action: 'IMMEDIATE ACTION REQUIRED — Evacuate if necessary. Deploy emergency measures.',
                code: 5,
                nidmCategory: 'Zone V (Very High Hazard)'
            };
        }
        if (score >= 60) {
            return {
                level: 'HIGH',
                label: 'High Risk',
                color: '#D32F2F',
                bgColor: '#FFEBEE',
                icon: '🟠',
                action: 'URGENT — Install drainage, structural support. Restrict construction.',
                code: 4,
                nidmCategory: 'Zone IV (High Hazard)'
            };
        }
        if (score >= 40) {
            return {
                level: 'MEDIUM',
                label: 'Moderate Risk',
                color: '#F57F17',
                bgColor: '#FFF3E0',
                icon: '🟡',
                action: 'MONITOR — Install sensors. Apply bioengineering. Plan drainage.',
                code: 3,
                nidmCategory: 'Zone III (Moderate Hazard)'
            };
        }
        if (score >= 20) {
            return {
                level: 'LOW',
                label: 'Low Risk',
                color: '#388E3C',
                bgColor: '#E8F5E9',
                icon: '🟢',
                action: 'MAINTAIN — Continue monitoring. Preserve vegetation cover.',
                code: 2,
                nidmCategory: 'Zone II (Low Hazard)'
            };
        }
        return {
            level: 'VERY LOW',
            label: 'Very Low Risk',
            color: '#1B5E20',
            bgColor: '#C8E6C9',
            icon: '✅',
            action: 'ROUTINE — Standard maintenance. Annual survey recommended.',
            code: 1,
            nidmCategory: 'Zone I (Very Low Hazard)'
        };
    }

    /**
     * Calculate probability index combining deterministic & stochastic
     */
    function calculateProbabilityIndex(fos, mcProbability, compositeScore) {
        // Deterministic probability (simplified from FoS)
        const detProb = fos <= 0.5 ? 0.99
            : fos <= 1.0 ? 0.5 + (1.0 - fos) * 0.98
            : fos <= 1.5 ? 0.3 - (fos - 1.0) * 0.4
            : fos <= 2.0 ? 0.1 - (fos - 1.5) * 0.1
            : 0.02;

        // Stochastic probability
        const stochProb = (mcProbability || 0) / 100;

        // Score-based probability
        const scoreProb = compositeScore / 100;

        // Weighted combination
        const combinedProb = (
            detProb * 0.35 +
            stochProb * 0.40 +
            scoreProb * 0.25
        );

        return {
            deterministic: parseFloat(Math.max(0, Math.min(1, detProb)).toFixed(3)),
            stochastic: parseFloat(Math.max(0, Math.min(1, stochProb)).toFixed(3)),
            scoreBased: parseFloat(Math.max(0, Math.min(1, scoreProb)).toFixed(3)),
            combined: parseFloat(Math.max(0, Math.min(1, combinedProb)).toFixed(3)),
            annualProbability: parseFloat(Math.max(0, Math.min(1, combinedProb * 0.3)).toFixed(4)),
            returnPeriod_years: combinedProb > 0 ? Math.round(1 / (combinedProb * 0.3)) : '> 100'
        };
    }

    /**
     * Calculate confidence level based on data availability
     */
    function calculateConfidence(analysisResults) {
        let dataPoints = 0;
        let maxPoints = 10;

        // Check what data is available
        if (analysisResults.infiniteSlope && analysisResults.infiniteSlope.fos) dataPoints += 2;
        if (analysisResults.bishop && analysisResults.bishop.converged) dataPoints += 1;
        if (analysisResults.monteCarlo && analysisResults.monteCarlo.iterations > 0) dataPoints += 2;
        if (analysisResults.rainfallThreshold && analysisResults.rainfallThreshold.status) dataPoints += 1;
        if (analysisResults.vegetation && analysisResults.vegetation.vegetationPct !== undefined) dataPoints += 1;
        if (analysisResults.foundation && analysisResults.foundation.isSetbackSafe !== undefined) dataPoints += 1;
        if (analysisResults.sensitivity && analysisResults.sensitivity.base_fos) dataPoints += 1;
        if (analysisResults.infiltration && analysisResults.infiltration.cumulative_infiltration_mm) dataPoints += 1;

        const pct = (dataPoints / maxPoints) * 100;

        let level = 'LOW';
        if (pct >= 80) level = 'HIGH';
        else if (pct >= 60) level = 'MODERATE';
        else if (pct >= 40) level = 'LOW';
        else level = 'VERY LOW';

        return {
            level: level,
            percentage: parseFloat(pct.toFixed(0)),
            dataPointsAvailable: dataPoints,
            dataPointsMaximum: maxPoints,
            note: pct < 60
                ? 'Low confidence — additional field data or laboratory testing recommended.'
                : 'Confidence adequate for preliminary assessment.'
        };
    }

    // ========================================================================
    // COMPARISON TABLE GENERATOR (FOR RISK MATRIX DISPLAY)
    // ========================================================================

    /**
     * Generate the standard risk classification table
     * for display in reports and dashboard
     */
    function getRiskMatrix() {
        return [
            {
                fosRange: '> 1.5',
                rainfall: 'Low',
                vegetation: 'High (>60%)',
                risk: 'LOW',
                color: '#4CAF50',
                fosMin: 1.5,
                fosMax: 10,
                action: 'Monitor, maintain vegetation'
            },
            {
                fosRange: '1.2 – 1.5',
                rainfall: 'Moderate',
                vegetation: 'Medium (30-60%)',
                risk: 'MEDIUM',
                color: '#FF9800',
                fosMin: 1.2,
                fosMax: 1.5,
                action: 'Install drainage, bioengineering'
            },
            {
                fosRange: '< 1.2',
                rainfall: 'High',
                vegetation: 'Low (<30%)',
                risk: 'HIGH',
                color: '#F44336',
                fosMin: 0,
                fosMax: 1.2,
                action: 'Structural intervention, possible relocation'
            }
        ];
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    function formatFieldObs(obs) {
        const items = [];
        if (obs.cracks) items.push('Cracks');
        if (obs.seepage) items.push('Seepage');
        if (obs.pastLandslides) items.push('Past landslides');
        if (obs.construction) items.push('Construction');
        return items.length > 0 ? items.join(', ') : 'None reported';
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        classifyRisk,
        fosToRiskScore,
        rainfallToRiskScore,
        vegetationToRiskScore,
        scoreToClassification,
        calculateProbabilityIndex,
        calculateConfidence,
        getRiskMatrix
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskClassifier;
}
