import axios from 'axios';

const API_BASE_URL = process.env.SALUDPLUS_API_URL || 'https://api.saludplus.co';

// Función pura (reutilizable) – devuelve idAdmision o null
export async function buscarAdmisionPorNumero(
  numero: string,
  token: string
): Promise<number | null> {
  if (!token) throw new Error('Token no proporcionado');

  const payload = {
    filters: numero,
    properties: [
      'nombre1Paciente',
      'nombre2Paciente',
      'apellido1Paciente',
      'apellido2Paciente',
      'fecha',
    ],
    sort: 'id',
    order: 'desc',
    filterslist: '',
    filterAvoid: '',
    filterAudit: '3',
  };

  const url = `${API_BASE_URL}/api/resultadoLaboratorio/Listado?pageNumber=1&pageSize=30`;

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
    },
  });

  const data = response.data;
  if (!data.isSuccessful || !data.result || data.result.length === 0) {
    return null;
  }

  const encontrado = data.result.find(
    (item: any) => item.numeroAdmision === numero
  );

  return encontrado ? encontrado.idAdmision : null;
}

// Controlador para Express (mantiene compatibilidad)
export async function buscarAdmision(req: any, res: any) {
  try {
    const numero = req.query.numero as string;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!numero) {
      return res.status(400).json({ error: 'Falta el parámetro "numero"' });
    }
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const idAdmision = await buscarAdmisionPorNumero(numero, token);
    return res.json(idAdmision ? { idAdmision } : null);
  } catch (error: any) {
    console.error('Error en buscarAdmision:', error);
    return res.status(500).json({ error: error.message });
  }
}