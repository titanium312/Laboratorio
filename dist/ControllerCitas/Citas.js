"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitasAgendar = void 0;
const CitasAgendar = async (req, res) => {
    return res.status(200).json({
        ok: true,
        message: "Estamos en citas"
    });
};
exports.CitasAgendar = CitasAgendar;
exports.default = exports.CitasAgendar;
