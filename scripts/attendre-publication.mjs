#!/usr/bin/env node
// Attendre qu'une publication soit réellement en ligne, et le dire.
//
// Pousser sur GitHub ne met rien en ligne, et le déploiement met entre deux et
// vingt-cinq minutes à sortir. Entre les deux, le site sert encore l'ancien
// code : on a donc annoncé plusieurs fois « c'est publié » alors que l'écran
// de l'utilisateur ne montrait rien de neuf.
//
// Le repère est le nom du bundle d'entrée, qui contient une empreinte du
// contenu : si celui que sert le site est celui qu'on vient de construire,
// c'est publié — sans avoir à chercher une chaîne de caractères dans le code
// minifié, ce qui m'a déjà fait annoncer à tort une mise en ligne parce que la
// chaîne venait du commit précédent.
//
// Le script ne peut pas relancer le déploiement lui-même : celui-ci se
// déclenche par l'API Lovable, dont aucune clé n'est disponible ici
// (LOVABLE_API_KEY n'existe que comme secret d'edge function, et c'est la
// passerelle IA, pas l'API de déploiement). Il fait donc la seule chose utile
// à sa portée : repérer vite qu'un déclenchement est resté sans effet.
//
// Deux déploiements sur six ont été ignorés au premier appel et ont demandé un
// second. Le second a sorti le site en vingt secondes — le temps perdu n'était
// pas le déploiement, c'était l'attente avant de comprendre qu'il fallait
// relancer. D'où la détection d'enlisement : si le bundle servi n'a pas bougé
// depuis douze minutes, on sort tout de suite avec le code 3 et on le dit,
// plutôt que de laisser filer la demi-heure.
//
// Usage : node scripts/attendre-publication.mjs [minutes] [minutesEnlisement]

import { execSync } from "node:child_process";

const SITE = "https://discountcartegrise.fr";
const minutes = Number(process.argv[2] ?? 30);
// Au-dela de douze minutes sans le moindre mouvement, un declenchement est
// reste sans effet : les deploiements qui aboutissent sortent en sept a neuf
// minutes. Relancer est sans danger, l'appel est idempotent.
const enlisement = Number(process.argv[3] ?? 12) * 60_000;
const limite = Date.now() + minutes * 60_000;

// Le serveur injecte dans chaque page un script portant le SHA du commit
// deploye. C'est le repere exact, et le seul qui vaille : l'empreinte du
// bundle JavaScript ne bouge pas quand le commit ne touche que du contenu —
// un texte, un titre, le prerendu. Elle m'a fait annoncer une mise en ligne
// deux minutes avant qu'elle n'arrive.
const shaDe = (html) => html.match(/data-commit-sha="([0-9a-f]{40})"/)?.[1] ?? null;

// La cible est relue a chaque tour, et non figee au demarrage. Fige, un
// guetteur lance avant deux reconstructions attend un bundle qui ne sortira
// jamais, puis annonce un echec alors que tout s'est bien passe — c'est
// exactement ce qui est arrive, et un faux echec coute plus cher qu'un retard.
const cible = () =>
  execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

let attendu = cible();
if (!attendu) {
  console.error("Impossible de lire le commit local.");
  process.exit(2);
}
console.log(`attendu : ${attendu.slice(0, 10)}  ${execSync("git log -1 --format=%s", { encoding: "utf8" }).trim()}`);

const heure = () => new Date().toLocaleTimeString("fr-FR");
let precedent = null;
let dernierMouvement = Date.now();

while (Date.now() < limite) {
  const maintenant = cible();
  if (maintenant && maintenant !== attendu) {
    console.log(`\n(nouveau commit local : ${maintenant.slice(0, 10)} — c'est lui qu'on attend désormais)`);
    attendu = maintenant;
  }

  let enLigne = null;
  try {
    // Le paramètre casse les caches intermédiaires, qui serviraient sinon la
    // page d'il y a dix minutes et feraient croire que rien ne bouge.
    const r = await fetch(`${SITE}/?verif=${Date.now()}`, { cache: "no-store" });
    enLigne = shaDe(await r.text());
  } catch (e) {
    console.log(`${heure()}  site injoignable (${e.message})`);
  }

  if (enLigne === attendu) {
    console.log(`${heure()}  ${enLigne.slice(0, 10)}  <-- EN LIGNE`);
    process.exit(0);
  }

  if (enLigne && enLigne !== precedent) {
    // Un bundle différent de l'attendu ET du précédent : un déploiement est
    // bien sorti, mais ce n'est pas le nôtre — il en reste un derrière.
    console.log(`${heure()}  ${enLigne.slice(0, 10)}  (pas encore le nôtre)`);
    precedent = enLigne;
    dernierMouvement = Date.now();
  } else if (enLigne) {
    process.stdout.write(".");
  }

  if (Date.now() - dernierMouvement > enlisement) {
    const attente = Math.round((Date.now() - dernierMouvement) / 60_000);
    console.log(
      `\n${heure()}  RELANCER LE DÉPLOIEMENT — rien n'a bougé depuis ${attente} min.` +
        `\nLe site sert toujours ${enLigne?.slice(0, 10) ?? "?"}, on attend ${attendu.slice(0, 10)}.` +
        `\nUn déclenchement est resté sans effet : rappeler deploy_project suffit.`,
    );
    process.exit(3);
  }

  await new Promise((r) => setTimeout(r, 20_000));
}

console.log(`\n${heure()}  TOUJOURS PAS PUBLIÉ après ${minutes} min — relancer le déploiement.`);
process.exit(1);
