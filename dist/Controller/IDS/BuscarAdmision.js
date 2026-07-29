"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarAdmisionPorNumero = buscarAdmisionPorNumero;
exports.buscarAdmision = buscarAdmision;
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.SALUDPLUS_API_URL || 'https://api.saludplus.co';
async function buscarAdmisionPorNumero(numero, token) {
    if (!token)
        throw new Error('Token no proporcionado');
    const payload = {
        filters: numero,
        properties: [
            'nombre1Paciente',
            'nombre2Paciente',
            'apellido1Paciente',
            'apellido2Paciente',
            'fecha',
        ],
        sort: 'id',
        order: 'desc',
        filterslist: '',
        filterAvoid: '',
        filterAudit: '3',
    };
    const url = `${API_BASE_URL}/api/resultadoLaboratorio/Listado?pageNumber=1&pageSize=30`;
    const response = await axios_1.default.post(url, payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
        },
    });
    const data = response.data;
    if (!data.isSuccessful || !data.result || data.result.length === 0) {
        return null;
    }
    const encontrado = data.result.find((item) => item.numeroAdmision === numero);
    return encontrado ? encontrado.idAdmision : null;
}
async function buscarAdmision(req, res) {
    try {
        const numero = req.query.numero;
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!numero) {
            return res.status(400).json({ error: 'Falta el parámetro "numero"' });
        }
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const idAdmision = await buscarAdmisionPorNumero(numero, token);
        return res.json(idAdmision ? { idAdmision } : null);
    }
    catch (error) {
        console.error('Error en buscarAdmision:', error);
        return res.status(500).json({ error: error.message });
    }
}
