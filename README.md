# Radar da Viagem · Europa 2027

Site privado da Vitória e do Thiago para acompanhar os preços das passagens e dos passeios da viagem de abril de 2027, com:

- **Tela de login com senha.** Os dados ficam **criptografados** no repositório e só abrem no navegador com a senha certa (RSA-OAEP 3072 + AES-GCM 256, senha protegida por PBKDF2 com 600 mil rodadas).
- **Radar 3 vezes ao dia** (manhã, meio-dia e noite) feito por uma tarefa agendada do Claude, que pesquisa os preços e atualiza o site.
- **Alertas por e-mail** para os dois quando aparecer um preço abaixo da meta ou o menor já visto.

## Como funciona

```
Tarefa agendada do Claude (8h, 12h, 19h)
   │ pesquisa preços → cifra com keys/public.json → commit
   ▼
Repositório no GitHub ──► GitHub Pages publica index.html + dados cifrados
   │
   └─ se houver alerta: outbox/alerta.enc.json ──► GitHub Actions decifra com o segredo
                                                    ALERT_PRIVATE_KEY e envia o e-mail
```

O Claude só tem a **chave pública**: ele consegue trancar os dados, mas não consegue abri-los. Só abre quem tem a senha (no site) ou a chave privada (guardada nos segredos do GitHub).

## Configuração (uma vez só)

1. **Conectar o GitHub ao Claude**: em claude.ai → Configurações → Conectores → GitHub. Depois disso, o Claude cria o repositório e envia estes arquivos.
2. **Ativar o site**: no repositório, Settings → Pages → Source: **GitHub Actions**.
3. **Criar a senha**: abra `https://<seu-usuario>.github.io/<repositorio>/setup.html`, escolha a senha e siga a página:
   - envie ao Claude (ou suba na pasta `keys/`) os arquivos `public.json` e `private.enc.json`;
   - cole o texto **ALERT_PRIVATE_KEY** só no GitHub (Settings → Secrets and variables → Actions).
4. **E-mail**: no mesmo lugar dos segredos, crie:
   - `SMTP_USER`: o Gmail que vai enviar;
   - `SMTP_PASS`: a **senha de app** desse Gmail (myaccount.google.com → Segurança → Verificação em duas etapas → Senhas de app);
   - `EMAIL_TO`: os dois e-mails separados por vírgula.
5. Pronto. A próxima rodada do radar já publica os dados cifrados e o site abre com a senha.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `index.html` | Tela de login e painel (tudo é decifrado no navegador) |
| `setup.html` | Cria a senha e as chaves, no seu navegador |
| `keys/public.json` | Chave pública (pode ser pública) |
| `keys/private.enc.json` | Chave privada trancada com a senha |
| `data/dados.enc.json` | Preços, histórico e passeios, cifrados |
| `outbox/alerta.enc.json` | Último alerta, cifrado (dispara o e-mail) |
| `scripts/encrypt.mjs` | Usado pelo radar para cifrar |
| `scripts/send-alert.mjs` | Usado pelo GitHub Actions para enviar o e-mail |
| `.github/workflows/` | Publicação do site e envio do alerta |

## Segurança, em palavras simples

- A senha **nunca** sai do aparelho de quem digita e nunca é gravada.
- Sem a senha, quem abrir o repositório vê só texto embaralhado.
- O endereço do site é público, mas a área interna não abre sem a senha.
- Se a senha for esquecida, refaça o passo 3 (os dados novos passam a usar a nova chave).
