"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArmarJsonController = void 0;
const axios_1 = __importDefault(require("axios"));
const ParametroR_1 = require("../ParametroR");
const token_1 = require("../token");
const TOKEN = (0, token_1.getToken)();
/* ----------------------------------------------
   Helpers
---------------------------------------------- */
function nowDateTimeStrings() {
    const d = new Date();
    const pad = (n) => (n < 10 ? '0' + n : String(n));
    return {
        fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        hora: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    };
}
function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim() !== '';
}
/* ----------------------------------------------
   MAPEAR JSON INTERNO → FORMATO SALUDPLUS
---------------------------------------------- */
function mapToSaludPlusFormat(jsonFinal) {
    return {
        idResultadoLaboratorio: Number(jsonFinal.idResultadoLaboratorio) || 0,
        idAdmision: Number(jsonFinal.idAdmision) || 0,
        idOrden: jsonFinal.ResultadosLaboratorioProcedimientos[0].idOrden || 0,
        resultadosLaboratorioProcedimientos: jsonFinal.ResultadosLaboratorioProcedimientos.map((proc) => ({
            id: proc.Id || 0,
            idResultadoLaboratorio: Number(jsonFinal.idResultadoLaboratorio) || 0,
            idOrden: proc.idOrden || 0,
            idFactura: proc.idFactura || 0,
            idProcedimiento: String(proc.IdProcedimiento || ""),
            idUsuario: Number(proc.idUsuario) || 0,
            fecha: proc.fecha,
            hora: proc.hora,
            resultadosLaboratorioCategorias: proc.ResultadosLaboratorioCategorias?.map((cat) => ({
                id: cat.id || 0,
                idCategia: cat.idCategoria || 0,
                idResultadoLaboratorioProcedimiento: cat.idResultadoLaboratorioProcedimiento || 0,
                resultado: cat.resultado || ""
            })) || [],
            resultadosLaboratorioItems: proc.ResultadosLaboratorioItems.map((item) => ({
                idResultadoLaboratorioItem: item.idResultadoLaboratorioItem || 0,
                idItem: item.idItem || 0,
                idResultadoLaboratorioProcedimiento: item.idResultadoLaboratorioProcedimiento || 0,
                resultado: item.resultado || ""
            }))
        }))
    };
}
/* ----------------------------------------------
   CONTROLADOR PRINCIPAL
---------------------------------------------- */
const ArmarJsonController = async (req, res) => {
    try {
        /* --------------------------------------
           VALIDACIONES BÁSICAS
        -------------------------------------- */
        const documento = (req.query.documento || req.body.documento)?.toString()?.trim();
        const idProcedimientoObjetivo = (req.query.idProcedimientoObjetivo || req.body.idProcedimientoObjetivo)?.toString()?.trim();
        const idUsuarioRaw = req.body?.idUsuario ?? req.query?.idUsuario;
        const idUsuario = idUsuarioRaw !== undefined ? Number(idUsuarioRaw) : NaN;
        if (!documento)
            return res.status(400).json({ success: false, message: 'El campo "documento" es obligatorio' });
        if (!idProcedimientoObjetivo)
            return res.status(400).json({ success: false, message: 'El campo "idProcedimientoObjetivo" es obligatorio' });
        if (!Number.isFinite(idUsuario) || idUsuario <= 0)
            return res.status(400).json({
                success: false,
                message: 'El campo "idUsuario" es obligatorio y debe ser un número válido'
            });
        /* --------------------------------------
           OBTENER DATOS DESDE EL CORE
        -------------------------------------- */
        const consulta = await (0, ParametroR_1.obtenerCadenaCompletaCore)(documento, idProcedimientoObjetivo);
        if (!consulta?.success)
            return res.status(500).json(consulta);
        const registros = consulta.resultados ?? [];
        if (!Array.isArray(registros) || registros.length === 0)
            return res.status(404).json({ success: false, message: "No hay registros parametrizados" });
        const match = registros.find(r => r.coincidencia === true) ?? registros[0];
        if (!match)
            return res.status(404).json({
                success: false,
                message: `No se encontró el idProcedimientoObjetivo ${idProcedimientoObjetivo}`,
                consulta
            });
        const { fecha, hora } = nowDateTimeStrings();
        /* --------------------------------------
           CONSTRUIR ITEMS
        -------------------------------------- */
        let items = [];
        let resultadosArrayFromBody = undefined;
        // Caso especial: procedimiento 9087 → requiere 3 resultados
        if (String(match.idProcedimiento) === "9087") {
            if (Array.isArray(req.body?.resultadosArray)) {
                resultadosArrayFromBody = req.body.resultadosArray.map((x) => isNonEmptyString(x) ? x : String(x ?? "").trim());
            }
            if (!Array.isArray(resultadosArrayFromBody) ||
                resultadosArrayFromBody.length !== 3 ||
                resultadosArrayFromBody.some(r => !isNonEmptyString(r))) {
                return res.status(400).json({
                    success: false,
                    message: 'Para IdProcedimiento "9087" debes enviar body.resultadosArray con 3 strings no vacíos'
                });
            }
            const baseIdItem = Number(match.idItem ?? 0);
            const baseRLItem = Number(match.idResultadoLaboratorioItem ?? 0);
            const baseRLProc = Number(match.idResultadoLaboratorioProcedimiento ?? 0);
            items = resultadosArrayFromBody.map((label, idx) => ({
                idItem: baseIdItem + idx,
                idResultadoLaboratorioItem: baseRLItem + idx,
                idResultadoLaboratorioProcedimiento: baseRLProc + idx,
                resultado: label
            }));
        }
        else {
            if (!isNonEmptyString(req.body?.resultado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Para este procedimiento debes enviar body.resultado'
                });
            }
            items = [
                {
                    idItem: match.idItem ?? 0,
                    idResultadoLaboratorioItem: match.idResultadoLaboratorioItem ?? 0,
                    idResultadoLaboratorioProcedimiento: match.idResultadoLaboratorioProcedimiento ?? 0,
                    resultado: String(req.body.resultado).trim()
                }
            ];
        }
        /* --------------------------------------
           ARMAR JSON INTERNO
        -------------------------------------- */
        const jsonFinal = {
            ResultadosLaboratorioProcedimientos: [
                {
                    ResultadosLaboratorioCategorias: [],
                    ResultadosLaboratorioItems: items,
                    Id: match.idParametrizacion ?? match.id ?? 0,
                    idUsuario: idUsuario,
                    fecha: fecha,
                    hora: hora,
                    IdProcedimiento: String(match.idProcedimiento ?? idProcedimientoObjetivo),
                    idFactura: match.idFactura ?? 0,
                    idOrden: match.idOrden ?? 0
                }
            ],
            idAdmision: match.idAdmision ?? null,
            idResultadoLaboratorio: String(match.idResultadoLaboratorioProcedimiento ??
                match.idResultadoLaboratorio ??
                "")
        };
        /* --------------------------------------
           CONVERTIR → FORMATO SALUDPLUS
        -------------------------------------- */
        const payloadSaludPlus = mapToSaludPlusFormat(jsonFinal);
        /* --------------------------------------
           ENVIAR A SALUDPLUS
        -------------------------------------- */
        const resp = await axios_1.default.post("https://api.saludplus.co/api/resultadoLaboratorio", payloadSaludPlus, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            }
        });
        /* --------------------------------------
           RESPUESTA FINAL
        -------------------------------------- */
        return res.json({
            success: true,
            enviadoASaludPlus: true,
            respuestaSaludPlus: resp.data,
        });
    }
    catch (err) {
        console.error("Error en ArmarJsonController:", err?.response?.data || err?.message);
        return res.status(500).json({
            success: false,
            message: "Error interno",
            error: err?.response?.data || err.message
        });
    }
};
exports.ArmarJsonController = ArmarJsonController;
exports.default = exports.ArmarJsonController;
