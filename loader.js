/* ═══════════════════════════════════════════════════════════════
   loader.js — busca o conteúdo em /api/data e monta as páginas.
   Tudo o que aparece no site vem do data.json, editável pelo painel.
   ═══════════════════════════════════════════════════════════════ */

let DADOS = null;

async function dados() {
  if (!DADOS) DADOS = await (await fetch('/api/data')).json();
  return DADOS;
}

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const el = (attr) => document.querySelector(`[${attr}]`);

function esc(txt = '') {
  return String(txt).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Converte o texto do data.json: **negrito em linha isolada** vira subtítulo,
// **negrito no meio** vira <strong>, quebras duplas viram parágrafos.
function formatar(texto = '') {
  return texto.split(/\n\n+/).map(bloco => {
    const b = bloco.trim();
    const titulo = b.match(/^\*\*(.+)\*\*$/);
    if (titulo) return `<h3>${esc(titulo[1])}</h3>`;
    return `<p>${esc(b).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function dataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${d} de ${meses[Number(m) - 1]} de ${a}`;
}

function foto(src, alt, fallback = '') {
  if (src && !/placeholder/i.test(src)) {
    return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"
      onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div class=\\'sem-foto\\'>${esc(fallback)}</div>')">`;
  }
  return `<div class="sem-foto">${esc(fallback)}</div>`;
}

const ICONES = {
  gestacao: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="24" cy="11" r="5"/><path d="M24 16c-6 0-9 5-9 11 0 7 4 9 4 14h10c0-5 4-6 4-13"/><circle cx="26" cy="28" r="6"/></svg>',
  puerperio: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 40V22a10 10 0 0 1 20 0v18"/><circle cx="24" cy="13" r="5"/><path d="M20 40v-8a4 4 0 0 1 8 0v8"/></svg>',
  preventivo: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M24 41s-14-8-14-19a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 11-14 19-14 19z"/><path d="M17 26h5l2-5 3 9 2-4h4"/></svg>',
  padrao: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="24" cy="24" r="15"/><path d="M24 17v14M17 24h14"/></svg>'
};

// ── Header e rodapé (todas as páginas) ───────────────────────────
function renderHeader(cfg, ativo = '') {
  const alvo = el('data-header');
  if (!alvo) return;
  const itens = [
    ['/#inicio', 'Início', 'inicio'],
    ['/#sobre', 'Sobre', 'sobre'],
    ['/#temas', 'Saúde da mulher', 'temas'],
    ['/#enfermagem', 'Enfermagem', 'enfermagem'],
    ['/artigos', 'Artigos', 'artigos'],
    ['/faq', 'Dúvidas', 'faq'],
    ['/indicacoes', 'Indicações', 'indicacoes']
  ];
  alvo.innerHTML = `
    <header id="header">
      <div class="container header-inner">
        <a href="/" class="logo">
          <span class="logo-nome">${esc(cfg.titulo || cfg.nome)}</span>
          <span class="logo-sub">${esc(cfg.profissao)} • ${esc(cfg.especialidade)}</span>
        </a>
        <button class="menu-toggle" aria-label="Abrir menu" onclick="document.querySelector('.nav').classList.toggle('aberto')">☰</button>
        <nav class="nav" onclick="if (event.target.tagName === 'A') this.classList.remove('aberto')">
          ${itens.map(([href, txt, id]) =>
            `<a href="${href}"${id === ativo ? ' class="ativo"' : ''}>${txt}</a>`).join('')}
        </nav>
      </div>
    </header>`;
}

function renderRodape(d) {
  const alvo = el('data-rodape');
  if (!alvo) return;
  const cfg = d.config || {};
  const rod = d.rodape || {};
  alvo.innerHTML = `
    <footer id="rodape">
      <div class="container">
        <div class="rodape-topo">
          <div>
            <span class="logo-nome">${esc(cfg.titulo || cfg.nome)}</span>
            <p style="margin:.6rem 0 1.4rem; font-size:.8rem; letter-spacing:.16em; text-transform:uppercase; color:var(--rose-claro)">
              ${esc(cfg.profissao)} — ${esc(cfg.coren)}
            </p>
            <p class="rodape-aviso">${esc(rod.aviso || '')}</p>
          </div>
          <div>
            <h4>Navegação</h4>
            <div class="rodape-links">
              <a href="/#sobre">Sobre</a>
              <a href="/#temas">Saúde da mulher</a>
              <a href="/#enfermagem">Enfermagem geral</a>
              <a href="/artigos">Artigos</a>
              <a href="/faq">Dúvidas frequentes</a>
              <a href="/indicacoes">Indicações</a>
            </div>
          </div>
          <div>
            <h4>Temas</h4>
            <div class="rodape-links">
              ${(d.temas || []).slice(0, 6).map(t =>
                `<a href="/tema/${esc(t.id)}">${esc(t.titulo)}</a>`).join('')}
            </div>
          </div>
        </div>
        <div class="rodape-base">
          <span>© ${new Date().getFullYear()} ${esc(rod.creditos || cfg.nome)}</span>
          <span><a href="/admin">Área restrita</a></span>
        </div>
      </div>
    </footer>`;
}

// ── Página inicial ───────────────────────────────────────────────
async function renderHome() {
  const d = await dados();
  const cfg = d.config || {};
  renderHeader(cfg, 'inicio');

  const h = d.hero || {};
  el('data-hero-tagline').textContent = h.tagline || '';
  el('data-hero-titulo').textContent = h.titulo || '';
  el('data-hero-sub').textContent = h.subtitulo || '';
  const cta = el('data-hero-cta');
  cta.textContent = h.ctaTexto || 'Ver os temas';
  cta.href = h.ctaLink || '#temas';
  el('data-hero-meta').innerHTML = [cfg.profissao, cfg.coren, cfg.cidade]
    .filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('');
  el('data-hero-foto').innerHTML = foto(h.foto, cfg.nome, 'Foto');

  const p = d.pilares || {};
  el('data-pilares-titulo').textContent = p.titulo || '';
  el('data-pilares').innerHTML = (p.itens || []).map(i => `
    <article class="pilar">
      <div class="pilar-icone">${ICONES[i.icone] || ICONES.padrao}</div>
      <h3>${esc(i.titulo)}</h3>
      <p>${esc(i.texto)}</p>
    </article>`).join('');

  const s = d.sobre || {};
  el('data-sobre-label').textContent = s.label || 'Sobre';
  el('data-sobre-titulo').textContent = s.titulo || '';
  el('data-sobre-paragrafos').innerHTML = (s.paragrafos || []).map(t => `<p>${esc(t)}</p>`).join('');
  el('data-sobre-foto').innerHTML = foto(s.foto, cfg.nome, '');

  el('data-temas').innerHTML = (d.temas || []).map(t => `
    <a class="tema-card" href="/tema/${esc(t.id)}">
      <div class="tema-card-img">${foto(t.imagem, t.titulo, t.titulo.charAt(0))}</div>
      <div class="tema-card-corpo">
        <h3>${esc(t.titulo)}</h3>
        <p>${esc(t.resumo)}</p>
        <span class="link-seta" style="margin-top:1.2rem">Ler</span>
      </div>
    </a>`).join('');

  const e = d.enfermagem || {};
  el('data-enf-label').textContent = e.label || '';
  el('data-enf-titulo').textContent = e.titulo || '';
  el('data-enf-texto').textContent = e.texto || '';
  el('data-enf-itens').innerHTML = (e.itens || []).map(i => `
    <div class="enf-item"><h3>${esc(i.titulo)}</h3><p>${esc(i.texto)}</p></div>`).join('');

  const a = d.alerta || {};
  el('data-alerta-titulo').textContent = a.titulo || '';
  el('data-alerta-sub').textContent = a.subtitulo || '';
  el('data-alerta-itens').innerHTML = (a.itens || []).map(i => `<li>${esc(i)}</li>`).join('');
  el('data-alerta-rodape').textContent = a.rodape || '';

  el('data-artigos-home').innerHTML = (d.artigos || [])
    .filter(x => x.publicado !== false).slice(0, 3).map(cardArtigo).join('');

  renderRodape(d);
}

function cardArtigo(a) {
  return `
    <a class="artigo-card" href="/artigo/${esc(a.slug)}">
      <div class="artigo-card-img">${foto(a.imagem, a.titulo, a.titulo.charAt(0))}</div>
      <div class="artigo-data">${dataBR(a.data)}</div>
      <h3>${esc(a.titulo)}</h3>
      <p>${esc(a.resumo)}</p>
      <span class="link-seta" style="margin-top:1rem">Ler artigo</span>
    </a>`;
}

// ── Página de tema ───────────────────────────────────────────────
async function renderTema() {
  const d = await dados();
  renderHeader(d.config || {}, 'temas');
  const id = decodeURIComponent(location.pathname.split('/tema/')[1] || '');
  const t = (d.temas || []).find(x => String(x.id) === id);

  if (!t) {
    el('data-conteudo').innerHTML = `<div class="container-estreito"><h2>Tema não encontrado</h2>
      <p><a class="link-seta" href="/#temas">Ver todos os temas</a></p></div>`;
    renderRodape(d);
    return;
  }

  document.title = `${t.titulo} — ${d.config.titulo || d.config.nome}`;
  el('data-pagina-hero').innerHTML = `
    <div class="container-estreito">
      <a class="voltar" href="/#temas">Todos os temas</a>
      <span class="label">Saúde da mulher</span>
      <h1>${esc(t.titulo)}</h1>
      <p>${esc(t.resumo)}</p>
    </div>`;
  el('data-conteudo').innerHTML = `
    ${t.imagem ? `<div class="container-estreito"><div class="conteudo-capa">${foto(t.imagem, t.titulo, '')}</div></div>` : ''}
    <div class="container-estreito"><div class="conteudo-texto">${formatar(t.conteudo)}</div></div>`;
  renderRodape(d);
}

// ── Lista de artigos ─────────────────────────────────────────────
async function renderArtigos() {
  const d = await dados();
  renderHeader(d.config || {}, 'artigos');
  el('data-pagina-hero').innerHTML = `
    <div class="container">
      <span class="label">Artigos</span>
      <h1>Textos sobre o cuidado</h1>
      <p>Leituras curtas sobre gestação, pós-parto, prevenção e as dúvidas que aparecem no dia a dia.</p>
    </div>`;
  const lista = (d.artigos || []).filter(a => a.publicado !== false)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  el('data-conteudo').innerHTML = `<div class="container">
    ${lista.length
      ? `<div class="artigos-grid">${lista.map(cardArtigo).join('')}</div>`
      : '<p>Nenhum artigo publicado ainda.</p>'}
  </div>`;
  renderRodape(d);
}

// ── Artigo individual ────────────────────────────────────────────
async function renderArtigo() {
  const d = await dados();
  renderHeader(d.config || {}, 'artigos');
  const slug = decodeURIComponent(location.pathname.split('/artigo/')[1] || '');
  const a = (d.artigos || []).find(x => x.slug === slug && x.publicado !== false);

  if (!a) {
    el('data-conteudo').innerHTML = `<div class="container-estreito"><h2>Artigo não encontrado</h2>
      <p><a class="link-seta" href="/artigos">Ver todos os artigos</a></p></div>`;
    renderRodape(d);
    return;
  }

  document.title = `${a.titulo} — ${d.config.titulo || d.config.nome}`;
  el('data-pagina-hero').innerHTML = `
    <div class="container-estreito">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem">
        <a class="voltar" href="/artigos">Todos os artigos</a>
        <button class="btn-pdf no-print" onclick="gerarPDF('${esc(a.titulo)}')">📥 Baixar PDF</button>
      </div>
      <span class="label">${dataBR(a.data)}</span>
      <h1>${esc(a.titulo)}</h1>
      <p>${esc(a.resumo)}</p>
    </div>`;
  el('data-conteudo').innerHTML = `
    ${a.imagem ? `<div class="container-estreito"><div class="conteudo-capa">${foto(a.imagem, a.titulo, '')}</div></div>` : ''}
    <div class="container-estreito"><div class="conteudo-texto" id="conteudo-pdf">${formatar(a.conteudo)}</div></div>`;
  renderRodape(d);
}

// ── Indicações (afiliados) ───────────────────────────────────────
async function renderIndicacoes() {
  const d = await dados();
  renderHeader(d.config || {}, 'indicacoes');
  const ind = d.indicacoes || {};
  el('data-pagina-hero').innerHTML = `
    <div class="container">
      <span class="label">Indicações</span>
      <h1>${esc(ind.titulo || 'Indicações')}</h1>
      <p>${esc(ind.subtitulo || '')}</p>
    </div>`;
  const itens = (ind.itens || []).filter(i => i.ativo !== false);
  el('data-conteudo').innerHTML = `<div class="container">
    ${itens.length ? `<div class="indic-grid">${itens.map(i => `
      <article class="indic-card">
        <div class="indic-card-img">${foto(i.imagem, i.titulo, '◇')}</div>
        <div class="indic-card-corpo">
          <div class="indic-categoria">${esc(i.categoria || '')}</div>
          <h3>${esc(i.titulo)}</h3>
          <p>${esc(i.descricao)}</p>
          <a class="btn btn-contorno" style="margin-top:1.4rem; align-self:flex-start"
             href="${esc(i.link || '#')}" target="_blank" rel="nofollow sponsored noopener">
            ${esc(i.botao || 'Ver produto')}
          </a>
        </div>
      </article>`).join('')}</div>` : '<p>Nenhuma indicação cadastrada ainda.</p>'}
    ${ind.aviso ? `<div class="indic-aviso">${esc(ind.aviso)}</div>` : ''}
  </div>`;
  renderRodape(d);
}

// ── Gerar PDF do artigo ─────────────────────────────────────────
function gerarPDF(titulo) {
  const elem = document.getElementById('conteudo-pdf');
  if (!elem) return alert('Conteúdo não encontrado');
  const opt = {
    margin: [15, 15, 15, 15],
    filename: `${titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };
  html2pdf().set(opt).from(elem).save();
}

/* ═══════════════════════════════════════════════════════════════
   FAQ interativo
   A visitante escolhe a fase em que está; se estiver grávida,
   informa a DUM (ou as semanas) e recebe os marcos daquele momento.
   As perguntas abaixo se filtram pela fase escolhida.
   ═══════════════════════════════════════════════════════════════ */

const FAQ = { fase: null, busca: '', abertas: new Set(), modo: 'dum', semanas: null, erro: '' };

async function renderFAQ() {
  const d = await dados();
  renderHeader(d.config || {}, 'faq');
  const f = d.faq || {};

  el('data-pagina-hero').innerHTML = `
    <div class="container">
      <span class="label">Perguntas frequentes</span>
      <h1>${esc(f.titulo || 'Perguntas frequentes')}</h1>
      <p>${esc(f.subtitulo || '')}</p>
    </div>`;

  el('data-conteudo').innerHTML = `
    <div class="container-estreito">

      <section class="faq-etapa">
        <div class="faq-etapa-titulo">
          <span class="faq-etapa-num">1</span>
          <h2>Onde você está agora?</h2>
        </div>
        <div class="trilha-grid" id="faq-trilha"></div>
      </section>

      <section class="faq-etapa" id="faq-calc-wrap" hidden>
        <div class="faq-etapa-titulo">
          <span class="faq-etapa-num">2</span>
          <h2>De quantas semanas você está?</h2>
        </div>
        <div class="calc" id="faq-calc"></div>
      </section>

      <section class="faq-etapa">
        <div class="faq-etapa-titulo">
          <span class="faq-etapa-num" id="faq-num-lista">2</span>
          <h2>Dúvidas frequentes</h2>
        </div>
        <div class="faq-controles">
          <input class="faq-busca" id="faq-busca" type="search"
                 placeholder="Buscar por palavra — ex.: vacina, sangramento, DIU"
                 oninput="FAQ.busca = this.value; faqLista()" />
        </div>
        <div id="faq-lista-wrap"></div>
      </section>

      ${f.aviso ? `<div class="faq-aviso">${esc(f.aviso)}</div>` : ''}
    </div>`;

  faqTrilha();
  faqLista();
  renderRodape(d);
}

function faqTrilha() {
  const f = DADOS.faq || {};
  el('data-conteudo').querySelector('#faq-trilha').innerHTML = (f.fases || []).map(x => `
    <button class="trilha-card ${FAQ.fase === x.id ? 'ativa' : ''}" onclick="faqEscolherFase('${x.id}')">
      <h3>${esc(x.titulo)}</h3>
      <p>${esc(x.texto)}</p>
    </button>`).join('');
}

function faqEscolherFase(id) {
  FAQ.fase = FAQ.fase === id ? null : id;
  FAQ.abertas.clear();
  faqTrilha();

  const wrap = document.getElementById('faq-calc-wrap');
  const gestante = FAQ.fase === 'gestante';
  wrap.hidden = !gestante;
  document.getElementById('faq-num-lista').textContent = gestante ? '3' : '2';
  if (gestante) faqCalc();
  else { FAQ.semanas = null; FAQ.erro = ''; }

  faqLista();
}

// ── Calculadora ─────────────────────────────────────────────────
function faqCalc() {
  const campo = FAQ.modo === 'dum'
    ? `<div>
         <label for="faq-dum">Primeiro dia da última menstruação</label>
         <input type="date" id="faq-dum" value="${FAQ.dum || ''}" max="${new Date().toISOString().slice(0, 10)}"
                onchange="faqCalcularDUM(this.value)" />
       </div>`
    : `<div>
         <label for="faq-sem">Semanas de gestação</label>
         <input type="number" id="faq-sem" min="1" max="42" placeholder="Ex.: 24" value="${FAQ.sem || ''}"
                oninput="faqCalcularSemanas(this.value)" />
       </div>`;

  document.getElementById('faq-calc').innerHTML = `
    <div class="calc-modos">
      <button class="calc-modo ${FAQ.modo === 'dum' ? 'ativo' : ''}" onclick="faqModo('dum')">Sei a data da última menstruação</button>
      <button class="calc-modo ${FAQ.modo === 'sem' ? 'ativo' : ''}" onclick="faqModo('sem')">Já sei de quantas semanas estou</button>
    </div>
    <div class="calc-campo">${campo}</div>
    <p class="calc-dica">A estimativa segue a regra de Näegele. A idade gestacional oficial é a definida no seu pré-natal, geralmente pela ultrassonografia do primeiro trimestre.</p>
    <div id="faq-resultado">${FAQ.erro ? `<p class="calc-dica" style="color:var(--rose)">${esc(FAQ.erro)}</p>` : ''}</div>`;

  if (FAQ.semanas != null && !FAQ.erro) faqResultado();
}

function faqModo(m) {
  FAQ.modo = m;
  FAQ.erro = ''; FAQ.semanas = null; FAQ.dpp = null;
  FAQ.dum = ''; FAQ.sem = '';
  faqCalc();
}

function faqCalcularDUM(valor) {
  FAQ.erro = ''; FAQ.semanas = null; FAQ.dpp = null; FAQ.dum = valor;
  if (!valor) return faqResultado();

  const dum = new Date(valor + 'T00:00:00');
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Math.floor((hoje - dum) / 86400000);

  if (dias < 0) FAQ.erro = 'A data informada está no futuro. Confira o dia.';
  else if (dias > 300) FAQ.erro = 'Essa data corresponde a mais de 42 semanas. Se o bebê já nasceu, escolha "Tive bebê há pouco" lá em cima.';
  else {
    FAQ.semanas = Math.floor(dias / 7);
    FAQ.dias = dias % 7;
    FAQ.dpp = new Date(dum.getTime() + 280 * 86400000);
  }
  faqResultado();
  faqLista();
}

function faqCalcularSemanas(valor) {
  FAQ.erro = ''; FAQ.dpp = null; FAQ.dias = 0; FAQ.sem = valor;
  const n = parseInt(valor, 10);
  if (!valor) { FAQ.semanas = null; return faqResultado(); }
  if (isNaN(n) || n < 1 || n > 42) { FAQ.semanas = null; FAQ.erro = 'Informe um número entre 1 e 42.'; }
  else {
    FAQ.semanas = n;
    FAQ.dpp = new Date(Date.now() + (40 - n) * 7 * 86400000);
  }
  faqResultado();
}

function faqResultado() {
  const alvo = document.getElementById('faq-resultado');
  if (!alvo) return;

  if (FAQ.erro) { alvo.innerHTML = `<p class="calc-dica" style="color:var(--rose)">${esc(FAQ.erro)}</p>`; return; }
  if (FAQ.semanas == null) { alvo.innerHTML = ''; return; }

  const s = FAQ.semanas;
  const trimestre = s <= 13 ? '1º trimestre' : s <= 27 ? '2º trimestre' : '3º trimestre';
  const faltam = Math.max(0, 40 - s);
  const marcos = (DADOS.faq.marcos || []);
  const agora = marcos.filter(m => s >= m.de && s <= m.ate);
  const proximo = marcos.find(m => m.de > s);

  alvo.innerHTML = `
    <div class="resultado">
      <div class="resultado-topo">
        <div class="resultado-dado">
          <span>Idade gestacional</span>
          <strong>${s} semanas${FAQ.dias ? ` e ${FAQ.dias}d` : ''}</strong>
          <small>${trimestre}</small>
        </div>
        <div class="resultado-dado">
          <span>Data provável do parto</span>
          <strong>${FAQ.dpp ? FAQ.dpp.toLocaleDateString('pt-BR') : '—'}</strong>
          <small>${faltam > 0 ? `faltam cerca de ${faltam} semanas` : 'a termo'}</small>
        </div>
      </div>

      <div class="barra"><i style="width:${Math.min(100, (s / 40) * 100).toFixed(1)}%"></i></div>
      <div class="barra-legenda"><span>1ª semana</span><span>40ª semana</span></div>

      ${agora.length ? agora.map(m => `
        <div class="marco agora">
          <span>Neste momento · ${m.de} a ${m.ate} semanas</span>
          <h4>${esc(m.titulo)}</h4>
          <p>${esc(m.texto)}</p>
        </div>`).join('') : ''}

      ${proximo ? `
        <div class="marco">
          <span>A seguir · a partir da ${proximo.de}ª semana</span>
          <h4>${esc(proximo.titulo)}</h4>
          <p>${esc(proximo.texto)}</p>
        </div>` : ''}

      <a class="link-seta" href="/tema/pre-natal">Ver o roteiro completo do pré-natal</a>
    </div>`;
}

// ── Lista de perguntas ──────────────────────────────────────────
function faqLista() {
  const f = DADOS.faq || {};
  const termo = FAQ.busca.trim().toLowerCase();

  let itens = (f.perguntas || []).map((q, i) => ({ ...q, i }));
  if (FAQ.fase) itens = itens.filter(q => (q.fases || []).includes(FAQ.fase));
  if (termo) itens = itens.filter(q => (q.p + ' ' + q.r).toLowerCase().includes(termo));

  const total = (f.perguntas || []).length;
  const filtrando = FAQ.fase || termo;
  const nomeFase = (f.fases || []).find(x => x.id === FAQ.fase)?.titulo;

  const contagem = filtrando
    ? `<p class="faq-contagem">${itens.length} de ${total} perguntas${nomeFase ? ` · ${esc(nomeFase.toLowerCase())}` : ''}<button onclick="faqLimpar()">ver todas</button></p>`
    : `<p class="faq-contagem">${total} perguntas</p>`;

  const temas = Object.fromEntries((DADOS.temas || []).map(t => [t.id, t.titulo]));

  el('data-conteudo').querySelector('#faq-lista-wrap').innerHTML = contagem + (itens.length ? `
    <div class="faq-lista">
      ${itens.map(q => `
        <div class="faq-item ${FAQ.abertas.has(q.i) ? 'aberto' : ''}">
          <button class="faq-pergunta" onclick="faqToggle(${q.i})">
            <i></i><span>${esc(q.p)}</span>
          </button>
          <div class="faq-resposta">
            <p>${esc(q.r)}</p>
            ${q.tema && temas[q.tema] ? `<a class="link-seta" href="/tema/${esc(q.tema)}">Ler sobre ${esc(temas[q.tema].toLowerCase())}</a>` : ''}
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="faq-vazio">
      <p>Nenhuma pergunta encontrada${termo ? ` para "${esc(FAQ.busca.trim())}"` : ''}.</p>
      <button class="btn btn-contorno" onclick="faqLimpar()">Ver todas as perguntas</button>
    </div>`);
}

function faqToggle(i) {
  FAQ.abertas.has(i) ? FAQ.abertas.delete(i) : FAQ.abertas.add(i);
  faqLista();
}

function faqLimpar() {
  FAQ.fase = null; FAQ.busca = ''; FAQ.abertas.clear();
  FAQ.semanas = null; FAQ.dpp = null; FAQ.erro = ''; FAQ.dum = ''; FAQ.sem = '';
  const b = document.getElementById('faq-busca');
  if (b) b.value = '';
  document.getElementById('faq-calc-wrap').hidden = true;
  document.getElementById('faq-num-lista').textContent = '2';
  faqTrilha();
  faqLista();
}
