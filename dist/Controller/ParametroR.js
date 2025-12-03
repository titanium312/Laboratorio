"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerCadenaCompleta = void 0;
exports.obtenerCadenaCompletaCore = obtenerCadenaCompletaCore;
// src/services/obtenerCadenaCompleta.ts
const axios_1 = __importDefault(require("axios"));
const BuscarAdmision_1 = require("../Controller/BuscarAdmision");
const Procedimiento_1 = require("../Controller/Procedimiento");
const Parametros_1 = require("../Controller/Parametros");
const token_js_1 = require("../Controller/token.js");
const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';
/**
 * Lógica principal: recibe documento e idProcedimientoObjetivo y devuelve el resultado.
 * Esta función es independiente de Express (se puede llamar desde controllers o tests).
 */
async function obtenerCadenaCompletaCore(documento, idProcedimientoObjetivo) {
    try {
        if (!documento || documento.trim() === "") {
            throw new Error('El campo "documento" es obligatorio');
        }
        if (!idProcedimientoObjetivo || idProcedimientoObjetivo.trim() === "") {
            throw new Error('El campo "idProcedimientoObjetivo" es obligatorio');
        }
        let jsonResponse = null;
        const fakeReqBuscar = { body: { documento }, query: {}, params: {} };
        const fakeResBuscar = {
            status: () => fakeResBuscar,
            json: (data) => { jsonResponse = data; return data; },
            send: (data) => { jsonResponse = data; return data; }
        };
        await (0, BuscarAdmision_1.BuscarAdmision)(fakeReqBuscar, fakeResBuscar);
        if (!jsonResponse || jsonResponse.success === false) {
            return {
                success: false,
                message: "Error al obtener información desde BuscarAdmision",
                details: jsonResponse
            };
        }
        const admisiones = jsonResponse.admisiones || [];
        if (admisiones.length === 0) {
            return {
                success: true,
                message: "No se encontraron admisiones",
                total: 0,
                admisiones: [],
                resultados: []
            };
        }
        const idsAdmision = admisiones.map((a) => a.consecutivo ?? a.Idamciones ?? null);
        const resultados = [];
        const TOKEN = (0, token_js_1.getToken)();
        for (const idAdmision of idsAdmision) {
            if (!idAdmision) {
                resultados.push({ idAdmision, errors: ["idAdmision nulo o vacío"] });
                continue;
            }
            let procedimientosEncontrados = [];
            // 1. Intentar con Procedimiento (fuente interna)
            let jsonProc = null;
            const fakeReqProc = { body: { idAdmision }, query: {}, params: {} };
            const fakeResProc = {
                status: () => fakeResProc,
                json: (data) => { jsonProc = data; return data; },
                send: (data) => { jsonProc = data; return data; }
            };
            try {
                await (0, Procedimiento_1.Procedimiento)(fakeReqProc, fakeResProc);
                if (Array.isArray(jsonProc) && jsonProc.length > 0) {
                    procedimientosEncontrados = jsonProc;
                }
            }
            catch (e) { /* silencioso */ }
            // 2. Si no hubo procedimientos internos → fallback API externa
            if (procedimientosEncontrados.length === 0) {
                try {
                    const url = `${BASE_URL}/GetAdmisionLaboratorio?idAdmision=${encodeURIComponent(idAdmision)}&isFactura=true`;
                    const resp = await axios_1.default.get(url, {
                        headers: { Authorization: `Bearer ${TOKEN}` },
                        timeout: 15000
                    });
                    const facturas = resp.data?.facturaOrOrdens || [];
                    procedimientosEncontrados = facturas;
                }
                catch (err) {
                    resultados.push({
                        idAdmision,
                        errors: ["Error en API externa: " + (err?.message || String(err))]
                    });
                    continue;
                }
            }
            // 3. Procesar solo los procedimientos que coincidan con el que TÚ mandaste
            let encontradoObjetivo = false;
            for (const item of procedimientosEncontrados) {
                const idProcedimiento = (item.idProcedimiento ?? item.idProc ?? null)?.toString();
                const registro = {
                    idAdmision,
                    idFactura: item.id ?? item.idFactura ?? null,
                    idProcedimiento,
                    coincidencia: idProcedimiento === idProcedimientoObjetivo
                };
                // Solo si coincide con el procedimiento que tú indicaste
                if (idProcedimiento === idProcedimientoObjetivo) {
                    encontradoObjetivo = true;
                    // Llamar a Parametrizacion
                    let jsonParam = null;
                    const fakeReqParam = {
                        body: {
                            idAdmision: idAdmision.toString(),
                            idsProcedimientos: idProcedimientoObjetivo // solo el que tú quieres
                        },
                        query: {}, params: {}
                    };
                    const fakeResParam = {
                        status: () => fakeResParam,
                        json: (d) => { jsonParam = d; return d; },
                        send: (d) => { jsonParam = d; return d; }
                    };
                    try {
                        await (0, Parametros_1.Parametrizacion)(fakeReqParam, fakeResParam);
                        if (jsonParam && jsonParam.success !== false) {
                            registro.idParametrizacion = jsonParam.idParametrizacion ?? jsonParam.id ?? null;
                            registro.idItem = jsonParam.idItem ?? null;
                            registro.idResultadoLaboratorioItem = jsonParam.idResultadoLaboratorioItem ?? null;
                            registro.idResultadoLaboratorioProcedimiento = jsonParam.idResultadoLaboratorioProcedimiento ?? null;
                        }
                        else {
                            registro.errors = ["Parametrizacion devolvió vacío o error"];
                        }
                    }
                    catch (err) {
                        registro.errors = ["Error en Parametrizacion: " + (err?.message || String(err))];
                    }
                }
                else {
                    registro.nota = "Procedimiento diferente al solicitado → parametrización omitida";
                }
                resultados.push(registro);
            }
            // Si en toda la admisión no se encontró el procedimiento objetivo
            if (!encontradoObjetivo && procedimientosEncontrados.length > 0) {
                resultados.push({
                    idAdmision,
                    nota: `Procedimiento ${idProcedimientoObjetivo} no encontrado en esta admisión`
                });
            }
        }
        return {
            success: true,
            documento,
            idProcedimientoBuscado: idProcedimientoObjetivo,
            totalAdmisiones: admisiones.length,
            resultados,
            message: "Búsqueda completada solo para el procedimiento indicado"
        };
    }
    catch (err) {
        return {
            success: false,
            message: "Error interno en obtenerCadenaCompleta",
            details: err?.message ?? String(err)
        };
    }
}
/**
 * Handler Express: mantiene tu router intacto (router.get('/BuscarAdmision', obtenerCadenaCompleta))
 * Extrae `documento` e `idProcedimientoObjetivo` desde req.query o req.body y responde JSON.
 */
const obtenerCadenaCompleta = async (req, res, next) => {
    try {
        const documento = (req.query.documento ?? req.body?.documento);
        const idProcedimientoObjetivo = (req.query.idProcedimientoObjetivo ?? req.body?.idProcedimientoObjetivo);
        if (!documento) {
            return res.status(400).json({ success: false, message: 'Falta el parámetro "documento"' });
        }
        if (!idProcedimientoObjetivo) {
            return res.status(400).json({ success: false, message: 'Falta el parámetro "idProcedimientoObjetivo"' });
        }
        const resultado = await obtenerCadenaCompletaCore(documento, idProcedimientoObjetivo);
        return res.json(resultado);
    }
    catch (err) {
        // si ocurre un error no manejado, lo pasamos a next para que tu middleware de errores lo procese
        next(err);
    }
};
exports.obtenerCadenaCompleta = obtenerCadenaCompleta;
exports.default = exports.obtenerCadenaCompleta;
