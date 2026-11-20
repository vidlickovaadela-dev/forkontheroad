// GET  /api/komentare?clanok=<id>  → schválené komentáre k článku
// POST /api/komentare  {clanok, meno, text, web}  → nový komentár čaká na schválenie
import { json, pripravDB, hashIP } from "./_db.js";

const ID = /^[a-z0-9-]{1,120}$/;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ chyba: "Komentáre nie sú nastavené." }, 503);
  const clanok = new URL(request.url).searchParams.get("clanok") || "";
  if (!ID.test(clanok)) return json([]);
  await pripravDB(env.DB);
  const { results } = await env.DB.prepare(
    "SELECT id, meno, text, vytvorene, odpoved FROM komentare WHERE clanok = ? AND schvalene = 1 ORDER BY vytvorene ASC"
  ).bind(clanok).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ chyba: "Komentáre nie sú nastavené." }, 503);
  let d;
  try { d = await request.json(); } catch { return json({ chyba: "Neplatná požiadavka." }, 400); }
  // Pasca na roboty: skryté pole "web" človek nevyplní
  if (d.web) return json({ ok: true });
  const clanok = String(d.clanok || "");
  const meno = String(d.meno || "").trim().slice(0, 60);
  const text = String(d.text || "").trim().slice(0, 3000);
  if (!ID.test(clanok)) return json({ chyba: "Neznámy článok." }, 400);
  if (meno.length < 1) return json({ chyba: "Napíš, prosím, svoje meno." }, 400);
  if (text.length < 2) return json({ chyba: "Komentár je prázdny." }, 400);

  await pripravDB(env.DB);
  const ip = await hashIP(request.headers.get("cf-connecting-ip") || "");
  const pred10min = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { pocet } = await env.DB.prepare(
    "SELECT COUNT(*) AS pocet FROM komentare WHERE ip = ? AND vytvorene > ?"
  ).bind(ip, pred10min).first();
  if (pocet >= 3) return json({ chyba: "Priveľa komentárov naraz. Skús to o chvíľu." }, 429);

  await env.DB.prepare(
    "INSERT INTO komentare (clanok, meno, text, vytvorene, ip) VALUES (?, ?, ?, ?, ?)"
  ).bind(clanok, meno, text, new Date().toISOString(), ip).run();
  return json({ ok: true });
}
