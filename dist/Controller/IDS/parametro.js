"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchParametrizaciones = void 0;
exports.obtenerParametrizaciones = obtenerParametrizaciones;
const axios_1 = __importDefault(require("axios"));
async function obtenerParametrizaciones(idAdmision, idsProcedimientos, token) {
    if (!token) {
        throw new Error('Token de autorización requerido');
    }
    const url = 'https://api.saludplus.co/api/resultadoLaboratorio/ParametrizacionesProcedimientos';
    const params = { idAdmision, idsProcedimientos };
    const headers = { Authorization: `Bearer ${token}` };
    const response = await axios_1.default.get(url, { params, headers });
    const result = response.data?.result || [];
    return result.map((item) => ({
        idFacturasProcedimiento: item.idFacturasProcedimiento,
        idItem: item.categoriasLaboratorios?.[0]?.itemsLaboratorios?.[0]?.id || null,
        idProcedimiento: item.idProcedimiento || item.IdProcedimiento || null,
    }));
}
const fetchParametrizaciones = async (req, res) => {
    try {
        let token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            token = process.env.SALUDPLUS_TOKEN || '';
        const { idAdmision, idsProcedimientos } = req.query;
        if (!idAdmision || !idsProcedimientos) {
            return res.status(400).json({
                error: 'Faltan parámetros: idAdmision y idsProcedimientos son obligatorios',
            });
        }
        const data = await obtenerParametrizaciones(idAdmision, idsProcedimientos, token);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
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
exports.fetchParametrizaciones = fetchParametrizaciones;
