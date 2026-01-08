"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuscarAdmision = void 0;
const axios_1 = __importDefault(require("axios"));
const URL = 'https://api.saludplus.co/api/resultadoLaboratorio/Listado?pageNumber=1&pageSize=30';
const BuscarAdmision = async (req, res) => {
    try {
        const { documento, token } = req.body;
        /* ───────── Validaciones ───────── */
        if (!documento || !documento.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: 'El campo documento es obligatorio'
            });
        }
        if (!token || !token.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: 'El token es obligatorio'
            });
        }
        /* ───────── Request a SaludPlus ───────── */
        const response = await axios_1.default.post(URL, {
            filters: documento.toString(),
            properties: [
                'nombre1Paciente',
                'nombre2Paciente',
                'apellido1Paciente',
                'apellido2Paciente',
                'fecha'
            ],
            sort: 'id',
            order: 'desc',
            filterslist: '',
            filterAvoid: '',
            filterAudit: '3'
        }, {
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Referer: 'https://app.saludplus.co/'
            },
            timeout: 15000
        });
        /* ───────── Validar respuesta ───────── */
        if (!response.data || response.data.isSuccessful !== true) {
            return res.status(400).json({
                success: false,
                message: 'Respuesta inválida desde SaludPlus',
                detalle: response.data
            });
        }
        const resultados = response.data.result ?? [];
        /* ───────── Regla CLAVE ─────────
           documento === numeroAdmision
        ─────────────────────────────── */
        const encontrado = resultados.find((r) => r.numeroAdmision?.toString() === documento.toString());
        if (!encontrado) {
            return res.json({
                success: false,
                message: 'El documento no coincide con numeroAdmision'
            });
        }
        /* ───────── SOLO lo que necesitas ───────── */
        return res.json({
            success: true,
            idAdmision: encontrado.idAdmision
        });
    }
    catch (error) {
        console.error('❌ Error en BuscarAdmision:', error.response?.data || error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: 'Error desde SaludPlus',
                detalle: error.response.data
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};
exports.BuscarAdmision = BuscarAdmision;
exports.default = exports.BuscarAdmision;
