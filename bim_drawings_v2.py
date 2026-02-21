"""
Professional Architectural BIM Drawings - V2
4 A4 pages | Multi-view (Isometric + Top + Front) | 300 DPI
Improved 3D quality, shading, depth, detail
"""
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Arc, FancyBboxPatch, Polygon
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.backends.backend_pdf import PdfPages
import os

OUT_DIR = r"C:\Users\HP\OneDrive\Desktop\GEOMATICS LAB 2\draw\BIM"
os.makedirs(OUT_DIR, exist_ok=True)
PDF_PATH = os.path.join(OUT_DIR, "BIM_Architectural_Drawings_V2.pdf")

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'DejaVu Sans'],
    'font.size': 6.5,
    'axes.linewidth': 0.3,
})

# -- Palette --
C = dict(
    wall='#D4C5A9', wall_dk='#B8A88A', wall_lt='#E2D8C4', wall_edge='#3D3D3D',
    floor='#E8DCC8', floor_tile='#D2C4A8', floor_dk='#C4B498',
    roof='#8B4513', roof_lt='#A0522D', roof_dk='#6B3410',
    window='#87CEEB', win_frame='#555555', win_glass='#AED8F0',
    door='#654321', door_lt='#8B6914', door_frame='#4A3015',
    grass='#7CBA5A', grass_dk='#5A9A3A',
    concrete='#BFBFBF', concrete_dk='#A0A0A0',
    counter='#D9D0C1', cab_up='#E8DED0', cab_lo='#C8B898', cab_dk='#A89878',
    steel='#A8A8A8', sink='#D0D0D0', stove='#2D2D2D', fridge='#E0E0E0',
    balcony='#C9B99A', stair='#C4B594', stair_dk='#A89574',
    porch='#CFBFA0', terrace='#B0B0B0', glass='#C6E2FF',
    text='#1A1A1A', dim='#333333', title_bg='#1A2A3A', border='#1A1A1A',
    grid='#E0E0E0', sky_top='#B8D4F0', sky_bot='#E8F0F8',
)

# ============================================================
#  CORE HELPERS
# ============================================================

def add_title_block(fig, title, sheet_no):
    """Professional title block with student info."""
    # Main title bar
    ax = fig.add_axes([0.03, 0.015, 0.94, 0.062])
    ax.set_xlim(0, 100); ax.set_ylim(0, 12)
    ax.add_patch(Rectangle((0, 0), 100, 12, fc=C['title_bg'], ec='none'))
    # Divider lines
    ax.plot([0, 100], [6, 6], color='#3A5A7A', lw=0.4)
    ax.plot([55, 55], [0, 12], color='#3A5A7A', lw=0.4)
    ax.plot([78, 78], [0, 12], color='#3A5A7A', lw=0.4)
    # Title
    ax.text(1.5, 9, title, fontsize=8, fontweight='bold', color='white', va='center')
    ax.text(1.5, 3, "Residential BIM Project  |  Revit Standard", fontsize=5, color='#AAAAAA', va='center')
    # Student info
    ax.text(56, 9.5, "Prepared by: KARN AGARWAL", fontsize=5.5, fontweight='bold', color='#E0E0E0', va='center')
    ax.text(56, 7, "Roll No: 2301296", fontsize=5, color='#CCCCCC', va='center')
    ax.text(56, 3.5, "Dept. of Civil Engineering", fontsize=4.8, color='#BBBBBB', va='center')
    ax.text(56, 1.5, "Dayalbagh University, Agra", fontsize=4.8, color='#BBBBBB', va='center')
    # Sheet info
    ax.text(88, 9.5, f"Sheet {sheet_no} / 4", fontsize=7, fontweight='bold', color='white', va='center', ha='center')
    ax.text(88, 6.5, "A4 (210 x 297)", fontsize=4.5, color='#AAAAAA', va='center', ha='center')
    ax.text(88, 3.5, "Scale: NTS", fontsize=4.5, color='#AAAAAA', va='center', ha='center')
    ax.text(88, 1.5, "DPI: 300", fontsize=4.5, color='#AAAAAA', va='center', ha='center')
    ax.axis('off')
    # Border
    bdr = fig.add_axes([0.02, 0.01, 0.96, 0.975])
    bdr.set_xlim(0, 1); bdr.set_ylim(0, 1)
    bdr.add_patch(Rectangle((0, 0), 1, 1, fill=False, ec=C['border'], lw=1.2))
    bdr.axis('off')


def box3d(ax, x, y, z, dx, dy, dz, color, alpha=1.0, ec='#444', lw=0.25):
    """Draw a 3D box with face-based shading for depth."""
    import matplotlib.colors as mc
    import colorsys
    try:
        rgb = mc.to_rgb(color)
        h, l, s = colorsys.rgb_to_hls(*rgb)
    except:
        rgb = mc.to_rgb('#CCCCCC')
        h, l, s = colorsys.rgb_to_hls(*rgb)

    # Shade faces: top lighter, sides darker
    top_c   = colorsys.hls_to_rgb(h, min(1, l * 1.12), s)
    front_c = colorsys.hls_to_rgb(h, l * 0.92, s)
    side_c  = colorsys.hls_to_rgb(h, l * 0.82, s)
    bot_c   = colorsys.hls_to_rgb(h, l * 0.75, s)

    faces = [
        ([[x,y,z],[x+dx,y,z],[x+dx,y+dy,z],[x,y+dy,z]], bot_c),          # bottom
        ([[x,y,z+dz],[x+dx,y,z+dz],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]], top_c),  # top
        ([[x,y,z],[x+dx,y,z],[x+dx,y,z+dz],[x,y,z+dz]], front_c),        # front
        ([[x,y+dy,z],[x+dx,y+dy,z],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]], side_c), # back
        ([[x,y,z],[x,y+dy,z],[x,y+dy,z+dz],[x,y,z+dz]], side_c),         # left
        ([[x+dx,y,z],[x+dx,y+dy,z],[x+dx,y+dy,z+dz],[x+dx,y,z+dz]], front_c),# right
    ]
    for verts, fc in faces:
        p = Poly3DCollection([verts], alpha=alpha, facecolor=fc, edgecolor=ec, linewidths=lw)
        ax.add_collection3d(p)


def window3d(ax, x, y, z, face='x', w=1.2, h=1.0):
    """Glass window with frame and mullion."""
    if face == 'x':
        outer = [[x, y, z], [x, y+w, z], [x, y+w, z+h], [x, y, z+h]]
        mid_v = [[x, y+w/2-0.015, z], [x, y+w/2+0.015, z], [x, y+w/2+0.015, z+h], [x, y+w/2-0.015, z+h]]
        mid_h = [[x, y, z+h/2-0.015], [x, y+w, z+h/2-0.015], [x, y+w, z+h/2+0.015], [x, y, z+h/2+0.015]]
    else:
        outer = [[x, y, z], [x+w, y, z], [x+w, y, z+h], [x, y, z+h]]
        mid_v = [[x+w/2-0.015, y, z], [x+w/2+0.015, y, z], [x+w/2+0.015, y, z+h], [x+w/2-0.015, y, z+h]]
        mid_h = [[x, y, z+h/2-0.015], [x+w, y, z+h/2-0.015], [x+w, y, z+h/2+0.015], [x, y, z+h/2+0.015]]
    # Glass
    ax.add_collection3d(Poly3DCollection([outer], alpha=0.30, facecolor=C['win_glass'], edgecolor=C['win_frame'], linewidths=0.6))
    # Mullions
    ax.add_collection3d(Poly3DCollection([mid_v], alpha=0.9, facecolor=C['win_frame'], edgecolor=C['win_frame'], linewidths=0.15))
    ax.add_collection3d(Poly3DCollection([mid_h], alpha=0.9, facecolor=C['win_frame'], edgecolor=C['win_frame'], linewidths=0.15))


def door3d(ax, x, y, z, face='x', w=1.0, h=2.1, color=None):
    """Door with panel detail."""
    col = color or C['door']
    if face == 'x':
        verts = [[x, y, z], [x, y+w, z], [x, y+w, z+h], [x, y, z+h]]
        # Panel inset
        p1 = [[x, y+0.08, z+0.1], [x, y+w-0.08, z+0.1], [x, y+w-0.08, z+h*0.45], [x, y+0.08, z+h*0.45]]
        p2 = [[x, y+0.08, z+h*0.50], [x, y+w-0.08, z+h*0.50], [x, y+w-0.08, z+h-0.1], [x, y+0.08, z+h-0.1]]
    else:
        verts = [[x, y, z], [x+w, y, z], [x+w, y, z+h], [x, y, z+h]]
        p1 = [[x+0.08, y, z+0.1], [x+w-0.08, y, z+0.1], [x+w-0.08, y, z+h*0.45], [x+0.08, y, z+h*0.45]]
        p2 = [[x+0.08, y, z+h*0.50], [x+w-0.08, y, z+h*0.50], [x+w-0.08, y, z+h-0.1], [x+0.08, y, z+h-0.1]]
    ax.add_collection3d(Poly3DCollection([verts], alpha=0.92, facecolor=col, edgecolor=C['door_frame'], linewidths=0.5))
    # Panels (lighter insets)
    import matplotlib.colors as mc
    import colorsys
    rgb = mc.to_rgb(col)
    h_, l_, s_ = colorsys.rgb_to_hls(*rgb)
    panel_c = colorsys.hls_to_rgb(h_, min(1, l_*1.15), s_)
    ax.add_collection3d(Poly3DCollection([p1], alpha=0.85, facecolor=panel_c, edgecolor=col, linewidths=0.2))
    ax.add_collection3d(Poly3DCollection([p2], alpha=0.85, facecolor=panel_c, edgecolor=col, linewidths=0.2))


def roof_gable(ax, x, y, z, dx, dy, overhang=0.6, ridge_h=2.0):
    xo, yo = x - overhang, y - overhang
    dxo, dyo = dx + 2*overhang, dy + 2*overhang
    mid = x + dx / 2
    faces = [
        ([[xo, yo, z], [mid, yo, z+ridge_h], [mid, yo+dyo, z+ridge_h], [xo, yo+dyo, z]], C['roof']),
        ([[xo+dxo, yo, z], [mid, yo, z+ridge_h], [mid, yo+dyo, z+ridge_h], [xo+dxo, yo+dyo, z]], C['roof_lt']),
        ([[xo, yo, z], [xo+dxo, yo, z], [mid, yo, z+ridge_h]], C['roof_dk']),
        ([[xo, yo+dyo, z], [xo+dxo, yo+dyo, z], [mid, yo+dyo, z+ridge_h]], C['roof']),
    ]
    for v, c in faces:
        ax.add_collection3d(Poly3DCollection([v], alpha=0.92, facecolor=c, edgecolor='#4A2810', linewidths=0.4))
    # Ridge line
    ax.plot([mid, mid], [yo, yo+dyo], [z+ridge_h, z+ridge_h], color='#3A1808', lw=0.6)


def flat_roof(ax, x, y, z, dx, dy, thickness=0.15):
    box3d(ax, x-0.15, y-0.15, z, dx+0.3, dy+0.3, thickness, C['terrace'], ec='#888')


def setup_iso(ax, elev=28, azim=-50, aspect=None):
    ax.set_axis_off()
    ax.view_init(elev=elev, azim=azim)
    ax.set_box_aspect(aspect or [1, 1, 0.55])
    ax.computed_zorder = False


def setup_top(ax):
    ax.set_axis_off()
    ax.view_init(elev=90, azim=-90)
    ax.set_box_aspect([1, 1, 0.01])
    ax.computed_zorder = False


def setup_front(ax):
    ax.set_axis_off()
    ax.view_init(elev=0, azim=0)
    ax.set_box_aspect([1, 0.01, 0.55])
    ax.computed_zorder = False


def dim_line(ax, x1, y1, x2, y2, label, offset=0.5, fs=5):
    mx, my = (x1+x2)/2, (y1+y2)/2
    if abs(y1-y2) < 0.01:
        ax.annotate('', xy=(x1, y1-offset), xytext=(x2, y2-offset),
                     arrowprops=dict(arrowstyle='<->', color=C['dim'], lw=0.4))
        ax.text(mx, y1-offset-0.25, label, fontsize=fs, ha='center', va='top', color=C['dim'])
    else:
        ax.annotate('', xy=(x1-offset, y1), xytext=(x2-offset, y2),
                     arrowprops=dict(arrowstyle='<->', color=C['dim'], lw=0.4))
        ax.text(x1-offset-0.25, my, label, fontsize=fs, ha='right', va='center', color=C['dim'], rotation=90)


def add_view_label(ax, text, pos='top'):
    """Small label for sub-views."""
    ax.set_title(text, fontsize=6.5, fontweight='bold', color=C['text'], pad=2,
                 bbox=dict(boxstyle='round,pad=0.2', fc='#F0F0F0', ec='#CCCCCC', lw=0.4))


# ============================================================
#  SHARED 3D BUILDING FUNCTIONS
# ============================================================

def build_hall_3d(ax, show_ceiling=True):
    """Build the Hall room in 3D on given axes."""
    Lx, Ly, Lz = 6, 8, 3.2
    wt = 0.23

    # Floor slab
    box3d(ax, -0.1, -0.1, -0.18, Lx+0.2, Ly+0.2, 0.18, C['concrete'], ec='#999')
    # Floor finish
    box3d(ax, 0, 0, -0.01, Lx, Ly, 0.01, C['floor_tile'], ec='#BBB', alpha=0.9)
    # Tile pattern
    for i in range(12):
        for j in range(16):
            col = '#E2D5BF' if (i+j)%2==0 else '#D0C0A0'
            v = [[[i*0.5, j*0.5, 0.005],[i*0.5+0.48, j*0.5, 0.005],
                  [i*0.5+0.48, j*0.5+0.48, 0.005],[i*0.5, j*0.5+0.48, 0.005]]]
            ax.add_collection3d(Poly3DCollection(v, alpha=0.5, facecolor=col, edgecolor='#CCC', lw=0.05))

    # WALLS - Left (full)
    box3d(ax, 0, 0, 0, wt, Ly, Lz, C['wall'])
    # Left window cut: y=3.2..4.5
    # Actually build left wall as segments around window
    # Overwrite: left wall with window hole
    # Wall left: bottom strip below window
    # Already drew full wall, windows will overlay

    # Back wall
    box3d(ax, 0, Ly-wt, 0, Lx, wt, Lz, C['wall_dk'])
    # Back window
    window3d(ax, 1.5, Ly-wt, 1.0, face='y', w=1.3, h=1.1)

    # Right wall
    box3d(ax, Lx-wt, 0, 0, wt, Ly, Lz, C['wall_dk'])
    # Right windows
    window3d(ax, Lx-wt, 2.0, 0.9, face='x', w=1.3, h=1.1)
    window3d(ax, Lx-wt, 5.5, 0.9, face='x', w=1.3, h=1.1)

    # Left wall window
    window3d(ax, 0, 3.2, 0.9, face='x', w=1.3, h=1.1)

    # Front wall - with door gap
    box3d(ax, 0, 0, 0, 2.0, wt, Lz, C['wall'])
    box3d(ax, 3.2, 0, 0, Lx-3.2, wt, Lz, C['wall'])
    box3d(ax, 2.0, 0, 2.2, 1.2, wt, Lz-2.2, C['wall'])
    # Door
    door3d(ax, 2.0, 0, 0, face='y', w=1.2, h=2.2)

    # Ceiling
    if show_ceiling:
        box3d(ax, 0, 0, Lz, Lx, Ly, 0.12, '#D5D5D5', alpha=0.25, ec='#AAA')

    # Skirting / Baseboard (small strip at floor-wall junction)
    box3d(ax, 0, 0, 0, Lx, wt, 0.08, C['wall_dk'], ec='#999', lw=0.1)
    box3d(ax, 0, Ly-wt, 0, Lx, wt, 0.08, C['wall_dk'], ec='#999', lw=0.1)

    return Lx, Ly, Lz


def build_kitchen_3d(ax):
    """Kitchen interior model."""
    Kx, Ky, Kz = 3.5, 4.0, 3.0
    wt = 0.15

    # Floor
    box3d(ax, 0, 0, -0.06, Kx, Ky, 0.06, C['floor_tile'], ec='#AAA')
    for i in range(8):
        for j in range(9):
            col = '#E5DCC8' if (i+j)%2==0 else '#CFC0A2'
            v = [[[i*0.45+0.01, j*0.45+0.01, 0.002],[i*0.45+0.44, j*0.45+0.01, 0.002],
                  [i*0.45+0.44, j*0.45+0.44, 0.002],[i*0.45+0.01, j*0.45+0.44, 0.002]]]
            ax.add_collection3d(Poly3DCollection(v, alpha=0.5, facecolor=col, edgecolor='#DDD', lw=0.05))

    # Walls
    box3d(ax, 0, Ky-wt, 0, Kx, wt, Kz, C['wall'], alpha=0.88)
    box3d(ax, 0, 0, 0, wt, Ky, Kz, C['wall_dk'], alpha=0.88)
    # Right wall with ventilation window
    box3d(ax, Kx-wt, 0, 0, wt, Ky, 1.0, C['wall'], alpha=0.88)
    box3d(ax, Kx-wt, 0, 2.0, wt, Ky, Kz-2.0, C['wall'], alpha=0.88)
    box3d(ax, Kx-wt, 0, 1.0, wt, 1.0, 1.0, C['wall'], alpha=0.88)
    box3d(ax, Kx-wt, 2.2, 1.0, wt, Ky-2.2, 1.0, C['wall'], alpha=0.88)
    window3d(ax, Kx-wt, 1.0, 1.0, face='x', w=1.2, h=1.0)

    # Ceiling
    box3d(ax, 0, 0, Kz, Kx, Ky, 0.08, '#DDD', alpha=0.2, ec='#BBB')

    # Wall tiles backsplash (back wall behind counter)
    for ti in range(5):
        for tj in range(4):
            tx = 0.15 + ti * 0.64
            tz = 0.89 + tj * 0.18
            if tx + 0.60 > Kx: break
            col = '#E8E4DC' if (ti+tj)%2==0 else '#F0ECE4'
            v = [[[tx, Ky-wt-0.001, tz],[tx+0.60, Ky-wt-0.001, tz],
                  [tx+0.60, Ky-wt-0.001, tz+0.16],[tx, Ky-wt-0.001, tz+0.16]]]
            ax.add_collection3d(Poly3DCollection(v, alpha=0.7, facecolor=col, edgecolor='#CCC', lw=0.08))

    cab_h, cab_d = 0.85, 0.58

    # LOWER CABINETS - back wall
    for i in range(4):
        cx = 0.15 + i * 0.68
        if cx + 0.64 > Kx - 0.3: break
        col = C['cab_lo'] if i%2==0 else C['cab_dk']
        box3d(ax, cx, Ky-wt-cab_d, 0.04, 0.64, cab_d, cab_h-0.04, col, ec='#888')
        # Handle
        box3d(ax, cx+0.27, Ky-wt-cab_d-0.015, 0.38, 0.10, 0.015, 0.12, C['steel'], ec='#777')

    # LOWER CABINETS - left wall
    for j in range(2):
        cy = Ky - wt - cab_d - 0.08 - j * 0.72
        if cy < 0.5: break
        col = C['cab_lo'] if j%2==0 else C['cab_dk']
        box3d(ax, wt+0.02, cy-0.64, 0.04, cab_d, 0.64, cab_h-0.04, col, ec='#888')
        box3d(ax, wt-0.005, cy-0.38, 0.38, 0.015, 0.10, 0.12, C['steel'], ec='#777')

    # COUNTERTOP (L-shape)
    box3d(ax, wt-0.02, Ky-wt-cab_d-0.04, cab_h, Kx-wt-0.3, cab_d+0.06, 0.035, C['counter'], ec='#AAA')
    box3d(ax, wt-0.02, Ky-wt-cab_d-0.04-0.68, cab_h, cab_d+0.06, 0.72, 0.035, C['counter'], ec='#AAA')

    # SINK
    sx = 1.7
    box3d(ax, sx, Ky-wt-cab_d+0.08, cab_h+0.035, 0.50, 0.38, 0.05, C['sink'], ec='#999')
    # Basin depression
    box3d(ax, sx+0.05, Ky-wt-cab_d+0.12, cab_h+0.04, 0.40, 0.30, 0.02, '#C0C0C0', ec='#AAA')
    # Faucet
    box3d(ax, sx+0.20, Ky-wt-0.06, cab_h+0.035, 0.05, 0.05, 0.30, '#B0B0B0', ec='#888')
    box3d(ax, sx+0.08, Ky-wt-0.06, cab_h+0.33, 0.22, 0.035, 0.025, '#B0B0B0', ec='#888')

    # STOVE
    stx = 0.35
    box3d(ax, stx, Ky-wt-cab_d+0.08, cab_h+0.035, 0.58, 0.42, 0.03, C['stove'], ec='#222')
    # Burner grates
    for bx_off, by_off in [(0.07, 0.06), (0.35, 0.06), (0.07, 0.26), (0.35, 0.26)]:
        bx = stx + bx_off
        by = Ky-wt-cab_d+0.08 + by_off
        box3d(ax, bx, by, cab_h+0.065, 0.14, 0.10, 0.012, '#444', ec='#333')
        # flame ring
        box3d(ax, bx+0.03, by+0.02, cab_h+0.065, 0.08, 0.06, 0.005, '#666', ec='#555')

    # UPPER CABINETS - back wall
    for i in range(3):
        cx = 0.20 + i * 0.82
        if cx+0.76 > Kx-0.2: break
        box3d(ax, cx, Ky-wt-0.32, 1.55, 0.76, 0.30, 0.62, C['cab_up'], ec='#AAA')
        box3d(ax, cx+0.32, Ky-wt-0.34, 1.78, 0.12, 0.015, 0.14, C['steel'], ec='#888')

    # REFRIGERATOR
    box3d(ax, Kx-0.72, 0.12, 0, 0.60, 0.58, 1.75, C['fridge'], ec='#AAA')
    # Fridge door split
    v = [[[Kx-0.72, 0.115, 0.70],[Kx-0.12, 0.115, 0.70],[Kx-0.12, 0.115, 0.72],[Kx-0.72, 0.115, 0.72]]]
    ax.add_collection3d(Poly3DCollection(v, facecolor='#CCC', edgecolor='#BBB', lw=0.2))
    # Handles
    box3d(ax, Kx-0.72, 0.10, 1.05, 0.04, 0.015, 0.18, C['steel'], ec='#888')
    box3d(ax, Kx-0.72, 0.10, 0.30, 0.04, 0.015, 0.18, C['steel'], ec='#888')

    return Kx, Ky, Kz


def build_single_storey(ax, with_roof=True):
    """Single storey residence."""
    Bx, By, Lz = 12, 9, 3.2
    wt = 0.23

    # Ground
    gnd = [[[-1.5,-2,-0.02],[Bx+1.5,-2,-0.02],[Bx+1.5,By+1.5,-0.02],[-1.5,By+1.5,-0.02]]]
    ax.add_collection3d(Poly3DCollection(gnd, facecolor=C['grass'], edgecolor=C['grass_dk'], lw=0.2, alpha=0.45))

    # Foundation
    box3d(ax, -0.12, -0.12, -0.22, Bx+0.24, By+0.24, 0.22, C['concrete_dk'], ec='#888')
    # Floor
    box3d(ax, 0, 0, -0.03, Bx, By, 0.03, C['floor_tile'], ec='#BBB')

    # EXTERNAL WALLS
    box3d(ax, 0, 0, 0, wt, By, Lz, C['wall'])
    box3d(ax, Bx-wt, 0, 0, wt, By, Lz, C['wall_dk'])
    box3d(ax, 0, By-wt, 0, Bx, wt, Lz, C['wall_dk'])
    # Front wall segments
    box3d(ax, 0, 0, 0, 1.8, wt, Lz, C['wall'])
    box3d(ax, 3.0, 0, 0, Bx-3.0, wt, Lz, C['wall'])
    box3d(ax, 1.8, 0, 2.2, 1.2, wt, Lz-2.2, C['wall'])
    door3d(ax, 1.8, 0, 0, face='y', w=1.2, h=2.2, color=C['door_lt'])

    # INTERNAL WALLS
    box3d(ax, 4.5, 0, 0, wt, By, Lz, C['wall_lt'], ec='#999')
    box3d(ax, 0, 4.5, 0, Bx, wt, Lz, C['wall_lt'], ec='#999')
    box3d(ax, 9.7, 0, 0, wt, 4.5, Lz, C['wall_lt'], ec='#999')

    # Internal doors
    door3d(ax, 4.5, 2.0, 0, face='x', w=0.9, h=2.1)
    door3d(ax, 5.5, 4.5, 0, face='y', w=0.9, h=2.1)
    door3d(ax, 9.7, 1.5, 0, face='x', w=0.8, h=2.1)

    # WINDOWS
    for wy in [2.0, 6.0]:
        window3d(ax, 0, wy, 0.9, face='x', w=1.3, h=1.1)
        window3d(ax, Bx-wt, wy, 0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 6.0, By-wt, 0.9, face='y', w=1.3, h=1.1)
    window3d(ax, 9.0, By-wt, 0.9, face='y', w=1.3, h=1.1)
    window3d(ax, 5.5, 0, 0.9, face='y', w=1.0, h=0.8)  # small kitchen window front

    # PORCH
    box3d(ax, 0.8, -1.8, -0.03, 3.2, 1.8, 0.10, C['porch'], ec='#AAA')
    for px in [0.9, 3.8]:
        box3d(ax, px, -1.65, 0.07, 0.16, 0.16, 2.85, C['concrete'], ec='#999')
    box3d(ax, 0.6, -2.0, 2.92, 3.6, 2.2, 0.08, C['concrete_dk'], alpha=0.6, ec='#999')

    # ROOF
    if with_roof:
        roof_gable(ax, 0, 0, Lz, Bx, By, overhang=0.7, ridge_h=1.8)

    return Bx, By, Lz


def build_two_storey(ax, with_roof=True):
    """G+1 two-storey building."""
    Bx, By = 10, 8
    Fz = 3.2
    wt = 0.23
    slab = 0.15

    # Ground
    gnd = [[[-2,-2.5,-0.02],[Bx+2,-2.5,-0.02],[Bx+2,By+2,-0.02],[-2,By+2,-0.02]]]
    ax.add_collection3d(Poly3DCollection(gnd, facecolor=C['grass'], edgecolor=C['grass_dk'], lw=0.2, alpha=0.4))

    # Foundation
    box3d(ax, -0.15, -0.15, -0.28, Bx+0.3, By+0.3, 0.28, C['concrete_dk'], ec='#888')
    box3d(ax, 0, 0, -0.03, Bx, By, 0.03, C['floor_tile'], ec='#BBB')

    # ===== GF WALLS =====
    box3d(ax, 0, 0, 0, wt, By, Fz, C['wall'])
    box3d(ax, Bx-wt, 0, 0, wt, By, Fz, C['wall_dk'])
    box3d(ax, 0, By-wt, 0, Bx, wt, Fz, C['wall_dk'])
    box3d(ax, 0, 0, 0, 2.0, wt, Fz, C['wall'])
    box3d(ax, 3.2, 0, 0, Bx-3.2, wt, Fz, C['wall'])
    box3d(ax, 2.0, 0, 2.2, 1.2, wt, Fz-2.2, C['wall'])
    door3d(ax, 2.0, 0, 0, face='y', w=1.2, h=2.2, color=C['door_lt'])
    # Internal
    box3d(ax, 4.5, 0, 0, wt, By, Fz, C['wall_lt'], ec='#999')
    box3d(ax, 0, 4.0, 0, 4.5, wt, Fz, C['wall_lt'], ec='#999')
    # GF windows
    for wy in [2.0, 5.5]:
        window3d(ax, 0, wy, 0.9, face='x', w=1.3, h=1.1)
        window3d(ax, Bx-wt, wy, 0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 5.5, By-wt, 0.9, face='y', w=1.3, h=1.1)
    window3d(ax, 8.0, By-wt, 0.9, face='y', w=1.3, h=1.1)

    # Staircase GF
    n = 14
    for s in range(n):
        sz = s * (Fz / n)
        sy = 0.3 + s * 0.22
        box3d(ax, 4.8, sy, sz, 1.2, 0.22, 0.035, C['stair'] if s%2==0 else C['stair_dk'], ec='#AAA', lw=0.15)

    # ===== FF SLAB =====
    z1 = Fz + slab
    box3d(ax, -0.12, -0.12, Fz, Bx+0.24, By+0.24, slab, C['concrete'], ec='#999')

    # ===== FF WALLS =====
    box3d(ax, 0, 0, z1, wt, By, Fz, C['wall'])
    box3d(ax, Bx-wt, 0, z1, wt, By, Fz, C['wall_dk'])
    box3d(ax, 0, By-wt, z1, Bx, wt, Fz, C['wall_dk'])
    box3d(ax, 0, 0, z1, 2.8, wt, Fz, C['wall'])
    box3d(ax, 4.2, 0, z1, Bx-4.2, wt, Fz, C['wall'])
    box3d(ax, 2.8, 0, z1+2.2, 1.4, wt, Fz-2.2, C['wall'])
    door3d(ax, 2.8, 0, z1, face='y', w=1.4, h=2.2, color=C['glass'])
    # Internal
    box3d(ax, 5.0, 0, z1, wt, By, Fz, C['wall_lt'], ec='#999')
    # FF windows
    for wy in [2.0, 5.5]:
        window3d(ax, 0, wy, z1+0.9, face='x', w=1.3, h=1.1)
        window3d(ax, Bx-wt, wy, z1+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 5.5, By-wt, z1+0.9, face='y', w=1.3, h=1.1)
    window3d(ax, 8.0, By-wt, z1+0.9, face='y', w=1.3, h=1.1)

    # Staircase FF
    for s in range(n):
        sz = z1 + s * (Fz / n)
        sy = 0.3 + s * 0.22
        box3d(ax, 4.8, sy, sz, 1.2, 0.22, 0.035, C['stair'] if s%2==0 else C['stair_dk'], ec='#AAA', lw=0.15)

    # ===== BALCONY =====
    bal_d = 1.4
    box3d(ax, 1.8, -bal_d, z1-0.04, 4.8, bal_d, 0.10, C['balcony'], ec='#999')
    # Railing posts
    for rx in np.linspace(1.85, 6.45, 14):
        box3d(ax, rx, -bal_d, z1+0.06, 0.04, 0.04, 0.95, C['steel'], ec='#888', lw=0.1)
    # Top rail
    box3d(ax, 1.8, -bal_d, z1+0.95, 4.8, 0.05, 0.04, C['steel'], ec='#777')
    # Side rails
    for ry_arr in [np.linspace(-bal_d, -0.05, 5)]:
        for ry in ry_arr:
            box3d(ax, 1.8, ry, z1+0.06, 0.04, 0.04, 0.95, C['steel'], ec='#888', lw=0.1)
            box3d(ax, 6.56, ry, z1+0.06, 0.04, 0.04, 0.95, C['steel'], ec='#888', lw=0.1)
    box3d(ax, 1.8, -bal_d, z1+0.95, 0.05, bal_d, 0.04, C['steel'], ec='#777')
    box3d(ax, 6.55, -bal_d, z1+0.95, 0.05, bal_d, 0.04, C['steel'], ec='#777')

    # ===== TERRACE SLAB =====
    z2 = z1 + Fz
    box3d(ax, -0.12, -0.12, z2, Bx+0.24, By+0.24, slab, C['terrace'], ec='#888')
    # Parapet
    ph = 0.85
    box3d(ax, 0, 0, z2+slab, wt*0.7, By, ph, C['wall'], alpha=0.65, ec='#AAA')
    box3d(ax, Bx-wt*0.7, 0, z2+slab, wt*0.7, By, ph, C['wall_dk'], alpha=0.65, ec='#AAA')
    box3d(ax, 0, By-wt*0.7, z2+slab, Bx, wt*0.7, ph, C['wall_dk'], alpha=0.65, ec='#AAA')
    box3d(ax, 0, 0, z2+slab, Bx, wt*0.7, ph, C['wall'], alpha=0.65, ec='#AAA')

    # Stair enclosure on terrace
    box3d(ax, 4.6, -0.1, z2+slab, 1.5, 3.5, 2.4, C['wall'], alpha=0.55, ec='#AAA')
    box3d(ax, 4.4, -0.3, z2+slab+2.4, 1.9, 3.9, 0.10, C['concrete'], alpha=0.45, ec='#AAA')

    # Entry porch
    box3d(ax, 1.0, -1.8, -0.03, 3.4, 1.8, 0.10, C['porch'], ec='#AAA')
    for px in [1.15, 4.2]:
        box3d(ax, px, -1.65, 0.07, 0.16, 0.16, Fz-0.3, C['concrete'], ec='#888')
    box3d(ax, 0.8, -2.0, Fz-0.18, 3.8, 2.2, 0.10, C['concrete_dk'], alpha=0.55, ec='#999')

    return Bx, By, z2 + slab + ph


# ============================================================
#  PAGE 1: HALL
# ============================================================
def page_hall(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "HALL  --  Floor Plan & Multi-View 3D", "1")

    # ─── 2D PLAN (top-left, larger) ───
    ax = fig.add_axes([0.06, 0.56, 0.55, 0.36])
    ax.set_xlim(-2, 10); ax.set_ylim(-2, 10.5)
    ax.set_aspect('equal')
    add_view_label(ax, "Floor Plan (6.0 m x 8.0 m)")
    W = 0.23
    ax.add_patch(Rectangle((0, 0), 6, 8, fc=C['floor'], ec='none'))
    for i in range(7):
        ax.plot([i, i], [0, 8], color=C['grid'], lw=0.12)
    for j in range(9):
        ax.plot([0, 6], [j, j], color=C['grid'], lw=0.12)
    for r in [(-W,-W,6+2*W,W),(-W,8,6+2*W,W),(-W,0,W,8),(6,0,W,8)]:
        ax.add_patch(Rectangle((r[0],r[1]),r[2],r[3], fc=C['wall'], ec=C['wall_edge'], lw=0.6, hatch='///'))
    # Door
    d_x, d_w = 2.0, 1.2
    ax.add_patch(Rectangle((d_x, -W), d_w, W, fc='white', ec='white'))
    ax.add_patch(Rectangle((d_x, -W-0.04), d_w, 0.10, fc=C['door'], ec='#444', lw=0.5))
    arc = Arc((d_x, 0), d_w*2, d_w*2, theta1=0, theta2=90, color=C['dim'], lw=0.25, ls='--')
    ax.add_patch(arc)
    ax.text(d_x+d_w/2, -0.9, "Door 1200", fontsize=4, ha='center', color=C['dim'])
    # Windows
    for wx, wy, o, ww in [(6,2.5,'v',1.3),(6,5.5,'v',1.3),(1.5,8,'h',1.3),(-W,3.2,'v',1.3)]:
        if o == 'v':
            ax.add_patch(Rectangle((wx-0.04,wy-ww/2),W+0.08,ww, fc=C['window'], ec=C['win_frame'], lw=0.5))
            ax.plot([wx+W/2]*2, [wy-ww/2+0.08, wy+ww/2-0.08], color=C['win_frame'], lw=0.15)
        else:
            ax.add_patch(Rectangle((wx,wy-0.04),ww,W+0.08, fc=C['window'], ec=C['win_frame'], lw=0.5))
    dim_line(ax, 0, 0, 6, 0, "6000 mm", offset=1.2)
    dim_line(ax, 0, 0, 0, 8, "8000 mm", offset=1.4)
    ax.text(3, 4, "HALL", fontsize=13, ha='center', va='center', fontweight='bold', color=C['text'], alpha=0.12)
    ax.text(3, 3.2, "48.0 sq.m", fontsize=5, ha='center', color=C['dim'])
    ax.annotate('N', xy=(8.5, 9.5), fontsize=6, fontweight='bold', ha='center', color=C['dim'])
    ax.annotate('', xy=(8.5, 10.2), xytext=(8.5, 9.6), arrowprops=dict(arrowstyle='->', lw=0.6, color=C['dim']))
    ax.axis('off')

    # ─── 3D ISOMETRIC (bottom-left) ───
    ax3 = fig.add_axes([0.02, 0.09, 0.52, 0.44], projection='3d')
    setup_iso(ax3, elev=26, azim=-48)
    add_view_label(ax3, "Isometric 3D View")
    Lx, Ly, Lz = build_hall_3d(ax3)
    ax3.set_xlim(-0.5, Lx+0.5); ax3.set_ylim(-0.5, Ly+0.5); ax3.set_zlim(-0.5, Lz+1)

    # ─── TOP VIEW (top-right) ───
    ax_top = fig.add_axes([0.62, 0.72, 0.35, 0.20], projection='3d')
    setup_top(ax_top)
    add_view_label(ax_top, "Top View (Plan)")
    build_hall_3d(ax_top, show_ceiling=False)
    ax_top.set_xlim(-0.5, 6.5); ax_top.set_ylim(-0.5, 8.5); ax_top.set_zlim(-0.5, 4)

    # ─── FRONT VIEW (right-middle) ───
    ax_fr = fig.add_axes([0.55, 0.46, 0.42, 0.24], projection='3d')
    setup_front(ax_fr)
    add_view_label(ax_fr, "Front Elevation")
    build_hall_3d(ax_fr)
    ax_fr.set_xlim(-0.5, 6.5); ax_fr.set_ylim(-0.5, 8.5); ax_fr.set_zlim(-0.5, 4)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print("  [OK] Page 1 - Hall (4 views)")


# ============================================================
#  PAGE 2: KITCHEN
# ============================================================
def page_kitchen(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "KITCHEN  --  3D Interior Multi-View", "2")

    # ─── ISOMETRIC (main, large) ───
    ax = fig.add_axes([0.02, 0.30, 0.96, 0.58], projection='3d')
    setup_iso(ax, elev=24, azim=-55)
    add_view_label(ax, "Isometric Interior View (3.5 m x 4.0 m)")
    Kx, Ky, Kz = build_kitchen_3d(ax)
    ax.set_xlim(-0.3, Kx+0.3); ax.set_ylim(-0.3, Ky+0.3); ax.set_zlim(-0.3, Kz+0.3)

    # ─── TOP VIEW (bottom-left) ───
    ax_top = fig.add_axes([0.04, 0.09, 0.42, 0.22], projection='3d')
    setup_top(ax_top)
    add_view_label(ax_top, "Top View (Plan)")
    build_kitchen_3d(ax_top)
    ax_top.set_xlim(-0.3, Kx+0.3); ax_top.set_ylim(-0.3, Ky+0.3); ax_top.set_zlim(-0.3, Kz+0.5)

    # ─── FRONT VIEW (bottom-right) ───
    ax_fr = fig.add_axes([0.52, 0.09, 0.44, 0.22], projection='3d')
    setup_front(ax_fr)
    add_view_label(ax_fr, "Front Elevation")
    build_kitchen_3d(ax_fr)
    ax_fr.set_xlim(-0.3, Kx+0.3); ax_fr.set_ylim(-0.3, Ky+0.3); ax_fr.set_zlim(-0.3, Kz+0.5)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print("  [OK] Page 2 - Kitchen (3 views)")


# ============================================================
#  PAGE 3: SINGLE-STOREY
# ============================================================
def page_single_storey(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "SINGLE-STOREY RESIDENCE  --  Multi-View 3D", "3")

    # ─── 2D PLAN (top) ───
    ax_plan = fig.add_axes([0.06, 0.72, 0.88, 0.20])
    ax_plan.set_xlim(-1.5, 14); ax_plan.set_ylim(-2, 11)
    ax_plan.set_aspect('equal')
    add_view_label(ax_plan, "Floor Plan (12 m x 9 m)")
    Bx, By, wt = 12, 9, 0.23
    ax_plan.add_patch(Rectangle((0,0),Bx,By, fc=C['floor'], ec='none'))
    for r in [(-wt,-wt,Bx+2*wt,wt),(-wt,By,Bx+2*wt,wt),(-wt,0,wt,By),(Bx,0,wt,By),
              (4.5,-wt,wt,By+wt),(0,4.5,Bx,wt),(9.7,0,wt,4.5)]:
        ax_plan.add_patch(Rectangle((r[0],r[1]),r[2],r[3], fc=C['wall'], ec=C['wall_edge'], lw=0.4))
    for rx, ry, t, fs in [(2.25,6.75,"Living\nRoom",5.5),(8.25,6.75,"Bedroom 1",5.5),
                           (2.25,2.25,"Kitchen",5.5),(7.0,2.25,"Bedroom 2",5.5),(10.5,2.25,"Bath",4.5)]:
        ax_plan.text(rx, ry, t, fontsize=fs, ha='center', va='center', color=C['dim'], fontstyle='italic')
    ax_plan.add_patch(Rectangle((0.5,-1.2),3.5,1.2, fc=C['porch'], ec=C['wall_edge'], lw=0.3, ls='--'))
    ax_plan.text(2.25, -0.55, "Porch", fontsize=4.5, ha='center', color=C['dim'])
    dim_line(ax_plan, 0, 0, Bx, 0, "12000 mm", offset=1.2, fs=4.5)
    dim_line(ax_plan, 0, 0, 0, By, "9000 mm", offset=1.3, fs=4.5)
    ax_plan.axis('off')

    # ─── ISOMETRIC (large, center) ───
    ax3 = fig.add_axes([0.02, 0.25, 0.96, 0.46], projection='3d')
    setup_iso(ax3, elev=28, azim=-48)
    add_view_label(ax3, "Isometric 3D View")
    Bx3, By3, Lz3 = build_single_storey(ax3)
    ax3.set_xlim(-2, Bx3+2); ax3.set_ylim(-3, By3+2); ax3.set_zlim(-1, Lz3+3)

    # ─── TOP VIEW (bottom-left) ───
    ax_top = fig.add_axes([0.04, 0.09, 0.42, 0.17], projection='3d')
    setup_top(ax_top)
    add_view_label(ax_top, "Top View")
    build_single_storey(ax_top, with_roof=False)
    ax_top.set_xlim(-2, 14); ax_top.set_ylim(-3, 12); ax_top.set_zlim(-1, 6)

    # ─── FRONT VIEW (bottom-right) ───
    ax_fr = fig.add_axes([0.52, 0.09, 0.44, 0.17], projection='3d')
    setup_front(ax_fr)
    add_view_label(ax_fr, "Front Elevation")
    build_single_storey(ax_fr)
    ax_fr.set_xlim(-2, 14); ax_fr.set_ylim(-3, 12); ax_fr.set_zlim(-1, 7)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print("  [OK] Page 3 - Single-Storey (4 views)")


# ============================================================
#  PAGE 4: TWO-STOREY
# ============================================================
def page_two_storey(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "G+1 TWO-STOREY RESIDENCE  --  Multi-View 3D", "4")

    # ─── ISOMETRIC (large, top) ───
    ax = fig.add_axes([0.02, 0.38, 0.96, 0.52], projection='3d')
    setup_iso(ax, elev=25, azim=-52, aspect=[1, 1, 0.65])
    add_view_label(ax, "Isometric View  (10 m x 8 m, G+1)")
    Bx, By, ztop = build_two_storey(ax)
    ax.set_xlim(-3, Bx+3); ax.set_ylim(-3, By+3); ax.set_zlim(-1, ztop+2)

    # ─── TOP VIEW (bottom-left) ───
    ax_top = fig.add_axes([0.04, 0.09, 0.42, 0.28], projection='3d')
    setup_top(ax_top)
    add_view_label(ax_top, "Top View (Terrace Level)")
    build_two_storey(ax_top, with_roof=True)
    ax_top.set_xlim(-3, Bx+3); ax_top.set_ylim(-3, By+3); ax_top.set_zlim(-1, ztop+3)

    # ─── FRONT VIEW (bottom-right) ───
    ax_fr = fig.add_axes([0.52, 0.09, 0.44, 0.28], projection='3d')
    setup_front(ax_fr)
    add_view_label(ax_fr, "Front Elevation")
    build_two_storey(ax_fr)
    ax_fr.set_xlim(-3, Bx+3); ax_fr.set_ylim(-3, By+3); ax_fr.set_zlim(-1, ztop+2)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print("  [OK] Page 4 - Two-Storey (3 views)")


# ============================================================
#  MAIN
# ============================================================
def main():
    print("=" * 55)
    print("  BIM Drawings V2 - Improved 3D + Multi-View")
    print("  By: Karn Agarwal | 2301296 | Civil Engg")
    print("  Dayalbagh University")
    print("=" * 55)

    with PdfPages(PDF_PATH) as pdf:
        page_hall(pdf)
        page_kitchen(pdf)
        page_single_storey(pdf)
        page_two_storey(pdf)

    print("\n" + "=" * 55)
    print(f"  PDF saved: {PDF_PATH}")
    print("  4 pages | 300 DPI | A4")
    print("=" * 55)

if __name__ == "__main__":
    main()
