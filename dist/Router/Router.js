"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Filtrado_1 = require("../Controller/Filtrado");
const Procedimiento_1 = require("../Controller/Procedimiento");
const Parametros_1 = require("../Controller/Parametros");
const ParametroR_1 = require("../Controller/ParametroR");
const CrearJsonPost_1 = require("../Controller/inte/CrearJsonPost");
//import { vercion2 } from '../Controller/inte/Subir';
const ParametrosBili_1 = require("../Controller/ParametrosBili");
const router = (0, express_1.Router)();
// Ruta del router → mensaje desde router
router.get('/', (req, res) => {
    res.send('Estás en router');
});
router.use('/Filtra', Filtrado_1.filtrado);
router.use('/Procedimiento', Procedimiento_1.Procedimiento);
router.use('/Parametrizacion', Parametros_1.Parametrizacion);
router.use('/ParametrizacionBili', ParametrosBili_1.ParametrizacionBili);
router.get('/BuscarAdmision', ParametroR_1.obtenerCadenaCompleta); // <-- Solo acepta GET
router.post('/ArmarJson', CrearJsonPost_1.ArmarJsonController);
//router.post('/vercion2', vercion2);
// 404 del router
router.use((req, res) => {
    res.status(404).send('Ruta no encontrada en router');
});
exports.default = router;
