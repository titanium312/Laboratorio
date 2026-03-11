import { Request, Response } from 'express';
import axios from 'axios';
import qs from 'qs';

export const ProcedimientosAsignables = async (req: Request, res: Response) => {
  try {

    const { idConsultorio, idUsuario } = req.body;

    if (!idConsultorio || !idUsuario) {
      return res.status(400).json({
        ok: false,
        message: "Faltan idConsultorio o idUsuario"
      });
    }

    const body = qs.stringify({
      sEcho: 1,
      iColumns: 3,
      sColumns: ",CODIGO,NOMBRE",
      iDisplayStart: 0,
      iDisplayLength: 10,
      mDataProp_0: 0,
      mDataProp_1: 1,
      mDataProp_2: 2,
      sSearch: "",
      bRegex: false,
      sSearch_0: "",
      bRegex_0: false,
      bSearchable_0: true,
      sSearch_1: "",
      bRegex_1: false,
      bSearchable_1: false,
      sSearch_2: "",
      bRegex_2: false,
      bSearchable_2: false,
      iSortingCols: 1,
      iSortCol_0: 0,
      sSortDir_0: "asc",
      bSortable_0: true,
      bSortable_1: false,
      bSortable_2: false
    });

    const response = await axios.post(
      `https://balance.saludplus.co/asignarCitas/ProcedimientosAsignablesBuscadorDatos?idConsultorio=${idConsultorio}&idUsuario=${idUsuario}`,
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
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