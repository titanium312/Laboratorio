import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('¡Hola mundo desde Express + TypeScript en local!');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
