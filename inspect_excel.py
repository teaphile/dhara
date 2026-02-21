import pandas as pd, sys

path = r"C:\Users\HP\OneDrive\Desktop\research papers 2026\AQI PAPER\AGREEMENT GRAPHS\M5P TRAINING 1.xlsx"
xls = pd.ExcelFile(path)
print("=== SHEETS ===")
for s in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=s)
    print(f"\nSheet: '{s}'  |  Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(df.head(5).to_string())
    print(f"dtypes:\n{df.dtypes}")
