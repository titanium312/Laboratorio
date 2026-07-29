import axios, { AxiosError } from 'axios';

// Interfaz para los items de parametrización
export interface Parametrizacion {
  idFacturasProcedimiento: number;
  idItem: number;
  idProcedimiento: number; // ahora incluimos el procedimiento
}

// Función lógica pura – devuelve array de parametrizaciones
export async function obtenerParametrizaciones(
  idAdmision: string,
  idsProcedimientos: string, // puede ser "123" o "123,456"
  token: string
): Promise<Parametrizacion[]> {
  if (!token) {
    throw new Error('Token de autorización requerido');
  }

  const url = 'https://api.saludplus.co/api/resultadoLaboratorio/ParametrizacionesProcedimientos';
  const params = { idAdmision, idsProcedimientos };
  const headers = { Authorization: `Bearer ${token}` };

  const response = await axios.get(url, { params, headers });
  const result = response.data?.result || [];

  return result.map((item: any) => ({
    idFacturasProcedimiento: item.idFacturasProcedimiento,
    idItem: item.categoriasLaboratorios?.[0]?.itemsLaboratorios?.[0]?.id || null,
    idProcedimiento: item.idProcedimiento || item.IdProcedimiento || null, // extraemos el procedimiento
  }));
}

// Controlador para Express (opcional)
export const fetchParametrizaciones = async (req: any, res: any) => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) token = process.env.SALUDPLUS_TOKEN || '';

    const { idAdmision, idsProcedimientos } = req.query;
    if (!idAdmision || !idsProcedimientos) {
      return res.status(400).json({
        error: 'Faltan parámetros: idAdmision y idsProcedimientos son obligatorios',
      });
    }

    const data = await obtenerParametrizaciones(
      idAdmision as string,
      idsProcedimientos as string,
      token
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data || error.message;
      return res.status(status).json({ error: message });
    }
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};