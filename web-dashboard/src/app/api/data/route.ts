import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let historyQuery: string;
    const queryParams: any[] = [];

    if (start && end) {
      // Filter by date range — return ALL records in range
      historyQuery = `
        SELECT * FROM log_data 
        WHERE created_at >= $1 AND created_at <= $2 
        ORDER BY id ASC
      `;
      queryParams.push(start, end);
    } else {
      // Default: last 200 records for live view
      historyQuery = `
        SELECT * FROM (
          SELECT * FROM log_data ORDER BY id DESC LIMIT 200
        ) sub ORDER BY id ASC
      `;
    }

    const result = await pool.query(historyQuery, queryParams);

    // Always fetch the absolute latest record for dashboard gauges/indicators
    const latestResult = await pool.query(`SELECT * FROM log_data ORDER BY id DESC LIMIT 1`);

    const history = result.rows;
    const latest = latestResult.rows.length > 0 ? latestResult.rows[0] : null;

    return NextResponse.json({ success: true, history, latest });
  } catch (err: any) {
    console.error("Error fetching data:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
