import { Router } from 'express';
import { getHome } from '../Controller/home.controller';

const router = Router();

// Ruta del router → mensaje desde router
router.get('/', (req, res) => {
  res.send('Estás en router');
});


router.use('/Home', getHome);

// 404 del router
router.use((req, res) => {
  res.status(404).send('Ruta no encontrada en router');
});

export default router;
