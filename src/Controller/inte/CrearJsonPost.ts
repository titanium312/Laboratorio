// src/controllers/ArmarJsonController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { obtenerCadenaCompletaCore } from '../ParametroR';
import { getToken } from '../token.js';

/* ----------------------------------------------
   Helpers
---------------------------------------------- */
const TOKEN = getToken();

function nowDateTimeStrings() {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  };
}

function isNonEmptyString(v: any): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/* ----------------------------------------------
   MAPEAR JSON INTERNO → FORMATO SALUDPLUS
---------------------------------------------- */
function mapToSaludPlusFormat(jsonFinal: any) {
  return {
    idResultadoLaboratorio: Number(jsonFinal.idResultadoLaboratorio) || 0,
    idAdmision: Number(jsonFinal.idAdmision) || 0,
    idOrden: jsonFinal.ResultadosLaboratorioProcedimientos[0]?.idOrden || 0,

    resultadosLaboratorioProcedimientos:
      jsonFinal.ResultadosLaboratorioProcedimientos.map((proc: any) => ({
        id: proc.Id || 0,
        idResultadoLaboratorio: Number(jsonFinal.idResultadoLaboratorio) || 0,
        idOrden: proc.idOrden || 0,
        idFactura: proc.idFactura || 0,
        idProcedimiento: String(proc.IdProcedimiento || ''),
        idUsuario: Number(proc.idUsuario) || 0,
        fecha: proc.fecha,
        hora: proc.hora,

        resultadosLaboratorioCategorias:
          proc.ResultadosLaboratorioCategorias?.map((cat: any) => ({
            id: cat.id || 0,
            idCategia: cat.idCategoria || 0,
            idResultadoLaboratorioProcedimiento:
              cat.idResultadoLaboratorioProcedimiento || 0,
            resultado: cat.resultado || ''
          })) || [],

        resultadosLaboratorioItems:
          proc.ResultadosLaboratorioItems?.map((item: any) => ({
            idResultadoLaboratorioItem: item.idResultadoLaboratorioItem || 0,
            idItem: item.idItem || 0,
            idResultadoLaboratorioProcedimiento:
              item.idResultadoLaboratorioProcedimiento || 0,
            resultado: item.resultado || ''
          })) || []
      }))
  };
}

/* ----------------------------------------------
   CONTROLADOR PRINCIPAL
---------------------------------------------- */
export const ArmarJsonController = async (req: Request, res: Response) => {
  try {
    /* --------------------------------------
       VALIDACIONES BÁSICAS
    -------------------------------------- */
    const documento = (req.query.documento || req.body.documento)?.toString()?.trim();
    const idProcedimientoObjetivo = (req.query.idProcedimientoObjetivo || req.body.idProcedimientoObjetivo)?.toString()?.trim();
    const idUsuarioRaw = req.body?.idUsuario ?? req.query?.idUsuario;
    const idUsuario = idUsuarioRaw !== undefined ? Number(idUsuarioRaw) : NaN;

    if (!documento)
      return res.status(400).json({ success: false, message: 'El campo "documento" es obligatorio' });

    if (!idProcedimientoObjetivo)
      return res.status(400).json({ success: false, message: 'El campo "idProcedimientoObjetivo" es obligatorio' });

    if (!Number.isFinite(idUsuario) || idUsuario <= 0)
      return res.status(400).json({
        success: false,
        message: 'El campo "idUsuario" es obligatorio y debe ser un número válido'
      });

    /* --------------------------------------
       OBTENER DATOS DESDE EL CORE
    -------------------------------------- */
    const consulta = await obtenerCadenaCompletaCore(documento, idProcedimientoObjetivo);

    if (!consulta?.success)
      return res.status(500).json(consulta);

    const registros: any[] = consulta.resultados ?? [];

    if (!Array.isArray(registros) || registros.length === 0)
      return res.status(404).json({ success: false, message: "No hay registros parametrizados" });

    const match = registros.find(r => r.coincidencia === true) ?? registros[0];

    if (!match)
      return res.status(404).json({
        success: false,
        message: `No se encontró el idProcedimientoObjetivo ${idProcedimientoObjetivo}`,
        consulta
      });

    const { fecha, hora } = nowDateTimeStrings();

    /* --------------------------------------
       CONSTRUIR ITEMS
    -------------------------------------- */
    let items: Array<Record<string, any>> = [];
    let resultadosArrayFromBody: string[] | undefined = undefined;

    const getResultadosArrayLimpio = (): string[] | undefined => {
      if (Array.isArray(req.body?.resultadosArray)) {
        return req.body.resultadosArray.map((x: any) =>
          isNonEmptyString(x) ? x.trim() : String(x ?? '').trim()
        );
      }
      return undefined;
    };

    const idProcedimientoStr = String(match.idProcedimiento ?? idProcedimientoObjetivo ?? '');

    // 🔹 Caso especial: 9087 → BILIRRUBINA 3 ÍTEMS (con ids de ítem de la param y TODO LO DEMÁS EN 0)
    if (idProcedimientoStr === '9087') {
      resultadosArrayFromBody = getResultadosArrayLimpio();

      if (
        !Array.isArray(resultadosArrayFromBody) ||
        resultadosArrayFromBody.length !== 3 ||
        resultadosArrayFromBody.some(r => !isNonEmptyString(r))
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Para IdProcedimiento "9087" debes enviar body.resultadosArray con 3 strings no vacíos'
        });
      }

      const baseIdItem = Number(match.idItem ?? 0); // 7594, por ejemplo

      items = resultadosArrayFromBody.map((label, idx) => ({
        idItem: baseIdItem ? baseIdItem + idx : 0,  // 7594,7595,7596...
        idResultadoLaboratorioItem: 0,              // FORZADO A 0 (como tu JSON correcto)
        idResultadoLaboratorioProcedimiento: 0,     // FORZADO A 0
        resultado: label
      }));

    // Caso especial: 9121 → 2 ítems (curva simple pre/post)
    } else if (idProcedimientoStr === '9121') {
      resultadosArrayFromBody = getResultadosArrayLimpio();

      if (
        !Array.isArray(resultadosArrayFromBody) ||
        resultadosArrayFromBody.length !== 2 ||
        resultadosArrayFromBody.some(r => !isNonEmptyString(r))
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Para IdProcedimiento "9121" debes enviar body.resultadosArray con 2 strings no vacíos (p. ej. ["GLUCOSA PRE PRANDIAL","GLUCOSA POST PRANDIAL"])'
        });
      }

      const baseIdItem = Number(match.idItem ?? 0);

      items = resultadosArrayFromBody.map((label, idx) => ({
        idItem: baseIdItem ? baseIdItem + idx : 0,
        idResultadoLaboratorioItem: 0,
        idResultadoLaboratorioProcedimiento: 0,
        resultado: label
      }));

    // Caso especial: 9122 → PLANTILLA DE CURVA (6 ítems con IDs fijos)
    } else if (idProcedimientoStr === '9122') {
      const FIXED_ID_ITEMS = [7605, 8052, 7604, 8051, 9182, 7603];

      resultadosArrayFromBody = getResultadosArrayLimpio();

      if (
        !Array.isArray(resultadosArrayFromBody) ||
        resultadosArrayFromBody.length !== FIXED_ID_ITEMS.length ||
        resultadosArrayFromBody.some(r => !isNonEmptyString(r))
      ) {
        return res.status(400).json({
          success: false,
          message: `Para IdProcedimiento "9122" debes enviar body.resultadosArray con ${FIXED_ID_ITEMS.length} strings no vacíos (en el orden de la plantilla de curva)`
        });
      }

      items = FIXED_ID_ITEMS.map((fixedId, idx) => ({
        idItem: fixedId,
        idResultadoLaboratorioItem: 0,
        idResultadoLaboratorioProcedimiento: 0,
        resultado: resultadosArrayFromBody![idx]
      }));

    } else {
      // Default: solo 1 resultado
      if (!isNonEmptyString(req.body?.resultado)) {
        return res.status(400).json({
          success: false,
          message: 'Para este procedimiento debes enviar body.resultado'
        });
      }

      items = [
        {
          idItem: match.idItem ?? 0,
          idResultadoLaboratorioItem: match.idResultadoLaboratorioItem ?? 0,
          idResultadoLaboratorioProcedimiento: match.idResultadoLaboratorioProcedimiento ?? 0,
          resultado: String(req.body.resultado).trim()
        }
      ];
    }

    /* --------------------------------------
       ARMAR JSON INTERNO (LIMPIO)
    -------------------------------------- */
    const esPlantillaCurva9122 = idProcedimientoStr === '9122';
    const esBilirrubina9087 = idProcedimientoStr === '9087';

    const jsonFinal = {
      ResultadosLaboratorioProcedimientos: [
        {
          ResultadosLaboratorioCategorias: [],
          ResultadosLaboratorioItems: items,
          Id: match.idParametrizacion ?? match.id ?? 0,
          idUsuario: Number.isFinite(Number(req.body?.idUsuario ?? idUsuario))
            ? Number(req.body?.idUsuario ?? idUsuario)
            : null,
          fecha,
          hora,
          IdProcedimiento: idProcedimientoStr,
          idFactura: match.idFactura ?? 0,
          idOrden: match.idOrden ?? 0
        }
      ],
      idAdmision: match.idAdmision ?? null,
      idResultadoLaboratorio:
        (esPlantillaCurva9122 || esBilirrubina9087)
          ? 0   // 👈 EXACTAMENTE como tu JSON correcto para curva y bilirrubina
          : (
              Number(
                match.idResultadoLaboratorioProcedimiento ??
                match.idResultadoLaboratorio ??
                0
              ) || 0
            )
    };

    /* --------------------------------------
       MAPEAR Y ENVIAR A SALUDPLUS
    -------------------------------------- */
    const payloadSaludPlus = mapToSaludPlusFormat(jsonFinal);

    const resp = await axios.post(
      'https://api.saludplus.co/api/resultadoLaboratorio',
      payloadSaludPlus,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
          'accept': 'application/json'
        }
      }
    );

    /* --------------------------------------
       RESPUESTA FINAL
    -------------------------------------- */
    return res.json({
      success: true,
      mensaje: 'Resultado enviado a SaludPlus correctamente',
      jsonInterno: jsonFinal,
      payloadSaludPlus,
      respuestaSaludPlus: resp.data
    });

  } catch (err: any) {
    console.error('Error en ArmarJsonController:', err?.response?.data || err?.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno',
      error: err?.response?.data || err.message
    });
  }
};

export default ArmarJsonController;
