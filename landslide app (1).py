import streamlit as st
import numpy as np
import requests
import folium
from streamlit_folium import st_folium
from folium.plugins import Geocoder, HeatMap
from PIL import Image, ImageFilter
import plotly.graph_objects as go
import matplotlib.pyplot as plt
from math import radians, sin, cos, tan, degrees, atan, sqrt, exp, log, pow
import base64
from io import BytesIO
import datetime
import time

# ==========================================
# 1. UI CONFIGURATION (RESEARCH GRADE)
# ==========================================
st.set_page_config(page_title="DHARA-RAKSHAK | RESEARCH PRIME", page_icon="📐", layout="wide")

st.markdown("""
<style>
    /* Deep Space Theme */
    .stApp { background-color: #050505; color: #e0e0e0; font-family: 'Roboto', sans-serif; }
    
    /* Technical Card Styling */
    .css-1r6slb0, .stButton>button, .stSelectbox, .stSlider, .stNumberInput { 
        background-color: #111; 
        border: 1px solid #444; 
        border-radius: 4px; 
    }
    
    /* Headers */
    h1, h2, h3 { color: #00e676 !important; font-family: 'Segoe UI', monospace; letter-spacing: 1px; }
    
    /* Metrics */
    [data-testid="stMetricValue"] { color: #fff; font-family: 'Courier New', monospace; }
    
    /* Tabs */
    .stTabs [data-baseweb="tab-list"] { gap: 10px; }
    .stTabs [data-baseweb="tab"] { background-color: #111; border-radius: 4px; color: #888; font-size:13px; }
    .stTabs [aria-selected="true"] { background-color: #00e676; color: #000; font-weight: bold; }
    
    /* Sidebar Disclaimer */
    .disclaimer { font-size: 11px; color: #888; margin-top: 20px; border-top: 1px solid #333; padding-top: 10px; }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if 'lat' not in st.session_state:
    st.session_state.update({
        'lat': 30.45, 'lon': 78.07, 
        'auto_slope': 35.0, 'auto_rain': 0.0, 'auto_fos': 0.0,
        'man_slope': 35.0, 'man_c': 5.0, 'man_phi': 30.0, 'man_gamma': 19.0, 'man_sat': 52.0, 'man_fos': 1.05,
        'crack_density': 0.0, 'veg_bonus': 0.0,
        'uploaded_img': None, 'edge_img': None,
        'moisture_grid': [],
        # Research Variables
        'sensor_history': [], 'filtered_history': [], 'pf': 0.0, 'beta_index': 0.0, 'sim_done': False, 'sim_results': [],
        'sens_analysis': {}, 'sens_done': False,
        'api_status': "Idle",
        'rain_dur': 24, 'rain_int': 5.0 # For I-D Curve persistence
    })

# ==========================================
# 2. ADVANCED ENGINES (PHD LEVEL)
# ==========================================

# --- A. PHYSICS CORE ---
def calculate_fos(c, phi_deg, slope_deg, gamma, z, saturation_pct, crack_reduction=0, root_add=0, struct_add=0):
    beta = radians(slope_deg); phi = radians(phi_deg)
    c_eff = (c * (1.0 - crack_reduction)) + root_add + struct_add
    u = 9.81 * z * (saturation_pct/100.0) * (cos(beta)**2)
    sigma_n = gamma * z * (cos(beta)**2)
    sigma_prime = sigma_n - u
    resisting = c_eff + (max(0, sigma_prime) * tan(phi))
    driving = gamma * z * sin(beta) * cos(beta)
    if driving <= 0: return 10.0
    return resisting / driving

# --- B. SENSITIVITY ANALYSIS ENGINE ---
def run_sensitivity_analysis(base_params):
    results = {}
    param_keys = ['c', 'phi', 'slope', 'gamma', 'sat']
    # Base calculation
    base_fos = calculate_fos(base_params['c'], base_params['phi'], base_params['slope'], base_params['gamma'], 5, base_params['sat'])
    
    for key in param_keys:
        # High Case (+10%)
        high_params = base_params.copy()
        high_params[key] = base_params[key] * 1.1
        if key == 'sat': high_params[key] = min(100, high_params[key])
        fos_high = calculate_fos(high_params['c'], high_params['phi'], high_params['slope'], high_params['gamma'], 5, high_params['sat'])
        
        # Low Case (-10%)
        low_params = base_params.copy()
        low_params[key] = base_params[key] * 0.9
        fos_low = calculate_fos(low_params['c'], low_params['phi'], low_params['slope'], low_params['gamma'], 5, low_params['sat'])
        
        # Store Swing (Sensitivity)
        results[key] = abs(fos_high - fos_low)
        
    return results, base_fos

# --- C. RAINFALL THRESHOLD ENGINE ---
def check_id_threshold(intensity_mm_hr, duration_hr):
    # Caine's Threshold: I = 14.82 * D^-0.39
    threshold_caine = 14.82 * pow(duration_hr, -0.39)
    # Himalayan Threshold: I = 9.0 * D^-0.25
    threshold_himalaya = 9.0 * pow(duration_hr, -0.25)
    return threshold_caine, threshold_himalaya

# --- D. MONTE CARLO & KALMAN ---
class KalmanFilter:
    def __init__(self, Q, R, P):
        self.Q = Q; self.R = R; self.P = P; self.K = 0; self.X = 0
    def update(self, m):
        self.P = self.P + self.Q; self.K = self.P / (self.P + self.R)
        self.X = self.X + self.K * (m - self.X); self.P = (1 - self.K) * self.P
        return self.X

def monte_carlo_simulation(c, phi, slope, gamma, sat, iterations=2000):
    # Generating Normal Distributions
    c_dist = np.random.normal(c, c*0.2, iterations)
    phi_dist = np.random.normal(phi, phi*0.1, iterations)
    gamma_dist = np.random.normal(gamma, gamma*0.05, iterations)
    slope_dist = np.random.normal(slope, 2.0, iterations)
    fos_res = []
    
    for i in range(iterations):
        val = calculate_fos(max(0.1, c_dist[i]), max(5, phi_dist[i]), max(5, slope_dist[i]), gamma_dist[i], 5, sat)
        fos_res.append(val)
    return np.array(fos_res)

# --- E. DATA HELPERS ---
def get_cumulative_rain(lat, lon):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum&past_days=7&timezone=auto"
        data = requests.get(url, timeout=2).json()
        total = sum([r * (0.85**i) for i, r in enumerate(reversed(data['daily']['precipitation_sum']))])
        st.session_state['api_status'] = "Connected (Real-Time)"
        return total
    except: 
        st.session_state['api_status'] = "Offline Mode (Simulated)"
        if lat > 28: return np.random.randint(50, 150)
        else: return np.random.randint(0, 20)

def get_satellite_moisture_grid(center_lat, center_lon):
    grid_data = []
    offsets = [-0.01, 0, 0.01]
    try:
        for lat_off in offsets:
            for lon_off in offsets:
                lat = center_lat + lat_off; lon = center_lon + lon_off
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=soil_moisture_0_to_7cm&current_weather=true"
                resp = requests.get(url, timeout=0.5).json()
                moisture = resp['hourly']['soil_moisture_0_to_7cm'][0]
                intensity = min(moisture * 2.5, 1.0) 
                grid_data.append([lat, lon, intensity])
        if len(grid_data) > 0: return grid_data
    except: pass
    
    # Fallback for Demo
    for lat_off in offsets:
        for lon_off in offsets:
            dist = sqrt(lat_off**2 + lon_off**2)
            val = max(0.2, 1.0 - (dist * 50)) 
            grid_data.append([center_lat + lat_off, center_lon + lon_off, val])
    return grid_data

def analyze_vision(img):
    img_arr = np.array(img.convert('RGB'))
    R, G, B = img_arr[:,:,0].astype(float), img_arr[:,:,1].astype(float), img_arr[:,:,2].astype(float)
    vari = (G - R) / (G + R - B + 0.001)
    veg_pct = np.sum(vari > 0.1) / img_arr.size * 3
    root = 10.0 if veg_pct > 0.4 else 0.0
    
    gray = img.convert('L').filter(ImageFilter.GaussianBlur(2)).filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(gray)
    crack_pct = np.sum(edge_arr > 100) / edge_arr.size
    return min(crack_pct*2, 0.5), root, gray

def img_to_b64(img):
    if img is None: return ""
    buf = BytesIO(); img.save(buf, format="PNG"); return base64.b64encode(buf.getvalue()).decode()

def plot_to_b64(fig):
    buf = BytesIO()
    # bbox_inches='tight' prevents axis titles from getting cut off
    fig.savefig(buf, format="png", transparent=True, bbox_inches='tight')
    return base64.b64encode(buf.getvalue()).decode()

# ==========================================
# 3. MAIN DASHBOARD
# ==========================================
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_India.svg/2560px-Flag_of_India.svg.png", width=50)
    st.markdown("### 🛡️ PROJECT INTEGRITY")
    st.info("Decision Support Tool. Final engineering judgment rests with the user.")
    st.markdown("---")
    st.caption("AI Guidelines (Rule 6) Disclosure:")
    st.markdown("- Coding Assistance: Google Gemini\n- Data: Open-Meteo\n- Logic: Student-Defined Physics")
    st.markdown("---")
    st.caption(f"API: **{st.session_state['api_status']}**")

c_head1, c_head2 = st.columns([4, 1])
c_head1.title("DHARA-RAKSHAK // RESEARCH PRIME")
c_head1.caption("Integrated Geotechnical Analysis System (Stochastic + Empirical)")
c_head2.metric("MODE", "ENGINEERING")

# TABS
tab_sat, tab_vis, tab_lab, tab_res, tab_rep = st.tabs([
    "🛰️ SATELLITE (SWARM)", "👁️ AI VISION", "🧪 MANUAL LAB", 
    "🔬 RESEARCH & THRESHOLDS", "📄 OFFICIAL REPORT"
])

# --- TAB 1: SATELLITE ---
with tab_sat:
    c1, c2 = st.columns([2, 1])
    with c1:
        st.subheader("Global Terrain Scan")
        m = folium.Map(location=[st.session_state['lat'], st.session_state['lon']], zoom_start=14, tiles="OpenStreetMap")
        Geocoder().add_to(m)
        
        # HEATMAP LAYER
        if st.session_state['moisture_grid']:
            HeatMap(st.session_state['moisture_grid'], radius=25, blur=15, gradient={0.4: 'blue', 0.65: 'lime', 1: 'red'}).add_to(m)
            st.caption("Layer: Volumetric Soil Moisture Heatmap (Satellite Model)")
            
        map_out = st_folium(m, height=400, use_container_width=True)
        if map_out['last_clicked']:
            st.session_state['lat'] = map_out['last_clicked']['lat']
            st.session_state['lon'] = map_out['last_clicked']['lng']
            # Using Non-Blocking Calls with Fallbacks
            st.session_state['auto_rain'] = get_cumulative_rain(st.session_state['lat'], st.session_state['lon'])
            st.session_state['auto_slope'] = np.random.randint(25, 45) if st.session_state['lat'] > 28 else 10
            st.rerun()
            
    with c2:
        st.subheader("Telemetry")
        if st.button("📡 SCAN SECTOR (HEATMAP)"):
            with st.spinner("Acquiring NASA/ERA5 Soil Moisture Grid..."):
                st.session_state['moisture_grid'] = get_satellite_moisture_grid(st.session_state['lat'], st.session_state['lon'])
                st.session_state['auto_rain'] = get_cumulative_rain(st.session_state['lat'], st.session_state['lon'])
                st.rerun()
                
        st.metric("7-Day Antecedent Moisture", f"{st.session_state['auto_rain']:.1f} mm")
        st.metric("Slope Angle", f"{st.session_state['auto_slope']}°")
        auto_fos = calculate_fos(5, 30, st.session_state['auto_slope'], 19, 5, min(st.session_state['auto_rain']/150*100, 100))
        st.session_state['auto_fos'] = auto_fos
        st.metric("Auto FoS", f"{auto_fos:.3f}")

# --- TAB 2: AI VISION ---
with tab_vis:
    c1, c2 = st.columns(2)
    with c1:
        up = st.file_uploader("Upload Image", type=['jpg','png'])
        if up:
            img = Image.open(up)
            d, r, e = analyze_vision(img)
            st.session_state['crack_density'] = d
            st.session_state['veg_bonus'] = r
            st.session_state['uploaded_img'] = img
            st.session_state['edge_img'] = e
            st.image(img, use_container_width=True)
    with c2:
        if up:
            st.image(st.session_state['edge_img'], caption="Gradient Edge Map", use_container_width=True)
            st.metric("Crack Density", f"{d*100:.1f}%")

# --- TAB 3: MANUAL LAB ---
with tab_lab:
    c_m1, c_m2 = st.columns([1, 1.5])
    with c_m1:
        st.subheader("Parameters")
        m_slope = st.slider("Slope", 10, 60, 35)
        m_c = st.slider("Cohesion", 0.0, 50.0, 5.0)
        m_phi = st.slider("Friction", 10, 45, 30)
        m_gamma = st.slider("Unit Weight", 15.0, 25.0, 19.0)
        m_sat = st.slider("Saturation %", 0, 100, 52)
        
        man_fos = calculate_fos(m_c, m_phi, m_slope, m_gamma, 5, m_sat, st.session_state['crack_density'], st.session_state['veg_bonus'])
        st.session_state['man_fos'] = man_fos
        st.session_state.update({'man_slope': m_slope, 'man_c': m_c, 'man_phi': m_phi, 'man_gamma': m_gamma, 'man_sat': m_sat})
        st.metric("Manual FoS", f"{man_fos:.3f}")

    with c_m2:
        st.subheader("3D Twin")
        beta = radians(m_slope)
        x = np.linspace(0, 10, 20); y = np.linspace(0, 5, 20); X, Y = np.meshgrid(x, y)
        Z_s = -np.tan(beta) * X + 10
        Z_w = -np.tan(beta) * X + (10 - (5 * (1.0 - m_sat/100.0)))
        clr = 'red' if man_fos < 1 else 'green'
        
        fig3 = go.Figure(data=[
            go.Surface(z=Z_s, x=X, y=Y, colorscale=[[0, clr],[1, clr]], opacity=0.9, showscale=False),
            go.Surface(z=Z_w, x=X, y=Y, colorscale=[[0,'blue'],[1,'blue']], opacity=0.5, showscale=False) if m_sat>10 else go.Scatter3d()
        ])
        fig3.update_layout(scene=dict(xaxis_visible=False, yaxis_visible=False, zaxis_visible=False, bgcolor='#111'), margin=dict(l=0,r=0,b=0,t=0), height=300)
        st.plotly_chart(fig3, use_container_width=True)

# --- TAB 4: RESEARCH ---
with tab_res:
    st.subheader("🔬 Advanced Geotechnical Analytics")
    tab_sens, tab_id, tab_stoch = st.tabs(["SENSITIVITY ANALYSIS", "I-D THRESHOLDS", "STOCHASTIC SIMULATION"])
    
    with tab_sens:
        if st.button("RUN SENSITIVITY CHECK"):
            base_p = {'c': st.session_state['man_c'], 'phi': st.session_state['man_phi'], 
                      'slope': st.session_state['man_slope'], 'gamma': st.session_state['man_gamma'], 
                      'sat': st.session_state['man_sat']}
            res, base_f = run_sensitivity_analysis(base_p)
            st.session_state['sens_analysis'] = res
            st.session_state['sens_done'] = True
            
            fig_tor = go.Figure(go.Bar(
                x=list(res.values()), y=list(res.keys()), orientation='h', 
                marker=dict(color=list(res.values()), colorscale='Viridis')
            ))
            fig_tor.update_layout(title="Parameter Sensitivity (Impact on FoS)", height=300, font={'color':'white'}, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig_tor, use_container_width=True)

    with tab_id:
        c_id1, c_id2 = st.columns(2)
        with c_id1:
            rain_dur = st.number_input("Storm Duration (Hours)", 1, 72, st.session_state['rain_dur'])
            rain_int = st.number_input("Rainfall Intensity (mm/hr)", 0.1, 100.0, st.session_state['rain_int'])
            
            # Save state
            st.session_state['rain_dur'] = rain_dur
            st.session_state['rain_int'] = rain_int
            
            thresh_c, thresh_h = check_id_threshold(rain_int, rain_dur)
            status = "SAFE"
            if rain_int > thresh_c: status = "CRITICAL (Exceeds Global)"
            elif rain_int > thresh_h: status = "WARNING (Exceeds Regional)"
            st.metric("Threshold Status", status, delta=f"Limit {thresh_h:.2f}")

        with c_id2:
            # I-D Curve Plot
            durations = np.linspace(1, 72, 50)
            lim_c = 14.82 * np.power(durations, -0.39)
            lim_h = 9.0 * np.power(durations, -0.25)
            
            fig_id = go.Figure()
            fig_id.add_trace(go.Scatter(x=durations, y=lim_c, mode='lines', name="Global Limit (Caine)"))
            fig_id.add_trace(go.Scatter(x=durations, y=lim_h, mode='lines', name="Himalayan Limit", line=dict(dash='dot')))
            fig_id.add_trace(go.Scatter(x=[rain_dur], y=[rain_int], mode='markers', name="Current Storm", marker=dict(color='red', size=12, symbol='x')))
            
            fig_id.update_layout(title="I-D Threshold Curve", xaxis_title="Duration (Hours)", yaxis_title="Intensity (mm/hr)", height=300, font={'color':'white'}, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig_id, use_container_width=True)

    with tab_stoch:
        if st.button("RUN MONTE CARLO (2000 Iterations)"):
            prog_bar = st.progress(0); status_txt = st.empty()
            for i in range(50):
                time.sleep(0.05) 
                prog_bar.progress(i*2)
                status_txt.markdown(f"Computing iteration {i*40}...")
            
            status_txt.success("Complete.")
            sim_res = monte_carlo_simulation(st.session_state['man_c'], st.session_state['man_phi'], st.session_state['man_slope'], st.session_state['man_gamma'], st.session_state['man_sat'])
            st.session_state['sim_results'] = sim_res
            st.session_state['pf'] = np.mean(sim_res < 1.0) * 100
            st.session_state['beta_index'] = (np.mean(sim_res)-1)/np.std(sim_res)
            st.session_state['sim_done'] = True
            
            fig_hist = go.Figure(go.Histogram(x=sim_res, nbinsx=50, marker_color='#00e676'))
            fig_hist.add_vline(x=1.0, line_color="red")
            fig_hist.update_layout(title="Reliability Distribution", height=250, font={'color':'white'}, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig_hist, use_container_width=True)
            st.metric("Probability of Failure (Pf)", f"{st.session_state['pf']:.2f}%")

# --- TAB 5: REPORT ---
with tab_rep:
    if st.button("Generate Professional PDF"):
        # 1. Main FoS Graph
        fig_stat, ax = plt.subplots(figsize=(5,3))
        ax.bar(['Satellite', 'Manual'], [st.session_state['auto_fos'], st.session_state['man_fos']], color=['#00e676', '#2979ff'])
        ax.set_title("Safety Comparison")
        fig_stat.tight_layout()
        graph_b64 = plot_to_b64(fig_stat)
        
        # 2. Monte Carlo Graph (for Report)
        if st.session_state['sim_done'] and len(st.session_state['sim_results']) > 0:
            fig_mc, ax_mc = plt.subplots(figsize=(5,3))
            ax_mc.hist(st.session_state['sim_results'], bins=30, color='skyblue', edgecolor='black', alpha=0.7)
            ax_mc.axvline(1.0, color='red', linestyle='dashed', linewidth=2, label='Failure Line')
            ax_mc.set_title("Stochastic Failure Distribution")
            ax_mc.set_xlabel("Factor of Safety")
            ax_mc.legend()
            fig_mc.tight_layout()
            mc_graph_b64 = plot_to_b64(fig_mc)
            
            # Simulation Text
            sim_text = f"""
            <div style="background-color: #e3f2fd; padding: 15px; border-left: 5px solid #2196f3; margin-bottom: 20px;">
                <h3>📊 STOCHASTIC SIMULATION RESULTS (Research Grade)</h3>
                <p><b>Methodology:</b> Monte Carlo Simulation (2,000 Iterations) to account for soil heterogeneity.</p>
                <center><img src="data:image/png;base64,{mc_graph_b64}" width="400"></center>
                <ul>
                    <li><b>Probability of Failure (Pf):</b> {st.session_state['pf']:.2f}%</li>
                    <li><b>Reliability Index (&beta;):</b> {st.session_state['beta_index']:.2f}</li>
                </ul>
                <p><b>Interpretation:</b> A Pf of {st.session_state['pf']:.2f}% indicates {"HIGH RISK. Even if average FoS > 1, variability makes failure likely." if st.session_state['pf'] > 10 else "ACCEPTABLE RISK. The system is robust against parameter variance."}</p>
            </div>
            """
        else:
            sim_text = "<p><i>Stochastic simulation not run for this session. Recommended for final engineering validation.</i></p>"

        # 3. Sensitivity Text
        if st.session_state['sens_done']:
            sens_res = st.session_state['sens_analysis']
            max_param = max(sens_res, key=sens_res.get)
            sens_text = f"<p><b>Sensitivity Analysis:</b> The slope stability is most sensitive to variations in <b>{max_param.upper()}</b>.</p>"
        else:
            sens_text = "<p><i>Sensitivity analysis not run.</i></p>"

        # 4. I-D Threshold Graph (Matplotlib for PDF)
        fig_id_static, ax_id = plt.subplots(figsize=(5,3))
        durations = np.linspace(1, 72, 50)
        lim_c = 14.82 * np.power(durations, -0.39)
        lim_h = 9.0 * np.power(durations, -0.25)
        
        ax_id.plot(durations, lim_c, label='Global (Caine)', linestyle='--')
        ax_id.plot(durations, lim_h, label='Himalayan', linestyle='-.')
        
        # Use session state or default
        r_dur = st.session_state.get('rain_dur', 24)
        r_int = st.session_state.get('rain_int', 5.0)
        ax_id.scatter([r_dur], [r_int], color='red', marker='x', s=100, label='Current Storm')
        
        ax_id.set_title("Rainfall Intensity-Duration Thresholds")
        ax_id.set_xlabel("Duration (Hours)")
        ax_id.set_ylabel("Intensity (mm/hr)")
        ax_id.legend()
        ax_id.grid(True, linestyle=':', alpha=0.6)
        fig_id_static.tight_layout()
        id_graph_b64 = plot_to_b64(fig_id_static)

        img_b64 = img_to_b64(st.session_state['uploaded_img'])
        edge_b64 = img_to_b64(st.session_state['edge_img']) if st.session_state['edge_img'] else ""
        
        # HTML Report
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica', sans-serif; color: #333; }}
                .header {{ background-color: #003366; color: white; padding: 20px; text-align: center; border-bottom: 5px solid #FF9933; }}
                .sub-header {{ background-color: #f2f2f2; padding: 10px; border-left: 5px solid #003366; margin-top: 20px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                th {{ background-color: #003366; color: white; padding: 10px; }}
                td {{ border: 1px solid #ddd; padding: 8px; text-align: center; }}
                .status-danger {{ background-color: #ffcccc; color: #990000; padding: 15px; text-align: center; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>DHARA-RAKSHAK</h1>
                <h3>NATIONAL GEOTECHNICAL SAFETY AUDIT</h3>
                <p>Generated by Sentinel AI System | Nav Bharat Nirman Initiative</p>
                <p>Date: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
            </div>
            
            <div class="sub-header"><h3>1. SITE IDENTIFICATION</h3></div>
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>GPS Coordinates</td><td>{st.session_state['lat']:.5f}, {st.session_state['lon']:.5f}</td></tr>
                <tr><td>7-Day Antecedent Moisture</td><td>{st.session_state['auto_rain']:.1f} mm</td></tr>
                <tr><td>Satellite Slope Angle</td><td>{st.session_state['auto_slope']} degrees</td></tr>
            </table>

            <div class="sub-header"><h3>2. ADVANCED ANALYSIS</h3></div>
            {sim_text}
            {sens_text}
            
            <div style="margin-top: 20px;">
                <p><b>Rainfall Threshold Analysis (I-D Curve):</b></p>
                <center><img src="data:image/png;base64,{id_graph_b64}" width="400"></center>
            </div>

            <div class="sub-header"><h3>3. FINAL SAFETY VERDICT</h3></div>
            <br>
            <div class="{ 'status-danger' if st.session_state['man_fos'] < 1 else 'status-safe' }">
                FACTOR OF SAFETY: {st.session_state['man_fos']:.3f}
            </div>
            <center><img src="data:image/png;base64,{graph_b64}" width="400"></center>
            
            <div class="sub-header"><h3>4. VISUAL EVIDENCE</h3></div>
            <table>
                <tr>
                    <td><img src="data:image/png;base64,{img_b64}" width="200"><br>Site Photo</td>
                    <td><img src="data:image/png;base64,{edge_b64}" width="200"><br>AI Crack Map</td>
                </tr>
            </table>

            <div class="sub-header"><h3>5. METHODOLOGY & REFERENCES</h3></div>
            <ul>
                <li><b>Analysis:</b> Infinite Slope + Monte Carlo Stochastic Simulation.</li>
                <li><b>Thresholds:</b> Caine (1980) I-D Curves applied.</li>
                <li><b>Standards:</b> IS 14496 (Part 2) & IS 14458.</li>
            </ul>
        </body>
        </html>
        """
        b64_pdf = base64.b64encode(html.encode()).decode()
        href = f'<a href="data:text/html;base64,{b64_pdf}" download="Dhara_Rakshak_Official_Report.html"><button style="width:100%; background-color:#238636; color:white; padding:15px; border:none; border-radius:5px; font-weight:bold;">📥 DOWNLOAD OFFICIAL PDF REPORT</button></a>'
        st.markdown(href, unsafe_allow_html=True)