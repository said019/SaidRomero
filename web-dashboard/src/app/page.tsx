"use client";
import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const ESTADOS = ['NORMAL', 'ENFRIANDO', 'RECUPERANDO', 'SIN_SOL'];
const ECLS = ['tn', 'te', 'te', 'ts'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const gaugeRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const fetchSensorData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      if (json.success && json.latest) {
        setData(json.latest);
        setHistory(json.history);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chartRef.current && history.length > 0) {
      if (chartInstance.current) chartInstance.current.destroy();

      const labels = history.map(h => {
        const d = new Date(h.created_at);
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      });

      const powData = history.map(h => parseFloat(h.p) || 0);
      const pfData  = history.map(h => parseFloat(h.pf) || 0);
      const ghiData = history.map(h => parseFloat(h.ghi) || 0);
      const vData   = history.map(h => parseFloat(h.v) || 0);
      const iData   = history.map(h => parseFloat(h.i) || 0);

      const pMax = Math.max(...powData, ...pfData, 100) * 1.3;
      const gMax = Math.max(...ghiData, 200) * 1.3;

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Móvil (mW)',
              data: powData,
              borderColor: '#00e676',
              backgroundColor: 'rgba(0,230,118,0.15)',
              borderWidth: 2,
              pointRadius: 0,
              fill: true,
              tension: 0.35,
              yAxisID: 'yP',
              order: 1,
            },
            {
              label: 'Fijo sim (mW)',
              data: pfData,
              borderColor: '#00c8ff',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 0,
              fill: false,
              tension: 0.35,
              yAxisID: 'yP',
              order: 1,
            },
            {
              label: 'GHI (W/m²)',
              data: ghiData,
              borderColor: '#f7a800',
              backgroundColor: 'rgba(247,168,0,0.10)',
              borderWidth: 1.8,
              pointRadius: 0,
              fill: true,
              tension: 0.35,
              yAxisID: 'yG',
              order: 2,
            },
            {
              label: 'Voltaje (V)',
              data: vData,
              borderColor: '#00c8ff',
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
              tension: 0.3,
              borderDash: [6, 3],
              yAxisID: 'yV',
              order: 3,
            },
            {
              label: 'Corriente (mA)',
              data: iData,
              borderColor: '#80dfff',
              backgroundColor: 'transparent',
              borderWidth: 1.8,
              pointRadius: 0,
              fill: false,
              tension: 0.3,
              yAxisID: 'yI',
              order: 4,
            },
          ]
        },
        options: {
          animation: false,
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              ticks: { color: '#4a6078', font: { family: 'Share Tech Mono', size: 8 }, maxTicksLimit: 10 },
              grid: { color: 'rgba(26,40,64,0.5)' }
            },
            yP: {
              type: 'linear', position: 'left',
              min: 0, max: pMax,
              ticks: { color: '#00e676', font: { family: 'Share Tech Mono', size: 8 }, callback: (v: any) => `${v}mW` },
              grid: { color: 'rgba(26,40,64,0.4)' },
              title: { display: true, text: 'Potencia (mW)', color: '#00e676', font: { family: 'Share Tech Mono', size: 8 } }
            },
            yG: {
              type: 'linear', position: 'right',
              min: 0, max: gMax,
              ticks: { color: '#f7a800', font: { family: 'Share Tech Mono', size: 8 }, callback: (v: any) => `${v}` },
              grid: { display: false },
              title: { display: true, text: 'GHI (W/m²)', color: '#f7a800', font: { family: 'Share Tech Mono', size: 8 } }
            },
            yV: {
              type: 'linear', position: 'right',
              min: 0, max: 8,
              ticks: { color: '#00c8ff', font: { family: 'Share Tech Mono', size: 8 }, callback: (v: any) => `${v}V` },
              grid: { display: false },
              title: { display: true, text: 'V', color: '#00c8ff', font: { family: 'Share Tech Mono', size: 8 } }
            },
            yI: {
              type: 'linear', position: 'right',
              min: 0,
              ticks: { color: '#80dfff', font: { family: 'Share Tech Mono', size: 8 }, callback: (v: any) => `${v}mA` },
              grid: { display: false },
              title: { display: true, text: 'I (mA)', color: '#80dfff', font: { family: 'Share Tech Mono', size: 8 } }
            },
          },
          plugins: {
            legend: {
              labels: {
                color: '#d0e0f0',
                font: { family: 'Share Tech Mono', size: 9 },
                boxWidth: 24,
                padding: 14,
                usePointStyle: true,
              }
            },
            tooltip: {
              backgroundColor: '#0b1018',
              borderColor: '#1a2840',
              borderWidth: 1,
              titleColor: '#d0e0f0',
              bodyColor: '#7090b0',
              titleFont: { family: 'Share Tech Mono' },
              bodyFont: { family: 'Share Tech Mono', size: 11 },
            }
          }
        }
      });
    }
  }, [history]);


  useEffect(() => {
    if (gaugeRef.current && data) {
      const c = gaugeRef.current;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      
      const pct = data.ef;
      const cx = c.width / 2, cy = c.height - 8, r = 85;
      
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = '#1a2840'; ctx.lineWidth = 12; ctx.stroke();
      
      const a = Math.PI + Math.PI * Math.min(Math.max(pct, 0), 110) / 100;
      const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      g.addColorStop(0, '#ff4560'); g.addColorStop(0.5, '#f7a800'); g.addColorStop(1, '#00e676');
      
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, a);
      ctx.strokeStyle = g; ctx.lineWidth = 12; ctx.stroke();
    }
  }, [data]);

  const fallback = {
    v: 0, i: 0, p: 0, t: 0,
    ah: 90, av: 90, st: 0, ec: 0,
    mp: 0, pp: 0, ef: 0,
    ghi: 0, dni: 0, irrh: '--', cielo: '---',
    pf: 0, poaf: 0, gan: 0, emv: 0, efj: 0,
    els: 0, azs: 0, eta: 0, tlt: 25,
  };

  const raw = data || fallback;
  // Coerción defensiva: PostgreSQL devuelve REAL/NUMERIC como string en algunos drivers
  const num = (x: any, def = 0) => {
    const n = typeof x === 'number' ? x : parseFloat(x);
    return isNaN(n) ? def : n;
  };
  const d = {
    v: num(raw.v), i: num(raw.i), p: num(raw.p), t: num(raw.t),
    ah: num(raw.ah, 90), av: num(raw.av, 90),
    st: num(raw.st), ec: num(raw.ec),
    mp: num(raw.mp), pp: num(raw.pp), ef: num(raw.ef),
    ghi: num(raw.ghi), dni: num(raw.dni),
    irrh: raw.irrh ?? '--', cielo: raw.cielo ?? '---',
    pf: num(raw.pf), poaf: num(raw.poaf), gan: num(raw.gan),
    emv: num(raw.emv), efj: num(raw.efj),
    els: num(raw.els), azs: num(raw.azs),
    eta: num(raw.eta), tlt: num(raw.tlt, 25),
  };
  const badgeCls = d.st === 0 ? '' : d.st === 3 ? 's' : 'e';
  const ganE = d.efj > 0.0001 ? ((d.emv - d.efj) / d.efj * 100) : 0;
  const ganColor = d.gan >= 0 ? '#00e676' : '#ff4560';

  return (
    <>
      <header>
        <div className="logo">
          <div className="hex">&#9728;</div>
          <div>
            <div className="ltitle">SOLAR TRACKER</div>
            <div className="lsub">VERCEL + POSTGRESQL API</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div id="badge" className={badgeCls}><span className="dot"></span><span id="est-txt">{ESTADOS[d.st] || 'CONECTANDO'}</span></div>
        </div>
      </header>

      <main>
        {/* ROW 1: METRICS */}
        <div className="card">
          <div className="clabel"><span>Voltaje</span><span>&#9889;</span></div>
          <div className="cval">{d.v.toFixed(3)}<span className="cunit">V</span></div>
          <div className="csub">INA219 &middot; Bus + Shunt</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(d.v / 10 * 100, 100)}%` }}></div></div>
        </div>
        <div className="card b">
          <div className="clabel"><span>Corriente</span><span>&#12316;</span></div>
          <div className="cval">{d.i.toFixed(2)}<span className="cunit">mA</span></div>
          <div className="csub">INA219 &middot; Alta precisión</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(d.i / 500 * 100, 100)}%` }}></div></div>
        </div>
        <div className="card g">
          <div className="clabel"><span>Potencia</span><span>&#10696;</span></div>
          <div className="cval">{d.p.toFixed(2)}<span className="cunit">mW</span></div>
          <div className="csub">Máx: {d.mp.toFixed(1)} &middot; Prom: {d.pp.toFixed(1)}</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(d.p / 300 * 100, 100)}%` }}></div></div>
        </div>
        <div className="card r">
          <div className="clabel"><span>Temperatura celda</span><span>&#127777;</span></div>
          <div className="cval">{d.t.toFixed(1)}<span className="cunit">&deg;C</span></div>
          <div className="csub">Open-Meteo &middot; Vercel</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(d.t / 80 * 100, 100)}%` }}></div></div>
        </div>

        {/* ROW COMPARACIÓN: Seguidor vs Panel Fijo simulado (β=25°, sur) */}
        <div className="card">
          <div className="clabel"><span>Panel fijo (sim)</span><span>&#9648;</span></div>
          <div className="cval">{d.pf.toFixed(2)}<span className="cunit">mW</span></div>
          <div className="csub">Tilt {d.tlt.toFixed(0)}&deg; &middot; sur &middot; POA: {d.poaf.toFixed(0)} W/m&sup2;</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(d.pf / 300 * 100, 100)}%` }}></div></div>
        </div>
        <div className="card g">
          <div className="clabel"><span>Ganancia seguidor</span><span>&#9650;</span></div>
          <div className="cval" style={{ color: ganColor }}>{d.gan.toFixed(1)}<span className="cunit">%</span></div>
          <div className="csub">vs panel estático equivalente</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(Math.max(d.gan, 0) / 100 * 100, 100)}%` }}></div></div>
        </div>
        <div className="card b">
          <div className="clabel"><span>Energía acumulada</span><span>&#10070;</span></div>
          <div className="cval">{d.emv.toFixed(3)}<span className="cunit">Wh</span></div>
          <div className="csub">Fijo: {d.efj.toFixed(3)} Wh &middot; &Delta;: {ganE.toFixed(1)}%</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(d.emv / 1.0 * 100, 100)}%` }}></div></div>
        </div>
        <div className="card r">
          <div className="clabel"><span>Posición solar</span><span>&#9728;</span></div>
          <div className="cval">{d.els.toFixed(1)}<span className="cunit">&deg;</span></div>
          <div className="csub">Azimut: {d.azs.toFixed(1)}&deg; &middot; &eta;: {(d.eta * 100).toFixed(1)}%</div>
          <div className="bar"><div className="barfill" style={{ width: `${Math.min(Math.max(d.els, 0) / 90 * 100, 100)}%` }}></div></div>
        </div>

        {/* ROW 2: IRRADIANCE + CHART */}
        <div className="card span2">
          <div className="ptitle"><span>&#9788; IRRADIANCIA SOLAR (GHI)</span><span style={{ color: 'var(--dim)' }}>Open-Meteo API</span></div>
          <div className="irr-grid">
            <div className="irr-col">
              <label>SHORTWAVE GHI</label>
              <div className="irr-val">{d.ghi.toFixed(0)}<span className="cunit">W/m&sup2;</span></div>
            </div>
            <div className="irr-col">
              <label>DNI NORMAL</label>
              <div className="irr-val-sm">{d.dni.toFixed(0)} <span style={{ fontSize: '11px', color: 'var(--dim)' }}>W/m&sup2;</span></div>
            </div>
            <div className="irr-col">
              <label>HORA DATO</label>
              <div className="irr-hora">{d.irrh || '--'}:00</div>
            </div>
            <div className="irr-col">
              <label>CIELO</label>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--c)' }}>{d.cielo}</div>
            </div>
          </div>
          <div className="bar" style={{ marginTop: '12px' }}><div className="barfill" style={{ width: `${Math.min(d.ghi / 1200 * 100, 100)}%` }}></div></div>
        </div>

        <div className="card span2">
          <div className="ptitle">
            <span>&#11015; VOLTAJE · CORRIENTE · POTENCIA · IRRADIANCIA — BD</span>
            <span style={{ color: 'var(--dim)' }}>{history.length} pts</span>
          </div>
          <canvas ref={chartRef} height={180}></canvas>
        </div>

        {/* ROW 3: GAUGE + COMPASS + ELEVATION */}
        <div className="card">
          <div className="ptitle"><span>&#9711; EFICIENCIA TÉRMICA</span></div>
          <div className="gwrap">
            <canvas ref={gaugeRef} width={200} height={120}></canvas>
            <div className="gnum">{d.ef.toFixed(1)}%</div>
            <div className="gsub">Factor vs STC 25&deg;C</div>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>&#9680; AZIMUT HORIZONTAL (DB)</span></div>
          <div className="cwrap">
            <div className="compass">
              <div className="cring"></div>
              <div className="cring m"></div>
              <div className="cring i"></div>
              <div className="clbl N">N</div><div className="clbl S">S</div>
              <div className="clbl E">E</div><div className="clbl O">O</div>
              <div className="needle" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${d.ah - 90}deg)` }}></div>
              <div className="ctr"></div>
              <div className="cang">{d.ah}&deg;</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>&#9681; ELEVACIÓN VERTICAL (DB)</span></div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '190px' }}>
            <svg viewBox="0 0 200 120" width={200} height={120}>
              <path d="M10 110 A90 90 0 0 1 190 110" fill="none" stroke="#1a2840" strokeWidth="2" />
              <text x="5" y="122" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">0&deg;</text>
              <text x="92" y="16" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">90&deg;</text>
              <text x="178" y="122" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">180&deg;</text>
              <g style={{ transformOrigin: '100px 110px', transform: `rotate(${d.av - 90}deg)` }}>
                <line x1="100" y1="110" x2="100" y2="30" stroke="#f7a800" strokeWidth="3" strokeLinecap="round" opacity=".9" />
                <polygon points="100,22 95,35 105,35" fill="#f7a800" />
              </g>
              <circle cx="100" cy="110" r="5" fill="#f7a800" opacity=".8" />
              <text x="100" y="105" fill="#00c8ff" fontSize="10" fontFamily="Share Tech Mono" textAnchor="middle">{d.av}&deg;</text>
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>&#8857; REPOSITORIO DB</span></div>
          <div className="irow"><span className="ik">TABLA DB</span><span className="iv">log_data</span></div>
          <div className="irow"><span className="ik">ESTADO</span><span className="iv">{data ? "ONLINE" : "OFFLINE"}</span></div>
          <div className="irow"><span className="ik">ENFRIAMIENTOS</span><span className="iv ivg">{d.ec}</span></div>
          <div className="irow"><span className="ik">MEJOR POT.</span><span className="iv ivg">{d.mp.toFixed(2)} mW</span></div>
          <div className="irow"><span className="ik">REGISTROS</span><span className="iv">{history.length} max limit 80</span></div>
        </div>

        {/* ROW 4: TABLE */}
        <div className="card wide">
          <div className="ptitle">
            <span>&#8862; REGISTRO DE DATOS BACKEND</span>
            <a href="/api/download" className="btn bo" style={{textDecoration:'none', padding:'7px 16px', borderRadius:'4px', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--c)', border:'1px solid var(--c)'}}>&#8595; CSV</a>
          </div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>HORA</th><th>V (V)</th><th>I (mA)</th>
                  <th>P_M (mW)</th><th style={{ color: '#00c8ff' }}>P_F (mW)</th><th>GAN %</th>
                  <th>T (&deg;C)</th><th>GHI (W/m&sup2;)</th>
                  <th>AH&deg;</th><th>AV&deg;</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {!data && <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--dim)', padding: '20px' }}>Esperando a Vercel/Postgres...</td></tr>}
                {[...history].reverse().map((row: any) => {
                  const d = new Date(row.created_at);
                  const hora = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
                  const pf  = num(row.pf);
                  const gan = num(row.gan);
                  const ganColor = gan >= 0 ? '#00e676' : '#ff4560';
                  return (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{hora}</td>
                      <td>{num(row.v).toFixed(3)}</td>
                      <td>{num(row.i).toFixed(2)}</td>
                      <td>{num(row.p).toFixed(2)}</td>
                      <td style={{ color: '#00c8ff' }}>{pf.toFixed(2)}</td>
                      <td style={{ color: ganColor }}>{gan.toFixed(1)}</td>
                      <td>{num(row.t).toFixed(1)}</td>
                      <td>{num(row.ghi).toFixed(0)}</td>
                      <td>{row.ah}</td>
                      <td>{row.av}</td>
                      <td><span className={`tag ${ECLS[row.st]}`}>{ESTADOS[row.st]}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
