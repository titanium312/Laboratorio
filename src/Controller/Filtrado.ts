// ============================================================
//  CONTROLADOR: Automatización completa (flujo integrado)
//  1. Busca idAdmision por número de admisión
//  2. Obtiene parametrizaciones
//  3. Guarda resultados automáticamente usando guardarResultadoLogic
//  TODO POR BODY (POST)
// ============================================================

import { Request, Response } from 'express';
import { buscarAdmisionPorNumero } from './IDS/BuscarAdmision';
import { obtenerParametrizaciones, Parametrizacion } from './IDS/parametro';
import { guardarResultadoLogic } from './inte/guardado';
import { AxiosError } from 'axios';

export async function automata(req: Request, res: Response): Promise<Response> {
  try {
    // ============================================================
    //  1. OBTENER TODOS LOS DATOS DEL BODY
    // ============================================================
    const {
      numero,                // Número de admisión (obligatorio)
      idsProcedimientos,     // IDs de procedimientos (obligatorio)
      idUsuario,            // ID del usuario (obligatorio)
      resultados,           // Array de resultados (obligatorio)
      resultado,            // String de resultado (alternativa)
    } = req.body;

    // ============================================================
    //  2. VALIDACIONES
    // ============================================================
    if (!numero) {
      return res.status(400).json({
        error: 'Debe proporcionar "numero" en el body',
      });
    }

    if (!idsProcedimientos) {
      return res.status(400).json({
        error: 'Debe proporcionar "idsProcedimientos" en el body',
      });
    }

    if (!idUsuario) {
      return res.status(400).json({
        error: 'Debe proporcionar "idUsuario" en el body',
      });
    }

    // ============================================================
    //  3. TOKEN (desde header)
    // ============================================================
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token de autorización requerido en el header' });
    }

    // ============================================================
    //  4. OBTENER RESULTADOS (array)
    // ============================================================
    let resultadosArray: string[] = [];
    if (resultados && Array.isArray(resultados)) {
      resultadosArray = resultados;
    } else if (resultado) {
      resultadosArray = [String(resultado)];
    } else {
      return res.status(400).json({
        error: 'Debe proporcionar "resultados" (array) o "resultado" (string) en el body',
      });
    }

    // Filtrar vacíos
    resultadosArray = resultadosArray.filter(r => r && r.trim() !== '');
    if (resultadosArray.length === 0) {
      return res.status(400).json({ error: 'Los resultados no pueden estar vacíos' });
    }

    // ============================================================
    //  5. BUSCAR ADMISIÓN
    // ============================================================
    const idAdmision = await buscarAdmisionPorNumero(String(numero), token);
    if (!idAdmision) {
      return res.status(404).json({
        success: false,
        message: `No se encontró ninguna admisión con número ${numero}`,
      });
    }

    // ============================================================
    //  6. OBTENER PARAMETRIZACIONES
    // ============================================================
    const parametrizaciones = await obtenerParametrizaciones(
      String(idAdmision),
      String(idsProcedimientos),
      token
    );

    if (parametrizaciones.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron parametrizaciones para los procedimientos indicados',
      });
    }

    // ============================================================
    //  7. GUARDAR RESULTADOS PARA CADA PARAMETRIZACIÓN
    // ============================================================
    const guardados = [];
    const errores = [];

    for (const param of parametrizaciones) {
      try {
        const idProcedimientoNum = Number(param.idProcedimiento);
        
        // Validar cantidad de resultados según el tipo de examen
        if (idProcedimientoNum === 9087 && resultadosArray.length !== 3) {
          throw new Error(`El examen 9087 requiere exactamente 3 resultados, pero se recibieron ${resultadosArray.length}`);
        }
        if (idProcedimientoNum === 9121 && resultadosArray.length !== 2) {
          throw new Error(`El examen 9121 requiere exactamente 2 resultados, pero se recibieron ${resultadosArray.length}`);
        }
        if (idProcedimientoNum === 9122 && resultadosArray.length !== 6) {
          throw new Error(`El examen 9122 requiere exactamente 6 resultados, pero se recibieron ${resultadosArray.length}`);
        }

        // Para DEFAULT, si hay más de 1 resultado, solo usamos el primero
        const resultadosParaEnviar = (idProcedimientoNum === 9087 || idProcedimientoNum === 9121 || idProcedimientoNum === 9122) 
          ? resultadosArray 
          : [resultadosArray[0]];

        // Guardar
        const response = await guardarResultadoLogic({
          idAdmision,
          idProcedimiento: idProcedimientoNum,
          idFactura: param.idFacturasProcedimiento,
          idItem: param.idItem,
          idUsuario: Number(idUsuario),
          token,
          resultados: resultadosParaEnviar,
        });

        guardados.push({
          idFactura: param.idFacturasProcedimiento,
          idItem: param.idItem,
          idProcedimiento: param.idProcedimiento,
          success: true,
          data: response,
        });
      } catch (error) {
        errores.push({
          idFactura: param.idFacturasProcedimiento,
          idItem: param.idItem,
          idProcedimiento: param.idProcedimiento,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // ============================================================
    //  8. RESPUESTA FINAL
    // ============================================================
    return res.status(200).json({
      success: true,
      data: {
        idAdmision,
        parametrizaciones,
        guardados: {
          exitosos: guardados,
          errores,
          total: parametrizaciones.length,
          guardados: guardados.length,
          fallidos: errores.length,
        },
      },
    });
  } catch (error) {
    console.error('Error en automata:', error);
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