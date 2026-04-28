import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let historyQuery = `SELECT * FROM log_data ORDER BY id ASC`;
    const queryParams: any[] = [];

    if (start && end) {
      historyQuery = `
        SELECT * FROM log_data
        WHERE created_at >= $1 AND created_at <= $2
        ORDER BY id ASC
      `;
      queryParams.push(start, end);
    }

    const result = await pool.query(historyQuery, queryParams);

    const rows = result.rows;
    if (rows.length === 0) {
      return new NextResponse('No hay datos aún', { status: 404 });
    }

    const headers = [
      'id','fecha_hora',
      'v','i','p','t','ah','av','st','ec','mp','pp','ef',
      'ghi','dni','irrh','cielo',
      'ltl','ltr','lbl','lbr',
      'pf_mW','poaf_W_m2','gan_pct',
      'emv_Wh','efj_Wh',
      'els_deg','azs_deg','eta_celda','tilt_fijo_deg'
    ];
    const lines = [headers.join(',')];

    const fmt = (v: any, d: number) =>
      v === null || v === undefined ? '' : Number(v).toFixed(d);

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
        row.cielo,
        row.ltl ?? '',
        row.ltr ?? '',
        row.lbl ?? '',
        row.lbr ?? '',
        fmt(row.pf, 3),
        fmt(row.poaf, 1),
        fmt(row.gan, 1),
        fmt(row.emv, 4),
        fmt(row.efj, 4),
        fmt(row.els, 1),
        fmt(row.azs, 1),
        fmt(row.eta, 4),
        fmt(row.tlt, 1),
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
