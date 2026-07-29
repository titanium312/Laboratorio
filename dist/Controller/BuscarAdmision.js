"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarAdmisionPorNumero = buscarAdmisionPorNumero;
const axios_1 = __importStar(require("axios"));
const API_BASE_URL = process.env.SALUDPLUS_API_URL || 'https://api.saludplus.co';
const LOGIN_USERNAME = process.env.SALUDPLUS_USERNAME || 'rbarreto';
const LOGIN_PASSWORD = process.env.SALUDPLUS_PASSWORD || '1235239398';
async function obtenerToken() {
    try {
        const response = await axios_1.default.post(`${API_BASE_URL}/api/auth/Login`, { username: LOGIN_USERNAME, password: LOGIN_PASSWORD }, {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        const data = response.data;
        if (!data.isSuccessful || !data.result?.token) {
            throw new Error(data.errorMessage || 'No se pudo obtener el token');
        }
        return data.result.token;
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            console.error('Error al obtener token:', error.response?.data || error.message);
            throw new Error('Fallo la autenticación con la API externa');
        }
        throw error;
    }
}
async function buscarAdmisionPorNumero(req, res) {
    try {
        const { numero } = req.query;
        if (!numero || typeof numero !== 'string') {
            return res.status(400).json({
                error: 'Debe proporcionar el parámetro "numero" en la query (ej. ?numero=799985)',
            });
        }
        const token = await obtenerToken();
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
            return res.status(404).json({
                success: false,
                message: `No se encontró ninguna admisión con número ${numero}`,
            });
        }
        const encontrado = data.result.find((item) => item.numeroAdmision === numero);
        if (!encontrado) {
            return res.status(404).json({
                success: false,
                message: `No se encontró una admisión con número exacto ${numero}`,
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                idAdmision: encontrado.idAdmision,
            },
        });
    }
    catch (error) {
        console.error('Error en buscarAdmisionPorNumero:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al consultar la API externa',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
