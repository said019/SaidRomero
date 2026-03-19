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
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const labels = history.map(h => {
        const d = new Date(h.created_at);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      });
      const powData = history.map(h => h.p);
      const tempData = history.map(h => h.t);

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Potencia (mW)',
                data: powData,
                borderColor: '#f7a800',
                backgroundColor: 'rgba(247,168,0,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4,
                yAxisID: 'yP'
              },
              {
                label: 'Temperatura (C)',
                data: tempData,
                borderColor: '#ff4560',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0.4,
                borderDash: [5, 3],
                yAxisID: 'yT'
              }
            ]
          },
          options: {
            animation: false,
            responsive: true,
            scales: {
              x: { ticks: { color: '#4a6078', font: { family: 'Share Tech Mono', size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(26,40,64,0.5)' } },
              yP: { type: 'linear', position: 'left', ticks: { color: '#f7a800', font: { family: 'Share Tech Mono', size: 9 } }, grid: { color: 'rgba(26,40,64,0.3)' } },
              yT: { type: 'linear', position: 'right', ticks: { color: '#ff4560', font: { family: 'Share Tech Mono', size: 9 } }, grid: { display: false } }
            },
            plugins: { legend: { labels: { color: '#4a6078', font: { family: 'Share Tech Mono', size: 10 } } } }
          }
        });
      }
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
    ghi: 0, dni: 0, irrh: '--', cielo: '---'
  };

  const d = data || fallback;
  const badgeCls = d.st === 0 ? '' : d.st === 3 ? 's' : 'e';

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
            <span>&#11015; POTENCIA / TEMPERATURA &mdash; HISTÓRICO BD</span>
            <span style={{ color: 'var(--dim)' }}>{history.length} pts</span>
          </div>
          <canvas ref={chartRef} height={130}></canvas>
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
          <div className="ptitle"><span>&#8862; REGISTRO DE DATOS BACKEND</span></div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>HORA</th><th>V (V)</th><th>I (mA)</th>
                  <th>P (mW)</th><th>T (&deg;C)</th><th>GHI (W/m&sup2;)</th>
                  <th>AH&deg;</th><th>AV&deg;</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {!data && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--dim)', padding: '20px' }}>Esperando a Vercel/Postgres...</td></tr>}
                {[...history].reverse().map((row: any) => {
                  const d = new Date(row.created_at);
                  const hora = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
                  return (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{hora}</td>
                      <td>{row.v.toFixed(3)}</td>
                      <td>{row.i.toFixed(2)}</td>
                      <td>{row.p.toFixed(2)}</td>
                      <td>{row.t.toFixed(1)}</td>
                      <td>{row.ghi.toFixed(0)}</td>
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
