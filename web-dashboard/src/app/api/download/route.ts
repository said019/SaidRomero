import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT * FROM log_data ORDER BY id ASC`
    );

    const rows = result.rows;
    if (rows.length === 0) {
      return new NextResponse('No hay datos aún', { status: 404 });
    }

    // Build CSV header
    const headers = ['id','fecha_hora','v','i','p','t','ah','av','st','ec','mp','pp','ef','ghi','dni','irrh','cielo'];
    const lines = [headers.join(',')];

    for (const row of rows) {
      const fecha = new Date(row.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
      lines.push([
        row.id,
        `"${fecha}"`,
        row.v?.toFixed(4),
        row.i?.toFixed(3),
        row.p?.toFixed(3),
        row.t?.toFixed(2),
        row.ah,
        row.av,
        row.st,
        row.ec,
        row.mp?.toFixed(2),
        row.pp?.toFixed(2),
        row.ef?.toFixed(1),
        row.ghi?.toFixed(1),
        row.dni?.toFixed(1),
        row.irrh,
        row.cielo
      ].join(','));
    }

    const csv = lines.join('\n');
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="solar_tracker_${new Date().toISOString().slice(0,10)}.csv"`,
      }
    });
  } catch (err: any) {
    console.error("Error generating CSV:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
