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
exports.obtenerIdResultadoPorNumero = obtenerIdResultadoPorNumero;
const axios_1 = __importStar(require("axios"));
const API_BASE_URL = 'https://api.saludplus.co';
const COMMON_HEADERS = {
    'X-SPlus-App': '1',
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Referer: 'https://app.saludplus.co/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
};
const IDS_POR_DEFECTO = [
    '11803',
    '9096',
    '9146',
    '9094',
    '9173',
    '9147',
    '9093',
    '9087',
    '9086',
    '9085',
    '9121',
    '9122',
];
async function buscarIdResultado(numeroAdmision, token) {
    const payload = {
        filters: String(numeroAdmision),
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
    const r = await axios_1.default.post(`${API_BASE_URL}/api/resultadoLaboratorio/Listado`, payload, {
        params: { pageNumber: '1', pageSize: '30' },
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
    });
    const items = r.data?.result || [];
    if (items.length === 0)
        return null;
    const item = items[0];
    return {
        idResultado: item.id,
        idAdmision: item.idAdmision,
        numeroAdmision: item.numeroAdmision,
    };
}
async function obtenerResultadoCompleto(idResultado, token) {
    const r = await axios_1.default.get(`${API_BASE_URL}/api/resultadoLaboratorio/ObtenerResultadoCompleto`, {
        params: { idResultado: String(idResultado) },
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
    });
    return r.data;
}
function normalizarIds(input) {
    if (input == null)
        return [];
    let arr = [];
    if (Array.isArray(input))
        arr = input;
    else if (typeof input === 'string')
        arr = input.split(',');
    else
        arr = [input];
    return arr
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0);
}
async function obtenerIdResultadoPorNumero(req, res) {
    try {
        let token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            token = process.env.SALUDPLUS_TOKEN || '';
        if (!token) {
            return res.status(401).json({ error: 'Token de autorización requerido' });
        }
        const { numeroAdmision, idProcedimientos } = req.body;
        if (!numeroAdmision) {
            return res.status(400).json({
                error: 'Debe proporcionar "numeroAdmision" en el body',
            });
        }
        const idsFiltro = normalizarIds(idProcedimientos);
        const idsFinales = idsFiltro.length > 0 ? idsFiltro : IDS_POR_DEFECTO;
        const encontrado = await buscarIdResultado(String(numeroAdmision), token);
        if (!encontrado) {
            return res.status(404).json({
                success: false,
                message: `No se encontró ninguna admisión con número ${numeroAdmision}`,
                numeroAdmision,
            });
        }
        const completo = await obtenerResultadoCompleto(encontrado.idResultado, token);
        const resultado = completo?.result;
        if (!resultado) {
            return res.status(500).json({
                success: false,
                message: 'La respuesta de SaludPlus no tiene el campo "result"',
                raw: completo,
            });
        }
        const procedimientos = resultado.resultadosLaboratoriosProcedimientos || [];
        const vistos = new Set();
        const resultados = [];
        for (const proc of procedimientos) {
            const idProc = String(proc.idProcedimiento ?? '').trim();
            if (!idsFinales.includes(idProc))
                continue;
            if (vistos.has(idProc))
                continue;
            const tieneContenido = (proc.categoriasLaboratorios || []).some((cat) => (cat.itemsLaboratorios || []).some((it) => String(it.resultado ?? '').trim() !== ''));
            if (!tieneContenido)
                continue;
            vistos.add(idProc);
            const items = [];
            for (const cat of proc.categoriasLaboratorios || []) {
                for (const it of cat.itemsLaboratorios || []) {
                    items.push({
                        nombre: it.nombre || '',
                        resultado: it.resultado || '',
                        valoresReferencia: it.valoresReferencia || '',
                    });
                }
            }
            const resultadoTexto = items
                .map((it) => `${it.nombre}: ${it.resultado}`)
                .join(' | ');
            resultados.push({
                numeroAdmision: resultado.numeroAdmision ?? encontrado.numeroAdmision,
                idAdmision: resultado.idAdmision ?? encontrado.idAdmision,
                idResultado: proc.idResultadoLaboratorio ?? encontrado.idResultado,
                idProcedimiento: proc.idProcedimiento ?? null,
                nombreProcedimiento: proc.nombreProcedimiento ?? null,
                resultado: resultadoTexto,
                items,
            });
        }
        return res.status(200).json({
            success: true,
            numeroAdmision: encontrado.numeroAdmision,
            idAdmision: encontrado.idAdmision,
            idsFiltrados: idsFinales,
            totalProcedimientosEncontrados: resultados.length,
            totalProcedimientosEnAdmision: procedimientos.length,
            resultados,
        });
    }
    catch (error) {
        console.error('Error en obtenerIdResultadoPorNumero:', error);
        if (error instanceof axios_1.AxiosError) {
            return res.status(error.response?.status || 500).json({
                error: 'Error al consultar la API externa',
                details: error.response?.data || error.message,
            });
        }
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
}
