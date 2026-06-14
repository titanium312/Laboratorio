"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerCadenaCompleta = void 0;
exports.obtenerCadenaCompletaCore = obtenerCadenaCompletaCore;
const axios_1 = __importDefault(require("axios"));
const BuscarAdmision_1 = require("../Controller/BuscarAdmision");
const Procedimiento_1 = require("../Controller/Procedimiento");
const Parametros_1 = require("../Controller/Parametros");
const BASE_URL = 'https://api.saludplus.co/api/resultadoLaboratorio';
async function obtenerCadenaCompletaCore(documento, idProcedimientoObjetivo, token) {
    try {
        if (!documento?.trim()) {
            throw new Error('El campo "documento" es obligatorio');
        }
        if (!idProcedimientoObjetivo?.trim()) {
            throw new Error('El campo "idProcedimientoObjetivo" es obligatorio');
        }
        if (!token?.trim()) {
            throw new Error('El token es obligatorio');
        }
        let jsonBuscar = null;
        await (0, BuscarAdmision_1.BuscarAdmision)({ body: { documento, token } }, {
            status: () => null,
            json: (d) => (jsonBuscar = d),
            send: (d) => (jsonBuscar = d),
        });
        if (!jsonBuscar || jsonBuscar.success !== true) {
            return {
                success: false,
                message: 'Error en BuscarAdmision',
                detalle: jsonBuscar,
            };
        }
        if (!jsonBuscar.idAdmision) {
            return {
                success: true,
                documento,
                totalAdmisiones: 0,
                resultados: [],
            };
        }
        const idsAdmision = [jsonBuscar.idAdmision];
        const resultados = [];
        for (const idAdmision of idsAdmision) {
            let procedimientos = [];
            let jsonProc = null;
            try {
                await (0, Procedimiento_1.Procedimiento)({ body: { idAdmision, token } }, {
                    status: () => null,
                    json: (d) => (jsonProc = d),
                    send: (d) => (jsonProc = d),
                });
                if (jsonProc?.success === true && Array.isArray(jsonProc.data)) {
                    procedimientos = jsonProc.data;
                }
            }
            catch { }
            if (procedimientos.length === 0) {
                try {
                    const resp = await axios_1.default.get(`${BASE_URL}/GetAdmisionLaboratorio?idAdmision=${idAdmision}&isFactura=true`, {
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 15000,
                    });
                    procedimientos = resp.data?.facturaOrOrdens || [];
                }
                catch (err) {
                    resultados.push({
                        idAdmision,
                        error: 'Error API externa',
                        detalle: err.message,
                    });
                    continue;
                }
            }
            let encontrado = false;
            for (const proc of procedimientos) {
                const idProc = (proc.idProcedimiento ?? proc.idProc)?.toString();
                if (idProc !== idProcedimientoObjetivo)
                    continue;
                encontrado = true;
                let jsonParam = null;
                try {
                    await (0, Parametros_1.Parametrizacion)({
                        body: {
                            idAdmision: idAdmision.toString(),
                            idsProcedimientos: idProcedimientoObjetivo,
                            token,
                        },
                    }, {
                        status: () => null,
                        json: (d) => (jsonParam = d),
                        send: (d) => (jsonParam = d),
                    });
                }
                catch (err) {
                    resultados.push({
                        idAdmision,
                        idProcedimiento: idProc,
                        error: 'Error en Parametrizacion',
                        detalle: err.message,
                    });
                    continue;
                }
                resultados.push({
                    idAdmision,
                    idProcedimiento: idProc,
                    idFactura: proc.id ?? proc.idFactura ?? null,
                    ...jsonParam,
                });
            }
            if (!encontrado) {
                resultados.push({
                    idAdmision,
                    nota: `Procedimiento ${idProcedimientoObjetivo} no encontrado`,
                });
            }
        }
        return {
            success: true,
            documento,
            idProcedimientoBuscado: idProcedimientoObjetivo,
            totalAdmisiones: idsAdmision.length,
            resultados,
        };
    }
    catch (err) {
        return {
            success: false,
            error: 'Error interno en obtenerCadenaCompleta',
            detalle: err.message,
        };
    }
}
const obtenerCadenaCompleta = async (req, res, next) => {
    try {
        const { documento, idProcedimientoObjetivo, token } = req.body;
        if (!documento || !idProcedimientoObjetivo || !token) {
            res.status(400).json({
                success: false,
                error: 'documento, idProcedimientoObjetivo y token son obligatorios',
            });
            return;
        }
        const resultado = await obtenerCadenaCompletaCore(documento, idProcedimientoObjetivo, token);
        res.json(resultado);
        return;
    }
    catch (err) {
        next(err);
        return;
    }
};
exports.obtenerCadenaCompleta = obtenerCadenaCompleta;
exports.default = exports.obtenerCadenaCompleta;
