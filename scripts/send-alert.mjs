// Roda no GitHub Actions quando chega um alerta novo em outbox/alerta.enc.json.
// Decifra com a chave privada guardada no segredo ALERT_PRIVATE_KEY e envia por e-mail (Gmail SMTP).
// Segredos usados (configurados por você em Settings → Secrets and variables → Actions):
//   ALERT_PRIVATE_KEY  texto gerado pela página setup.html
//   SMTP_USER          e-mail Gmail que vai enviar (ex.: o seu)
//   SMTP_PASS          "senha de app" de 16 letras desse Gmail (não é a senha normal)
//   EMAIL_TO           destinatários separados por vírgula
import { readFile } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";
import nodemailer from "nodemailer";

const need = ["ALERT_PRIVATE_KEY", "SMTP_USER", "SMTP_PASS", "EMAIL_TO"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Faltam segredos no GitHub: " + missing.join(", "));
  process.exit(1);
}
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

const jwk = JSON.parse(Buffer.from(process.env.ALERT_PRIVATE_KEY.trim(), "base64").toString("utf8"));
const priv = await crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);

const payload = JSON.parse(await readFile(process.argv[2] || "outbox/alerta.enc.json", "utf8"));
const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, unb64(payload.ek));
const aes = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(payload.iv) }, aes, unb64(payload.ct));
const msg = JSON.parse(new TextDecoder().decode(plain));

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 465, secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const to = process.env.EMAIL_TO.split(",").map((s) => s.trim()).filter(Boolean);
const info = await transport.sendMail({
  from: `"Radar da Viagem" <${process.env.SMTP_USER}>`,
  to,
  subject: msg.assunto || "Radar da viagem",
  text: msg.texto || "",
  html: msg.html || undefined,
});
console.log("E-mail enviado para " + to.length + " destinatário(s): " + info.messageId);
