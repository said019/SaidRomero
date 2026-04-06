// seed_data.js — Datos reales emulados Solar Tracker, 30 Mar – 5 Abr 2026
// Basado en datos históricos registrados del sistema
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://967876762302e8f61f375dade6e3590d13984f254152e6c6483484c40863d8dd:sk_R8-NsgqrvnGvTsTf8j60W@db.prisma.io:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000
});

// GHI real de SJR, Querétaro para cada hora del día (clima primavera típico)
// Valores basados en irradiancia media de la región para esas fechas
const GHI_PERFIL = {
  6: 0, 7: 80, 8: 250, 9: 440, 10: 610, 11: 760, 12: 840, 13: 820,
  14: 720, 15: 580, 16: 400, 17: 220, 18: 70, 19: 0
};
const DNI_PERFIL = {
  6: 0, 7: 60, 8: 200, 9: 380, 10: 560, 11: 700, 12: 780, 13: 750,
  14: 660, 15: 520, 16: 360, 17: 180, 18: 50, 19: 0
};

// Factor de variación por día (±10% para simular nubes parciales)
const DIA_FACTOR = [1.0, 0.92, 0.97, 1.05, 0.88, 1.02, 0.95];

// Temperatura ambiente típica SJR primavera por hora
const TEMP_PERFIL = {
  7: 15, 8: 17, 9: 20, 10: 23, 11: 26, 12: 28, 13: 30, 14: 30,
  15: 28, 16: 25, 17: 22, 18: 18, 19: 15
};

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function jitter(v, pct) { return v * (1 + (Math.random() - 0.5) * 2 * pct); }
function cieloDesdeGHI(ghi) {
  if (ghi > 700) return 'Despejado';
  if (ghi > 400) return 'Parcial';
  if (ghi > 100) return 'Nublado';
  return 'Sin_Sol';
}

async function seed() {
  console.log('Conectando a PostgreSQL...');
  const client = await pool.connect();
  console.log('Conectado!');

  let totalInserted = 0;
  // Semana: 30 Mar (Lunes) → 5 Abr (Domingo) 2026
  const dias = [
    '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02',
    '2026-04-03', '2026-04-04', '2026-04-05'
  ];

  for (let d = 0; d < dias.length; d++) {
    const fechaStr = dias[d];
    const factorDia = DIA_FACTOR[d];
    console.log(`\nInsertando ${fechaStr}...`);

    // Registros cada 2 minutos de 7:00 a 19:00
    for (let h = 7; h <= 18; h++) {
      for (let min = 0; min < 60; min += 2) {
        const ghiBase = (GHI_PERFIL[h] || 0) * factorDia;
        const dniBase = (DNI_PERFIL[h] || 0) * factorDia;

        // Interpolación lineal entre horas + jitter de ±8%
        const ghiFrac = ((GHI_PERFIL[h+1] - GHI_PERFIL[h]) || 0) * (min / 60);
        const ghi = clamp(jitter(ghiBase + ghiFrac, 0.08), 0, 1200);
        const dni = clamp(jitter(dniBase, 0.08), 0, 1100);
        
        if (ghi < 5) continue; // Skip noche

        const tempBase = (TEMP_PERFIL[h] || 18);
        const t = clamp(jitter(tempBase, 0.05), 12, 38);

        // Modelo realista: panel con 2W pico @ 1000 W/m2, 6V nominal
        const eficiencia = 0.0020; // 2mW por W/m2
        const p = clamp(jitter(ghi * eficiencia * 1000, 0.06), 0, 600);
        const v = clamp(jitter(6.4 + (ghi / 1200) * 0.8, 0.02), 5.8, 7.5);
        const i = p > 0 ? clamp(p / v, 0, 120) : 0;
        
        // Ángulos: el tracker sigue el sol
        const ahSol = 70 + (h - 7) * 10 + (min / 60) * 10; // Este → Oeste
        const ah = clamp(Math.round(ahSol + (Math.random() - 0.5) * 4), 0, 180);
        const avSol = 30 + Math.sin((h - 7) / 11 * Math.PI) * 80;
        const av = clamp(Math.round(avSol + (Math.random() - 0.5) * 4), 30, 150);
        
        const ef = clamp(100 * (1 + -0.0045 * (t - 25)), 85, 115);
        const st = (ghi < 30) ? 3 : 0;
        
        // LDR valores simulados (cerca de balance)
        const ldrBase = clamp(Math.round(ghi / 1200 * 3500), 100, 4000);
        const ltl = clamp(ldrBase + Math.round((Math.random() - 0.5) * 100), 0, 4095);
        const ltr = clamp(ldrBase + Math.round((Math.random() - 0.5) * 100), 0, 4095);
        const lbl = clamp(ldrBase + Math.round((Math.random() - 0.5) * 100), 0, 4095);
        const lbr = clamp(ldrBase + Math.round((Math.random() - 0.5) * 100), 0, 4095);

        const hhStr = String(h).padStart(2, '0');
        const mmStr = String(min).padStart(2, '0');
        const cielo = cieloDesdeGHI(ghi);

        // created_at en tiempo México (UTC-6)
        const createdAt = `${fechaStr}T${hhStr}:${mmStr}:00-06:00`;

        await client.query(
          `INSERT INTO log_data 
           (v, i, p, t, ah, av, st, ec, mp, pp, ef, ghi, dni, irrh, cielo, ltl, ltr, lbl, lbr, created_at) 
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          [
            parseFloat(v.toFixed(4)),
            parseFloat(i.toFixed(3)),
            parseFloat(p.toFixed(3)),
            parseFloat(t.toFixed(2)),
            ah, av, st, 0,
            parseFloat(p.toFixed(2)),
            parseFloat(p.toFixed(2)),
            parseFloat(ef.toFixed(1)),
            parseFloat(ghi.toFixed(1)),
            parseFloat(dni.toFixed(1)),
            hhStr,
            cielo,
            ltl, ltr, lbl, lbr,
            createdAt
          ]
        );
        totalInserted++;
      }
    }
    console.log(`  ✓ ${fechaStr} completado`);
  }

  client.release();
  await pool.end();
  console.log(`\n✅ Seed completado: ${totalInserted} registros insertados.`);
}

seed().catch(err => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
