import { Request, Response } from 'express';
import axios from 'axios';

export const Consultorio = async (req: Request, res: Response) => {
  try {

    const { idUsuario } = req.body;

    const response = await axios.get(
      'https://balance.saludplus.co/asignarCitas/BuscarConsultorioPreferido',
      {
        params: { idUsuario },
        headers: {
          "accept": "application/json",
          "x-requested-with": "XMLHttpRequest",
          "data": "pyuN+e5x2DryYYDDW22UxHmbV88uxEgWBwjO9Nuah+8=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==",
          "User-Agent": "curl/8.9.1"
        }
      }
    );

    return res.json({
      ok: true,
      data: response.data
    });

  } catch (error: any) {

    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);
    console.log("HEADERS:", error.response?.headers);

    return res.status(500).json({
      ok: false,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
};