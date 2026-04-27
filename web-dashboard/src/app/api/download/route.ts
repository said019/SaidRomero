import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT * FROM log_data ORDER BY id ASC`
    );

    const rows = result.rows;
    if (rows.length === 0) {
      return new NextResponse('No hay datos aún', { status: 404 });
    }

    const headers = [
      'id','fecha_hora',
      'v','i','p','t','ah','av','st','ec','mp','pp','ef',
      'ghi','dni','irrh','cielo',
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
        fmt(row.v, 4),
        fmt(row.i, 3),
        fmt(row.p, 3),
        fmt(row.t, 2),
        row.ah,
        row.av,
        row.st,
        row.ec,
        fmt(row.mp, 2),
        fmt(row.pp, 2),
        fmt(row.ef, 1),
        fmt(row.ghi, 1),
        fmt(row.dni, 1),
        row.irrh,
        row.cielo,
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
