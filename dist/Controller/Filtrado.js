"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filtrado = void 0;
const axios_1 = __importDefault(require("axios"));
const API_URL = "https://balance.saludplus.co/admisiones/BucardorAdmisionesDatos";
const filtrado = async (req, res) => {
    try {
        const filtro = (req.body.filters || "").toString().trim();
        if (!filtro) {
            res.status(400).json({ success: false, error: "Falta el filtro" });
            return;
        }
        const response = await axios_1.default.post(API_URL, {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 100,
            sSearch: filtro
        }, {
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
        let datosLimpios = [];
        if (apiData.aaData && apiData.aaData.length > 0) {
            const datosFiltradosPorAdmision = apiData.aaData.filter(registro => {
                const campoAdmisionFactura = registro[1];
                const regex = new RegExp(`^${filtro}(?: |$)`);
                return regex.test(campoAdmisionFactura);
            });
            datosLimpios = datosFiltradosPorAdmision.map(registro => {
                return {
                    idAdmision: registro[0],
                    numeroAdmision: registro[1]
                };
            });
        }
        res.json({ success: true, data: datosLimpios });
        return;
    }
    catch (error) {
        console.error("Error SaludPlus:", error.message);
        res.status(500).json({
            success: false,
            data: [],
            error: "Error al consultar admisiones"
        });
        return;
    }
};
exports.filtrado = filtrado;
