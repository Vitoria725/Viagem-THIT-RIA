// Criptografa um arquivo JSON com a chave pública do site (RSA-OAEP 3072 + AES-GCM 256).
// Uso:
//   node scripts/encrypt.mjs dados.json data/dados.enc.json
//   node scripts/encrypt.mjs alerta.json outbox/alerta.enc.json
// Só a chave pública (keys/public.json) é usada aqui: quem roda este script não consegue
// decifrar nada. Para abrir, é preciso a senha do site (navegador) ou a chave privada (GitHub Actions).
import { readFile, writeFile } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("Uso: node scripts/encrypt.mjs <entrada.json> <saida.enc.json>");
  process.exit(1);
}
const b64 = (buf) => Buffer.from(buf).toString("base64");

const jwk = JSON.parse(await readFile(new URL("../keys/public.json", import.meta.url), "utf8"));
const pub = await crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);

const text = await readFile(input, "utf8");
JSON.parse(text); // garante que é JSON válido antes de cifrar

const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(text));
const raw = await crypto.subtle.exportKey("raw", aes);
const ek = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, raw);

const payload = { v: 1, alg: "RSA-OAEP-256+A256GCM", criado_em: new Date().toISOString(), ek: b64(ek), iv: b64(iv), ct: b64(ct) };
await writeFile(output, JSON.stringify(payload));
console.log(`Cifrado: ${output} (${text.length} bytes de origem)`);
