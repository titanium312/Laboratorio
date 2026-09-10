import { Router } from 'express';
import { guardarResultado } from '../Controller/inte/guardado';  
import { buscarAdmision } from '../Controller/IDS/BuscarAdmision';
import { fetchParametrizaciones } from '../Controller/IDS/parametro';
import { automata } from '../Controller/Filtrado';
import { Basededato } from '../Database/BaseDatos';


import { login } from '../loguin/Lguin';

const router = Router();
router.post('/guardar', guardarResultado);  
router.get('/buscarAdmisionPorNumero', buscarAdmision);  
router.get('/parametro', fetchParametrizaciones); 
router.post('/automata', automata); 



// Acepta cualquier petición (GET, POST, PUT, DELETE) hacia /Basededato o /Basededato:*
router.all("/Basededato*", Basededato);





router.post('/login', login); 

export default router;