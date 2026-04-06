import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Returns all unique dates that have records, ordered descending
    const result = await pool.query(`
      SELECT 
        DATE(created_at AT TIME ZONE 'America/Mexico_City') AS fecha,
        COUNT(*) AS registros,
        MIN(created_at) AS primer_registro,
        MAX(created_at) AS ultimo_registro
      FROM log_data
      GROUP BY DATE(created_at AT TIME ZONE 'America/Mexico_City')
      ORDER BY fecha DESC
    `);

    return NextResponse.json({ success: true, days: result.rows });
  } catch (err: any) {
    console.error('Error fetching days:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
