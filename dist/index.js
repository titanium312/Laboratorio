"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const Router_1 = __importDefault(require("./Router/Router"));
const RouterCitas_1 = __importDefault(require("./Router/RouterCitas"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
app.use((req, res, next) => {
    console.log(`📡 [${req.method}] ${req.url}`);
    next();
});
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../Index/Index.html'));
});
app.get('/Citas', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../Index/Citas/IndexCitas.html'));
});
app.use('/-RB-', Router_1.default);
app.use('/CitasRB', RouterCitas_1.default);
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`✅ Servidor escuchando en http://localhost:${port}`);
    });
}
exports.default = app;
