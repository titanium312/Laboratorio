import express from 'express';
import path from 'path';
import Router from './Router/Router';
import RouterCitas from './Router/RouterCitas';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.url}`);
  next();
});

// ✅ Servir estáticos (favicon.ico, Index.html, Citas/IndexCitas.html, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ✅ Ruta raíz explícita (Index.html tiene mayúscula, express.static no lo sirve por defecto)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'Index.html'));
});

app.get('/Citas', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'Citas', 'IndexCitas.html'));
});

app.use('/-RB-', Router);
app.use('/CitasRB', RouterCitas);

// ✅ 404 SIEMPRE al final
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const port = Number(process.env.PORT || 3000);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`✅ Servidor escuchando en http://localhost:${port}`);
  });
}

export default app;