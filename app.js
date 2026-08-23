const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const crypto = require('crypto');
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
// Bloqueia acesso direto a arquivos de dados (pacientes.json é sensível/LGPD).
app.use((req, res, next) => {
  if (req.path === '/pacientes.json' || req.path === '/data.json') return res.status(404).end();
  next();
});

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
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar' });
  }
});

// ── Importação do CSV "Acompanhamento de condições de saúde" (e-SUS) ──
// Criptografa o CPF com AES-256-GCM usando ENCRYPTION_KEY (32 bytes em base64).
function encryptField(value) {
  if (!value || value === '-') return null;
  try {
    const keyB64 = process.env.ENCRYPTION_KEY || '';
    const key = Buffer.from(keyB64, 'base64');
    if (key.length !== 32) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  } catch (e) {
    return null;
  }
}

function parseDataBRparaISO(s) {
  if (!s || s === '-') return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function diasEntre(iso, base) {
  if (!iso || !base) return null;
  const a = new Date(iso + 'T00:00:00');
  const b = new Date(base + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}

const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/admin/pacientes/importar', checkAuth, uploadCsv.single('csv'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, erro: 'Nenhum arquivo enviado' });

    const texto = new TextDecoder('windows-1252').decode(req.file.buffer);
    const linhas = texto.split(/\r?\n/);
    const headerIdx = linhas.findIndex(l => l.startsWith('Nome;Data de nascimento'));
    if (headerIdx === -1) {
      return res.status(400).json({ ok: false, erro: 'Cabeçalho não reconhecido — envie o CSV de "Acompanhamento de condições de saúde" do e-SUS.' });
    }
    const headers = linhas[headerIdx].split(';').map(h => h.trim());

    const dados = loadPacientes();
    if (!Array.isArray(dados.criancas)) dados.criancas = [];
    const porNome = new Map(dados.criancas.map(c => [String(c.nome || '').trim().toUpperCase(), c]));

    let atualizados = 0, novos = 0;

    for (let i = headerIdx + 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;
      const valores = linha.split(';');
      if (valores.length < headers.length) continue;
      const row = {};
      headers.forEach((h, k) => { row[h] = (valores[k] || '').trim(); });

      const nome = row['Nome'];
      if (!nome) continue;
      const nascISO = parseDataBRparaISO(row['Data de nascimento']);
      if (!nascISO) continue;

      const sexoRaw = (row['Sexo'] || '').toLowerCase();
      const sexo = sexoRaw.startsWith('femin') ? 'F' : sexoRaw.startsWith('masc') ? 'M' : '';

      const dVis1 = diasEntre(parseDataBRparaISO(row['Data da primeira visita domiciliar']), nascISO);
      const dVis2 = diasEntre(parseDataBRparaISO(row['Data da segunda visita domiciliar']), nascISO);
      const vis30d = (dVis1 !== null && dVis1 <= 30) ? 1 : 0;
      const vis6m = (dVis2 !== null && dVis2 <= 240) ? 1 : ((dVis1 !== null && dVis1 > 30 && dVis1 <= 240) ? 1 : 0);

      const d1cons = diasEntre(parseDataBRparaISO(row['Data da primeira consulta']), nascISO);
      const cons30d = (d1cons !== null && d1cons <= 30) ? 1 : 0;

      const cons2a = parseInt(row['Quantidade de consultas até 24 meses'] || '0', 10) || 0;
      const pesalt2a = parseInt(row['Quantidade de medições de peso/altura simultâneas até 24 meses'] || '0', 10) || 0;

      const temVacina = col => { const v = row[col]; return !!v && v !== '-'; };
      const vacinas = {
        penta: temVacina('Difteria, Tétano, Pertusis, Hepatite B, Haemophilus Influenza B'),
        vip: temVacina('Poliomielite'),
        scr: temVacina('Sarampo, Caxumba, Rubéola'),
        pneumo10v: temVacina('Pneumocócica')
      };

      const telefoneCsv = (row['Telefone celular'] && row['Telefone celular'] !== '-') ? row['Telefone celular'] : '';
      const microareaCsv = (row['Microárea'] || '').replace(/"/g, '');
      const cpfEnc = encryptField(row['CPF']);

      const chave = nome.trim().toUpperCase();
      const existente = porNome.get(chave);

      if (existente) {
        Object.assign(existente, {
          nascimento: nascISO,
          sexo: sexo || existente.sexo,
          telefone: telefoneCsv || existente.telefone,
          microarea: microareaCsv || existente.microarea,
          vis30d, vis6m, cons30d, cons2a, pesalt2a, vacinas,
          cpf_enc: cpfEnc || existente.cpf_enc
        });
        atualizados++;
      } else {
        const nova = {
          id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
          nome, nascimento: nascISO, sexo, mae: '', telefone: telefoneCsv, microarea: microareaCsv, obs: '',
          vis30d, vis6m, cons30d, cons2a, pesalt2a, vacinas, cpf_enc: cpfEnc
        };
        dados.criancas.push(nova);
        porNome.set(chave, nova);
        novos++;
      }
    }

    fs.writeFileSync(PACIENTES_FILE, JSON.stringify(dados, null, 2), 'utf8');
    res.json({ ok: true, novos, atualizados, total: dados.criancas.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, erro: 'Erro ao processar o CSV' });
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
