import { Router } from 'express';
import { filtrado } from '../Controller/Filtrado';
import { Procedimiento } from '../Controller/Procedimiento';
import { Parametrizacion } from '../Controller/Parametros';
import { obtenerCadenaCompleta } from '../Controller/obtenerCadenaCompletaCore';
import { BuscarAdmision } from '../Controller/BuscarAdmision';
import { ArmarJsonController } from '../Controller/inte/CrearJsonPost';




const router = Router();

// Ruta del router → mensaje desde router
router.get('/', (req, res) => {
  res.send('Estás en router');
});


router.use('/Filtra', filtrado);
router.use('/Procedimiento', Procedimiento);
router.use('/Parametrizacion', Parametrizacion);
router.post('/BuscarIdAdmision', BuscarAdmision);
router.post('/obtenerCadenaCompleta', obtenerCadenaCompleta);
router.post('/sURBIR', ArmarJsonController);

// 404 del router
router.use((req, res) => {
  res.status(404).send('Ruta no encontrada en router');
});

export default router;
