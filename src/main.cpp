/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   SEGUIMIENTO SOLAR v5.1 — IRRADIANCIA REAL OPEN-METEO          ║
 * ║   INA219 + OLED SSD1306 + Web Dashboard                          ║
 * ║   Temperatura + Irradiancia vía Open-Meteo API (SJR)            ║
 * ║   shortwave_radiation + direct_normal_irradiance (W/m²)         ║
 * ║   4×LDR + 2×Servo + LittleFS CSV + WebServer                     ║
 * ║   UT San Juan del Río | Tesis: Panel Solar con Movimiento        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Wire.h>
#include <time.h>
#include <Adafruit_INA219.h>
#include <ESP32Servo.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <math.h>

// ─────────────────────────────────────────────────────────────────────
//  1. DASHBOARD WEB
// ─────────────────────────────────────────────────────────────────────
const char HTML_PAGE[] PROGMEM = R"=====(
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solar Tracker — UT San Juan del Río</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow:wght@400;700;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#070a0f;--panel:#111820;--border:#1a2840;--y:#f7a800;--c:#00c8ff;--g:#00e676;--r:#ff4560;--tx:#c9d8e8;--dim:#4a6078;--mono:'Share Tech Mono',monospace;--sans:'Barlow',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font-family:var(--sans);min-height:100vh}
body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,200,255,.01) 3px,rgba(0,200,255,.01) 4px);pointer-events:none}
header{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--border);background:linear-gradient(90deg,rgba(247,168,0,.07),transparent)}
.logo{display:flex;align-items:center;gap:12px}
.hex{width:40px;height:40px;background:var(--y);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 18px rgba(247,168,0,.5);animation:pulse 2.5s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 18px rgba(247,168,0,.4)}50%{box-shadow:0 0 32px rgba(247,168,0,.8)}}
.ltitle{font-size:17px;font-weight:900;color:#fff;letter-spacing:.06em}
.lsub{font-family:var(--mono);font-size:10px;color:var(--dim);letter-spacing:.12em}
#badge{display:flex;align-items:center;gap:7px;padding:5px 14px;border-radius:4px;border:1px solid var(--g);color:var(--g);background:rgba(0,230,118,.05);font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;transition:all .4s}
#badge.e{border-color:var(--c);color:var(--c);background:rgba(0,200,255,.05)}
#badge.s{border-color:var(--r);color:var(--r);background:rgba(255,69,96,.05)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:blink 1.2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}
#reloj{font-family:var(--mono);font-size:12px;color:var(--dim)}
main{padding:20px 28px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:1400px;margin:0 auto}
.card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:18px 20px;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--y)}
.card.b::before{background:var(--c)}.card.g::before{background:var(--g)}.card.r::before{background:var(--r)}
.clabel{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-family:var(--mono);margin-bottom:8px;display:flex;justify-content:space-between}
.cval{font-family:var(--mono);font-size:34px;color:#fff;line-height:1}
.cunit{font-size:13px;color:var(--dim);margin-left:3px}
.csub{margin-top:6px;font-size:10px;color:var(--dim);font-family:var(--mono)}
.bar{margin-top:10px;height:3px;background:var(--border);border-radius:2px;overflow:hidden}
.barfill{height:100%;background:var(--y);border-radius:2px;transition:width .8s ease;min-width:2px}
.card.b .barfill{background:var(--c)}.card.g .barfill{background:var(--g)}.card.r .barfill{background:var(--r)}
.wide{grid-column:span 4}.span2{grid-column:span 2}.span3{grid-column:span 3}
.ptitle{font-family:var(--mono);font-size:10px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}
.ptitle span{color:var(--y)}
canvas{width:100%!important}
.twrap{overflow-x:auto;max-height:210px;overflow-y:auto;margin-top:4px}
.twrap::-webkit-scrollbar{width:3px;height:3px}.twrap::-webkit-scrollbar-thumb{background:var(--border)}
table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px}
th{padding:6px 10px;text-align:left;color:var(--dim);font-weight:400;border-bottom:1px solid var(--border);background:var(--panel);position:sticky;top:0;letter-spacing:.06em;white-space:nowrap}
td{padding:7px 10px;border-bottom:1px solid rgba(26,40,64,.4);white-space:nowrap}
tr:hover td{background:rgba(247,168,0,.02)}
.tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;letter-spacing:.07em}
.tn{background:rgba(0,230,118,.1);color:#00e676}.te{background:rgba(0,200,255,.1);color:#00c8ff}.ts{background:rgba(255,69,96,.1);color:#ff4560}
.gwrap{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0}
.gnum{font-family:var(--mono);font-size:24px;color:var(--g)}
.gsub{font-size:10px;color:var(--dim);font-family:var(--mono)}
.cwrap{display:flex;justify-content:center;align-items:center;height:190px}
.compass{position:relative;width:170px;height:170px}
.cring{position:absolute;inset:0;border-radius:50%;border:1px solid var(--border)}
.cring.m{inset:22px;border-style:dashed;opacity:.35}.cring.i{inset:44px;opacity:.18}
.clbl{position:absolute;font-family:var(--mono);font-size:9px;color:var(--dim)}
.clbl.N{top:3px;left:50%;transform:translateX(-50%)}.clbl.S{bottom:3px;left:50%;transform:translateX(-50%)}
.clbl.E{right:3px;top:50%;transform:translateY(-50%)}.clbl.O{left:3px;top:50%;transform:translateY(-50%)}
.needle{position:absolute;top:50%;left:50%;width:3px;height:65px;background:linear-gradient(var(--y),transparent);transform-origin:bottom center;transform:translateX(-50%) translateY(-100%) rotate(0deg);border-radius:2px;transition:transform .8s cubic-bezier(.34,1.56,.64,1);box-shadow:0 0 8px rgba(247,168,0,.5)}
.ctr{position:absolute;top:50%;left:50%;width:9px;height:9px;border-radius:50%;background:var(--y);transform:translate(-50%,-50%);box-shadow:0 0 10px rgba(247,168,0,.6)}
.cang{position:absolute;bottom:-26px;width:100%;text-align:center;font-family:var(--mono);font-size:12px;color:var(--y)}
.ctrlgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
.crow{display:flex;align-items:center;gap:8px;grid-column:span 2}
.clb{font-family:var(--mono);font-size:10px;color:var(--dim);min-width:56px;letter-spacing:.06em}
input[type=range]{flex:1;-webkit-appearance:none;height:3px;border-radius:2px;background:var(--border);outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:var(--y);border:2px solid var(--bg);box-shadow:0 0 5px rgba(247,168,0,.4);transition:transform .15s}
input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.3)}
.cv{font-family:var(--mono);font-size:11px;color:var(--y);min-width:32px;text-align:right}
.btn{padding:7px 16px;border-radius:4px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border:none;transition:all .2s}
.bp{background:var(--y);color:#000;font-weight:700}.bp:hover{background:#ffbc20;transform:translateY(-1px)}
.bo{background:transparent;color:var(--c);border:1px solid var(--c)}.bo:hover{background:rgba(0,200,255,.1)}
.bd{background:transparent;color:var(--r);border:1px solid var(--r)}.bd:hover{background:rgba(255,69,96,.1)}
.irow{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(26,40,64,.4)}
.ik{font-family:var(--mono);font-size:10px;color:var(--dim)}.iv{font-family:var(--mono);font-size:11px}.ivg{color:var(--g)}
.irr-grid{display:flex;align-items:flex-end;gap:28px;margin-top:4px}
.irr-col label{font-size:9px;color:var(--dim);font-family:var(--mono);display:block;margin-bottom:4px}
.irr-val{font-family:var(--mono);font-size:30px;color:#fff;line-height:1}
.irr-val-sm{font-family:var(--mono);font-size:22px;color:var(--y);line-height:1}
.irr-hora{font-family:var(--mono);font-size:14px;color:var(--dim)}
@media(max-width:900px){main{grid-template-columns:repeat(2,1fr)}.wide,.span3{grid-column:span 2}}
@media(max-width:520px){main{grid-template-columns:1fr;padding:12px}.wide,.span3,.span2{grid-column:span 1}header{padding:12px 14px;flex-wrap:wrap;gap:8px}}
</style>
</head>
<body>
<header>
  <div class="logo">
    <div class="hex">&#9728;</div>
    <div>
      <div class="ltitle">SOLAR TRACKER</div>
      <div class="lsub">UT SAN JUAN DEL RÍO &middot; TESIS 2026</div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:18px">
    <div id="badge"><span class="dot"></span><span id="est-txt">CONECTANDO</span></div>
    <div id="reloj">--:--:--</div>
  </div>
</header>

<main>
  <!-- Fila 1: métricas -->
  <div class="card">
    <div class="clabel"><span>Voltaje</span><span>&#9889;</span></div>
    <div class="cval" id="mv">--<span class="cunit">V</span></div>
    <div class="csub">INA219 &middot; Bus + Shunt</div>
    <div class="bar"><div class="barfill" id="bv" style="width:0%"></div></div>
  </div>
  <div class="card b">
    <div class="clabel"><span>Corriente</span><span>&#12316;</span></div>
    <div class="cval" id="mi">--<span class="cunit">mA</span></div>
    <div class="csub">INA219 &middot; Alta precisión</div>
    <div class="bar"><div class="barfill" id="bi" style="width:0%"></div></div>
  </div>
  <div class="card g">
    <div class="clabel"><span>Potencia</span><span>&#10696;</span></div>
    <div class="cval" id="mp">--<span class="cunit">mW</span></div>
    <div class="csub" id="sp">Máx: -- &middot; Prom: --</div>
    <div class="bar"><div class="barfill" id="bp2" style="width:0%"></div></div>
  </div>
  <div class="card r">
    <div class="clabel"><span>Temperatura celda</span><span>&#127777;</span></div>
    <div class="cval" id="mt">--<span class="cunit">&deg;C</span></div>
    <div class="csub">Open-Meteo &middot; San Juan del Río</div>
    <div class="bar"><div class="barfill" id="bt" style="width:0%"></div></div>
  </div>

  <!-- Fila 2: irradiancia + gráfica -->
  <div class="card wide">
    <div class="ptitle"><span>&#9788; IRRADIANCIA SOLAR (GHI)</span><span style="color:var(--dim)">Open-Meteo ERA5/IFS</span></div>
    <div class="irr-grid">
      <div class="irr-col">
        <label>SHORTWAVE GHI</label>
        <div class="irr-val" id="ghi">--<span class="cunit">W/m&sup2;</span></div>
      </div>
      <div class="irr-col">
        <label>DNI NORMAL</label>
        <div class="irr-val-sm" id="dni">-- <span style="font-size:11px;color:var(--dim)">W/m&sup2;</span></div>
      </div>
      <div class="irr-col">
        <label>HORA DATO</label>
        <div class="irr-hora" id="irr-hora">--:00</div>
      </div>
      <div class="irr-col">
        <label>CIELO</label>
        <div style="font-family:var(--mono);font-size:13px;color:var(--c)" id="irr-cielo">---</div>
      </div>
    </div>
    <div class="bar" style="margin-top:12px"><div class="barfill" id="bghi" style="width:0%"></div></div>
  </div>

  <div class="card wide">
    <div class="ptitle">
      <span>&#11015; VOLTAJE &middot; CORRIENTE &middot; POTENCIA &middot; IRRADIANCIA</span>
      <span id="npts" style="color:var(--dim)">0 pts</span>
    </div>
    <canvas id="chartPT" height="80"></canvas>
  </div>
  <!-- Fila 3: gauge + brújula + elevación + control -->
  <div class="card">
    <div class="ptitle"><span>&#9711; EFICIENCIA TÉRMICA</span></div>
    <div class="gwrap">
      <canvas id="cGauge" width="200" height="120"></canvas>
      <div class="gnum" id="ef-num">--.-%</div>
      <div class="gsub">Factor vs STC 25&deg;C</div>
    </div>
  </div>

  <div class="card">
    <div class="ptitle"><span>&#9680; AZIMUT HORIZONTAL</span></div>
    <div class="cwrap">
      <div class="compass">
        <div class="cring"></div>
        <div class="cring m"></div>
        <div class="cring i"></div>
        <div class="clbl N">N</div><div class="clbl S">S</div>
        <div class="clbl E">E</div><div class="clbl O">O</div>
        <div class="needle" id="needle"></div>
        <div class="ctr"></div>
        <div class="cang" id="cang">--&deg;</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ptitle"><span>&#9681; ELEVACIÓN VERTICAL</span></div>
    <div style="display:flex;justify-content:center;align-items:center;height:190px">
      <svg viewBox="0 0 200 120" width="200" height="120">
        <path d="M10 110 A90 90 0 0 1 190 110" fill="none" stroke="#1a2840" stroke-width="2"/>
        <text x="5"  y="122" fill="#4a6078" font-size="8" font-family="Share Tech Mono">0&deg;</text>
        <text x="92" y="16"  fill="#4a6078" font-size="8" font-family="Share Tech Mono">90&deg;</text>
        <text x="178" y="122" fill="#4a6078" font-size="8" font-family="Share Tech Mono">180&deg;</text>
        <g id="epanel" style="transform-origin:100px 110px">
          <line x1="100" y1="110" x2="100" y2="30" stroke="#f7a800" stroke-width="3" stroke-linecap="round" opacity=".9"/>
          <polygon points="100,22 95,35 105,35" fill="#f7a800"/>
        </g>
        <circle cx="100" cy="110" r="5" fill="#f7a800" opacity=".8"/>
        <text id="etxt" x="100" y="105" fill="#00c8ff" font-size="10" font-family="Share Tech Mono" text-anchor="middle">--&deg;</text>
      </svg>
    </div>
  </div>

  <div class="card">
    <div class="ptitle"><span>&#8857; CONTROL MANUAL</span></div>
    <div class="ctrlgrid">
      <div class="crow">
        <span class="clb">AZIMUT H</span>
        <input type="range" min="0" max="180" value="90" id="slH" oninput="updCtrl()">
        <span class="cv" id="lh">90&deg;</span>
      </div>
      <div class="crow">
        <span class="clb">ELEVAC. V</span>
        <input type="range" min="30" max="150" value="90" id="slV" oninput="updCtrl()">
        <span class="cv" id="lv">90&deg;</span>
      </div>
      <button class="btn bp" onclick="moverPanel()">MOVER PANEL</button>
      <button class="btn bo" onclick="homePanel()">HOME 90&deg;</button>
    </div>
  </div>

  <!-- LDR -->
  <div class="card wide">
    <div class="ptitle"><span>&#9788; SENSORES LDR</span><span style="color:var(--dim)">0–4095 ADC</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
      <div>
        <div class="clabel"><span>SUP-IZQ</span><span>&#8598;</span></div>
        <div class="cval" id="ltl" style="font-size:22px">--</div>
        <div class="bar"><div class="barfill" id="bltl" style="width:0%;background:var(--y)"></div></div>
      </div>
      <div>
        <div class="clabel"><span>SUP-DER</span><span>&#8599;</span></div>
        <div class="cval" id="ltr" style="font-size:22px">--</div>
        <div class="bar"><div class="barfill" id="bltr" style="width:0%;background:var(--c)"></div></div>
      </div>
      <div>
        <div class="clabel"><span>INF-IZQ</span><span>&#8601;</span></div>
        <div class="cval" id="lbl" style="font-size:22px">--</div>
        <div class="bar"><div class="barfill" id="blbl" style="width:0%;background:var(--g)"></div></div>
      </div>
      <div>
        <div class="clabel"><span>INF-DER</span><span>&#8600;</span></div>
        <div class="cval" id="lbr" style="font-size:22px">--</div>
        <div class="bar"><div class="barfill" id="blbr" style="width:0%;background:var(--r)"></div></div>
      </div>
    </div>
  </div>

  <!-- Fila 4: tabla -->
  <div class="card span3">
    <div class="ptitle">
      <span>&#8862; REGISTRO DE DATOS</span>
      <div style="display:flex;gap:8px">
        <button class="btn bo" onclick="location.href='/descargar'">&#8595; CSV</button>
        <button class="btn bd" onclick="limpiarLog()">&#10005; LIMPIAR</button>
      </div>
    </div>
    <div class="twrap">
      <table>
        <thead>
          <tr>
            <th>#</th><th>HORA</th><th>V (V)</th><th>I (mA)</th>
            <th>P (mW)</th><th>T (&deg;C)</th><th>GHI (W/m&sup2;)</th>
            <th>AH&deg;</th><th>AV&deg;</th><th>ESTADO</th>
          </tr>
        </thead>
        <tbody id="tbody">
          <tr><td colspan="10" style="text-align:center;color:var(--dim);padding:20px">Conectando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <div class="ptitle"><span>&#8857; SISTEMA ESP32</span></div>
    <div class="irow"><span class="ik">IP LOCAL</span><span class="iv" id="sip">--</span></div>
    <div class="irow"><span class="ik">WiFi RSSI</span><span class="iv" id="srssi">--</span></div>
    <div class="irow"><span class="ik">HEAP LIBRE</span><span class="iv" id="sheap">--</span></div>
    <div class="irow"><span class="ik">UPTIME</span><span class="iv" id="sup">--</span></div>
    <div class="irow"><span class="ik">LOG CSV</span><span class="iv" id="sfs">--</span></div>
    <div class="irow"><span class="ik">ENFRIAMIENTOS</span><span class="iv ivg" id="sec">0</span></div>
    <div class="irow"><span class="ik">MEJOR POT.</span><span class="iv ivg" id="smp">-- mW</span></div>
  </div>
</main>

<!-- Chart.js 2.9.4 — sin private class fields, compatible con ESP32 WebServer -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.min.js"></script>
<script>
/* ── Estado global ── */
var MAX_PTS  = 80;
var histP    = [];
var histT    = []; // No se graficará pero sirve por si acaso
var histV    = [];
var histI    = [];
var histG    = [];
var histL    = [];
var registros = [];
var chartPT  = null;
var prevSt   = -1;
var ESTADOS  = ['NORMAL','ENFRIANDO','RECUPERANDO','SIN_SOL'];
var ECLS     = ['tn','te','te','ts'];

/* ── Inicializar gráfica con Chart.js 2.x ── */
function initChart() {
  var ctx = document.getElementById('chartPT').getContext('2d');
  chartPT = new Chart(ctx, {
    type: 'line',
    data: {
      labels: histL,
      datasets: [
        {
          label: 'Potencia (mW)',
          data: histP,
          borderColor: '#00e676', backgroundColor: 'rgba(0,230,118,0.15)',
          borderWidth: 2, pointRadius: 0, fill: true, lineTension: 0.35, yAxisID: 'yP'
        },
        {
          label: 'GHI (W/m²)',
          data: histG,
          borderColor: '#f7a800', backgroundColor: 'rgba(247,168,0,0.10)',
          borderWidth: 1.8, pointRadius: 0, fill: true, lineTension: 0.35, yAxisID: 'yG'
        },
        {
          label: 'Voltaje (V)',
          data: histV,
          borderColor: '#00c8ff', backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 0, fill: false, lineTension: 0.3, borderDash: [6,3], yAxisID: 'yV'
        },
        {
          label: 'Corriente (mA)',
          data: histI,
          borderColor: '#80dfff', backgroundColor: 'transparent',
          borderWidth: 1.8, pointRadius: 0, fill: false, lineTension: 0.3, yAxisID: 'yI'
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      legend: { labels: { fontColor: '#d0e0f0', fontFamily: 'Share Tech Mono', fontSize: 10, usePointStyle: true } },
      scales: {
        xAxes: [{
          ticks: { fontColor: '#4a6078', fontFamily: 'Share Tech Mono', fontSize: 9, maxTicksLimit: 10 },
          gridLines: { color: 'rgba(26,40,64,0.5)' }
        }],
        yAxes: [
          {
            id: 'yP', position: 'left',
            ticks: { fontColor: '#00e676', fontFamily: 'Share Tech Mono', fontSize: 9 },
            gridLines: { color: 'rgba(26,40,64,0.3)' }
          },
          {
            id: 'yG', position: 'right',
            ticks: { fontColor: '#f7a800', fontFamily: 'Share Tech Mono', fontSize: 9 },
            gridLines: { display: false }
          },
          { id: 'yV', position: 'right', display: false },
          { id: 'yI', position: 'right', display: false }
        ]
      }
    }
  });
}

/* ── Gauge de eficiencia ── */
function drawGauge(pct) {
  var c = document.getElementById('cGauge');
  var ctx = c.getContext('2d');
  var cx = c.width/2, cy = c.height - 8, r = 85;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2*Math.PI);
  ctx.strokeStyle = '#1a2840'; ctx.lineWidth = 12; ctx.stroke();
  var a = Math.PI + Math.PI * Math.min(Math.max(pct,0),110) / 100;
  var g = ctx.createLinearGradient(cx-r, cy, cx+r, cy);
  g.addColorStop(0,'#ff4560'); g.addColorStop(.5,'#f7a800'); g.addColorStop(1,'#00e676');
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, a);
  ctx.strokeStyle = g; ctx.lineWidth = 12; ctx.stroke();
}

/* ── Poll de datos ── */
function poll() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/datos?_t=' + Date.now(), true);
  xhr.timeout = 3000;
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      try { updateUI(JSON.parse(xhr.responseText)); } catch(e) { console.error(e); }
    }
  };
  xhr.send();
}

/* ── Actualizar UI con datos recibidos ── */
function updateUI(d) {
  var v  = parseFloat(d.v)  || 0;
  var i  = parseFloat(d.i)  || 0;
  var p  = parseFloat(d.p)  || 0;
  var t  = parseFloat(d.t)  || 0;
  var mp = parseFloat(d.mp) || 0;
  var pp = parseFloat(d.pp) || 0;
  var ef = parseFloat(d.ef) || 0;
  var ghi = parseFloat(d.ghi) || 0;
  var dni = parseFloat(d.dni) || 0;

  /* LDR */
  var ltl = parseInt(d.ltl)||0, ltr = parseInt(d.ltr)||0;
  var lbl2= parseInt(d.lbl)||0, lbr = parseInt(d.lbr)||0;
  document.getElementById('ltl').textContent = ltl;
  document.getElementById('ltr').textContent = ltr;
  document.getElementById('lbl').textContent = lbl2;
  document.getElementById('lbr').textContent = lbr;
  document.getElementById('bltl').style.width = (ltl/4095*100).toFixed(1)+'%';
  document.getElementById('bltr').style.width = (ltr/4095*100).toFixed(1)+'%';
  document.getElementById('blbl').style.width = (lbl2/4095*100).toFixed(1)+'%';
  document.getElementById('blbr').style.width = (lbr/4095*100).toFixed(1)+'%';

  /* Tarjetas métricas */
  document.getElementById('mv').innerHTML  = v.toFixed(3) + '<span class="cunit">V</span>';
  document.getElementById('mi').innerHTML  = i.toFixed(2) + '<span class="cunit">mA</span>';
  document.getElementById('mp').innerHTML  = p.toFixed(2) + '<span class="cunit">mW</span>';
  document.getElementById('mt').innerHTML  = t.toFixed(1) + '<span class="cunit">&deg;C</span>';
  document.getElementById('sp').textContent = 'Max: ' + mp.toFixed(1) + ' · Prom: ' + pp.toFixed(1) + ' mW';
  document.getElementById('sec').textContent = d.ec || 0;
  document.getElementById('smp').textContent = mp.toFixed(2) + ' mW';

  /* Barras */
  document.getElementById('bv').style.width  = Math.min(v/10*100, 100) + '%';
  document.getElementById('bi').style.width  = Math.min(i/500*100, 100) + '%';
  document.getElementById('bp2').style.width = Math.min(p/300*100, 100) + '%';
  document.getElementById('bt').style.width  = Math.min(t/80*100, 100) + '%';

  /* Irradiancia */
  document.getElementById('ghi').innerHTML    = ghi.toFixed(0) + '<span class="cunit">W/m&sup2;</span>';
  document.getElementById('dni').innerHTML    = dni.toFixed(0) + ' <span style="font-size:11px;color:var(--dim)">W/m&sup2;</span>';
  document.getElementById('irr-hora').textContent = (d.irrh || '--') + ':00';
  document.getElementById('irr-cielo').textContent = d.cielo || '---';
  document.getElementById('bghi').style.width = Math.min(ghi/1200*100, 100) + '%';

  /* Badge estado */
  var st = parseInt(d.st) || 0;
  if (st !== prevSt) {
    prevSt = st;
    var b = document.getElementById('badge');
    b.className = (st === 0) ? '' : (st === 3 ? 's' : 'e');
    document.getElementById('est-txt').textContent = ESTADOS[st] || 'NORMAL';
  }

  /* Brújula y elevación */
  var ah = parseInt(d.ah) || 90;
  var av = parseInt(d.av) || 90;
  document.getElementById('needle').style.transform = 'translateX(-50%) translateY(-100%) rotate(' + (ah-90) + 'deg)';
  document.getElementById('cang').textContent = ah + '\u00b0';
  document.getElementById('epanel').style.transform = 'rotate(' + (av-90) + 'deg)';
  document.getElementById('etxt').textContent = av + '\u00b0';

  /* Gauge */
  drawGauge(ef);
  document.getElementById('ef-num').textContent = ef.toFixed(1) + '%';

  /* Gráfica histórica */
  var now = new Date();
  var lbl = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  histP.push(p); histV.push(v); histI.push(i); histG.push(ghi); histL.push(lbl);
  if (histP.length > MAX_PTS) { histP.shift(); histV.shift(); histI.shift(); histG.shift(); histL.shift(); }
  if (chartPT) chartPT.update();
  document.getElementById('npts').textContent = histP.length + ' pts';

  /* Tabla */
  registros.unshift({ v:v, i:i, p:p, t:t, ghi:ghi, ah:ah, av:av, st:st, lbl:lbl });
  if (registros.length > 120) registros.pop();
  var rows = '';
  var slice = registros.slice(0, 50);
  for (var k = 0; k < slice.length; k++) {
    var r = slice[k];
    rows += '<tr>' +
      '<td>' + (registros.length - k) + '</td>' +
      '<td>' + r.lbl + '</td>' +
      '<td>' + r.v.toFixed(3) + '</td>' +
      '<td>' + r.i.toFixed(2) + '</td>' +
      '<td>' + r.p.toFixed(2) + '</td>' +
      '<td>' + r.t.toFixed(1) + '</td>' +
      '<td>' + r.ghi.toFixed(0) + '</td>' +
      '<td>' + r.ah + '</td>' +
      '<td>' + r.av + '</td>' +
      '<td><span class="tag ' + ECLS[r.st] + '">' + ESTADOS[r.st] + '</span></td>' +
    '</tr>';
  }
  document.getElementById('tbody').innerHTML = rows;
}
/* ── Poll sistema ── */
function pollSys() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/sistema?_t=' + Date.now(), true);
  xhr.timeout = 3000;
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      try {
        var d = JSON.parse(xhr.responseText);
        document.getElementById('sip').textContent   = d.ip;
        document.getElementById('srssi').textContent = d.rssi + ' dBm';
        document.getElementById('sheap').textContent = Math.round(d.heap/1024) + ' KB';
        document.getElementById('sfs').textContent   = Math.round(d.fs/1024) + ' KB';
        var h = Math.floor(d.up/3600);
        var m = Math.floor((d.up%3600)/60);
        var s = d.up % 60;
        document.getElementById('sup').textContent = h + 'h ' + m + 'm ' + s + 's';
      } catch(e) {}
    }
  };
  xhr.send();
}

/* ── Controles manuales ── */
function updCtrl() {
  document.getElementById('lh').textContent = document.getElementById('slH').value + '\u00b0';
  document.getElementById('lv').textContent = document.getElementById('slV').value + '\u00b0';
}

function moverPanel() {
  var h = document.getElementById('slH').value;
  var v = document.getElementById('slV').value;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/angulo?h=' + h + '&v=' + v, true);
  xhr.send();
}

function homePanel() {
  document.getElementById('slH').value = 90;
  document.getElementById('slV').value = 90;
  updCtrl();
  moverPanel();
}

function limpiarLog() {
  if (!confirm('Limpiar todo el registro CSV?')) return;
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/limpiar', true);
  xhr.send();
}

/* ── Utilidades ── */
function pad(n) { return n < 10 ? '0' + n : '' + n; }

/* ── Reloj ── */
setInterval(function() {
  var n = new Date();
  document.getElementById('reloj').textContent = pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds());
}, 1000);

/* ── Arranque ── */
initChart();
drawGauge(50);
poll();
pollSys();
setInterval(poll, 2000);
setInterval(pollSys, 10000);
</script>
</body>
</html>
)=====";

// ─────────────────────────────────────────────────────────────────────
//  WiFi
// ─────────────────────────────────────────────────────────────────────
const char* WIFI_SSID = "Totalplay-2.4G-0928";
const char* WIFI_PASS = "TQb7ZLCzNhWkwuGB";
const char* AP_SSID   = "SolarTracker";
const char* AP_PASS   = "solar1234";

// ─────────────────────────────────────────────────────────────────────
//  OPEN-METEO — Temperatura actual
// ─────────────────────────────────────────────────────────────────────
const char* WEATHER_URL =
  "http://api.open-meteo.com/v1/forecast"
  "?latitude=20.3908&longitude=-99.9951"
  "&current_weather=true"
  "&temperature_unit=celsius";

// ─────────────────────────────────────────────────────────────────────
//  OPEN-METEO — Irradiancia horaria
//  shortwave_radiation = GHI (W/m²)
//  direct_normal_irradiance = DNI (W/m²)
// ─────────────────────────────────────────────────────────────────────
const char* IRRADIANCE_URL =
  "http://api.open-meteo.com/v1/forecast"
  "?latitude=20.3908&longitude=-99.9951"
  "&hourly=shortwave_radiation,direct_normal_irradiance"
  "&timezone=America%2FMexico_City"
  "&forecast_days=1";

// Variables temperatura
float  tempAmbiente    = 25.0f;
char   condCieloWX[20] = "---";
unsigned long tWeather  = 0;
#define T_WEATHER  300000UL       // cada 5 min

// Variables irradiancia real
float irradianciaGHI  = 0.0f;
float irradiancaDNI   = 0.0f;
char  irrHora[6]      = "--";
unsigned long tIrr    = 0;
#define T_IRRADIANCE  3600000UL   // cada hora

// ─────────────────────────────────────────────────────────────────────
//  PINOUT
// ─────────────────────────────────────────────────────────────────────
#define SERVO_H  18
#define SERVO_V  19
#define LDR_TL   32
#define LDR_TR   33
#define LDR_BL   34 // Movido a ADC1 (era 25)
#define LDR_BR   35 // Movido a ADC1 (era 26)

// ─────────────────────────────────────────────────────────────────────
//  PARÁMETROS TÉRMICOS
// ─────────────────────────────────────────────────────────────────────
#define COEF_TEMP       -0.0045f
#define TEMP_REF         25.0f
#define TEMP_CRITICA     45.0f
#define UMBRAL_CAIDA_MW   3.0f
#define PASO_GRADOS       5
#define T_ENFRIAMIENTO  8000UL

// ─────────────────────────────────────────────────────────────────────
//  LÍMITES SERVO Y LDR
// ─────────────────────────────────────────────────────────────────────
#define ANG_H_MIN   0
#define ANG_H_MAX 180
#define ANG_V_MIN  30
#define ANG_V_MAX 150
#define LDR_TOL    40

// Variables Filtro EMA para LDR
float f_TL = 0, f_TR = 0, f_BL = 0, f_BR = 0;
const float EMA_ALPHA = 0.15f;

// ─────────────────────────────────────────────────────────────────────
//  INTERVALOS
// ─────────────────────────────────────────────────────────────────────
#define T_SENSOR   2000UL
#define T_LDR       500UL
#define T_CSV    120000UL
#define T_OLED     4000UL
bool   ipMostrada  = false;

// ─────────────────────────────────────────────────────────────────────
//  ESTADOS Y OBJETOS
// ─────────────────────────────────────────────────────────────────────
enum Estado { NORMAL, ENFRIANDO, RECUPERANDO, SIN_SOL };
const char* ESTADO_STR[] = { "NORMAL", "ENFRIANDO", "RECUPERANDO", "SIN_SOL" };

WebServer        server(80);
Adafruit_INA219  ina219(0x40);
Servo            servoH, servoV;
Adafruit_SSD1306 oled(128, 64, &Wire, -1);

// ─────────────────────────────────────────────────────────────────────
//  VARIABLES GLOBALES
// ─────────────────────────────────────────────────────────────────────
Estado estado          = NORMAL;
float  voltaje         = 0;
float  corriente_mA    = 0;
float  potencia_mW     = 0;
float  temperatura     = 0;
int    anguloH         = 90;
int    anguloV         = 90;
int    angH_bkp        = 90;
int    angV_bkp        = 90;
float  potBkp          = 0;
float  mejorPot        = 0;
int    nEnfriamientos  = 0;
bool   oledOK          = false;

float  potenciaAntes   = 0;
float  potenciaDespues = 0;
char   accionTomada[8] = "0";
char   condCielo[16]   = "---";
int    registroNum     = 0;

#define HIST 5
float histPow[HIST] = {0};
int   histIdx     = 0;
float potProm     = 0;

unsigned long tSensor = 0;
unsigned long tLDR    = 0;
unsigned long tCSV    = 0;
unsigned long tFrio   = 0;
unsigned long tBoot   = 0;
unsigned long tOled   = 0;
int           oledPag = 0;
bool primerRegistro   = true;

// ─────────────────────────────────────────────────────────────────────
//  OLED
// ─────────────────────────────────────────────────────────────────────
void actualizarOLED() {
  if (!oledOK) return;

  if (!ipMostrada && millis() - tBoot < 15000) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.fillRect(0, 0, 128, 13, SSD1306_WHITE);
    oled.setTextColor(SSD1306_BLACK);
    oled.setTextSize(1);
    oled.setCursor(16, 3); oled.print("SOLAR TRACKER v5");
    oled.setTextColor(SSD1306_WHITE);
    oled.setCursor(0, 17); oled.print("Abre en navegador:");
    String ip = (WiFi.status() == WL_CONNECTED)
                  ? WiFi.localIP().toString()
                  : WiFi.softAPIP().toString();
    oled.setCursor(0, 29); oled.print("http://"); oled.print(ip);
    oled.setCursor(0, 43); oled.print("Estado: "); oled.print(ESTADO_STR[estado]);
    int prog = (int)map(millis() - tBoot, 0, 15000, 0, 124);
    oled.drawRect(2, 57, 124, 5, SSD1306_WHITE);
    oled.fillRect(2, 57, constrain(prog, 0, 124), 5, SSD1306_WHITE);
    oled.display();
    return;
  }

  ipMostrada = true;
  if (millis() - tOled < T_OLED) return;
  tOled   = millis();
  oledPag = (oledPag + 1) % 5;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);

  switch (oledPag) {
    case 0: {
      oled.fillRect(0, 0, 128, 13, SSD1306_WHITE);
      oled.setTextColor(SSD1306_BLACK); oled.setTextSize(1);
      oled.setCursor(16, 3); oled.print("SOLAR TRACKER v5");
      oled.setTextColor(SSD1306_WHITE);
      oled.setCursor(0, 17); oled.print("Abre en navegador:");
      String ip = (WiFi.status() == WL_CONNECTED)
                    ? WiFi.localIP().toString()
                    : WiFi.softAPIP().toString();
      oled.setCursor(0, 29); oled.print("http://"); oled.println(ip);
      oled.drawLine(0, 43, 128, 43, SSD1306_WHITE);
      oled.setCursor(0, 47); oled.print("Estado: "); oled.print(ESTADO_STR[estado]);
      break;
    }
    case 1: {
      oled.fillRect(0, 0, 128, 13, SSD1306_WHITE);
      oled.setTextColor(SSD1306_BLACK); oled.setTextSize(1);
      oled.setCursor(20, 3); oled.print("ELECTRICO INA219");
      oled.setTextColor(SSD1306_WHITE);
      oled.setCursor(0, 17); oled.print("V : "); oled.print(voltaje, 3); oled.print(" V");
      oled.setCursor(0, 29); oled.print("I : "); oled.print(corriente_mA, 2); oled.print(" mA");
      oled.setCursor(0, 41); oled.print("P : "); oled.print(potencia_mW, 2); oled.print(" mW");
      int bw = (int)constrain(map((long)potencia_mW, 0, 300, 0, 124), 0, 124);
      oled.drawRect(2, 56, 124, 6, SSD1306_WHITE);
      if (bw > 0) oled.fillRect(2, 56, bw, 6, SSD1306_WHITE);
      break;
    }
    case 2: {
      oled.fillRect(0, 0, 128, 13, SSD1306_WHITE);
      oled.setTextColor(SSD1306_BLACK); oled.setTextSize(1);
      oled.setCursor(14, 3); oled.print("CLIMA SJR, QRO.");
      oled.setTextColor(SSD1306_WHITE);
      oled.setTextSize(3); oled.setCursor(4, 17); oled.print(temperatura, 1);
      oled.setTextSize(2); oled.print(" C");
      float ef = 100.0f * (1.0f + COEF_TEMP * (temperatura - TEMP_REF));
      oled.setTextSize(1);
      oled.setCursor(0, 46); oled.print("Efic: "); oled.print(ef, 1); oled.print("%");
      oled.setCursor(0, 56); oled.print("Cielo: "); oled.print(condCielo);
      break;
    }
    case 3: {
      oled.fillRect(0, 0, 128, 13, SSD1306_WHITE);
      oled.setTextColor(SSD1306_BLACK); oled.setTextSize(1);
      oled.setCursor(10, 3); oled.print("IRRADIANCIA REAL");
      oled.setTextColor(SSD1306_WHITE);
      oled.setCursor(0, 17); oled.print("GHI: "); oled.print(irradianciaGHI, 0); oled.print(" W/m2");
      oled.setCursor(0, 29); oled.print("DNI: "); oled.print(irradiancaDNI,  0); oled.print(" W/m2");
      oled.setCursor(0, 41); oled.print("Hora: "); oled.print(irrHora); oled.print(":00  "); oled.print(condCielo);
      int bw2 = (int)constrain(map((long)irradianciaGHI, 0, 1200, 0, 124), 0, 124);
      oled.drawRect(2, 56, 124, 6, SSD1306_WHITE);
      if (bw2 > 0) oled.fillRect(2, 56, bw2, 6, SSD1306_WHITE);
      break;
    }
    case 4: {
      oled.fillRect(0, 0, 128, 13, SSD1306_WHITE);
      oled.setTextColor(SSD1306_BLACK); oled.setTextSize(1);
      oled.setCursor(24, 3); oled.print("POSICION PANEL");
      oled.setTextColor(SSD1306_WHITE);
      oled.setCursor(0, 17); oled.print("Azimut H  : "); oled.print(anguloH);
      oled.setCursor(0, 35); oled.print("Elevacion V: "); oled.print(anguloV);
      int tl = analogRead(LDR_TL), tr = analogRead(LDR_TR);
      oled.setCursor(0, 57);
      oled.print("TL:"); oled.print(tl/41); oled.print(" TR:"); oled.print(tr/41);
      break;
    }
  }
  oled.display();
}

// ─────────────────────────────────────────────────────────────────────
//  TEMPERATURA VÍA OPEN-METEO
// ─────────────────────────────────────────────────────────────────────
void fetchTemperatura() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WEATHER] Sin WiFi, skip");
    return;
  }
  HTTPClient http;
  http.begin(WEATHER_URL);
  http.setTimeout(6000);
  int code = http.GET();
  Serial.printf("[WEATHER] HTTP code=%d\n", code);
  
  if (code == 200) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, http.getStream());
    
    if (!error) {
      if (!doc["current_weather"].isNull()) {
        float t = doc["current_weather"]["temperature"];
        if (t != 0.0f) { tempAmbiente = t; temperatura = t; }
        
        int wcode = doc["current_weather"]["weathercode"];
        if      (wcode == 0)  strcpy(condCieloWX, "Despejado");
        else if (wcode <= 3)  strcpy(condCieloWX, "Parcial");
        else if (wcode <= 48) strcpy(condCieloWX, "Niebla");
        else if (wcode <= 67) strcpy(condCieloWX, "Nublado");
        else if (wcode <= 77) strcpy(condCieloWX, "Nieve");
        else                  strcpy(condCieloWX, "Lluvia");
        
        if (irradianciaGHI <= 0.0f) strcpy(condCielo, condCieloWX);
        Serial.printf("[WEATHER] Final T=%.1f  WX=%s\n", t, condCieloWX);
      } else {
        Serial.println("[WEATHER] 'current_weather' key NOT found in JSON");
      }
    } else {
      Serial.print("[WEATHER] JSON Parse falló: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.printf("[WEATHER] Error HTTP %d\n", code);
  }
  http.end();
}

// ─────────────────────────────────────────────────────────────────────
//  IRRADIANCIA REAL VÍA OPEN-METEO
//
//  Respuesta JSON simplificada:
//  { "hourly": {
//      "time": ["2026-03-16T00:00","2026-03-16T01:00",...],
//      "shortwave_radiation": [0, 0, ..., 820, ...],
//      "direct_normal_irradiance": [0, 0, ..., 950, ...]
//  }}
//
//  Se busca el token "T{HH}:" en el array time[], se cuenta
//  cuántas comas hay hasta ese punto (= índice), y se extrae
//  el valor de ese índice en cada array de datos.
// ─────────────────────────────────────────────────────────────────────
void fetchIrradiancia() {
  if (WiFi.status() != WL_CONNECTED) return;

  struct tm ti;
  if (!getLocalTime(&ti)) {
    Serial.println("[IRR] Sin hora NTP");
    return;
  }
  int horaActual = ti.tm_hour;

  Serial.printf("[IRR] Consultando hora %02d:00...\n", horaActual);

  HTTPClient http;
  http.begin(IRRADIANCE_URL);
  http.setTimeout(8000);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("[IRR] Error HTTP %d\n", code);
    http.end();
    return;
  }
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, http.getStream());
  http.end();

  if (error) {
    Serial.print("[IRR] JSON failed: ");
    Serial.println(error.c_str());
    return;
  }

  char token[7];
  snprintf(token, sizeof(token), "T%02d:", horaActual);

  JsonArray times = doc["hourly"]["time"].as<JsonArray>();
  int dataIdx = -1;
  int i = 0;
  for (JsonVariant v : times) {
    String tstr = v.as<String>();
    if (tstr.indexOf(token) >= 0) {
      dataIdx = i;
      break;
    }
    i++;
  }

  if (dataIdx >= 0) {
    irradianciaGHI = doc["hourly"]["shortwave_radiation"][dataIdx];
    irradiancaDNI  = doc["hourly"]["direct_normal_irradiance"][dataIdx];
    snprintf(irrHora, sizeof(irrHora), "%02d", horaActual);

    // Condición de cielo desde irradiancia real
    if      (irradianciaGHI > 700) strcpy(condCielo, "Despejado");
    else if (irradianciaGHI > 400) strcpy(condCielo, "Parcial");
    else if (irradianciaGHI > 100) strcpy(condCielo, "Nublado");
    else                            strcpy(condCielo, "Sin_Sol");

    Serial.printf("[IRR] idx=%d  GHI=%.1f  DNI=%.1f  Cielo=%s\n",
                  dataIdx, irradianciaGHI, irradiancaDNI, condCielo);
  } else {
    Serial.printf("[IRR] Token %s no encontrado en JSON\n", token);
  }
}

// ─────────────────────────────────────────────────────────────────────
//  LECTURA SENSORES
// ─────────────────────────────────────────────────────────────────────
void leerSensores() {
  float vs=0, is=0, ps=0;
  for (int i=0; i<5; i++) {
    float bv = ina219.getBusVoltage_V() + ina219.getShuntVoltage_mV() / 1000.0f;
    float ic = ina219.getCurrent_mA(); 
    
    // Validación I2C: Si hay desconexión o ruido, los valores suelen dar NaN en el bus de hardware
    if (isnan(bv) || isnan(ic)) {
      Serial.println("[ERROR] INA219 lectura NaN, posible desconexión I2C");
      bv = 0; ic = 0;
    }
    
    if (ic < 0) ic = 0;
    float pw = bv * ic;                if (pw < 0) pw = 0;  // V×I manual (mejor resolución)
    vs += bv; is += ic; ps += pw;
    server.handleClient(); delay(6);
  }
  voltaje      = vs / 5.0f;
  corriente_mA = is / 5.0f;
  potencia_mW  = ps / 5.0f;
  temperatura  = tempAmbiente;
}

void actualizarHist(float p) {
  histPow[histIdx % HIST] = p; histIdx++;
  float s = 0; int n = min(histIdx, HIST);
  for (int i = 0; i < n; i++) s += histPow[i];
  potProm = s / n;
}

bool tendenciaCaida() {
  if (histIdx < HIST) return false;
  int idx = histIdx % HIST;
  float a = histPow[(idx-1+HIST)%HIST];
  float b = histPow[(idx-2+HIST)%HIST];
  float c = histPow[(idx-3+HIST)%HIST];
  return (b - a > UMBRAL_CAIDA_MW) && (c - b > UMBRAL_CAIDA_MW);
}

// ─────────────────────────────────────────────────────────────────────
//  CONTROL SERVOS Y LDR
// ─────────────────────────────────────────────────────────────────────
void moverH(int target) {
  target = constrain(target, ANG_H_MIN, ANG_H_MAX);
  if (anguloH == target) return;
  
  int step = (target > anguloH) ? 1 : -1;
  while (anguloH != target) {
    anguloH += step;
    servoH.write(anguloH);
    unsigned long t = millis();
    while (millis() - t < 15) { // 15ms por grado = movimiento suave (~60 grados por segundo)
      server.handleClient();
      delay(1);
    }
  }
}

void moverV(int target) {
  target = constrain(target, ANG_V_MIN, ANG_V_MAX);
  if (anguloV == target) return;
  
  int step = (target > anguloV) ? 1 : -1;
  while (anguloV != target) {
    anguloV += step;
    servoV.write(anguloV);
    unsigned long t = millis();
    while (millis() - t < 15) { 
      server.handleClient();
      delay(1);
    }
  }
}

void seguimientoLDR() {
  if (estado != NORMAL) return;
  
  // Lectura cruda ADC
  int tlRaw=analogRead(LDR_TL), trRaw=analogRead(LDR_TR);
  int blRaw=analogRead(LDR_BL), brRaw=analogRead(LDR_BR);
  
  // Primeo de variables EMA si recién arranca
  if (f_TL == 0 && f_TR == 0 && f_BL == 0 && f_BR == 0) {
     f_TL = tlRaw; f_TR = trRaw; f_BL = blRaw; f_BR = brRaw;
  }
  
  // Aplicar Filtro Matemático EMA (Exponential Moving Average)
  f_TL = (EMA_ALPHA * tlRaw) + ((1.0f - EMA_ALPHA) * f_TL);
  f_TR = (EMA_ALPHA * trRaw) + ((1.0f - EMA_ALPHA) * f_TR);
  f_BL = (EMA_ALPHA * blRaw) + ((1.0f - EMA_ALPHA) * f_BL);
  f_BR = (EMA_ALPHA * brRaw) + ((1.0f - EMA_ALPHA) * f_BR);

  int tl=(int)f_TL, tr=(int)f_TR;
  int bl=(int)f_BL, br=(int)f_BR;

  int dH=(tl+bl)-(tr+br), dV=(tl+tr)-(bl+br);
  potenciaAntes = potencia_mW;
  bool movio = false;
  
  // Tolerancia dinámica basada en nivel promedio de luz actual
  int promedioLuz = (tl + tr + bl + br) / 4;
  int toleranciaDinamica = LDR_TOL + (int)(promedioLuz * 0.03f);
  
  // Calcular paso adaptativo (proporcional al error)
  int pasoH = 1;
  if(abs(dH) > toleranciaDinamica * 4) pasoH = 5;
  else if(abs(dH) > toleranciaDinamica * 2) pasoH = 3;
  
  int pasoV = 1;
  if(abs(dV) > toleranciaDinamica * 4) pasoV = 5;
  else if(abs(dV) > toleranciaDinamica * 2) pasoV = 3;

  if (abs(dH) > toleranciaDinamica) {
    if (dH > 0) { moverH(anguloH + pasoH); sprintf(accionTomada, "+%d", pasoH); }
    else        { moverH(anguloH - pasoH); sprintf(accionTomada, "-%d", pasoH); }
    movio = true;
  }
  if (abs(dV) > toleranciaDinamica) {
    if (dV > 0) moverV(anguloV + pasoV);
    else        moverV(anguloV - pasoV);
    movio = true;
  }
  if (!movio) strcpy(accionTomada,"0");
  potenciaDespues = potencia_mW;
}

// ─────────────────────────────────────────────────────────────────────
//  GESTIÓN TÉRMICA
// ─────────────────────────────────────────────────────────────────────
void activarEnfriamiento() {
  angH_bkp=anguloH; angV_bkp=anguloV; potBkp=potencia_mW;
  nEnfriamientos++;
  moverV(anguloV-(PASO_GRADOS*2));
  estado=ENFRIANDO; tFrio=millis();
}
void gestionarEnfriamiento() {
  if (millis()-tFrio >= T_ENFRIAMIENTO) {
    moverH(angH_bkp); moverV(angV_bkp); delay(400); estado=NORMAL;
  }
}
void evaluarTermica() {
  if (temperatura >= TEMP_CRITICA && estado == NORMAL) { activarEnfriamiento(); return; }
  if (tendenciaCaida() && estado == NORMAL && temperatura > TEMP_REF+10.0f) activarEnfriamiento();
  if (potencia_mW > mejorPot) mejorPot = potencia_mW;
}

// ─────────────────────────────────────────────────────────────────────
//  CSV — LittleFS
// ─────────────────────────────────────────────────────────────────────
void initCSV() {
  if (!LittleFS.exists("/log.csv")) {
    File f = LittleFS.open("/log.csv", "w");
    if (f) {
      f.println("Registro#,Fecha,Hora,"
                "GHI_Real(W/m2),DNI_Real(W/m2),"
                "Temperatura(C),Condicion_Cielo,"
                "Voltaje(V),Corriente(mA),"
                "Potencia_Antes(mW),Angulo_H(deg),Angulo_V(deg),"
                "Potencia_Despues(mW),Accion,Estado,Enfriamientos");
      f.close();
      Serial.println("[CSV] Archivo creado");
    }
  }
}

void guardarCSV() {
  File f = LittleFS.open("/log.csv", "a");
  if (!f) return;

  struct tm ti;
  char fecha[12]="----/--/--", hora[10]="--:--:--";
  if (getLocalTime(&ti)) {
    strftime(fecha, sizeof(fecha), "%Y/%m/%d", &ti);
    strftime(hora,  sizeof(hora),  "%H:%M:%S", &ti);
  }

  // GHI real de Open-Meteo; si aún no hay dato, estimar desde potencia
  float ghiParaCSV = irradianciaGHI;
  float dniParaCSV = irradiancaDNI;
  if (ghiParaCSV <= 0.0f) {
    float factorTemp = 1.0f + COEF_TEMP * (temperatura - TEMP_REF);
    if (factorTemp <= 0) factorTemp = 0.001f;
    ghiParaCSV = (potencia_mW / factorTemp) * (1000.0f / 2000.0f);
    // recalcular condCielo con estimado
    if      (ghiParaCSV > 700) strcpy(condCielo, "Despejado");
    else if (ghiParaCSV > 400) strcpy(condCielo, "Parcial");
    else if (ghiParaCSV > 100) strcpy(condCielo, "Nublado");
    else                        strcpy(condCielo, "Sin_Sol");
    Serial.println("[CSV] GHI estimado (fallback)");
  }

  registroNum++;
  f.printf("%d,%s,%s,%.1f,%.1f,%.2f,%s,%.4f,%.3f,%.3f,%d,%d,%.3f,%s,%s,%d\n",
    registroNum, fecha, hora,
    ghiParaCSV, dniParaCSV,
    temperatura, condCielo,
    voltaje, corriente_mA,
    potenciaAntes, anguloH, anguloV,
    potenciaDespues, accionTomada, ESTADO_STR[estado], nEnfriamientos);
  f.close();
}

// ─────────────────────────────────────────────────────────────────────
//  RUTAS WEB
// ─────────────────────────────────────────────────────────────────────
void configurarRutas() {
  server.on("/", HTTP_GET, []() {
    server.send_P(200, "text/html", HTML_PAGE);
  });

  server.on("/api/datos", HTTP_GET, []() {
    if (isnan(temperatura))   temperatura   = 25.0;
    if (isnan(voltaje))       voltaje       = 0.0;
    if (isnan(corriente_mA))  corriente_mA  = 0.0;
    if (isnan(potencia_mW))   potencia_mW   = 0.0;
    float ef = 100.0f * (1.0f + COEF_TEMP * (temperatura - TEMP_REF));
    if (isnan(ef)) ef = 0.0;

    int lTL = analogRead(LDR_TL);
    int lTR = analogRead(LDR_TR);
    int lBL = analogRead(LDR_BL);
    int lBR = analogRead(LDR_BR);

    char buf[480];
    snprintf(buf, sizeof(buf),
      "{\"v\":%.4f,\"i\":%.3f,\"p\":%.3f,\"t\":%.2f,"
      "\"ah\":%d,\"av\":%d,\"st\":%d,\"ec\":%d,"
      "\"mp\":%.2f,\"pp\":%.2f,\"ef\":%.1f,"
      "\"ghi\":%.1f,\"dni\":%.1f,\"irrh\":\"%s\",\"cielo\":\"%s\","
      "\"ltl\":%d,\"ltr\":%d,\"lbl\":%d,\"lbr\":%d}",
      voltaje, corriente_mA, potencia_mW, temperatura,
      anguloH, anguloV, (int)estado, nEnfriamientos,
      mejorPot, potProm, ef,
      irradianciaGHI, irradiancaDNI, irrHora, condCielo,
      lTL, lTR, lBL, lBR);
    server.send(200, "application/json", buf);
  });

  server.on("/api/sistema", HTTP_GET, []() {
    char buf[220];
    String ip = (WiFi.status()==WL_CONNECTED)
                  ? WiFi.localIP().toString()
                  : WiFi.softAPIP().toString();
    snprintf(buf, sizeof(buf),
      "{\"ip\":\"%s\",\"rssi\":%d,\"heap\":%u,\"up\":%lu,\"fs\":%u}",
      ip.c_str(), WiFi.RSSI(), ESP.getFreeHeap(),
      (millis()-tBoot)/1000,
      (unsigned int)LittleFS.usedBytes());
    server.send(200, "application/json", buf);
  });

  server.on("/descargar", HTTP_GET, []() {
    if (LittleFS.exists("/log.csv")) {
      File f = LittleFS.open("/log.csv","r");
      server.streamFile(f,"text/csv"); f.close();
    } else {
      server.send(404,"text/plain","Sin datos aun");
    }
  });

  server.on("/api/angulo", HTTP_GET, []() {
    if (server.hasArg("h")) moverH(server.arg("h").toInt());
    if (server.hasArg("v")) moverV(server.arg("v").toInt());
    server.send(200,"application/json","{\"ok\":true}");
  });

  server.on("/api/limpiar", HTTP_DELETE, []() {
    LittleFS.remove("/log.csv"); initCSV();
    server.send(200,"application/json","{\"ok\":true}");
  });

  server.begin();
}

// ─────────────────────────────────────────────────────────────────────
//  ENVÍO DE DATOS A VERCEL (POST)
// ─────────────────────────────────────────────────────────────────────
const char* URL_VERCEL = "https://said-romero.vercel.app/api/update";

void enviarDatosVercel() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(URL_VERCEL);
  http.addHeader("Content-Type", "application/json");

  float ef = 100.0f * (1.0f + COEF_TEMP * (temperatura - TEMP_REF));
  if (isnan(ef)) ef = 0.0;
  
  int lTL = analogRead(LDR_TL);
  int lTR = analogRead(LDR_TR);
  int lBL = analogRead(LDR_BL);
  int lBR = analogRead(LDR_BR);

  char buf[480];
  snprintf(buf, sizeof(buf),
    "{\"v\":%.4f,\"i\":%.3f,\"p\":%.3f,\"t\":%.2f,"
    "\"ah\":%d,\"av\":%d,\"st\":%d,\"ec\":%d,"
    "\"mp\":%.2f,\"pp\":%.2f,\"ef\":%.1f,"
    "\"ghi\":%.1f,\"dni\":%.1f,\"irrh\":\"%s\",\"cielo\":\"%s\","
    "\"ltl\":%d,\"ltr\":%d,\"lbl\":%d,\"lbr\":%d}",
    voltaje, corriente_mA, potencia_mW, temperatura,
    anguloH, anguloV, (int)estado, nEnfriamientos,
    mejorPot, potProm, ef,
    irradianciaGHI, irradiancaDNI, irrHora, condCielo,
    lTL, lTR, lBL, lBR);
    
  int code = http.POST(buf);
  if (code > 0) {
    Serial.printf("[VERCEL] Enviado OK HTTP %d\n", code);
  } else {
    Serial.printf("[VERCEL] Error enviando: %d\n", code);
  }
  http.end();
}

// ─────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  tBoot = millis();
  delay(300);

  Wire.begin(21, 22);

  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oledOK = false;
  } else {
    oledOK = true;
    oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE); oled.setTextSize(1);
    oled.setCursor(20, 20); oled.print("SOLAR TRACKER v5");
    oled.display();
  }

  if (!ina219.begin()) Serial.println("[ERROR] INA219 no detectado");

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  ESP32PWM::allocateTimer(0); ESP32PWM::allocateTimer(1);
  servoH.setPeriodHertz(50); servoH.attach(SERVO_H, 500, 2500);
  servoV.setPeriodHertz(50); servoV.attach(SERVO_V, 500, 2500);
  moverH(90); moverV(90);

  if (!LittleFS.begin(true)) { LittleFS.format(); LittleFS.begin(); }
  initCSV();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int n = 0;
  while (WiFi.status() != WL_CONNECTED && n < 24) { delay(500); n++; }

  if (WiFi.status() == WL_CONNECTED) {
    configTime(-6 * 3600, 0, "pool.ntp.org");
    delay(1200);             // tiempo para que NTP sincronice
    fetchTemperatura();
    fetchIrradiancia();      // primera consulta al arrancar
    tIrr = millis();
  } else {
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);
  }

  configurarRutas();
}

// ─────────────────────────────────────────────────────────────────────
//  LOOP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
void loop() {
  server.handleClient();
  unsigned long now = millis();

  if (now - tLDR >= T_LDR) {
    tLDR = now;
    seguimientoLDR();
  }

  if (now - tSensor >= T_SENSOR) {
    tSensor = now;
    leerSensores();
    potenciaDespues = potencia_mW;
    actualizarHist(potencia_mW);

    if (estado == NORMAL) evaluarTermica();

    if (potencia_mW < 1.0f && corriente_mA < 0.5f && histIdx > HIST) {
      if (estado != SIN_SOL) { estado = SIN_SOL; moverH(90); moverV(60); }
    } else if (estado == SIN_SOL && potencia_mW > 5.0f) {
      estado = NORMAL;
    }

    if (primerRegistro) {
      guardarCSV();
      Serial.println("[CSV] Primer registro guardado");
      primerRegistro = false;
      tCSV = now;
    }
    enviarDatosVercel();
  }

  if (estado == ENFRIANDO) gestionarEnfriamiento();

  // Temperatura cada 5 min (o inmediatamente en el primer ciclo con WiFi)
  if (WiFi.status() == WL_CONNECTED &&
      (tWeather == 0 || now - tWeather >= T_WEATHER)) {
    tWeather = now;
    fetchTemperatura();
  }

  // Irradiancia cada hora
  if (now - tIrr >= T_IRRADIANCE) {
    tIrr = now;
    fetchIrradiancia();
  }

  // CSV cada 2 min
  if (now - tCSV >= T_CSV) {
    tCSV = now;
    guardarCSV();
    Serial.println("[CSV] Registro periódico");
  }

  actualizarOLED();
}
