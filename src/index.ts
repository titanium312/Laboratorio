import express from 'express';
import path from 'path';
import Router from './Router/Router.js';

const app = express();

// ✅ HABILITAR JSON
app.use(express.json());

// ✅ HABILITAR CORS (ESTO ES LO QUE TE FALTABA)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // permite cualquier origen
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder rápido a preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// __dirname funciona en CommonJS sin problemas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Index/Index.html'));
});

// ✅ TU ROUTER
app.use('/-RB-', Router);

// ✅ 404
app.use((req, res) => {
  res.status(404).send('Ruta no encontrada');
});

const port = Number(process.env.PORT || 3000);

// ✅ LEVANTAR SERVIDOR
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
}

export default app;
