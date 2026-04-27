import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const result = await pool.query(
      `INSERT INTO log_data
        (v, i, p, t, ah, av, st, ec, mp, pp, ef, ghi, dni, irrh, cielo,
         pf, poaf, gan, emv, efj, els, azs, eta, tlt)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         $16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING id`,
      [
        data.v, data.i, data.p, data.t,
        data.ah, data.av, data.st, data.ec,
        data.mp, data.pp, data.ef,
        data.ghi, data.dni, data.irrh, data.cielo,
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
