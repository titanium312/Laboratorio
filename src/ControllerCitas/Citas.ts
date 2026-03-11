import { Request, Response } from 'express';
import axios from 'axios';

export const CitasAgendar = async (req: Request, res: Response) => {
  return res.status(200).json({
    ok: true,
    message: "Estamos en citas"
  });
};

export default CitasAgendar;