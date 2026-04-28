import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Check if recording is enabled
    let recording = true;
    try {
      const ctrl = await pool.query(
        `SELECT value FROM system_control WHERE key = 'recording'`
      );
      if (ctrl.rows.length > 0) recording = ctrl.rows[0].value === 'true';
    } catch {
      // system_control table might not exist yet — allow recording
      recording = true;
    }

    if (!recording) {
      return NextResponse.json({ success: false, message: 'Recording is OFF' }, { status: 403 });
    }

    const data = await req.json();

    const result = await pool.query(
      `INSERT INTO log_data
        (v, i, p, t, ah, av, st, ec, mp, pp, ef, ghi, dni, irrh, cielo,
         ltl, ltr, lbl, lbr,
         pf, poaf, gan, emv, efj, els, azs, eta, tlt)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19,
         $20, $21, $22, $23, $24, $25, $26, $27, $28)
       RETURNING id`,
      [
        data.v, data.i, data.p, data.t,
        data.ah, data.av, data.st, data.ec,
        data.mp, data.pp, data.ef,
        data.ghi, data.dni, data.irrh, data.cielo,
        data.ltl, data.ltr, data.lbl, data.lbr,
        // Comparación panel fijo — ESP32 ≥ v5.2 los envía; firmware viejo manda undefined → null
        data.pf   ?? null,
        data.poaf ?? null,
        data.gan  ?? null,
        data.emv  ?? null,
        data.efj  ?? null,
        data.els  ?? null,
        data.azs  ?? null,
        data.eta  ?? null,
        data.tlt  ?? null,
      ]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (err: any) {
    console.error("Error inserting data:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
