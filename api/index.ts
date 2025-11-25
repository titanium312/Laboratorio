import express, { Request, Response } from 'express';
import serverless from 'serverless-http';

const app = express();

app.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hola desde Baken TS en local!' });
});

export const handler = serverless(app);
