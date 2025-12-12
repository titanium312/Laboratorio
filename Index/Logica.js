/* ====== Config ====== */
const API_BASE = "https://laboratorio-bn7h.vercel.app/-rb-/ArmarJson"; // no token aquí
const LOGIN_URL = "https://api.saludplus.co/api/auth/Login"; // endpoint de login (ejemplo)

// Mapa simplificado (igual al anterior)
const EXAM_MAP = {
  "GLUCOSE": "11803", "GLUCOSA": "11803",
  "CHOLESTEROL": "9096", "COL": "9096",
  "TRIGLYCERIDES": "9146", "TRIGLICERIDOS": "9146",
  "LDL": "9094", "COLESTEROL LDL": "9094",
  "CREATININE": "9173", "CREATININA": "9173",
  "BUN": "9147", "UREA": "9147",
  "URIC ACID": "9079", "ACIDO URICO": "9079",
  "BILIRUBIN DIRECT": "9087",
  "BILIRUBIN INDIRECT": "9087", "INDIRECT BILIRUBIN": "9087","INDIRECT BILURB": "9087",
  "BILIRUBIN TOTAL": "9087", "BILIRRUBINA TOTAL": "9087",
  "CHOL HDL DIRECT": "9093", "HDL": "9093",
  "CHOL LDL DIRECT": "9094"
};
const CURVA_PREFIX = /^(PRE|POST|1[/]?2H?|1H|2H|3H|B)$/i;
function normalize(s){return (s||"").toString().trim().toUpperCase();}

/* ====== Token / Usuario (no mostrado) ====== */
let _TOKEN = null; // queda en memoria
let _USER = null;  // objeto con id,nombre,usuario,estado,isAdmin,iniciales,perfiles

function renderAuth() {
  const el = document.getElementById('authArea');
  el.innerHTML = '';
  if (!_USER) {
    // mostrar formulario de login
    const box = document.createElement('div'); box.className = 'loginBox';
    box.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">
        <input id="loginUser" type="text" placeholder="usuario" style="min-width:140px">
        <input id="loginPass" type="password" placeholder="password" style="min-width:140px">
        <button id="btnLogin">Iniciar</button>
      </div>
      <div class="small">Usa credenciales para obtener token. (El token no se mostrará)</div>
    `;
    el.appendChild(box);
    document.getElementById('btnLogin').addEventListener('click', doLogin);
  } else {
    // mostrar card de usuario (sin token)
    const card = document.createElement('div'); card.className = 'userCard';
    const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = _USER.iniciales || (_USER.nombre||'?').split(' ').map(x=>x[0]).slice(0,2).join('');
    const info = document.createElement('div'); info.className = 'userInfo';

    const perfiles = Array.isArray(_USER.perfiles) ? _USER.perfiles.join(', ') : '';
    info.innerHTML = `<b>${escapeHtml(_USER.nombre || _USER.usuario || 'Usuario')}</b>
      <div>id: <strong>${_USER.id ?? '-'}</strong> &nbsp; usuario: <strong>${escapeHtml(_USER.usuario||'-')}</strong></div>
      <div class="small">estado: <strong>${_USER.estado ? 'activo' : 'inactivo'}</strong> &nbsp; isAdmin: <strong>${_USER.isAdmin ? 'sí' : 'no'}</strong></div>
      <div class="small">perfiles: ${escapeHtml(perfiles)}</div>`;

    const actions = document.createElement('div'); actions.className = 'topActions';
    const btnLogout = document.createElement('button'); btnLogout.textContent = 'Cerrar sesión'; btnLogout.className='secondary';
    btnLogout.addEventListener('click', ()=>{ _TOKEN=null; _USER=null; renderAuth(); });

    actions.appendChild(btnLogout);
    card.appendChild(avatar); card.appendChild(info); card.appendChild(actions);
    el.appendChild(card);
  }
}

async function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  if(!user || !pass) return alert('Usuario y password requeridos');

  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username: user, password: pass})
    });
    if(!res.ok) {
      const txt = await res.text();
      console.error('Login failed', txt);
      return alert('Error de login: ' + (txt || res.status));
    }
    const data = await res.json();
    // data expected to contain: id,nombre,usuario,estado,isAdmin,iniciales,perfiles,token
    _TOKEN = data.token || data.accessToken || null;
    // Build a safe user object (exclude token)
    _USER = {
      id: data.id ?? null,
      nombre: data.nombre ?? data.displayName ?? data.usuario ?? null,
      usuario: data.usuario ?? data.username ?? null,
      estado: data.estado ?? true,
      isAdmin: data.isAdmin ?? false,
      iniciales: data.iniciales ?? null,
      perfiles: data.perfiles ?? []
    };

    // Asignar automáticamente el idUsuario en el campo de envío
    const idInput = document.getElementById('idUsuario');
    if (idInput && _USER.id) idInput.value = _USER.id;
    renderAuth();
    alert('Login correcto. Ahora puedes enviar resultados a ArmarJson.');
  } catch (err) {
    console.error('Login error', err);
    alert('Error de red durante login');
  }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>\\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'\\\\','"':'&quot;',"'":"&#39;"})[c]); }

/* ====== Parsing (mismo que tu script original) ====== */
const dateRe = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const timeRe = /^\d{1,2}:\d{2}$/;
const numRe = /^\d+[\.,]?\d*$/;
const cmpNumRe = /^[<>]=?\d+[\.,]?\d*$/;
const dashSlashRe = /^[-\/]{2,}$/;
const resultWordsRe = /^(NEGATIVO|POSITIVO|REACTIVO|NO|TRAZAS|N\/A|INDETERMINADO)$/i;
const unitRe = /^(mg\/?d?l|mg|mmol\/l|mmol|g\/dl|g|iu\/l|iu|%|u\/l|ml|mL|ug\/mL|mg\/L)$/i;
function looksLikeResult(token, nextToken) {
  if (!token) return false;
  if (numRe.test(token)) return true;
  if (cmpNumRe.test(token)) return true;
  if (dashSlashRe.test(token)) return true;
  if (resultWordsRe.test(token)) return true;
  if (unitRe.test(nextToken)) return true;
  if (dateRe.test(nextToken) || timeRe.test(nextToken)) return true;
  if (/^[\d\-\+\/]+$/.test(token)) return true;
  return false;
}

function parseText(text) {
  const rows = [];
  const lines = text.replace(/\r/g, "").split('\n');
  for (let raw of lines) {
    raw = raw.trim();
    if (!raw) continue;
    if (!/^\d{5,7}/.test(raw)) continue;
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length < 3) continue;
    let idx = 0;
    const paciente = parts[idx++];
    let tipo = "-";
    if (idx < parts.length && CURVA_PREFIX.test(parts[idx])) { tipo = parts[idx].toUpperCase(); if (tipo === "1/2") tipo = "1/2H"; idx++; }
    let tecnica = "SER";
    if (idx < parts.length && ["SER","PLASMA","ORINA","SUERO","HECES"].includes(normalize(parts[idx]))) { tecnica = parts[idx]; idx++; }
    let pruebaParts = [];
    let conc = "";
    let unidades = "mg/dL";
    while (idx < parts.length) {
      const word = parts[idx];
      const next = parts[idx+1] || "";
      if (dateRe.test(word)) { pruebaParts.push(word); idx++; continue; }
      if (looksLikeResult(word, next)) { conc = word.replace(',', '.').trim(); idx++; break; }
      pruebaParts.push(word); idx++;
    }
    const prueba = pruebaParts.join(" ").trim();
    if (idx < parts.length && unitRe.test(parts[idx])) { unidades = parts[idx]; idx++; }
    else if (idx < parts.length && /mg|mmol|g\/dl|iu|%|ug/i.test(parts[idx])) { unidades = parts[idx]; idx++; }
    let fecha = "";
    if (idx < parts.length && dateRe.test(parts[idx])) { fecha = parts[idx]; if (idx+1 < parts.length && timeRe.test(parts[idx+1])) fecha += ' ' + parts[idx+1]; }
    // normalize conc to 1 decimal where appropriate
    if (!/^[-\/\s]+$/.test(conc)) {
      const rawConc = (conc||'').toString().trim();
      const comparatorMatch = rawConc.match(/^([<>]=?)([\d\.]+)$/);
      if (comparatorMatch) {
        const comp = comparatorMatch[1]; const num = Number(comparatorMatch[2].replace(',', '.'));
        if (!isNaN(num)) { const rounded=(Math.round(num*10)/10).toFixed(1); conc = `${comp}${rounded}` } else conc = rawConc;
      } else if (/^[+-]?\d+(\.\d+)?$/.test(rawConc)) { const n=Number(rawConc); conc = (!isNaN(n)) ? (Math.round(n*10)/10).toFixed(1) : rawConc; }
      else { conc = rawConc; }
    }
    let id_examen = "";
    const pruebaNorm = normalize(prueba);
    if (pruebaNorm.includes("GLUCOS") || pruebaNorm.includes("GLUCOSE")) {
      if (tipo === "PRE" || tipo === "POST") id_examen = "9121";
      else if (["1/2H","1H","2H","3H","B"].includes(tipo)) id_examen = "9122";
      else id_examen = "11803";
    } else {
      for (const key in EXAM_MAP) if (pruebaNorm.includes(normalize(key))) { id_examen = EXAM_MAP[key]; break; }
    }
    rows.push({ paciente, tipo, tecnica, prueba, id_examen: id_examen || "", conc, unidades, fecha: fecha || "" });
  }
  return rows;
}

/* ====== Render y export ====== */
let lastRows = [];
function render(rows){
  const filter = normalize(document.getElementById('filterInput').value);
  const onlyMapped = document.getElementById('mappedOnly').checked;
  let visible = 0;
  let html = `<table><thead><tr><th>Paciente</th><th>Tipo</th><th>Técnica</th><th>Prueba</th><th>ID_EXAMEN</th><th>Conc.</th><th>Unidades</th><th>Fecha/Hora</th></tr></thead><tbody>`;
  for (const r of rows) {
    if (onlyMapped && !r.id_examen) continue;
    if (filter && !(r.paciente.includes(filter) || normalize(r.prueba).includes(filter) || (r.id_examen && r.id_examen.includes(filter)))) continue;
    visible++;
    const idStyle = r.id_examen ? "background:#ecfdf5;color:#166534;font-weight:700" : "color:#ef4444";


html += `
<tr data-key="${r.paciente}|${r.id_examen}">
<td><b>${r.paciente}</b></td>
<td>${r.tipo}</td>
<td>${escapeHtml(r.prueba)}</td>
<td style="${idStyle}">${r.id_examen||'-'}</td>
<td>${r.conc}</td>
<td>${r.unidades}</td>
<td>${r.fecha}</td>
<td class="statusCell"></td>
</tr>`;

  }
  html += `</tbody></table>`;
  document.getElementById('countBadge').textContent = visible + ' filas';
  document.getElementById('resultArea').innerHTML = html || "<p style='color:#666'>No se encontraron datos.</p>";
}

// Eventos
document.getElementById('file').addEventListener('change', async e=>{ const file=e.target.files[0]; if(!file) return; const text=await file.text(); document.getElementById('input').value=text; });
document.getElementById('parse').addEventListener('click', ()=>{ const txt=document.getElementById('input').value.trim(); if(!txt) return alert('Pega o carga un archivo primero'); lastRows = parseText(txt); render(lastRows); });
document.getElementById('clear').addEventListener('click', ()=>{ document.getElementById('input').value=''; lastRows=[]; document.getElementById('resultArea').innerHTML=''; document.getElementById('countBadge').textContent='0 filas'; });
document.getElementById('filterInput').addEventListener('input', ()=>render(lastRows)); document.getElementById('mappedOnly').addEventListener('change', ()=>render(lastRows));

function exportCSV(){ if(!lastRows.length) return alert('Nada que exportar'); const filtered = lastRows.filter(r=>{ if(document.getElementById('mappedOnly').checked && !r.id_examen) return false; const f=normalize(document.getElementById('filterInput').value); if(!f) return true; return r.paciente.includes(f) || normalize(r.prueba).includes(f) || (r.id_examen&&r.id_examen.includes(f)); }); const header = 'Paciente,Tipo,Tecnica,Prueba,ID_EXAMEN,Conc,Unidades,FechaHora\n'; const lines = filtered.map(r=>[r.paciente,r.tipo,r.tecnica,`"${r.prueba.replace(/"/g,'""') }"`,r.id_examen,r.conc,r.unidades,r.fecha].join(',')); const blob=new Blob([header+lines.join('\n')],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='resultados_laboratorio.csv'; a.click(); }
function exportJSON(){ if(!lastRows.length) return alert('Nada que exportar'); const filtered=lastRows.filter(r=>{ if(document.getElementById('mappedOnly').checked && !r.id_examen) return false; const f=normalize(document.getElementById('filterInput').value); if(!f) return true; return r.paciente.includes(f) || normalize(r.prueba).includes(f) || (r.id_examen&&r.id_examen.includes(f)); }); const blob=new Blob([JSON.stringify(filtered,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='resultados_laboratorio.json'; a.click(); }
document.getElementById('downloadCsv').addEventListener('click', exportCSV); document.getElementById('downloadJson').addEventListener('click', exportJSON);

/* ====== Build payloads (igual) ====== */
function buildApiPayloads(rows, idUsuario) {
  const grouped = new Map();
  for (const r of rows) { if (!r.id_examen) continue; const key = `${r.paciente}|${r.id_examen}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(r); }
  const payloads = [];
  for (const [key, group] of grouped.entries()) {
    const [documento, idProcedimientoObjetivo] = key.split('|'); const examId = idProcedimientoObjetivo;
    if (examId === '9087') {
      const total = group.find(g=>/TOTAL/i.test(g.prueba)); const directa = group.find(g=>/DIRECTA|DIRECT/i.test(g.prueba)); const indirecta = group.find(g=>/INDIRECTA|INDIRECT/i.test(g.prueba));
      const totalVal = (total && total.conc) ? total.conc : '0'; const directaVal = (directa && directa.conc) ? directa.conc : '0'; const indirectaVal = (indirecta && indirecta.conc) ? indirecta.conc : '0';
      const resultadosArray = [totalVal, directaVal, indirectaVal];
      payloads.push({documento, idProcedimientoObjetivo: examId, body: { idUsuario: Number(idUsuario), resultadosArray }});
    } else if (examId === '9121') {
      const pre = group.find(g=>g.tipo==='PRE'); const post = group.find(g=>g.tipo==='POST'); const preVal=(pre&&pre.conc)?pre.conc:'0'; const postVal=(post&&post.conc)?post.conc:'0'; payloads.push({documento, idProcedimientoObjetivo: examId, body:{ idUsuario:Number(idUsuario), resultadosArray:[preVal, postVal] }});
    } else if (examId === '9122') {
      const slots = [ {label:'GLUCOSA 2 HORAS', tipo:'2H'}, {label:'GLUCOSA 3 HORAS', tipo:'3H'}, {label:'GLUCOSA 1 HORA', tipo:'1H'}, {label:'GLUCOSA MEDIA HORA', tipo:'1/2H'}, {label:'OBSERVACIÓN', tipo:null}, {label:'GLUCOSA BASAL', tipo:'B'} ];
      const resultadosArray = slots.map(slot=>{ if(!slot.tipo) return '0'; const row = group.find(g=>g.tipo===slot.tipo); return (row&&row.conc)?row.conc:'0'; });
      payloads.push({documento, idProcedimientoObjetivo: examId, body:{ idUsuario:Number(idUsuario), resultadosArray }});
    } else {
      const first = group[0]; const val = (first&&first.conc)?first.conc:'0'; payloads.push({documento, idProcedimientoObjetivo: examId, body:{ idUsuario:Number(idUsuario), resultado: String(val) }});
    }
  }
  return payloads;
}

/* ====== Send to API using token (kept hidden) ====== */
async function sendToArmarJson(payload) {
  if (!_TOKEN) throw new Error('No hay token. Inicia sesión primero.');
  // We'll attach the token as query param ?token=... (será recibido por tu backend)
  const url = `${API_BASE}?token=${encodeURIComponent(_TOKEN)}&documento=${encodeURIComponent(payload.documento)}&idProcedimientoObjetivo=${encodeURIComponent(payload.idProcedimientoObjetivo)}&idUsuario=${encodeURIComponent(payload.body.idUsuario)}`;
  const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload.body) });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

// Send loop (connected to button)
// Obtener filas según filtros visibles (incluye checkbox "Solo con ID asignado")
function getFilteredRowsForSend() {
  const filter = normalize(document.getElementById('filterInput').value);
  const onlyMapped = document.getElementById('mappedOnly').checked;
  return lastRows.filter(r => {
    if (onlyMapped && !r.id_examen) return false; // si está marcada, excluir no mapeados
    if (filter) {
      const f = filter;
      if (!(r.paciente.includes(f) || normalize(r.prueba).includes(f) || (r.id_examen && r.id_examen.includes(f)))) return false;
    }
    return true;
  });
}

// Envío a la API usando las filas filtradas en pantalla (si el usuario marcó el checkbox)
document.getElementById('sendApi').addEventListener('click', async () => {
  // tomar idUsuario desde el input (auto-llenado desde el login)
  const idUsuario = document.getElementById('idUsuario').value.trim();
  if (!idUsuario) return alert('Ingresa el idUsuario antes de subir a la API');
  if (!lastRows.length) return alert('Primero parsea el archivo TXT');
  if (!_TOKEN) return alert('Debes iniciar sesión para obtener token antes de enviar');

  // Obtener filas filtradas por la UI
  const rowsToSend = getFilteredRowsForSend();
  if (!rowsToSend.length) return alert('No hay filas filtradas para enviar (revisa filtro / checkbox).');

  // Construir payloads solo con las filas filtradas
  const payloads = buildApiPayloads(rowsToSend, idUsuario);
  if (!payloads.length) return alert('No hay filas con ID_EXAMEN mapeado para enviar.');

  if (!confirm(`Se van a enviar ${payloads.length} peticiones a la API.
¿Continuar?`)) return;

  let ok = 0;
  let fail = 0;

for (const p of payloads) {
  const rowEl = document.querySelector(
    `tr[data-key="${p.documento}|${p.idProcedimientoObjetivo}"]`
  );
  const statusCell = rowEl?.querySelector('.statusCell');

  if (rowEl) {
    rowEl.className = 'sending';
    statusCell.innerHTML = `<span class="statusBadge status-sending">Enviando…</span>`;
  }

  try {
    const result = await sendToArmarJson(p);

    if (!result.ok) {
      fail++;
      if (rowEl) {
        rowEl.className = 'error';
        statusCell.innerHTML = `
          <span class="statusBadge status-error">Error</span>
          <div class="errorText">${result.status} - ${result.text}</div>`;
      }
    } else {
      ok++;
      if (rowEl) {
        rowEl.className = 'ok';
        statusCell.innerHTML =
          `<span class="statusBadge status-ok">Subido ✔</span>`;
      }
    }
  } catch (err) {
    fail++;
    if (rowEl) {
      rowEl.className = 'error';
      statusCell.innerHTML =
        `<span class="statusBadge status-error">Error red</span>`;
    }
  }
}

  alert(`Envío terminado.
Éxitos: ${ok}
Errores: ${fail}
(Revisa la consola para más detalles).`);
});

// Inicializar UI
renderAuth();