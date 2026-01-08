// src/Controller/Parametrizacion.ts
import { Request, Response } from 'express';
import axios from 'axios';

const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';

export const Parametrizacion = async (req: Request, res: Response) => {
  try {
    const idAdmision = req.body.idAdmision || req.query.idAdmision;
    const idsProcedimientos = req.body.idsProcedimientos || req.query.idsProcedimientos;
    const token = req.body.token || req.query.token;

    /* ───── Validaciones ───── */
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(400).json({
        error: 'El token es obligatorio'
      });
    }

    if (!idAdmision || !idsProcedimientos) {
      return res.status(400).json({
        error: 'Faltan parámetros obligatorios',
        requerido: {
          idAdmision: 'string',
          idsProcedimientos: 'string (ej: "9096" o "9096,9097")'
        }
      });
    }

    /* ───── Normalizar idsProcedimientos ───── */
    const ids = Array.isArray(idsProcedimientos)
      ? idsProcedimientos.join(',')
      : String(idsProcedimientos);

    const url = `${BASE_URL}/ParametrizacionesProcedimientos?idAdmision=${idAdmision}&idsProcedimientos=${ids}`;

    /* ───── Llamada a SaludPlus ───── */
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://app.saludplus.co/',
      },
      timeout: 15000,
    });

    /* ───── Procesamiento de datos ───── */
    const data = response.data?.[0];

    if (!data) {
      return res.status(404).json({
        error: 'No existe parametrización para esta admisión y procedimiento'
      });
    }

    const idParametrizacion = data.id;
    const categoria = data.categoriasLaboratorios?.[0];
    const item = categoria?.itemsLaboratorios?.[0];

    if (!item) {
      return res.status(404).json({
        error: 'No existen items de laboratorio para esta parametrización'
      });
    }

    /* ───── Respuesta final ───── */
    return res.json({
      success: true,
      idParametrizacion,
      idItem: item.id,
      idResultadoLaboratorioItem: item.idResultadoItem,
      idResultadoLaboratorioProcedimiento: item.idResultadoProcedimiento
    });

  } catch (error: any) {
    console.error('Error en /parametrizacion:', error.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status || 502).json({
        error: 'Error desde SaludPlus',
        detalle: error.response.data
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout: SaludPlus no respondió a tiempo'
      });
    }

    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'No se pudo obtener la parametrización'
    });
  }
};

export default Parametrizacion;
