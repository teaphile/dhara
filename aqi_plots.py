"""
AQI Agreement & Performance Plots - Publication Quality
========================================================
Generates 8 pairs of plots (Agreement + Performance) from real Excel data.
Each sheet produces one high-res PNG with two subplots.
All data is read directly from the Excel file - NO synthetic/fake data.

Author : Karn Agarwal (2301296)
Dept   : Civil Engineering, Dayalbagh University, Agra
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
from scipy import stats
import os
import warnings
warnings.filterwarnings('ignore')

# ============================================================
#  PATHS
# ============================================================
EXCEL_PATH = r"C:\Users\HP\OneDrive\Desktop\research papers 2026\AQI PAPER\AGREEMENT GRAPHS\M5P TRAINING 1.xlsx"
OUT_DIR    = r"C:\Users\HP\OneDrive\Desktop\research papers 2026\AQI PAPER\AGREEMENT GRAPHS\output_plots"
os.makedirs(OUT_DIR, exist_ok=True)

# ============================================================
#  SHEET METADATA (from inspection)
# ============================================================
SHEET_META = {
    'Sheet1': {'model': 'M5P',           'type': 'Training', 'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': 'inst#'},
    'Sheet2': {'model': 'M5P',           'type': 'Testing',  'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
    'Sheet3': {'model': 'Random Forest', 'type': 'Training', 'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
    'Sheet4': {'model': 'Random Forest', 'type': 'Testing',  'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
    'Sheet5': {'model': 'Random Tree',   'type': 'Training', 'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
    'Sheet6': {'model': 'REP Tree',      'type': 'Testing',  'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
    'Sheet7': {'model': 'REP Tree',      'type': 'Training', 'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
    'Sheet8': {'model': 'REP Tree',      'type': 'Testing',  'actual_col': 'actual', 'pred_col': 'predicted', 'idx_col': None},
}

# ============================================================
#  STYLE CONFIG  (Springer / Elsevier journal style)
# ============================================================
MARKERS  = ['o', 's', '^', 'D', 'v', 'p', 'h', '*']
COLORS_A = ['#2166AC', '#D6604D', '#4DAF4A', '#984EA3', '#FF7F00', '#A65628', '#377EB8', '#E41A1C']
COLORS_P = [('#1B7837', '#762A83'), ('#2166AC', '#B2182B'), ('#1B9E77', '#D95F02'),
            ('#7570B3', '#E7298A'), ('#66A61E', '#E6AB02'), ('#A6761D', '#666666'),
            ('#E41A1C', '#377EB8'), ('#4DAF4A', '#984EA3')]

plt.rcParams.update({
    'font.family'       : 'serif',
    'font.serif'        : ['Times New Roman', 'DejaVu Serif', 'Georgia'],
    'font.size'         : 11,
    'axes.labelsize'    : 13,
    'axes.titlesize'    : 14,
    'xtick.labelsize'   : 11,
    'ytick.labelsize'   : 11,
    'legend.fontsize'   : 10,
    'figure.titlesize'  : 15,
    'axes.linewidth'    : 1.0,
    'xtick.major.width' : 0.8,
    'ytick.major.width' : 0.8,
    'xtick.minor.width' : 0.5,
    'ytick.minor.width' : 0.5,
    'xtick.direction'   : 'in',
    'ytick.direction'   : 'in',
    'xtick.major.pad'   : 5,
    'ytick.major.pad'   : 5,
    'axes.grid'         : True,
    'grid.alpha'        : 0.3,
    'grid.linewidth'    : 0.5,
    'grid.linestyle'    : '--',
    'savefig.dpi'       : 300,
    'savefig.bbox'      : 'tight',
    'savefig.pad_inches': 0.15,
})


def compute_metrics(actual, predicted):
    """Compute statistical evaluation metrics."""
    n = len(actual)
    # Correlation coefficient
    cc = np.corrcoef(actual, predicted)[0, 1]
    # R-squared
    ss_res = np.sum((actual - predicted) ** 2)
    ss_tot = np.sum((actual - np.mean(actual)) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot != 0 else 0
    # MAE
    mae = np.mean(np.abs(actual - predicted))
    # RMSE
    rmse = np.sqrt(np.mean((actual - predicted) ** 2))
    # NSE (Nash-Sutcliffe Efficiency)
    nse = 1 - ss_res / ss_tot if ss_tot != 0 else 0
    # MAPE
    mask = actual != 0
    mape = np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100 if mask.any() else np.nan
    return {
        'CC': cc, 'R2': r2, 'MAE': mae, 'RMSE': rmse,
        'NSE': nse, 'MAPE': mape, 'N': n
    }


def plot_agreement(ax, actual, predicted, metrics, model, dtype, marker, color, fig_num):
    """
    Agreement / Scatter plot with 1:1 line, regression line, and metrics.
    Style: similar to Springer journal agreement plots.
    """
    # Scatter
    ax.scatter(actual, predicted, s=14, alpha=0.45, marker=marker,
               edgecolors=color, facecolors='none', linewidths=0.6,
               label='Data points', zorder=3)

    # Axis range - symmetric
    all_vals = np.concatenate([actual, predicted])
    vmin = max(0, np.floor(np.min(all_vals) / 10) * 10 - 10)
    vmax = np.ceil(np.max(all_vals) / 10) * 10 + 10
    ax.set_xlim(vmin, vmax)
    ax.set_ylim(vmin, vmax)

    # 1:1 perfect agreement line
    ax.plot([vmin, vmax], [vmin, vmax], 'k-', lw=1.2, alpha=0.8,
            label='1:1 Line', zorder=2)

    # Linear regression line
    slope, intercept, r_val, p_val, std_err = stats.linregress(actual, predicted)
    x_fit = np.linspace(vmin, vmax, 100)
    y_fit = slope * x_fit + intercept
    ax.plot(x_fit, y_fit, '--', color='#D62728', lw=1.3, alpha=0.85,
            label=f'Regression (y = {slope:.3f}x + {intercept:.2f})', zorder=2)

    # Metrics text box
    txt_lines = [
        f"CC = {metrics['CC']:.4f}",
        f"R$^2$ = {metrics['R2']:.4f}",
        f"RMSE = {metrics['RMSE']:.2f}",
        f"MAE = {metrics['MAE']:.2f}",
        f"N = {metrics['N']}",
    ]
    txt = '\n'.join(txt_lines)
    props = dict(boxstyle='round,pad=0.4', facecolor='#FAFAFA', edgecolor='#CCCCCC',
                 alpha=0.92, linewidth=0.6)
    ax.text(0.05, 0.95, txt, transform=ax.transAxes, fontsize=9,
            verticalalignment='top', bbox=props, family='monospace')

    # Labels
    ax.set_xlabel('Observed AQI', fontweight='bold')
    ax.set_ylabel('Predicted AQI', fontweight='bold')
    ax.set_title(f'({chr(96+fig_num)}a) Agreement Plot: {model} ({dtype})',
                 fontweight='bold', pad=10)

    # Legend
    ax.legend(loc='lower right', framealpha=0.9, edgecolor='#CCC',
              fontsize=8.5, handlelength=2, borderpad=0.5)

    # Ticks
    ax.xaxis.set_minor_locator(ticker.AutoMinorLocator(2))
    ax.yaxis.set_minor_locator(ticker.AutoMinorLocator(2))
    ax.tick_params(which='both', top=True, right=True)
    ax.set_aspect('equal', adjustable='box')


def plot_performance(ax, actual, predicted, model, dtype, colors, fig_num):
    """
    Time-series performance plot: Actual vs Predicted over sample index.
    Style: clean dual-line with distinct markers.
    """
    n = len(actual)
    idx = np.arange(1, n + 1)

    # For very large datasets, subsample for marker clarity
    if n > 200:
        step = max(1, n // 80)
        mk_idx = np.arange(0, n, step)
    else:
        step = max(1, n // 40)
        mk_idx = np.arange(0, n, step)

    c_act, c_pred = colors

    # Actual
    ax.plot(idx, actual, '-', color=c_act, lw=1.0, alpha=0.85, label='Observed AQI', zorder=2)
    ax.plot(idx[mk_idx], actual[mk_idx], 'o', color=c_act, markersize=3.5,
            markerfacecolor='white', markeredgewidth=0.7, zorder=3)

    # Predicted
    ax.plot(idx, predicted, '--', color=c_pred, lw=1.0, alpha=0.85, label='Predicted AQI', zorder=2)
    ax.plot(idx[mk_idx], predicted[mk_idx], 's', color=c_pred, markersize=3.2,
            markerfacecolor='white', markeredgewidth=0.7, zorder=3)

    ax.set_xlabel('Sample Index', fontweight='bold')
    ax.set_ylabel('AQI Value', fontweight='bold')
    ax.set_title(f'({chr(96+fig_num)}b) Performance Plot: {model} ({dtype})',
                 fontweight='bold', pad=10)

    ax.legend(loc='upper right', framealpha=0.9, edgecolor='#CCC',
              fontsize=9, ncol=2, handlelength=2.5)

    ax.xaxis.set_minor_locator(ticker.AutoMinorLocator(2))
    ax.yaxis.set_minor_locator(ticker.AutoMinorLocator(2))
    ax.tick_params(which='both', top=True, right=True)

    # Y-axis range
    all_vals = np.concatenate([actual, predicted])
    ymin = max(0, np.min(all_vals) - 20)
    ymax = np.max(all_vals) + 20
    ax.set_ylim(ymin, ymax)
    ax.set_xlim(1, n)


# ============================================================
#  MAIN
# ============================================================
def main():
    print("=" * 62)
    print("  AQI Agreement & Performance Plots Generator")
    print("  Data-driven | Publication Quality | 300 DPI")
    print("=" * 62)
    print(f"  Excel : {EXCEL_PATH}")
    print(f"  Output: {OUT_DIR}")
    print()

    # Load all sheets
    xl = pd.ExcelFile(EXCEL_PATH)
    sheet_names = xl.sheet_names
    print(f"  Found {len(sheet_names)} sheets: {sheet_names}")
    print()

    metrics_summary = []

    for i, sname in enumerate(sheet_names):
        meta = SHEET_META.get(sname)
        if meta is None:
            print(f"  [SKIP] Sheet '{sname}' - no metadata defined")
            continue

        model = meta['model']
        dtype = meta['type']

        # Read data
        df = pd.read_excel(EXCEL_PATH, sheet_name=sname)
        # Clean column names
        df.columns = [str(c).strip().lower() for c in df.columns]

        # Find actual and predicted columns
        actual_col = None
        pred_col = None
        for col in df.columns:
            if 'actual' in col:
                actual_col = col
            elif 'predicted' in col or 'predict' in col:
                pred_col = col

        if actual_col is None or pred_col is None:
            print(f"  [ERROR] Sheet '{sname}' - cannot find actual/predicted columns: {list(df.columns)}")
            continue

        # Extract and clean
        data = df[[actual_col, pred_col]].dropna()
        actual = data[actual_col].values.astype(float)
        predicted = data[pred_col].values.astype(float)

        if len(actual) == 0:
            print(f"  [ERROR] Sheet '{sname}' - no valid data rows")
            continue

        print(f"  Sheet {i+1}: {sname} | {model} {dtype} | N={len(actual)}", end='')

        # Compute metrics
        metrics = compute_metrics(actual, predicted)
        metrics_summary.append({'Sheet': sname, 'Model': model, 'Type': dtype, **metrics})
        print(f" | CC={metrics['CC']:.4f} | R2={metrics['R2']:.4f} | RMSE={metrics['RMSE']:.2f}")

        # ─── CREATE FIGURE ───
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14.5, 5.8))
        fig.subplots_adjust(wspace=0.32, left=0.06, right=0.97, top=0.88, bottom=0.13)

        # Suptitle
        fig.suptitle(f"Figure {i+1}: {model} Model - {dtype} Dataset",
                     fontsize=14, fontweight='bold', y=0.97)

        # Agreement plot
        plot_agreement(ax1, actual, predicted, metrics, model, dtype,
                       MARKERS[i % len(MARKERS)], COLORS_A[i % len(COLORS_A)], i+1)

        # Performance plot
        plot_performance(ax2, actual, predicted, model, dtype,
                         COLORS_P[i % len(COLORS_P)], i+1)

        # Save
        fname = f"Fig{i+1}_{model.replace(' ','_')}_{dtype}.png"
        fpath = os.path.join(OUT_DIR, fname)
        fig.savefig(fpath, dpi=300, facecolor='white', edgecolor='none')
        plt.close(fig)
        print(f"    -> Saved: {fname}")

    # ─── METRICS SUMMARY TABLE ───
    print("\n" + "=" * 82)
    print("  METRICS SUMMARY")
    print("=" * 82)
    print(f"  {'Sheet':<10} {'Model':<16} {'Type':<10} {'CC':>8} {'R2':>8} {'RMSE':>8} {'MAE':>8} {'N':>6}")
    print("  " + "-" * 76)
    for m in metrics_summary:
        print(f"  {m['Sheet']:<10} {m['Model']:<16} {m['Type']:<10} "
              f"{m['CC']:>8.4f} {m['R2']:>8.4f} {m['RMSE']:>8.2f} {m['MAE']:>8.2f} {m['N']:>6}")
    print("=" * 82)

    # Save metrics to CSV
    metrics_df = pd.DataFrame(metrics_summary)
    csv_path = os.path.join(OUT_DIR, "metrics_summary.csv")
    metrics_df.to_csv(csv_path, index=False)
    print(f"\n  Metrics CSV: {csv_path}")

    # ─── COMBINED COMPARISON FIGURE ───
    # A single figure showing all models side by side for comparison
    fig_comp, axes_comp = plt.subplots(2, 4, figsize=(20, 10))
    fig_comp.suptitle("AQI Prediction: All Models - Agreement Plots Comparison",
                      fontsize=16, fontweight='bold', y=0.98)
    fig_comp.subplots_adjust(wspace=0.35, hspace=0.40, top=0.92, bottom=0.08,
                             left=0.05, right=0.97)

    for idx, sname in enumerate(sheet_names):
        if idx >= 8:
            break
        meta = SHEET_META.get(sname)
        if meta is None:
            continue

        df = pd.read_excel(EXCEL_PATH, sheet_name=sname)
        df.columns = [str(c).strip().lower() for c in df.columns]
        actual_col = pred_col = None
        for col in df.columns:
            if 'actual' in col: actual_col = col
            elif 'predicted' in col: pred_col = col
        if actual_col is None or pred_col is None:
            continue

        data = df[[actual_col, pred_col]].dropna()
        actual = data[actual_col].values.astype(float)
        predicted = data[pred_col].values.astype(float)
        metrics = compute_metrics(actual, predicted)

        row, col_idx = divmod(idx, 4)
        ax_c = axes_comp[row, col_idx]

        # Scatter
        ax_c.scatter(actual, predicted, s=8, alpha=0.35,
                     marker=MARKERS[idx % len(MARKERS)],
                     edgecolors=COLORS_A[idx % len(COLORS_A)],
                     facecolors='none', linewidths=0.4)

        # 1:1
        all_v = np.concatenate([actual, predicted])
        vmin = max(0, np.min(all_v) - 10)
        vmax = np.max(all_v) + 10
        ax_c.plot([vmin, vmax], [vmin, vmax], 'k-', lw=0.8, alpha=0.7)

        # Regression
        slope, intercept, _, _, _ = stats.linregress(actual, predicted)
        xf = np.linspace(vmin, vmax, 50)
        ax_c.plot(xf, slope*xf + intercept, '--', color='#D62728', lw=0.9, alpha=0.8)

        ax_c.set_xlim(vmin, vmax)
        ax_c.set_ylim(vmin, vmax)
        ax_c.set_aspect('equal', adjustable='box')
        ax_c.set_title(f"{meta['model']} ({meta['type']})", fontsize=10, fontweight='bold')
        ax_c.set_xlabel('Observed', fontsize=9)
        ax_c.set_ylabel('Predicted', fontsize=9)
        ax_c.tick_params(labelsize=8)

        # Small metrics
        txt = f"R$^2$={metrics['R2']:.3f}\nCC={metrics['CC']:.3f}"
        ax_c.text(0.05, 0.92, txt, transform=ax_c.transAxes, fontsize=7.5,
                  va='top', bbox=dict(boxstyle='round,pad=0.3', fc='white', ec='#DDD', alpha=0.9))

    comp_path = os.path.join(OUT_DIR, "Fig_ALL_Agreement_Comparison.png")
    fig_comp.savefig(comp_path, dpi=300, facecolor='white')
    plt.close(fig_comp)
    print(f"  Comparison plot: {comp_path}")

    print("\n  [DONE] All plots generated successfully!")
    print(f"  Output folder: {OUT_DIR}")


if __name__ == "__main__":
    main()
