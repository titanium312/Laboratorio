// src/controllers/filtradoController.ts ← VERSIÓN FINAL Y LIMPIA (Devuelve solo el array de objetos)
import { Request, Response } from 'express';
import axios from 'axios';

const API_URL = "https://balance.saludplus.co/admisiones/BucardorAdmisionesDatos";

interface ApiResponse {
    aaData: string[][];
    // Otras propiedades como sEcho, iTotalRecords, etc., no son necesarias para el resultado final limpio
}

// Estructura de datos para el resultado limpio
interface AdmisionData {
    idAdmision: string;
    numeroAdmision: string; // Corregí 'Admicion' a 'Admision'
}

export const filtrado = async (req: Request, res: Response) => {
    try {
        const filtro = (req.body.filters || "").toString().trim();

        if (!filtro) {
            return res.status(400).json({ success: false, error: "Falta el filtro" });
        }

        // 1. Llamada a la API externa (se mantienen los parámetros de la API)
        const response = await axios.post<ApiResponse>(API_URL, {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 100, 
            sSearch: filtro
        }, {
            // ... (Parámetros y Headers se mantienen igual)
            params: {
                fechaInicial: "*",
                fechaFinal: "*",
                idRecurso: 0,
                SinCargo: false,
                idServicioIngreso: 3,
                idCaracteristica: 0,
                validarSede: true
            },
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "data": "zsJo9Q61W/UjmJFf0xF8QZewLMC0rk3+wGbXhGdsmkM=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==",
                "x-requested-with": "XMLHttpRequest",
                "origin": "https://balance.saludplus.co",
                "referer": "https://balance.saludplus.co/instituciones/?origen=1&theme=false&time=1764012442036"
            },
            timeout: 30000
        });

        const apiData = response.data;
        let datosLimpios: AdmisionData[] = [];

        // --- Lógica de Filtrado y Mapeo ---
        if (apiData.aaData && apiData.aaData.length > 0) {
            
            // 2. Filtrado LOCAL para coincidencia EXACTA en el número de Admisión (Índice 1)
            const datosFiltradosPorAdmision = apiData.aaData.filter(registro => {
                const campoAdmisionFactura = registro[1];
                // RegEx: Debe empezar con el filtro y terminar con un espacio o fin de string.
                const regex = new RegExp(`^${filtro}(?: |$)`); 
                return regex.test(campoAdmisionFactura);
            });
            
            // 3. Mapeo para extraer y estructurar los datos como objetos limpios
            datosLimpios = datosFiltradosPorAdmision.map(registro => {
                return {
                    idAdmision: registro[0],      // Índice 0: ID Interno
                    numeroAdmision: registro[1]   // Índice 1: Número de Admisión/Factura
                };
            });
        }
        
        // 4. Devolver la respuesta en un formato JSON limpio y estructurado (Array de objetos)
        res.json({ success: true, data: datosLimpios });

    } catch (error: any) {
        console.error("Error SaludPlus:", error.message);
        res.status(500).json({
            success: false,
            data: [],
            error: "Error al consultar admisiones"
        });
    }
};