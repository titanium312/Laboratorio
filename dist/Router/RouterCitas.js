"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Citas_1 = require("../ControllerCitas/Citas");
const Consultorio_1 = require("../ControllerCitas/Consultorio");
const UsuarioAsignable_1 = require("../ControllerCitas/UsuarioAsignable");
const BuscarPaciente_1 = require("../ControllerCitas/BuscarPaciente");
const ProcedimientosAsignables_1 = require("../ControllerCitas/ProcedimientosAsignables");
const ProcedimientoSoat_1 = require("../ControllerCitas/ProcedimientoSoat");
const BuscarContratosValidos_1 = require("../ControllerCitas/BuscarContratosValidos");
const RouterCitas = (0, express_1.Router)();
// ✅ CORRECTO → usar método HTTP
RouterCitas.post('/Consultorio', Consultorio_1.Consultorio);
RouterCitas.post('/UsuarioAsignable', UsuarioAsignable_1.UsuarioAsignable);
RouterCitas.post('/ProcedimientosAsignables', ProcedimientosAsignables_1.ProcedimientosAsignables);
RouterCitas.post('/BuscarPaciente', BuscarPaciente_1.BuscarPaciente);
RouterCitas.post('/ProcedimientoSoat', ProcedimientoSoat_1.ProcedimientoSoat);
RouterCitas.post('/BuscarContratosValidos', BuscarContratosValidos_1.BuscarContratosValidos);
RouterCitas.post('/CitasAgendar', Citas_1.CitasAgendar);
// Ruta de prueba
RouterCitas.get('/', (req, res) => {
    res.send('Estás en router de citas');
});
// 404 del router
RouterCitas.use((req, res) => {
    res.status(404).send('Ruta no encontrada en router');
});
exports.default = RouterCitas;
