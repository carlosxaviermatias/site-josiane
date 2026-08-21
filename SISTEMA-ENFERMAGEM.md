# Sistema Enfermagem

Documento de entrada para retomar este trabalho em conversa nova.
Última atualização: 21/08/2026.

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
**Regras são dados, não código** — mexer em `MARCOS` muda o comportamento.

### Os 9 marcos (calendário do MS)

Cada marco tem uma janela em **dias de vida**. Uma consulta (enfermeiro ou
médico) dentro da janela cumpre o marco. Cada consulta cumpre no máximo um.

| Marco | Alvo | Janela |
|---|---|---|
| 1ª semana | 7d | 0–30 |
| 1 mês | 30d | 16–75 |
| 2 meses | 61d | 46–107 |
| 4 meses | 122d | 107–168 |
| 6 meses | 183d | 168–244 |
| 9 meses | 274d | 244–335 |
| 12 meses | 365d | 335–470 |
| 18 meses | 548d | 470–650 |
| 24 meses | 730d | 650–800 |

Estado de cada marco: `feito` · `aberto` (janela corrente) · `perdido`
(janela passou sem consulta) · `futuro`.

### As 5 práticas

Cada prática devolve `{ feito, devido }` por criança. O percentual do painel
soma isso de todas e divide. Uma criança só entra no denominador quando a
prática **já era devida para a idade dela** — é o que evita punir recém-nascido.

| Prática | Cumpre quando | Devido quando |
|---|---|---|
| `consulta30` | 1ª consulta ≤ 30 dias de vida | idade > 30d |
| `puericult9` | marco cumprido | marco já esperado pela idade |
| `antropo9` | a consulta do marco tem **peso e altura** | idem |
| `visitas` | visita ACS ≤30d **e** outra entre 150–240d | cada janela vencida |
| `vacinas` | situação vacinal = "em dia" | cartão já verificado |

O **geral** é a média das cinco.

### Avisos

Recalculados a cada abertura da tela — não há fila persistida, então nunca
ficam obsoletos. Ordenados: atrasos primeiro (mais antigo no topo), depois os
que vencem antes. Cada aviso é clicável e leva à criança.

Um marco perdido para de avisar se houve **qualquer** atendimento depois da
janela — a criança voltou ao serviço, não é caso de busca ativa.

---

## Modelo de dados

`pacientes.json`, separado do `data.json` (que é o conteúdo do site).

```jsonc
{
  "criancas": [{
    "id": "c1",
    "nome": "...", "sexo": "F", "nascimento": "2026-08-09",
    "mae": "...", "telefone": "...", "microarea": "01", "obs": "",
    "vacinas": { "situacao": "em-dia|atraso|nao-verificado", "verificadoEm": "2026-07-20" },
    "atendimentos": [
      { "data": "2026-08-15", "tipo": "enfermeiro|medico|acs",
        "obs": "", "peso": 4.35, "altura": 54.2 }
    ]
  }]
}
```

`peso`/`altura` são opcionais — é a presença dos dois que conta a antropometria.
Em visita de ACS ficam vazios.

Hoje há **10 crianças fictícias**, com idades de 12 dias a 25 meses, cobrindo
de propósito todos os estados: em dia, a vencer, em atraso, completa,
consulta sem medidas, vacina não verificada.

---

## O que já funciona

- Visão geral: 4 cartões, **indicadores por prática** (barras + % + geral),
  donut de atendidas × com pendência, lista de avisos clicáveis
- Lista de crianças ordenada por urgência, com busca por nome ou mãe,
  progresso n/9 e "próximo passo" em texto
- Ficha da criança: as 4 verificações de prazo, progresso de consultas e de
  antropometria, **percentual das 5 práticas só dela**, linha do tempo dos 9
  marcos, registro de atendimento (com peso/altura), histórico com exclusão
- Cadastro e edição, incluindo situação vacinal
- Tudo grava em `pacientes.json` e entra no sync com o GitHub

Testado de ponta a ponta: login, cálculo das 5 práticas, registro de
atendimento refletindo no indicador na mesma hora, gravação em disco.

---

## Próximos passos possíveis

1. **Notificação de verdade.** Hoje o aviso existe quando ela abre a tela.
   Para chegar sem ela pedir: `node-cron` no `app.js` + `nodemailer`
   (já usado no CRM dele) enviando o resumo semanal. Precisa de servidor
   sempre ligado — na Hostinger funciona.
2. **Outros programas.** Gestante (pré-natal: 6 consultas + exames por
   trimestre) é o próximo natural. O caminho é uma nova tabela de marcos e um
   `avaliarGestante()` irmão do atual, reaproveitando painel e avisos.
3. **Curva de crescimento.** Já se guarda peso e altura; falta plotar contra
   as curvas da OMS (percentis) — seria útil de verdade na consulta.
4. **Importar do e-SUS.** Se houver export CSV, evita digitação dupla.
5. **Vacinas por dose** em vez de um estado único, se ela precisar do detalhe.

---

## ⚠️ Antes de colocar paciente real aqui

Isto é importante e não foi resolvido — hoje só há dados fictícios.

Nome de criança, nome da mãe, telefone, microárea e histórico de atendimento
são **dado pessoal sensível de saúde** (LGPD, art. 11). O desenho atual não é
adequado para dados reais:

- `pacientes.json` fica **versionado no Git** e vai para o GitHub a cada
  edição pelo sync. Histórico de commit é praticamente impossível de expurgar.
- Uma senha única compartilhada, sem usuário individual, sem registro de quem
  acessou o quê.
- Hospedagem compartilhada, sem criptografia em repouso.

Se o sistema for usado com pacientes reais, o mínimo é: tirar `pacientes.json`
do Git, banco de verdade com acesso restrito (o Postgres/Supabase do CRM dele
já serve), login por pessoa, e registro de acesso. Vale também confirmar com a
unidade de saúde se o dado pode sair do e-SUS — o prontuário é do serviço, não
do profissional.

**Enquanto for demonstração com dados fictícios, está tudo bem.**

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
