import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Returns all unique dates that have records, ordered descending
    const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE(created_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') AS fecha,
        COUNT(*) AS registros
      FROM log_data
      GROUP BY DATE(created_at AT TIME ZONE 'America/Mexico_City')
      ORDER BY DATE(created_at AT TIME ZONE 'America/Mexico_City') DESC
    `);

    return NextResponse.json({ success: true, days: result.rows });
  } catch (err: any) {
    console.error('Error fetching days:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
