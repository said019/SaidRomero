import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const format = searchParams.get('format'); // null | 'csv'

    // Agregaciones por día (zona horaria México)
    // emv/efj se acumulan durante el día, así que MAX por día = total del día
    const result = await pool.query(`
      WITH per_day AS (
        SELECT
          TO_CHAR(DATE(created_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') AS fecha,
          COUNT(*)                                  AS registros,
          MAX(emv)                                  AS e_movil_wh,
          MAX(efj)                                  AS e_fijo_wh,
          MAX(p)                                    AS p_movil_pico_mw,
          MAX(pf)                                   AS p_fijo_pico_mw,
          AVG(p) FILTER (WHERE p > 1)               AS p_movil_prom_mw,
          AVG(pf) FILTER (WHERE pf > 1)             AS p_fijo_prom_mw,
          MAX(ghi)                                  AS ghi_max,
          MAX(dni)                                  AS dni_max,
          AVG(t)                                    AS t_prom,
          MAX(t)                                    AS t_max,
          AVG(eta) FILTER (WHERE eta > 0.001)       AS eta_prom,
          MAX(els)                                  AS els_max,
          COUNT(*) FILTER (WHERE st = 0)            AS reg_normal,
          COUNT(*) FILTER (WHERE st = 3)            AS reg_sin_sol
        FROM log_data
        GROUP BY DATE(created_at AT TIME ZONE 'America/Mexico_City')
        ORDER BY DATE(created_at AT TIME ZONE 'America/Mexico_City') DESC
        LIMIT $1
      )
      SELECT
        *,
        CASE WHEN e_fijo_wh > 0.0001
             THEN ROUND(((e_movil_wh - e_fijo_wh) / e_fijo_wh * 100)::numeric, 2)
             ELSE 0 END AS ganancia_pct
      FROM per_day
      ORDER BY fecha ASC
    `, [days]);

    const rows = result.rows;

    // Totales semanales
    const totals = rows.reduce((acc: any, r: any) => {
      acc.e_movil_total += parseFloat(r.e_movil_wh) || 0;
      acc.e_fijo_total  += parseFloat(r.e_fijo_wh)  || 0;
      acc.dias++;
      return acc;
    }, { e_movil_total: 0, e_fijo_total: 0, dias: 0 });
    totals.ganancia_avg = totals.e_fijo_total > 0
      ? +(((totals.e_movil_total - totals.e_fijo_total) / totals.e_fijo_total) * 100).toFixed(2)
      : 0;
    totals.e_movil_total = +totals.e_movil_total.toFixed(3);
    totals.e_fijo_total  = +totals.e_fijo_total.toFixed(3);

    // CSV export
    if (format === 'csv') {
      const headers = [
        'fecha','registros',
        'E_movil_Wh','E_fijo_Wh','Ganancia_%',
        'P_movil_pico_mW','P_fijo_pico_mW','P_movil_prom_mW','P_fijo_prom_mW',
        'GHI_max_W_m2','DNI_max_W_m2','T_prom_C','T_max_C',
        'Eta_prom','Els_max_deg','Reg_normal','Reg_sin_sol'
      ];
      const lines = [headers.join(',')];
      for (const r of rows) {
        lines.push([
          r.fecha, r.registros,
          (+r.e_movil_wh).toFixed(3), (+r.e_fijo_wh).toFixed(3), (+r.ganancia_pct).toFixed(2),
          (+r.p_movil_pico_mw).toFixed(2), (+r.p_fijo_pico_mw).toFixed(2),
          (+r.p_movil_prom_mw).toFixed(2), (+r.p_fijo_prom_mw).toFixed(2),
          (+r.ghi_max).toFixed(0), (+r.dni_max).toFixed(0),
          (+r.t_prom).toFixed(1), (+r.t_max).toFixed(1),
          (+r.eta_prom).toFixed(4), (+r.els_max).toFixed(1),
          r.reg_normal, r.reg_sin_sol
        ].join(','));
      }
      // Línea de totales
      lines.push('');
      lines.push(`TOTAL_SEMANA,${totals.dias} dias,${totals.e_movil_total},${totals.e_fijo_total},${totals.ganancia_avg}`);

      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="solar_summary_${new Date().toISOString().slice(0,10)}.csv"`,
        }
      });
    }

    return NextResponse.json({ success: true, days: rows, totals });
  } catch (err: any) {
    console.error('Error fetching summary:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
