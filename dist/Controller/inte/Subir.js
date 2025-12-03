"use strict";
// src/controllers/EnviarResultadosController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vercion2 = void 0;
const axios_1 = __importDefault(require("axios"));
const vercion2 = async (req, res) => {
    try {
        const { documento, items } = req.body;
        // Validación básica
        if (!documento || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos: documento y items son obligatorios',
            });
        }
        // Construimos la URL del endpoint interno usando el mismo host y protocolo del request actual
        const protocol = req.protocol; // http o https
        const host = req.get('host'); // ej: localhost:3000 o midominio.com
        const ARMAR_JSON_URL = `${protocol}://${host}/-rb-/ArmarJson`;
        // Llamamos al endpoint interno (misma app, mismo servidor)
        const response = await axios_1.default.post(ARMAR_JSON_URL, req.body, {
            headers: {
                'Content-Type': 'application/json',
                // Opcional: pasar headers de autenticación si los hubiera
                // Authorization: req.headers.authorization,
            },
            timeout: 15000,
        });
        // Devolvemos exactamente lo que responde el endpoint original
        return res.status(response.status).json(response.data);
    }
    catch (error) {
        console.error('Error en vercion2 (proxy):', error.message);
        // Si no pudo conectar con el endpoint interno
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(503).json({
                success: false,
                message: 'Servicio interno no disponible en este momento',
            });
        }
        // Si el endpoint devolvió error (400, 500, etc.)
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        // Error desconocido
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
exports.vercion2 = vercion2;
