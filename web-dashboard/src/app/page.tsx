"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';

const ESTADOS = ['NORMAL', 'ENFRIANDO', 'RECUPERANDO', 'SIN_SOL'];
const ECLS = ['tn', 'te', 'te', 'ts'];

interface DayRecord {
  fecha: string;
  registros: number;
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [availableDays, setAvailableDays] = useState<DayRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [recording, setRecording] = useState(true);
  const [togglingRec, setTogglingRec] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const gaugeRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  // ── Fetch days list ─────────────────────────────────────────────────
  const fetchAvailableDays = useCallback(async () => {
    try {
      const res = await fetch('/api/days');
      const json = await res.json();
      if (json.success) setAvailableDays(json.days);
    } catch { /* silent */ }
  }, []);

  // ── Fetch sensor data ────────────────────────────────────────────────
  const fetchSensorData = useCallback(async (
    filterMode = false, start = '', end = ''
  ) => {
    try {
      let url = '/api/data';
      if (filterMode && start && end) {
        const s = encodeURIComponent(new Date(start).toISOString());
        const e = encodeURIComponent(new Date(end).toISOString());
        url += `?start=${s}&end=${e}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        if (json.latest) setData(json.latest);
        setHistory(json.history || []);
      }
    } catch { /* silent */ }
  }, []);

  // ── Fetch recording state ────────────────────────────────────────────
  const fetchRecordingState = useCallback(async () => {
    try {
      const res = await fetch('/api/control');
      const json = await res.json();
      if (json.success) setRecording(json.recording);
    } catch { /* silent */ }
  }, []);

  // ── Toggle recording ────────────────────────────────────────────────
  const toggleRecording = async () => {
    setTogglingRec(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recording: !recording }),
      });
      const json = await res.json();
      if (json.success) setRecording(json.recording);
    } catch { /* silent */ }
    setTogglingRec(false);
  };

  // ── Select day from picker ───────────────────────────────────────────
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

  const applyFilter = () => {
    if (!startDate || !endDate) return;
    setIsFiltering(true);
    setSelectedDay('');
    fetchSensorData(true, startDate, endDate);
  };

  const clearFilter = () => {
    setIsFiltering(false);
    setStartDate('');
    setEndDate('');
    setSelectedDay('');
    fetchSensorData(false, '', '');
  };

  const getCsvUrl = () => {
    if (isFiltering && startDate && endDate) {
      const s = encodeURIComponent(new Date(startDate).toISOString());
      const e = encodeURIComponent(new Date(endDate).toISOString());
      return `/api/download?start=${s}&end=${e}`;
    }
    return '/api/download';
  };

  // ── Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSensorData();
    fetchAvailableDays();
    fetchRecordingState();
    const interval = setInterval(() => {
      if (!isFiltering) fetchSensorData(false, '', '');
    }, 30000); // Datos cada 2 min del ESP32, refresh cada 30s
    const daysInterval = setInterval(fetchAvailableDays, 60000);
    return () => { clearInterval(interval); clearInterval(daysInterval); };
  }, [isFiltering]);

  // ── Chart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current || history.length === 0) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const labels = history.map(h => {
      const d = new Date(h.created_at);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
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
          { label:'Potencia (mW)', data: powData, borderColor:'#00e676', backgroundColor:'rgba(0,230,118,0.15)', borderWidth:2, pointRadius:0, fill:true, tension:0.35, yAxisID:'yP', order:1 },
          { label:'GHI (W/m²)',    data: ghiData, borderColor:'#f7a800', backgroundColor:'rgba(247,168,0,0.10)', borderWidth:1.8, pointRadius:0, fill:true, tension:0.35, yAxisID:'yG', order:2 },
          { label:'Voltaje (V)',   data: vData,   borderColor:'#00c8ff', backgroundColor:'transparent', borderWidth:1.5, pointRadius:0, fill:false, tension:0.3, borderDash:[6,3], yAxisID:'yV', order:3 },
          { label:'Corriente (mA)',data: iData,   borderColor:'#80dfff', backgroundColor:'transparent', borderWidth:1.8, pointRadius:0, fill:false, tension:0.3, yAxisID:'yI', order:4 },
        ]
      },
      options: {
        animation: false, responsive: true,
        interaction: { mode:'index', intersect:false },
        scales: {
          x: { ticks:{ color:'#4a6078', font:{family:'Share Tech Mono',size:8}, maxTicksLimit:14 }, grid:{color:'rgba(26,40,64,0.5)'} },
          yP: { type:'linear', position:'left', min:0, max:pMax, ticks:{color:'#00e676',font:{family:'Share Tech Mono',size:8},callback:(v:any)=>`${v}mW`}, grid:{color:'rgba(26,40,64,0.4)'}, title:{display:true,text:'Potencia (mW)',color:'#00e676',font:{family:'Share Tech Mono',size:8}} },
          yG: { type:'linear', position:'right', min:0, max:gMax, ticks:{color:'#f7a800',font:{family:'Share Tech Mono',size:8}}, grid:{display:false}, title:{display:true,text:'GHI (W/m²)',color:'#f7a800',font:{family:'Share Tech Mono',size:8}} },
          yV: { type:'linear', position:'right', min:0, max:8, ticks:{color:'#00c8ff',font:{family:'Share Tech Mono',size:8},callback:(v:any)=>`${v}V`}, grid:{display:false} },
          yI: { type:'linear', position:'right', min:0, ticks:{color:'#80dfff',font:{family:'Share Tech Mono',size:8},callback:(v:any)=>`${v}mA`}, grid:{display:false} },
        },
        plugins: {
          legend: { labels:{ color:'#d0e0f0', font:{family:'Share Tech Mono',size:9}, boxWidth:24, padding:14, usePointStyle:true } },
          tooltip: { backgroundColor:'#0b1018', borderColor:'#1a2840', borderWidth:1, titleColor:'#d0e0f0', bodyColor:'#7090b0', titleFont:{family:'Share Tech Mono'}, bodyFont:{family:'Share Tech Mono',size:11} }
        }
      }
    });
  }, [history]);

  // ── Gauge ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gaugeRef.current || !data) return;
    const c = gaugeRef.current;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const pct = data.ef, cx = c.width/2, cy = c.height-8, r = 85;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,2*Math.PI); ctx.strokeStyle='#1a2840'; ctx.lineWidth=12; ctx.stroke();
    const a = Math.PI + Math.PI * Math.min(Math.max(pct,0),110)/100;
    const g = ctx.createLinearGradient(cx-r,cy,cx+r,cy);
    g.addColorStop(0,'#ff4560'); g.addColorStop(.5,'#f7a800'); g.addColorStop(1,'#00e676');
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,a); ctx.strokeStyle=g; ctx.lineWidth=12; ctx.stroke();
  }, [data]);

  const fallback = { v:0,i:0,p:0,t:0,ah:90,av:90,st:0,ec:0,mp:0,pp:0,ef:0,ghi:0,dni:0,irrh:'--',cielo:'---',ltl:0,ltr:0,lbl:0,lbr:0 };
  const d = data || fallback;
  const badgeCls = d.st===0?'':d.st===3?'s':'e';

  return (
    <>
      <header>
        <div className="logo">
          <div className="hex">&#9728;</div>
          <div>
            <div className="ltitle">SOLAR TRACKER</div>
            <div className="lsub">VERCEL + POSTGRESQL — ESP32</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {/* ON/OFF Botón de grabación remota */}
          <button
            className={`btn ${recording ? 'bd' : 'bg'}`}
            style={{ padding:'7px 18px', fontSize:'11px', fontWeight:700, opacity: togglingRec ? 0.6 : 1 }}
            onClick={toggleRecording}
            disabled={togglingRec}
          >
            {recording ? '⏹ DETENER GRABACIÓN' : '⏺ INICIAR GRABACIÓN'}
          </button>
          <div id="badge" className={badgeCls}>
            <span className="dot"></span>
            <span id="est-txt">{recording ? (ESTADOS[d.st]||'CONECTANDO') : 'GRABACIÓN OFF'}</span>
          </div>
        </div>
      </header>

      <main>
        {/* MÉTRICAS */}
        <div className="card">
          <div className="clabel"><span>Voltaje</span><span>&#9889;</span></div>
          <div className="cval">{parseFloat(d.v||0).toFixed(3)}<span className="cunit">V</span></div>
          <div className="csub">INA219 &middot; Bus + Shunt</div>
          <div className="bar"><div className="barfill" style={{ width:`${Math.min(d.v/10*100,100)}%` }}></div></div>
        </div>
        <div className="card b">
          <div className="clabel"><span>Corriente</span><span>&#12316;</span></div>
          <div className="cval">{parseFloat(d.i||0).toFixed(2)}<span className="cunit">mA</span></div>
          <div className="csub">INA219 &middot; Alta precisión</div>
          <div className="bar"><div className="barfill" style={{ width:`${Math.min(d.i/500*100,100)}%` }}></div></div>
        </div>
        <div className="card g">
          <div className="clabel"><span>Potencia</span><span>&#10696;</span></div>
          <div className="cval">{parseFloat(d.p||0).toFixed(2)}<span className="cunit">mW</span></div>
          <div className="csub">Máx: {parseFloat(d.mp||0).toFixed(1)} &middot; Prom: {parseFloat(d.pp||0).toFixed(1)}</div>
          <div className="bar"><div className="barfill" style={{ width:`${Math.min(d.p/300*100,100)}%` }}></div></div>
        </div>
        <div className="card r">
          <div className="clabel"><span>Temperatura celda</span><span>&#127777;</span></div>
          <div className="cval">{parseFloat(d.t||0).toFixed(1)}<span className="cunit">&deg;C</span></div>
          <div className="csub">Open-Meteo &middot; Vercel</div>
          <div className="bar"><div className="barfill" style={{ width:`${Math.min(d.t/80*100,100)}%` }}></div></div>
        </div>

        {/* LDR */}
        <div className="card wide">
          <div className="ptitle"><span>&#9788; SENSORES LDR</span><span style={{color:'var(--dim)'}}>0–4095 ADC</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px'}}>
            {[{lbl:'SUP-IZQ',v:d.ltl,sym:'&#8598;',c:'var(--y)'},{lbl:'SUP-DER',v:d.ltr,sym:'&#8599;',c:'var(--c)'},{lbl:'INF-IZQ',v:d.lbl,sym:'&#8601;',c:'var(--g)'},{lbl:'INF-DER',v:d.lbr,sym:'&#8600;',c:'var(--r)'}].map(s=>(
              <div key={s.lbl}>
                <div className="clabel"><span>{s.lbl}</span><span dangerouslySetInnerHTML={{__html:s.sym}}/></div>
                <div className="cval" style={{fontSize:'22px'}}>{s.v}</div>
                <div className="bar"><div className="barfill" style={{width:`${(s.v/4095*100).toFixed(1)}%`,background:s.c}}></div></div>
              </div>
            ))}
          </div>
        </div>

        {/* IRRADIANCIA */}
        <div className="card wide">
          <div className="ptitle"><span>&#9788; IRRADIANCIA SOLAR (GHI)</span><span style={{color:'var(--dim)'}}>Open-Meteo API</span></div>
          <div className="irr-grid">
            <div className="irr-col"><label>SHORTWAVE GHI</label><div className="irr-val">{parseFloat(d.ghi||0).toFixed(0)}<span className="cunit">W/m&sup2;</span></div></div>
            <div className="irr-col"><label>DNI NORMAL</label><div className="irr-val-sm">{parseFloat(d.dni||0).toFixed(0)} <span style={{fontSize:'11px',color:'var(--dim)'}}>W/m&sup2;</span></div></div>
            <div className="irr-col"><label>HORA DATO</label><div className="irr-hora">{d.irrh||'--'}:00</div></div>
            <div className="irr-col"><label>CIELO</label><div style={{fontFamily:'var(--mono)',fontSize:'13px',color:'var(--c)'}}>{d.cielo||'---'}</div></div>
          </div>
          <div className="bar" style={{marginTop:'12px'}}><div className="barfill" style={{width:`${Math.min(parseFloat(d.ghi||0)/1200*100,100)}%`}}></div></div>
        </div>

        {/* ── SECCIÓN FILTRO POR DÍAS — PROMINENTE ── */}
        <div className="card wide" style={{border:'1px solid rgba(247,168,0,0.3)',background:'rgba(247,168,0,0.03)'}}>
          <div className="ptitle">
            <span>&#128197; FILTRAR DATOS POR DÍA / RANGO</span>
            <span style={{color:'var(--dim)',fontSize:'9px'}}>
              {availableDays.length} días registrados &middot; datos cada 2 min
            </span>
          </div>

          {/* Chips de días disponibles */}
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'14px'}}>
            <button
              className={`btn ${!isFiltering ? 'bp' : 'bo'}`}
              style={{padding:'4px 12px',fontSize:'9px'}}
              onClick={clearFilter}
            >
              TODOS (LIVE)
            </button>
            {availableDays.map(day => (
              <button
                key={day.fecha}
                className={`btn ${selectedDay === day.fecha ? 'bp' : 'bo'}`}
                style={{padding:'4px 12px',fontSize:'9px'}}
                onClick={() => selectDay(day.fecha)}
              >
                {day.fecha} <span style={{opacity:.6,marginLeft:'4px'}}>({day.registros})</span>
              </button>
            ))}
          </div>

          {/* Rango personalizado */}
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            <span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:'10px'}}>RANGO:</span>
            <input
              type="datetime-local"
              style={{background:'var(--bg)',color:'white',border:'1px solid var(--border)',padding:'5px',fontSize:'10px',fontFamily:'var(--mono)',borderRadius:'4px'}}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span style={{color:'var(--dim)',fontSize:'10px'}}>→</span>
            <input
              type="datetime-local"
              style={{background:'var(--bg)',color:'white',border:'1px solid var(--border)',padding:'5px',fontSize:'10px',fontFamily:'var(--mono)',borderRadius:'4px'}}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            <button className="btn bp" style={{padding:'5px 14px'}} onClick={applyFilter}>FILTRAR</button>
            <button className="btn bd" style={{padding:'5px 14px'}} onClick={clearFilter}>&#10005;</button>
            {isFiltering && (
              <span style={{color:'var(--y)',fontFamily:'var(--mono)',fontSize:'10px',marginLeft:'4px'}}>
                ● {history.length} registros {selectedDay ? `(${selectedDay})` : 'en rango'}
              </span>
            )}
            <a
              href={getCsvUrl()}
              className="btn bo"
              style={{textDecoration:'none',padding:'5px 14px',marginLeft:'auto'}}
            >
              &#8595; CSV {isFiltering && selectedDay ? `(${selectedDay})` : '(TODOS)'}
            </a>
          </div>
        </div>

        {/* GRÁFICA */}
        <div className="card wide">
          <div className="ptitle">
            <span>&#11015; VOLTAJE · CORRIENTE · POTENCIA · GHI — HISTÓRICO</span>
            <span style={{color:'var(--dim)',fontSize:'9px'}}>{history.length} pts</span>
          </div>
          <canvas ref={chartRef} height={200}></canvas>
        </div>

        {/* GAUGE + BRÚJULA + ELEVACIÓN + INFO */}
        <div className="card">
          <div className="ptitle"><span>&#9711; EFICIENCIA TÉRMICA</span></div>
          <div className="gwrap">
            <canvas ref={gaugeRef} width={200} height={120}></canvas>
            <div className="gnum">{parseFloat(d.ef||0).toFixed(1)}%</div>
            <div className="gsub">Factor vs STC 25&deg;C</div>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>&#9680; AZIMUT HORIZONTAL</span></div>
          <div className="cwrap">
            <div className="compass">
              <div className="cring"></div><div className="cring m"></div><div className="cring i"></div>
              <div className="clbl N">N</div><div className="clbl S">S</div>
              <div className="clbl E">E</div><div className="clbl O">O</div>
              <div className="needle" style={{transform:`translateX(-50%) translateY(-100%) rotate(${d.ah-90}deg)`}}></div>
              <div className="ctr"></div>
              <div className="cang">{d.ah}&deg;</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>&#9681; ELEVACIÓN VERTICAL</span></div>
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'190px'}}>
            <svg viewBox="0 0 200 120" width={200} height={120}>
              <path d="M10 110 A90 90 0 0 1 190 110" fill="none" stroke="#1a2840" strokeWidth="2"/>
              <text x="5" y="122" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">0&deg;</text>
              <text x="92" y="16" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">90&deg;</text>
              <text x="178" y="122" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">180&deg;</text>
              <g style={{transformOrigin:'100px 110px',transform:`rotate(${d.av-90}deg)`}}>
                <line x1="100" y1="110" x2="100" y2="30" stroke="#f7a800" strokeWidth="3" strokeLinecap="round" opacity=".9"/>
                <polygon points="100,22 95,35 105,35" fill="#f7a800"/>
              </g>
              <circle cx="100" cy="110" r="5" fill="#f7a800" opacity=".8"/>
              <text x="100" y="105" fill="#00c8ff" fontSize="10" fontFamily="Share Tech Mono" textAnchor="middle">{d.av}&deg;</text>
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>&#8857; SISTEMA DB</span></div>
          <div className="irow"><span className="ik">GRABACIÓN</span><span className={`iv ${recording?'ivg':''}`} style={{color:recording?'var(--g)':'var(--r)'}}>{recording?'✅ ACTIVA':'⛔ PAUSADA'}</span></div>
          <div className="irow"><span className="ik">TABLA DB</span><span className="iv">log_data</span></div>
          <div className="irow"><span className="ik">ESTADO</span><span className="iv">{data?'ONLINE':'OFFLINE'}</span></div>
          <div className="irow"><span className="ik">DÍAS REG.</span><span className="iv ivg">{availableDays.length}</span></div>
          <div className="irow"><span className="ik">ENFRIAMIENTOS</span><span className="iv ivg">{d.ec}</span></div>
          <div className="irow"><span className="ik">MEJOR POT.</span><span className="iv ivg">{parseFloat(d.mp||0).toFixed(2)} mW</span></div>
        </div>

        {/* TABLA */}
        <div className="card wide">
          <div className="ptitle">
            <span>&#8862; REGISTRO DE DATOS BACKEND
              {isFiltering && selectedDay && <span style={{color:'var(--y)',marginLeft:'8px'}}>— {selectedDay}</span>}
            </span>
            <a href={getCsvUrl()} className="btn bo" style={{textDecoration:'none',padding:'6px 14px',fontSize:'10px'}}>
              &#8595; CSV {isFiltering && selectedDay ? `(${selectedDay})` : '(TODOS)'}
            </a>
          </div>
          <div className="twrap" style={{maxHeight:'320px'}}>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>FECHA</th><th>HORA</th>
                  <th>V (V)</th><th>I (mA)</th><th>P (mW)</th>
                  <th>T (&deg;C)</th><th>GHI (W/m&sup2;)</th>
                  <th>AH&deg;</th><th>AV&deg;</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={11} style={{textAlign:'center',color:'var(--dim)',padding:'24px'}}>
                    {isFiltering ? 'Sin datos para el rango seleccionado' : 'Esperando datos del ESP32...'}
                  </td></tr>
                )}
                {[...history].reverse().map((row: any) => {
                  const dt = new Date(row.created_at);
                  const fecha = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                  const hora  = `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}:${dt.getSeconds().toString().padStart(2,'0')}`;
                  const ghiVal = parseFloat(row.ghi)||0;
                  return (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td style={{fontSize:'9px',color:'var(--dim)'}}>{fecha}</td>
                      <td>{hora}</td>
                      <td>{parseFloat(row.v).toFixed(3)}</td>
                      <td>{parseFloat(row.i).toFixed(2)}</td>
                      <td>{parseFloat(row.p).toFixed(2)}</td>
                      <td>{parseFloat(row.t).toFixed(1)}</td>
                      <td style={{color:ghiVal>100?'var(--y)':'var(--dim)'}}>{ghiVal.toFixed(0)}</td>
                      <td>{row.ah}</td>
                      <td>{row.av}</td>
                      <td><span className={`tag ${ECLS[row.st]}`}>{ESTADOS[row.st]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
