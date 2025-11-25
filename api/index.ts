import express from 'express';
import serverless from 'serverless-http';

const app = express();

// Ruta raíz (URL base)
app.get('/', (req, res) => {
  res.send('Hola mundo desde la raíz!');
});

// Solo para ejecución local
if (process.env.LOCAL === 'true') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Servidor local corriendo en http://localhost:${PORT}`));
}

export const handler = serverless(app);
