import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Inicializar tabla de control si no existe
async function ensureControlTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_control (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Valor default: grabando activado
  await pool.query(`
    INSERT INTO system_control (key, value) VALUES ('recording', 'true')
    ON CONFLICT (key) DO NOTHING
  `);
}

export async function GET() {
  try {
    await ensureControlTable();
    const result = await pool.query(
      `SELECT value, updated_at FROM system_control WHERE key = 'recording'`
    );
    const recording = result.rows[0]?.value === 'true';
    return NextResponse.json({ success: true, recording });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { recording } = await req.json();
    await ensureControlTable();
    await pool.query(
      `UPDATE system_control SET value = $1, updated_at = NOW() WHERE key = 'recording'`,
      [recording ? 'true' : 'false']
    );
    return NextResponse.json({ success: true, recording });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
