"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Filtrado_1 = require("../Controller/Filtrado");
const Procedimiento_1 = require("../Controller/Procedimiento");
const Parametros_1 = require("../Controller/Parametros");
const obtenerCadenaCompletaCore_1 = require("../Controller/obtenerCadenaCompletaCore");
const BuscarAdmision_1 = require("../Controller/BuscarAdmision");
const CrearJsonPost_1 = require("../Controller/inte/CrearJsonPost");
const router = (0, express_1.Router)();
// Ruta del router → mensaje desde router
router.get('/', (req, res) => {
    res.send('Estás en router');
});
router.use('/Filtra', Filtrado_1.filtrado);
router.use('/Procedimiento', Procedimiento_1.Procedimiento);
router.use('/Parametrizacion', Parametros_1.Parametrizacion);
router.post('/BuscarIdAdmision', BuscarAdmision_1.BuscarAdmision);
router.post('/obtenerCadenaCompleta', obtenerCadenaCompletaCore_1.obtenerCadenaCompleta);
router.post('/sURBIR', CrearJsonPost_1.ArmarJsonController);
// 404 del router
router.use((req, res) => {
    res.status(404).send('Ruta no encontrada en router');
});
exports.default = router;
