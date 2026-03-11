import { Router } from 'express';
import { CitasAgendar } from '../ControllerCitas/Citas';
import { Consultorio } from '../ControllerCitas/Consultorio';
import { UsuarioAsignable } from '../ControllerCitas/UsuarioAsignable';
import { BuscarPaciente } from '../ControllerCitas/BuscarPaciente';
import { ProcedimientosAsignables } from '../ControllerCitas/ProcedimientosAsignables';
import { ProcedimientoSoat } from '../ControllerCitas/ProcedimientoSoat';
import { BuscarContratosValidos } from '../ControllerCitas/BuscarContratosValidos';


const RouterCitas = Router();

// ✅ CORRECTO → usar método HTTP

RouterCitas.post('/Consultorio', Consultorio);
RouterCitas.post('/UsuarioAsignable', UsuarioAsignable);
RouterCitas.post('/ProcedimientosAsignables', ProcedimientosAsignables);
RouterCitas.post('/BuscarPaciente', BuscarPaciente);
RouterCitas.post('/ProcedimientoSoat', ProcedimientoSoat);
RouterCitas.post('/BuscarContratosValidos', BuscarContratosValidos);


RouterCitas.post('/CitasAgendar', CitasAgendar);

// Ruta de prueba
RouterCitas.get('/', (req, res) => {
  res.send('Estás en router de citas');
});

// 404 del router
RouterCitas.use((req, res) => {
  res.status(404).send('Ruta no encontrada en router');
});

export default RouterCitas;