"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const axios_1 = __importDefault(require("axios"));
const BALANCE_URL = 'https://balance.saludplus.co';
const HARDCODED_C = 'wcFkBNOeMUO3EbN8I4nUXw==';
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
            return;
        }
        console.log(`🔐 Login para: ${username}`);
        const loginResp = await axios_1.default.get(`${BALANCE_URL}/users/login`, {
            params: { usuario: username, pass: password },
            headers: {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${BALANCE_URL}/`,
                'Origin': BALANCE_URL
            },
            timeout: 10000
        });
        const { usuario, activo, usE, tKey } = loginResp.data || {};
        if (!activo || !usE || !tKey) {
            res.status(401).json({
                error: 'Credenciales inválidas o cuenta inactiva',
                detalle: loginResp.data
            });
            return;
        }
        const setCookies = loginResp.headers['set-cookie'] || [];
        const sessionCookie = setCookies
            .map((c) => c.split(';')[0])
            .find((c) => c.startsWith('ASP.NET_SessionId='));
        if (!sessionCookie) {
            res.status(500).json({ error: 'No se obtuvo cookie de sesión' });
            return;
        }
        const pass = `${tKey}.${usE}.${HARDCODED_C}`;
        console.log(`✅ Login exitoso: usuario=${usuario}`);
        res.json({
            success: true,
            usuarioId: usuario,
            sessionCookie,
            pass
        });
    }
    catch (error) {
        console.error('❌ Error en login:', error.message);
        if (error.response) {
            res.status(error.response.status).json({
                error: 'Error al autenticar',
                details: error.response.data
            });
        }
        else if (error.request) {
            res.status(503).json({
                error: 'El servicio de SaludPlus no está disponible',
                details: error.message
            });
        }
        else {
            res.status(500).json({
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    }
};
exports.login = login;
