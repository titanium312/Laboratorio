"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automata = automata;
const BuscarAdmision_1 = require("./IDS/BuscarAdmision");
const parametro_1 = require("./IDS/parametro");
const guardado_1 = require("./inte/guardado");
const axios_1 = require("axios");
async function automata(req, res) {
    try {
        const { numero, idsProcedimientos, idUsuario, resultados, resultado, } = req.body;
        if (!numero) {
            return res.status(400).json({
                error: 'Debe proporcionar "numero" en el body',
            });
        }
        if (!idsProcedimientos) {
            return res.status(400).json({
                error: 'Debe proporcionar "idsProcedimientos" en el body',
            });
        }
        if (!idUsuario) {
            return res.status(400).json({
                error: 'Debe proporcionar "idUsuario" en el body',
            });
        }
        let token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token de autorización requerido en el header' });
        }
        let resultadosArray = [];
        if (resultados && Array.isArray(resultados)) {
            resultadosArray = resultados;
        }
        else if (resultado) {
            resultadosArray = [String(resultado)];
        }
        else {
            return res.status(400).json({
                error: 'Debe proporcionar "resultados" (array) o "resultado" (string) en el body',
            });
        }
        resultadosArray = resultadosArray.filter(r => r && r.trim() !== '');
        if (resultadosArray.length === 0) {
            return res.status(400).json({ error: 'Los resultados no pueden estar vacíos' });
        }
        const idAdmision = await (0, BuscarAdmision_1.buscarAdmisionPorNumero)(String(numero), token);
        if (!idAdmision) {
            return res.status(404).json({
                success: false,
                message: `No se encontró ninguna admisión con número ${numero}`,
            });
        }
        const parametrizaciones = await (0, parametro_1.obtenerParametrizaciones)(String(idAdmision), String(idsProcedimientos), token);
        if (parametrizaciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron parametrizaciones para los procedimientos indicados',
            });
        }
        const guardados = [];
        const errores = [];
        for (const param of parametrizaciones) {
            try {
                const idProcedimientoNum = Number(param.idProcedimiento);
                if (idProcedimientoNum === 9087 && resultadosArray.length !== 3) {
                    throw new Error(`El examen 9087 requiere exactamente 3 resultados, pero se recibieron ${resultadosArray.length}`);
                }
                if (idProcedimientoNum === 9121 && resultadosArray.length !== 2) {
                    throw new Error(`El examen 9121 requiere exactamente 2 resultados, pero se recibieron ${resultadosArray.length}`);
                }
                if (idProcedimientoNum === 9122 && resultadosArray.length !== 6) {
                    throw new Error(`El examen 9122 requiere exactamente 6 resultados, pero se recibieron ${resultadosArray.length}`);
                }
                const resultadosParaEnviar = (idProcedimientoNum === 9087 || idProcedimientoNum === 9121 || idProcedimientoNum === 9122)
                    ? resultadosArray
                    : [resultadosArray[0]];
                const response = await (0, guardado_1.guardarResultadoLogic)({
                    idAdmision,
                    idProcedimiento: idProcedimientoNum,
                    idFactura: param.idFacturasProcedimiento,
                    idItem: param.idItem,
                    idUsuario: Number(idUsuario),
                    token,
                    resultados: resultadosParaEnviar,
                });
                guardados.push({
                    idFactura: param.idFacturasProcedimiento,
                    idItem: param.idItem,
                    idProcedimiento: param.idProcedimiento,
                    success: true,
                    data: response,
                });
            }
            catch (error) {
                errores.push({
                    idFactura: param.idFacturasProcedimiento,
                    idItem: param.idItem,
                    idProcedimiento: param.idProcedimiento,
                    error: error instanceof Error ? error.message : 'Error desconocido',
                });
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                idAdmision,
                parametrizaciones,
                guardados: {
                    exitosos: guardados,
                    errores,
                    total: parametrizaciones.length,
                    guardados: guardados.length,
                    fallidos: errores.length,
                },
            },
        });
    }
    catch (error) {
        console.error('Error en automata:', error);
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
