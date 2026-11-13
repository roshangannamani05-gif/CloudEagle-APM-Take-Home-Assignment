const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const DEPTS = ['Engineering', 'Marketing', 'Sales', 'Support', 'Finance'];
const STATUSES = ['approved', 'shadow', 'blocked'];

const seed = () => ({
  day: 25, cap: 60,
  limits: { Engineering: 20, Marketing: 10, Sales: 12, Support: 8, Finance: 10 },
  hist: [21, 27, 33, 39, 45], months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  tools: [
    { name: 'ChatGPT Team', status: 'approved', s: [4.0, 4.0, 3.0, 2.0, 1.1] },
    { name: 'Claude Team', status: 'approved', s: [5.0, 2.5, 2.5, 1.5, 0.8] },
    { name: 'GitHub Copilot', status: 'approved', s: [8.0, 0, 0.5, 0.3, 1.0] },
    { name: 'Midjourney', status: 'approved', s: [0, 3.5, 0.5, 0, 0] },
    { name: 'Perplexity', status: 'shadow', s: [0.9, 0.6, 1.4, 0.8, 0.2] },
    { name: '5 other tools', status: 'shadow', s: [0.5, 0.6, 1.0, 1.5, 0.5] }
  ]
});

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return seed(); } }
function save() { try { fs.writeFileSync(FILE, JSON.stringify(db)); } catch (e) { console.error('save failed:', e.message); } }
let db = load();

const validTool = t => t && typeof t.name === 'string' && STATUSES.includes(t.status) &&
  Array.isArray(t.s) && t.s.length === DEPTS.length && t.s.every(n => typeof n === 'number' && n >= 0);

// Current state
app.get('/api/state', (req, res) => res.json(db));

// Update cap, department limits and tool statuses (approve / block)
app.put('/api/state', (req, res) => {
  const { cap, limits, tools } = req.body || {};
  if (cap !== undefined) { if (!(cap > 0)) return res.status(400).json({ error: 'cap must be > 0' }); db.cap = cap; }
  if (limits) {
    for (const [d, v] of Object.entries(limits)) {
      if (!DEPTS.includes(d) || !(v > 0)) return res.status(400).json({ error: 'bad limit for ' + d });
      db.limits[d] = v;
    }
  }
  if (tools) {
    if (!Array.isArray(tools) || !tools.every(validTool)) return res.status(400).json({ error: 'bad tools' });
    db.tools = tools;
  }
  save(); res.json(db);
});

// Ingest spend from any source (card feed, vendor usage API, webhook).
// POST { "tool": "Perplexity", "department": "Sales", "amount": 0.4 }   amount in $K
function addUsage(tool, department, amount) {
  const i = DEPTS.indexOf(department);
  if (i < 0 || !tool || !(amount > 0)) return null;
  let t = db.tools.find(x => x.name.toLowerCase() === String(tool).toLowerCase());
  if (!t) { t = { name: String(tool), status: 'shadow', s: DEPTS.map(() => 0) }; db.tools.push(t); } // unknown tool => shadow AI
  t.s[i] = +(t.s[i] + amount).toFixed(2);
  save(); return t;
}
app.post('/api/usage', (req, res) => {
  const { tool, department, amount } = req.body || {};
  const t = addUsage(tool, department, amount);
  if (!t) return res.status(400).json({ error: 'need tool, department (one of ' + DEPTS.join(', ') + '), amount > 0' });
  res.json(t);
});

// Demo helper: random usage event
app.post('/api/simulate', (req, res) => {
  const names = [...db.tools.map(t => t.name), 'Notion AI', 'Gemini'];
  const t = addUsage(names[Math.floor(Math.random() * names.length)],
    DEPTS[Math.floor(Math.random() * DEPTS.length)], +(0.2 + Math.random() * 1.3).toFixed(2));
  res.json(t);
});

app.post('/api/reset', (req, res) => { db = seed(); save(); res.json(db); });

app.get('/api/export.csv', (req, res) => {
  const rows = [['Tool', 'Status', ...DEPTS, 'Total ($K)']];
  db.tools.forEach(t => rows.push([t.name, t.status, ...t.s, t.s.reduce((a, b) => a + b, 0).toFixed(1)]));
  res.type('text/csv').attachment('ai-spend.csv').send(rows.map(r => r.join(',')).join('\n'));
});

app.get('/healthz', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('AI Governance Dashboard on port ' + PORT));
