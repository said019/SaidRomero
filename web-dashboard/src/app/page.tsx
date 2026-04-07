"use client";
import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const ESTADOS = ['NORMAL', 'ENFRIANDO', 'RECUPERANDO', 'SIN_SOL'];
const ECLS    = ['tn','te','te','ts'];

// Guard: never throw on invalid date strings
function safeISO(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function Dashboard() {
  const [latest,  setLatest]  = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [days,    setDays]    = useState<any[]>([]);
  const [selDay,  setSelDay]  = useState('');
  const [showDays, setShowDays] = useState(false);
  const [startDt, setStartDt] = useState('');
  const [endDt,   setEndDt]   = useState('');
  const [filtered, setFiltered] = useState(false);
  const [rec,     setRec]     = useState(true);
  const [toggling, setToggling] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const gaugeRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<any>(null);

  // ── helpers ─────────────────────────────────────────────────────────
  async function loadData(filterOn: boolean, s: string, e: string) {
    let url = '/api/data';
    if (filterOn && s && e) {
      const si = safeISO(s);
      const ei = safeISO(e);
      if (si && ei) {
        url += `?start=${encodeURIComponent(si)}&end=${encodeURIComponent(ei)}`;
      }
    }
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (j.success) {
        if (j.latest)  setLatest(j.latest);
        setHistory(j.history || []);
      }
    } catch(err) {
      console.error('Failed to fetch data', err);
    }
  }

  async function loadDays() {
    const r = await fetch('/api/days');
    const j = await r.json();
    if (j.success) setDays(j.days || []);
  }

  async function loadRec() {
    const r = await fetch('/api/control');
    const j = await r.json();
    if (j.success) setRec(j.recording);
  }

  async function toggleRec() {
    setToggling(true);
    const r = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recording: !rec }),
    });
    const j = await r.json();
    if (j.success) setRec(j.recording);
    setToggling(false);
  }

  function pickDay(fecha: string) {
    const s = `${fecha}T00:00`;
    const e = `${fecha}T23:59`;
    setSelDay(fecha);
    setStartDt(s);
    setEndDt(e);
    setFiltered(true);
    setShowDays(false);
    loadData(true, s, e);
  }

  function clearFilter() {
    setSelDay('');
    setStartDt('');
    setEndDt('');
    setFiltered(false);
    setShowDays(false);
    loadData(false, '', '');
  }

  function applyRange() {
    if (!startDt || !endDt) return;
    setSelDay('');
    setFiltered(true);
    loadData(true, startDt, endDt);
  }

  function csvUrl() {
    if (filtered && startDt && endDt) {
      const si = safeISO(startDt);
      const ei = safeISO(endDt);
      if (si && ei) {
        return `/api/download?start=${encodeURIComponent(si)}&end=${encodeURIComponent(ei)}`;
      }
    }
    return '/api/download';
  }

  // ── Init & polling ───────────────────────────────────────────────────
  useEffect(() => {
    loadData(false, '', '');
    loadDays();
    loadRec();
    const iv = setInterval(() => {
      loadDays();
      loadRec();
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  // Poll data only when not filtered (live mode), every 30s
  useEffect(() => {
    if (filtered) return;
    const iv = setInterval(() => loadData(false, '', ''), 30000);
    return () => clearInterval(iv);
  }, [filtered]);

  // ── Chart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current || history.length === 0) return;
    if (chartInst.current) chartInst.current.destroy();
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const lbl  = history.map(h => { const d = new Date(h.created_at); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; });
    const pow  = history.map(h => parseFloat(h.p)   || 0);
    const ghi  = history.map(h => parseFloat(h.ghi) || 0);
    const volt = history.map(h => parseFloat(h.v)   || 0);
    const curr = history.map(h => parseFloat(h.i)   || 0);

    chartInst.current = new Chart(ctx, {
      type: 'line',
      data: { labels: lbl, datasets: [
        { label:'Potencia (mW)', data:pow,  borderColor:'#00e676', backgroundColor:'rgba(0,230,118,0.15)', borderWidth:2,   pointRadius:0, fill:true,  tension:0.35, yAxisID:'yP' },
        { label:'GHI (W/m²)',    data:ghi,  borderColor:'#f7a800', backgroundColor:'rgba(247,168,0,0.10)', borderWidth:1.8, pointRadius:0, fill:true,  tension:0.35, yAxisID:'yG' },
        { label:'Voltaje (V)',   data:volt, borderColor:'#00c8ff', backgroundColor:'transparent',          borderWidth:1.5, pointRadius:0, fill:false, tension:0.3,  yAxisID:'yV', borderDash:[6,3] },
        { label:'Corriente (mA)',data:curr, borderColor:'#80dfff', backgroundColor:'transparent',          borderWidth:1.8, pointRadius:0, fill:false, tension:0.3,  yAxisID:'yI' },
      ]},
      options: {
        animation:false, responsive:true,
        interaction:{ mode:'index', intersect:false },
        scales: {
          x:  { ticks:{color:'#4a6078',font:{family:'Share Tech Mono',size:8},maxTicksLimit:14}, grid:{color:'rgba(26,40,64,0.5)'} },
          yP: { type:'linear', position:'left',  min:0, ticks:{color:'#00e676',font:{family:'Share Tech Mono',size:8},callback:(v:any)=>`${v}mW`}, grid:{color:'rgba(26,40,64,0.4)'} },
          yG: { type:'linear', position:'right', min:0, ticks:{color:'#f7a800',font:{family:'Share Tech Mono',size:8}}, grid:{display:false} },
          yV: { type:'linear', position:'right', min:0, max:9, ticks:{color:'#00c8ff',font:{family:'Share Tech Mono',size:8},callback:(v:any)=>`${v}V`}, grid:{display:false} },
          yI: { type:'linear', position:'right', min:0, ticks:{color:'#80dfff',font:{family:'Share Tech Mono',size:8},callback:(v:any)=>`${v}mA`}, grid:{display:false} },
        },
        plugins: {
          legend:{ labels:{ color:'#d0e0f0', font:{family:'Share Tech Mono',size:9}, boxWidth:24, padding:14, usePointStyle:true } },
          tooltip:{ backgroundColor:'#0b1018', borderColor:'#1a2840', borderWidth:1, titleColor:'#d0e0f0', bodyColor:'#7090b0', titleFont:{family:'Share Tech Mono'}, bodyFont:{family:'Share Tech Mono',size:11} }
        }
      }
    });
  }, [history]);

  // ── Gauge ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gaugeRef.current || !latest) return;
    const c = gaugeRef.current, ctx = c.getContext('2d');
    if (!ctx) return;
    const pct=parseFloat(latest.ef)||0, cx=c.width/2, cy=c.height-8, r=85;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,2*Math.PI); ctx.strokeStyle='#1a2840'; ctx.lineWidth=12; ctx.stroke();
    const a = Math.PI + Math.PI * Math.min(Math.max(pct,0),110)/100;
    const g = ctx.createLinearGradient(cx-r,cy,cx+r,cy);
    g.addColorStop(0,'#ff4560'); g.addColorStop(.5,'#f7a800'); g.addColorStop(1,'#00e676');
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,a); ctx.strokeStyle=g; ctx.lineWidth=12; ctx.stroke();
  }, [latest]);

  const d = latest || { v:0,i:0,p:0,t:0,ah:90,av:90,st:0,ec:0,mp:0,pp:0,ef:0,ghi:0,dni:0,irrh:'--',cielo:'---',ltl:0,ltr:0,lbl:0,lbr:0 };

  return (
    <>
      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <header>
        <div className="logo">
          <div className="hex">&#9728;</div>
          <div>
            <div className="ltitle">SOLAR TRACKER</div>
            <div className="lsub">VERCEL + POSTGRESQL — ESP32</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          {/* ▶ BOTÓN GRABACIÓN REMOTA */}
          <button
            onClick={toggleRec}
            disabled={toggling}
            style={{
              padding:'8px 20px', borderRadius:'4px', cursor:'pointer',
              fontFamily:'var(--mono)', fontSize:'11px', fontWeight:700,
              letterSpacing:'.08em', textTransform:'uppercase',
              border: rec ? '1px solid var(--r)' : '1px solid var(--g)',
              background: rec ? 'rgba(255,69,96,.15)' : 'rgba(0,230,118,.15)',
              color: rec ? 'var(--r)' : 'var(--g)',
              opacity: toggling ? 0.5 : 1,
              transition:'all .2s',
            }}
          >
            {rec ? '⏹ DETENER GRABACIÓN' : '▶ INICIAR GRABACIÓN'}
          </button>
          <div id="badge" className={d.st===3?'s':d.st===0?'':'e'}>
            <span className="dot"></span>
            <span>{rec ? (ESTADOS[d.st]||'CONECTANDO') : 'PAUSADO'}</span>
          </div>
        </div>
      </header>

      <main>
        {/* ══ MÉTRICAS ════════════════════════════════════════════════ */}
        <div className="card">
          <div className="clabel"><span>Voltaje</span><span>⚡</span></div>
          <div className="cval">{parseFloat(d.v||0).toFixed(3)}<span className="cunit">V</span></div>
          <div className="csub">INA219 · Bus + Shunt</div>
          <div className="bar"><div className="barfill" style={{width:`${Math.min(d.v/10*100,100)}%`}}></div></div>
        </div>
        <div className="card b">
          <div className="clabel"><span>Corriente</span><span>～</span></div>
          <div className="cval">{parseFloat(d.i||0).toFixed(2)}<span className="cunit">mA</span></div>
          <div className="csub">INA219 · Alta precisión</div>
          <div className="bar"><div className="barfill" style={{width:`${Math.min(d.i/500*100,100)}%`}}></div></div>
        </div>
        <div className="card g">
          <div className="clabel"><span>Potencia</span><span>⚙</span></div>
          <div className="cval">{parseFloat(d.p||0).toFixed(2)}<span className="cunit">mW</span></div>
          <div className="csub">Máx: {parseFloat(d.mp||0).toFixed(1)} · Prom: {parseFloat(d.pp||0).toFixed(1)}</div>
          <div className="bar"><div className="barfill" style={{width:`${Math.min(d.p/300*100,100)}%`}}></div></div>
        </div>
        <div className="card r">
          <div className="clabel"><span>Temperatura</span><span>🌡</span></div>
          <div className="cval">{parseFloat(d.t||0).toFixed(1)}<span className="cunit">°C</span></div>
          <div className="csub">Open-Meteo · Vercel</div>
          <div className="bar"><div className="barfill" style={{width:`${Math.min(d.t/80*100,100)}%`}}></div></div>
        </div>

        {/* ══ LDR ════════════════════════════════════════════════════ */}
        <div className="card wide">
          <div className="ptitle"><span>☀ SENSORES LDR</span><span style={{color:'var(--dim)'}}>0–4095 ADC</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px'}}>
            {[{l:'SUP-IZQ',v:d.ltl,c:'var(--y)'},{l:'SUP-DER',v:d.ltr,c:'var(--c)'},{l:'INF-IZQ',v:d.lbl,c:'var(--g)'},{l:'INF-DER',v:d.lbr,c:'var(--r)'}].map(s=>(
              <div key={s.l}>
                <div className="clabel"><span>{s.l}</span></div>
                <div className="cval" style={{fontSize:'22px'}}>{s.v}</div>
                <div className="bar"><div className="barfill" style={{width:`${Math.min(s.v/4095*100,100).toFixed(1)}%`,background:s.c}}></div></div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ IRRADIANCIA ════════════════════════════════════════════ */}
        <div className="card wide">
          <div className="ptitle"><span>☀ IRRADIANCIA SOLAR</span><span style={{color:'var(--dim)'}}>Open-Meteo API · W/m²</span></div>
          <div className="irr-grid">
            <div className="irr-col"><label>SHORTWAVE GHI</label><div className="irr-val">{parseFloat(d.ghi||0).toFixed(0)}<span className="cunit"> W/m²</span></div></div>
            <div className="irr-col"><label>DNI NORMAL</label><div className="irr-val-sm">{parseFloat(d.dni||0).toFixed(0)} <span style={{fontSize:'10px',color:'var(--dim)'}}>W/m²</span></div></div>
            <div className="irr-col"><label>HORA DATO</label><div className="irr-hora">{d.irrh||'--'}:00</div></div>
            <div className="irr-col"><label>CIELO</label><div style={{fontFamily:'var(--mono)',fontSize:'13px',color:'var(--c)'}}>{d.cielo||'---'}</div></div>
          </div>
          <div className="bar" style={{marginTop:'12px'}}><div className="barfill" style={{width:`${Math.min(parseFloat(d.ghi||0)/1200*100,100)}%`}}></div></div>
        </div>

        {/* ══ GRÁFICA + FILTROS (inline en header como versión anterior) ══════ */}
        <div className="card wide">
          <div className="ptitle" style={{flexWrap:'wrap',gap:'6px',alignItems:'center'}}>
            {/* Título */}
            <span style={{whiteSpace:'nowrap'}}>⬇ VOLTAJE · CORRIENTE · POTENCIA · IRRADIANCIA — BD</span>

            {/* ── DIAS dropdown ── */}
            <div style={{position:'relative',display:'inline-block'}}>
              <button
                onClick={()=>setShowDays(v=>!v)}
                style={{padding:'5px 12px',borderRadius:'3px',background:filtered?'var(--y)':'rgba(247,168,0,.1)',color:filtered?'#000':'var(--y)',border:'1px solid var(--y)',fontFamily:'var(--mono)',fontSize:'9px',fontWeight:700,cursor:'pointer',letterSpacing:'.08em',whiteSpace:'nowrap'}}
              >
                📅 {selDay ? selDay : 'DIAS'}
              </button>
              {/* dropdown */}
              {showDays && (
                <div style={{position:'absolute',top:'100%',left:0,zIndex:200,background:'#0d1520',border:'1px solid var(--border)',borderRadius:'4px',minWidth:'200px',maxHeight:'220px',overflowY:'auto',marginTop:'3px',boxShadow:'0 6px 24px rgba(0,0,0,.7)'}}>
                  <div
                    onClick={()=>{ clearFilter(); }}
                    style={{padding:'7px 14px',cursor:'pointer',fontFamily:'var(--mono)',fontSize:'10px',color:'var(--y)',borderBottom:'1px solid var(--border)',background:'rgba(247,168,0,.06)'}}
                  >
                    ▶ EN VIVO (últimos datos)
                  </div>
                  {days.map((day:any)=>(
                    <div
                      key={day.fecha}
                      onClick={()=>pickDay(day.fecha)}
                      style={{padding:'7px 14px',cursor:'pointer',fontFamily:'var(--mono)',fontSize:'10px',color:'var(--tx)',borderBottom:'1px solid rgba(26,40,64,.4)',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(247,168,0,.07)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                    >
                      <span>{day.fecha}</span>
                      <span style={{color:'var(--dim)',fontSize:'9px'}}>{day.registros} reg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inputs de rango */}
            <input
              type="datetime-local"
              value={startDt}
              onChange={e=>setStartDt(e.target.value)}
              style={{background:'var(--bg)',color:'#ddd',border:'1px solid var(--border)',padding:'4px 6px',fontSize:'9px',fontFamily:'var(--mono)',borderRadius:'3px',minWidth:'0',flex:'1',maxWidth:'180px'}}
            />
            <span style={{color:'var(--dim)',fontSize:'10px',flexShrink:0}}>A</span>
            <input
              type="datetime-local"
              value={endDt}
              onChange={e=>setEndDt(e.target.value)}
              style={{background:'var(--bg)',color:'#ddd',border:'1px solid var(--border)',padding:'4px 6px',fontSize:'9px',fontFamily:'var(--mono)',borderRadius:'3px',minWidth:'0',flex:'1',maxWidth:'180px'}}
            />
            <button
              onClick={applyRange}
              style={{padding:'5px 12px',borderRadius:'3px',background:'var(--y)',color:'#000',border:'none',fontFamily:'var(--mono)',fontSize:'9px',fontWeight:700,cursor:'pointer',letterSpacing:'.08em',whiteSpace:'nowrap',flexShrink:0}}
            >
              FILTRAR
            </button>
            <button
              onClick={clearFilter}
              style={{padding:'5px 12px',borderRadius:'3px',background:'transparent',color:'var(--tx)',border:'1px solid var(--border)',fontFamily:'var(--mono)',fontSize:'9px',cursor:'pointer',letterSpacing:'.08em',flexShrink:0}}
            >
              LIMPIAR
            </button>
            {/* Contador */}
            <span style={{color:'var(--dim)',fontSize:'9px',whiteSpace:'nowrap',marginLeft:'4px'}}>
              {history.length} PTS{selDay?` · ${selDay}`:filtered?' · rango':''}
            </span>
          </div>
          <canvas ref={chartRef} height={200}></canvas>
        </div>

        {/* ══ GAUGE + BRÚJULA + ELEVACIÓN + INFO ═════════════════════ */}
        <div className="card">
          <div className="ptitle"><span>◯ EFICIENCIA TÉRMICA</span></div>
          <div className="gwrap">
            <canvas ref={gaugeRef} width={200} height={120}></canvas>
            <div className="gnum">{parseFloat(d.ef||0).toFixed(1)}%</div>
            <div className="gsub">Factor vs STC 25°C</div>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>◐ AZIMUT HORIZONTAL</span></div>
          <div className="cwrap">
            <div className="compass">
              <div className="cring"></div><div className="cring m"></div><div className="cring i"></div>
              <div className="clbl N">N</div><div className="clbl S">S</div>
              <div className="clbl E">E</div><div className="clbl O">O</div>
              <div className="needle" style={{transform:`translateX(-50%) translateY(-100%) rotate(${d.ah-90}deg)`}}></div>
              <div className="ctr"></div>
              <div className="cang">{d.ah}°</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>◑ ELEVACIÓN VERTICAL</span></div>
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'190px'}}>
            <svg viewBox="0 0 200 120" width={200} height={120}>
              <path d="M10 110 A90 90 0 0 1 190 110" fill="none" stroke="#1a2840" strokeWidth="2"/>
              <text x="5" y="122" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">0°</text>
              <text x="92" y="16" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">90°</text>
              <text x="178" y="122" fill="#4a6078" fontSize="8" fontFamily="Share Tech Mono">180°</text>
              <g style={{transformOrigin:'100px 110px',transform:`rotate(${d.av-90}deg)`}}>
                <line x1="100" y1="110" x2="100" y2="30" stroke="#f7a800" strokeWidth="3" strokeLinecap="round" opacity=".9"/>
                <polygon points="100,22 95,35 105,35" fill="#f7a800"/>
              </g>
              <circle cx="100" cy="110" r="5" fill="#f7a800" opacity=".8"/>
              <text x="100" y="105" fill="#00c8ff" fontSize="10" fontFamily="Share Tech Mono" textAnchor="middle">{d.av}°</text>
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="ptitle"><span>⊕ SISTEMA</span></div>
          <div className="irow"><span className="ik">GRABACIÓN</span><span className="iv" style={{color:rec?'var(--g)':'var(--r)'}}>{rec?'✅ ACTIVA':'⛔ PAUSADA'}</span></div>
          <div className="irow"><span className="ik">DÍAS REG.</span><span className="iv ivg">{days.length}</span></div>
          <div className="irow"><span className="ik">ENFRIAMIENTOS</span><span className="iv ivg">{d.ec}</span></div>
          <div className="irow"><span className="ik">MEJOR POT.</span><span className="iv ivg">{parseFloat(d.mp||0).toFixed(2)} mW</span></div>
          <div className="irow"><span className="ik">PUNTOS VISTA</span><span className="iv">{history.length}</span></div>
        </div>

        {/* ══ TABLA ══════════════════════════════════════════════════ */}
        <div className="card wide">
          <div className="ptitle">
            <span>⊞ REGISTRO DE DATOS BACKEND
              {filtered && selDay && <span style={{color:'var(--y)',marginLeft:'8px',fontSize:'10px'}}>— {selDay}</span>}
            </span>
            <a href={csvUrl()} download
              style={{padding:'6px 16px',borderRadius:'4px',border:'1px solid var(--c)',color:'var(--c)',fontFamily:'var(--mono)',fontSize:'10px',letterSpacing:'.08em',textDecoration:'none',background:'rgba(0,200,255,.07)'}}>
              ↓ CSV {filtered && selDay ? `(${selDay})` : '(TODOS)'}
            </a>
          </div>
          <div className="twrap" style={{maxHeight:'350px'}}>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>FECHA</th><th>HORA</th>
                  <th>V (V)</th><th>I (mA)</th><th>P (mW)</th>
                  <th>T (°C)</th><th>GHI (W/m²)</th>
                  <th>AH°</th><th>AV°</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={11} style={{textAlign:'center',color:'var(--dim)',padding:'28px',fontFamily:'var(--mono)',fontSize:'11px'}}>
                    {filtered ? '📭 Sin datos para el rango seleccionado' : '⏳ Esperando datos del ESP32 (cada 2 min)...'}
                  </td></tr>
                )}
                {[...history].reverse().map((row:any) => {
                  const dt  = new Date(row.created_at);
                  const fec = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                  const hor = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;
                  const gv  = parseFloat(row.ghi)||0;
                  return (
                    <tr key={row.id}>
                      <td style={{color:'var(--dim)'}}>{row.id}</td>
                      <td style={{fontSize:'9px',color:'var(--dim)'}}>{fec}</td>
                      <td>{hor}</td>
                      <td>{parseFloat(row.v).toFixed(3)}</td>
                      <td>{parseFloat(row.i).toFixed(2)}</td>
                      <td>{parseFloat(row.p).toFixed(2)}</td>
                      <td>{parseFloat(row.t).toFixed(1)}</td>
                      <td style={{color:gv>100?'var(--y)':'var(--dim)'}}>{gv.toFixed(0)}</td>
                      <td>{row.ah}</td>
                      <td>{row.av}</td>
                      <td><span className={`tag ${ECLS[parseInt(row.st)||0]}`}>{ESTADOS[parseInt(row.st)||0]}</span></td>
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
