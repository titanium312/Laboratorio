"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArmarJsonController = void 0;
const axios_1 = __importDefault(require("axios"));
const obtenerCadenaCompletaCore_1 = require("../obtenerCadenaCompletaCore");
const ListaItem_1 = require("./ListaItem");
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
const EXAMENES_ID_A_NOMBRE = (() => {
    const map = {};
    for (const nombre of Object.keys(ListaItem_1.EXAMENES)) {
        const id = String(ListaItem_1.EXAMENES[nombre]);
        if (!map[id])
            map[id] = nombre;
    }
    return map;
})();
function getAliasesForId(id) {
    const idStr = String(id);
    return Object.entries(ListaItem_1.EXAMENES)
        .filter(([, v]) => String(v) === idStr)
        .map(([k]) => k);
}
function mapToSaludPlusFormat(jsonFinal) {
    return {
        idResultadoLaboratorio: Number(jsonFinal.idResultadoLaboratorio) || 0,
        idAdmision: Number(jsonFinal.idAdmision) || 0,
        idOrden: jsonFinal.ResultadosLaboratorioProcedimientos[0]?.idOrden || 0,
        resultadosLaboratorioProcedimientos: jsonFinal.ResultadosLaboratorioProcedimientos.map((proc) => ({
            id: proc.Id || 0,
            idResultadoLaboratorio: Number(jsonFinal.idResultadoLaboratorio) || 0,
            idOrden: proc.idOrden || 0,
            idFactura: proc.idFactura || 0,
            idProcedimiento: String(proc.IdProcedimiento || proc.IdProcedimiento || ''),
            idUsuario: Number(proc.idUsuario) || 0,
            fecha: proc.fecha,
            hora: proc.hora,
            resultadosLaboratorioCategorias: proc.ResultadosLaboratorioCategorias?.map((cat) => ({
                id: cat.id || 0,
                idCategoria: cat.idCategoria || 0,
                idResultadoLaboratorioProcedimiento: cat.idResultadoLaboratorioProcedimiento || 0,
                resultado: cat.resultado || ''
            })) || [],
            resultadosLaboratorioItems: proc.ResultadosLaboratorioItems?.map((item) => ({
                idResultadoLaboratorioItem: item.idResultadoLaboratorioItem || 0,
                idItem: item.idItem || 0,
                idResultadoLaboratorioProcedimiento: item.idResultadoLaboratorioProcedimiento || 0,
                resultado: item.resultado || ''
            })) || []
        }))
    };
}
function obtenerToken(req) {
    const tokenFromQuery = req.query?.token ?? undefined;
    const tokenFromHeader = req.headers['x-api-token'] ?? undefined;
    const tokenFromAuthHeader = (() => {
        const h = req.headers['authorization'] ?? '';
        if (h.toLowerCase().startsWith('bearer '))
            return h.slice(7).trim();
        return undefined;
    })();
    return tokenFromQuery || tokenFromHeader || tokenFromAuthHeader || process.env.SALUDPLUS_TOKEN;
}
const ArmarJsonController = async (req, res) => {
    try {
        const documento = (req.query.documento || req.body.documento)?.toString()?.trim();
        const idProcedimientoObjetivoRaw = (req.query.idProcedimientoObjetivo || req.body.idProcedimientoObjetivo)?.toString()?.trim();
        const idUsuarioRaw = req.body?.idUsuario ?? req.query?.idUsuario;
        const idUsuario = idUsuarioRaw !== undefined ? Number(idUsuarioRaw) : NaN;
        if (!documento)
            return res.status(400).json({ success: false, message: 'El campo "documento" es obligatorio' });
        if (!idProcedimientoObjetivoRaw)
            return res.status(400).json({ success: false, message: 'El campo "idProcedimientoObjetivo" es obligatorio' });
        if (!Number.isFinite(idUsuario) || idUsuario <= 0)
            return res.status(400).json({
                success: false,
                message: 'El campo "idUsuario" es obligatorio y debe ser un número válido'
            });
        const TOKEN = obtenerToken(req);
        if (!isNonEmptyString(TOKEN)) {
            return res.status(400).json({
                success: false,
                message: 'Falta token para autenticar con SaludPlus. Pasa ?token=... o header x-api-token o Authorization: Bearer ...'
            });
        }
        const requestedRaw = String(idProcedimientoObjetivoRaw ?? '').trim();
        const lookupKey = requestedRaw.toUpperCase();
        const examIdFromList = ListaItem_1.EXAMENES[lookupKey];
        const idProcedimientoObjetivoNormalizado = examIdFromList ? String(examIdFromList) : requestedRaw;
        let nombreSolicitado = null;
        if (examIdFromList) {
            nombreSolicitado = lookupKey;
        }
        else {
            nombreSolicitado = EXAMENES_ID_A_NOMBRE[requestedRaw] ?? null;
        }
        if (!examIdFromList && !/^[0-9]+$/.test(requestedRaw)) {
            const allowed = Object.entries(ListaItem_1.EXAMENES).slice(0, 50).map(([k, v]) => ({ nombre: k, id: v }));
            return res.status(400).json({
                success: false,
                message: 'IdProcedimientoObjetivo no reconocido. Envíalo como id numérico o uno de los alias permitidos (ejemplos):',
                ejemplos: allowed
            });
        }
        const consulta = await (0, obtenerCadenaCompletaCore_1.obtenerCadenaCompletaCore)(documento, idProcedimientoObjetivoNormalizado, TOKEN);
        if (!consulta?.success)
            return res.status(500).json(consulta);
        const registros = consulta.resultados ?? [];
        if (!Array.isArray(registros) || registros.length === 0)
            return res.status(404).json({ success: false, message: "No hay registros parametrizados" });
        const exactMatch = registros.find(r => r.coincidencia === true);
        const match = exactMatch ?? registros[0];
        if (!match)
            return res.status(404).json({
                success: false,
                message: `No se encontró el idProcedimientoObjetivo ${idProcedimientoObjetivoNormalizado}`,
                consulta
            });
        const matchIdProcedimientoStr = String(match.idProcedimiento ?? '').trim();
        const requestedIdStr = String(idProcedimientoObjetivoNormalizado ?? '').trim();
        const nombreEncontrado = EXAMENES_ID_A_NOMBRE[matchIdProcedimientoStr] ?? null;
        if (requestedIdStr && matchIdProcedimientoStr !== requestedIdStr) {
            const nombreSolMostrar = nombreSolicitado ?? '(sin nombre)';
            const nombreEncMostrar = nombreEncontrado ?? '(sin nombre)';
            const mensajeCustom = `Mandaste idprocedimiento ${requestedIdStr} ${nombreSolMostrar} y se encontró idprocedimiento ${matchIdProcedimientoStr} ${nombreEncMostrar}. Revisa y comprueba que el examen sí está facturado.`;
            return res.status(400).json({
                success: false,
                message: mensajeCustom
            });
        }
        const { fecha, hora } = nowDateTimeStrings();
        let items = [];
        let resultadosArrayFromBody = undefined;
        const getResultadosArrayLimpio = () => {
            if (Array.isArray(req.body?.resultadosArray)) {
                return req.body.resultadosArray.map((x) => isNonEmptyString(x) ? x.trim() : String(x ?? '').trim());
            }
            return undefined;
        };
        const idProcedimientoStr = matchIdProcedimientoStr || idProcedimientoObjetivoNormalizado || '';
        if (idProcedimientoStr === '9087') {
            resultadosArrayFromBody = getResultadosArrayLimpio();
            if (!Array.isArray(resultadosArrayFromBody) || resultadosArrayFromBody.length !== 3 || resultadosArrayFromBody.some(r => !isNonEmptyString(r))) {
                return res.status(400).json({ success: false, message: 'Para IdProcedimiento "9087" debes enviar body.resultadosArray con 3 strings no vacíos' });
            }
            const baseIdItem = Number(match.idItem ?? 0);
            items = resultadosArrayFromBody.map((label, idx) => ({
                idItem: baseIdItem ? baseIdItem + idx : 0,
                idResultadoLaboratorioItem: 0,
                idResultadoLaboratorioProcedimiento: 0,
                resultado: label
            }));
        }
        else if (idProcedimientoStr === '9121') {
            resultadosArrayFromBody = getResultadosArrayLimpio();
            if (!Array.isArray(resultadosArrayFromBody) || resultadosArrayFromBody.length !== 2 || resultadosArrayFromBody.some(r => !isNonEmptyString(r))) {
                return res.status(400).json({ success: false, message: 'Para IdProcedimiento "9121" debes enviar body.resultadosArray con 2 strings no vacíos' });
            }
            const baseIdItem = Number(match.idItem ?? 0);
            items = resultadosArrayFromBody.map((label, idx) => ({
                idItem: baseIdItem ? baseIdItem + idx : 0,
                idResultadoLaboratorioItem: 0,
                idResultadoLaboratorioProcedimiento: 0,
                resultado: label
            }));
        }
        else if (idProcedimientoStr === '9122') {
            const FIXED_ID_ITEMS = [7605, 8052, 7604, 8051, 9182, 7603];
            resultadosArrayFromBody = getResultadosArrayLimpio();
            if (!Array.isArray(resultadosArrayFromBody) || resultadosArrayFromBody.length !== FIXED_ID_ITEMS.length || resultadosArrayFromBody.some(r => !isNonEmptyString(r))) {
                return res.status(400).json({ success: false, message: `Para IdProcedimiento "9122" debes enviar body.resultadosArray con ${FIXED_ID_ITEMS.length} strings no vacíos (en el orden de la plantilla de curva)` });
            }
            items = FIXED_ID_ITEMS.map((fixedId, idx) => ({
                idItem: fixedId,
                idResultadoLaboratorioItem: 0,
                idResultadoLaboratorioProcedimiento: 0,
                resultado: resultadosArrayFromBody[idx]
            }));
        }
        else {
            if (!isNonEmptyString(req.body?.resultado)) {
                return res.status(400).json({ success: false, message: 'Para este procedimiento debes enviar body.resultado' });
            }
            items = [{
                    idItem: match.idItem ?? 0,
                    idResultadoLaboratorioItem: match.idResultadoLaboratorioItem ?? 0,
                    idResultadoLaboratorioProcedimiento: match.idResultadoLaboratorioProcedimiento ?? 0,
                    resultado: String(req.body.resultado).trim()
                }];
        }
        const esPlantillaCurva9122 = idProcedimientoStr === '9122';
        const esBilirrubina9087 = idProcedimientoStr === '9087';
        const jsonFinal = {
            ResultadosLaboratorioProcedimientos: [{
                    ResultadosLaboratorioCategorias: [],
                    ResultadosLaboratorioItems: items,
                    Id: match.idParametrizacion ?? match.id ?? 0,
                    idUsuario: Number.isFinite(Number(req.body?.idUsuario ?? idUsuario)) ? Number(req.body?.idUsuario ?? idUsuario) : null,
                    fecha,
                    hora,
                    IdProcedimiento: idProcedimientoStr,
                    idFactura: match.idFactura ?? 0,
                    idOrden: match.idOrden ?? 0
                }],
            idAdmision: match.idAdmision ?? null,
            idResultadoLaboratorio: (esPlantillaCurva9122 || esBilirrubina9087) ? 0 : (Number(match.idResultadoLaboratorioProcedimiento ?? match.idResultadoLaboratorio ?? 0) || 0)
        };
        const payloadSaludPlus = mapToSaludPlusFormat(jsonFinal);
        const resp = await axios_1.default.post('https://api.saludplus.co/api/resultadoLaboratorio', payloadSaludPlus, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`,
                'accept': 'application/json'
            }
        });
        const responsePayload = {
            success: true,
            mensaje: 'Resultado enviado a SaludPlus correctamente',
            solicitado: {
                id: requestedRaw,
                nombre: nombreSolicitado,
                aliases: getAliasesForId(requestedRaw)
            },
            encontrado: {
                id: matchIdProcedimientoStr,
                nombre: nombreEncontrado,
                aliases: getAliasesForId(matchIdProcedimientoStr)
            },
            jsonInterno: jsonFinal,
            payloadSaludPlus,
            respuestaSaludPlus: resp.data
        };
        return res.json(responsePayload);
    }
    catch (err) {
        console.error('Error en ArmarJsonController:', err?.response?.data || err?.message || err);
        return res.status(500).json({
            success: false,
            message: 'Error interno',
            error: err?.response?.data || err?.message
        });
    }
};
exports.ArmarJsonController = ArmarJsonController;
exports.default = exports.ArmarJsonController;
