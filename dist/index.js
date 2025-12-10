"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const Router_js_1 = __importDefault(require("./Router/Router.js"));
const app = (0, express_1.default)();
// ✅ HABILITAR JSON
app.use(express_1.default.json());
// ✅ HABILITAR CORS (ESTO ES LO QUE TE FALTABA)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // permite cualquier origen
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Responder rápido a preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
// __dirname funciona en CommonJS sin problemas
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../Index/Index.html'));
});
// ✅ TU ROUTER
app.use('/-RB-', Router_js_1.default);
// ✅ 404
app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});
const port = Number(process.env.PORT || 3000);
// ✅ LEVANTAR SERVIDOR
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
    });
}
exports.default = app;
