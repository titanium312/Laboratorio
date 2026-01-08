import axios from 'axios';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { BuscarAdmision } from '../Controller/BuscarAdmision';
import { Procedimiento } from '../Controller/Procedimiento';
import { Parametrizacion } from '../Controller/Parametros';

const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';

/**
 * CORE
 * ─────────────────────────────────────────────
 * Lógica pura, recibe documento, procedimiento y token
 */
export async function obtenerCadenaCompletaCore(
  documento: string,
  idProcedimientoObjetivo: string,
  token: string
): Promise<any> {
  try {
    if (!documento?.trim()) {
      throw new Error('El campo "documento" es obligatorio');
    }

    if (!idProcedimientoObjetivo?.trim()) {
      throw new Error('El campo "idProcedimientoObjetivo" es obligatorio');
    }

    if (!token?.trim()) {
      throw new Error('El token es obligatorio');
    }

    /* ───── Buscar admisión ───── */
    let jsonBuscar: any = null;

    await BuscarAdmision(
      { body: { documento, token } } as Request,
      {
        status: () => null,
        json: (d: any) => (jsonBuscar = d),
        send: (d: any) => (jsonBuscar = d),
      } as any
    );

    if (!jsonBuscar || jsonBuscar.success !== true) {
      return {
        success: false,
        message: 'Error en BuscarAdmision',
        detalle: jsonBuscar,
      };
    }

    /** 🔥 AQUÍ ESTÁ LA CLAVE 🔥 **/
    if (!jsonBuscar.idAdmision) {
      return {
        success: true,
        documento,
        totalAdmisiones: 0,
        resultados: [],
      };
    }

    // Convertimos a array SOLO para reutilizar la lógica
    const idsAdmision = [jsonBuscar.idAdmision];
    const resultados: any[] = [];

    /* ───── Procesar admisión ───── */
    for (const idAdmision of idsAdmision) {
      let procedimientos: any[] = [];

      /* ───── Procedimiento interno ───── */
      let jsonProc: any = null;
      try {
        await Procedimiento(
          { body: { idAdmision, token } } as Request,
          {
            status: () => null,
            json: (d: any) => (jsonProc = d),
            send: (d: any) => (jsonProc = d),
          } as any
        );

        if (jsonProc?.success === true && Array.isArray(jsonProc.data)) {
          procedimientos = jsonProc.data;
        }
      } catch {}

      /* ───── Fallback API externa ───── */
      if (procedimientos.length === 0) {
        try {
          const resp = await axios.get(
            `${BASE_URL}/GetAdmisionLaboratorio?idAdmision=${idAdmision}&isFactura=true`,
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 15000,
            }
          );
          procedimientos = resp.data?.facturaOrOrdens || [];
        } catch (err: any) {
          resultados.push({
            idAdmision,
            error: 'Error API externa',
            detalle: err.message,
          });
          continue;
        }
      }

      let encontrado = false;

      /* ───── Procesar procedimientos ───── */
      for (const proc of procedimientos) {
        const idProc = (proc.idProcedimiento ?? proc.idProc)?.toString();

        if (idProc !== idProcedimientoObjetivo) continue;

        encontrado = true;

        /* ───── Parametrización ───── */
        let jsonParam: any = null;
        try {
          await Parametrizacion(
            {
              body: {
                idAdmision: idAdmision.toString(),
                idsProcedimientos: idProcedimientoObjetivo,
                token,
              },
            } as Request,
            {
              status: () => null,
              json: (d: any) => (jsonParam = d),
              send: (d: any) => (jsonParam = d),
            } as any
          );
        } catch (err: any) {
          resultados.push({
            idAdmision,
            idProcedimiento: idProc,
            error: 'Error en Parametrizacion',
            detalle: err.message,
          });
          continue;
        }

        resultados.push({
          idAdmision,
          idProcedimiento: idProc,
          idFactura: proc.id ?? proc.idFactura ?? null,
          ...jsonParam,
        });
      }

      if (!encontrado) {
        resultados.push({
          idAdmision,
          nota: `Procedimiento ${idProcedimientoObjetivo} no encontrado`,
        });
      }
    }

    return {
      success: true,
      documento,
      idProcedimientoBuscado: idProcedimientoObjetivo,
      totalAdmisiones: idsAdmision.length,
      resultados,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Error interno en obtenerCadenaCompleta',
      detalle: err.message,
    };
  }
}

/**
 * CONTROLLER EXPRESS
 * ─────────────────────────────────────────────
 */
export const obtenerCadenaCompleta: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documento, idProcedimientoObjetivo, token } = req.body;

    if (!documento || !idProcedimientoObjetivo || !token) {
      return res.status(400).json({
        success: false,
        error: 'documento, idProcedimientoObjetivo y token son obligatorios',
      });
    }

    const resultado = await obtenerCadenaCompletaCore(
      documento,
      idProcedimientoObjetivo,
      token
    );

    return res.json(resultado);
  } catch (err) {
    next(err);
  }
};

export default obtenerCadenaCompleta;
