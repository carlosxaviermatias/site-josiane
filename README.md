# Site — Josiane Tavares (Enfermeira)

Site informativo de enfermagem com foco em saúde da mulher: pré-natal, puerpério,
exame preventivo (Papanicolau), amamentação e planejamento familiar.
Domínio previsto: **drajosianetavares.com.br**

## Como rodar

```bash
npm install
npm start          # http://localhost:3000
```

No Claude Code, o servidor já está configurado em `.claude/launch.json` como
`site-josiane` (porta 3002).

## Estrutura

| Arquivo | O que faz |
|---|---|
| `app.js` | Servidor Express: API, sessão, upload, sync com o GitHub |
| `data.json` | **Todo o conteúdo do site.** Editado pelo painel |
| `loader.js` | Monta as páginas a partir do `data.json` |
| `style.css` | Design (verde profundo + areia + rosé) |
| `index.html` | Página inicial |
| `tema.html` | Página de um tema de saúde da mulher (`/tema/:id`) |
| `artigos.html` / `artigo.html` | Blog (`/artigos`, `/artigo/:slug`) |
| `indicacoes.html` | Página de indicações / afiliados |
| `faq.html` | Dúvidas frequentes com trilha interativa (`/faq`) |
| `admin/index.html` | Área restrita: login + painel de conteúdo |

## Área restrita

Acesso em `/admin`. A senha vem da variável de ambiente `ADMIN_PASSWORD`
(padrão de desenvolvimento: `josiane2026` — trocar antes de publicar).

O painel edita: dados gerais, topo, pilares, sobre, temas, enfermagem geral,
sinais de alerta, artigos, dúvidas (FAQ), indicações e rodapé. Também envia imagens.

## FAQ interativo (`/faq`)

A visitante escolhe em que fase está (grávida, puérpera, prevenção, planejando).
Quem escolhe "estou grávida" informa a DUM ou as semanas e recebe idade
gestacional, data provável do parto (regra de Näegele) e os marcos do pré-natal
daquele momento. As perguntas abaixo se filtram pela fase, com busca por palavra.

No painel, a aba **Dúvidas (FAQ)** edita as perguntas, marca em quais fases cada
uma aparece e define o tema relacionado. Os marcos do pré-natal (faixas de
semanas) também são editáveis ali.

## Variáveis de ambiente (Hostinger)

| Variável | Para quê |
|---|---|
| `PORT` | Porta do servidor |
| `ADMIN_PASSWORD` | Senha da área restrita |
| `SESSION_SECRET` | Segredo da sessão |
| `GITHUB_TOKEN` | Token fine-grained com `Contents: Read and write` |
| `GITHUB_REPO` | Ex.: `usuario/repositorio` |
| `GITHUB_BRANCH` | Padrão: `main` |

Sem `GITHUB_TOKEN`/`GITHUB_REPO` o painel salva só localmente — as edições se
perdem no próximo deploy. Configurar antes de entregar para a Josiane.

## Imagens

- `josiane-hero.jpg` / `josiane-sobre.jpg` — fotos dela. As atuais são de
  exemplo, recortadas de uma foto do Downloads. **Trocar pelas definitivas.**
  ⚠️ Fotos de iPhone (.heic) trazem orientação no EXIF: converter com
  `ImageOps.exif_transpose` do Pillow, senão saem deitadas (`sips` sozinho
  ignora isso).
- `tema-*.svg` e `artigo-*.svg` — ilustrações de linha feitas para o site,
  na paleta verde/areia/rosé. Não são fotos de banco de imagem.

Se um caminho de imagem apontar para arquivo inexistente, o site mostra um
bloco verde no lugar — não quebra.

## Aviso

O conteúdo é informativo e educativo. Não há agendamento nem atendimento
particular: a atuação clínica é exclusivamente no SUS.
