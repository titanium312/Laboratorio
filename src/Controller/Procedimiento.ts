// src/Controller/Procedimiento.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { getToken } from './token.js';

const TOKEN = getToken();

export const Procedimiento = async (req: Request, res: Response) => {
  try {
    const idAdmision = req.body.idAdmision || req.query.idAdmision;

    if (!idAdmision || typeof idAdmision !== 'string' || idAdmision.trim() === '') {
      return res.status(400).json({
        error: 'El campo "idAdmision" es obligatorio y debe ser una cadena válida',
      });
    }

    const url = `https://api.saludplus.co/api/resultadoLaboratorio/GetAdmisionLaboratorio?idAdmision=${idAdmision}&isFactura=true`;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://app.saludplus.co/',
      },
      timeout: 15000,
    });

    const facturaOrOrdens = response.data?.facturaOrOrdens;

    // Si no existe el campo o está vacío
    if (!facturaOrOrdens || !Array.isArray(facturaOrOrdens) || facturaOrOrdens.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron procedimientos (facturaOrOrdens vacío o no existe)',
      });
    }

    // Devolvemos SOLO el array que te interesa
    return res.json(facturaOrOrdens);

  } catch (error: any) {
    console.error('Error en /procedimiento:', error.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status || 502).json({
        error: 'Error desde SaludPlus',
        detalle: error.response.data,
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Timeout: SaludPlus no respondió a tiempo' });
    }

    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'No se pudo conectar con SaludPlus',
    });
  }
};