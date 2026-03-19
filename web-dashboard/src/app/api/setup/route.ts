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

    return NextResponse.json({ success: true, message: "Table 'log_data' created successfully." });
  } catch (err: any) {
    console.error("Database Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
