"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioAsignable = void 0;
const axios_1 = __importDefault(require("axios"));
const UsuarioAsignable = async (req, res) => {
    try {
        const response = await axios_1.default.get('https://balance.saludplus.co/asignarCitas/UsuariosAsignablesBuscar', {
            headers: {
                "accept": "application/json",
                "x-requested-with": "XMLHttpRequest",
                "data": "pyuN+e5x2DryYYDDW22UxHmbV88uxEgWBwjO9Nuah+8=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==",
                "User-Agent": "curl/8.9.1"
            }
        });
        return res.json({
            ok: true,
            data: response.data
        });
    }
    catch (error) {
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
exports.UsuarioAsignable = UsuarioAsignable;
