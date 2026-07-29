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
exports.guardarResultado = guardarResultado;
exports.obtenerResultado = obtenerResultado;
exports.actualizarResultado = actualizarResultado;
exports.eliminarResultado = eliminarResultado;
exports.listarResultados = listarResultados;
const axios_1 = __importStar(require("axios"));
const API_BASE_URL = process.env.SALUDPLUS_API_URL || 'https://api.saludplus.co';
const LOGIN_USERNAME = process.env.SALUDPLUS_USERNAME || 'rbarreto';
const LOGIN_PASSWORD = process.env.SALUDPLUS_PASSWORD || '1235239398';
const ID_USUARIO = parseInt(process.env.SALUDPLUS_ID_USUARIO || '6874', 10);
async function obtenerToken() {
    try {
        const response = await axios_1.default.post(`${API_BASE_URL}/api/auth/Login`, {
            username: LOGIN_USERNAME,
            password: LOGIN_PASSWORD,
        }, {
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
async function guardarResultado(req, res) {
    try {
        const { idAdmision, idProcedimiento, idFactura, idItem, resultado } = req.body;
        if (!idAdmision || !idProcedimiento || !idFactura || !idItem) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios: idAdmision, idProcedimiento, idFactura, idItem',
            });
        }
        const token = await obtenerToken();
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().toTimeString().slice(0, 8);
        const payload = {
            ResultadosLaboratorioProcedimientos: [
                {
                    ResultadosLaboratorioCategorias: [],
                    ResultadosLaboratorioItems: [
                        {
                            idItem: Number(idItem),
                            idResultadoLaboratorioItem: 0,
                            idResultadoLaboratorioProcedimiento: 0,
                            resultado: resultado || 'Normal',
                        },
                    ],
                    Id: 0,
                    idUsuario: ID_USUARIO,
                    fecha,
                    hora,
                    IdProcedimiento: String(idProcedimiento),
                    idFacturasProcedimiento: Number(idFactura),
                    idOrdenProcedimiento: 0,
                },
            ],
            idAdmision: Number(idAdmision),
            idResultadoLaboratorio: 0,
        };
        const response = await axios_1.default.post(`${API_BASE_URL}/api/resultadoLaboratorio/GuardarResultado`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json, text/plain, */*',
            },
        });
        return res.status(200).json({
            success: true,
            message: 'Resultado guardado exitosamente',
            data: response.data,
        });
    }
    catch (error) {
        console.error('Error en guardarResultado:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al guardar el resultado en la API externa',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function obtenerResultado(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'ID del resultado requerido' });
        }
        const token = await obtenerToken();
        const response = await axios_1.default.get(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        return res.status(200).json({
            success: true,
            data: response.data,
        });
    }
    catch (error) {
        console.error('Error en obtenerResultado:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al obtener el resultado',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function actualizarResultado(req, res) {
    try {
        const { id } = req.params;
        const { resultado } = req.body;
        if (!id || !resultado) {
            return res.status(400).json({ error: 'ID y resultado son obligatorios' });
        }
        const token = await obtenerToken();
        const existing = await axios_1.default.get(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const dataExistente = existing.data.result;
        const payload = {
            ...dataExistente,
            ResultadosLaboratorioProcedimientos: dataExistente.ResultadosLaboratorioProcedimientos.map((proc) => ({
                ...proc,
                ResultadosLaboratorioItems: proc.ResultadosLaboratorioItems.map((item) => ({
                    ...item,
                    resultado: resultado,
                })),
            })),
        };
        const response = await axios_1.default.put(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        return res.status(200).json({
            success: true,
            message: 'Resultado actualizado',
            data: response.data,
        });
    }
    catch (error) {
        console.error('Error en actualizarResultado:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al actualizar el resultado',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function eliminarResultado(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'ID del resultado requerido' });
        }
        const token = await obtenerToken();
        const response = await axios_1.default.delete(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return res.status(200).json({
            success: true,
            message: 'Resultado eliminado',
            data: response.data,
        });
    }
    catch (error) {
        console.error('Error en eliminarResultado:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al eliminar el resultado',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function listarResultados(req, res) {
    try {
        const { idAdmision, idProcedimiento } = req.query;
        const token = await obtenerToken();
        const params = new URLSearchParams();
        if (idAdmision)
            params.append('idAdmision', String(idAdmision));
        if (idProcedimiento)
            params.append('idProcedimiento', String(idProcedimiento));
        const url = `${API_BASE_URL}/api/resultadoLaboratorio?${params.toString()}`;
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        return res.status(200).json({
            success: true,
            data: response.data,
        });
    }
    catch (error) {
        console.error('Error en listarResultados:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al listar los resultados',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
