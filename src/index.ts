import express from 'express';
import Router from './Router/Router';

const app = express();

app.use(express.json());

// Ruta principal → mensaje desde index
app.get('/', (req, res) => {
  res.send('Estás en index');
});

// Montamos el router en /home
app.use('/-RB-', Router);

// 404 general
app.use((req, res) => {
  res.status(404).send('Ruta no encontrada');
});

// Para desarrollo local
const port = Number(process.env.PORT || 3000);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
}

export default app;
module.exports = app;
