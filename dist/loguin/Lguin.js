"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarResultados = exports.login = void 0;
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.saludplus.co';
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({
                error: 'Usuario y contraseña son requeridos'
            });
            return;
        }
        console.log(`🔐 Intentando login para: ${username}`);
        const response = await axios_1.default.post(`${API_BASE_URL}/api/auth/Login`, { username, password }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        console.log(`✅ Login exitoso para: ${username}`);
        res.json(response.data);
        return;
    }
    catch (error) {
        console.error('❌ Error en login:', error.message);
        if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data?.errorMessage || error.response.data?.message || 'Error en autenticación',
                details: error.response.data
            });
        }
        else if (error.request) {
            res.status(503).json({
                error: 'El servicio de autenticación no está disponible',
                details: error.message
            });
        }
        else {
            res.status(500).json({
                error: 'Error interno del servidor',
                details: error.message
            });
        }
        return;
    }
};
exports.login = login;
const enviarResultados = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Token de autenticación requerido'
            });
            return;
        }
        const token = authHeader.substring(7);
        const payload = req.body;
        console.log(`📤 Enviando resultados para paciente: ${payload.numero}`);
        const response = await axios_1.default.post(`${API_BASE_URL}/-rb-/automata`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            timeout: 15000
        });
        console.log(`✅ Resultados enviados para: ${payload.numero}`);
        res.json(response.data);
        return;
    }
    catch (error) {
        console.error('❌ Error enviando resultados:', error.message);
        if (error.response) {
            res.status(error.response.status).json({
                success: false,
                message: error.response.data?.message || error.response.data?.error || 'Error en el servidor',
                details: error.response.data
            });
        }
        else if (error.request) {
            res.status(503).json({
                success: false,
                message: 'El servicio no está disponible',
                details: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                details: error.message
            });
        }
        return;
    }
};
exports.enviarResultados = enviarResultados;
