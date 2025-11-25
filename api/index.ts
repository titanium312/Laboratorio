// api/index.ts
import express, { Request, Response } from 'express';
import serverless from 'serverless-http';

const app = express();

// Ruta principal
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hola desde /api/' });
});

// Ruta /hello
app.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hola desde /api/hello en Vercel!' });
});

// Solo para desarrollo local
if (process.env.LOCAL !== 'false') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Servidor local corriendo en http://localhost:${PORT}`);
  });
}

// Exportamos el handler serverless
export const handler = serverless(app);
