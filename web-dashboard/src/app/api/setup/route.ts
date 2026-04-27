import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS log_data (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        v REAL,
        i REAL,
        p REAL,
        t REAL,
        ah INTEGER,
        av INTEGER,
        st INTEGER,
        ec INTEGER,
        mp REAL,
        pp REAL,
        ef REAL,
        ghi REAL,
        dni REAL,
        irrh VARCHAR(10),
        cielo VARCHAR(50)
      );
    `;
    await pool.query(createTableQuery);

    // Migración aditiva: columnas para comparación con panel fijo simulado.
    // ADD COLUMN IF NOT EXISTS es idempotente — seguro de re-ejecutar.
    const alterStatements = [
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS pf   REAL`,   // P panel fijo (mW)
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS poaf REAL`,   // POA fijo (W/m²)
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS gan  REAL`,   // ganancia % seguidor vs fijo
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS emv  REAL`,   // energía móvil (Wh)
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS efj  REAL`,   // energía fijo (Wh)
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS els  REAL`,   // elevación solar (°)
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS azs  REAL`,   // azimut solar (°)
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS eta  REAL`,   // η celda auto-calibrado
      `ALTER TABLE log_data ADD COLUMN IF NOT EXISTS tlt  REAL`,   // tilt fijo (°)
    ];
    for (const stmt of alterStatements) {
      await pool.query(stmt);
    }

    return NextResponse.json({
      success: true,
      message: "Tabla 'log_data' lista (con columnas de comparación panel fijo)."
    });
  } catch (err: any) {
    console.error("Database Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
