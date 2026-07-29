// ============================================================
//  controllers/resultadoLaboratorio.controller.ts
//  Controlador completo con soporte especial + lógica extraíble
// ============================================================

import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'https://api.saludplus.co';
const IDS_FIJOS_CURVA = [7605, 8052, 7604, 8051, 9182, 7603];

// ============================================================
//  FUNCIÓN AUXILIAR: Obtener parametrización completa del core
// ============================================================
async function obtenerParametrizacionCompleta(
  idAdmision: number,
  idProcedimiento: number,
  idFactura: number,
  token: string
): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/api/resultadoLaboratorio/ParametrizacionesProcedimientos`;
    const params = {
      idAdmision: String(idAdmision),
      idsProcedimientos: String(idProcedimiento),
    };
    const response = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = response.data;
    if (data?.result?.length > 0) {
      const encontrado = data.result.find(
        (item: any) => item.idFacturasProcedimiento === idFactura
      );
      return encontrado || data.result[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================
//  FUNCIÓN LÓGICA REUTILIZABLE
// ============================================================
export interface GuardarResultadoParams {
  idAdmision: number;
  idProcedimiento: number;
  idFactura: number;
  idItem: number;
  idUsuario: number;
  token: string;
  resultados: string[];
}

export async function guardarResultadoLogic(params: GuardarResultadoParams): Promise<any> {
  const {
    idAdmision,
    idProcedimiento,
    idFactura,
    idItem,
    idUsuario,
    token,
    resultados,
  } = params;

  // --- Validaciones ---
  if (!idAdmision || !idProcedimiento || !idFactura || !idUsuario) {
    throw new Error('Faltan campos obligatorios: idAdmision, idProcedimiento, idFactura, idUsuario');
  }
  if (!token) {
    throw new Error('Token de autorización requerido');
  }

  const resultadosArray = resultados.filter(r => r && r.trim() !== '');
  if (resultadosArray.length === 0) {
    throw new Error('Los resultados no pueden estar vacíos');
  }

  // --- Obtener parametrización completa del core ---
  const parametrizacion = await obtenerParametrizacionCompleta(
    idAdmision,
    idProcedimiento,
    idFactura,
    token
  );

  if (!parametrizacion) {
    throw new Error('No se encontró la parametrización para el procedimiento');
  }

  // --- Extraer datos del core (SOLO los que necesitamos) ---
  const idCore = parametrizacion.id || 0;
  const idResultadoLaboratorioCore = parametrizacion.idResultadoLaboratorio || 0;
  const idOrdenProcedimiento = parametrizacion.idOrdenProcedimiento || 0;
  const categorias = parametrizacion.categoriasLaboratorios || [];

  // --- Fecha y hora SIEMPRE automáticas ---
  const fecha = new Date().toISOString().split('T')[0];
  const hora = new Date().toTimeString().slice(0, 8);

  // --- idUsuario SIEMPRE el enviado ---
  const idUsuarioFinal = Number(idUsuario);

  // --- Construir items con IDs consecutivos ---
  let items: any[] = [];
  let idResultadoLaboratorioFinal = idResultadoLaboratorioCore;

  // ============================================================
  //  CASO 9087 - BILIRRUBINA (3 resultados)
  // ============================================================
  if (idProcedimiento === 9087) {
    if (resultadosArray.length !== 3) {
      throw new Error('El examen 9087 requiere exactamente 3 resultados');
    }
    const baseId = Number(idItem);
    if (!baseId) {
      throw new Error('Se requiere idItem base para el examen 9087');
    }

    // Generar IDs consecutivos
    items = resultadosArray.map((texto, index) => ({
      idItem: baseId + index,
      idResultadoLaboratorioItem: 0,
      idResultadoLaboratorioProcedimiento: 0,
      resultado: texto,
    }));

    // 9087 SIEMPRE nuevo -> idResultadoLaboratorio = 0
    idResultadoLaboratorioFinal = 0;
  }

  // ============================================================
  //  CASO 9121 (2 resultados)
  // ============================================================
  else if (idProcedimiento === 9121) {
    if (resultadosArray.length !== 2) {
      throw new Error('El examen 9121 requiere exactamente 2 resultados');
    }
    const baseId = Number(idItem);
    if (!baseId) {
      throw new Error('Se requiere idItem base para el examen 9121');
    }

    // Generar IDs consecutivos
    items = resultadosArray.map((texto, index) => ({
      idItem: baseId + index,
      idResultadoLaboratorioItem: 0,
      idResultadoLaboratorioProcedimiento: 0,
      resultado: texto,
    }));

    // 9121 puede actualizar, usar ID del core
    idResultadoLaboratorioFinal = idResultadoLaboratorioCore;
  }

  // ============================================================
  //  CASO 9122 - CURVA (6 IDs fijos)
  // ============================================================
  else if (idProcedimiento === 9122) {
    if (resultadosArray.length !== 6) {
      throw new Error('El examen 9122 requiere exactamente 6 resultados');
    }

    // Usar IDs fijos
    items = resultadosArray.map((texto, index) => ({
      idItem: IDS_FIJOS_CURVA[index],
      idResultadoLaboratorioItem: 0,
      idResultadoLaboratorioProcedimiento: 0,
      resultado: texto,
    }));

    // 9122 SIEMPRE nuevo -> idResultadoLaboratorio = 0
    idResultadoLaboratorioFinal = 0;
  }

  // ============================================================
  //  CASO DEFAULT (cualquier otro procedimiento)
  // ============================================================
  else {
    if (resultadosArray.length !== 1) {
      throw new Error('Para exámenes simples debe enviar exactamente 1 resultado');
    }

    // Usar idItem tal cual
    items = [{
      idItem: Number(idItem) || 0,
      idResultadoLaboratorioItem: 0,
      idResultadoLaboratorioProcedimiento: 0,
      resultado: resultadosArray[0],
    }];

    // Usar ID del core (puede actualizar)
    idResultadoLaboratorioFinal = idResultadoLaboratorioCore;
  }

  // ============================================================
  //  CONSTRUIR PAYLOAD FINAL
  // ============================================================
  const payload = {
    ResultadosLaboratorioProcedimientos: [{
      ResultadosLaboratorioCategorias: categorias,
      ResultadosLaboratorioItems: items,
      Id: idCore,
      idUsuario: idUsuarioFinal, // ✅ SIEMPRE el enviado
      fecha: fecha,              // ✅ SIEMPRE automática
      hora: hora,                // ✅ SIEMPRE automática
      IdProcedimiento: String(idProcedimiento),
      idFacturasProcedimiento: Number(idFactura),
      idOrdenProcedimiento: idOrdenProcedimiento,
    }],
    idAdmision: Number(idAdmision),
    idResultadoLaboratorio: idResultadoLaboratorioFinal,
  };

  // ============================================================
  //  ENVÍO A LA API DE SALUDPLUS
  // ============================================================
  const response = await axios.post(
    `${API_BASE_URL}/api/resultadoLaboratorio/GuardarResultado`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
    }
  );
  return response.data;
}

// ============================================================
//  CONTROLADOR EXPRESS: Guardar resultado
// ============================================================
export async function guardarResultado(req: Request, res: Response) {
  try {
    const {
      idAdmision,
      idProcedimiento,
      idFactura,
      idItem,
      idUsuario,
      resultado,
      resultados,
      token,
    } = req.body;

    // Validar idUsuario obligatorio
    if (!idUsuario) {
      return res.status(400).json({ error: 'idUsuario es obligatorio' });
    }

    let resultadosArray: string[];
    if (resultados && Array.isArray(resultados)) {
      resultadosArray = resultados;
    } else if (resultado) {
      resultadosArray = [resultado];
    } else {
      return res.status(400).json({ error: 'Debe enviar "resultado" o "resultados"' });
    }

    const data = await guardarResultadoLogic({
      idAdmision: Number(idAdmision),
      idProcedimiento: Number(idProcedimiento),
      idFactura: Number(idFactura),
      idItem: Number(idItem),
      idUsuario: Number(idUsuario), // ✅ Siempre obligatorio
      token,
      resultados: resultadosArray,
    });

    return res.status(200).json({
      success: true,
      message: 'Resultado guardado exitosamente',
      data,
    });
  } catch (error) {
    console.error('Error en guardarResultado:', error);
    if (error instanceof AxiosError) {
      return res.status(error.response?.status || 500).json({
        error: 'Error al guardar en API externa',
        details: error.response?.data || error.message,
      });
    }
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

// ============================================================
//  RESTO DE CONTROLADORES (sin cambios)
// ============================================================
export async function obtenerResultado(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { token } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const response = await axios.get(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    if (error instanceof AxiosError) {
      return res.status(error.response?.status || 500).json({
        error: 'Error al obtener el resultado',
        details: error.response?.data || error.message,
      });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function actualizarResultado(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { resultado, token } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    let existing;
    try {
      existing = await axios.get(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return res.status(404).json({ error: 'Resultado no encontrado' });
    }

    const dataExistente = existing.data.result || existing.data;
    const idProcedimiento = dataExistente.IdProcedimiento || dataExistente.idProcedimiento;

    if (idProcedimiento === 9087 || idProcedimiento === 9122) {
      return res.status(400).json({
        error: `El examen ${idProcedimiento} siempre se guarda como nuevo, use POST /guardar`,
      });
    }

    if (!resultado) {
      return res.status(400).json({ error: 'El campo "resultado" es obligatorio' });
    }

    const payload = {
      ...dataExistente,
      ResultadosLaboratorioProcedimientos: dataExistente.ResultadosLaboratorioProcedimientos.map(
        (proc: any) => ({
          ...proc,
          ResultadosLaboratorioItems: proc.ResultadosLaboratorioItems.map((item: any) => ({
            ...item,
            resultado,
          })),
        })
      ),
    };

    const response = await axios.put(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    return res.status(200).json({ success: true, message: 'Resultado actualizado', data: response.data });
  } catch (error) {
    if (error instanceof AxiosError) {
      return res.status(error.response?.status || 500).json({
        error: 'Error al actualizar',
        details: error.response?.data || error.message,
      });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function eliminarResultado(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { token } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const response = await axios.delete(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status(200).json({ success: true, message: 'Resultado eliminado', data: response.data });
  } catch (error) {
    if (error instanceof AxiosError) {
      return res.status(error.response?.status || 500).json({
        error: 'Error al eliminar',
        details: error.response?.data || error.message,
      });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function listarResultados(req: Request, res: Response) {
  try {
    const { idAdmision, idProcedimiento, token } = req.query;
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const params = new URLSearchParams();
    if (idAdmision) params.append('IdAdmision', String(idAdmision));
    if (idProcedimiento) params.append('IdProcedimiento', String(idProcedimiento));

    const url = `${API_BASE_URL}/api/resultadoLaboratorio?${params.toString()}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    if (error instanceof AxiosError) {
      return res.status(error.response?.status || 500).json({
        error: 'Error al listar',
        details: error.response?.data || error.message,
      });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
}