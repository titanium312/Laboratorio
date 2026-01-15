"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuscarAdmision = void 0;
const axios_1 = __importDefault(require("axios"));
const URL_LAB = 'https://api.saludplus.co/api/resultadoLaboratorio/Listado';
const URL_ADM = 'https://api.saludplus.co/api/general/Admisiones';
const BuscarAdmision = async (req, res) => {
    try {
        const { documento, token } = req.body;
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
        // ───────── Función interna para llamar SaludPlus ─────────
        const consultarEndpoint = async (url, body) => {
            const response = await axios_1.default.post(url, body, {
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    Referer: 'https://app.saludplus.co/'
                },
                timeout: 15000
            });
            if (!response.data || response.data.isSuccessful !== true) {
                return [];
            }
            return response.data.result ?? [];
        };
        // ───────── 1️⃣ Buscar en resultadoLaboratorio ─────────
        const resultadosLab = await consultarEndpoint(URL_LAB, {
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
        });
        let encontrado = resultadosLab.find((r) => r.numeroAdmision?.toString() === documento.toString());
        // ───────── 2️⃣ Si no aparece, buscar en Admisiones ─────────
        if (!encontrado) {
            const resultadosAdm = await consultarEndpoint(URL_ADM, {
                filters: documento.toString(),
                properties: [
                    'numeroAdmision',
                    'nombre1Paciente',
                    'nombre2Paciente',
                    'apellido1Paciente',
                    'apellido2Paciente',
                    'admisiones',
                    'tipoBusqueda',
                    'fechaAdmision'
                ],
                filtersCustom: JSON.stringify({
                    admisiones: true,
                    idCaracteristica: 5193,
                    dateInicial: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    dateFinal: new Date().toISOString(),
                    type: 'DateFilter',
                    name: 'fechaAdmision'
                }),
                sort: 'id',
                order: 'desc',
                filterslist: '',
                filterAvoid: ''
            });
            encontrado = resultadosAdm.find((r) => r.numeroAdmision?.toString() === documento.toString());
        }
        if (!encontrado) {
            return res.json({
                success: false,
                message: 'No se encontró idAdmision en ninguno de los endpoints'
            });
        }
        return res.json({
            success: true,
            idAdmision: encontrado.idAdmision ?? encontrado.id
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
