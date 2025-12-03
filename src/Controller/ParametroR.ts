// src/services/obtenerCadenaCompleta.ts
import axios from 'axios';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { BuscarAdmision } from '../Controller/BuscarAdmision';
import { Procedimiento } from '../Controller/Procedimiento';
import { Parametrizacion } from '../Controller/Parametros';
import { getToken } from '../Controller/token.js';

const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';

/**
 * Lógica principal: recibe documento e idProcedimientoObjetivo y devuelve el resultado.
 * Esta función es independiente de Express (se puede llamar desde controllers o tests).
 */
export async function obtenerCadenaCompletaCore(
  documento: string,
  idProcedimientoObjetivo: string
): Promise<any> {
  try {
    if (!documento || documento.trim() === "") {
      throw new Error('El campo "documento" es obligatorio');
    }
    if (!idProcedimientoObjetivo || idProcedimientoObjetivo.trim() === "") {
      throw new Error('El campo "idProcedimientoObjetivo" es obligatorio');
    }

    let jsonResponse: any = null;
    const fakeReqBuscar: any = { body: { documento }, query: {}, params: {} };
    const fakeResBuscar: any = {
      status: () => fakeResBuscar,
      json: (data: any) => { jsonResponse = data; return data; },
      send: (data: any) => { jsonResponse = data; return data; }
    };

    await BuscarAdmision(fakeReqBuscar as unknown as Request, fakeResBuscar as unknown as Response);

    if (!jsonResponse || jsonResponse.success === false) {
      return {
        success: false,
        message: "Error al obtener información desde BuscarAdmision",
        details: jsonResponse
      };
    }

    const admisiones: any[] = jsonResponse.admisiones || [];
    if (admisiones.length === 0) {
      return {
        success: true,
        message: "No se encontraron admisiones",
        total: 0,
        admisiones: [],
        resultados: []
      };
    }

    const idsAdmision = admisiones.map((a: any) => a.consecutivo ?? a.Idamciones ?? null);
    const resultados: any[] = [];
    const TOKEN = getToken();

    for (const idAdmision of idsAdmision) {
      if (!idAdmision) {
        resultados.push({ idAdmision, errors: ["idAdmision nulo o vacío"] });
        continue;
      }

      let procedimientosEncontrados: any[] = [];

      // 1. Intentar con Procedimiento (fuente interna)
      let jsonProc: any = null;
      const fakeReqProc: any = { body: { idAdmision }, query: {}, params: {} };
      const fakeResProc: any = {
        status: () => fakeResProc,
        json: (data: any) => { jsonProc = data; return data; },
        send: (data: any) => { jsonProc = data; return data; }
      };

      try {
        await Procedimiento(fakeReqProc as unknown as Request, fakeResProc as unknown as Response);
        if (Array.isArray(jsonProc) && jsonProc.length > 0) {
          procedimientosEncontrados = jsonProc;
        }
      } catch (e) { /* silencioso */ }

      // 2. Si no hubo procedimientos internos → fallback API externa
      if (procedimientosEncontrados.length === 0) {
        try {
          const url = `${BASE_URL}/GetAdmisionLaboratorio?idAdmision=${encodeURIComponent(idAdmision)}&isFactura=true`;
          const resp = await axios.get(url, {
            headers: { Authorization: `Bearer ${TOKEN}` },
            timeout: 15000
          });
          const facturas = resp.data?.facturaOrOrdens || [];
          procedimientosEncontrados = facturas;
        } catch (err: any) {
          resultados.push({
            idAdmision,
            errors: ["Error en API externa: " + (err?.message || String(err))]
          });
          continue;
        }
      }

      // 3. Procesar solo los procedimientos que coincidan con el que TÚ mandaste
      let encontradoObjetivo = false;

      for (const item of procedimientosEncontrados) {
        const idProcedimiento = (item.idProcedimiento ?? item.idProc ?? null)?.toString();

        const registro: any = {
          idAdmision,
          idFactura: item.id ?? item.idFactura ?? null,
          idProcedimiento,
          coincidencia: idProcedimiento === idProcedimientoObjetivo
        };

        // Solo si coincide con el procedimiento que tú indicaste
        if (idProcedimiento === idProcedimientoObjetivo) {
          encontradoObjetivo = true;

          // Llamar a Parametrizacion
          let jsonParam: any = null;
          const fakeReqParam: any = {
            body: {
              idAdmision: idAdmision.toString(),
              idsProcedimientos: idProcedimientoObjetivo  // solo el que tú quieres
            },
            query: {}, params: {}
          };
          const fakeResParam: any = {
            status: () => fakeResParam,
            json: (d: any) => { jsonParam = d; return d; },
            send: (d: any) => { jsonParam = d; return d; }
          };

          try {
            await Parametrizacion(fakeReqParam as unknown as Request, fakeResParam as unknown as Response);

            if (jsonParam && jsonParam.success !== false) {
              registro.idParametrizacion = jsonParam.idParametrizacion ?? jsonParam.id ?? null;
              registro.idItem = jsonParam.idItem ?? null;
              registro.idResultadoLaboratorioItem = jsonParam.idResultadoLaboratorioItem ?? null;
              registro.idResultadoLaboratorioProcedimiento = jsonParam.idResultadoLaboratorioProcedimiento ?? null;
            } else {
              registro.errors = ["Parametrizacion devolvió vacío o error"];
            }
          } catch (err: any) {
            registro.errors = ["Error en Parametrizacion: " + (err?.message || String(err))];
          }
        } else {
          registro.nota = "Procedimiento diferente al solicitado → parametrización omitida";
        }

        resultados.push(registro);
      }

      // Si en toda la admisión no se encontró el procedimiento objetivo
      if (!encontradoObjetivo && procedimientosEncontrados.length > 0) {
        resultados.push({
          idAdmision,
          nota: `Procedimiento ${idProcedimientoObjetivo} no encontrado en esta admisión`
        });
      }
    }

    return {
      success: true,
      documento,
      idProcedimientoBuscado: idProcedimientoObjetivo,
      totalAdmisiones: admisiones.length,
      resultados,
      message: "Búsqueda completada solo para el procedimiento indicado"
    };

  } catch (err: any) {
    return {
      success: false,
      message: "Error interno en obtenerCadenaCompleta",
      details: err?.message ?? String(err)
    };
  }
}

/**
 * Handler Express: mantiene tu router intacto (router.get('/BuscarAdmision', obtenerCadenaCompleta))
 * Extrae `documento` e `idProcedimientoObjetivo` desde req.query o req.body y responde JSON.
 */
export const obtenerCadenaCompleta: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documento = (req.query.documento ?? req.body?.documento) as string | undefined;
    const idProcedimientoObjetivo = (req.query.idProcedimientoObjetivo ?? req.body?.idProcedimientoObjetivo) as string | undefined;

    if (!documento) {
      return res.status(400).json({ success: false, message: 'Falta el parámetro "documento"' });
    }
    if (!idProcedimientoObjetivo) {
      return res.status(400).json({ success: false, message: 'Falta el parámetro "idProcedimientoObjetivo"' });
    }

    const resultado = await obtenerCadenaCompletaCore(documento, idProcedimientoObjetivo);
    return res.json(resultado);
  } catch (err) {
    // si ocurre un error no manejado, lo pasamos a next para que tu middleware de errores lo procese
    next(err);
  }
};

export default obtenerCadenaCompleta;
