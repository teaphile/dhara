"""
Professional Architectural BIM Drawings Generator
Generates 4 A4 pages: Hall, Kitchen, Single-Storey, Two-Storey
Output: Single high-resolution PDF (300 DPI)
"""
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Rectangle, Polygon, Arc, FancyArrowPatch
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.patheffects as pe
from matplotlib.lines import Line2D
import os

# ── Output ──
OUT_DIR = r"C:\Users\HP\OneDrive\Desktop\GEOMATICS LAB 2\draw\BIM"
os.makedirs(OUT_DIR, exist_ok=True)
PDF_PATH = os.path.join(OUT_DIR, "BIM_Architectural_Drawings.pdf")

# ── Global Style ──
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'DejaVu Sans'],
    'font.size': 7,
    'axes.linewidth': 0.4,
    'lines.linewidth': 0.5,
})

# ── Color Palette (Architectural) ──
C = {
    'wall':      '#D4C5A9',
    'wall_dark': '#B8A88A',
    'wall_edge': '#3D3D3D',
    'floor':     '#E8DCC8',
    'floor_tile':'#D2C4A8',
    'roof':      '#8B4513',
    'roof_lt':   '#A0522D',
    'window':    '#87CEEB',
    'win_frame': '#555555',
    'door':      '#654321',
    'door_lt':   '#8B6914',
    'grass':     '#7CBA5A',
    'grass_dk':  '#5A9A3A',
    'sky':       '#DCE9F5',
    'concrete':  '#BFBFBF',
    'countertop':'#D9D0C1',
    'cabinet_up':'#E8DED0',
    'cabinet_lo':'#C8B898',
    'steel':     '#A8A8A8',
    'sink':      '#D0D0D0',
    'stove':     '#2D2D2D',
    'fridge':    '#E0E0E0',
    'balcony':   '#C9B99A',
    'stair':     '#C4B594',
    'text':      '#1A1A1A',
    'dim':       '#333333',
    'title_bg':  '#2C3E50',
    'title_fg':  '#FFFFFF',
    'border':    '#1A1A1A',
    'grid':      '#E0E0E0',
    'terrace':   '#B0B0B0',
    'porch':     '#CFBFA0',
    'bath_tile': '#B3CDE0',
    'glass':     '#C6E2FF',
}

# ── Helper: Title Block ──
def add_title_block(fig, title, sheet_no, project="Residential BIM Project", scale="NTS"):
    # Bottom border bar
    ax_tb = fig.add_axes([0.03, 0.02, 0.94, 0.055])
    ax_tb.set_xlim(0, 100); ax_tb.set_ylim(0, 10)
    ax_tb.add_patch(Rectangle((0,0), 100, 10, fc=C['title_bg'], ec='none'))
    ax_tb.text(2, 5.5, title, fontsize=9, fontweight='bold', color='white', va='center')
    ax_tb.text(2, 2, f"Project: {project}", fontsize=5.5, color='#CCCCCC', va='center')
    ax_tb.text(50, 5.5, f"Sheet {sheet_no}/4", fontsize=7, color='white', va='center', ha='center')
    ax_tb.text(75, 5.5, f"Scale: {scale}", fontsize=6, color='#CCCCCC', va='center')
    ax_tb.text(98, 5.5, "A4 – 210×297", fontsize=5, color='#AAAAAA', va='center', ha='right')
    ax_tb.text(98, 2, "BIM Standard · Revit Style", fontsize=4.5, color='#888888', va='center', ha='right')
    ax_tb.axis('off')
    # Page border
    border = fig.add_axes([0.02, 0.015, 0.96, 0.97])
    border.set_xlim(0,1); border.set_ylim(0,1)
    border.add_patch(Rectangle((0,0),1,1, fill=False, ec=C['border'], lw=1.5))
    border.axis('off')

# ── Helper: dimension line (2D) ──
def dim_line(ax, x1, y1, x2, y2, label, offset=0.5, fontsize=5.5):
    mx, my = (x1+x2)/2, (y1+y2)/2
    if y1 == y2:  # horizontal
        ax.annotate('', xy=(x1, y1-offset), xytext=(x2, y2-offset),
                     arrowprops=dict(arrowstyle='<->', color=C['dim'], lw=0.5))
        ax.text(mx, y1-offset-0.3, label, fontsize=fontsize, ha='center', va='top', color=C['dim'])
    else:  # vertical
        ax.annotate('', xy=(x1-offset, y1), xytext=(x2-offset, y2),
                     arrowprops=dict(arrowstyle='<->', color=C['dim'], lw=0.5))
        ax.text(x1-offset-0.3, my, label, fontsize=fontsize, ha='right', va='center', color=C['dim'], rotation=90)

# ── Helper: 3D box ──
def box3d(ax, x, y, z, dx, dy, dz, color, alpha=1.0, ec='#333', lw=0.3):
    verts = [
        [[x,y,z],[x+dx,y,z],[x+dx,y+dy,z],[x,y+dy,z]],
        [[x,y,z+dz],[x+dx,y,z+dz],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]],
        [[x,y,z],[x+dx,y,z],[x+dx,y,z+dz],[x,y,z+dz]],
        [[x,y+dy,z],[x+dx,y+dy,z],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]],
        [[x,y,z],[x,y+dy,z],[x,y+dy,z+dz],[x,y,z+dz]],
        [[x+dx,y,z],[x+dx,y+dy,z],[x+dx,y+dy,z+dz],[x+dx,y,z+dz]],
    ]
    col = Poly3DCollection(verts, alpha=alpha, facecolor=color, edgecolor=ec, linewidths=lw)
    ax.add_collection3d(col)

# ── Helper: 3D window ──
def window3d(ax, x, y, z, face='x', w=1.2, h=1.0):
    if face == 'x':
        verts = [[[x,y,z],[x,y+w,z],[x,y+w,z+h],[x,y,z+h]]]
    elif face == '-x':
        verts = [[[x,y,z],[x,y+w,z],[x,y+w,z+h],[x,y,z+h]]]
    elif face == 'y':
        verts = [[[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]]]
    else:
        verts = [[[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]]]
    c = Poly3DCollection(verts, alpha=0.4, facecolor=C['window'], edgecolor=C['win_frame'], linewidths=0.6)
    ax.add_collection3d(c)

# ── Helper: 3D door ──
def door3d(ax, x, y, z, face='x', w=1.0, h=2.1, color=None):
    col = color or C['door']
    if face == 'x':
        verts = [[[x,y,z],[x,y+w,z],[x,y+w,z+h],[x,y,z+h]]]
    elif face == 'y':
        verts = [[[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]]]
    else:
        verts = [[[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]]]
    c = Poly3DCollection(verts, alpha=0.85, facecolor=col, edgecolor='#444', linewidths=0.5)
    ax.add_collection3d(c)

# ── Helper: Roof (hip/gable) ──
def roof_gable(ax, x, y, z, dx, dy, overhang=0.5, ridge_h=2.0):
    xo, yo = x - overhang, y - overhang
    dxo, dyo = dx + 2*overhang, dy + 2*overhang
    mid_x = x + dx/2
    verts = [
        # left slope
        [[xo, yo, z], [mid_x, yo, z+ridge_h], [mid_x, yo+dyo, z+ridge_h], [xo, yo+dyo, z]],
        # right slope
        [[xo+dxo, yo, z], [mid_x, yo, z+ridge_h], [mid_x, yo+dyo, z+ridge_h], [xo+dxo, yo+dyo, z]],
        # front gable
        [[xo, yo, z], [xo+dxo, yo, z], [mid_x, yo, z+ridge_h]],
        # back gable
        [[xo, yo+dyo, z], [xo+dxo, yo+dyo, z], [mid_x, yo+dyo, z+ridge_h]],
    ]
    cols = [C['roof'], C['roof_lt'], C['roof'], C['roof_lt']]
    for v, c in zip(verts, cols):
        p = Poly3DCollection([v], alpha=0.9, facecolor=c, edgecolor='#5A3010', linewidths=0.5)
        ax.add_collection3d(p)

def setup_3d_ax(ax, elev=28, azim=-50):
    ax.set_axis_off()
    ax.view_init(elev=elev, azim=azim)
    ax.set_box_aspect([1, 1, 0.6])

# ═══════════════════════════════════════════════════════════════
#  PAGE 1: HALL — Floor Plan + 3D Model
# ═══════════════════════════════════════════════════════════════
def page_hall(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "HALL — Floor Plan & Isometric 3D View", "1", scale="1:50")

    # ── 2D FLOOR PLAN (top half) ──
    ax = fig.add_axes([0.08, 0.50, 0.84, 0.43])
    ax.set_xlim(-2, 12); ax.set_ylim(-2, 10)
    ax.set_aspect('equal')
    ax.set_title("Floor Plan — Hall (6.0 m × 8.0 m)", fontsize=9, fontweight='bold', pad=8, color=C['text'])

    W = 0.23  # wall thickness

    # Floor fill
    ax.add_patch(Rectangle((0, 0), 6, 8, fc=C['floor'], ec='none'))
    # Tile grid
    for i in range(7):
        ax.plot([i*1, i*1], [0, 8], color=C['grid'], lw=0.15)
    for j in range(9):
        ax.plot([0, 6], [j*1, j*1], color=C['grid'], lw=0.15)

    # Walls
    for rect in [
        (-W, -W, 6+2*W, W),         # bottom
        (-W, 8, 6+2*W, W),           # top
        (-W, 0, W, 8),               # left
        (6, 0, W, 8),                # right
    ]:
        ax.add_patch(Rectangle((rect[0], rect[1]), rect[2], rect[3],
                                fc=C['wall'], ec=C['wall_edge'], lw=0.8, hatch='///'))

    # Main entrance door (bottom wall, center)
    d_x, d_w = 2.0, 1.2
    ax.add_patch(Rectangle((d_x, -W), d_w, W, fc='white', ec='white'))
    ax.add_patch(Rectangle((d_x, -W-0.05), d_w, 0.12, fc=C['door'], ec='#444', lw=0.6))
    # Door swing arc
    arc = Arc((d_x, 0), d_w*2, d_w*2, angle=0, theta1=0, theta2=90,
              color=C['dim'], lw=0.3, ls='--')
    ax.add_patch(arc)
    ax.text(d_x + d_w/2, -1.0, "Main Door\n1200 mm", fontsize=4.5, ha='center', color=C['dim'])

    # Windows
    wins = [
        (6, 2.5, 'v', 1.5),   # right wall
        (6, 5.5, 'v', 1.5),   # right wall
        (1.5, 8, 'h', 1.5),   # top wall
        (-W, 3.5, 'v', 1.5),  # left wall
    ]
    for wx, wy, orient, ww in wins:
        if orient == 'v':
            ax.add_patch(Rectangle((wx-0.05, wy-ww/2), W+0.1, ww, fc=C['window'], ec=C['win_frame'], lw=0.6))
            # Glass lines
            ax.plot([wx+W/2, wx+W/2], [wy-ww/2+0.1, wy+ww/2-0.1], color=C['win_frame'], lw=0.2)
        else:
            ax.add_patch(Rectangle((wx, wy-0.05), ww, W+0.1, fc=C['window'], ec=C['win_frame'], lw=0.6))
            ax.plot([wx+0.1, wx+ww-0.1], [wy+W/2, wy+W/2], color=C['win_frame'], lw=0.2)

    # Dimension lines
    dim_line(ax, 0, 0, 6, 0, "6000 mm", offset=1.3, fontsize=5)
    dim_line(ax, 0, 0, 0, 8, "8000 mm", offset=1.5, fontsize=5)
    dim_line(ax, d_x, 0, d_x+d_w, 0, "1200", offset=0.6, fontsize=4.5)

    # Room label
    ax.text(3, 4, "HALL", fontsize=14, ha='center', va='center', fontweight='bold',
            color=C['text'], alpha=0.15)
    ax.text(3, 3.2, "Area: 48.0 m²", fontsize=6, ha='center', color=C['dim'])

    # Compass
    ax.annotate('N', xy=(10.5, 8.5), fontsize=7, fontweight='bold', ha='center', color=C['dim'])
    ax.annotate('', xy=(10.5, 9.2), xytext=(10.5, 8.7),
                arrowprops=dict(arrowstyle='->', lw=0.8, color=C['dim']))

    ax.axis('off')

    #  ── 3D ISOMETRIC VIEW (bottom half) ──
    ax3 = fig.add_axes([0.05, 0.09, 0.90, 0.40], projection='3d')
    setup_3d_ax(ax3, elev=25, azim=-45)
    ax3.set_title("Isometric 3D View — Hall", fontsize=8, fontweight='bold', pad=-5, color=C['text'])

    Lx, Ly, Lz = 6, 8, 3.2
    wt = 0.23

    # Floor slab
    box3d(ax3, 0, 0, -0.15, Lx, Ly, 0.15, C['concrete'], ec='#999')

    # Floor tiles
    floor_v = [[[0,0,0],[Lx,0,0],[Lx,Ly,0],[0,Ly,0]]]
    ax3.add_collection3d(Poly3DCollection(floor_v, alpha=0.8, facecolor=C['floor_tile'], edgecolor='#BBB', lw=0.2))

    # Walls — left
    box3d(ax3, 0, 0, 0, wt, Ly, Lz, C['wall'])
    # Walls — back
    box3d(ax3, 0, Ly-wt, 0, Lx, wt, Lz, C['wall_dark'])
    # Walls — right (partial, with window gaps)
    box3d(ax3, Lx-wt, 0, 0, wt, 1.5, Lz, C['wall'])
    box3d(ax3, Lx-wt, 1.5, 0, wt, 1, 0.9, C['wall'])
    box3d(ax3, Lx-wt, 1.5, 1.9, wt, 1, Lz-1.9, C['wall'])
    window3d(ax3, Lx-wt, 1.5, 0.9, face='x', w=1.0, h=1.0)
    box3d(ax3, Lx-wt, 2.5, 0, wt, 2.0, Lz, C['wall'])
    box3d(ax3, Lx-wt, 4.5, 0, wt, 1, 0.9, C['wall'])
    box3d(ax3, Lx-wt, 4.5, 1.9, wt, 1, Lz-1.9, C['wall'])
    window3d(ax3, Lx-wt, 4.5, 0.9, face='x', w=1.0, h=1.0)
    box3d(ax3, Lx-wt, 5.5, 0, wt, Ly-5.5, Lz, C['wall'])
    # Walls — front (partial, door gap)
    box3d(ax3, 0, 0, 0, 2.0, wt, Lz, C['wall_dark'])
    box3d(ax3, 3.2, 0, 0, Lx-3.2, wt, Lz, C['wall_dark'])
    box3d(ax3, 2.0, 0, 2.1, 1.2, wt, Lz-2.1, C['wall_dark'])
    # Front door
    door3d(ax3, 2.0, 0, 0, face='y', w=1.2, h=2.1)
    # Left wall window
    box3d(ax3, 0, 3.0, 0, wt, 0.5, Lz, C['wall'])
    box3d(ax3, 0, 3.5, 0, wt, 1.2, 0.9, C['wall'])
    box3d(ax3, 0, 3.5, 1.9, wt, 1.2, Lz-1.9, C['wall'])
    window3d(ax3, 0, 3.5, 0.9, face='x', w=1.2, h=1.0)
    box3d(ax3, 0, 4.7, 0, wt, Ly-4.7-wt, Lz, C['wall'])

    # Ceiling slab
    box3d(ax3, 0, 0, Lz, Lx, Ly, 0.15, '#CCC', alpha=0.3, ec='#999')

    ax3.set_xlim(0, Lx); ax3.set_ylim(0, Ly); ax3.set_zlim(-0.5, Lz+1)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print('  [OK] Page 1 - Hall')

# ═══════════════════════════════════════════════════════════════
#  PAGE 2: KITCHEN — 3D Interior Model
# ═══════════════════════════════════════════════════════════════
def page_kitchen(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "KITCHEN — 3D Interior Model", "2", scale="1:25")

    ax = fig.add_axes([0.03, 0.08, 0.94, 0.84], projection='3d')
    setup_3d_ax(ax, elev=22, azim=-55)
    ax.set_title("Kitchen Interior — Modular Design (3.5 m × 4.0 m)", fontsize=9,
                 fontweight='bold', pad=-2, color=C['text'])

    Kx, Ky, Kz = 3.5, 4.0, 3.0
    wt = 0.15

    # Floor
    box3d(ax, 0, 0, -0.08, Kx, Ky, 0.08, C['floor_tile'], ec='#AAA')
    # Tile pattern
    for i in range(8):
        for j in range(9):
            v = [[[i*0.45, j*0.45, 0.001], [i*0.45+0.43, j*0.45, 0.001],
                  [i*0.45+0.43, j*0.45+0.43, 0.001], [i*0.45, j*0.45+0.43, 0.001]]]
            c = '#E2D5BF' if (i+j) % 2 == 0 else '#D0C0A0'
            ax.add_collection3d(Poly3DCollection(v, alpha=0.6, facecolor=c, edgecolor='#CCC', lw=0.1))

    # Back wall
    box3d(ax, 0, Ky-wt, 0, Kx, wt, Kz, C['wall'], alpha=0.85)
    # Left wall
    box3d(ax, 0, 0, 0, wt, Ky, Kz, C['wall_dark'], alpha=0.85)
    # Right wall (partial — ventilation window)
    box3d(ax, Kx-wt, 0, 0, wt, Ky, 1.0, C['wall'], alpha=0.85)
    box3d(ax, Kx-wt, 0, 2.0, wt, Ky, Kz-2.0, C['wall'], alpha=0.85)
    box3d(ax, Kx-wt, 0, 1.0, wt, 1.2, 1.0, C['wall'], alpha=0.85)
    box3d(ax, Kx-wt, 2.2, 1.0, wt, Ky-2.2, 1.0, C['wall'], alpha=0.85)
    # Ventilation window
    window3d(ax, Kx-wt, 1.2, 1.0, face='x', w=1.0, h=1.0)

    # Ceiling
    box3d(ax, 0, 0, Kz, Kx, Ky, 0.1, '#DDD', alpha=0.25, ec='#BBB')

    # ── LOWER CABINETS (L-shaped along back + left) ──
    cab_h, cab_d = 0.85, 0.6
    # Back lower cabinets
    for i in range(5):
        cx = 0.15 + i * 0.65
        if cx + 0.60 > Kx - 0.2: break
        col = C['cabinet_lo'] if i % 2 == 0 else '#BFA880'
        box3d(ax, cx, Ky-wt-cab_d, 0, 0.60, cab_d, cab_h, col)
        # Handle
        box3d(ax, cx+0.25, Ky-wt-cab_d-0.02, cab_h*0.4, 0.10, 0.02, 0.15, C['steel'], ec='#777')

    # Left lower cabinets
    for j in range(3):
        cy = Ky - wt - cab_d - 0.05 - j * 0.70
        if cy < 0.5: break
        col = C['cabinet_lo'] if j % 2 == 0 else '#BFA880'
        box3d(ax, wt, cy - 0.60, 0, cab_d, 0.60, cab_h, col)
        box3d(ax, wt-0.02, cy - 0.35, cab_h*0.4, 0.02, 0.10, 0.15, C['steel'], ec='#777')

    # ── COUNTERTOP ──
    box3d(ax, wt, Ky-wt-cab_d-0.02, cab_h, Kx-wt*2-0.3, cab_d+0.04, 0.04, C['countertop'], ec='#999')
    box3d(ax, wt, Ky-wt-cab_d-0.02-0.62, cab_h, cab_d+0.04, 0.62+0.04, 0.04, C['countertop'], ec='#999')

    # ── SINK (on countertop, back wall center) ──
    sx = 1.8
    box3d(ax, sx, Ky-wt-cab_d+0.1, cab_h+0.04, 0.55, 0.40, 0.06, C['sink'], ec='#888')
    # Faucet
    box3d(ax, sx+0.22, Ky-wt-0.08, cab_h+0.04, 0.06, 0.06, 0.35, '#999', ec='#666')
    box3d(ax, sx+0.10, Ky-wt-0.08, cab_h+0.39, 0.25, 0.04, 0.03, '#999', ec='#666')

    # ── STOVE / COOKTOP ──
    stx = 0.4
    box3d(ax, stx, Ky-wt-cab_d+0.1, cab_h+0.04, 0.60, 0.45, 0.04, C['stove'], ec='#222')
    # Burners
    for bx, by in [(stx+0.12, Ky-wt-cab_d+0.22), (stx+0.40, Ky-wt-cab_d+0.22),
                    (stx+0.12, Ky-wt-cab_d+0.42), (stx+0.40, Ky-wt-cab_d+0.42)]:
        box3d(ax, bx, by, cab_h+0.08, 0.12, 0.12, 0.01, '#555', ec='#333')

    # ── UPPER CABINETS (back wall) ──
    uc_z = 1.6
    for i in range(4):
        cx = 0.2 + i * 0.78
        if cx + 0.72 > Kx - 0.2: break
        box3d(ax, cx, Ky-wt-0.35, uc_z, 0.72, 0.33, 0.65, C['cabinet_up'], ec='#999')
        box3d(ax, cx+0.30, Ky-wt-0.37, uc_z+0.25, 0.12, 0.02, 0.15, C['steel'], ec='#777')

    # ── REFRIGERATOR (right side, front) ──
    box3d(ax, Kx-0.75, 0.15, 0, 0.65, 0.60, 1.80, C['fridge'], ec='#AAA')
    box3d(ax, Kx-0.75, 0.13, 1.1, 0.65, 0.02, 0.08, C['steel'], ec='#888')  # handle upper
    box3d(ax, Kx-0.75, 0.13, 0.50, 0.65, 0.02, 0.08, C['steel'], ec='#888')  # handle lower
    # Fridge line (door split)
    v = [[[Kx-0.75, 0.14, 0.75], [Kx-0.10, 0.14, 0.75], [Kx-0.10, 0.14, 0.76], [Kx-0.75, 0.14, 0.76]]]
    ax.add_collection3d(Poly3DCollection(v, facecolor='#CCC', edgecolor='#AAA', lw=0.3))

    # Annotations
    ax.text(Kx/2, Ky/2, 0.01, "Kitchen\n3.5 × 4.0 m", fontsize=5, ha='center', color='#888', alpha=0.4)

    ax.set_xlim(-0.3, Kx+0.3); ax.set_ylim(-0.3, Ky+0.3); ax.set_zlim(-0.3, Kz+0.3)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print('  [OK] Page 2 - Kitchen')

# ═══════════════════════════════════════════════════════════════
#  PAGE 3: SINGLE-STOREY RESIDENTIAL BUILDING
# ═══════════════════════════════════════════════════════════════
def page_single_storey(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "SINGLE-STOREY RESIDENTIAL BUILDING — Isometric 3D", "3", scale="1:100")

    # ── Floor plan (top) ──
    ax_plan = fig.add_axes([0.06, 0.54, 0.88, 0.39])
    ax_plan.set_xlim(-1.5, 14); ax_plan.set_ylim(-1.5, 11)
    ax_plan.set_aspect('equal')
    ax_plan.set_title("Floor Plan — Single-Storey Residence (12 m × 9 m)", fontsize=8, fontweight='bold', pad=6, color=C['text'])

    wt = 0.23
    Bx, By = 12, 9

    # Floor
    ax_plan.add_patch(Rectangle((0, 0), Bx, By, fc=C['floor'], ec='none'))

    # Walls outline
    for r in [(-wt,-wt,Bx+2*wt,wt), (-wt,By,Bx+2*wt,wt), (-wt,0,wt,By), (Bx,0,wt,By),
              (4.5,-wt,wt,By+wt), (0,4.5,Bx,wt)]:
        ax_plan.add_patch(Rectangle((r[0],r[1]),r[2],r[3], fc=C['wall'], ec=C['wall_edge'], lw=0.5))

    # Room labels
    rooms = [
        (2.25, 6.75, "LIVING ROOM\n4.5 × 4.5 m", 7),
        (8.25, 6.75, "BEDROOM 1\n7.5 × 4.5 m", 6),
        (2.25, 2.25, "KITCHEN\n4.5 × 4.5 m", 6),
        (7.0, 2.25, "BEDROOM 2\n5.0 × 4.5 m", 6),
        (10.5, 2.25, "BATH\n1.5×4.5", 5),
    ]
    for rx, ry, txt, fs in rooms:
        ax_plan.text(rx, ry, txt, fontsize=fs, ha='center', va='center', color=C['dim'], fontstyle='italic')

    # Internal wall for bathroom
    ax_plan.add_patch(Rectangle((9.7, 0), wt, 4.5, fc=C['wall'], ec=C['wall_edge'], lw=0.5))

    # Doors
    for dx, dy, orient in [(1.5, -wt, 'h'), (1.5, 4.5, 'h'), (5.5, 4.5, 'h'), (4.5, 2.0, 'v'), (9.7, 2.0, 'v')]:
        if orient == 'h':
            ax_plan.add_patch(Rectangle((dx, dy), 1.0, wt, fc=C['door'], ec='#555', lw=0.5))
        else:
            ax_plan.add_patch(Rectangle((dx, dy), wt, 0.9, fc=C['door'], ec='#555', lw=0.5))

    # Windows
    for wx, wy, orient in [(6.0, By, 'h'), (9.0, By, 'h'), (-wt, 6.5, 'v'), (Bx, 6.5, 'v'),
                           (-wt, 2.0, 'v'), (Bx, 2.0, 'v')]:
        if orient == 'h':
            ax_plan.add_patch(Rectangle((wx, wy), 1.2, wt, fc=C['window'], ec=C['win_frame'], lw=0.5))
        else:
            ax_plan.add_patch(Rectangle((wx, wy), wt, 1.2, fc=C['window'], ec=C['win_frame'], lw=0.5))

    # Porch
    ax_plan.add_patch(Rectangle((0.5, -1.2), 3.5, 1.2, fc=C['porch'], ec=C['wall_edge'], lw=0.4, ls='--'))
    ax_plan.text(2.25, -0.6, "PORCH", fontsize=5, ha='center', color=C['dim'])

    # Dimensions
    dim_line(ax_plan, 0, 0, Bx, 0, "12000 mm", offset=1.2)
    dim_line(ax_plan, 0, 0, 0, By, "9000 mm", offset=1.4)

    ax_plan.axis('off')

    # ── 3D Isometric (bottom) ──
    ax3 = fig.add_axes([0.03, 0.07, 0.94, 0.46], projection='3d')
    setup_3d_ax(ax3, elev=26, azim=-48)
    ax3.set_title("Isometric 3D View", fontsize=8, fontweight='bold', pad=-8, color=C['text'])

    Lz = 3.2

    # Ground / site
    gnd = [[[- 2, -2, -0.05], [Bx+2, -2, -0.05], [Bx+2, By+2, -0.05], [-2, By+2, -0.05]]]
    ax3.add_collection3d(Poly3DCollection(gnd, facecolor=C['grass'], edgecolor=C['grass_dk'], lw=0.3, alpha=0.5))

    # Foundation
    box3d(ax3, -0.1, -0.1, -0.25, Bx+0.2, By+0.2, 0.25, C['concrete'], ec='#999')

    # Floor slab
    box3d(ax3, 0, 0, -0.05, Bx, By, 0.05, C['floor_tile'], ec='#BBB')

    # External walls
    box3d(ax3, 0, 0, 0, wt, By, Lz, C['wall'])        # left
    box3d(ax3, Bx-wt, 0, 0, wt, By, Lz, C['wall_dark'])  # right
    box3d(ax3, 0, By-wt, 0, Bx, wt, Lz, C['wall_dark'])  # back

    # Front wall segments (with door gap)
    box3d(ax3, 0, 0, 0, 1.5, wt, Lz, C['wall'])
    box3d(ax3, 2.5, 0, 0, Bx-2.5, wt, Lz, C['wall'])
    box3d(ax3, 1.5, 0, 2.1, 1.0, wt, Lz-2.1, C['wall'])
    door3d(ax3, 1.5, 0, 0, face='y', w=1.0, h=2.1)

    # Internal walls
    box3d(ax3, 4.5, 0, 0, wt, By, Lz, '#C8B898', ec='#888')
    box3d(ax3, 0, 4.5, 0, Bx, wt, Lz, '#C8B898', ec='#888')
    box3d(ax3, 9.7, 0, 0, wt, 4.5, Lz, '#C8B898', ec='#888')

    # Windows on external walls
    for wy in [2.0, 6.5]:
        window3d(ax3, 0, wy, 0.9, face='x', w=1.2, h=1.0)
        window3d(ax3, Bx-wt, wy, 0.9, face='x', w=1.2, h=1.0)
    window3d(ax3, 6.0, By-wt, 0.9, face='y', w=1.2, h=1.0)
    window3d(ax3, 9.0, By-wt, 0.9, face='y', w=1.2, h=1.0)

    # Porch
    box3d(ax3, 0.5, -1.2, -0.05, 3.5, 1.2, 0.10, C['porch'], ec='#AAA')
    # Porch columns
    for px in [0.6, 3.8]:
        box3d(ax3, px, -1.1, 0.05, 0.15, 0.15, 2.8, C['concrete'], ec='#999')
    # Porch roof
    box3d(ax3, 0.3, -1.4, 2.85, 3.9, 1.6, 0.08, C['concrete'], alpha=0.5, ec='#999')

    # Roof
    roof_gable(ax3, 0, 0, Lz, Bx, By, overhang=0.6, ridge_h=1.8)

    ax3.set_xlim(-2, Bx+2); ax3.set_ylim(-2, By+2); ax3.set_zlim(-1, Lz+3)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print('  [OK] Page 3 - Single-Storey')

# ═══════════════════════════════════════════════════════════════
#  PAGE 4: TWO-STOREY RESIDENTIAL BUILDING
# ═══════════════════════════════════════════════════════════════
def page_two_storey(pdf):
    fig = plt.figure(figsize=(8.27, 11.69), dpi=300)
    fig.patch.set_facecolor('white')
    add_title_block(fig, "TWO-STOREY (G+1) RESIDENTIAL BUILDING — Isometric 3D", "4", scale="1:100")

    ax = fig.add_axes([0.02, 0.07, 0.96, 0.86], projection='3d')
    setup_3d_ax(ax, elev=24, azim=-52)
    ax.set_title("G+1 Residential Building — Modern Elevation (10 m × 8 m)", fontsize=9,
                 fontweight='bold', pad=-2, color=C['text'])

    Bx, By = 10, 8
    Fz = 3.2   # floor height
    wt = 0.23
    slab = 0.15

    # ── Ground ──
    gnd = [[[-3, -3, -0.05], [Bx+3, -3, -0.05], [Bx+3, By+3, -0.05], [-3, By+3, -0.05]]]
    ax.add_collection3d(Poly3DCollection(gnd, facecolor=C['grass'], edgecolor=C['grass_dk'], lw=0.3, alpha=0.4))

    # ── Foundation ──
    box3d(ax, -0.15, -0.15, -0.3, Bx+0.3, By+0.3, 0.3, C['concrete'], ec='#888')

    # ═══ GROUND FLOOR ═══
    z0 = 0

    # Floor slab
    box3d(ax, 0, 0, z0-0.05, Bx, By, 0.05, C['floor_tile'], ec='#BBB')

    # External walls GF
    box3d(ax, 0, 0, z0, wt, By, Fz, C['wall'])          # left
    box3d(ax, Bx-wt, 0, z0, wt, By, Fz, C['wall_dark'])  # right
    box3d(ax, 0, By-wt, z0, Bx, wt, Fz, C['wall_dark'])  # back
    # Front wall GF (door gap)
    box3d(ax, 0, 0, z0, 2.0, wt, Fz, C['wall'])
    box3d(ax, 3.2, 0, z0, Bx-3.2, wt, Fz, C['wall'])
    box3d(ax, 2.0, 0, z0+2.2, 1.2, wt, Fz-2.2, C['wall'])
    door3d(ax, 2.0, 0, z0, face='y', w=1.2, h=2.2, color=C['door_lt'])

    # GF windows
    window3d(ax, 0, 2.5, z0+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 0, 5.5, z0+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, Bx-wt, 2.0, z0+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, Bx-wt, 5.5, z0+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 5.0, By-wt, z0+0.9, face='y', w=1.3, h=1.1)
    window3d(ax, 8.0, By-wt, z0+0.9, face='y', w=1.3, h=1.1)

    # Internal walls GF
    box3d(ax, 4.5, 0, z0, wt, By, Fz, '#C8B898', ec='#888')
    box3d(ax, 0, 4.0, z0, 4.5, wt, Fz, '#C8B898', ec='#888')

    # ── GF Staircase ──
    n_steps = 12
    st_x, st_y = 4.8, 0.3
    st_w, st_dy = 1.2, 0.2
    for s in range(n_steps):
        sz = z0 + s * (Fz / n_steps)
        sy = st_y + s * st_dy
        box3d(ax, st_x, sy, sz, st_w, st_dy, 0.04, C['stair'], ec='#999')

    # ═══ FIRST-FLOOR SLAB ═══
    z1 = Fz + slab
    box3d(ax, -0.1, -0.1, Fz, Bx+0.2, By+0.2, slab, C['concrete'], ec='#999')

    # ═══ FIRST FLOOR ═══
    # External walls FF
    box3d(ax, 0, 0, z1, wt, By, Fz, C['wall'])
    box3d(ax, Bx-wt, 0, z1, wt, By, Fz, C['wall_dark'])
    box3d(ax, 0, By-wt, z1, Bx, wt, Fz, C['wall_dark'])
    # Front wall FF (balcony door gap)
    box3d(ax, 0, 0, z1, 3.0, wt, Fz, C['wall'])
    box3d(ax, 4.5, 0, z1, Bx-4.5, wt, Fz, C['wall'])
    box3d(ax, 3.0, 0, z1+2.2, 1.5, wt, Fz-2.2, C['wall'])
    # Balcony door (glass)
    door3d(ax, 3.0, 0, z1, face='y', w=1.5, h=2.2, color=C['glass'])

    # FF windows
    window3d(ax, 0, 2.5, z1+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 0, 5.5, z1+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, Bx-wt, 2.0, z1+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, Bx-wt, 5.5, z1+0.9, face='x', w=1.3, h=1.1)
    window3d(ax, 5.0, By-wt, z1+0.9, face='y', w=1.3, h=1.1)
    window3d(ax, 8.0, By-wt, z1+0.9, face='y', w=1.3, h=1.1)

    # Internal walls FF
    box3d(ax, 5.0, 0, z1, wt, By, Fz, '#C8B898', ec='#888')

    # ── BALCONY ──
    bal_d = 1.5
    box3d(ax, 2.0, -bal_d, z1-0.05, 5.0, bal_d, 0.12, C['balcony'], ec='#999')
    # Balcony railing (front)
    for rx in np.linspace(2.0, 6.8, 12):
        box3d(ax, rx, -bal_d, z1+0.07, 0.05, 0.05, 1.0, C['steel'], ec='#777')
    box3d(ax, 2.0, -bal_d, z1+1.0, 5.0, 0.06, 0.05, C['steel'], ec='#777')
    # Side railing
    for ry in np.linspace(-bal_d, -0.1, 4):
        box3d(ax, 2.0, ry, z1+0.07, 0.05, 0.05, 1.0, C['steel'], ec='#777')
        box3d(ax, 6.95, ry, z1+0.07, 0.05, 0.05, 1.0, C['steel'], ec='#777')
    box3d(ax, 2.0, -bal_d, z1+1.0, 0.06, bal_d, 0.05, C['steel'], ec='#777')
    box3d(ax, 6.95, -bal_d, z1+1.0, 0.06, bal_d, 0.05, C['steel'], ec='#777')

    # ── FF Staircase (continued) ──
    for s in range(n_steps):
        sz = z1 + s * (Fz / n_steps)
        sy = st_y + s * st_dy
        box3d(ax, st_x, sy, sz, st_w, st_dy, 0.04, C['stair'], ec='#999')

    # ═══ ROOF SLAB / TERRACE ═══
    z2 = z1 + Fz
    box3d(ax, -0.1, -0.1, z2, Bx+0.2, By+0.2, slab, C['terrace'], ec='#888')

    # Terrace parapet
    par_h = 0.9
    box3d(ax, 0, 0, z2+slab, wt, By, par_h, C['wall'], alpha=0.7, ec='#999')
    box3d(ax, Bx-wt, 0, z2+slab, wt, By, par_h, C['wall_dark'], alpha=0.7, ec='#999')
    box3d(ax, 0, By-wt, z2+slab, Bx, wt, par_h, C['wall_dark'], alpha=0.7, ec='#999')
    box3d(ax, 0, 0, z2+slab, Bx, wt, par_h, C['wall'], alpha=0.7, ec='#999')

    # Stair headroom box on terrace
    box3d(ax, st_x-0.2, 0, z2+slab, st_w+0.4, 3.2, 2.5, C['wall'], alpha=0.6, ec='#999')
    # Small roof on stair box
    box3d(ax, st_x-0.4, -0.2, z2+slab+2.5, st_w+0.8, 3.6, 0.10, C['concrete'], alpha=0.5, ec='#999')

    # ── Entry porch GF ──
    box3d(ax, 1.0, -1.8, -0.05, 3.5, 1.8, 0.10, C['porch'], ec='#999')
    # Porch columns
    for px in [1.1, 4.3]:
        box3d(ax, px, -1.7, 0.05, 0.18, 0.18, Fz-0.3, C['concrete'], ec='#888')
    # Porch canopy
    box3d(ax, 0.8, -2.0, Fz-0.2, 3.9, 2.2, 0.10, C['concrete'], alpha=0.5, ec='#999')

    # Floor labels (annotation)
    ax.text(Bx/2, -2.5, 0, "GROUND FLOOR", fontsize=5, ha='center', color='#888')
    ax.text(Bx/2, -2.5, z1, "FIRST FLOOR", fontsize=5, ha='center', color='#888')
    ax.text(Bx/2, -2.5, z2+slab, "TERRACE", fontsize=5, ha='center', color='#888')

    ax.set_xlim(-3, Bx+3); ax.set_ylim(-3, By+3); ax.set_zlim(-1, z2+4)

    pdf.savefig(fig, dpi=300)
    plt.close(fig)
    print('  [OK] Page 4 - Two-Storey')


# ═══════════════════════════════════════════════════════════════
#  MAIN: Generate PDF
# ═══════════════════════════════════════════════════════════════
def main():
    print("=" * 55)
    print("  BIM Architectural Drawings Generator")
    print("  Output: " + PDF_PATH)
    print("=" * 55)

    with PdfPages(PDF_PATH) as pdf:
        page_hall(pdf)
        page_kitchen(pdf)
        page_single_storey(pdf)
        page_two_storey(pdf)

    print('\n' + '=' * 55)
    print(f'  PDF saved: {PDF_PATH}')
    print(f'  Pages: 4 | DPI: 300 | Size: A4')
    print('=' * 55)

if __name__ == "__main__":
    main()
