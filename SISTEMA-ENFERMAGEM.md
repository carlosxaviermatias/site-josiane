# Sistema Enfermagem

Documento de entrada para retomar este trabalho em conversa nova.
Última atualização: 23/08/2026 — **sistema em produção, com pacientes reais.**

---

## O que é e onde está

Sistema de acompanhamento de pacientes para a enfermeira **Josiane Tavares**
(COREN-RJ 455892-ENF, ESF Granja, Paty do Alferes/RJ), que atua exclusivamente
no SUS. Vive dentro do site dela, na área restrita.

O primeiro programa implementado é **puericultura** (crianças até 2 anos).

- **No ar**: https://drajosianetavares.com.br/sistema/pacientes
- **Repo local**: `~/Documents/github/site-josiane-push/` (repo GitHub:
  `carlosxaviermatias/site-josiane`, branch `main`)
- **Deploy**: Hostinger Web App, redeploy automático a cada `git push`
- **Login**: senha em `ADMIN_PASSWORD` (produção: `@1211Ninah@`)
- **Painel de conteúdo do site** (`/sistema`, index/artigos/faq etc.) é coisa
  separada — mesmo repo, `admin/index.html`

---

## ⚠️ Ler antes de mexer

1. **`pacientes.json` nunca vai pro Git.** Está no `.gitignore`. Fica em
   `~/dados-protegidos/pacientes.json` no servidor Hostinger — **fora** da
   pasta de build (que é recriada a cada deploy), senão os dados sumiam a
   cada push. CPF é gravado criptografado (AES-256-GCM, `ENCRYPTION_KEY`).
2. **Toda a lógica do sistema mora em um arquivo só**:
   `admin/pacientes.html` (~1300 linhas, tudo inline — HTML+CSS+JS num único
   arquivo, sem build step, sem framework). `app.js` só tem as rotas de API.
3. **Fluxo de teste local** (repetir sempre antes de subir algo):
   ```bash
   ADMIN_PASSWORD=teste123 SESSION_SECRET=seg NODE_ENV=development \
     PORT=3999 DADOS_DIR=/tmp/algumnome node app.js &
   curl -s -c /tmp/ck.txt -X POST http://localhost:3999/api/login \
     -H 'Content-Type: application/json' -d '{"senha":"teste123"}'
   curl -s -b /tmp/ck.txt -X POST http://localhost:3999/api/admin/pacientes/importar \
     -F "csv=@/Users/tiagotavares/Downloads/acompanhamento-condicao-saude_2026-08-21-20-10.csv"
   ```
   Isso recria os 108 pacientes reais localmente sem tocar em produção.
4. **Depois de cada `git push`**, o Hostinger demora ~1-2 min pra redeploy.
   Confirmar com `curl` batendo em algum trecho de texto novo no HTML antes
   de avisar que terminou.

---

## Como o motor de pontuação funciona

Tudo em `admin/pacientes.html`, função `avaliar(crianca)`.

O sistema **não guarda peso, altura nem datas de consulta** — isso já está no
e-SUS. Guarda só os **contadores** que o relatório oficial cobra.

### Os 6 critérios (1/6 cada → pontuação de 0,00 a 1,00)

Eram 5 até 22/08 (visita domiciliar contava como 1 critério só, exigindo
**as duas** — 30d e 6m). A Josiane corrigiu duas vezes:

1. Primeiro: o indicador exige só **1 das duas** visitas, não as duas.
2. Depois: não — **são critérios separados**, cada um com sua própria
   pontuação. Motor atual: **6 critérios**, `PESO_CRITERIO = 1/6`.

| Critério (`id`) | Cumpre quando | Prazo |
|---|---|---|
| `vis30d` | `vis30d` ≥ 1 | 30 dias de vida (irrecuperável) |
| `vis6m` | `vis6m` ≥ 1 | **6 meses e 29 dias** — calculado por calendário real (`diasAoCompletar()`), não em dias corridos fixos |
| `cons30d` | `cons30d` ≥ 1 | 30 dias de vida |
| `cons2a` | `cons2a` ≥ 9 | 2 anos (730 dias) |
| `pesalt2a` | `pesalt2a` ≥ 9 | 2 anos |
| `vacinas` | as 4 marcadas: Pneumo 10V, Penta, VIP, Tríplice viral | 2 anos |

`vis30d`/`vis6m` são registrados pelo **ACS** (agente comunitário), não pela
Josiane — isso aparece marcado na interface (nota "ACS" em todo lugar que
esses dois critérios aparecem).

### Avisos de busca ativa do ACS (importante — regra específica)

Cards e listas separados para "Visita ACS · 30 dias" e "Visita ACS · 6 meses"
em "Onde estou". Regra pedida pela Josiane em 23/08: **só mostra quem ainda
dá tempo de agir**.

- **30 dias**: pendente enquanto `idade ≤ 30`. Passou disso sem visita? Some
  da lista — não adianta mais avisar, o indicador já era.
- **6 meses**: só entra na lista quando a criança **completa 6 meses**
  (`idade ≥ inicio6m`, calculado por calendário) — nem existe aviso antes
  disso. Sai da lista quando passa de `fim6m29d`.
- **Isso NÃO afeta a pontuação geral nem o status "em risco"** — o critério
  continua contando como não cumprido pra fins de indicador/mapa de
  critérios. É só a lista de "quem eu preciso correr atrás agora" que fica
  enxuta.

### Situação da criança

`completa` (6 de 6) · `no-prazo` · `apertado` (sobra menos de 30 dias por
consulta faltante) · `risco` (algum prazo já venceu) · `encerrada` (passou
dos 2 anos).

---

## Abas do painel

1. **Onde estou** — cartões-resumo (clicáveis, filtram a lista de crianças),
   gráfico por critério (barras ou **rosca**), distribuição de pontuação
   (barras ou **pizza**), fila por prazo, tabelas de busca ativa do ACS.
   Todo gráfico é clicável → leva pra lista filtrada.
2. **Crianças** — tabela com busca por nome/mãe, filtros ativos aparecem
   como chip removível, botão **⇩ PDF** exporta a visão atual.
3. **Microáreas** — ranking (barras/rosca/pizza) + mapa de calor por
   critério. Clicar numa microárea filtra a lista de crianças dela.
4. **+ Cadastrar** — form manual (raramente usado; o normal é importar CSV).
5. **Importar CSV do e-SUS** — botão no topo, sobe o relatório
   "Acompanhamento de condições de saúde" e atualiza tudo automaticamente
   (casa por nome, atualiza quem já existe, cadastra quem é novo, nunca
   duplica). **Isto substituiu qualquer digitação manual.**

Cada criança tem uma ficha (clique na linha) com checklist de `+`/`−` por
critério e vacinas como toggle.

### Navegação (23/08)

- Clicar na logo "Puericultura" no topo volta para "Onde estou" (limpa todos
  os filtros).
- A barra de abas fica **fixa ao rolar** (`position:sticky`) — tem um botão
  "▲ ocultar" que a esconde, virando uma abinha "☰ menu" pra trazer de volta.
  ⚠️ Isso só funciona porque `#abas` é filho direto de `#app` (que é alto —
  a página inteira). Um wrapper intermediário do tamanho da própria barra
  quebra o sticky (o elemento só "gruda" enquanto o pai dele ainda está na
  tela) — já caí nessa uma vez, não reintroduzir um `<div>` embrulhando
  `#abas`.

---

## Modelo de dados

```jsonc
{
  "criancas": [{
    "id": "c1787...", "nome": "...", "sexo": "F", "nascimento": "2024-09-12",
    "mae": "", "telefone": "...", "microarea": "01", "obs": "",
    "vis30d": 1, "vis6m": 0,
    "cons30d": 1, "cons2a": 8, "pesalt2a": 8,
    "vacinas": { "pneumo10v": true, "penta": true, "vip": true, "scr": true },
    "cpf_enc": "gAAAAA..." // AES-256-GCM, chave em ENCRYPTION_KEY — auditoria, não usado na UI
  }]
}
```

**108 crianças reais** da ESF Granja, mantidas via importação do CSV (não
mais digitação manual). O parser (`app.js`, `POST /api/admin/pacientes/importar`)
aceita datas em `dd/mm/aaaa` **e** `aaaa-mm-dd` — o CSV do e-SUS mistura os
dois formatos nas colunas de visita domiciliar, e isso já causou um bug
silencioso (visitas sempre zeradas) até ser corrigido em 23/08.

---

## Segurança (auditoria de 23/08 — ver `SEGURANCA.md` para o detalhe completo)

Duas falhas **críticas** foram corrigidas:
1. `express.static(__dirname)` servia a pasta inteira — `app.js` e
   `package.json` estavam publicamente baixáveis. Agora é allowlist.
2. Login sem limite de tentativas. Agora: 8 erros por IP em 15 min bloqueiam
   por 15 min.

Mais: cookie `SameSite=Lax`, cabeçalhos de segurança (X-Frame-Options,
HSTS, etc.), comparação de senha em tempo constante, validação do payload
antes de gravar `pacientes.json` (com backup `.bak` automático).

**Pendente**: definir `SESSION_SECRET` nas variáveis de ambiente do
Hostinger (sem ela, todo mundo desloga a cada deploy — funciona, só é
chato). Gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## Responsivo + exportação

- Painel funciona em celular: tabelas viram cartões empilhados (rótulo ao
  lado do valor, copiado do `<thead>` via `rotularCelulas()`), menu do
  painel de conteúdo (`admin/index.html`) vira faixa horizontal de abas.
- Todo bloco com tabela ou gráfico tem botão **⇩ PDF** — abre uma janela
  limpa (sem botões, sem filtros) e chama `window.print()`. Sem biblioteca
  externa, nada sai do navegador. Tabela sai em paisagem, gráfico em
  retrato. Rodapé sempre avisa que é dado de saúde (LGPD).

---

## Próximos passos possíveis

1. **Notificação de verdade.** Hoje reminders são via evento recorrente no
   Google Calendar (toda segunda 07h30, convite pra `josianenfermeira@gmail.com`)
   — não é o app enviando. `node-cron` + `nodemailer` seria a versão nativa.
2. **Outros programas.** Gestante (pré-natal) é o próximo natural: nova
   lista de critérios e um `avaliarGestante()` irmão, reaproveitando painel,
   filtros clicáveis e exportação.
3. Definir `SESSION_SECRET` (única pendência de segurança).

---

## Pendências do site (fora do sistema de pacientes)

- Cidade/UF e e-mail ainda podem estar como `[PLACEHOLDER]` (painel →
  Dados gerais) — conferir.
- Fotos definitivas dela.
- Indicações/afiliados são placeholder.
