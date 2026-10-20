const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("NEXUS MD berhasil terhubung!");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 5000);
      } else {
        console.log("WhatsApp logout. Hubungkan ulang.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = body.trim().toLowerCase();

    const replies = {
      ".menu": "🤖 NEXUS MD\n.menu\n.ping\n.info",
      ".ping": "Pong! 🏓 NEXUS MD aktif.",
      ".info": "NEXUS MD\nBot WhatsApp sederhana\nVersi 1.0.0"
    };

    if (replies[command]) {
      await sock.sendMessage(jid, { text: replies[command] });
    }
  });
}

startBot().catch(console.error);
    
