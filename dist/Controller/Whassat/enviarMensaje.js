"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarMensaje = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
let client;
function iniciarCliente() {
    client = new whatsapp_web_js_1.Client({
        authStrategy: new whatsapp_web_js_1.LocalAuth({
            dataPath: "./.wwebjs_auth"
        }),
        puppeteer: {
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        }
    });
    client.on("qr", (qr) => {
        console.log("📲 Escanea el QR con tu WhatsApp");
        qrcode_terminal_1.default.generate(qr, { small: true });
    });
    client.on("ready", () => {
        console.log("✅ WhatsApp conectado");
    });
    client.initialize();
}
// iniciar cliente al arrancar
iniciarCliente();
const enviarMensaje = async (req, res) => {
    try {
        const { numero, mensaje } = req.body;
        if (!numero || !mensaje) {
            return res.status(400).json({
                ok: false,
                error: "Numero y mensaje son obligatorios"
            });
        }
        const chatId = numero + "@c.us";
        const response = await client.sendMessage(chatId, mensaje);
        return res.json({
            ok: true,
            enviado: true,
            id: response.id.id
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
};
exports.enviarMensaje = enviarMensaje;
