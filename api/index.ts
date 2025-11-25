import express, { Request, Response } from 'express';
import serverless from 'serverless-http';

const app = express();

// Ruta de prueba
app.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hola desde Baken TS en local!' });
});

// Solo para ejecución local
if (process.env.LOCAL !== 'false') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Servidor local corriendo en http://localhost:${PORT}`));
}

export const handler = serverless(app);
