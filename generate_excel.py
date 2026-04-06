import pandas as pd
import numpy as np
import datetime
from sqlalchemy import create_engine

DB_URL = "postgresql://967876762302e8f61f375dade6e3590d13984f254152e6c6483484c40863d8dd:sk_R8-NsgqrvnGvTsTf8j60W@db.prisma.io:5432/postgres?sslmode=require"
engine = create_engine(DB_URL)

query = """
SELECT id, created_at, v as voltage, i as current, p as power, t as temperature, 
       ghi as global_radiation, dni as direct_radiation, 
       ltl, ltr, lbl, lbr 
FROM log_data 
WHERE created_at >= '2026-03-24' AND created_at < '2026-03-30'
ORDER BY created_at ASC
"""

print("Fetching data from the database...")
df = pd.read_sql(query, engine)

print(f"Data fetched: {len(df)} records.")

# Apply timezone fix if needed, convert to naive datetime for excel
df['created_at'] = pd.to_datetime(df['created_at']).dt.tz_localize(None)

# Calculate solar radiation if missing or 0
missing_ghi = (df['global_radiation'].isnull()) | (df['global_radiation'] == 0)
# Formula from source: ghi = (p / factorTemp) * 0.5, assuming factorTemp ~ 1.0 (potencia_mW * 0.5)
df.loc[missing_ghi, 'global_radiation'] = df.loc[missing_ghi, 'power'] * 0.5

missing_dni = (df['direct_radiation'].isnull()) | (df['direct_radiation'] == 0)
df.loc[missing_dni, 'direct_radiation'] = df.loc[missing_dni, 'global_radiation'] * 0.8

# Ensure values are sensible. E.g if p=0, then radiation = 0
df.loc[df['global_radiation'] < 0, 'global_radiation'] = 0

print(f"Filled {missing_ghi.sum()} records with calculated solar radiation.")

excel_file = "Datos_Rastreador_Solar_Marzo.xlsx"
writer = pd.ExcelWriter(excel_file, engine='xlsxwriter')
df.to_excel(writer, sheet_name='Datos', index=False)

workbook = writer.book
worksheet = writer.sheets['Datos']

# Formatting for datetimes to look good in Excel
date_format = workbook.add_format({'num_format': 'yyyy-mm-dd hh:mm:ss'})
worksheet.set_column('B:B', 20, date_format)

num_rows = len(df) + 1  # Including header

# --- Chart 1: Solar Radiation & Power ---
chart_rad = workbook.add_chart({'type': 'line'})
# Configure the chart series for power
chart_rad.add_series({
    'name': 'Power (mW)',
    'categories': ['Datos', 1, 1, num_rows, 1], # timestamp column B
    'values': ['Datos', 1, 4, num_rows, 4],     # power column E
    'line': {'color': 'blue'}
})
# Configure for GHI
chart_rad.add_series({
    'name': 'Solar Radiation GHI (W/m²)',
    'categories': ['Datos', 1, 1, num_rows, 1],
    'values': ['Datos', 1, 6, num_rows, 6],     # ghi column G
    'y2_axis': True,                            # Map to secondary Y axis
    'line': {'color': 'orange'}
})
chart_rad.set_title({'name': 'Potencia vs Radiación Solar'})
chart_rad.set_x_axis({'name': 'Tiempo', 'date_axis': True})
chart_rad.set_y_axis({'name': 'Potencia (mW)'})
chart_rad.set_y2_axis({'name': 'Radiación Solar (W/m²)'})
chart_rad.set_size({'width': 800, 'height': 400})
worksheet.insert_chart('O2', chart_rad)

# --- Chart 2: Voltage & Current ---
chart_vi = workbook.add_chart({'type': 'line'})
chart_vi.add_series({
    'name': 'Voltage (V)',
    'categories': ['Datos', 1, 1, num_rows, 1],
    'values': ['Datos', 1, 2, num_rows, 2],     # voltage column C
    'line': {'color': 'red'}
})
chart_vi.add_series({
    'name': 'Current (mA)',
    'categories': ['Datos', 1, 1, num_rows, 1],
    'values': ['Datos', 1, 3, num_rows, 3],     # current column D
    'y2_axis': True,
    'line': {'color': 'green'}
})
chart_vi.set_title({'name': 'Voltage vs Current'})
chart_vi.set_size({'width': 800, 'height': 400})
worksheet.insert_chart('O24', chart_vi)

# --- Chart 3: Temperature ---
chart_temp = workbook.add_chart({'type': 'line'})
chart_temp.add_series({
    'name': 'Temperature (°C)',
    'categories': ['Datos', 1, 1, num_rows, 1],
    'values': ['Datos', 1, 5, num_rows, 5],     # temperature column F
    'line': {'color': 'purple'}
})
chart_temp.set_title({'name': 'Temperature'})
chart_temp.set_size({'width': 800, 'height': 200})
worksheet.insert_chart('O46', chart_temp)

writer.close()
print(f"Successfully created excel file: {excel_file}")
