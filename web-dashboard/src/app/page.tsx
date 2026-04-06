"use client";
import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const ESTADOS = ['NORMAL', 'ENFRIANDO', 'RECUPERANDO', 'SIN_SOL'];
const ECLS = ['tn', 'te', 'te', 'ts'];

interface DayRecord {
  fecha: string;
  registros: number;
  primer_registro: string;
  ultimo_registro: string;
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [availableDays, setAvailableDays] = useState<DayRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [showDayPicker, setShowDayPicker] = useState<boolean>(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const gaugeRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  // Fetch available days from DB
  const fetchAvailableDays = async () => {
    try {
      const res = await fetch('/api/days');
      const json = await res.json();
      if (json.success) setAvailableDays(json.days);
    } catch (err) {
      console.error('Failed to fetch days', err);
    }
  };

  const fetchSensorData = async (filterMode = isFiltering, start = startDate, end = endDate) => {
    try {
      let url = '/api/data';
      if (filterMode && start && end) {
        const startIso = new Date(start).toISOString();
        const endIso = new Date(end).toISOString();
        url += `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        if (json.latest) setData(json.latest);
        setHistory(json.history);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  // Select a specific day from the day picker
  const selectDay = (fecha: string) => {
    const start = `${fecha}T00:00`;
    const end = `${fecha}T23:59`;
    setStartDate(start);
    setEndDate(end);
    setSelectedDay(fecha);
    setIsFiltering(true);
    setShowDayPicker(false);
    fetchSensorData(true, start, end);
  };

  const clearFilter = () => {
    setIsFiltering(false);
    setStartDate('');
    setEndDate('');
    setSelectedDay('');
    fetchSensorData(false, '', '');
  };

  // Build CSV download URL respecting current filter
  const getCsvUrl = () => {
    if (isFiltering && startDate && endDate) {
      const s = encodeURIComponent(new Date(startDate).toISOString());
      const e = encodeURIComponent(new Date(endDate).toISOString());
      return `/api/download?start=${s}&end=${e}`;
    }
    return '/api/download';
  };

  useEffect(() => {
    fetchSensorData();
    fetchAvailableDays();
    const interval = setInterval(() => {
      if (!isFiltering) fetchSensorData(false, '', '');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh available days every 2 min
  useEffect(() => {
    const interval = setInterval(fetchAvailableDays, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chartRef.current && history.length > 0) {
      if (chartInstance.current) chartInstance.current.destroy();

      const labels = history.map(h => {
        const d = new Date(h.created_at);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      });

      const powData = history.map(h => parseFloat(h.p) || 0);
      const ghiData = history.map(h => parseFloat(h.ghi) || 0);
      const vData   = history.map(h => parseFloat(h.v) || 0);
      const iData   = history.map(h => parseFloat(h.i) || 0);

      const pMax = Math.max(...powData, 100) * 1.3;
      const gMax = Math.max(...ghiData, 200) * 1.3;

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Potencia (mW)',
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
              ticks: { color: '#4a6078', font: { family: 'Share Tech Mono', size: 8 }, maxTicksLimit: 12 },
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
    ltl: 0, ltr: 0, lbl: 0, lbr: 0
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

        {/* LDR SENSORS */}
        <div className="card wide">
          <div className="ptitle"><span>&#9788; SENSORES LDR</span><span style={{ color: 'var(--dim)' }}>0–4095 ADC</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <div>
              <div className="clabel"><span>SUP-IZQ</span><span>&#8598;</span></div>
              <div className="cval" style={{ fontSize: '22px' }}>{d.ltl}</div>
              <div className="bar"><div className="barfill" style={{ width: `${(d.ltl / 4095 * 100).toFixed(1)}%`, background: 'var(--y)' }}></div></div>
            </div>
            <div>
              <div className="clabel"><span>SUP-DER</span><span>&#8599;</span></div>
              <div className="cval" style={{ fontSize: '22px' }}>{d.ltr}</div>
              <div className="bar"><div className="barfill" style={{ width: `${(d.ltr / 4095 * 100).toFixed(1)}%`, background: 'var(--c)' }}></div></div>
            </div>
            <div>
              <div className="clabel"><span>INF-IZQ</span><span>&#8601;</span></div>
              <div className="cval" style={{ fontSize: '22px' }}>{d.lbl}</div>
              <div className="bar"><div className="barfill" style={{ width: `${(d.lbl / 4095 * 100).toFixed(1)}%`, background: 'var(--g)' }}></div></div>
            </div>
            <div>
              <div className="clabel"><span>INF-DER</span><span>&#8600;</span></div>
              <div className="cval" style={{ fontSize: '22px' }}>{d.lbr}</div>
              <div className="bar"><div className="barfill" style={{ width: `${(d.lbr / 4095 * 100).toFixed(1)}%`, background: 'var(--r)' }}></div></div>
            </div>
          </div>
        </div>

        {/* ROW 2: IRRADIANCE — datos de la BD o del último registro */}
        <div className="card wide">
          <div className="ptitle"><span>&#9788; IRRADIANCIA SOLAR (GHI)</span><span style={{ color: 'var(--dim)' }}>Open-Meteo API</span></div>
          <div className="irr-grid">
            <div className="irr-col">
              <label>SHORTWAVE GHI</label>
              <div className="irr-val">{parseFloat(d.ghi || 0).toFixed(0)}<span className="cunit">W/m&sup2;</span></div>
            </div>
            <div className="irr-col">
              <label>DNI NORMAL</label>
              <div className="irr-val-sm">{parseFloat(d.dni || 0).toFixed(0)} <span style={{ fontSize: '11px', color: 'var(--dim)' }}>W/m&sup2;</span></div>
            </div>
            <div className="irr-col">
              <label>HORA DATO</label>
              <div className="irr-hora">{d.irrh || '--'}:00</div>
            </div>
            <div className="irr-col">
              <label>CIELO</label>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--c)' }}>{d.cielo || '---'}</div>
            </div>
          </div>
          <div className="bar" style={{ marginTop: '12px' }}><div className="barfill" style={{ width: `${Math.min(parseFloat(d.ghi || 0) / 1200 * 100, 100)}%` }}></div></div>
        </div>

        {/* ROW 3: CHART WITH DAY FILTER */}
        <div className="card wide">
          <div className="ptitle">
            <span>&#11015; VOLTAJE · CORRIENTE · POTENCIA · IRRADIANCIA — BD</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Day selector dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn bp"
                  style={{ padding: '6px 12px', background: showDayPicker ? 'var(--c)' : undefined }}
                  onClick={() => setShowDayPicker(p => !p)}
                >
                  {selectedDay ? `📅 ${selectedDay}` : '📅 DÍAS'}
                </button>
                {showDayPicker && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 100,
                    background: '#111820', border: '1px solid #1a2840',
                    minWidth: '220px', maxHeight: '250px', overflowY: 'auto',
                    borderRadius: '4px', marginTop: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
                  }}>
                    {availableDays.length === 0 && (
                      <div style={{ padding: '12px', color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: '10px' }}>
                        Sin días registrados
                      </div>
                    )}
                    {availableDays.map(day => (
                      <div
                        key={day.fecha}
                        onClick={() => selectDay(day.fecha)}
                        style={{
                          padding: '8px 14px', cursor: 'pointer',
                          fontFamily: 'var(--mono)', fontSize: '11px',
                          color: day.fecha === selectedDay ? 'var(--c)' : 'var(--tx)',
                          borderBottom: '1px solid #1a2840',
                          display: 'flex', justifyContent: 'space-between',
                          background: day.fecha === selectedDay ? 'rgba(0,200,255,0.08)' : 'transparent'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = day.fecha === selectedDay ? 'rgba(0,200,255,0.08)' : 'transparent')}
                      >
                        <span>{day.fecha}</span>
                        <span style={{ color: 'var(--dim)', fontSize: '9px' }}>{day.registros} reg.</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="datetime-local"
                style={{ background: 'var(--bg)', color: 'white', border: '1px solid var(--border)', padding: '5px', fontSize: '10px', fontFamily: 'var(--mono)', borderRadius: '4px' }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span style={{ color: 'var(--dim)', fontSize: '10px' }}>a</span>
              <input
                type="datetime-local"
                style={{ background: 'var(--bg)', color: 'white', border: '1px solid var(--border)', padding: '5px', fontSize: '10px', fontFamily: 'var(--mono)', borderRadius: '4px' }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <button
                className="btn bp"
                style={{ padding: '6px 12px' }}
                onClick={() => { setIsFiltering(true); fetchSensorData(true); }}
              >
                FILTRAR
              </button>
              <button
                className="btn bd"
                style={{ padding: '6px 12px' }}
                onClick={clearFilter}
              >
                LIMPIAR
              </button>
              <span style={{ color: 'var(--dim)', marginLeft: '10px' }}>{history.length} pts</span>
            </div>
          </div>
          <canvas ref={chartRef} height={180}></canvas>
        </div>

        {/* ROW 4: GAUGE + COMPASS + ELEVATION */}
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
          <div className="irow"><span className="ik">DÍAS REGISTR.</span><span className="iv ivg">{availableDays.length}</span></div>
          <div className="irow"><span className="ik">PUNTOS VISTA</span><span className="iv">{history.length}</span></div>
        </div>

        {/* ROW 5: TABLE */}
        <div className="card wide">
          <div className="ptitle">
            <span>&#8862; REGISTRO DE DATOS BACKEND</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isFiltering && selectedDay && (
                <span style={{ color: 'var(--y)', fontFamily: 'var(--mono)', fontSize: '10px' }}>
                  📅 {selectedDay}
                </span>
              )}
              <a
                href={getCsvUrl()}
                className="btn bo"
                style={{
                  textDecoration: 'none', padding: '7px 16px', borderRadius: '4px',
                  fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--c)', border: '1px solid var(--c)'
                }}
              >
                &#8595; CSV {isFiltering && selectedDay ? `(${selectedDay})` : '(TODOS)'}
              </a>
            </div>
          </div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>FECHA</th><th>HORA</th><th>V (V)</th><th>I (mA)</th>
                  <th>P (mW)</th><th>T (&deg;C)</th><th>GHI (W/m&sup2;)</th>
                  <th>AH&deg;</th><th>AV&deg;</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--dim)', padding: '20px' }}>
                    {isFiltering ? 'Sin datos para el rango seleccionado' : 'Esperando a Vercel/Postgres...'}
                  </td></tr>
                )}
                {[...history].reverse().map((row: any) => {
                  const dt = new Date(row.created_at);
                  const fecha = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                  const hora = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`;
                  return (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td style={{ fontSize: '9px', color: 'var(--dim)' }}>{fecha}</td>
                      <td>{hora}</td>
                      <td>{parseFloat(row.v).toFixed(3)}</td>
                      <td>{parseFloat(row.i).toFixed(2)}</td>
                      <td>{parseFloat(row.p).toFixed(2)}</td>
                      <td>{parseFloat(row.t).toFixed(1)}</td>
                      <td style={{ color: parseFloat(row.ghi) > 100 ? 'var(--y)' : 'var(--dim)' }}>
                        {parseFloat(row.ghi).toFixed(0)}
                      </td>
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
