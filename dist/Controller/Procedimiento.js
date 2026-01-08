"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Procedimiento = void 0;
const axios_1 = __importDefault(require("axios"));
const Procedimiento = async (req, res) => {
    try {
        const idAdmision = req.body.idAdmision || req.query.idAdmision;
        const token = req.body.token || req.query.token; // 🔥 TOKEN POR BODY
        // ───── Validaciones ─────
        if (!idAdmision || typeof idAdmision !== 'string' || idAdmision.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El campo "idAdmision" es obligatorio y debe ser una cadena válida',
            });
        }
        if (!token || typeof token !== 'string' || token.trim() === '') {
            return res.status(401).json({
                success: false,
                error: 'El token es obligatorio',
            });
        }
        const url = `https://api.saludplus.co/api/resultadoLaboratorio/GetAdmisionLaboratorio?idAdmision=${idAdmision}&isFactura=true`;
        // ───── Llamada a SaludPlus ─────
        const response = await axios_1.default.get(url, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`, // ✅ TOKEN DINÁMICO
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://app.saludplus.co/',
            },
            timeout: 15000,
        });
        const facturaOrOrdens = response.data?.facturaOrOrdens;
        // ───── Validación de respuesta ─────
        if (!facturaOrOrdens || !Array.isArray(facturaOrOrdens) || facturaOrOrdens.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron procedimientos (facturaOrOrdens vacío o no existe)',
            });
        }
        // ───── Respuesta limpia ─────
        return res.json({
            success: true,
            data: facturaOrOrdens
        });
    }
    catch (error) {
        console.error('Error en /procedimiento:', error.response?.data || error.message);
        if (error.response) {
            return res.status(error.response.status || 502).json({
                success: false,
                error: 'Error desde SaludPlus',
                detalle: error.response.data,
            });
        }
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                success: false,
                error: 'Timeout: SaludPlus no respondió a tiempo'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            mensaje: 'No se pudo conectar con SaludPlus',
        });
    }
};
exports.Procedimiento = Procedimiento;
