# Segurança do sistema de puericultura

Registro da auditoria feita em 23/08/2026 e do que ficou implementado.

## O que foi corrigido

| # | Problema | Gravidade | Correção |
|---|----------|-----------|----------|
| 1 | `express.static(__dirname)` servia a pasta inteira — `app.js`, `package.json` e `package-lock.json` estavam abertos na internet | **Crítica** | Allowlist: só CSS, JS público, imagens e as páginas HTML são servidos. Todo o resto responde 404 |
| 2 | `/api/login` sem limite de tentativas — dava para testar senha à vontade contra dados de 108 crianças | **Crítica** | Freio por IP: 8 erros em 15 min bloqueiam por 15 min |
| 3 | Cookie de sessão sem `SameSite` — outro site podia disparar requisições autenticadas (CSRF) | **Alta** | `SameSite=Lax` + `HttpOnly` + `Secure` + expiração em 8 h |
| 4 | `SESSION_SECRET` caía num valor fixo que está publicado no repositório | **Alta** | Sem a variável definida, o app gera um segredo aleatório por execução e avisa no log |
| 5 | Sem cabeçalhos de segurança — painel podia ser embutido em iframe (clickjacking) | **Alta** | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, HSTS, `no-store` e `noindex` nas rotas sensíveis |
| 6 | Senha comparada com `===`, vazando informação pelo tempo de resposta | **Média** | `crypto.timingSafeEqual` |
| 7 | `ADMIN_PASSWORD` caía em `'josiane2026'` se a variável sumisse | **Média** | Sem fallback: falta da variável derruba o acesso e loga erro |
| 8 | Corpo de requisição de até 50 MB | **Média** | Reduzido para 2 MB (upload tem limite próprio) |
| 9 | `POST /api/admin/pacientes` gravava qualquer JSON — um corpo torto apagava o cadastro | **Média** | Valida o formato e guarda `.bak` antes de sobrescrever |
| 10 | `X-Powered-By: Express` anunciava o stack | **Baixa** | Desligado |

## Pendente — precisa ser feito no painel do Hostinger

**Definir `SESSION_SECRET`** (Sites → drajosianetavares.com.br → Variáveis de ambiente).

Sem ela o sistema funciona, mas todo mundo é deslogado a cada deploy ou reinício
do processo. Gere um valor aleatório e cole lá:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Variáveis que já estão configuradas: `ADMIN_PASSWORD`, `ENCRYPTION_KEY`.

## O que ficou de fora, e por quê

- **CSP para scripts**: o painel usa `onclick` inline em toda a interface, então uma
  CSP aqui precisaria de `'unsafe-inline'` — o que não protegeria de nada. Os demais
  cabeçalhos valem por si. Se um dia a interface migrar para listeners, dá para ligar.
- **Log de acesso aos dados**: útil para LGPD, mas exige decidir onde guardar e por
  quanto tempo. Fica como próximo passo.
- **Rate limit em memória**: funciona porque o Hostinger roda um processo só. Se um dia
  houver mais de uma instância, o contador precisa sair para um armazenamento comum.

## Onde os dados ficam

`pacientes.json` mora em `~/dados-protegidos/` (fora da pasta de build, que é recriada
a cada deploy) e nunca vai para o GitHub — está no `.gitignore` e o acesso direto pela
URL responde 404. O CPF é gravado criptografado com AES-256-GCM usando `ENCRYPTION_KEY`.
