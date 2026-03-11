import { Request, Response } from "express";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

let client: Client;

function iniciarCliente() {

  client = new Client({
    authStrategy: new LocalAuth({
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
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("✅ WhatsApp conectado");
  });

  client.initialize();
}

// iniciar cliente al arrancar
iniciarCliente();


export const enviarMensaje = async (req: Request, res: Response) => {

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

  } catch (error: any) {

    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });

  }
};