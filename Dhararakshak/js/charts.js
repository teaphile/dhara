/**
 * ============================================================================
 * DHARARAKSHAK — Charts & Visualization Module
 * ============================================================================
 * Uses Chart.js for rendering all analytical visualizations.
 * All chart configurations are dynamically generated from analysis data.
 * ============================================================================
 */

const DharaCharts = (function () {
    'use strict';

    const chartInstances = {};

    function destroyChart(id) {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
            delete chartInstances[id];
        }
    }

    // ========================================================================
    // 1. FoS COMPARISON BAR CHART
    // ========================================================================
    function renderFoSComparison(canvasId, analysisResults) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const data = {
            labels: ['Infinite Slope', 'Bishop', 'Janbu', 'Composite'],
            datasets: [{
                label: 'Factor of Safety',
                data: [
                    analysisResults.infiniteSlope?.fos || 0,
                    analysisResults.bishop?.fos || 0,
                    analysisResults.janbu?.fos || 0,
                    analysisResults.compositeFoS || 0
                ],
                backgroundColor: [
                    'rgba(21, 101, 192, 0.8)',
                    'rgba(46, 125, 50, 0.8)',
                    'rgba(245, 127, 23, 0.8)',
                    'rgba(13, 71, 161, 0.9)'
                ],
                borderColor: [
                    '#1565C0', '#2E7D32', '#F57F17', '#0D47A1'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        };

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Factor of Safety — Multi-Method Comparison',
                        font: { size: 14, weight: '600' },
                        color: '#1A1A2E'
                    },
                    annotation: {
                        annotations: {
                            safeLine: {
                                type: 'line',
                                yMin: 1.5,
                                yMax: 1.5,
                                borderColor: '#4CAF50',
                                borderWidth: 2,
                                borderDash: [6, 3],
                                label: {
                                    display: true,
                                    content: 'Safe (1.5)',
                                    position: 'end',
                                    font: { size: 11 }
                                }
                            },
                            failureLine: {
                                type: 'line',
                                yMin: 1.0,
                                yMax: 1.0,
                                borderColor: '#F44336',
                                borderWidth: 2,
                                borderDash: [6, 3],
                                label: {
                                    display: true,
                                    content: 'Failure (1.0)',
                                    position: 'start',
                                    font: { size: 11 }
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: Math.max(3, (analysisResults.compositeFoS || 1) * 1.5),
                        title: { display: true, text: 'Factor of Safety', font: { size: 12 } },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 2. MONTE CARLO HISTOGRAM
    // ========================================================================
    function renderMonteCarloHistogram(canvasId, mcResults) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !mcResults?.histogram) return;

        const labels = mcResults.binEdges.slice(0, -1).map((e, i) =>
            `${e.toFixed(2)}–${mcResults.binEdges[i + 1].toFixed(2)}`
        );

        const colors = mcResults.binEdges.slice(0, -1).map(e =>
            e < 1.0 ? 'rgba(244, 67, 54, 0.7)' :
            e < 1.5 ? 'rgba(255, 152, 0, 0.7)' :
            'rgba(76, 175, 80, 0.7)'
        );

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: mcResults.histogram,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Monte Carlo Distribution (${mcResults.iterations} iterations) — Pf = ${mcResults.probability_of_failure}%`,
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Frequency' },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        title: { display: true, text: 'Factor of Safety' },
                        ticks: {
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 15
                        }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 3. SENSITIVITY TORNADO CHART
    // ========================================================================
    function renderSensitivityTornado(canvasId, sensResults) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !sensResults?.results) return;

        const sorted = sensResults.sortedKeys;
        const labels = sorted.map(k => sensResults.results[k].label);
        const swings = sorted.map(k => sensResults.results[k].swing);
        const maxSwing = Math.max(...swings);

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'FoS Swing (±10% parameter variation)',
                    data: swings,
                    backgroundColor: swings.map(s =>
                        `rgba(${Math.round(255 * s / maxSwing)}, ${Math.round(150 * (1 - s / maxSwing))}, 50, 0.8)`
                    ),
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.1)'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Sensitivity Analysis — Most Sensitive: ${sensResults.mostSensitiveLabel}`,
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'FoS Change (Absolute)' },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 4. RAINFALL I-D THRESHOLD CURVE
    // ========================================================================
    function renderIDCurve(canvasId, currentIntensity, currentDuration) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const curveData = GeotechnicalEngine.generateIDCurveData();

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: curveData.durations.map(d => d.toFixed(1)),
                datasets: [
                    {
                        label: 'Global Threshold (Caine 1980)',
                        data: curveData.caine,
                        borderColor: '#1565C0',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4
                    },
                    {
                        label: 'Himalayan Threshold (Guzzetti 2008)',
                        data: curveData.himalaya,
                        borderColor: '#F57F17',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4
                    },
                    {
                        label: 'Current Storm Event',
                        data: curveData.durations.map(d =>
                            Math.abs(d - currentDuration) < 0.5 ? currentIntensity : null
                        ),
                        borderColor: '#F44336',
                        backgroundColor: '#F44336',
                        pointRadius: 10,
                        pointStyle: 'crossRot',
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Rainfall Intensity-Duration Threshold',
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Duration (hours)' },
                        ticks: { autoSkip: true, maxTicksLimit: 15 }
                    },
                    y: {
                        title: { display: true, text: 'Intensity (mm/hr)' },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 5. RISK COMPONENT RADAR CHART
    // ========================================================================
    function renderRiskRadar(canvasId, riskAssessment) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !riskAssessment?.components) return;

        const comp = riskAssessment.components;
        const labels = ['Geotechnical', 'Rainfall', 'Vegetation', 'Structural', 'Terrain', 'Field Obs.'];
        const scores = [
            comp.geotechnical?.score || 0,
            comp.rainfall?.score || 0,
            comp.vegetation?.score || 0,
            comp.structural?.score || 0,
            comp.terrain?.score || 0,
            comp.field?.score || 0
        ];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Risk Score (0-100)',
                    data: scores,
                    backgroundColor: 'rgba(244, 67, 54, 0.15)',
                    borderColor: '#F44336',
                    borderWidth: 2,
                    pointBackgroundColor: '#F44336',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Multi-Parameter Risk Profile',
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 20, font: { size: 10 } },
                        pointLabels: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 6. INFILTRATION TIMELINE
    // ========================================================================
    function renderInfiltrationTimeline(canvasId, infiltrationData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !infiltrationData?.history) return;

        const h = infiltrationData.history;

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: h.map(p => p.time_hr.toFixed(1) + 'h'),
                datasets: [
                    {
                        label: 'Infiltration Rate (mm/hr)',
                        data: h.map(p => p.infiltration_rate_mmhr),
                        borderColor: '#1565C0',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'Capacity (mm/hr)',
                        data: h.map(p => p.capacity_mmhr),
                        borderColor: '#4CAF50',
                        borderWidth: 2,
                        borderDash: [5, 3],
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'Cumulative (mm)',
                        data: h.map(p => p.cumulative_mm),
                        borderColor: '#FF9800',
                        borderWidth: 2,
                        fill: 'origin',
                        backgroundColor: 'rgba(255,152,0,0.08)',
                        tension: 0.3,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Green-Ampt Infiltration Model',
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Rate (mm/hr)' },
                        position: 'left'
                    },
                    y2: {
                        title: { display: true, text: 'Cumulative (mm)' },
                        position: 'right',
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { autoSkip: true, maxTicksLimit: 12 }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 7. BEFORE/AFTER OUTCOME CHART
    // ========================================================================
    function renderOutcomeComparison(canvasId, outcome) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !outcome) return;

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Factor of Safety', 'Failure Probability'],
                datasets: [
                    {
                        label: 'Before Mitigation',
                        data: [outcome.before.fos, outcome.before.failureProbability],
                        backgroundColor: 'rgba(244, 67, 54, 0.7)',
                        borderColor: '#F44336',
                        borderWidth: 2,
                        borderRadius: 4
                    },
                    {
                        label: 'After Mitigation',
                        data: [outcome.after.fos, outcome.after.failureProbability],
                        backgroundColor: 'rgba(76, 175, 80, 0.7)',
                        borderColor: '#4CAF50',
                        borderWidth: 2,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Outcome Analysis — Risk Reduction: ${outcome.improvement.riskReductionPct}%`,
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ========================================================================
    // 8. RISK GAUGE (Doughnut)
    // ========================================================================
    function renderRiskGauge(canvasId, riskScore, classification) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const colorMap = {
            'VERY LOW': '#1B5E20',
            'LOW': '#4CAF50',
            'MEDIUM': '#FF9800',
            'HIGH': '#F44336',
            'CRITICAL': '#B71C1C'
        };

        const color = colorMap[classification?.level] || '#888';

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Risk Score', 'Remaining'],
                datasets: [{
                    data: [riskScore, 100 - riskScore],
                    backgroundColor: [color, '#E0E0E0'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw(chart) {
                    const { width, height, ctx: c } = chart;
                    c.save();
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    c.font = 'bold 28px Inter, sans-serif';
                    c.fillStyle = color;
                    c.fillText(riskScore.toFixed(0), width / 2, height / 2 - 8);
                    c.font = '11px Inter, sans-serif';
                    c.fillStyle = '#888';
                    c.fillText(classification?.level || 'N/A', width / 2, height / 2 + 18);
                    c.restore();
                }
            }]
        });
    }

    // ========================================================================
    // 9. MITIGATION COST BREAKDOWN PIE
    // ========================================================================
    function renderMitigationCostPie(canvasId, recommendations) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const categories = {};
        const allRecs = [
            ...(recommendations.immediate || []),
            ...(recommendations.shortTerm || []),
            ...(recommendations.longTerm || [])
        ];

        for (const r of allRecs) {
            const cat = r.name.includes('Drain') ? 'Drainage' :
                       r.name.includes('Gabion') || r.name.includes('RCC') || r.name.includes('Nail') || r.name.includes('Bolt') || r.name.includes('Shotcrete') ? 'Structural' :
                       r.name.includes('Vetiver') || r.name.includes('Bamboo') || r.name.includes('Coir') || r.name.includes('Native') ? 'Bioengineering' :
                       'Land Management';
            categories[cat] = (categories[cat] || 0) + r.riskReduction;
        }

        const labels = Object.keys(categories);
        const data = Object.values(categories);
        const bgColors = labels.map(l =>
            l === 'Drainage' ? '#1565C0' :
            l === 'Structural' ? '#E65100' :
            l === 'Bioengineering' ? '#2E7D32' :
            '#6A1B9A'
        );

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors.map(c => c + 'CC'),
                    borderColor: bgColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Mitigation Category Contribution (% Risk Reduction)',
                        font: { size: 13, weight: '600' }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 10. DATA VISUALIZER — Input Parameters Radar
    // ========================================================================
    /**
     * Radar chart showing all user-entered input parameters normalized to 0-100.
     * Purpose: Quick visual overview of the input profile — helps identify
     * which parameters are dominating the analysis.
     *
     * @param {string} canvasId
     * @param {Object} siteData — collected input data
     */
    function renderInputRadar(canvasId, siteData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !siteData) return;

        // Normalize each parameter to 0–100 scale
        const labels = [
            'Slope Angle',
            'Vegetation %',
            'Rain Intensity',
            'Rain Duration',
            'Saturation %',
            'Structure Distance'
        ];
        const data = [
            Math.min(100, (siteData.slopeAngle / 80) * 100),
            siteData.vegetationPct || 0,
            Math.min(100, (siteData.rainfallIntensity / 50) * 100),
            Math.min(100, (siteData.rainfallDuration / 120) * 100),
            siteData.saturation || 0,
            Math.min(100, ((50 - (siteData.houseDistance || 6)) / 50) * 100)
        ];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Input Parameters (Normalized)',
                    data: data,
                    backgroundColor: 'rgba(21, 101, 192, 0.12)',
                    borderColor: '#1565C0',
                    borderWidth: 2,
                    pointBackgroundColor: '#1565C0',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'User Input Parameters Profile',
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 20, font: { size: 10 } },
                        pointLabels: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 11. DATA VISUALIZER — Soil Properties Bar Chart
    // ========================================================================
    /**
     * Grouped bar chart showing soil type properties: cohesion, friction angle,
     * unit weight, permeability (log scale indicator).
     * Purpose: Visualize the soil parameters used in FoS calculation.
     *
     * @param {string} canvasId
     * @param {Object} soilProps — soil properties from SOIL_DATABASE
     */
    function renderSoilBar(canvasId, soilProps) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !soilProps) return;

        const labels = ['Cohesion (kPa)', 'Friction Angle (deg)', 'Unit Weight (kN/m3)', 'Porosity (%)'];
        const values = [
            soilProps.cohesion?.mean || 0,
            soilProps.friction?.mean || 0,
            soilProps.unitWeight?.mean || 0,
            (soilProps.porosity || 0) * 100
        ];
        const stddevs = [
            soilProps.cohesion?.stddev || 0,
            soilProps.friction?.stddev || 0,
            soilProps.unitWeight?.stddev || 0,
            0
        ];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Mean Value',
                        data: values,
                        backgroundColor: [
                            'rgba(21, 101, 192, 0.7)',
                            'rgba(46, 125, 50, 0.7)',
                            'rgba(245, 127, 23, 0.7)',
                            'rgba(106, 27, 154, 0.7)'
                        ],
                        borderColor: ['#1565C0', '#2E7D32', '#F57F17', '#6A1B9A'],
                        borderWidth: 2,
                        borderRadius: 6
                    },
                    {
                        label: 'Std Deviation',
                        data: stddevs,
                        backgroundColor: 'rgba(0,0,0,0.08)',
                        borderColor: 'rgba(0,0,0,0.2)',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Soil Properties — ' + (soilProps.name || 'Selected Soil'),
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Value' },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ========================================================================
    // 12. DATA VISUALIZER — Risk Weight Pie Chart
    // ========================================================================
    /**
     * Pie chart showing the weight distribution of the 6 risk components.
     * Purpose: Explains how the composite risk score is calculated —
     * which factors contribute the most to the final risk classification.
     *
     * Weights:
     *   Geotechnical: 35%, Rainfall: 25%, Vegetation: 15%,
     *   Structural: 10%, Terrain: 10%, Field Observations: 5%
     *
     * @param {string} canvasId
     */
    function renderWeightPie(canvasId) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [
                    'Geotechnical (35%)',
                    'Rainfall (25%)',
                    'Vegetation (15%)',
                    'Structural (10%)',
                    'Terrain (10%)',
                    'Field Obs. (5%)'
                ],
                datasets: [{
                    data: [35, 25, 15, 10, 10, 5],
                    backgroundColor: [
                        'rgba(21, 101, 192, 0.8)',
                        'rgba(30, 136, 229, 0.8)',
                        'rgba(46, 125, 50, 0.8)',
                        'rgba(230, 81, 0, 0.8)',
                        'rgba(245, 127, 23, 0.8)',
                        'rgba(106, 27, 154, 0.8)'
                    ],
                    borderColor: ['#1565C0', '#1E88E5', '#2E7D32', '#E65100', '#F57F17', '#6A1B9A'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Risk Score Component Weights (NIDM-Aligned)',
                        font: { size: 13, weight: '600' }
                    },
                    legend: {
                        position: 'right',
                        labels: { font: { size: 11 }, padding: 12 }
                    }
                }
            }
        });
    }

    // ========================================================================
    // 13. DATA VISUALIZER — FoS vs Slope Angle Curve
    // ========================================================================
    /**
     * Line chart showing how Factor of Safety varies with slope angle
     * for the currently selected soil type and conditions. The user's
     * current slope angle is marked on the curve.
     *
     * Purpose: Helps interpret the relationship between slope geometry
     * and stability — critical for understanding "what if" scenarios.
     *
     * @param {string} canvasId
     * @param {Object} siteData — current input parameters
     * @param {Object} soilProps — soil properties
     */
    function renderFosSlopeCurve(canvasId, siteData, soilProps) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx || !siteData || !soilProps) return;

        const angles = [];
        const fosValues = [];
        const currentAngle = siteData.slopeAngle || 35;

        // Calculate FoS for slope angles 5° to 75°
        for (let a = 5; a <= 75; a += 2) {
            angles.push(a);
            const result = GeotechnicalEngine.infiniteSlope({
                cohesion: soilProps.cohesion?.mean || 5,
                frictionAngle: soilProps.friction?.mean || 30,
                slopeAngle: a,
                unitWeight: soilProps.unitWeight?.mean || 19,
                depth: GeotechnicalEngine.DEFAULT_DEPTH,
                saturation: siteData.saturation || 50
            });
            fosValues.push(result.fos);
        }

        // Find current FoS on curve
        const currentFoSResult = GeotechnicalEngine.infiniteSlope({
            cohesion: soilProps.cohesion?.mean || 5,
            frictionAngle: soilProps.friction?.mean || 30,
            slopeAngle: currentAngle,
            unitWeight: soilProps.unitWeight?.mean || 19,
            depth: GeotechnicalEngine.DEFAULT_DEPTH,
            saturation: siteData.saturation || 50
        });

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: angles.map(a => a + '\u00B0'),
                datasets: [
                    {
                        label: 'FoS vs Slope Angle',
                        data: fosValues,
                        borderColor: '#1565C0',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: 'Safe Threshold (FoS=1.5)',
                        data: angles.map(() => 1.5),
                        borderColor: '#4CAF50',
                        borderWidth: 1.5,
                        borderDash: [6, 3],
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Failure Line (FoS=1.0)',
                        data: angles.map(() => 1.0),
                        borderColor: '#F44336',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Current (' + currentAngle + '\u00B0 → FoS=' + currentFoSResult.fos.toFixed(2) + ')',
                        data: angles.map(a => Math.abs(a - currentAngle) <= 1 ? currentFoSResult.fos : null),
                        borderColor: '#D32F2F',
                        backgroundColor: '#D32F2F',
                        pointRadius: 10,
                        pointStyle: 'crossRot',
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Factor of Safety vs Slope Angle — ' + (soilProps.name || ''),
                        font: { size: 13, weight: '600' }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Factor of Safety' },
                        min: 0,
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        title: { display: true, text: 'Slope Angle' },
                        ticks: { autoSkip: true, maxTicksLimit: 15 }
                    }
                }
            }
        });
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        renderFoSComparison,
        renderMonteCarloHistogram,
        renderSensitivityTornado,
        renderIDCurve,
        renderRiskRadar,
        renderInfiltrationTimeline,
        renderOutcomeComparison,
        renderRiskGauge,
        renderMitigationCostPie,
        // Data Visualizer charts
        renderInputRadar,
        renderSoilBar,
        renderWeightPie,
        renderFosSlopeCurve,
        destroyChart
    };
})();
