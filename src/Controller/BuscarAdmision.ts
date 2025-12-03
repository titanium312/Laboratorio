// src/controllers/BuscarAdmision.ts
import { Request, Response } from 'express';
import axios from 'axios';

export const BuscarAdmision = async (req: Request, res: Response) => {
  try {
    const documentoInput = req.body.documento || req.query.documento || req.params.documento;

    if (!documentoInput) {
      return res.status(400).json({
        error: 'El campo "documento" es obligatorio',
      });
    }

    // Extrae solo el número antes del espacio (ignora FEHxxxx)
    const numeroParaBuscar = documentoInput.toString().trim().split(' ')[0];

    if (!numeroParaBuscar || isNaN(Number(numeroParaBuscar))) {
      return res.status(400).json({
        error: 'El documento debe contener un número válido',
      });
    }

    const response = await axios.post(
      'https://balance.saludplus.co/admisiones/BucardorAdmisionesDatos',
      {
        sEcho: 1,
        iDisplayStart: 0,
        iDisplayLength: 50,
        sSearch: numeroParaBuscar, // Se busca por el número
      },
      {
        params: {
          fechaInicial: '*',
          fechaFinal: '*',
          idRecurso: 0,
          SinCargo: false,
          idServicioIngreso: 3,
          idCaracteristica: 0,
          validarSede: true,
        },
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'data': 'zsJo9Q61W/UjmJFf0xF8QZewLMC0rk3+wGbXhGdsmkM=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==',
          'x-requested-with': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    );

    const data = response.data;

    if (data.aaData && data.aaData.length > 0) {
      const admisiones = data.aaData
        .map((item: string[]) => ({
          Idamciones: item[0],
          NumeroAdmicion: item[1],
          tipoDocumento: item[2],
          nombre: item[3],
          entidad: item[4],
          fechaIngreso: item[5],
          horaIngreso: item[6],
        }))
        // Modificación: Filtra para asegurar que SOLO la parte numérica coincida
        .filter((adm: any) => {
          const numeroEnAdmision = adm.NumeroAdmicion.toString().trim().split(' ')[0];
          return numeroEnAdmision === numeroParaBuscar;
        });

      return res.json({
        success: true,
        total: admisiones.length,
        admisiones,
      });
    }

    return res.json({
      success: true,
      total: 0,
      admisiones: [],
      message: 'No se encontraron admisiones',
    });

  } catch (error: any) {
    console.error('Error SaludPlus:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar SaludPlus',
    });
  }
};