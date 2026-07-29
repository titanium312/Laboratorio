"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchParametrizaciones = void 0;
const axios_1 = __importDefault(require("axios"));
const fetchParametrizaciones = async (req, res) => {
    try {
        let token = req.headers.authorization?.replace('Bearer ', '');
        if (!token || token.trim() === '') {
            token = process.env.SALUDPLUS_TOKEN;
        }
        if (!token) {
            res.status(401).json({ error: 'Token de autorización requerido' });
            return;
        }
        const { idAdmision, idsProcedimientos } = req.query;
        if (!idAdmision || !idsProcedimientos) {
            res.status(400).json({ error: 'Faltan parámetros: idAdmision y idsProcedimientos son obligatorios' });
            return;
        }
        const url = 'https://api.saludplus.co/api/resultadoLaboratorio/ParametrizacionesProcedimientos';
        const params = {
            idAdmision: idAdmision,
            idsProcedimientos: idsProcedimientos,
        };
        const headers = {
            Authorization: `Bearer ${token}`,
        };
        const response = await axios_1.default.get(url, { params, headers });
        const result = response.data?.result || [];
        const datosExtraidos = result.map((item) => ({
            idFacturasProcedimiento: item.idFacturasProcedimiento,
            idItem: item.categoriasLaboratorios?.[0]?.itemsLaboratorios?.[0]?.id || null
        }));
        res.status(200).json({
            success: true,
            data: datosExtraidos
        });
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            const status = axiosError.response?.status || 500;
            const message = axiosError.response?.data || axiosError.message;
            res.status(status).json({ error: message });
            return;
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.fetchParametrizaciones = fetchParametrizaciones;
