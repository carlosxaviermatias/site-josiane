const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');
const IMG_DIR = path.join(__dirname, 'img');

// ── Upload de imagens ────────────────────────────────────────────────
const upload = multer({
  dest: IMG_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

// ── Middleware ───────────────────────────────────────────────────────
// index:false → a rota '/' decide qual HTML servir
app.use(express.static(__dirname, { index: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'josiane-secret-key-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true }
}));

// Senha da área restrita — definir ADMIN_PASSWORD nas variáveis de ambiente.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'josiane2026';

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Erro ao carregar data.json:', e);
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Sincronização com o GitHub ───────────────────────────────────────
// Commita data.json + imagens de volta ao repositório para que as edições
// feitas no painel não se percam no próximo deploy.
// Variáveis necessárias: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (opcional).
function syncToGitHub(message) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    console.log('ℹ️ GITHUB_TOKEN/GITHUB_REPO não configurados — edições salvas só localmente.');
    return;
  }

  const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
  const cmd = [
    `cd ${JSON.stringify(__dirname)}`,
    'git add data.json img',
    `git -c user.name="Painel Josiane" -c user.email="painel@drajosianetavares.com.br" commit -m ${JSON.stringify(message)} || true`,
    `git push ${JSON.stringify(remote)} HEAD:${branch}`
  ].join(' && ');

  exec(cmd, (err, stdout, stderr) => {
    if (err) console.error('⚠️ Falha no sync com o GitHub:', stderr || err.message);
    else console.log('✅ Sync com o GitHub concluído.');
  });
}

function checkAuth(req, res, next) {
  if (req.session && req.session.autenticado) return next();
  return res.status(401).json({ erro: 'Não autorizado' });
}

// ── API pública ──────────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

app.get('/api/artigos', (req, res) => {
  const data = loadData();
  const artigos = (data.artigos || []).filter(a => a.publicado !== false);
  res.json(artigos);
});

app.get('/api/artigos/:slug', (req, res) => {
  const data = loadData();
  const artigo = (data.artigos || []).find(a => a.slug === req.params.slug);
  if (!artigo || artigo.publicado === false) return res.status(404).json({ erro: 'Artigo não encontrado' });
  res.json(artigo);
});

app.get('/api/temas/:id', (req, res) => {
  const data = loadData();
  const tema = (data.temas || []).find(t => String(t.id) === String(req.params.id));
  if (!tema) return res.status(404).json({ erro: 'Tema não encontrado' });
  res.json(tema);
});

// ── Autenticação ─────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { senha } = req.body;
  if (senha === ADMIN_PASSWORD) {
    req.session.autenticado = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, erro: 'Senha incorreta' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/sessao', (req, res) => {
  res.json({ autenticado: !!(req.session && req.session.autenticado) });
});

// ── API do painel ────────────────────────────────────────────────────
app.get('/api/admin/data', checkAuth, (req, res) => {
  res.json(loadData());
});

app.post('/api/admin/data', checkAuth, (req, res) => {
  try {
    saveData(req.body);
    syncToGitHub('Painel: atualiza conteúdo do site');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar' });
  }
});

app.post('/api/admin/upload', checkAuth, upload.single('imagem'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const nomeFinal = `${Date.now()}${ext}`;
  const destino = path.join(IMG_DIR, nomeFinal);
  fs.renameSync(req.file.path, destino);
  syncToGitHub(`Painel: nova imagem ${nomeFinal}`);
  res.json({ ok: true, caminho: `img/${nomeFinal}` });
});

// ── Sistema de puericultura (área restrita) ──────────────────────────
const PACIENTES_FILE = path.join(__dirname, 'pacientes.json');

function loadPacientes() {
  try {
    return JSON.parse(fs.readFileSync(PACIENTES_FILE, 'utf8'));
  } catch (e) {
    return { criancas: [] };
  }
}

app.get('/api/admin/pacientes', checkAuth, (req, res) => {
  res.json(loadPacientes());
});

app.post('/api/admin/pacientes', checkAuth, (req, res) => {
  try {
    fs.writeFileSync(PACIENTES_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    syncToGitHub('Painel: atualiza registros de puericultura');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar' });
  }
});

// ── Rotas de página ──────────────────────────────────────────────────
const pagina = (arquivo) => (req, res) => res.sendFile(path.join(__dirname, arquivo));

app.get('/', pagina('index.html'));
app.get('/artigos', pagina('artigos.html'));
app.get('/artigo/:slug', pagina('artigo.html'));
app.get('/tema/:id', pagina('tema.html'));
app.get('/indicacoes', pagina('indicacoes.html'));
app.get('/faq', pagina('faq.html'));
app.get('/sistema', pagina('admin/index.html'));
app.get('/sistema/pacientes', pagina('admin/pacientes.html'));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`Site da Josiane rodando em http://localhost:${PORT}`);
});
