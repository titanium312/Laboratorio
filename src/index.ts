import express from 'express';
import path from 'path';
import Router from './Router/Router';
import RouterCitas from './Router/RouterCitas';

const app = express();

// ✅ HABILITAR JSON
app.use(express.json());

// ✅ CORS CORRECTO (SIN MODIFICAR RES)
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

// 📡 LOGGER
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.url}`);
  next();
});

// ✅ RUTAS ESTÁTICAS
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Index/Index.html'));
});

app.get('/Citas', (req, res) => {
  res.sendFile(path.join(__dirname, '../Index/Citas/IndexCitas.html'));
});

// ✅ TUS ROUTERS
app.use('/-RB-', Router);
app.use('/CitasRB', RouterCitas);

// ✅ 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const port = Number(process.env.PORT || 3000);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`✅ Servidor escuchando en http://localhost:${port}`);
  });
}

export default app;