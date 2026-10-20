
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

let reconnecting = false;

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("QR login NEXUS MD:");
      qrcode.generate(qr, { small: true });
      console.log("Jangan bagikan QR ini kepada siapa pun.");
    }

    if (connection === "open") {
      reconnecting = false;
      console.log("NEXUS MD berhasil terhubung!");
    }

    if (connection === "close" && !reconnecting) {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        reconnecting = true;
        setTimeout(() => {
          reconnecting = false;
          startBot().catch(console.error);
        }, 5000);
      } else {
        console.log("Sesi logout. Hubungkan ulang secara aman.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg?.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast") continue;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      const command = body.trim().toLowerCase();

      const replies = {
        ".menu": "🤖 NEXUS MD\n\n.menu\n.ping\n.info\n\nBot sederhana.",
        ".ping": "Pong! 🏓 NEXUS MD aktif.",
        ".info": "NEXUS MD\nVersi 1.0.0\nBot WhatsApp sederhana."
      };

      if (replies[command]) {
        try {
          await sock.sendMessage(jid, { text: replies[command] });
        } catch (err) {
          console.error("Gagal mengirim pesan:", err.message);
        }
      }
    }
  });
}

startBot().catch(console.error);
