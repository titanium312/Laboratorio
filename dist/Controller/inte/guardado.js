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
exports.guardarResultadoLogic = guardarResultadoLogic;
exports.guardarResultado = guardarResultado;
exports.obtenerResultado = obtenerResultado;
exports.actualizarResultado = actualizarResultado;
exports.eliminarResultado = eliminarResultado;
exports.listarResultados = listarResultados;
const axios_1 = __importStar(require("axios"));
const API_BASE_URL = 'https://api.saludplus.co';
const IDS_FIJOS_CURVA = [7605, 8052, 7604, 8051, 9182, 7603];
async function obtenerParametrizacionCompleta(idAdmision, idProcedimiento, idFactura, token) {
    try {
        const url = `${API_BASE_URL}/api/resultadoLaboratorio/ParametrizacionesProcedimientos`;
        const params = {
            idAdmision: String(idAdmision),
            idsProcedimientos: String(idProcedimiento),
        };
        const response = await axios_1.default.get(url, {
            params,
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data;
        if (data?.result?.length > 0) {
            const encontrado = data.result.find((item) => item.idFacturasProcedimiento === idFactura);
            return encontrado || data.result[0];
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
async function guardarResultadoLogic(params) {
    const { idAdmision, idProcedimiento, idFactura, idItem, idUsuario, token, resultados, } = params;
    if (!idAdmision || !idProcedimiento || !idFactura || !idUsuario) {
        throw new Error('Faltan campos obligatorios: idAdmision, idProcedimiento, idFactura, idUsuario');
    }
    if (!token) {
        throw new Error('Token de autorización requerido');
    }
    const resultadosArray = resultados.filter(r => r && r.trim() !== '');
    if (resultadosArray.length === 0) {
        throw new Error('Los resultados no pueden estar vacíos');
    }
    const parametrizacion = await obtenerParametrizacionCompleta(idAdmision, idProcedimiento, idFactura, token);
    if (!parametrizacion) {
        throw new Error('No se encontró la parametrización para el procedimiento');
    }
    const idCore = parametrizacion.id || 0;
    const idResultadoLaboratorioCore = parametrizacion.idResultadoLaboratorio || 0;
    const idOrdenProcedimiento = parametrizacion.idOrdenProcedimiento || 0;
    const categorias = parametrizacion.categoriasLaboratorios || [];
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().slice(0, 8);
    const idUsuarioFinal = Number(idUsuario);
    let items = [];
    let idResultadoLaboratorioFinal = idResultadoLaboratorioCore;
    if (idProcedimiento === 9087) {
        if (resultadosArray.length !== 3) {
            throw new Error('El examen 9087 requiere exactamente 3 resultados');
        }
        const baseId = Number(idItem);
        if (!baseId) {
            throw new Error('Se requiere idItem base para el examen 9087');
        }
        items = resultadosArray.map((texto, index) => ({
            idItem: baseId + index,
            idResultadoLaboratorioItem: 0,
            idResultadoLaboratorioProcedimiento: 0,
            resultado: texto,
        }));
        idResultadoLaboratorioFinal = 0;
    }
    else if (idProcedimiento === 9121) {
        if (resultadosArray.length !== 2) {
            throw new Error('El examen 9121 requiere exactamente 2 resultados');
        }
        const baseId = Number(idItem);
        if (!baseId) {
            throw new Error('Se requiere idItem base para el examen 9121');
        }
        items = resultadosArray.map((texto, index) => ({
            idItem: baseId + index,
            idResultadoLaboratorioItem: 0,
            idResultadoLaboratorioProcedimiento: 0,
            resultado: texto,
        }));
        idResultadoLaboratorioFinal = idResultadoLaboratorioCore;
    }
    else if (idProcedimiento === 9122) {
        if (resultadosArray.length !== 6) {
            throw new Error('El examen 9122 requiere exactamente 6 resultados');
        }
        items = resultadosArray.map((texto, index) => ({
            idItem: IDS_FIJOS_CURVA[index],
            idResultadoLaboratorioItem: 0,
            idResultadoLaboratorioProcedimiento: 0,
            resultado: texto,
        }));
        idResultadoLaboratorioFinal = 0;
    }
    else {
        if (resultadosArray.length !== 1) {
            throw new Error('Para exámenes simples debe enviar exactamente 1 resultado');
        }
        items = [{
                idItem: Number(idItem) || 0,
                idResultadoLaboratorioItem: 0,
                idResultadoLaboratorioProcedimiento: 0,
                resultado: resultadosArray[0],
            }];
        idResultadoLaboratorioFinal = idResultadoLaboratorioCore;
    }
    const payload = {
        ResultadosLaboratorioProcedimientos: [{
                ResultadosLaboratorioCategorias: categorias,
                ResultadosLaboratorioItems: items,
                Id: idCore,
                idUsuario: idUsuarioFinal,
                fecha: fecha,
                hora: hora,
                IdProcedimiento: String(idProcedimiento),
                idFacturasProcedimiento: Number(idFactura),
                idOrdenProcedimiento: idOrdenProcedimiento,
            }],
        idAdmision: Number(idAdmision),
        idResultadoLaboratorio: idResultadoLaboratorioFinal,
    };
    const response = await axios_1.default.post(`${API_BASE_URL}/api/resultadoLaboratorio/GuardarResultado`, payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
        },
    });
    return response.data;
}
async function guardarResultado(req, res) {
    try {
        const { idAdmision, idProcedimiento, idFactura, idItem, idUsuario, resultado, resultados, token, } = req.body;
        if (!idUsuario) {
            return res.status(400).json({ error: 'idUsuario es obligatorio' });
        }
        let resultadosArray;
        if (resultados && Array.isArray(resultados)) {
            resultadosArray = resultados;
        }
        else if (resultado) {
            resultadosArray = [resultado];
        }
        else {
            return res.status(400).json({ error: 'Debe enviar "resultado" o "resultados"' });
        }
        const data = await guardarResultadoLogic({
            idAdmision: Number(idAdmision),
            idProcedimiento: Number(idProcedimiento),
            idFactura: Number(idFactura),
            idItem: Number(idItem),
            idUsuario: Number(idUsuario),
            token,
            resultados: resultadosArray,
        });
        return res.status(200).json({
            success: true,
            message: 'Resultado guardado exitosamente',
            data,
        });
    }
    catch (error) {
        console.error('Error en guardarResultado:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al guardar en API externa',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
}
async function obtenerResultado(req, res) {
    try {
        const { id } = req.params;
        const { token } = req.body;
        if (!id)
            return res.status(400).json({ error: 'ID requerido' });
        if (!token)
            return res.status(401).json({ error: 'Token requerido' });
        const response = await axios_1.default.get(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        return res.status(200).json({ success: true, data: response.data });
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al obtener el resultado',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno' });
    }
}
async function actualizarResultado(req, res) {
    try {
        const { id } = req.params;
        const { resultado, token } = req.body;
        if (!id)
            return res.status(400).json({ error: 'ID requerido' });
        if (!token)
            return res.status(401).json({ error: 'Token requerido' });
        let existing;
        try {
            existing = await axios_1.default.get(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        }
        catch {
            return res.status(404).json({ error: 'Resultado no encontrado' });
        }
        const dataExistente = existing.data.result || existing.data;
        const idProcedimiento = dataExistente.IdProcedimiento || dataExistente.idProcedimiento;
        if (idProcedimiento === 9087 || idProcedimiento === 9122) {
            return res.status(400).json({
                error: `El examen ${idProcedimiento} siempre se guarda como nuevo, use POST /guardar`,
            });
        }
        if (!resultado) {
            return res.status(400).json({ error: 'El campo "resultado" es obligatorio' });
        }
        const payload = {
            ...dataExistente,
            ResultadosLaboratorioProcedimientos: dataExistente.ResultadosLaboratorioProcedimientos.map((proc) => ({
                ...proc,
                ResultadosLaboratorioItems: proc.ResultadosLaboratorioItems.map((item) => ({
                    ...item,
                    resultado,
                })),
            })),
        };
        const response = await axios_1.default.put(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, payload, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        return res.status(200).json({ success: true, message: 'Resultado actualizado', data: response.data });
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al actualizar',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno' });
    }
}
async function eliminarResultado(req, res) {
    try {
        const { id } = req.params;
        const { token } = req.body;
        if (!id)
            return res.status(400).json({ error: 'ID requerido' });
        if (!token)
            return res.status(401).json({ error: 'Token requerido' });
        const response = await axios_1.default.delete(`${API_BASE_URL}/api/resultadoLaboratorio/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.status(200).json({ success: true, message: 'Resultado eliminado', data: response.data });
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al eliminar',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno' });
    }
}
async function listarResultados(req, res) {
    try {
        const { idAdmision, idProcedimiento, token } = req.query;
        if (!token)
            return res.status(401).json({ error: 'Token requerido' });
        const params = new URLSearchParams();
        if (idAdmision)
            params.append('IdAdmision', String(idAdmision));
        if (idProcedimiento)
            params.append('IdProcedimiento', String(idProcedimiento));
        const url = `${API_BASE_URL}/api/resultadoLaboratorio?${params.toString()}`;
        const response = await axios_1.default.get(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        return res.status(200).json({ success: true, data: response.data });
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al listar',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({ error: 'Error interno' });
    }
}
