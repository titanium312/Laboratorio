"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const express_1 = __importDefault(require("express"));
const serverless_http_1 = __importDefault(require("serverless-http"));
const app = (0, express_1.default)();
// Ruta raíz (URL base)
app.get('/', (req, res) => {
    res.send('Hola mundo desde la raíz!');
});
// Solo para ejecución local
if (process.env.LOCAL === 'true') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`Servidor local corriendo en http://localhost:${PORT}`));
}
exports.handler = (0, serverless_http_1.default)(app);
