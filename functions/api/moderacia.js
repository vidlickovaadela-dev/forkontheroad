// Schvaľovanie komentárov (vyžaduje hlavičku x-heslo = MODERACIA_HESLO)
// GET  /api/moderacia            → všetky komentáre (najnovšie navrchu)
// POST /api/moderacia {id, akcia: "schval" | "skry" | "zmaz" | "odpovedz", odpoved}
import { json, pripravDB, overHeslo } from "./_db.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ chyba: "Chýba databáza (väzba DB)." }, 503);
  if (!env.MODERACIA_HESLO) return json({ chyba: "Chýba heslo MODERACIA_HESLO v nastaveniach Cloudflare." }, 503);
  if (!overHeslo(request, env)) return json({ chyba: "Nesprávne heslo." }, 401);
  await pripravDB(env.DB);
  const { results } = await env.DB.prepare(
    "SELECT id, clanok, meno, text, vytvorene, schvalene, odpoved FROM komentare ORDER BY schvalene ASC, vytvorene DESC LIMIT 500"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.MODERACIA_HESLO) return json({ chyba: "Komentáre nie sú nastavené." }, 503);
  if (!overHeslo(request, env)) return json({ chyba: "Nesprávne heslo." }, 401);
  let d;
  try { d = await request.json(); } catch { return json({ chyba: "Neplatná požiadavka." }, 400); }
  const id = Number(d.id);
  if (!Number.isInteger(id)) return json({ chyba: "Chýba id." }, 400);
  await pripravDB(env.DB);
  const db = env.DB;
  if (d.akcia === "schval") await db.prepare("UPDATE komentare SET schvalene = 1 WHERE id = ?").bind(id).run();
  else if (d.akcia === "skry") await db.prepare("UPDATE komentare SET schvalene = 0 WHERE id = ?").bind(id).run();
  else if (d.akcia === "zmaz") await db.prepare("DELETE FROM komentare WHERE id = ?").bind(id).run();
  else if (d.akcia === "odpovedz") {
    const o = String(d.odpoved || "").trim().slice(0, 3000) || null;
    await db.prepare("UPDATE komentare SET odpoved = ? WHERE id = ?").bind(o, id).run();
  } else return json({ chyba: "Neznáma akcia." }, 400);
  return json({ ok: true });
}
