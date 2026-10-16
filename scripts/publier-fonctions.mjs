// Publie les edge functions Supabase — sans passer par Lovable.
//
// Jusqu'au 16 octobre 2026, les fonctions se déployaient en demandant à
// Lovable de le faire, à 0,4 crédit l'unité. Le CLI Supabase fait la même
// chose gratuitement, et lit `supabase/config.toml` : les réglages
// verify_jwt de chaque fonction sont donc respectés sans rien préciser.
//
//     node scripts/publier-fonctions.mjs                 les fonctions modifiées par le dernier commit
//     node scripts/publier-fonctions.mjs send-email      une ou plusieurs, nommément
//     node scripts/publier-fonctions.mjs --toutes        les 59, une par une
//     node scripts/publier-fonctions.mjs --liste         ne publie rien, dit juste ce qui partirait
//
// Il faut un jeton d'accès Supabase dans l'environnement :
//
//     export SUPABASE_ACCESS_TOKEN=sbp_...
//
// On le fabrique sur https://supabase.com/dashboard/account/tokens

import { execSync, spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";

const PROJET = "oiotlgkfwuwshpwraneb";
const RACINE = "supabase/functions";

const vert = (s) => `\x1b[32m${s}\x1b[0m`;
const rouge = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const args = process.argv.slice(2);
const listeSeulement = args.includes("--liste");
const toutes = args.includes("--toutes");
const nommees = args.filter((a) => !a.startsWith("--"));

/** Toutes les fonctions du dépôt. Les dossiers en _ sont du code partagé. */
function fonctionsDuDepot() {
  return readdirSync(RACINE, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();
}

/** Les fonctions touchées par le dernier commit. */
function fonctionsModifiees() {
  let fichiers = [];
  try {
    fichiers = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf8" }).split("\n");
  } catch {
    return [];
  }
  const noms = new Set();
  for (const f of fichiers) {
    const m = f.match(/^supabase\/functions\/([^/_][^/]*)\//);
    if (m) noms.add(m[1]);
  }
  return [...noms].sort();
}

const existantes = fonctionsDuDepot();

let cibles;
if (toutes) cibles = existantes;
else if (nommees.length) cibles = nommees;
else cibles = fonctionsModifiees();

// Une faute de frappe sur un nom de fonction coûte cher : le CLI crée une
// nouvelle fonction vide au lieu de refuser. On vérifie avant.
const inconnues = cibles.filter((n) => !existantes.includes(n));
if (inconnues.length) {
  console.error(rouge(`Ces fonctions n'existent pas dans ${RACINE} :`));
  for (const n of inconnues) console.error(`  ${n}`);
  process.exit(1);
}

if (!cibles.length) {
  console.log("Rien à publier : le dernier commit ne touche aucune edge function.");
  console.log(gris("  (--toutes pour tout republier, ou donne des noms)"));
  process.exit(0);
}

console.log(`${cibles.length} fonction(s) à publier sur le projet ${PROJET} :`);
for (const n of cibles) console.log(`  ${n}`);

if (listeSeulement) process.exit(0);

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(rouge("\nIl manque SUPABASE_ACCESS_TOKEN dans l'environnement."));
  console.error("  Fabrique un jeton sur https://supabase.com/dashboard/account/tokens");
  console.error("  puis :  export SUPABASE_ACCESS_TOKEN=sbp_...");
  process.exit(1);
}

if (!existsSync("supabase/config.toml")) {
  console.error(rouge("\nsupabase/config.toml est introuvable — les réglages verify_jwt seraient perdus."));
  process.exit(1);
}

console.log("");
const ratees = [];
for (const [i, nom] of cibles.entries()) {
  process.stdout.write(`[${i + 1}/${cibles.length}] ${nom} … `);
  const r = spawnSync(
    "npx",
    ["supabase", "functions", "deploy", nom, "--project-ref", PROJET],
    { encoding: "utf8" },
  );
  if (r.status === 0) {
    console.log(vert("publiée"));
  } else {
    console.log(rouge("échec"));
    const detail = `${r.stderr ?? ""}${r.stdout ?? ""}`.trim().split("\n").slice(-4).join("\n      ");
    if (detail) console.log(gris(`      ${detail}`));
    ratees.push(nom);
  }
}

console.log("");
if (!ratees.length) {
  console.log(vert(`${cibles.length} fonction(s) publiée(s). Rien n'est passé par Lovable.`));
  process.exit(0);
}
console.log(rouge(`${ratees.length} échec(s) : ${ratees.join(", ")}`));
process.exit(1);
