import { Request, Response, Router } from "express";
import mongoose, { Schema, model, HydratedDocument } from "mongoose";

// ==========================================
// 0. CONEXIÓN
// ==========================================
const MONGO_URI =
  "mongodb+srv://rbrobertobarreto_db_user:Camisamojada123456+@cluster0.3bhv3kc.mongodb.net/sample_mflix?ssl=true&authSource=admin";

if (mongoose.connection.readyState === 0) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("Conectado con éxito a MongoDB Atlas"))
    .catch((err) => console.error("Error al conectar a MongoDB:", err));
}

// ==========================================
// 1. CONTADOR AUTOINCREMENTAL
// ==========================================
interface ICounter {
  _id: string;   // nombre del contador ("laboratorio")
  seq: number;   // último ID usado
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const CounterModel = model<ICounter>("Counter", CounterSchema, "counters");

async function reservarIds(cantidad: number): Promise<number> {
  const c = await CounterModel.findByIdAndUpdate(
    "laboratorio",
    { $inc: { seq: cantidad } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return (c?.seq ?? cantidad) - cantidad + 1;
}

// ==========================================
// 2. MODELO COMPACTO
// ==========================================
export interface ILaboratorio {
  _id: number;
  pac: string;
  tip: string;
  tec: string;
  pru: string;
  idEx: string;
  c: number | string;
  u: string;
  f: Date;
  e: string;
}

// (Opcional) tipo del documento hidratado si lo necesitas en otros archivos
export type LaboratorioDoc = HydratedDocument<ILaboratorio>;

const LaboratorioSchema = new Schema<ILaboratorio>(
  {
    _id: { type: Number, required: true },
    pac:  { type: String, required: true },
    tip:  { type: String, required: true },
    tec:  { type: String, required: true },
    pru:  { type: String, required: true },
    idEx: { type: String, required: true, index: true },
    c:    { type: Schema.Types.Mixed, required: true },
    u:    { type: String, required: true },
    f:    { type: Date, default: Date.now },
    e:    { type: String, default: "PENDIENTE" },
  },
  { versionKey: false, _id: false }
);

LaboratorioSchema.index({ pac: 1, idEx: 1 });
LaboratorioSchema.index({ e: 1 });

// ---------- VIRTUALS (compatibilidad con el frontend) ----------
const virtualMap: Array<[string, string]> = [
  ["paciente",  "pac"],
  ["tipo",      "tip"],
  ["tecnica",   "tec"],
  ["prueba",    "pru"],
  ["idExamen",  "idEx"],
  ["conc",      "c"],
  ["und",       "u"],
  ["fecha",     "f"],
  ["estadoApi", "e"],
];

virtualMap.forEach(([largo, corto]) => {
  LaboratorioSchema.virtual(largo)
    .get(function (this: any) { return this[corto]; })
    .set(function (this: any, v: any) { this[corto] = v; });
});

LaboratorioSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    delete ret.pac; delete ret.tip; delete ret.tec;
    delete ret.pru; delete ret.idEx; delete ret.c;
    delete ret.u;   delete ret.f;   delete ret.e;
    return ret;
  },
});
LaboratorioSchema.set("toObject", { virtuals: true });

export const LaboratorioModel = model<ILaboratorio>(
  "laboratorio",
  LaboratorioSchema,
  "laboratorio"
);

// ==========================================
// 3. CONTROLADOR
// ==========================================
export const Basededato = async (req: Request, res: Response): Promise<void> => {
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

        const docs: any[] = Array.isArray(req.body) ? req.body : [req.body];
        const startId = await reservarIds(docs.length);

        const preparados = docs.map((d, i) => ({
          _id:  startId + i,
          pac:  d.pac  ?? d.paciente,
          tip:  d.tip  ?? d.tipo,
          tec:  d.tec  ?? d.tecnica,
          pru:  d.pru  ?? d.prueba,
          idEx: d.idEx ?? d.idExamen,
          c:    d.c    ?? d.conc,
          u:    d.u    ?? d.und,
          f:    d.f    ?? d.fecha,
          e:    d.e    ?? d.estadoApi,
        }));

        const guardado = await LaboratorioModel.insertMany(preparados);
        res.status(201).json({ ok: true, accion, data: guardado });
        break;
      }

      case "obtener":
      case "listar": {
        const id = (req.query.id as string) || req.body?.id;

        if (id) {
          const numId = Number(id);
          const registro = await LaboratorioModel.findById(
            Number.isNaN(numId) ? id : numId
          );
          if (!registro) {
            res.status(404).json({ ok: false, mensaje: "Registro no encontrado" });
            return;
          }
          res.status(200).json({ ok: true, accion, data: registro });
          return;
        }

        const filtro: Record<string, any> = {};
        const paciente = (req.query.paciente as string) || req.body?.paciente;
        const idExamen = (req.query.idExamen as string) || req.body?.idExamen;
        if (paciente) filtro.pac = paciente;
        if (idExamen) filtro.idEx = idExamen;

        const registros = await LaboratorioModel.find(filtro);
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
        const update: Record<string, any> = {};
        if (body.paciente  !== undefined) update.pac  = body.paciente;
        if (body.tipo      !== undefined) update.tip  = body.tipo;
        if (body.tecnica   !== undefined) update.tec  = body.tecnica;
        if (body.prueba    !== undefined) update.pru  = body.prueba;
        if (body.idExamen  !== undefined) update.idEx = body.idExamen;
        if (body.conc      !== undefined) update.c    = body.conc;
        if (body.und       !== undefined) update.u    = body.und;
        if (body.fecha     !== undefined) update.f    = body.fecha;
        if (body.estadoApi !== undefined) update.e    = body.estadoApi;

        const actualizado = await LaboratorioModel.findByIdAndUpdate(
          Number.isNaN(numId) ? id : numId,
          update,
          { new: true, runValidators: true }
        );
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
        const eliminado = await LaboratorioModel.findByIdAndDelete(
          Number.isNaN(numId) ? id : numId
        );
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
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: `Error procesando la acción '${accion}'`,
      error: error instanceof Error ? error.message : error,
    });
  }
};

// ==========================================
// 4. ROUTER
// ==========================================
const router = Router();
router.all("/Basededato*", Basededato);

export default router;