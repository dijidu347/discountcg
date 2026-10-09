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
// Usage : node scripts/attendre-publication.mjs [minutes]

import { readFileSync } from "node:fs";

const SITE = "https://discountcartegrise.fr";
const minutes = Number(process.argv[2] ?? 30);
const limite = Date.now() + minutes * 60_000;

const bundleDe = (html) => html.match(/\/?assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] ?? null;

const attendu = bundleDe(readFileSync("dist/index.html", "utf8"));
if (!attendu) {
  console.error("Impossible de lire le bundle local. Lancez `npm run build` d'abord.");
  process.exit(2);
}
console.log(`attendu : ${attendu}`);

const heure = () => new Date().toLocaleTimeString("fr-FR");
let precedent = null;

while (Date.now() < limite) {
  let enLigne = null;
  try {
    // Le paramètre casse les caches intermédiaires, qui serviraient sinon la
    // page d'il y a dix minutes et feraient croire que rien ne bouge.
    const r = await fetch(`${SITE}/?verif=${Date.now()}`, { cache: "no-store" });
    enLigne = bundleDe(await r.text());
  } catch (e) {
    console.log(`${heure()}  site injoignable (${e.message})`);
  }

  if (enLigne === attendu) {
    console.log(`${heure()}  ${enLigne}  <-- EN LIGNE`);
    process.exit(0);
  }

  if (enLigne && enLigne !== precedent) {
    // Un bundle différent de l'attendu ET du précédent : un déploiement est
    // bien sorti, mais ce n'est pas le nôtre — il en reste un derrière.
    console.log(`${heure()}  ${enLigne}  (pas encore le nôtre)`);
    precedent = enLigne;
  } else if (enLigne) {
    process.stdout.write(".");
  }

  await new Promise((r) => setTimeout(r, 20_000));
}

console.log(`\n${heure()}  TOUJOURS PAS PUBLIÉ après ${minutes} min — relancer le déploiement.`);
process.exit(1);
