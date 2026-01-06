/* ====== Config ====== */
const API_BASE = "https://laboratorio-bn7h.vercel.app/-rb-/ArmarJson";
const LOGIN_URL = "https://api.saludplus.co/api/auth/Login";

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

/* ====== Extraer solo el mensaje ====== */
function extractMessageFromResponse(text) {
  try {
    // Intenta parsear como JSON
    const json = JSON.parse(text);
    
    // Busca el campo "mensaje" en diferentes niveles
    if (json.mensaje) return json.mensaje;
    
    // Si no, busca en respuestaSaludPlus
    if (json.respuestaSaludPlus && json.respuestaSaludPlus.mensaje) {
      return json.respuestaSaludPlus.mensaje;
    }
    
    // Si hay success y algún mensaje
    if (json.success && json.respuestaSaludPlus) {
      return "Envío exitoso";
    }
    
    // Si no encuentra mensaje, devuelve el texto completo pero truncado
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  } catch (e) {
    // Si no es JSON válido, busca el patrón "mensaje": en el texto
    const mensajeMatch = text.match(/"mensaje"\s*:\s*"([^"]+)"/);
    if (mensajeMatch && mensajeMatch[1]) {
      return mensajeMatch[1];
    }
    
    // Si no encuentra, devuelve texto truncado
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  }
}

/* ====== Token / Usuario ====== */
let _TOKEN = null;
let _USER = null;



function renderAuth() {
  const el = document.getElementById('authArea');
  el.innerHTML = '';

  /* ================= LOGIN ================= */
  if (!_USER) {
    el.innerHTML = `
      <div class="flex items-center gap-2
                  bg-gray-100 border border-gray-300
                  rounded-full px-2 py-1 shadow-sm">

        <input id="loginUser"
          class="bg-transparent text-gray-700
                 placeholder-gray-400 text-sm
                 px-3 py-1 w-32
                 focus:outline-none"
          type="text" placeholder="Usuario">

        <div class="w-px h-5 bg-gray-300"></div>

        <input id="loginPass"
          class="bg-transparent text-gray-700
                 placeholder-gray-400 text-sm
                 px-3 py-1 w-32
                 focus:outline-none"
          type="password" placeholder="Contraseña">

        <button id="btnLogin"
          class="flex items-center gap-1
                 bg-salu-900 hover:bg-salu-800
                 text-white font-semibold
                 text-sm px-4 py-1.5 rounded-full
                 transition active:scale-95">
          🔐 Entrar
        </button>
      </div>
    `;

    document.getElementById('btnLogin')
      .addEventListener('click', doLogin);

  /* ================= USER ================= */
  } else {
    const initials =
      _USER.iniciales ||
      (_USER.nombre || _USER.usuario || '?')
        .split(' ')
        .map(x => x[0])
        .slice(0, 2)
        .join('');

    el.innerHTML = `
      <div class="flex items-center gap-3
                  bg-gray-100 border border-gray-300
                  rounded-full px-3 py-1.5 shadow-sm">

        <div class="w-9 h-9 rounded-full
                    bg-salu-900 text-white
                    flex items-center justify-center
                    font-bold text-sm">
          ${initials}
        </div>

        <div class="leading-tight">
          <div class="text-sm font-semibold text-gray-900">
            ${escapeHtml(_USER.nombre || _USER.usuario)}
          </div>
          <div class="text-xs text-gray-500">
            ID ${_USER.id ?? '-'} · ${_USER.isAdmin ? 'ADMIN' : 'USUARIO'}
          </div>
        </div>

        <button id="btnLogout"
          class="ml-2 text-xs text-red-600
                 hover:text-red-700
                 border border-red-300
                 px-3 py-1 rounded-full
                 transition">
          Salir
        </button>
      </div>
    `;

    document.getElementById('btnLogout')
      .addEventListener('click', () => {
        _TOKEN = null;
        _USER = null;
        renderAuth();
      });
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
    _TOKEN = data.token || data.accessToken || null;
    _USER = {
      id: data.id ?? null,
      nombre: data.nombre ?? data.displayName ?? data.usuario ?? null,
      usuario: data.usuario ?? data.username ?? null,
      estado: data.estado ?? true,
      isAdmin: data.isAdmin ?? false,
      iniciales: data.iniciales ?? null,
      perfiles: data.perfiles ?? []
    };
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

/* ====== Parsing ====== */
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
    if (!/^[-\/\s]+$/.test(conc)) {
      const rawConc = (conc||'').toString().trim();
      const comparatorMatch = rawConc.match(/^([<>]=?)([\d\.]+)$/);
      if (comparatorMatch) {
        const comp = comparatorMatch[1]; const num = Number(comparatorMatch[2].replace(',', '.'));
        if (!isNaN(num)) { const rounded=(Math.round(num*10)/10).toFixed(1); conc = `${comp}${rounded}` } else conc = rawConc;
      } else if (/^[+-]?\d+(\.\d+)?$/.test(rawConc)) {
        const n = Number(rawConc);
        if (!isNaN(n)) {
          conc = Number.isInteger(n)
            ? String(n)
            : (Math.round(n * 10) / 10).toFixed(1);
        } else {
          conc = rawConc;
        }
      }
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
    rows.push({ 
      paciente, 
      tipo, 
      tecnica, 
      prueba, 
      id_examen: id_examen || "", 
      conc, 
      unidades, 
      fecha: fecha || "", 
      apiMessage: '', 
      rowClass: 'row-pending'
    });
  }
  return rows;
}

/* ====== Render ====== */
let lastRows = [];

function render(rows){
  const filter = normalize(document.getElementById('filterInput').value);
  const onlyMapped = document.getElementById('mappedOnly').checked;
  let visible = 0;
  
  let html = `<table><thead><tr>
    <th>Paciente</th><th>Tipo</th><th>Técnica</th><th>Prueba</th>
    <th>ID_EXAMEN</th><th>Conc.</th><th>Unidades</th><th>Fecha/Hora</th>
    <th>MENSAJE API</th>
  </tr></thead><tbody>`;
  
  for (const r of rows) {
    if (onlyMapped && !r.id_examen) continue;
    if (filter && !(r.paciente.includes(filter) || normalize(r.prueba).includes(filter) || (r.id_examen && r.id_examen.includes(filter)))) continue;
    visible++;
    
    // Determinar clase CSS para la fila
    let rowClass = r.rowClass || 'row-pending';
    
    // Determinar clase para el mensaje
    let msgClass = 'api-pending';
    if (rowClass === 'row-success') msgClass = 'api-success';
    else if (rowClass === 'row-error') msgClass = 'api-error';
    else if (rowClass === 'row-sending') msgClass = 'api-sending';
    
    // Estilo para ID_EXAMEN
    const idStyle = r.id_examen ? "background:#ecfdf5;color:#166534;font-weight:700" : "color:#ef4444";
    
    html += `<tr class="${rowClass}">
      <td><strong>${r.paciente}</strong></td>
      <td><strong>${r.tipo}</strong></td>
      <td>${r.tecnica}</td>
      <td>${escapeHtml(r.prueba)}</td>
      <td style="${idStyle}">${r.id_examen || '-'}</td>
      <td style="text-align:right">${r.conc}</td>
      <td>${r.unidades}</td>
      <td>${r.fecha}</td>
      <td class="api-message ${msgClass}">${escapeHtml(r.apiMessage || '')}</td>
    </tr>`;
  }
  
  html += `</tbody></table>`;
  document.getElementById('countBadge').textContent = visible + ' filas';
  document.getElementById('resultArea').innerHTML = html || "<p style='color:#666'>No se encontraron datos.</p>";
}

// Eventos
document.getElementById('file').addEventListener('change', async e=>{ 
  const file=e.target.files[0]; 
  if(!file) return; 
  const text=await file.text(); 
  document.getElementById('input').value=text; 
});

document.getElementById('parse').addEventListener('click', ()=>{ 
  const txt=document.getElementById('input').value.trim(); 
  if(!txt) return alert('Pega o carga un archivo primero'); 
  lastRows = parseText(txt); 
  render(lastRows); 
});

document.getElementById('clear').addEventListener('click', ()=>{ 
  document.getElementById('input').value=''; 
  lastRows=[]; 
  document.getElementById('resultArea').innerHTML=''; 
  document.getElementById('countBadge').textContent='0 filas';
});

document.getElementById('filterInput').addEventListener('input', ()=>render(lastRows)); 
document.getElementById('mappedOnly').addEventListener('change', ()=>render(lastRows));

/* ====== Build payloads ====== */
function buildApiPayloads(rows, idUsuario) {
  const grouped = new Map();
  for (let i = 0; i < rows.length; i++) { 
    const r = rows[i];
    if (!r.id_examen) continue;
    const key = `${r.paciente}|${r.id_examen}`;
    if (!grouped.has(key)) grouped.set(key, {rows: [], idProcedimientoObjetivo: r.id_examen, documento: r.paciente, indices: []});
    grouped.get(key).rows.push(r);
    grouped.get(key).indices.push(i);
  }

  const payloads = [];
  for (const [key, groupData] of grouped.entries()) {
    const { documento, idProcedimientoObjetivo, rows: group } = groupData;
    const examId = idProcedimientoObjetivo;
    let body = { idUsuario: Number(idUsuario) };

    if (examId === '9087') {
      const total = group.find(g=>/TOTAL/i.test(g.prueba));
      const directa = group.find(g=>/DIRECTA|DIRECT/i.test(g.prueba));
      const indirecta = group.find(g=>/INDIRECTA|INDIRECT|BILURB/i.test(g.prueba));
      const totalVal = (total && total.conc) ? total.conc : '0';
      const directaVal = (directa && directa.conc) ? directa.conc : '0';
      const indirectaVal = (indirecta && indirecta.conc) ? indirecta.conc : '0';
      body.resultadosArray = [totalVal, directaVal, indirectaVal];
    } else if (examId === '9121') {
      const pre = group.find(g=>g.tipo==='PRE');
      const post = group.find(g=>g.tipo==='POST');
      const preVal=(pre&&pre.conc)?pre.conc:'0';
      const postVal=(post&&post.conc)?post.conc:'0';
      body.resultadosArray = [preVal, postVal];
    } else if (examId === '9122') {
      const slots = [
        {label:'GLUCOSA 2 HORAS', tipo:'2H'}, {label:'GLUCOSA 3 HORAS', tipo:'3H'},
        {label:'GLUCOSA 1 HORA', tipo:'1H'}, {label:'GLUCOSA MEDIA HORA', tipo:'1/2H'},
        {label:'OBSERVACIÓN', tipo:null}, {label:'GLUCOSA BASAL', tipo:'B'}
      ];
      const resultadosArray = slots.map(slot=>{
        if(!slot.tipo) return '0';
        const row = group.find(g=>g.tipo===slot.tipo);
        return (row&&row.conc)?row.conc:'0';
      });
      body.resultadosArray = resultadosArray;
    } else {
      const first = group[0];
      const val = (first&&first.conc)?first.conc:'0';
      body.resultado = String(val);
    }

    payloads.push({
      documento,
      idProcedimientoObjetivo: examId,
      body,
      indices: groupData.indices 
    });
  }
  return payloads;
}

/* ====== Send to API ====== */
async function sendToArmarJson(payload) {
  if (!_TOKEN) throw new Error('No hay token. Inicia sesión primero.');
  const url = `${API_BASE}?token=${encodeURIComponent(_TOKEN)}&documento=${encodeURIComponent(payload.documento)}&idProcedimientoObjetivo=${encodeURIComponent(payload.idProcedimientoObjetivo)}&idUsuario=${encodeURIComponent(payload.body.idUsuario)}`;
  
  let res, text;
  try {
    res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload.body) });
    text = await res.text();
  } catch (error) {
    return { ok: false, text: `Error de red: ${error.message}` };
  }
  
  // Extraer solo el mensaje
  const message = extractMessageFromResponse(text);
  
  return { ok: res.ok, text: message };
}

function getFilteredRowsForSend() {
  const filter = normalize(document.getElementById('filterInput').value);
  const onlyMapped = document.getElementById('mappedOnly').checked;
  return lastRows.filter(r => {
    if (!r.id_examen) return false;
    if (onlyMapped && !r.id_examen) return false;
    if (filter) {
      const f = filter;
      if (!(r.paciente.includes(f) || normalize(r.prueba).includes(f) || (r.id_examen && r.id_examen.includes(f)))) return false;
    }
    return true;
  });
}

// Envío a la API

document.getElementById('sendApi').addEventListener('click', async () => {
  const idUsuario = document.getElementById('idUsuario').value.trim();
  if (!idUsuario) return alert('Ingresa el idUsuario antes de subir a la API');
  if (!lastRows.length) return alert('Primero parsea el archivo TXT');
  if (!_TOKEN) return alert('Debes iniciar sesión para obtener token antes de enviar');

  const rowsToSend = getFilteredRowsForSend();
  if (!rowsToSend.length) return alert('No hay filas con ID_EXAMEN para enviar');

  const payloads = buildApiPayloads(rowsToSend, idUsuario);
  if (!payloads.length) return alert('No hay payloads válidos');

  if (!confirm(`Se enviarán ${payloads.length} peticiones a la API.\n¿Continuar?`)) return;

  /* ===== UI PROGRESO ===== */
  const progressBox = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const okCountEl = document.getElementById('okCount');
  const failCountEl = document.getElementById('failCount');

  progressBox.classList.remove('hidden');
  progressBar.style.width = '0%';

  let total = payloads.length;
  let sent = 0;
  let ok = 0;
  let fail = 0;

  okCountEl.textContent = '0';
  failCountEl.textContent = '0';
  progressText.textContent = `0 / ${total}`;

  /* Marcar filas como enviando */
  rowsToSend.forEach(r => {
    r.apiMessage = 'Enviando…';
    r.rowClass = 'row-sending';
  });
  render(lastRows);

  for (const p of payloads) {
    try {
      const result = await sendToArmarJson(p);
      sent++;

      const matchingRows = lastRows.filter(r =>
        r.paciente === p.documento &&
        r.id_examen === p.idProcedimientoObjetivo
      );

      if (result.ok) {
        ok++;
        matchingRows.forEach(r => {
          r.apiMessage = `✅ ${result.text}`;
          r.rowClass = 'row-success';
        });
      } else {
        fail++;
        matchingRows.forEach(r => {
          r.apiMessage = `❌ ${result.text}`;
          r.rowClass = 'row-error';
        });
      }

    } catch (err) {
      sent++;
      fail++;
      lastRows
        .filter(r =>
          r.paciente === p.documento &&
          r.id_examen === p.idProcedimientoObjetivo
        )
        .forEach(r => {
          r.apiMessage = `❌ Error de red`;
          r.rowClass = 'row-error';
        });
    }

    /* ===== ACTUALIZAR BARRA ===== */
    const percent = Math.round((sent / total) * 100);
    progressBar.style.width = percent + '%';
    progressText.textContent = `${sent} / ${total}`;
    okCountEl.textContent = ok;
    failCountEl.textContent = fail;

    render(lastRows);
  }

  alert(`Proceso terminado.\n✔ Éxitos: ${ok}\n❌ Errores: ${fail}`);
});





// Inicializar UI
renderAuth();