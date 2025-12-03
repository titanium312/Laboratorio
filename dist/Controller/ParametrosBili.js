"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParametrizacionBili = void 0;
const axios_1 = __importDefault(require("axios"));
const token_js_1 = require("./token.js");
const TOKEN = (0, token_js_1.getToken)();
const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';
const ParametrizacionBili = async (req, res) => {
    try {
        const idAdmision = req.body.idAdmision || req.query.idAdmision;
        const idsProcedimientos = req.body.idsProcedimientos || req.query.idsProcedimientos;
        if (!idAdmision || !idsProcedimientos) {
            return res.status(400).json({
                error: 'Faltan parámetros obligatorios',
                requerido: { idAdmision: 'string', idsProcedimientos: 'string (ej: "9096" o "9096,9097")' }
            });
        }
        const ids = Array.isArray(idsProcedimientos)
            ? idsProcedimientos.join(',')
            : String(idsProcedimientos);
        const url = `${BASE_URL}/ParametrizacionesProcedimientos?idAdmision=${idAdmision}&idsProcedimientos=${ids}`;
        const response = await axios_1.default.get(url, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://app.saludplus.co/',
            },
            timeout: 15000,
        });
        // JSON completo de SaludPlus
        const fullData = response.data;
        if (!Array.isArray(fullData) || fullData.length === 0) {
            return res.status(404).json({ error: "No existe parametrización para esta admisión y procedimiento" });
        }
        const data = fullData[0];
        const categoria = data.categoriasLaboratorios?.[0];
        const item = categoria?.itemsLaboratorios?.[0];
        if (!item) {
            return res.status(404).json({
                error: "No existen items de laboratorio para esta parametrización",
                fullData
            });
        }
        // Respuesta enviando todo
        return res.json({
            procesado: {
                idParametrizacion: data.id,
                idItem: item.id,
                idResultadoLaboratorioItem: item.idResultadoItem,
                idResultadoLaboratorioProcedimiento: item.idResultadoProcedimiento
            },
            fullData
        });
    }
    catch (error) {
        console.error('Error en /parametrizacion:', error.response?.data || error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Error desde SaludPlus',
                detalle: error.response.data
            });
        }
        res.status(500).json({
            error: 'Error interno del servidor',
            mensaje: 'No se pudo obtener la parametrización'
        });
    }
};
exports.ParametrizacionBili = ParametrizacionBili;
