import { Request, Response } from 'express';
import axios from 'axios';

export const Procedimiento = async (req: Request, res: Response): Promise<Response> => {
  console.log('🔵 [Procedimiento] Iniciando petición');
  console.log('📦 Body:', req.body);
  console.log('🔍 Query:', req.query);
  
  try {
    // Obtener idAdmision de múltiples fuentes y formatos
    let idAdmision = req.body.idAdmision || req.query.idAdmision;
    
    // Si no viene idAdmision, buscar otros nombres
    if (!idAdmision) {
      idAdmision = req.body.documento || req.query.documento;
    }
    
    // Si es número, convertirlo a string
    const idAdmisionStr = idAdmision ? String(idAdmision).trim() : '';
    
    const token = req.body.token || req.query.token;
    const tokenStr = token ? String(token) : '';

    console.log(`🔵 [Procedimiento] idAdmision original: ${idAdmision} (${typeof idAdmision})`);
    console.log(`🔵 [Procedimiento] idAdmision string: ${idAdmisionStr}`);
    console.log(`🔵 [Procedimiento] token presente: ${!!tokenStr}`);

    // Validación FLEXIBLE - acepta números y strings
    if (!idAdmisionStr || idAdmisionStr === '' || idAdmisionStr === 'undefined' || idAdmisionStr === 'null') {
      console.warn('⚠️ [Procedimiento] idAdmision inválido');
      return res.status(400).json({
        success: false,
        error: 'El campo "idAdmision" o "documento" es obligatorio',
        recibido: { 
          body: req.body, 
          query: req.query,
          tipoOriginal: typeof idAdmision
        }
      });
    }

    if (!tokenStr || tokenStr === '') {
      console.warn('⚠️ [Procedimiento] Token inválido');
      return res.status(401).json({
        success: false,
        error: 'El token es obligatorio',
      });
    }

    const url = `https://api.saludplus.co/api/resultadoLaboratorio/GetAdmisionLaboratorio?idAdmision=${idAdmisionStr}&isFactura=true`;
    console.log(`🔵 [Procedimiento] Llamando a: ${url.substring(0, 100)}...`);

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Authorization': `Bearer ${tokenStr}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://app.saludplus.co/',
      },
      timeout: 15000,
    });

    const facturaOrOrdens = response.data?.facturaOrOrdens;

    if (!facturaOrOrdens || !Array.isArray(facturaOrOrdens) || facturaOrOrdens.length === 0) {
      console.warn('⚠️ [Procedimiento] No se encontraron procedimientos');
      return res.status(404).json({
        success: false,
        error: 'No se encontraron procedimientos',
      });
    }

    console.log(`✅ [Procedimiento] Éxito - ${facturaOrOrdens.length} procedimientos`);
    return res.json({
      success: true,
      data: facturaOrOrdens
    });

  } catch (error: any) {
    console.error('❌ [Procedimiento] Error capturado:', error.message);
    
    // Verificar si la respuesta ya fue enviada
    if (res.headersSent) {
      console.error('❌ Headers ya enviados');
      return res;
    }
    
    if (error.response) {
      return res.status(error.response.status || 502).json({
        success: false,
        error: 'Error desde SaludPlus',
        detalle: error.response?.data || error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      mensaje: error.message
    });
  }
};