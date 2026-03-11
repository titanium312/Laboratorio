import { Request, Response } from 'express';
import axios from 'axios';

export const UsuarioAsignable = async (req: Request, res: Response) => {
  try {

    const response = await axios.get(
      'https://balance.saludplus.co/asignarCitas/UsuariosAsignablesBuscar',
      {
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

    return res.status(500).json({
      ok: false,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
};