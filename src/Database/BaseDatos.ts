// ============================================================
//  CONTROLADOR: numeroAdmision + idProcedimientos → PRIMERA ocurrencia
//  Solo devuelve el PRIMER resultado de cada idProcedimiento solicitado.
//  Autenticación: JWT (apiToken) del body
// ============================================================

import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'https://api.saludplus.co';

const COMMON_HEADERS = {
  'X-SPlus-App': '1',
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  Referer: 'https://app.saludplus.co/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  'sec-ch-ua':
    '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

// IDs por defecto si el cliente NO manda idProcedimientos
const IDS_POR_DEFECTO = [
  '11803', // GLUCOSA
  '9096',  // COLESTEROL TOTAL
  '9146',  // TRIGLICÉRIDOS
  '9094',  // LDL
  '9173',  // CREATININA
  '9147',  // UREA
  '9093',  // HDL
  '9087',  // BILIRRUBINAS TOTAL Y DIRECTA
  '9086',  // Bilirrubina Directa
  '9085',  // Bilirrubina Indirecta
  '9121',  // GLUCOSA PRE Y POST
  '9122',  // GLUCOSA CURVA
];

// ============================================================
//  PASO 1: numeroAdmision → idResultado
// ============================================================
async function buscarIdResultado(
  numeroAdmision: string,
  token: string
): Promise<{ idResultado: number; idAdmision: number; numeroAdmision: string } | null> {
  const payload = {
    filters: String(numeroAdmision),
    properties: [
      'nombre1Paciente',
      'nombre2Paciente',
      'apellido1Paciente',
      'apellido2Paciente',
      'fecha',
    ],
    sort: 'id',
    order: 'desc',
    filterslist: '',
    filterAvoid: '',
    filterAudit: '3',
  };

  const r = await axios.post(
    `${API_BASE_URL}/api/resultadoLaboratorio/Listado`,
    payload,
    {
      params: { pageNumber: '1', pageSize: '30' },
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
    }
  );

  const items = r.data?.result || [];
  if (items.length === 0) return null;

  const item = items[0];
  return {
    idResultado: item.id,
    idAdmision: item.idAdmision,
    numeroAdmision: item.numeroAdmision,
  };
}

// ============================================================
//  PASO 2: idResultado → resultado completo
// ============================================================
async function obtenerResultadoCompleto(
  idResultado: number,
  token: string
): Promise<any> {
  const r = await axios.get(
    `${API_BASE_URL}/api/resultadoLaboratorio/ObtenerResultadoCompleto`,
    {
      params: { idResultado: String(idResultado) },
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
    }
  );

  return r.data;
}

// ============================================================
//  HELPER: normalizar lista de IDs
// ============================================================
function normalizarIds(input: any): string[] {
  if (input == null) return [];

  let arr: any[] = [];
  if (Array.isArray(input)) arr = input;
  else if (typeof input === 'string') arr = input.split(',');
  else arr = [input];

  return arr
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
}

// ============================================================
//  CONTROLADOR
// ============================================================
export async function obtenerIdResultadoPorNumero(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    // 1. TOKEN — ⚡ ÚNICO CAMBIO: leer del body en vez del header
    const token = req.body.apiToken;
    if (!token) {
      return res.status(401).json({ error: 'apiToken (JWT) requerido en el body' });
    }

    // 2. BODY
    const { numeroAdmision, idProcedimientos } = req.body;

    if (!numeroAdmision) {
      return res.status(400).json({
        error: 'Debe proporcionar "numeroAdmision" en el body',
      });
    }

    const idsFiltro = normalizarIds(idProcedimientos);
    const idsFinales = idsFiltro.length > 0 ? idsFiltro : IDS_POR_DEFECTO;

    // 3. PASO 1
    const encontrado = await buscarIdResultado(String(numeroAdmision), token);
    if (!encontrado) {
      return res.status(404).json({
        success: false,
        message: `No se encontró ninguna admisión con número ${numeroAdmision}`,
        numeroAdmision,
      });
    }

    // 4. PASO 2
    const completo = await obtenerResultadoCompleto(
      encontrado.idResultado,
      token
    );

    const resultado = completo?.result;
    if (!resultado) {
      return res.status(500).json({
        success: false,
        message: 'La respuesta de SaludPlus no tiene el campo "result"',
        raw: completo,
      });
    }

    const procedimientos = resultado.resultadosLaboratoriosProcedimientos || [];

    // ----------------------------------------------------------
    // 5. FILTRAR + DEDUPLICAR: SOLO LA PRIMERA OCURRENCIA POR idProcedimiento
    // ----------------------------------------------------------
    const vistos = new Set<string>();
    const resultados: any[] = [];

    for (const proc of procedimientos) {
      const idProc = String(proc.idProcedimiento ?? '').trim();

      // Filtrar los que no interesan
      if (!idsFinales.includes(idProc)) continue;

      // Solo la primera vez que vemos este idProcedimiento
      if (vistos.has(idProc)) continue;

      // ¿Tiene items con resultado no vacío? Si no, seguimos buscando
      const tieneContenido = (proc.categoriasLaboratorios || []).some(
        (cat: any) =>
          (cat.itemsLaboratorios || []).some(
            (it: any) => String(it.resultado ?? '').trim() !== ''
          )
      );

      // Si está vacío, no lo tomamos como "el primero" — seguimos buscando
      if (!tieneContenido) continue;

      vistos.add(idProc);

      // Aplanar items
      const items: { nombre: string; resultado: string; valoresReferencia: string }[] = [];
      for (const cat of proc.categoriasLaboratorios || []) {
        for (const it of cat.itemsLaboratorios || []) {
          items.push({
            nombre: it.nombre || '',
            resultado: it.resultado || '',
            valoresReferencia: it.valoresReferencia || '',
          });
        }
      }

      const resultadoTexto = items
        .map((it) => `${it.nombre}: ${it.resultado}`)
        .join(' | ');

      resultados.push({
        numeroAdmision: resultado.numeroAdmision ?? encontrado.numeroAdmision,
        idAdmision: resultado.idAdmision ?? encontrado.idAdmision,
        idResultado: proc.idResultadoLaboratorio ?? encontrado.idResultado,
        idProcedimiento: proc.idProcedimiento ?? null,
        nombreProcedimiento: proc.nombreProcedimiento ?? null,
        resultado: resultadoTexto,
        items,
      });
    }

    // ----------------------------------------------------------
    // 6. RESPUESTA
    // ----------------------------------------------------------
    return res.status(200).json({
      success: true,
      numeroAdmision: encontrado.numeroAdmision,
      idAdmision: encontrado.idAdmision,
      idsFiltrados: idsFinales,
      totalProcedimientosEncontrados: resultados.length,
      totalProcedimientosEnAdmision: procedimientos.length,
      resultados,
    });
  } catch (error) {
    console.error('Error en obtenerIdResultadoPorNumero:', error);

    if (error instanceof AxiosError) {
      return res.status(error.response?.status || 500).json({
        error: 'Error al consultar la API externa',
        details: error.response?.data || error.message,
      });
    }

    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}