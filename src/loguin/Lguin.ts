import { Request, Response } from 'express';
import axios from 'axios';

const BALANCE = 'https://balance.saludplus.co';
const API = 'https://api.saludplus.co';
const HARDCODED_C = 'wcFkBNOeMUO3EbN8I4nUXw==';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      return;
    }

    console.log(`🔐 Login: ${username}`);

    // ═══ PASO 1: Login contra api.saludplus.co ═══
    const loginResp = await axios.post(
      `${API}/api/Auth/login`,
      { username, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-SPlus-App': '1',
          'Origin': 'https://app.saludplus.co',
          'Referer': 'https://app.saludplus.co/'
        },
        timeout: 15000,
        validateStatus: (s) => s < 500
      }
    );

    const userData = loginResp.data?.result;
    if (!userData?.id) {
      res.status(401).json({ error: 'Credenciales inválidas', detalle: loginResp.data });
      return;
    }

    const apiCookies = ((loginResp.headers['set-cookie'] as string[]) || [])
      .map((c) => c.split(';')[0])
      .join('; ');

    console.log(`✅ api.saludplus.co: usuario=${userData.id}`);

    // ═══ PASO 2: Obtener JWT con token-traspaso ═══
    let apiToken = '';
    let expiresIn = 0;
    try {
      const tokenResp = await axios.post(
        `${API}/api/auth/token-traspaso`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-SPlus-App': '1',
            'Origin': 'https://app.saludplus.co',
            'Referer': 'https://app.saludplus.co/',
            'Cookie': apiCookies
          },
          timeout: 15000,
          validateStatus: (s) => s < 500
        }
      );
      apiToken = tokenResp.data?.result?.token || '';
      expiresIn = tokenResp.data?.result?.expiresIn || 0;
      console.log(`🔑 JWT obtenido (expira en ${expiresIn}s)`);
    } catch (e: any) {
      console.warn(`⚠️ token-traspaso falló: ${e.message}`);
    }

    // ═══ PASO 3: Login contra balance.saludplus.co ═══
    let sessionCookie = '';
    let pass = '';
    let usuarioId = userData.id;

    try {
      const balanceResp = await axios.get(`${BALANCE}/users/login`, {
        params: { usuario: username, pass: password },
        headers: {
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${BALANCE}/`,
          'Origin': BALANCE
        },
        timeout: 15000
      });

      const { usuario, activo, usE, tKey } = balanceResp.data || {};
      if (activo && usE && tKey) {
        usuarioId = usuario;
        const bc = (balanceResp.headers['set-cookie'] as string[]) || [];
        sessionCookie = bc.map((c) => c.split(';')[0]).find((c) => c.startsWith('ASP.NET_SessionId=')) || '';
        pass = `${tKey}.${usE}.${HARDCODED_C}`;
        console.log(`✅ balance.saludplus.co: usuario=${usuario}`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Login balance falló: ${e.message}`);
    }

    // ═══ RESPUESTA AL FRONTEND ═══
    res.json({
      success: true,
      usuarioId,
      apiCookies,
      apiToken,
      expiresIn,
      sessionCookie,
      pass,
      usuario: {
        id: userData.id,
        nombre: userData.nombre,
        usuario: userData.usuario,
        email: userData.email,
        iniciales: userData.iniciales,
        perfiles: userData.perfiles || []
      }
    });

  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error en login',
      details: error.response?.data || error.message
    });
  }
};