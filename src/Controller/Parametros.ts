import { Request, Response } from 'express';
import axios from 'axios';
import { getToken } from './token.js';

const TOKEN = getToken();
const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';

export const Parametrizacion = async (req: Request, res: Response) => {
  try {
    const idAdmision = req.body.idAdmision || req.query.idAdmision;
    const idsProcedimientos = req.body.idsProcedimientos || req.query.idsProcedimientos;

    if (!idAdmision || !idsProcedimientos) {
      return res.status(400).json({
        error: 'Faltan parámetros obligatorios',
        requerido: { idAdmision: 'string', idsProcedimientos: 'string (ej: "9096" o "9096,9097")' }
      });
    }

    const ids = Array.isArray(idsProcedimientos)
      ? idsProcedimientos.join(',')
      : String(idsProcedimientos);

    const url = `${BASE_URL}/ParametrizacionesProcedimientos?idAdmision=${idAdmision}&idsProcedimientos=${ids}`;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://app.saludplus.co/',
      },
      timeout: 15000,
    });

    // Procesar solo los datos necesarios
    const data = response.data?.[0];

    if (!data) {
      return res.status(404).json({ error: "No existe parametrización para esta admisión y procedimiento" });
    }

    const idParametrizacion = data.id;

    const categoria = data.categoriasLaboratorios?.[0];
    const item = categoria?.itemsLaboratorios?.[0];

    if (!item) {
      return res.status(404).json({
        error: "No existen items de laboratorio para esta parametrización"
      });
    }

    return res.json({
      idParametrizacion: idParametrizacion,
      idItem: item.id,
      idResultadoLaboratorioItem: item.idResultadoItem,
      idResultadoLaboratorioProcedimiento: item.idResultadoProcedimiento
    });

  } catch (error: any) {
    console.error('Error en /parametrizacion:', error.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Error desde SaludPlus',
        detalle: error.response.data
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'No se pudo obtener la parametrización'
    });
  }
};
