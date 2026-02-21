/**
 * ============================================================================
 * DHARARAKSHAK — Mitigation Recommendation Engine
 * ============================================================================
 * Classifies and recommends mitigation measures per Indian standards:
 *   - IS 14458 (Parts 1-3): Retaining walls for hill areas
 *   - IRC:SP:48-1998: Hill Road Manual
 *   - NIDM 2019: Landslide Risk Management
 *   - CSWCRTI guidelines: Bioengineering measures
 *
 * Categories:
 *   A. Drainage Control
 *   B. Structural Measures
 *   C. Bioengineering
 *   D. Land Management
 *
 * DISCLAIMER: Recommendations are for decision support.
 * Final design must be approved by certified geotechnical engineer.
 * ============================================================================
 */

const MitigationEngine = (function () {
    'use strict';

    // ========================================================================
    // COMPLETE MITIGATION DATABASE
    // ========================================================================

    const MITIGATION_DB = {

        // ====================================================================
        // A. DRAINAGE CONTROL MEASURES
        // ====================================================================
        drainage: {
            category: 'Drainage Control',
            icon: '💧',
            color: '#1565C0',
            measures: {

                surface_drains: {
                    name: 'Surface Drains (Lined Channels)',
                    description: 'Open trapezoidal or V-shaped channels to intercept and divert surface runoff away from the slope face. Lined with stone masonry or precast concrete.',
                    designConcept: 'Channels aligned along contours above the slope crest with 1–2% longitudinal gradient. Cross-section designed using Manning\'s equation: Q = (1/n)·A·R^(2/3)·S^(1/2). Minimum 300mm depth, 450mm top width.',
                    installationMethod: '1. Survey contour lines above the unstable zone.\n2. Excavate trapezoidal channel (300mm deep × 450mm wide).\n3. Line with 150mm stone masonry in 1:4 cement mortar OR precast concrete sections.\n4. Construct energy dissipators at gradient changes.\n5. Connect to natural drainage or toe drain outlet.',
                    costEstimate: { perMeter: '₹800–₹1,500/m', typical100m: '₹80,000–₹1,50,000' },
                    lifeSpan: '15–20 years with maintenance',
                    maintenance: 'Bi-annual clearing of debris and silt. Post-monsoon inspection of lining integrity. Repair cracks within 2 weeks of detection.',
                    riskReduction: 15,
                    applicability: { minSlope: 10, maxSlope: 45, soils: 'All', rainfall: 'All' },
                    standards: ['IS 14458 Part 1', 'IRC:SP:48 Sec 7.3']
                },

                horizontal_drains: {
                    name: 'Horizontal Drains (Perforated Pipes)',
                    description: 'Perforated PVC/HDPE pipes installed horizontally into the slope face to lower the phreatic surface and reduce pore water pressure.',
                    designConcept: 'Pipes (50–100mm dia) installed at 5–15° upward inclination, 3–5m spacing, penetrating 10–15m into slope. Perforations on upper half to prevent clogging. Wrapped in geotextile filter fabric. Reduces pore pressure parameter ru by 0.1–0.3.',
                    installationMethod: '1. Drill horizontal boreholes at 5–10° upward from horizontal.\n2. Insert slotted PVC pipe (75mm OD) wrapped in non-woven geotextile.\n3. Pack annular space with 10–20mm graded gravel.\n4. Install collection header pipe at slope face.\n5. Route discharge to surface drain system.',
                    costEstimate: { perUnit: '₹15,000–₹25,000/drain', typical10drains: '₹1,50,000–₹2,50,000' },
                    lifeSpan: '20–30 years',
                    maintenance: 'Annual flow rate monitoring. Flush pipes every 2 years. Replace geotextile filter if flow reduces >50%.',
                    riskReduction: 20,
                    applicability: { minSlope: 20, maxSlope: 60, soils: 'Clayey, Silty', rainfall: 'Moderate to High' },
                    standards: ['IS 14458 Part 1', 'FHWA-IF-99-015']
                },

                toe_drains: {
                    name: 'Toe Drains (French Drains)',
                    description: 'Gravel-filled trenches with perforated pipe at the toe of the slope to collect and discharge seepage water, preventing erosion and softening of the toe zone.',
                    designConcept: 'Trench 600mm wide × 1000mm deep at slope toe. Lined with non-woven geotextile (150 GSM). Filled with 20–40mm clean gravel. Perforated HDPE pipe (100mm) at base with 1–2% gradient to outlet. Design discharge: Q = K·i·A per Darcy\'s law.',
                    installationMethod: '1. Excavate trench at slope toe (600×1000mm).\n2. Line with non-woven geotextile (overlap 300mm).\n3. Place 100mm perforated HDPE pipe at trench bottom.\n4. Fill with clean 20–40mm angular gravel.\n5. Fold geotextile over top, cover with 150mm topsoil.\n6. Connect pipe to discharge point away from slope.',
                    costEstimate: { perMeter: '₹1,200–₹2,000/m', typical50m: '₹60,000–₹1,00,000' },
                    lifeSpan: '25–30 years',
                    maintenance: 'Inspect outlet for blockage quarterly. Clean gravel surface annually. Replace geotextile every 15 years if clogged.',
                    riskReduction: 18,
                    applicability: { minSlope: 15, maxSlope: 50, soils: 'All', rainfall: 'All' },
                    standards: ['IS 14458 Part 1', 'IRC:SP:48']
                },

                catch_drains: {
                    name: 'Catch Drains (Interceptor Ditches)',
                    description: 'Deep drainage channels cut above the tension crack zone to intercept subsurface water flow before it enters the unstable mass.',
                    designConcept: 'Trench excavated 1.5–3.0m deep above the head scarp. Width typically 600mm–1000mm. Backfilled with free-draining material or left open with retaining walls. Intercepts perched water table and reduces infiltration into the slide mass.',
                    installationMethod: '1. Identify tension crack zone via site survey.\n2. Excavate trench 2m upslope of tension cracks, 1.5–3.0m deep.\n3. Install perforated collection pipe at base.\n4. Backfill with 25–50mm clean gravel.\n5. Cap with compacted clay layer (300mm) to prevent surface water entry.\n6. Direct collected water to safe discharge point.',
                    costEstimate: { perMeter: '₹2,500–₹4,000/m', typical30m: '₹75,000–₹1,20,000' },
                    lifeSpan: '15–20 years',
                    maintenance: 'Post-monsoon inspection mandatory. Remove accumulated silt annually. Check pipe condition every 3 years.',
                    riskReduction: 22,
                    applicability: { minSlope: 25, maxSlope: 55, soils: 'Clayey, Residual', rainfall: 'High' },
                    standards: ['IS 14458 Part 1', 'NIDM 2019 Ch.7']
                }
            }
        },

        // ====================================================================
        // B. STRUCTURAL MEASURES
        // ====================================================================
        structural: {
            category: 'Structural Measures',
            icon: '🏗️',
            color: '#E65100',
            measures: {

                gabion_walls: {
                    name: 'Gabion Retaining Walls',
                    description: 'Wire mesh baskets filled with stones, stacked in gravity wall configuration at slope toe. Flexible, free-draining, and suitable for hill terrain. Widely used by BRO and NHAI in Himalayan regions.',
                    designConcept: 'Gravity wall design per IS 14458 Part 3. Base width = 0.5–0.6 × wall height. Batter: 6°–10° toward slope. Stability checks: FoS overturning ≥ 2.0, FoS sliding ≥ 1.5, eccentricity within middle third. Active earth pressure by Rankine: Ka = tan²(45° − φ/2).',
                    installationMethod: '1. Prepare level foundation bed (compact to 95% MDD).\n2. Place gabion baskets (2m × 1m × 1m standard).\n3. Fill with 100–250mm angular stones (not rounded).\n4. Wire-tie adjacent baskets and layers.\n5. Step back each layer 150mm toward slope.\n6. Install geotextile filter between soil and gabion back face.\n7. Compact backfill in 300mm layers.',
                    costEstimate: { perCubicMeter: '₹3,500–₹5,500/m³', typicalWall: '₹2,50,000–₹5,00,000 (per 10m length × 3m height)' },
                    lifeSpan: '25–40 years (PVC-coated wire: 50+ years)',
                    maintenance: 'Annual inspection of wire mesh integrity. Replace corroded wires within 1 year. Re-pack dislodged stones. Check for undermining at toe.',
                    riskReduction: 35,
                    applicability: { minSlope: 25, maxSlope: 55, soils: 'All', rainfall: 'All' },
                    standards: ['IS 14458 Part 3', 'IRC:SP:48 Sec 8', 'IS 16014:2012']
                },

                rcc_walls: {
                    name: 'RCC Retaining Walls (Cantilever/Counterfort)',
                    description: 'Reinforced cement concrete walls used for taller slopes requiring rigid support. Cantilever type for heights up to 6m; counterfort type for 6–12m.',
                    designConcept: 'Design per IS 456:2000 and IS 14458 Part 2. Base width = 0.5–0.7 × H for cantilever. Stem thickness: 200mm at top tapering to 0.08H at base. Counterfort spacing: 0.3–0.5 × H. Stability: overturning FoS ≥ 2.0, sliding FoS ≥ 1.5, bearing pressure ≤ SBC.',
                    installationMethod: '1. Excavate foundation to competent stratum.\n2. Pour PCC leveling course (M15, 150mm).\n3. Set reinforcement cage for base slab and stem per IS 456.\n4. Pour M25 concrete in sections (max 3m lift).\n5. Cure for 28 days (wet curing).\n6. Install 150mm weep holes at 1.5m c/c.\n7. Place filter material behind wall.\n8. Backfill in controlled layers.',
                    costEstimate: { perCubicMeter: '₹8,000–₹12,000/m³ (concrete)', typicalWall: '₹6,00,000–₹15,00,000 (per 10m length × 5m height)' },
                    lifeSpan: '50–75 years',
                    maintenance: 'Inspect for cracks every monsoon season. Seal cracks with epoxy injection. Check weep hole function quarterly during monsoon. Structural audit every 10 years.',
                    riskReduction: 45,
                    applicability: { minSlope: 30, maxSlope: 70, soils: 'All', rainfall: 'All' },
                    standards: ['IS 456:2000', 'IS 14458 Part 2', 'IS 1904:1986']
                },

                soil_nailing: {
                    name: 'Soil Nailing',
                    description: 'Steel bars (nails) grouted into drilled holes in the slope face. Creates a reinforced soil block that acts as gravity retaining structure. Face covered with shotcrete or wire mesh.',
                    designConcept: 'Nails: 25–32mm dia Fe500 TMT bars, 6–12m length. Spacing: 1.0–2.0m grid (both H & V). Grouted in 100–150mm boreholes using cement grout (w/c = 0.45). Pull-out resistance: T = π × d × L × τ (bond stress). Global stability checked by modified Bishop method with nail forces. Face: 100–150mm shotcrete with welded wire mesh.',
                    installationMethod: '1. Excavate slope face in 1.5–2m lifts (top-down).\n2. Drill holes at 10–15° below horizontal.\n3. Insert steel nail bar with centralizers.\n4. Gravity grout with cement grout (w/c=0.45).\n5. Install bearing plate and hex nut at face.\n6. Apply welded wire mesh (150×150mm, 4mm dia).\n7. Apply shotcrete facing (100–150mm thick, M25).\n8. Install weep hole PVC pipes (75mm at 2m c/c).',
                    costEstimate: { perSquareMeter: '₹4,000–₹7,000/m²', typicalSlope: '₹8,00,000–₹20,00,000 (200 m² face area)' },
                    lifeSpan: '30–50 years (with corrosion protection)',
                    maintenance: 'Annual inspection of shotcrete face for cracks. Corrosion test on nail heads every 5 years. Repair shotcrete spalling immediately. Monitor drainage function.',
                    riskReduction: 40,
                    applicability: { minSlope: 35, maxSlope: 75, soils: 'Residual, Weathered Rock', rainfall: 'All' },
                    standards: ['IS 14458', 'FHWA-IF-03-017', 'IRC:SP:48']
                },

                rock_bolting: {
                    name: 'Rock Bolting / Anchoring',
                    description: 'Tensioned steel bolts anchored deep into stable rock mass to hold unstable blocks or wedges. Used where rock discontinuities create sliding planes.',
                    designConcept: 'Bolt: 25–36mm dia high-strength steel (Grade 8.8). Length: extends 3–5m beyond failure plane into stable rock. Grouted with polyester resin or cement. Design bolt force: T = W·sinα − c·A − (W·cosα)·tan φ, distributed among bolt pattern. Pre-tension to 60–80% of yield.',
                    installationMethod: '1. Map discontinuities and determine bolt pattern.\n2. Drill holes (50–76mm dia) using pneumatic drill.\n3. Clean holes with compressed air.\n4. Insert bolt with resin cartridges or pump cement grout.\n5. Install bearing plate (200×200×20mm) on face.\n6. Tension bolt to design load using hydraulic jack.\n7. Apply corrosion protection (galvanizing + epoxy cap).\n8. Verify tension annually with torque wrench.',
                    costEstimate: { perBolt: '₹8,000–₹15,000/bolt', typicalSite: '₹3,00,000–₹8,00,000 (30–50 bolts)' },
                    lifeSpan: '30–50 years (galvanized/epoxy coated)',
                    maintenance: 'Torque check every 2 years. Re-tension if load loss >15%. Replace corroded bolts. Inspect bearing plates annually.',
                    riskReduction: 38,
                    applicability: { minSlope: 40, maxSlope: 85, soils: 'Weathered Rock, Hard Rock', rainfall: 'All' },
                    standards: ['IS 11309:1985', 'IS 14458', 'IRC:SP:48']
                },

                shotcrete: {
                    name: 'Shotcrete Facing',
                    description: 'Pneumatically sprayed concrete applied to exposed slope face to prevent surface erosion, control seepage, and provide confinement. Often combined with wire mesh or fiber reinforcement.',
                    designConcept: 'Mix: M25–M30 grade with steel fiber (40 kg/m³) or polypropylene fiber (1 kg/m³). Thickness: 75–150mm in one or two passes. Applied by wet-mix process for better quality control. Weep holes (75mm PVC) at 2–3m c/c to prevent hydrostatic buildup.',
                    installationMethod: '1. Clean and roughen slope surface (remove loose material).\n2. Install drainage strips (geocomposite drains) vertically at 3m c/c.\n3. Fix welded wire mesh (4mm dia, 150×150mm) with rock bolts.\n4. Apply first pass of shotcrete (75mm).\n5. Install weep hole pipes through wet shotcrete.\n6. Apply second pass if needed (total 100–150mm).\n7. Cure with curing compound or wet burlap for 7 days.',
                    costEstimate: { perSquareMeter: '₹1,500–₹3,000/m²', typicalSlope: '₹3,00,000–₹6,00,000 (200 m²)' },
                    lifeSpan: '25–40 years',
                    maintenance: 'Inspect for debonding or hollow sounds (tap test) annually. Patch cracks with polymer-modified mortar. Clean weep holes every monsoon season.',
                    riskReduction: 25,
                    applicability: { minSlope: 30, maxSlope: 80, soils: 'All', rainfall: 'All' },
                    standards: ['IS 9012:1978', 'IS 14458', 'ACI 506R']
                }
            }
        },

        // ====================================================================
        // C. BIOENGINEERING MEASURES
        // ====================================================================
        bioengineering: {
            category: 'Bioengineering',
            icon: '🌿',
            color: '#2E7D32',
            measures: {

                vetiver_grass: {
                    name: 'Vetiver Grass System (VGS)',
                    description: 'Dense planting of Vetiver (Chrysopogon zizanioides) in hedgerows along contours. Roots penetrate 3–4m deep, providing significant soil reinforcement. Recommended by World Bank for slope stabilization.',
                    designConcept: 'Plant in double hedgerows at 1.0–1.5m vertical intervals along contours. Each hedgerow: 2 staggered rows at 150mm spacing, plants 100mm apart within row. Root cohesion addition: 5–10 kPa after 2 years. Hydraulic conductivity improvement: 10–100× increase in root zone.',
                    installationMethod: '1. Mark contour lines at 1.0–1.5m vertical intervals.\n2. Prepare 200mm deep × 200mm wide planting trench.\n3. Source certified Vetiver slips (Sunshine variety for cold tolerance).\n4. Trim leaves to 200mm, roots to 100mm.\n5. Plant 2–3 tillers per clump at 100mm spacing.\n6. Water immediately and mulch between rows.\n7. First cut at 500mm height to encourage tillering.\n8. Replant gaps within 3 months.',
                    costEstimate: { perMeter: '₹50–₹100/running meter', typicalSlope: '₹15,000–₹40,000 (500 m² slope)' },
                    lifeSpan: '50+ years (self-sustaining once established)',
                    maintenance: 'Trim to 400mm twice annually. Fill gaps from die-back. No fertilizer needed after Year 1. Monitor hedgerow continuity post-monsoon.',
                    riskReduction: 20,
                    applicability: { minSlope: 10, maxSlope: 45, soils: 'All except pure rock', rainfall: 'All' },
                    standards: ['CSWCRTI Guidelines', 'World Bank TN', 'NIDM 2019']
                },

                bamboo_crib: {
                    name: 'Bamboo Crib Walls',
                    description: 'Self-contained retaining structures made of bamboo logs filled with compacted earth and planted with live vegetation. Combines structural retention with bioengineering.',
                    designConcept: 'Crib structure: alternating longitudinal and cross members (100–150mm dia bamboo, treated with borax-boric acid). Cell size: 1.0m × 1.0m. Height: up to 3m. Backfill with selected granular material compacted in 300mm layers. Plant live stakes and grass in fill.',
                    installationMethod: '1. Prepare level foundation (compact to 90% MDD).\n2. Lay first course of longitudinal bamboo members.\n3. Place cross members at right angles, nail/wire at joints.\n4. Fill cells with compacted granular soil.\n5. Place live willow/poplar stakes at 500mm c/c in fill.\n6. Repeat courses to design height.\n7. Plant slopes with grass seed and creepers.\n8. Water weekly for first season.',
                    costEstimate: { perCubicMeter: '₹1,200–₹2,500/m³', typicalWall: '₹40,000–₹80,000 (5m × 2m)' },
                    lifeSpan: '8–12 years (structure), transitioning to living vegetation system',
                    maintenance: 'Inspect joints annually. Replace decayed bamboo members. Ensure live vegetation is establishing. Prune to prevent overloading.',
                    riskReduction: 18,
                    applicability: { minSlope: 15, maxSlope: 40, soils: 'All except highly plastic clays', rainfall: 'Moderate to High' },
                    standards: ['CSWCRTI Manual', 'FAO Bioengineering Guide']
                },

                coir_geotextile: {
                    name: 'Coir Geotextile / Coir Mat',
                    description: 'Natural fiber mats made from coconut husk, laid on exposed slopes to prevent surface erosion, retain moisture, and promote vegetation establishment. Biodegradable within 3–5 years as plants establish.',
                    designConcept: 'Open-weave coir net (400–700 GSM) pegged to slope surface. Covered with topsoil and hydro-seeded. Coir blankets (900 GSM) for steeper slopes. Reduces surface runoff velocity by 60–80%. Degrades as root network develops.',
                    installationMethod: '1. Grade and smooth slope surface.\n2. Apply 50mm topsoil layer with seed mix.\n3. Unroll coir mat from top to bottom (overlap 150mm).\n4. Peg with wooden pegs (300mm long) at 1m grid.\n5. Trench top edge 300mm into soil and backfill.\n6. Hydro-seed through mat if not pre-seeded.\n7. Water regularly for first 60 days.',
                    costEstimate: { perSquareMeter: '₹30–₹80/m²', typicalSlope: '₹15,000–₹40,000 (500 m²)' },
                    lifeSpan: '3–5 years (design life until vegetation establishes)',
                    maintenance: 'Re-peg loose sections after heavy rain. Fill erosion rills with topsoil. Re-seed bare patches. Minimal after Year 2 if vegetation has established.',
                    riskReduction: 12,
                    applicability: { minSlope: 10, maxSlope: 50, soils: 'All', rainfall: 'All' },
                    standards: ['IS 15868:2008', 'CSWCRTI', 'Coir Board India']
                },

                native_species: {
                    name: 'Native Species Plantation',
                    description: 'Systematic planting of indigenous trees and shrubs with deep root systems adapted to local soil and climate. Provides long-term slope stabilization through root reinforcement and interception of rainfall.',
                    designConcept: 'Species selection based on altitude, soil type, and rainfall zone. Himalayan species: Alnus nepalensis (Utis), Grewia optiva (Bhimal), Bauhinia variegata (Kachnar). Spacing: 2m × 2m staggered. Root cohesion at maturity: 8–15 kPa. Canopy interception: 15–30% of rainfall.',
                    installationMethod: '1. Select species from ICFRE/FSI recommended list for the region.\n2. Source saplings from State Forest Nursery (1-year-old stock).\n3. Dig pits 450mm × 450mm × 450mm at 2m staggered spacing.\n4. Mix pit soil with FYM (2 kg/pit) and bone meal (100 g/pit).\n5. Plant saplings during pre-monsoon (June).\n6. Stake and protect with tree guards.\n7. Mulch with dry grass (150mm layer).\n8. Water weekly in first dry season.',
                    costEstimate: { perSapling: '₹30–₹100/sapling (nursery)', typicalHectare: '₹75,000–₹2,00,000/ha (including labor)' },
                    lifeSpan: '100+ years (self-sustaining)',
                    maintenance: 'Watering in first 2 dry seasons. Remove dead saplings and replant. Protect from grazing (fencing). No pruning of slope-side branches.',
                    riskReduction: 25,
                    applicability: { minSlope: 10, maxSlope: 40, soils: 'All', rainfall: 'All' },
                    standards: ['ICFRE Guidelines', 'NIDM 2019', 'National Afforestation Programme']
                }
            }
        },

        // ====================================================================
        // D. LAND MANAGEMENT MEASURES
        // ====================================================================
        landManagement: {
            category: 'Land Management',
            icon: '📐',
            color: '#6A1B9A',
            measures: {

                cut_slope_correction: {
                    name: 'Cut Slope Correction / Re-grading',
                    description: 'Reducing the slope angle by excavating material from the head and/or adding material at the toe (load transfer). Most fundamental slope stabilization technique.',
                    designConcept: 'Target post-correction slope angle: generally ≤ stable angle for soil type. For residual soils: 1V:1.5H to 1V:2H. Include benches at 5–8m vertical intervals (min 2m wide). Berms function as access paths and drainage channels. FoS improvement: proportional to tan(original)/tan(corrected).',
                    installationMethod: '1. Conduct detailed slip circle analysis to determine safe angle.\n2. Mark excavation limits on ground.\n3. Begin excavation from top in 1.5m lifts.\n4. Construct benches at designed intervals.\n5. Move excavated material to toe (counterweight fill).\n6. Compact toe fill in 300mm layers.\n7. Construct bench drains (lined channels).\n8. Vegetate all exposed surfaces immediately.',
                    costEstimate: { perCubicMeter: '₹150–₹400/m³ (excavation + transport)', typicalSite: '₹2,00,000–₹8,00,000 (500–2000 m³)' },
                    lifeSpan: 'Permanent (with drainage and vegetation maintenance)',
                    maintenance: 'Inspect bench integrity annually. Maintain bench drainage. Re-vegetate erosion patches. Monitor piezometric levels if installed.',
                    riskReduction: 40,
                    applicability: { minSlope: 30, maxSlope: 70, soils: 'All', rainfall: 'All' },
                    standards: ['IS 14458 Part 1', 'IRC:SP:48 Sec 6', 'IS 1498:1970']
                },

                setback_planning: {
                    name: 'Setback Distance Enforcement',
                    description: 'Maintaining minimum safe distance between structures and slope crest/toe as per codal provisions. Prevents surcharge loading on unstable slopes and protects structures from debris.',
                    designConcept: 'IS 14458 Part 1: Setback ≥ H × tan(45° − φ/2), minimum 3m from crest. IRC:SP:48: Setback ≥ H/3 from slope crest. For toe: minimum 2× foundation depth from toe. Additional buffer for seismic zones (Zone IV/V): multiply by 1.5.',
                    installationMethod: '1. Survey slope geometry (height, angle, soil type).\n2. Calculate required setback per IS 14458 and IRC:SP:48.\n3. Mark No-Construction Zone on site and cadastral maps.\n4. Install permanent boundary markers (RCC pillars at 10m c/c).\n5. Register building restriction with District Collector.\n6. Issue notice to existing encroachments.\n7. Provide relocation assistance per NDMA guidelines.',
                    costEstimate: { survey: '₹25,000–₹50,000', boundaryMarkers: '₹2,000/marker', total: '₹50,000–₹1,50,000 (per site)' },
                    lifeSpan: 'Permanent (regulatory measure)',
                    maintenance: 'Annual verification of setback compliance. Update for any slope geometry changes. Re-survey after major rainfall events.',
                    riskReduction: 30,
                    applicability: { minSlope: 15, maxSlope: 90, soils: 'All', rainfall: 'All' },
                    standards: ['IS 14458 Part 1', 'IRC:SP:48', 'NDMA Guidelines 2019']
                },

                relocation: {
                    name: 'Planned Relocation',
                    description: 'Systematic relocation of structures and communities from zones classified as Very High Risk where engineering mitigation is not feasible or economically viable. Last resort measure aligned with NDMA guidelines.',
                    designConcept: 'Criteria for relocation: FoS < 0.8, history of repeated failures, unfeasible mitigation cost (>150% of property value), or ongoing deep-seated movement. Process per NDMA National Guidelines on Landslide Hazard Management (2009).',
                    installationMethod: '1. Conduct comprehensive risk assessment (GSI/NDMA protocol).\n2. Classify area as "No Habitation Zone" through District Disaster Management Authority.\n3. Identify safe relocation sites (slope < 15°, no landslide history).\n4. Prepare DPR for relocation colony (PMAY-G norms).\n5. Provide transit accommodation during construction.\n6. Construct houses per PMAY-G specification.\n7. Restore original site with vegetation (no future construction).\n8. Denotify original land for habitation.',
                    costEstimate: { perFamily: '₹1,30,000–₹1,50,000 (PMAY-G assistance)', sitePreparation: '₹5,00,000–₹15,00,000 per acre', total: 'Depends on number of households' },
                    lifeSpan: 'Permanent',
                    maintenance: 'Social monitoring for 2 years post-relocation. Ensure original site remains no-construction zone. Livelihood support as needed.',
                    riskReduction: 95,
                    applicability: { minSlope: 0, maxSlope: 90, soils: 'All', rainfall: 'High' },
                    standards: ['NDMA Guidelines 2009', 'PMAY-G', 'DM Act 2005']
                }
            }
        }
    };

    // ========================================================================
    // RECOMMENDATION ENGINE
    // ========================================================================

    /**
     * Generate mitigation recommendations based on risk assessment
     * 
     * @param {Object} riskAssessment - Output from RiskClassifier.classifyRisk()
     * @param {Object} analysisResults - Output from GeotechnicalEngine.runComprehensiveAnalysis()
     * @returns {Object} Categorized recommendations with priority and cost estimates
     */
    function recommendMitigation(riskAssessment, analysisResults) {
        const {
            compositeScore = 50,
            classification = {}
        } = riskAssessment;

        const {
            compositeFoS = 1.0,
            slopeAngle = 35,
            effectiveSaturation = 50,
            vegetation = {},
            foundation = {},
            rainfallThreshold = {},
            fieldObservations = {}
        } = analysisResults;

        const recommendations = {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            monitoring: [],
            totalEstimatedCost: { min: 0, max: 0 },
            expectedFoSImprovement: { min: 0, max: 0 },
            expectedRiskReduction: 0,
            priorityOrder: [],
            disclaimer: 'Cost estimates are indicative (2024 rates for Himalayan region). Detailed DPR and site-specific design required before implementation. All structures to be designed and supervised by certified geotechnical engineer.'
        };

        const riskLevel = classification.code || 3;

        // ----------------------------------------------------------------
        // DRAINAGE — recommended for all risk levels
        // ----------------------------------------------------------------
        if (effectiveSaturation > 40 || rainfallThreshold.level >= 1) {
            addRecommendation(recommendations, 'shortTerm',
                MITIGATION_DB.drainage.measures.surface_drains, 'HIGH',
                'High saturation or rainfall threshold approaching');

            if (effectiveSaturation > 60) {
                addRecommendation(recommendations, 'shortTerm',
                    MITIGATION_DB.drainage.measures.horizontal_drains, 'HIGH',
                    'Saturation > 60% — subsurface drainage critical');
            }

            addRecommendation(recommendations, 'shortTerm',
                MITIGATION_DB.drainage.measures.toe_drains, 'MEDIUM',
                'Standard toe drainage to prevent seepage erosion');
        }

        if (fieldObservations.seepage) {
            addRecommendation(recommendations, 'immediate',
                MITIGATION_DB.drainage.measures.catch_drains, 'CRITICAL',
                'Active seepage observed — immediate interceptor drainage needed');
        }

        // ----------------------------------------------------------------
        // STRUCTURAL — for medium to critical risk
        // ----------------------------------------------------------------
        if (riskLevel >= 3) {
            if (slopeAngle >= 35) {
                addRecommendation(recommendations, 'shortTerm',
                    MITIGATION_DB.structural.measures.gabion_walls, 'HIGH',
                    `Slope angle ${slopeAngle}° with moderate risk — toe support needed`);
            }

            if (riskLevel >= 4 && compositeFoS < 1.2) {
                addRecommendation(recommendations, 'immediate',
                    MITIGATION_DB.structural.measures.soil_nailing, 'CRITICAL',
                    `FoS = ${compositeFoS.toFixed(3)} — active stabilization required`);

                if (slopeAngle >= 50) {
                    addRecommendation(recommendations, 'shortTerm',
                        MITIGATION_DB.structural.measures.shotcrete, 'HIGH',
                        'Steep slope — surface protection required');
                }
            }

            if (riskLevel >= 5 && compositeFoS < 0.9) {
                addRecommendation(recommendations, 'immediate',
                    MITIGATION_DB.structural.measures.rcc_walls, 'CRITICAL',
                    'Critical FoS — rigid structural support mandatory');
            }
        }

        if (!foundation.isSetbackSafe && foundation.actualSetback !== undefined) {
            addRecommendation(recommendations, 'immediate',
                MITIGATION_DB.structural.measures.gabion_walls, 'CRITICAL',
                `Structure setback deficit: ${(foundation.effectiveSetback - foundation.actualSetback).toFixed(1)}m below minimum`);
        }

        // ----------------------------------------------------------------
        // BIOENGINEERING — for all risk levels
        // ----------------------------------------------------------------
        const vegPct = vegetation.vegetationPct || 0;

        if (vegPct < 60) {
            addRecommendation(recommendations, 'shortTerm',
                MITIGATION_DB.bioengineering.measures.vetiver_grass, 'HIGH',
                `Vegetation cover ${vegPct}% — contour hedgerows needed`);
        }

        if (vegPct < 40 && slopeAngle <= 50) {
            addRecommendation(recommendations, 'longTerm',
                MITIGATION_DB.bioengineering.measures.native_species, 'MEDIUM',
                'Low vegetation — long-term afforestation recommended');
        }

        if (vegPct < 30) {
            addRecommendation(recommendations, 'shortTerm',
                MITIGATION_DB.bioengineering.measures.coir_geotextile, 'HIGH',
                'Very low vegetation — erosion mat needed for immediate protection');
        }

        if (slopeAngle <= 40 && riskLevel <= 3) {
            addRecommendation(recommendations, 'longTerm',
                MITIGATION_DB.bioengineering.measures.bamboo_crib, 'LOW',
                'Moderate slope — bamboo cribs as sustainable option');
        }

        // ----------------------------------------------------------------
        // LAND MANAGEMENT
        // ----------------------------------------------------------------
        if (slopeAngle >= 40 && compositeFoS < 1.3) {
            addRecommendation(recommendations, 'shortTerm',
                MITIGATION_DB.landManagement.measures.cut_slope_correction, 'HIGH',
                `Steep slope (${slopeAngle}°) with low FoS — re-grading recommended`);
        }

        if (!foundation.isSetbackSafe) {
            addRecommendation(recommendations, 'immediate',
                MITIGATION_DB.landManagement.measures.setback_planning, 'CRITICAL',
                'Setback non-compliance — enforcement required');
        }

        if (riskLevel >= 5 && compositeFoS < 0.8 && fieldObservations.pastLandslides) {
            addRecommendation(recommendations, 'immediate',
                MITIGATION_DB.landManagement.measures.relocation, 'CRITICAL',
                'Critical risk with failure history — relocation may be necessary');
        }

        // ----------------------------------------------------------------
        // MONITORING
        // ----------------------------------------------------------------
        recommendations.monitoring = generateMonitoringPlan(riskLevel, slopeAngle, effectiveSaturation);

        // ----------------------------------------------------------------
        // AGGREGATE ESTIMATES
        // ----------------------------------------------------------------
        calculateAggregates(recommendations);

        // ----------------------------------------------------------------
        // PRIORITY ORDER
        // ----------------------------------------------------------------
        recommendations.priorityOrder = [
            ...recommendations.immediate.map(r => ({ ...r, timeframe: 'Immediate (0–30 days)' })),
            ...recommendations.shortTerm.map(r => ({ ...r, timeframe: 'Short-Term (1–6 months)' })),
            ...recommendations.longTerm.map(r => ({ ...r, timeframe: 'Long-Term (6–24 months)' }))
        ];

        return recommendations;
    }

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    function addRecommendation(rec, timeframe, measure, priority, reason) {
        // Avoid duplicates
        const existing = rec[timeframe].find(r => r.name === measure.name);
        if (existing) {
            if (priorityLevel(priority) > priorityLevel(existing.priority)) {
                existing.priority = priority;
                existing.reason = reason;
            }
            return;
        }

        rec[timeframe].push({
            name: measure.name,
            description: measure.description,
            designConcept: measure.designConcept,
            installationMethod: measure.installationMethod,
            costEstimate: measure.costEstimate,
            lifeSpan: measure.lifeSpan,
            maintenance: measure.maintenance,
            riskReduction: measure.riskReduction,
            standards: measure.standards,
            priority: priority,
            reason: reason
        });
    }

    function priorityLevel(p) {
        return { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 }[p] || 0;
    }

    function generateMonitoringPlan(riskLevel, slopeAngle, saturation) {
        const plan = [];

        plan.push({
            instrument: 'Visual Inspection',
            frequency: riskLevel >= 4 ? 'Weekly during monsoon, Monthly otherwise' : 'Monthly during monsoon, Quarterly otherwise',
            purpose: 'Detect new cracks, seepage points, tilting of structures',
            cost: '₹5,000–₹10,000/visit (trained surveyor)'
        });

        if (riskLevel >= 3) {
            plan.push({
                instrument: 'Surface Survey Markers (Pegs)',
                frequency: 'Monthly readings',
                purpose: 'Track horizontal and vertical displacement of slope surface',
                cost: '₹15,000–₹25,000 initial installation'
            });
        }

        if (riskLevel >= 4) {
            plan.push({
                instrument: 'Inclinometer / Tilt Sensors',
                frequency: 'Continuous/Hourly (IoT-enabled)',
                purpose: 'Detect subsurface movement along failure plane',
                cost: '₹50,000–₹1,50,000 per borehole installation'
            });

            plan.push({
                instrument: 'Piezometer',
                frequency: 'Continuous during monsoon',
                purpose: 'Monitor pore water pressure and water table depth',
                cost: '₹30,000–₹80,000 per installation'
            });
        }

        if (saturation > 60 || riskLevel >= 4) {
            plan.push({
                instrument: 'Rain Gauge (Automatic)',
                frequency: 'Continuous (5-minute intervals)',
                purpose: 'Correlate rainfall intensity–duration with threshold curves',
                cost: '₹10,000–₹30,000 per unit (tipping bucket)'
            });
        }

        return plan;
    }

    function calculateAggregates(rec) {
        let totalRiskReduction = 0;
        let count = 0;

        const allRecs = [...rec.immediate, ...rec.shortTerm, ...rec.longTerm];

        for (const r of allRecs) {
            totalRiskReduction += r.riskReduction;
            count++;
        }

        // Risk reductions don't simply add (diminishing returns)
        // Use: combined = 1 - ∏(1 - rr_i/100)
        let combinedRR = 1;
        for (const r of allRecs) {
            combinedRR *= (1 - r.riskReduction / 100);
        }
        rec.expectedRiskReduction = parseFloat(((1 - combinedRR) * 100).toFixed(1));
    }

    /**
     * Get before/after outcome analysis
     * @param {number} currentFoS 
     * @param {Object} recommendations 
     * @returns {Object}
     */
    function getOutcomeAnalysis(currentFoS, recommendations) {
        const totalRR = recommendations.expectedRiskReduction;

        // FoS improvement estimate based on mitigation type
        let fosImprovement = 0;
        const allRecs = [
            ...recommendations.immediate,
            ...recommendations.shortTerm,
            ...recommendations.longTerm
        ];

        for (const r of allRecs) {
            // Approximate FoS contribution per measure type
            if (r.name.includes('Gabion') || r.name.includes('RCC')) fosImprovement += 0.25;
            else if (r.name.includes('Soil Nailing') || r.name.includes('Rock Bolt')) fosImprovement += 0.3;
            else if (r.name.includes('Drain')) fosImprovement += 0.15;
            else if (r.name.includes('Vetiver') || r.name.includes('Native')) fosImprovement += 0.1;
            else if (r.name.includes('Slope Correction')) fosImprovement += 0.35;
            else if (r.name.includes('Shotcrete')) fosImprovement += 0.1;
            else if (r.name.includes('Coir')) fosImprovement += 0.05;
            else fosImprovement += 0.05;
        }

        // Diminishing returns
        fosImprovement = fosImprovement * 0.7;

        const afterFoS = currentFoS + fosImprovement;
        const beforeProb = fosToFailureProbability(currentFoS);
        const afterProb = fosToFailureProbability(afterFoS);

        return {
            before: {
                fos: parseFloat(currentFoS.toFixed(3)),
                failureProbability: beforeProb,
                riskLabel: currentFoS < 1.0 ? 'CRITICAL' : currentFoS < 1.2 ? 'HIGH' : currentFoS < 1.5 ? 'MEDIUM' : 'LOW'
            },
            after: {
                fos: parseFloat(afterFoS.toFixed(3)),
                fosRange: `${(afterFoS * 0.9).toFixed(2)} – ${(afterFoS * 1.1).toFixed(2)}`,
                failureProbability: afterProb,
                riskLabel: afterFoS < 1.0 ? 'CRITICAL' : afterFoS < 1.2 ? 'HIGH' : afterFoS < 1.5 ? 'MEDIUM' : 'LOW'
            },
            improvement: {
                fosIncrease: parseFloat(fosImprovement.toFixed(3)),
                fosIncreaseRange: `${(fosImprovement * 0.7).toFixed(2)} – ${(fosImprovement * 1.3).toFixed(2)}`,
                probabilityReduction: parseFloat((beforeProb - afterProb).toFixed(3)),
                riskReductionPct: parseFloat(totalRR.toFixed(1))
            },
            note: 'Estimates are based on published performance data and engineering judgment. Actual improvement depends on site-specific conditions, construction quality, and maintenance.',
            disclaimer: 'Final values must be verified through post-construction monitoring and back-analysis.'
        };
    }

    function fosToFailureProbability(fos) {
        if (fos <= 0.5) return 0.99;
        if (fos <= 0.8) return 0.85 + (0.8 - fos) * 0.47;
        if (fos <= 1.0) return 0.50 + (1.0 - fos) * 1.75;
        if (fos <= 1.2) return 0.25 + (1.2 - fos) * 1.25;
        if (fos <= 1.5) return 0.10 + (1.5 - fos) * 0.5;
        if (fos <= 2.0) return 0.02 + (2.0 - fos) * 0.16;
        return 0.01;
    }

    /**
     * Get full mitigation database for reference
     */
    function getMitigationDatabase() {
        return MITIGATION_DB;
    }

    /**
     * Get specific category of measures
     */
    function getCategory(categoryKey) {
        return MITIGATION_DB[categoryKey] || null;
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        recommendMitigation,
        getOutcomeAnalysis,
        getMitigationDatabase,
        getCategory,
        MITIGATION_DB
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MitigationEngine;
}
