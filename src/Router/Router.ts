import { Router } from 'express';
import { filtrado } from '../Controller/Filtrado';
import { Procedimiento } from '../Controller/Procedimiento';
import { Parametrizacion } from '../Controller/Parametros';
import { obtenerCadenaCompleta } from '../Controller/obtenerCadenaCompletaCore';
import { BuscarAdmision } from '../Controller/BuscarAdmision';
import { ArmarJsonController } from '../Controller/inte/CrearJsonPost';

const router = Router();

// Logger específico para este router
router.use((req, res, next) => {
  console.log(`🔄 [Router] ${req.method} /-RB-${req.originalUrl}`);
  next();
});

// Ruta de prueba
router.get('/', (req, res) => {
  res.json({ mensaje: 'Router funcionando correctamente' });
});

// Tus rutas
router.use('/Filtra', filtrado);
router.use('/Procedimiento', Procedimiento);
router.use('/Parametrizacion', Parametrizacion);
router.post('/BuscarIdAdmision', BuscarAdmision);
router.post('/obtenerCadenaCompleta', obtenerCadenaCompleta);
router.post('/sURBIR', ArmarJsonController);

// Manejo de 404 dentro del router
router.use((req, res) => {
  console.warn(`⚠️ [Router] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Ruta no encontrada en el router',
    ruta: req.originalUrl,
    rutas_disponibles: [
      '/Filtra',
      '/Procedimiento',
      '/Parametrizacion',
      '/BuscarIdAdmision',
      '/obtenerCadenaCompleta',
      '/sURBIR'
    ]
  });
});

export default router;