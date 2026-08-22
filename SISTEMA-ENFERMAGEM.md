# Sistema Enfermagem

Documento de entrada para retomar este trabalho em conversa nova.
Última atualização: 21/08/2026 (reescrito como checklist de contadores).

---

## O que é

Sistema de acompanhamento de pacientes para a enfermeira **Josiane Tavares**
(COREN-RJ 455892-ENF), que atua exclusivamente no SUS. Vive dentro do site
dela, na área restrita.

O primeiro programa implementado é **puericultura** (crianças até 2 anos).
A arquitetura foi desenhada para receber outros programas — gestante,
hipertenso, diabético — sem reescrever o motor.

**Onde**: `Josiane Tavares/site-josiane/`
**Rodar**: `npm start` (ou o launch `site-josiane`, porta 3002)
**Entrar**: `/admin/pacientes` · senha em `ADMIN_PASSWORD` (dev: `josiane2026`)

---

## Por que ele existe

A Josiane presta contas de indicadores da Atenção Primária. O painel oficial
que ela usa mostra percentuais por "prática", e é isso que este sistema
espelha — para que ela saiba onde está **antes** de o indicador fechar, e saiba
**qual criança** buscar.

Percentuais do painel real dela, em agosto/2026 (para calibração):

| Prática | Real |
|---|---|
| 1ª consulta antes de 30 dias | 41% |
| 9 puericulturas | 18% |
| 9 avaliações antropométricas | 29% |
| Visita antes de 30 dias e 6 meses | 24% |
| Vacinas | 41% |
| **Geral** | **31%** |

---

## Como o motor funciona

Toda a lógica está em `admin/pacientes.html`, na função `avaliar(crianca)`.

O sistema **não guarda peso, altura nem datas de consulta** — isso já está no
e-SUS. Ele guarda só os **contadores** que o relatório oficial cobra, e mostra
o que ainda falta antes de a criança completar 2 anos.

### Os 5 critérios (0,20 cada → pontuação de 0,00 a 1,00)

Conferido contra o relatório oficial `relatorio_desenvolvimento_inf.pdf`
("Lista de Crianças — Desenvolvimento Infantil"). A fórmula bate nos 18
registros do PDF.

| Critério | Cumpre quando | Prazo |
|---|---|---|
| Visita domiciliar | `vis30d` ≥ 1 **e** `vis6m` ≥ 1 | 30 dias / 240 dias |
| 1ª consulta | `cons30d` ≥ 1 | 30 dias de vida |
| 9 consultas | `cons2a` ≥ 9 | 2 anos (730 dias) |
| 9 com peso e altura | `pesalt2a` ≥ 9 | 2 anos |
| Vacinas | as 4 marcadas: Pneumo 10V, Penta, VIP, Tríplice viral | 2 anos |

É **tudo ou nada** por critério — meia consulta não pontua. `pesalt2a` nunca
passa de `cons2a` (o próprio contador trava).

### Situação da criança

`completa` (5 de 5) · `no-prazo` · `apertado` (sobra menos de 30 dias por
consulta faltante) · `risco` (algum prazo já venceu) · `encerrada` (passou dos
2 anos).

O "apertado" é o ponto do sistema: ele existe para o caso de **faltar pouco
tempo** para cumprir a meta, que é quando ela puxa esse relatório.

### O gráfico

Três leituras na aba "Onde estou":
1. **Barras por critério** — % de crianças que já cumpriram cada um.
2. **Distribuição de pontuação** — quantas estão em 0,00 · 0,20 … 1,00, igual
   à coluna *Pontuação* do relatório. Cada `+` empurra alguém para cima.
3. **Fila por prazo** — quem vence primeiro e qual o próximo passo.

---

## Modelo de dados

`pacientes.json`, separado do `data.json` (que é o conteúdo do site).

```jsonc
{
  "criancas": [{
    "id": "c1",
    "nome": "...", "sexo": "F", "nascimento": "2024-09-12",
    "mae": "...", "telefone": "...", "microarea": "01", "obs": "",
    "vis30d": 1, "vis6m": 2,
    "cons30d": 1, "cons2a": 8, "pesalt2a": 8,
    "vacinas": { "pneumo10v": true, "penta": true, "vip": true, "scr": true }
  }]
}
```

Hoje há **108 crianças REAIS** da ESF Granja (Paty do Alferes/RJ),
importadas em 21/08/2026 do CSV do e-SUS "Acompanhamento de condições de
saúde" (`acompanhamento-condicao-saude_*.csv`, Latin-1, `;`). CPF e CNS
ficaram de fora de propósito. O conversor mapeou:

- `cons2a` ← Quantidade de consultas até 24 meses
- `pesalt2a` ← Quantidade de medições peso/altura simultâneas (pode ser
  **maior** que as consultas — medem também na sala de vacina; por isso não
  há trava entre os dois contadores)
- `cons30d` / `vis30d` ← data da 1ª consulta / 1ª visita vs. nascimento
- vacinas ← doses por coluna, conferidas contra o esquema esperado pela idade

⚠️ **`vis6m` veio quase todo 0**: o CSV só informa a data da 1ª e da 2ª
visita, então não dá para saber se houve visita na janela dos 6 meses
(150–240 dias). A Josiane precisa marcar esse item manualmente, criança por
criança — é 1 clique na ficha.

---

## O que já funciona

- **Onde estou**: 4 cartões (crianças, pontuação média, prazo mais curto,
  quantas precisam dela), barras por critério, distribuição de pontuação,
  fila por prazo clicável
- **Crianças**: tabela ordenada por urgência, busca por nome ou mãe, cinco
  pastilhas mostrando quais critérios estão cumpridos, pontuação e n/9
- **Checklist da criança**: cada linha com `−` / `+`, prazo restante em dias,
  vacinas como quatro botões que ligam e desligam. Toda alteração grava na
  hora em `pacientes.json`
- Cadastro e edição de dados da criança

Testado de ponta a ponta no navegador: login por sessão, `+` gravando em
disco (confirmado relendo a API), pontuação e barras recalculando na mesma
hora, casos de prazo vencido.

---

## Próximos passos possíveis

1. **Importar o relatório oficial.** O PDF do e-SUS já traz exatamente estas
   colunas — dava para colar o texto e preencher os contadores de uma vez,
   em vez de digitar criança por criança.
2. **Notificação de verdade.** Hoje o aviso existe quando ela abre a tela.
   Para chegar sem ela pedir: `node-cron` no `app.js` + `nodemailer`
   (já usado no CRM dele) enviando o resumo semanal de quem está apertado.
3. **Outros programas.** Gestante (pré-natal) é o próximo natural: nova lista
   de critérios e um `avaliarGestante()` irmão, reaproveitando painel e fila.

---

## ⚠️ Antes de colocar paciente real aqui

Isto é importante e está parcialmente resolvido.

Nome de criança, nome da mãe, telefone, microárea e histórico de atendimento
são **dado pessoal sensível de saúde** (LGPD, art. 11). O desenho atual não é
adequado para dados reais:

- ~~`pacientes.json` versionado no Git~~ **Resolvido em 21/08/2026**:
  `git rm --cached`, entrada no `.gitignore` e removido do `git add` do sync
  ANTES de os dados reais entrarem. O histórico local só tem as fictícias e
  nunca houve remoto.
- Uma senha única compartilhada, sem usuário individual, sem registro de quem
  acessou o quê.
- Hospedagem compartilhada, sem criptografia em repouso.

Se o sistema for usado com pacientes reais, o mínimo é: tirar `pacientes.json`
do Git, banco de verdade com acesso restrito (o Postgres/Supabase do CRM dele
já serve), login por pessoa, e registro de acesso. Vale também confirmar com a
unidade de saúde se o dado pode sair do e-SUS — o prontuário é do serviço, não
do profissional.

**Desde 21/08/2026 há dados reais no `pacientes.json` local** (fora do
Git). Os demais pontos — senha única, sem log de acesso, hospedagem — seguem
em aberto e precisam ser resolvidos antes do deploy.

---

## Deploy

Repo local já iniciado e commitado (`git log` mostra 1 commit, 28 arquivos,
`node_modules` fora). Falta o remoto — que eu não consigo criar (não há `gh`
instalado aqui). O padrão dele é um repo por site, conectado à Hostinger como
Web App com deploy automático por push.

1. Criar `tavaresmatias/josianetavares` no GitHub — **privado**, por causa dos
   dados e da senha em `app.js`
2. Depois:
   ```bash
   cd "/Users/tiagotavares/Documents/github/Josiane Tavares/site-josiane"
   git remote add origin git@github.com:tavaresmatias/josianetavares.git
   git branch -M main && git push -u origin main
   ```
3. Na Hostinger: novo Web App apontando para o repo, e definir
   `ADMIN_PASSWORD` (**diferente** da de dev), `SESSION_SECRET`,
   `GITHUB_TOKEN`, `GITHUB_REPO`, `PORT`
4. Apontar `drajosianetavares.com.br` para o app

Sem `GITHUB_TOKEN`/`GITHUB_REPO`, tudo que ela editar pelo painel se perde no
próximo deploy.

---

## Pendências do site (fora do sistema)

- Cidade/UF e e-mail ainda estão como `[PLACEHOLDER]` (painel → Dados gerais)
- Fotos definitivas dela — as atuais são recorte de uma foto de corredor.
  ⚠️ `.heic` de iPhone precisa de `ImageOps.exif_transpose` do Pillow, senão
  sai deitada (`sips` sozinho ignora o EXIF)
- Indicações/afiliados são placeholder
- Decidir o "Dra.": o COFEN só admite o título para quem tem doutorado. Se ela
  não tiver, o site deveria dizer "Enfermeira Josiane Tavares" e o domínio
  ficar só como endereço.
