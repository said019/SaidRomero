import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch the latest 80 points to draw the chart, ordered chronologically (newest at the end)
    const result = await pool.query(`
      SELECT * FROM (
        SELECT * FROM log_data ORDER BY id DESC LIMIT 80
      ) sub ORDER BY id ASC
    `);

    // Fetch the single absolute latest state for dashboard gauges
    const latestResult = await pool.query(`SELECT * FROM log_data ORDER BY id DESC LIMIT 1`);

    const history = result.rows;
    const latest = latestResult.rows.length > 0 ? latestResult.rows[0] : null;

    return NextResponse.json({ success: true, history, latest });
  } catch (err: any) {
    console.error("Error fetching data:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
