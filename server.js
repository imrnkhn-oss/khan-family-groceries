const http = require("http");
const fs = require("fs");
const path = require("path");
const { apply, emptyState } = require("./shared");

const PORT = process.env.PORT || 3000;
let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false } });
}
let memory = emptyState(); // used only when no database is configured (local testing)

async function init() {
  if (!pool) return;
  await pool.query("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value JSONB NOT NULL)");
  await pool.query("INSERT INTO kv (key, value) VALUES ('groceries', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify(emptyState())]);
}
async function load() {
  if (!pool) return memory;
  const r = await pool.query("SELECT value FROM kv WHERE key = 'groceries'");
  const s = r.rows[0] ? r.rows[0].value : emptyState();
  s.items = s.items || []; s.history = s.history || []; s.applied = s.applied || [];
  return s;
}
async function save(s) {
  if (!pool) { memory = s; return; }
  await pool.query("UPDATE kv SET value = $1 WHERE key = 'groceries'", [JSON.stringify(s)]);
}
// One change at a time, so two phones saving together can't overwrite each other.
let chain = Promise.resolve();
function serial(fn) { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; }

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ""; req.on("data", c => { data += c; if (data.length > 1e5) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); } });
  });
}
const STATIC = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/shared.js": ["shared.js", "text/javascript; charset=utf-8"],
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, { ok: true });
    if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, await load());
    if (req.method === "POST" && url.pathname === "/api/ops") {
      const body = await readBody(req);
      const ops = Array.isArray(body.ops) ? body.ops.slice(0, 50) : [];
      const state = await serial(async () => {
        const s = await load(); let changed = false;
        for (const op of ops) changed = apply(s, op) || changed;
        if (changed) await save(s);
        return s;
      });
      return send(res, 200, state);
    }
    if (req.method === "GET" && STATIC[url.pathname]) {
      const [file, type] = STATIC[url.pathname];
      return send(res, 200, fs.readFileSync(path.join(__dirname, file), "utf8"), type);
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "Something went wrong saving the list. Try again." });
  }
});

init().then(() => server.listen(PORT, () => console.log("Khan Family Groceries on port " + PORT)))
  .catch(e => { console.error("Database setup failed", e); process.exit(1); });
