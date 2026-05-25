
// ── CONFIG — paste your Claude API key here ──────────────────────────────────
const CLAUDE_API_KEY = "YOUR_CLAUDE_API_KEY_HERE";
// Get one free at: https://console.anthropic.com

// ── Constants ────────────────────────────────────────────────────────────────
const MODES = ["Standard", "Scientific", "Business", "Student", "Creator", "Freelancer"];

const THEMES = {
  cyber:  { bg:"#0a0a1a", panel:"rgba(15,15,40,0.85)",   accent:"#00f5ff", accent2:"#bf5af2", text:"#e0e8ff", sub:"#7a8ab0", border:"rgba(0,245,255,0.18)",  glow:"0 0 28px rgba(0,245,255,0.18)"  },
  aurora: { bg:"#050f1a", panel:"rgba(5,20,35,0.9)",      accent:"#00ffa3", accent2:"#ff6b9d", text:"#d0ffe8", sub:"#5a9a7a", border:"rgba(0,255,163,0.18)",  glow:"0 0 28px rgba(0,255,163,0.15)"  },
  solar:  { bg:"#1a0a00", panel:"rgba(30,15,0,0.88)",     accent:"#ff9500", accent2:"#ff375f", text:"#ffe8cc", sub:"#a07040", border:"rgba(255,149,0,0.2)",   glow:"0 0 28px rgba(255,149,0,0.15)"  },
  light:  { bg:"#f0f2f8", panel:"rgba(255,255,255,0.82)", accent:"#5e5ce6", accent2:"#bf5af2", text:"#1a1a2e", sub:"#6e7090", border:"rgba(94,92,230,0.18)",  glow:"0 0 20px rgba(94,92,230,0.12)"  },
};

const SCI_BUTTONS = ["sin","cos","tan","log","ln","√","x²","xʸ","π","e","(",")","%","1/x","!"];

const CALC_BUTTONS = [
  { label:"7",   type:"num"   }, { label:"8",   type:"num"   }, { label:"9",  type:"num" }, { label:"÷", type:"op" },
  { label:"4",   type:"num"   }, { label:"5",   type:"num"   }, { label:"6",  type:"num" }, { label:"×", type:"op" },
  { label:"1",   type:"num"   }, { label:"2",   type:"num"   }, { label:"3",  type:"num" }, { label:"−", type:"op" },
  { label:"0",   type:"num"   }, { label:".",   type:"num"   }, { label:"=",  type:"op"  }, { label:"+", type:"op" },
  { label:"C",   type:"clear" }, { label:"⌫",   type:"clear" }, { label:"( )", type:"num" }, { label:"±", type:"num" },
];

const CURRENCY_RATES = { USD:1, BDT:110, EUR:0.92, GBP:0.79, JPY:149, INR:83, CAD:1.36, AUD:1.53 };

const UNITS = {
  length: { m:1, km:0.001, cm:100, mm:1000, ft:3.281, inch:39.37, mile:0.000621 },
  weight: { kg:1, g:1000, lb:2.205, oz:35.27, ton:0.001 },
  temp:   { C:1, F:1, K:1 },
};

const TIMEZONES = [
  "Asia/Dhaka","America/New_York","Europe/London",
  "Asia/Tokyo","America/Los_Angeles","Europe/Paris",
  "Asia/Dubai","Asia/Kolkata",
];

const BUSINESS_FORMULAS = [
  { label:"ROI",    formula:"(profit/cost)*100" },
  { label:"Margin", formula:"(revenue-cost)/revenue*100" },
  { label:"ROAS",   formula:"revenue/ad_spend" },
  { label:"CPM",    formula:"cost/impressions*1000" },
];

const CREATOR_FORMULAS = [
  { label:"AdSense",  formula:"views*0.003" },
  { label:"Merch",    formula:"subs*0.05" },
  { label:"Sponsor",  formula:"views*0.01" },
  { label:"RPM",      formula:"cpm*impressions/1000" },
];

// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  theme:     "cyber",
  mode:      "Standard",
  expr:      "",
  result:    "",
  aiText:    "Enter a calculation — I'll explain it like a teacher.",
  history:   [],
  favorites: [],
  tab:       "calc",
  loading:   false,
  showGraph: false,
  currency:  { from:"USD", to:"BDT", amount:"1" },
  unit:      { type:"length", from:"m", to:"ft", amount:"1" },
  timezone:  { from:"Asia/Dhaka", to:"America/New_York" },
};

// ── Math Helpers ──────────────────────────────────────────────────────────────
function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }

function safeEval(expr) {
  try {
    let e = expr
      .replace(/sin\(/g,  "Math.sin(")
      .replace(/cos\(/g,  "Math.cos(")
      .replace(/tan\(/g,  "Math.tan(")
      .replace(/log\(/g,  "Math.log10(")
      .replace(/ln\(/g,   "Math.log(")
      .replace(/√\(/g,    "Math.sqrt(")
      .replace(/π/g,      "Math.PI")
      .replace(/e(?!\+|-|\d)/g, "Math.E")
      .replace(/(\d+)!/g, "factorial($1)")
      .replace(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/g, "Math.pow($1,$2)");
    // eslint-disable-next-line no-new-func
    return Function("factorial", `"use strict"; return (${e})`)(factorial);
  } catch { return null; }
}

function getGraphData(expr) {
  const pts = [];
  for (let x = -10; x <= 10; x += 0.5) {
    const y = safeEval(expr.replace(/x/g, `(${x})`));
    if (y !== null && isFinite(y) && Math.abs(y) < 1e6)
      pts.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(4)) });
  }
  return pts;
}

function getAIFallback(expr, result, mode) {
  const num = parseFloat(result);
  const map = {
    Standard:   `You calculated ${expr} = ${result}. The result is ${num > 0 ? "positive" : num < 0 ? "negative" : "zero"}.`,
    Scientific: `${expr} = ${result}. ${expr.includes("sin")||expr.includes("cos")||expr.includes("tan") ? "Trig functions use radians. " : ""}${expr.includes("log") ? "log() is base-10. " : ""}${expr.includes("ln") ? "ln() is natural log." : ""}`,
    Business:   `ROI view: ${result}. ${num > 0 ? "Positive returns detected." : "Review your cost structure."} Benchmark against your industry average.`,
    Student:    `Steps: 1) Start with ${expr}. 2) Apply PEMDAS/BODMAS. 3) Final answer: ${result}.`,
    Creator:    `Monthly views ${result} → AdSense ≈ $${(num*0.003).toFixed(2)}, sponsorship ≈ $${(num*0.01).toFixed(2)}/video.`,
    Freelancer: `Rate ${result} → Monthly (160h) = $${(num*160).toFixed(0)}, after 25% tax = $${(num*160*0.75).toFixed(0)}, in BDT = ৳${(num*160*0.75*110).toFixed(0)}.`,
  };
  return map[mode] || map.Standard;
}

// ── Converters ────────────────────────────────────────────────────────────────
function convertCurrency() {
  const { from, to, amount } = state.currency;
  const amt = parseFloat(amount) || 0;
  return ((amt / CURRENCY_RATES[from]) * CURRENCY_RATES[to]).toFixed(4);
}

function convertUnit() {
  const { type, from, to, amount } = state.unit;
  const amt = parseFloat(amount) || 0;
  const uType = UNITS[type];
  if (type === "temp") {
    let c = from === "F" ? (amt-32)/1.8 : from === "K" ? amt-273.15 : amt;
    return (to === "F" ? c*1.8+32 : to === "K" ? c+273.15 : c).toFixed(3);
  }
  return ((amt / uType[from]) * uType[to]).toFixed(6);
}

function getTimezone() {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: state.timezone.to,
      hour:"2-digit", minute:"2-digit", second:"2-digit",
      hour12:false, day:"numeric", month:"short",
    }).format(new Date());
  } catch { return "Invalid timezone"; }
}

// ── Theme applier ─────────────────────────────────────────────────────────────
function applyTheme(t) {
  const T = THEMES[t];
  const root = document.documentElement;
  root.style.setProperty("--accent",  T.accent);
  root.style.setProperty("--accent2", T.accent2);
  root.style.setProperty("--text",    T.text);
  root.style.setProperty("--sub",     T.sub);
  root.style.setProperty("--border",  T.border);
  root.style.setProperty("--panel",   T.panel);
  root.style.setProperty("--glow",    T.glow);
  document.body.style.background = T.bg;
}

// ── Particle canvas ───────────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  const ctx    = canvas.getContext("2d");
  let W, H, particles;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticles() {
    particles = Array.from({ length: 22 }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      r:  Math.random() * 2.5 + 0.8,
      op: Math.random() * 0.45 + 0.08,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const T = THEMES[state.theme];
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = T.accent;
      ctx.globalAlpha = p.op;
      ctx.fill();
      p.x = ((p.x + p.dx + W) % W);
      p.y = ((p.y + p.dy + H) % H);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  makeParticles();
  draw();
  window.addEventListener("resize", () => { resize(); makeParticles(); });
}

// ── Recharts graph renderer ───────────────────────────────────────────────────
function renderGraph(data) {
  const wrap = document.getElementById("graph-wrap");
  if (!data || data.length === 0) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";

  const T = THEMES[state.theme];
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Recharts;

  const el = React.createElement(
    ResponsiveContainer, { width:"100%", height:190 },
    React.createElement(
      LineChart, { data, margin:{ top:10, right:10, bottom:0, left:0 } },
      React.createElement(CartesianGrid, { strokeDasharray:"3 3", stroke:`${T.accent}22` }),
      React.createElement(XAxis, { dataKey:"x", tick:{ fill:T.sub, fontSize:10 }, tickLine:false }),
      React.createElement(YAxis, { tick:{ fill:T.sub, fontSize:10 }, tickLine:false, width:36 }),
      React.createElement(Tooltip, { contentStyle:{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:8, color:T.text, fontSize:12 } }),
      React.createElement(Line, { type:"monotone", dataKey:"y", stroke:T.accent, strokeWidth:2, dot:false, activeDot:{ r:4, fill:T.accent2 } })
    )
  );
  ReactDOM.render(el, wrap);
}

// ── DOM Helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }
function setHTML(id, val) { const el = $(id); if (el) el.innerHTML  = val; }

// ── Compute ───────────────────────────────────────────────────────────────────
async function compute() {
  const expr = state.expr.trim();
  if (!expr) return;

  state.loading = true;
  setText("ai-text", "Analyzing your calculation...");

  const hasX = /x/.test(expr);
  let res = "";

  if (hasX) {
    const gd = getGraphData(expr);
    renderGraph(gd);
    res = `f(x) = ${expr}`;
  } else {
    const val = safeEval(expr);
    res = val !== null
      ? (Number.isInteger(val) ? String(val) : parseFloat(val.toFixed(10)).toString())
      : "Error";
    renderGraph(null);
  }

  state.result = res;
  setText("result-text", res);

  const entry = { expr, result:res, mode:state.mode, time:new Date().toLocaleTimeString() };
  state.history.unshift(entry);
  if (state.history.length > 50) state.history.pop();

  // Claude API
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are NexCalc's AI assistant. Mode: ${state.mode}. Explain calculations in 2-4 sentences. Be smart, helpful, slightly futuristic. If expression has x, describe the graph shape.`,
        messages: [{ role:"user", content:`Expression: ${expr}\nResult: ${res}\nMode: ${state.mode}\nExplain this.` }]
      })
    });
    const data = await resp.json();
    const txt = data?.content?.[0]?.text || getAIFallback(expr, res, state.mode);
    setText("ai-text", txt);
  } catch {
    setText("ai-text", getAIFallback(expr, res, state.mode));
  }

  // Show action buttons
  const actions = $("ai-actions");
  if (actions) actions.style.display = res && res !== "Error" ? "flex" : "none";

  state.loading = false;
}

// ── Button handler ────────────────────────────────────────────────────────────
function handleCalcBtn(label) {
  if (label === "C")   { state.expr = ""; state.result = ""; setText("expr-text","0"); setText("result-text","—"); renderGraph(null); return; }
  if (label === "⌫")   { state.expr = state.expr.slice(0,-1); setText("expr-text", state.expr||"0"); return; }
  if (label === "=")   { compute(); return; }
  if (label === "( )") {
    const opens  = (state.expr.match(/\(/g)||[]).length;
    const closes = (state.expr.match(/\)/g)||[]).length;
    state.expr += opens > closes ? ")" : "(";
    setText("expr-text", state.expr); return;
  }
  if (label === "÷")  { state.expr += "/"; }
  else if (label === "×") { state.expr += "*"; }
  else if (label === "−") { state.expr += "-"; }
  else if (label === "±") { state.expr = state.expr.startsWith("-") ? state.expr.slice(1) : "-" + state.expr; }
  else { state.expr += label; }
  setText("expr-text", state.expr);
  $("calc-input")?.focus();
}

function handleSciBtn(v) {
  if (v === "x²")  { state.expr += "^2"; }
  else if (v === "xʸ")  { state.expr += "^"; }
  else if (v === "1/x") { state.expr = `1/(${state.expr})`; }
  else if (["sin","cos","tan","log","ln","√"].includes(v)) { state.expr += v + "("; }
  else { state.expr += v; }
  setText("expr-text", state.expr);
  $("calc-input")?.focus();
}

// ── Render functions ──────────────────────────────────────────────────────────
function renderThemeDots() {
  const row = $("theme-row");
  row.innerHTML = "";
  Object.keys(THEMES).forEach(t => {
    const btn = document.createElement("button");
    btn.className = "theme-dot" + (t === state.theme ? " active" : "");
    btn.style.background = THEMES[t].accent;
    btn.title = t;
    btn.onclick = () => { state.theme = t; applyTheme(t); renderThemeDots(); renderGraph(state.showGraph ? [] : null); };
    row.appendChild(btn);
  });
}

function renderModeBar() {
  const bar = $("mode-bar");
  bar.innerHTML = "";
  MODES.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "mode-btn" + (m === state.mode ? " active" : "");
    btn.textContent = m;
    btn.onclick = () => { state.mode = m; renderModeBar(); renderCalcPanel(); };
    bar.appendChild(btn);
  });
}

function renderTabBar() {
  const bar = $("tab-bar");
  bar.innerHTML = "";
  ["calc","convert","history","favorites"].forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (t === state.tab ? " active" : "");
    btn.textContent = t;
    btn.onclick = () => { state.tab = t; renderTabBar(); renderContent(); };
    bar.appendChild(btn);
  });
}

function renderCalcPanel() {
  const panel = $("calc-panel");
  if (!panel) return;

  // Scientific buttons
  const sciSection = $("sci-section");
  if (sciSection) {
    sciSection.style.display = (state.mode==="Scientific"||state.mode==="Student") ? "block" : "none";
  }

  // Business chips
  const bizSection = $("biz-section");
  if (bizSection) bizSection.style.display = state.mode==="Business" ? "block" : "none";

  // Creator chips
  const creatorSection = $("creator-section");
  if (creatorSection) creatorSection.style.display = state.mode==="Creator" ? "block" : "none";

  // Placeholder
  const input = $("calc-input");
  if (input) {
    input.placeholder =
      state.mode==="Student"    ? "Enter equation to solve step-by-step..." :
      state.mode==="Creator"    ? "Try: 100000*0.003 for YouTube revenue..." :
      state.mode==="Freelancer" ? "Try: 50 (hourly rate in USD)..." :
      "Type expression or use buttons...";
  }
}

function renderContent() {
  const content = $("main-content");
  if (!content) return;

  if (state.tab === "calc") {
    content.innerHTML = buildCalcHTML();
    attachCalcEvents();
    renderCalcPanel();
    renderGraph(null);
  } else if (state.tab === "convert") {
    content.innerHTML = buildConvertHTML();
    attachConvertEvents();
  } else if (state.tab === "history") {
    content.innerHTML = buildHistoryHTML();
    attachHistoryEvents();
  } else if (state.tab === "favorites") {
    content.innerHTML = buildFavoritesHTML();
    attachFavoritesEvents();
  }
}

// ── HTML builders ─────────────────────────────────────────────────────────────
function buildCalcHTML() {
  // Sci buttons
  const sciBtns = SCI_BUTTONS.map(b =>
    `<button class="sci-btn" data-sci="${b}">${b}</button>`
  ).join("");

  // Business chips
  const bizChips = BUSINESS_FORMULAS.map(f =>
    `<button class="chip" data-formula="${f.formula}">${f.label}</button>`
  ).join("");

  // Creator chips
  const creatorChips = CREATOR_FORMULAS.map(f =>
    `<button class="chip" data-formula="${f.formula}">${f.label}</button>`
  ).join("");

  // Calc grid
  const calcBtns = CALC_BUTTONS.map(b => {
    const cls = b.type === "op" ? "calc-btn op" : b.type === "clear" ? "calc-btn clear" : "calc-btn";
    return `<button class="${cls}" data-btn="${b.label}">${b.label}</button>`;
  }).join("");

  return `
    <div class="panel" id="calc-panel">
      <div class="display">
        <div class="expr-text" id="expr-text">${state.expr||"0"}</div>
        <div class="result-text" id="result-text">${state.result||"—"}</div>
      </div>
      <div class="input-row">
        <input id="calc-input" class="calc-input" type="text" value="${state.expr}" autocomplete="off" autocorrect="off" spellcheck="false"/>
        <button class="eq-btn" id="eq-btn">=</button>
      </div>
      <div id="sci-section" style="display:none">
        <div class="sci-grid">${sciBtns}</div>
      </div>
      <div id="biz-section" style="display:none">
        <div class="chips-label">Quick Formulas</div>
        <div class="chips">${bizChips}</div>
      </div>
      <div id="creator-section" style="display:none">
        <div class="chips-label">Creator Tools</div>
        <div class="chips">${creatorChips}</div>
      </div>
      <div class="calc-grid">${calcBtns}</div>
      <div id="graph-wrap" style="display:none" class="graph-wrap"></div>
      <div style="margin-top:16px">
        <div class="ai-label">⟡ AI Insight</div>
        <div class="ai-box" id="ai-text">${state.aiText}</div>
        <div class="ai-actions" id="ai-actions" style="display:none">
          <button class="fav-btn" id="save-fav-btn">♡ Save formula</button>
          <button class="use-btn" id="use-result-btn">↗ Use result</button>
        </div>
      </div>
    </div>`;
}

function buildConvertHTML() {
  const currOpts = Object.keys(CURRENCY_RATES).map(k => `<option${k===state.currency.from?" selected":""}>${k}</option>`).join("");
  const currOpts2 = Object.keys(CURRENCY_RATES).map(k => `<option${k===state.currency.to?" selected":""}>${k}</option>`).join("");
  const unitTypes = Object.keys(UNITS).map(k => `<option${k===state.unit.type?" selected":""}>${k}</option>`).join("");
  const unitFromOpts = Object.keys(UNITS[state.unit.type]).map(k => `<option${k===state.unit.from?" selected":""}>${k}</option>`).join("");
  const unitToOpts   = Object.keys(UNITS[state.unit.type]).map(k => `<option${k===state.unit.to?" selected":""}>${k}</option>`).join("");
  const tzOpts  = TIMEZONES.map(tz => `<option${tz===state.timezone.from?" selected":""}>${tz}</option>`).join("");
  const tzOpts2 = TIMEZONES.map(tz => `<option${tz===state.timezone.to?" selected":""}>${tz}</option>`).join("");

  return `
    <div class="panel">
      <div class="converter-section">
        <div class="ai-label">⟡ Currency Converter</div>
        <div class="converter-row">
          <span class="conv-label">Amount</span>
          <input id="curr-amount" class="conv-input" type="number" value="${state.currency.amount}" />
          <select id="curr-from" class="conv-select">${currOpts}</select>
          <span class="conv-arrow">→</span>
          <select id="curr-to" class="conv-select">${currOpts2}</select>
        </div>
        <div class="conv-result" id="curr-result">${convertCurrency()} ${state.currency.to}</div>
      </div>

      <div class="converter-section">
        <div class="ai-label">⟡ Unit Converter</div>
        <div class="converter-row">
          <select id="unit-type" class="conv-select">${unitTypes}</select>
          <input id="unit-amount" class="conv-input" type="number" value="${state.unit.amount}" />
          <select id="unit-from" class="conv-select">${unitFromOpts}</select>
          <span class="conv-arrow">→</span>
          <select id="unit-to" class="conv-select">${unitToOpts}</select>
        </div>
        <div class="conv-result" id="unit-result">${convertUnit()} ${state.unit.to}</div>
      </div>

      <div class="converter-section">
        <div class="ai-label">⟡ Timezone Calculator</div>
        <div class="converter-row">
          <select id="tz-from" class="conv-select">${tzOpts}</select>
          <span class="conv-arrow">→</span>
          <select id="tz-to" class="conv-select">${tzOpts2}</select>
        </div>
        <div class="conv-result" id="tz-result">${getTimezone()}</div>
      </div>
    </div>`;
}

function buildHistoryHTML() {
  const items = state.history.map((h, i) => `
    <div class="hist-item" data-idx="${i}">
      <div class="hist-row">
        <div>
          <div class="hist-expr">${h.expr} — ${h.mode}</div>
          <div class="hist-res">${h.result}</div>
        </div>
        <div class="hist-time">${h.time}</div>
      </div>
    </div>`).join("");
  return `
    <div class="panel">
      <div class="ai-label">⟡ Calculation History</div>
      <input id="hist-search" class="hist-search" placeholder="Search history..." />
      <div id="hist-list">${items || '<div class="empty-msg">No calculations yet.</div>'}</div>
    </div>`;
}

function buildFavoritesHTML() {
  const items = state.favorites.map((f, i) => `
    <div class="hist-item">
      <div class="hist-row">
        <div>
          <div class="hist-expr">${f.expr} — ${f.mode}</div>
          <div class="hist-res">${f.result}</div>
        </div>
        <button class="del-btn" data-fav="${i}">✕</button>
      </div>
    </div>`).join("");
  return `
    <div class="panel">
      <div class="ai-label">⟡ Saved Formulas</div>
      ${items || '<div class="empty-msg">Save formulas from the Calculator tab.</div>'}
    </div>`;
}

// ── Event attachers ───────────────────────────────────────────────────────────
function attachCalcEvents() {
  // Text input
  const input = $("calc-input");
  input?.addEventListener("input", e => {
    state.expr = e.target.value;
    setText("expr-text", state.expr || "0");
  });
  input?.addEventListener("keydown", e => { if (e.key === "Enter") compute(); });

  // = button
  $("eq-btn")?.addEventListener("click", compute);

  // Calc grid buttons
  document.querySelectorAll("[data-btn]").forEach(btn => {
    btn.addEventListener("click", () => handleCalcBtn(btn.dataset.btn));
  });

  // Scientific buttons
  document.querySelectorAll("[data-sci]").forEach(btn => {
    btn.addEventListener("click", () => {
      handleSciBtn(btn.dataset.sci);
      if (input) input.value = state.expr;
    });
  });

  // Formula chips
  document.querySelectorAll("[data-formula]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.expr = btn.dataset.formula;
      setText("expr-text", state.expr);
      if (input) input.value = state.expr;
    });
  });

  // Save & use result
  $("save-fav-btn")?.addEventListener("click", () => {
    state.favorites.push({ expr:state.expr, result:state.result, mode:state.mode });
  });
  $("use-result-btn")?.addEventListener("click", () => {
    if (!/x/.test(state.expr) && state.result && state.result !== "Error") {
      state.expr = state.result;
      state.result = "";
      setText("expr-text", state.expr);
      setText("result-text", "—");
      if (input) input.value = state.expr;
    }
  });
}

function attachConvertEvents() {
  // Currency
  $("curr-amount")?.addEventListener("input", e => { state.currency.amount = e.target.value; setText("curr-result", convertCurrency()+" "+state.currency.to); });
  $("curr-from")?.addEventListener("change",  e => { state.currency.from   = e.target.value; setText("curr-result", convertCurrency()+" "+state.currency.to); });
  $("curr-to")?.addEventListener("change",    e => { state.currency.to     = e.target.value; setText("curr-result", convertCurrency()+" "+state.currency.to); });

  // Units
  $("unit-type")?.addEventListener("change", e => {
    state.unit.type = e.target.value;
    const keys = Object.keys(UNITS[state.unit.type]);
    state.unit.from = keys[0];
    state.unit.to   = keys[1];
    renderContent(); // re-render to update dropdowns
  });
  $("unit-amount")?.addEventListener("input", e => { state.unit.amount = e.target.value; setText("unit-result", convertUnit()+" "+state.unit.to); });
  $("unit-from")?.addEventListener("change",  e => { state.unit.from   = e.target.value; setText("unit-result", convertUnit()+" "+state.unit.to); });
  $("unit-to")?.addEventListener("change",    e => { state.unit.to     = e.target.value; setText("unit-result", convertUnit()+" "+state.unit.to); });

  // Timezone
  $("tz-from")?.addEventListener("change", e => { state.timezone.from = e.target.value; setText("tz-result", getTimezone()); });
  $("tz-to")?.addEventListener("change",   e => { state.timezone.to   = e.target.value; setText("tz-result", getTimezone()); });

  // Live clock tick
  setInterval(() => { if (state.tab==="convert") setText("tz-result", getTimezone()); }, 1000);
}

function attachHistoryEvents() {
  // Click history item → load into calc
  document.querySelectorAll("#hist-list .hist-item").forEach((el, i) => {
    el.addEventListener("click", () => {
      const h = state.history[i];
      state.expr   = h.expr;
      state.result = h.result;
      state.tab    = "calc";
      renderTabBar();
      renderContent();
    });
  });

  // Search
  $("hist-search")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#hist-list .hist-item").forEach((el, i) => {
      const h = state.history[i];
      el.style.display = (h.expr.toLowerCase().includes(q) || h.result.toLowerCase().includes(q)) ? "" : "none";
    });
  });
}

function attachFavoritesEvents() {
  document.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.fav);
      state.favorites.splice(idx, 1);
      renderContent();
    });
  });
  document.querySelectorAll(".hist-item").forEach((el, i) => {
    el.addEventListener("click", () => {
      const f = state.favorites[i];
      if (!f) return;
      state.expr   = f.expr;
      state.result = f.result;
      state.tab    = "calc";
      renderTabBar();
      renderContent();
    });
  });
}

// ── Global keyboard shortcuts ─────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    state.expr = "";
    state.result = "";
    if (state.tab === "calc") {
      setText("expr-text", "0");
      setText("result-text", "—");
      const inp = $("calc-input");
      if (inp) inp.value = "";
    }
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Apply initial theme CSS vars
  applyTheme(state.theme);

  // Startup screen
  const startup = $("startup-screen");
  setTimeout(() => {
    startup.classList.add("hide");
    setTimeout(() => startup.remove(), 600);
  }, 2300);

  // Build static shell
  document.getElementById("root").innerHTML = `
    <div id="startup-screen">
      <div style="text-align:center">
        <div class="startup-logo">NEX</div>
        <div class="startup-sub">CALC</div>
        <div class="startup-label">INITIALIZING AI ENGINE...</div>
        <div class="startup-bar-wrap"><div class="startup-bar"></div></div>
      </div>
    </div>
    <canvas id="particle-canvas"></canvas>
    <div id="app">
      <div class="theme-row" id="theme-row"></div>
      <div class="header">
        <div class="logo">✦ NEXCALC</div>
        <div class="tagline">AI Smart Calculation Assistant</div>
      </div>
      <div class="mode-bar" id="mode-bar"></div>
      <div class="tab-bar"  id="tab-bar"></div>
      <div id="main-content"></div>
      <div class="footer">NEXCALC v3.0 · AI-POWERED · PRESS ENTER TO CALCULATE</div>
    </div>`;

  // Render dynamic parts
  renderThemeDots();
  renderModeBar();
  renderTabBar();
  renderContent();
  initParticles();
});