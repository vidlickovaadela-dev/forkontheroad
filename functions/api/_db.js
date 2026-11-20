// Spoločné pomôcky pre komentáre (Cloudflare D1, väzba s názvom DB)
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function pripravDB(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS komentare (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clanok TEXT NOT NULL,
    meno TEXT NOT NULL,
    text TEXT NOT NULL,
    vytvorene TEXT NOT NULL,
    schvalene INTEGER NOT NULL DEFAULT 0,
    odpoved TEXT,
    ip TEXT
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_komentare_clanok ON komentare (clanok, schvalene)`).run();
}

export async function hashIP(ip) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("fotr:" + ip));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function overHeslo(request, env) {
  const heslo = env.MODERACIA_HESLO;
  const zadane = request.headers.get("x-heslo") || "";
  if (!heslo || zadane.length !== heslo.length) return false;
  let r = 0;
  for (let i = 0; i < heslo.length; i++) r |= heslo.charCodeAt(i) ^ zadane.charCodeAt(i);
  return r === 0;
}
