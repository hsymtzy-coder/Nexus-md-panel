
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR tersedia. Gunakan metode pairing yang didukung.");
    }

    if (connection === "open") {
      console.log("NEXUS MD berhasil terhubung!");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 3000);
      } else {
        console.log("Sesi keluar. Hubungkan ulang secara manual.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (!body.startsWith(".")) return;

    const command = body.trim().split(/\s+/)[0].toLowerCase();

    if (command === ".menu") {
      await sock.sendMessage(jid, {
        text: "🤖 NEXUS MD\n.menu\n.ping\n.info\n.bugcheck\n.antispam\n.antibug"
      });
    } else if (command === ".ping") {
      await sock.sendMessage(jid, { text: "Pong! 🏓 NEXUS MD aktif." });
    } else if (command === ".info") {
      await sock.sendMessage(jid, {
        text: "NEXUS MD\nBot WhatsApp sederhana\nVersi 1.0.0"
      });
    } else if (command === ".bugcheck") {
      await sock.sendMessage(jid, {
        text: "Pemeriksaan dasar: pesan diterima. Tidak menjalankan payload."
      });
    } else if (command === ".antispam") {
      await sock.sendMessage(jid, {
        text: "Anti-spam dasar: perintah diterima. Filter lanjutan belum diaktifkan."
      });
    } else if (command === ".antibug") {
      await sock.sendMessage(jid, {
        text: "Pemeriksaan pesan dasar aktif; bukan perlindungan penuh."
      });
    }
  });
}

startBot().catch(console.error);
  
