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
exports.Basededato = exports.LaboratorioModel = void 0;
const express_1 = require("express");
const mongoose_1 = __importStar(require("mongoose"));
const MONGO_URI = "mongodb+srv://rbrobertobarreto_db_user:Camisamojada123456+@cluster0.3bhv3kc.mongodb.net/sample_mflix?ssl=true&authSource=admin";
if (mongoose_1.default.connection.readyState === 0) {
    mongoose_1.default
        .connect(MONGO_URI)
        .then(() => console.log("Conectado con éxito a MongoDB Atlas"))
        .catch((err) => console.error("Error al conectar a MongoDB:", err));
}
const CounterSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
}, { versionKey: false });
const CounterModel = (0, mongoose_1.model)("Counter", CounterSchema, "counters");
async function reservarIds(cantidad) {
    const c = await CounterModel.findByIdAndUpdate("laboratorio", { $inc: { seq: cantidad } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    return (c?.seq ?? cantidad) - cantidad + 1;
}
const LaboratorioSchema = new mongoose_1.Schema({
    _id: { type: Number, required: true },
    pac: { type: String, required: true },
    tip: { type: String, required: true },
    tec: { type: String, required: true },
    pru: { type: String, required: true },
    idEx: { type: String, required: true, index: true },
    c: { type: mongoose_1.Schema.Types.Mixed, required: true },
    u: { type: String, required: true },
    f: { type: Date, default: Date.now },
    e: { type: String, default: "PENDIENTE" },
}, { versionKey: false, _id: false });
LaboratorioSchema.index({ pac: 1, idEx: 1 });
LaboratorioSchema.index({ e: 1 });
const virtualMap = [
    ["paciente", "pac"],
    ["tipo", "tip"],
    ["tecnica", "tec"],
    ["prueba", "pru"],
    ["idExamen", "idEx"],
    ["conc", "c"],
    ["und", "u"],
    ["fecha", "f"],
    ["estadoApi", "e"],
];
virtualMap.forEach(([largo, corto]) => {
    LaboratorioSchema.virtual(largo)
        .get(function () { return this[corto]; })
        .set(function (v) { this[corto] = v; });
});
LaboratorioSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret) => {
        delete ret.pac;
        delete ret.tip;
        delete ret.tec;
        delete ret.pru;
        delete ret.idEx;
        delete ret.c;
        delete ret.u;
        delete ret.f;
        delete ret.e;
        return ret;
    },
});
LaboratorioSchema.set("toObject", { virtuals: true });
exports.LaboratorioModel = (0, mongoose_1.model)("laboratorio", LaboratorioSchema, "laboratorio");
const Basededato = async (req, res) => {
    const path = req.path;
    const accion = path.includes(":") ? path.split(":")[1] : "obtener";
    try {
        switch (accion) {
            case "subir":
            case "crear": {
                if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
                    res.status(400).json({ ok: false, mensaje: "El cuerpo está vacío" });
                    return;
                }
                const docs = Array.isArray(req.body) ? req.body : [req.body];
                const startId = await reservarIds(docs.length);
                const preparados = docs.map((d, i) => ({
                    _id: startId + i,
                    pac: d.pac ?? d.paciente,
                    tip: d.tip ?? d.tipo,
                    tec: d.tec ?? d.tecnica,
                    pru: d.pru ?? d.prueba,
                    idEx: d.idEx ?? d.idExamen,
                    c: d.c ?? d.conc,
                    u: d.u ?? d.und,
                    f: d.f ?? d.fecha,
                    e: d.e ?? d.estadoApi,
                }));
                const guardado = await exports.LaboratorioModel.insertMany(preparados);
                res.status(201).json({ ok: true, accion, data: guardado });
                break;
            }
            case "obtener":
            case "listar": {
                const id = req.query.id || req.body?.id;
                if (id) {
                    const numId = Number(id);
                    const registro = await exports.LaboratorioModel.findById(Number.isNaN(numId) ? id : numId);
                    if (!registro) {
                        res.status(404).json({ ok: false, mensaje: "Registro no encontrado" });
                        return;
                    }
                    res.status(200).json({ ok: true, accion, data: registro });
                    return;
                }
                const filtro = {};
                const paciente = req.query.paciente || req.body?.paciente;
                const idExamen = req.query.idExamen || req.body?.idExamen;
                if (paciente)
                    filtro.pac = paciente;
                if (idExamen)
                    filtro.idEx = idExamen;
                const registros = await exports.LaboratorioModel.find(filtro);
                res.status(200).json({
                    ok: true, accion, total: registros.length, data: registros,
                });
                break;
            }
            case "editar":
            case "actualizar": {
                const id = req.body?.id || req.query?.id;
                if (!id) {
                    res.status(400).json({ ok: false, mensaje: "Se requiere el ID" });
                    return;
                }
                const numId = Number(id);
                const body = req.body || {};
                const update = {};
                if (body.paciente !== undefined)
                    update.pac = body.paciente;
                if (body.tipo !== undefined)
                    update.tip = body.tipo;
                if (body.tecnica !== undefined)
                    update.tec = body.tecnica;
                if (body.prueba !== undefined)
                    update.pru = body.prueba;
                if (body.idExamen !== undefined)
                    update.idEx = body.idExamen;
                if (body.conc !== undefined)
                    update.c = body.conc;
                if (body.und !== undefined)
                    update.u = body.und;
                if (body.fecha !== undefined)
                    update.f = body.fecha;
                if (body.estadoApi !== undefined)
                    update.e = body.estadoApi;
                const actualizado = await exports.LaboratorioModel.findByIdAndUpdate(Number.isNaN(numId) ? id : numId, update, { new: true, runValidators: true });
                if (!actualizado) {
                    res.status(404).json({ ok: false, mensaje: "Registro no encontrado" });
                    return;
                }
                res.status(200).json({ ok: true, accion, data: actualizado });
                break;
            }
            case "eliminar": {
                const id = req.body?.id || req.query?.id;
                if (!id) {
                    res.status(400).json({ ok: false, mensaje: "Se requiere el ID" });
                    return;
                }
                const numId = Number(id);
                const eliminado = await exports.LaboratorioModel.findByIdAndDelete(Number.isNaN(numId) ? id : numId);
                if (!eliminado) {
                    res.status(404).json({ ok: false, mensaje: "Registro no encontrado" });
                    return;
                }
                res.status(200).json({ ok: true, accion, mensaje: "Examen eliminado", data: eliminado });
                break;
            }
            default:
                res.status(400).json({ ok: false, mensaje: `Acción '${accion}' no válida` });
        }
    }
    catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: `Error procesando la acción '${accion}'`,
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.Basededato = Basededato;
const router = (0, express_1.Router)();
router.all("/Basededato*", exports.Basededato);
exports.default = router;
