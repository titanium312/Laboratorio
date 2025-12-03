"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Router_1 = __importDefault(require("./Router/Router"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Ruta principal → mensaje desde index
app.get('/', (req, res) => {
    res.send('Estás en index');
});
// Montamos el router en /home
app.use('/-RB-', Router_1.default);
// 404 general
app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});
// Para desarrollo local
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
    });
}
exports.default = app;
module.exports = app;
