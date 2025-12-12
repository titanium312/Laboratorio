/* ------------------- LÓGICA de PARSEO (mantiene tu heurística pero modular) ------------------- */
const API_URL_DEFAULT = document.getElementById('apiUrl').value;
const EXAM_MAP = {
  "GLUCOSE": "11803", "GLUCOSA": "11803",
  "CHOLESTEROL": "9096", "COL": "9096",
  "TRIGLYCERIDES": "9146", "TRIGLICERIDOS": "9146",
  "LDL": "9094", "COLESTEROL LDL": "9094",
  "CREATININE": "9173", "CREATININA": "9173",
  "BUN": "9147", "UREA": "9147",
  "URIC ACID": "9079", "ACIDO URICO": "9079",
  "BILIRUBIN DIRECT": "9087", "BILIRRUBIN TOTAL": "9087", "BILIRRUBINA TOTAL": "9087","INDIRECT BILIRUBIN": "9087","INDIRECT BILIRUBIN": "9087","BILIRUBIN TOTAL":"9087",
  "CHOL HDL DIRECT": "9093", "HDL": "9093", "CHOL LDL DIRECT": "9094"
};
const CURVA_PREFIX = /^(PRE|POST|1[/]?2H?|1H|2H|3H|B)$/i;
const dateRe = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const timeRe = /^\d{1,2}:\d{2}$/;
const numRe = /^\d+[\.,]?\d*$/;
const cmpNumRe = /^[<>]=?\d+[\.,]?\d*$/;
const dashSlashRe = /^[-\/]{2,}$/;
const resultWordsRe = /^(NEGATIVO|POSITIVO|REACTIVO|NO|TRAZAS|N\/A|INDETERMINADO)$/i;
const unitRe = /^(mg\/?d?l|mg|mmol\/l|mmol|g\/dl|g|iu\/l|iu|%|u\/l|ml|mL|ug\/mL|mg\/L)$/i;
function normalize(s){return (s||'').toString().trim().toUpperCase()}
function looksLikeResult(token,nextToken){ if(!token) return false; if(numRe.test(token)) return true; if(cmpNumRe.test(token)) return true; if(dashSlashRe.test(token)) return true; if(resultWordsRe.test(token)) return true; if(unitRe.test(nextToken)) return true; if(dateRe.test(nextToken)||timeRe.test(nextToken)) return true; if(/^[\d\-\+\/]+$/.test(token)) return true; return false }

function parseText(text){
  const rows=[]; const lines = text.replace(/\r/g,'').split('\n');
  for(let raw of lines){ raw = raw.trim(); if(!raw) continue; if(!/^\d{5,7}/.test(raw)) continue; const parts = raw.split(/\s+/).filter(Boolean); if(parts.length<3) continue; let idx=0; const paciente=parts[idx++]; let tipo='-'; if(idx<parts.length && CURVA_PREFIX.test(parts[idx])){ tipo=parts[idx].toUpperCase(); if(tipo==='1/2') tipo='1/2H'; idx++; }
    let tecnica='SER'; if(idx<parts.length && ['SER','PLASMA','ORINA','SUERO','HECES'].includes(normalize(parts[idx]))){ tecnica=parts[idx]; idx++; }
    let pruebaParts=[]; let conc=''; let unidades='mg/dL';
    while(idx<parts.length){ const word=parts[idx]; const next=parts[idx+1]||''; if(dateRe.test(word)){ pruebaParts.push(word); idx++; continue;} if(looksLikeResult(word,next)){ conc = word.replace(',','.') .trim(); idx++; break;} pruebaParts.push(word); idx++; }
    const prueba = pruebaParts.join(' ').trim(); if(idx<parts.length && unitRe.test(parts[idx])){ unidades=parts[idx]; idx++; } else { if(idx<parts.length && /mg|mmol|g\/dl|iu|%|ug/i.test(parts[idx])){ unidades=parts[idx]; idx++; } }
    let fecha=''; if(idx<parts.length && dateRe.test(parts[idx])){ fecha = parts[idx]; if(idx+1<parts.length && timeRe.test(parts[idx+1])) fecha += ' '+parts[idx+1]; }

    // normalizar concentracion a 1 decimal cuando corresponda
    if(/^[-\/\s]+$/.test(conc)){
      // conservar como está (---, ///)
    } else {
      const rawConc = (conc||'').toString().trim(); const comparatorMatch = rawConc.match(/^([<>]=?)([\d\.]+)$/);
      if(comparatorMatch){ const comp=comparatorMatch[1]; const num=Number(comparatorMatch[2].replace(',','.')); if(!isNaN(num)){ const rounded=(Math.round(num*10)/10).toFixed(1); conc = `${comp}${rounded}` } else conc = rawConc }
      else if(/^[+-]?\d+(\.\d+)?$/.test(rawConc)){ const n=Number(rawConc); conc = (!isNaN(n)) ? (Math.round(n*10)/10).toFixed(1) : rawConc }
      else { conc = rawConc }
    }

    // asignar id_examen
    let id_examen=''; const pruebaNorm = normalize(prueba);
    if(pruebaNorm.includes('GLUCOS')||pruebaNorm.includes('GLUCOSE')){
      if(tipo==='PRE'||tipo==='POST') id_examen='9121'; else if(['1/2H','1H','2H','3H','B'].includes(tipo)) id_examen='9122'; else id_examen='11803';
    } else {
      for(const key in EXAM_MAP){ if(pruebaNorm.includes(normalize(key))) { id_examen = EXAM_MAP[key]; break } }
    }

    rows.push({ paciente, tipo, tecnica, prueba, id_examen: id_examen||'', conc, unidades, fecha: fecha||'' });
  }
  return rows;
}

/* ------------------- RENDER y EXPORT ------------------- */
let lastRows = [];
function render(rows){
  const filter = normalize(document.getElementById('filterInput').value);
  const onlyMapped = document.getElementById('mappedOnly').checked;
  let visible=0; let html = `<table><thead><tr><th>Paciente</th><th>Tipo</th><th>Técnica</th><th>Prueba</th><th>ID_EXAMEN</th><th class='right'>Conc.</th><th>Unidades</th><th>Fecha/Hora</th></tr></thead><tbody>`;
  for(const r of rows){ if(onlyMapped && !r.id_examen) continue; if(filter && !(r.paciente.includes(filter) || normalize(r.prueba).includes(filter) || (r.id_examen && r.id_examen.includes(filter)))) continue; visible++; const idStyle = r.id_examen ? "color:#065f46;font-weight:700" : "color:#ef4444"; html += `<tr><td><strong>${r.paciente}</strong></td><td>${r.tipo}</td><td>${r.tecnica}</td><td>${r.prueba}</td><td style='${idStyle}'>${r.id_examen||'-'}</td><td class='right'>${r.conc}</td><td>${r.unidades}</td><td>${r.fecha}</td></tr>` }
  html += `</tbody></table>`; document.getElementById('countBadge').textContent = visible + ' filas'; document.getElementById('resultArea').innerHTML = visible? html : '<p class="muted">No se encontraron datos.</p>' }

/* ------------------- Controles UI ------------------- */
const fileInput = document.getElementById('file'); const btnSelect = document.getElementById('btnSelect'); const dropzone = document.getElementById('dropzone');
btnSelect.addEventListener('click', ()=>fileInput.click());
fileInput.addEventListener('change', async e=>{ const f = e.target.files[0]; if(!f) return; const txt = await f.text(); const current = document.getElementById('input').value; document.getElementById('input').value = (current? current+'\n':'')+txt; });

// drag & drop
['dragenter','dragover'].forEach(ev=> dropzone.addEventListener(ev, e=>{ e.preventDefault(); dropzone.style.borderColor='#c7ddff' }));
['dragleave','drop'].forEach(ev=> dropzone.addEventListener(ev, e=>{ e.preventDefault(); dropzone.style.borderColor='#e6eef8' }));
dropzone.addEventListener('drop', async e=>{ const files = Array.from(e.dataTransfer.files).filter(f=>f.name.endsWith('.txt')); if(!files.length) return; for(const f of files){ const txt = await f.text(); document.getElementById('input').value += (document.getElementById('input').value? '\n':'') + txt } });

document.getElementById('parse').addEventListener('click', ()=>{ const txt = document.getElementById('input').value.trim(); if(!txt) return alert('Pega o carga un archivo primero'); lastRows = parseText(txt); render(lastRows); log('Parseado: ' + lastRows.length + ' filas.'); });

document.getElementById('clear').addEventListener('click', ()=>{ document.getElementById('input').value=''; lastRows=[]; document.getElementById('resultArea').innerHTML=''; document.getElementById('countBadge').textContent='0 filas'; log('Contenido limpiado.'); });

document.getElementById('filterInput').addEventListener('input', ()=>render(lastRows)); document.getElementById('mappedOnly').addEventListener('change', ()=>render(lastRows));

// export
function exportCSV(){ if(!lastRows.length) return alert('Nada que exportar'); const filtered = lastRows.filter(r=>{ if(document.getElementById('mappedOnly').checked && !r.id_examen) return false; const f = normalize(document.getElementById('filterInput').value); if(!f) return true; return r.paciente.includes(f)||normalize(r.prueba).includes(f)||(r.id_examen&&r.id_examen.includes(f)); }); const header = 'Paciente,Tipo,Tecnica,Prueba,ID_EXAMEN,Conc,Unidades,FechaHora\n'; const lines = filtered.map(r => [r.paciente,r.tipo,r.tecnica,`"${r.prueba.replace(/"/g,'""') }"`,r.id_examen,r.conc,r.unidades,r.fecha].join(',')); const blob = new Blob([header+lines.join('\n')],{type:'text/csv;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='resultados_laboratorio.csv'; a.click(); URL.revokeObjectURL(url); }
function exportJSON(){ if(!lastRows.length) return alert('Nada que exportar'); const filtered = lastRows.filter(r=>{ if(document.getElementById('mappedOnly').checked && !r.id_examen) return false; const f = normalize(document.getElementById('filterInput').value); if(!f) return true; return r.paciente.includes(f)||normalize(r.prueba).includes(f)||(r.id_examen&&r.id_examen.includes(f)); }); const blob = new Blob([JSON.stringify(filtered,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='resultados_laboratorio.json'; a.click(); URL.revokeObjectURL(url); }

document.getElementById('downloadCsv').addEventListener('click', exportCSV); document.getElementById('downloadJson').addEventListener('click', exportJSON);

// copy to clipboard
document.getElementById('copyClip').addEventListener('click', async ()=>{ if(!lastRows.length) return alert('Nada que copiar'); try{ await navigator.clipboard.writeText(JSON.stringify(lastRows,null,2)); alert('JSON copiado al portapapeles'); }catch(e){ alert('No se pudo copiar: ' + e.message) } });

/* ------------------- BUILD PAYLOADS y ENVÍO con progreso ------------------- */
function buildApiPayloads(rows,idUsuario){ const grouped = new Map(); for(const r of rows){ if(!r.id_examen) continue; const key = `${r.paciente}|${r.id_examen}`; if(!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(r); }
  const payloads=[];
  for(const [key,group] of grouped.entries()){
    const [documento,idProcedimientoObjetivo] = key.split('|'); const examId = idProcedimientoObjetivo;
    if(examId==='9087'){
      const total = group.find(g=>/TOTAL/i.test(g.prueba)); const directa = group.find(g=>/DIRECTA|DIRECT/i.test(g.prueba)); const indirecta = group.find(g=>/INDIRECTA|INDIRECT/i.test(g.prueba)); const resultadosArray = [ (total&&total.conc)?total.conc:'0', (directa&&directa.conc)?directa.conc:'0', (indirecta&&indirecta.conc)?indirecta.conc:'0' ]; payloads.push({documento,idProcedimientoObjetivo:examId, body:{idUsuario:Number(idUsuario), resultadosArray}});
    } else if(examId==='9121'){
      const pre = group.find(g=>g.tipo==='PRE'); const post = group.find(g=>g.tipo==='POST'); const resultadosArray = [ (pre&&pre.conc)?pre.conc:'0', (post&&post.conc)?post.conc:'0' ]; payloads.push({documento,idProcedimientoObjetivo:examId, body:{idUsuario:Number(idUsuario), resultadosArray}});
    } else if(examId==='9122'){
      const slots = [{label:'GLUCOSA 2 HORAS',tipo:'2H'},{label:'GLUCOSA 3 HORAS',tipo:'3H'},{label:'GLUCOSA 1 HORA',tipo:'1H'},{label:'GLUCOSA MEDIA HORA',tipo:'1/2H'},{label:'OBSERVACIÓN',tipo:null},{label:'GLUCOSA BASAL',tipo:'B'}]; const resultadosArray = slots.map(slot=>{ if(!slot.tipo) return '0'; const row = group.find(g=>g.tipo===slot.tipo); return (row&&row.conc)?row.conc:'0' }); payloads.push({documento,idProcedimientoObjetivo:examId, body:{idUsuario:Number(idUsuario), resultadosArray}});
    } else {
      const first = group[0]; const val = (first&&first.conc)?first.conc:'0'; payloads.push({documento,idProcedimientoObjetivo:examId, body:{idUsuario:Number(idUsuario), resultado:String(val)}});
    }
  }
  return payloads;
}

function log(msg){ const el = document.getElementById('logArea'); const now = new Date().toLocaleString(); el.textContent = now + ' — ' + msg + '\n' + el.textContent; }

async function sendPayloads(payloads, apiUrl, dry=false){ const total = payloads.length; let done=0; document.getElementById('progressLabel').textContent = `0 / ${total}`; updateProgress(0);
  // limitar concurrencia para no saturar API
  const CONCURRENCY = 4; let idx=0; let ok=0, fail=0;
  async function worker(){ while(true){ const i = idx++; if(i>=payloads.length) return; const p=payloads[i]; try{
        const url = `${apiUrl}?documento=${encodeURIComponent(p.documento)}&idProcedimientoObjetivo=${encodeURIComponent(p.idProcedimientoObjetivo)}&idUsuario=${encodeURIComponent(p.body.idUsuario)}`;
        log(`Enviando ${i+1}/${total} → ${p.documento} / ${p.idProcedimientoObjetivo}`);
        if(!dry){ const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p.body)}); const text = await res.text(); if(!res.ok){ fail++; log(`ERROR ${p.documento} ${p.idProcedimientoObjetivo} → ${text}`); } else { ok++; log(`OK ${p.documento} ${p.idProcedimientoObjetivo} → ${text}`); } }
        else { ok++; log(`DRY-RUN: simulada petición ${p.documento} / ${p.idProcedimientoObjetivo}`); }
      } catch(err){ fail++; log(`Network error ${p.documento} ${p.idProcedimientoObjetivo} → ${err.message}`); }
      done++; document.getElementById('progressLabel').textContent = `${done} / ${total}`; updateProgress(Math.round((done/total)*100)); }
  }
  const workers = Array.from({length:CONCURRENCY}).map(()=>worker()); await Promise.all(workers); return {ok,fail,total}; }

function updateProgress(pct){ const bar = document.getElementById('progressBar'); bar.style.width = pct + '%'; }

// botones de envío
document.getElementById('sendApi').addEventListener('click', async ()=>{
  const idUsuario = document.getElementById('idUsuario').value.trim(); const apiUrl = document.getElementById('apiUrl').value.trim() || API_URL_DEFAULT; if(!idUsuario) return alert('Ingresa el idUsuario antes de subir a la API'); if(!lastRows.length) return alert('Primero parsea el archivo TXT'); const payloads = buildApiPayloads(lastRows,idUsuario); if(!payloads.length) return alert('No hay filas con ID_EXAMEN mapeado para enviar.'); if(!confirm(`Se van a enviar ${payloads.length} peticiones a la API.\n¿Continuar?`)) return; document.getElementById('logArea').textContent = ''; try{ const res = await sendPayloads(payloads, apiUrl, false); alert(`Envío terminado. Éxitos: ${res.ok} — Errores: ${res.fail}`); }catch(e){ alert('Error en envío: '+e.message) } });

// dry-run
document.getElementById('sendApiDry').addEventListener('click', async ()=>{
  const idUsuario = document.getElementById('idUsuario').value.trim(); const apiUrl = document.getElementById('apiUrl').value.trim() || API_URL_DEFAULT; if(!idUsuario) return alert('Ingresa el idUsuario antes de la prueba'); if(!lastRows.length) return alert('Primero parsea el archivo TXT'); const payloads = buildApiPayloads(lastRows,idUsuario); if(!payloads.length) return alert('No hay filas con ID_EXAMEN mapeado para enviar.'); document.getElementById('logArea').textContent = ''; try{ const res = await sendPayloads(payloads, apiUrl, true); alert(`Dry-run terminado. Simuladas: ${res.total}`); }catch(e){ alert('Error en dry-run: '+e.message) } });

// utilidad: log inicial
log('Interfaz lista.');
