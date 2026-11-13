// Spustí ho Netlify pri každom uložení článku: zo všetkých súborov
// v priečinku "clanky" poskladá jeden zoznam clanky.json pre web.
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "clanky");
const clanky = fs.readdirSync(dir)
  .filter(f => f.endsWith(".json"))
  .map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return { id: f.replace(/\.json$/, ""), ...data };
  })
  .filter(c => !c.koncept)
  .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
fs.writeFileSync(path.join(__dirname, "clanky.json"), JSON.stringify(clanky));
console.log(`clanky.json: ${clanky.length} článkov`);
