// Prérendu statique des pages publiques.
//
// Le site est une application React rendue côté navigateur : avant ce script,
// chaque URL renvoyait le même HTML de 3 951 octets, avec le titre de la page
// d'accueil et un <div id="root"> vide. Google finit par exécuter le
// JavaScript, mais avec le délai de sa file de rendu ; les robots des
// assistants — OAI-SearchBot, Claude-SearchBot, PerplexityBot — ne l'exécutent
// pas du tout et repartaient avec une coquille.
//
// Le script écrit un vrai fichier HTML par route : son titre, sa description,
// son canonique, ses données structurées et son texte. React se greffe
// par-dessus au chargement et remplace le contenu ; le visiteur voit du texte
// au lieu d'une page blanche pendant que le JavaScript arrive.
//
// Deux partis pris :
//
// 1. Pas de navigateur headless. Puppeteer rendrait le HTML exact, mais il faut
//    télécharger Chromium dans l'environnement de build de Lovable, ce qui est
//    lent et peut échouer. Le texte vient donc des mêmes fichiers de données
//    que les composants — demarchesConfig et seoRoutes — ce qui garantit aussi
//    que le robot et le visiteur lisent la même chose.
//
// 2. Le script n'échoue jamais. Une erreur ici ne doit pas casser un
//    déploiement : on journalise et on sort en 0, le site repart simplement
//    sans prérendu.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { build as esbuild } from "esbuild";

const RACINE = process.cwd();
const DIST = path.join(RACINE, "dist");
const BASE = "https://discountcartegrise.fr";
const TEMP = path.join(RACINE, ".prerender-tmp");

const echappe = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const euros = (n) =>
  Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  " &euro;";

// Un </script> dans une chaîne JSON refermerait la balise qui la contient.
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

// Charge un module TypeScript depuis un script Node : esbuild est déjà présent
// comme dépendance de Vite, inutile d'en ajouter une.
async function chargerTs(relatif, nom) {
  const sortie = path.join(TEMP, `${nom}.mjs`);
  await esbuild({
    entryPoints: [path.join(RACINE, relatif)],
    outfile: sortie,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
  });
  return import(`file://${sortie}`);
}

function paragraphes(textes) {
  return textes
    .filter(Boolean)
    .flatMap((t) => String(t).split("\n\n"))
    .map((t) => `<p>${echappe(t.trim())}</p>`)
    .join("\n");
}

function liste(titre, elements) {
  if (!elements?.length) return "";
  return `<h2>${echappe(titre)}</h2>\n<ul>${elements
    .map((e) => `<li>${echappe(e)}</li>`)
    .join("")}</ul>`;
}

// Le pont entre les deux publics vit dans un composant React, donc hors du
// HTML servi. Un lien interne que les robots ne voient pas ne vaut rien : les
// robots des assistants n'executent pas le JavaScript, et c'est par ces liens
// que la branche pro et la branche particulier se repondent.
const PRO_SEULEMENT = ["DA", "W_GARAGE"];
const PRO_MAJORITAIRE = ["CPI_WW"];

function publicCroise(code) {
  if (PRO_SEULEMENT.includes(code) || PRO_MAJORITAIRE.includes(code)) {
    const intro = PRO_SEULEMENT.includes(code)
      ? "Cette demarche est reservee aux professionnels de l'automobile et se depose depuis un compte garage, sous notre habilitation."
      : "Demarche majoritairement professionnelle : garages, concessions et negociants la deposent depuis un compte professionnel, a un tarif different.";
    return (
      `<h2>Vous êtes un professionnel ?</h2><p>${echappe(intro)} ` +
      `Voir <a href="${BASE}/carte-grise-professionnel">l'offre et les tarifs professionnels</a>, ` +
      `et <a href="${BASE}/habilitation-siv">faut-il demander son habilitation SIV</a>.</p>`
    );
  }
  return (
    `<h2>Vous êtes un professionnel ?</h2><p>Garages, concessions, négociants et loueurs ` +
    `deposent leurs demarches depuis un compte dedie, avec une grille tarifaire a part : ` +
    `la declaration d'achat et la declaration de cession y sont a 5 &euro;. ` +
    `Voir <a href="${BASE}/carte-grise-professionnel">l'offre professionnels</a>.</p>`
  );
}

function faqHtml(faqs) {
  if (!faqs?.length) return "";
  return (
    `<h2>Questions fréquentes</h2>\n` +
    faqs
      .map((f) => `<h3>${echappe(f.question)}</h3>\n<p>${echappe(f.answer)}</p>`)
      .join("\n")
  );
}

// Le corps est volontairement sobre et lisible : il s'affiche réellement, le
// temps que React prenne la main. Le masquer serait du cloaking.
function corps({ h1, blocs, pied = "" }) {
  return `<div style="max-width:52rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#1f2937">
<h1>${echappe(h1)}</h1>
${blocs.filter(Boolean).join("\n")}
${pied}
</div>`;
}

function appliquer(gabarit, { titre, description, canonical, noindex, schemas, html }) {
  const titreComplet = titre.includes("Discount Carte Grise")
    ? titre
    : `${titre} | Discount Carte Grise`;

  let out = gabarit;

  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${echappe(titreComplet)}</title>`);
  out = out.replace(
    /<meta name="description" content="[\s\S]*?">/,
    `<meta name="description" content="${echappe(description)}">`
  );
  out = out.replace(
    /<meta property="og:title" content="[\s\S]*?">/,
    `<meta property="og:title" content="${echappe(titreComplet)}">`
  );
  out = out.replace(
    /<meta property="og:description" content="[\s\S]*?">/,
    `<meta property="og:description" content="${echappe(description)}">`
  );
  out = out.replace(
    /<meta name="twitter:title" content="[\s\S]*?">/,
    `<meta name="twitter:title" content="${echappe(titreComplet)}">`
  );
  out = out.replace(
    /<meta name="twitter:description" content="[\s\S]*?">/,
    `<meta name="twitter:description" content="${echappe(description)}">`
  );
  out = out.replace(
    /<link rel="alternate" hreflang="fr" href="[\s\S]*?" \/>/,
    `<link rel="canonical" href="${echappe(canonical)}" />\n    <link rel="alternate" hreflang="fr" href="${echappe(canonical)}" />\n    <meta name="robots" content="${
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1"
    }">\n    <meta property="og:url" content="${echappe(canonical)}" />`
  );

  const blocsSchema = (schemas ?? [])
    .map((s) => `<script type="application/ld+json">${jsonLd(s)}</script>`)
    .join("\n    ");
  if (blocsSchema) out = out.replace("</head>", `    ${blocsSchema}\n</head>`);

  // Le texte pré-rendu est posé À CÔTÉ du conteneur de React, et non dedans.
  //
  // Il y était, et React vide ce conteneur pour s'installer : le visiteur voyait
  // donc le texte, puis une roue de chargement, puis la page — trois états à
  // chaque chargement, dont deux qui ressemblent à une panne. Sarah l'a vu
  // elle-même en rechargeant le site.
  //
  // Dehors, il reste à l'écran tant que l'application n'est pas prête, et
  // disparaît au moment précis où la vraie page s'affiche. Une seule
  // transition. S'il n'y a pas de JavaScript du tout, il reste : c'est le
  // filet, pas une page blanche.
  // Trois états au chargement, et un seul visible à la fois.
  //
  // 1. `#prerendu` porte le texte complet. C'est lui que lisent les robots des
  //    assistants, qui n'exécutent pas de JavaScript — et c'est aussi ce que
  //    voit un visiteur sans JavaScript. Visible par défaut, donc.
  //
  // 2. `#ebauche` est une ébauche habillée : la barre du site et le titre de la
  //    page, à la bonne police. Masquée par défaut.
  //
  // 3. Le script bascule les deux dès qu'il s'exécute, c'est-à-dire quand le
  //    JavaScript fonctionne et que la vraie page va arriver.
  //
  // Pourquoi ce détour. Le texte brut restait affiché une à trois secondes sur
  // un téléphone, et ressemblait à une panne. Le masquer tout court a réglé
  // cela — mais plus rien ne s'affichait avant que React ne démarre : le
  // premier affichage est passé de 0,2 à 1,7 seconde, mesuré en production.
  // C'est un critère de classement, et ces pages sont faites pour être
  // classées. L'ébauche rend la vitesse sans rendre la laideur.
  const titreEbauche = (html.match(/<h1>([\s\S]*?)<\/h1>/) ?? [])[1] ?? "";
  const ebauche =
    `<div id="ebauche" hidden style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif">` +
    `<div style="height:65px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;padding:0 1rem;font-weight:800;font-size:1.25rem;letter-spacing:-.02em">` +
    `<span style="color:#0047AB">Discount</span><span style="color:#1f2937">Carte</span><span style="color:#C0392B">Grise</span>` +
    `</div>` +
    (titreEbauche
      ? `<div style="max-width:52rem;margin:0 auto;padding:2.5rem 1rem">` +
        `<h1 style="font-size:clamp(1.6rem,5vw,2.4rem);font-weight:800;line-height:1.15;letter-spacing:-.02em;color:#111827;margin:0">${titreEbauche}</h1>` +
        `</div>`
      : "") +
    `</div>`;

  out = out.replace(
    '<div id="root"></div>',
    `<div id="prerendu">${html}</div>\n` +
      `    ${ebauche}\n` +
      `    <script>document.getElementById("prerendu").hidden=true;document.getElementById("ebauche").hidden=false;</script>\n` +
      `    <div id="root"></div>`
  );
  return out;
}

// Deux fichiers par route, parce que les hébergeurs statiques ne résolvent pas
// « /duplicata-carte-grise » de la même façon : les uns cherchent
// <route>/index.html, les autres <route>.html, et ceux qui ne trouvent ni l'un
// ni l'autre retombent sur la coquille sans rien signaler.
async function ecrire(route, contenu) {
  if (route === "/") {
    await writeFile(path.join(DIST, "index.html"), contenu, "utf8");
    return;
  }
  const nom = route.replace(/^\//, "");
  await mkdir(path.join(DIST, nom), { recursive: true });
  await writeFile(path.join(DIST, nom, "index.html"), contenu, "utf8");
  await writeFile(path.join(DIST, `${nom}.html`), contenu, "utf8");
}

async function principal() {
  const gabaritChemin = path.join(DIST, "index.html");
  if (!existsSync(gabaritChemin)) {
    console.warn("[prerender] dist/index.html introuvable, rien à faire.");
    return;
  }
  const gabarit = await readFile(gabaritChemin, "utf8");

  await mkdir(TEMP, { recursive: true });
  const { demarchesConfig } = await chargerTs("src/data/demarchesConfig.ts", "demarches");
  const { ROUTES_SEO } = await chargerTs("src/data/seoRoutes.ts", "routes");
  // Le tableau des 101 departements est la matiere premiere du simulateur :
  // c'est la donnee publique reutilisee, et c'est ce qui distingue la page des
  // simulateurs concurrents. Il etait rendu par React, donc absent du HTML
  // servi — invisible pour les robots des assistants.
  // Les cent une pages départementales. Leur texte vient du même module que le
  // composant React, pour que le robot et le visiteur lisent la même chose.
  let contenusDepartements = [];
  try {
    const { CONTENUS_DEPARTEMENTS } = await chargerTs(
      "src/data/departementContenu.ts",
      "departementContenu"
    );
    contenusDepartements = CONTENUS_DEPARTEMENTS();
  } catch (e) {
    console.warn("[prerender] pages départementales ignorées :", e?.message ?? e);
  }

  let tableauDepartements = "";
  try {
    const { departementsTarifs, departementsLabels } = await chargerTs(
      "src/data/departementsTarifs.ts",
      "departements"
    );
    const codes = Object.keys(departementsTarifs).sort();
    // Chaque ligne porte le lien vers la page du département : c'est par ce
    // tableau que les cent une pages reçoivent leur maillage. L'ancienne page
    // /prix-carte-grise n'avait que deux liens entrants et aucun trafic.
    const cheminsDep = Object.fromEntries(
      contenusDepartements.map((c) => [c.departement.code, c.canonical.replace(BASE, "")])
    );
    const lignes = codes
      .map((c) => {
        const t = Number(departementsTarifs[c]);
        const nom = echappe(departementsLabels[c] ?? c);
        const cellule = cheminsDep[c] ? `<a href="${BASE}${cheminsDep[c]}">${nom}</a>` : nom;
        return `<tr><td>${cellule}</td><td>${echappe(c)}</td>` +
          `<td>${t.toFixed(2)} &euro;</td><td>${(t * 5).toFixed(2)} &euro;</td>` +
          `<td>${(t * 7).toFixed(2)} &euro;</td></tr>`;
      })
      .join("");
    tableauDepartements =
      `<h2>Tarif du cheval fiscal par departement en ${new Date().getFullYear()}</h2>` +
      `<p>Tarif de la taxe regionale par cheval fiscal dans les ${codes.length} departements. ` +
      `Les colonnes 5 CV et 7 CV donnent la taxe regionale seule, hors taxes fixes.</p>` +
      `<table><thead><tr><th>Departement</th><th>Code</th><th>Tarif/CV</th>` +
      `<th>Taxe 5 CV</th><th>Taxe 7 CV</th></tr></thead><tbody>${lignes}</tbody></table>`;
  } catch (e) {
    console.warn("[prerender] tableau des departements ignore :", e?.message ?? e);
  }

  // Meme raison pour la cession : « qui fait quoi dans quel delai » et le
  // contenu du Cerfa case par case sont ce que cherche quelqu'un qui tape
  // « certificat de cession », et c'etait rendu par React.
  let reperesCession = "";
  try {
    const { QUI_FAIT_QUOI, CASES_CERFA } = await chargerTs(
      "src/data/cessionReperes.ts",
      "cession"
    );
    reperesCession =
      `<h2>Qui fait quoi, et dans quel délai</h2><table><thead><tr><th>Qui</th>` +
      `<th>Ce qu'il doit faire</th><th>Quand</th><th>À défaut</th></tr></thead><tbody>` +
      QUI_FAIT_QUOI.map(
        (l) =>
          `<tr><td>${echappe(l.qui)}</td><td>${echappe(l.action)}</td>` +
          `<td>${echappe(l.quand)}</td><td>${echappe(l.sinon)}</td></tr>`
      ).join("") +
      `</tbody></table>` +
      // Le formulaire vierge existe dans public/cerfas depuis toujours, mais
      // son telechargement vivait dans un bouton React : le HTML servi n'en
      // portait aucun lien. La page promettait le Cerfa a quelqu'un qui tape
      // « cerfa cession vehicule » — douze mille recherches par mois — et les
      // robots n'y trouvaient rien a telecharger. Le numero exact de version,
      // 15776*02, est lui aussi une requete a part entiere.
      `<h2>Télécharger le Cerfa 15776*02 vierge</h2>` +
      `<p>Le formulaire officiel de déclaration de cession, version 15776*02, ` +
      `à imprimer en trois exemplaires : un pour le vendeur, un pour l'acheteur, ` +
      `un pour l'administration. <a href="${BASE}/cerfas/cerfa_15776_02.pdf" download>` +
      `Télécharger le Cerfa 15776*02 (PDF)</a>.</p>` +
      `<h2>Ce que contient le Cerfa 15776*02, case par case</h2>` +
      CASES_CERFA.map(
        (c) => `<h3>${echappe(c.repere)}</h3><p>${echappe(c.contenu)}</p>`
      ).join("");
  } catch (e) {
    console.warn("[prerender] reperes de cession ignores :", e?.message ?? e);
  }

  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Discount Carte Grise",
    url: BASE,
  };

  let ecrites = 0;

  // Les formulaires officiels, liés depuis les pages qui les exigent.
  //
  // Les six Cerfa du dossier public/cerfas se téléchargent bien en production,
  // mais aucun lien ne pointait dessus dans le HTML servi : ils vivaient dans
  // des boutons React. Or « cerfa 13750 » et « cerfa 13757 » sont des requêtes
  // à part entière, et la page qui promet le formulaire sans en offrir le
  // téléchargement ne répond pas à ce qu'on y cherche.
  //
  // Seuls les deux dont l'intitulé officiel est établi figurent ici. Les Cerfa
  // 13751 et 13752 du dossier n'ont pas été identifiés avec certitude : mieux
  // vaut aucun lien qu'un libellé inventé sur une page publique.
  const CERFA_PAR_PAGE = {
    "carte-grise": {
      numero: "13750*05",
      fichier: "cerfa_13750_05.pdf",
      intitule: "demande de certificat d'immatriculation",
      note: "À remplir et signer par le nouveau titulaire. Nous le remplissons pour vous si vous passez par notre service.",
    },
    "carte-grise-professionnel": {
      numero: "13757*03",
      fichier: "cerfa_13757_03.pdf",
      intitule: "mandat à un professionnel habilité",
      note: "C'est la pièce qui nous autorise à déposer la démarche à votre place dans le SIV. Elle est exigée pour chaque dossier.",
    },
  };

  const blocCerfa = (cle) => {
    const c = CERFA_PAR_PAGE[cle];
    if (!c) return "";
    return (
      `<h2>Télécharger le Cerfa ${echappe(c.numero)} vierge</h2>` +
      `<p>Le formulaire officiel de ${echappe(c.intitule)}, version ${echappe(c.numero)}. ` +
      `${echappe(c.note)} ` +
      `<a href="${BASE}/cerfas/${c.fichier}" download>Télécharger le Cerfa ${echappe(c.numero)} (PDF)</a>.</p>`
    );
  };

  // Le contenu des deux pages écrites à la main, désormais hors du JSX.
  //
  // Elles ne servaient que leur paragraphe d'introduction — 283 mots pour le
  // non-gage, 419 pour la page professionnelle — alors que le visiteur en lit
  // trois à quatre fois plus. Tout le reste vivait dans le composant React,
  // donc hors de portée du prérendu.
  const supplementsPages = {};
  const faqsPages = {};
  try {
    const { RUBRIQUES, FAQ } = await chargerTs("src/data/nonGageContenu.ts", "nonGage");
    supplementsPages["/certificat-de-non-gage"] =
      `<h2>Les six rubriques du certificat, et ce que chacune veut dire</h2>` +
      `<table><thead><tr><th>Rubrique</th><th>Véhicule libre</th>` +
      `<th>Ce que ça signifie</th></tr></thead><tbody>` +
      RUBRIQUES.map(
        (r) =>
          `<tr><td>${echappe(r.titre)}</td><td>${echappe(r.vierge)}</td>` +
          `<td>${echappe(r.sens)}</td></tr>`
      ).join("") +
      `</tbody></table>` +
      faqHtml(FAQ);
    faqsPages["/certificat-de-non-gage"] = FAQ;
  } catch (e) {
    console.warn("[prerender] contenu non-gage ignoré :", e?.message ?? e);
  }

  // Le simulateur : ses quatorze questions-réponses sur le prix et sur nos
  // frais de dossier vivaient dans le composant React, donc hors du HTML servi.
  // Le robot ne recevait que l'introduction et le tableau des départements.
  //
  // C'est pourtant là que le site répond à « carte grise pas cher » — 4 504
  // impressions sur seize mois, en position 28, la première famille de requêtes
  // du site. La réponse existait, elle n'était simplement lue par personne.
  try {
    const { FAQ_SERVICE, FAQ_TARIFS, FAQ_MOINS_CHER, LEVIERS_REELS, FAUSSES_ECONOMIES, PART_COMPARABLE } =
      await chargerTs("src/data/tarifsContenu.ts", "tarifs");
    const toutes = [...FAQ_TARIFS, ...FAQ_MOINS_CHER, ...FAQ_SERVICE];

    // La section « moins cher » répond à la première famille de requêtes du
    // site, qui n'avait jusqu'ici aucune réponse : les pages disaient combien
    // coûte une carte grise et pourquoi le prix varie, jamais comment payer
    // moins. Elle précède la FAQ pour que le robot — et le lecteur — la
    // trouvent avant les questions.
    const tableauLeviers = (titre, lignes, enTetes) =>
      `<h3>${titre}</h3><table><thead><tr>` +
      enTetes.map((t) => `<th>${t}</th>`).join("") +
      `</tr></thead><tbody>` +
      lignes
        .map(
          (l) =>
            `<tr><td>${echappe(l.cas)}</td><td>${echappe(l.effet)}</td>` +
            `<td>${echappe(l.fondement)}</td></tr>`
        )
        .join("") +
      `</tbody></table>`;

    supplementsPages["/simulateur"] =
      `<h2>Payer sa carte grise moins cher : ce qui marche, ce qui ne marche pas</h2>` +
      `<p>Aucune remise commerciale n'est possible sur une carte grise : l'essentiel du prix ` +
      `est une taxe fixée par la loi et par votre région, identique chez tous les prestataires ` +
      `habilités comme sur le site de l'État. Les seules réductions qui existent sont prévues ` +
      `par les textes, et elles s'appliquent toutes seules.</p>` +
      tableauLeviers("Les réductions prévues par la loi", LEVIERS_REELS, [
        "Votre cas",
        "Ce que vous payez en moins",
        "La règle",
      ]) +
      tableauLeviers("Ce qui ne réduit rien", FAUSSES_ECONOMIES, [
        "L'idée",
        "L'effet réel",
        "Pourquoi",
      ]) +
      `<h3>La seule part qui se compare</h3><p>${echappe(PART_COMPARABLE.texte)}</p>` +
      faqHtml(toutes);
    faqsPages["/simulateur"] = toutes;
  } catch (e) {
    console.warn("[prerender] contenu tarifs ignoré :", e?.message ?? e);
  }

  try {
    const { PREUVES, ETAPES, FAQ } = await chargerTs(
      "src/data/professionnelContenu.ts",
      "professionnel"
    );
    supplementsPages["/carte-grise-professionnel"] =
      `<h2>Ce que nous traitons pour les garages</h2><ul>` +
      PREUVES.map(
        (p) => `<li><strong>${echappe(p.valeur)}</strong> ${echappe(p.libelle)} — ${echappe(p.detail)}</li>`
      ).join("") +
      `</ul>` +
      `<h2>Comment un garage ouvre son compte</h2>` +
      ETAPES.map((e) => `<h3>${echappe(e.titre)}</h3><p>${echappe(e.texte)}</p>`).join("") +
      faqHtml(FAQ);
    faqsPages["/carte-grise-professionnel"] = FAQ;
  } catch (e) {
    console.warn("[prerender] contenu professionnel ignoré :", e?.message ?? e);
  }

  try {
    const { BENEFICIAIRES, CONDITIONS, OBLIGATIONS, FAQ } = await chargerTs(
      "src/data/habilitationSivContenu.ts",
      "habilitationSiv"
    );
    supplementsPages["/habilitation-siv"] =
      `<h2>Qui peut être habilité</h2><ul>` +
      BENEFICIAIRES.map((b) => `<li>${echappe(b)}</li>`).join("") +
      `</ul>` +
      `<h2>Les conditions à remplir</h2>` +
      CONDITIONS.map(
        (c) =>
          `<h3>${echappe(c.titre)}</h3><p>${echappe(c.texte)}</p>` +
          `<p><strong>${echappe(c.bloquant)}</strong></p>`
      ).join("") +
      `<h2>Ce à quoi l'habilitation engage</h2><ul>` +
      OBLIGATIONS.map(
        (o) => `<li><strong>${echappe(o.quoi)}</strong> — ${echappe(o.detail)}</li>`
      ).join("") +
      `</ul>` +
      faqHtml(FAQ);
    faqsPages["/habilitation-siv"] = FAQ;
  } catch (e) {
    console.warn("[prerender] contenu habilitation SIV ignoré :", e?.message ?? e);
  }

  // Le sommaire des démarches, et le pied de page qui les relie toutes.
  //
  // Chaque page prérendue ne portait qu'un seul lien interne, et l'accueil —
  // la page qui a le plus d'autorité — n'en avait pas un seul vers les dix-huit
  // pages démarche. Les robots pouvaient atteindre le site sans jamais trouver
  // de chemin vers ce qu'il vend. C'est aussi ce que montre la vraie page
  // d'accueil, sous « Nos démarches » : le HTML servi ne faisait que ne pas le
  // dire.
  const sommaireDemarches =
    `<h2>Nos démarches d'immatriculation</h2><ul>` +
    demarchesConfig
      .map(
        (d) =>
          `<li><a href="${BASE}/${d.slug}">${echappe(d.title)}</a> — ${echappe(d.description)}</li>`
      )
      .join("") +
    `</ul>`;

  const piedDeLiens = (slugCourant) =>
    `<h2>Toutes les démarches</h2><p>` +
    demarchesConfig
      .filter((d) => d.slug !== slugCourant)
      .map((d) => `<a href="${BASE}/${d.slug}">${echappe(d.shortTitle ?? d.title)}</a>`)
      .join(" · ") +
    `</p>`;

  // Pages écrites à la main.
  for (const [route, seo] of Object.entries(ROUTES_SEO)) {
    const supplement = route === "/simulateur" ? tableauDepartements : "";
    const html = corps({
      h1: seo.h1,
      blocs: [
        paragraphes(seo.intro),
        supplement,
        supplementsPages[route] ?? "",
        blocCerfa(route.replace(/^\//, "")),
        route === "/" ? sommaireDemarches : "",
      ],
      pied: route === "/" ? "" : piedDeLiens(null),
    });
    await ecrire(
      route,
      appliquer(gabarit, {
        titre: seo.title,
        description: seo.description,
        canonical: seo.canonical,
        noindex: seo.noindex,
        schemas: seo.noindex
          ? []
          : [
              organisation,
              {
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: seo.h1,
                description: seo.description,
                url: seo.canonical,
                inLanguage: "fr",
              },
              ...(faqsPages[route]
                ? [
                    {
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      mainEntity: faqsPages[route].map((f) => ({
                        "@type": "Question",
                        name: f.question,
                        acceptedAnswer: { "@type": "Answer", text: f.answer },
                      })),
                    },
                  ]
                : []),
            ],
        html,
      })
    );
    ecrites++;
  }

  // Les 18 pages démarche, dont tout le texte vient déjà du catalogue.
  for (const d of demarchesConfig) {
    const url = `${BASE}/${d.slug}`;
    const html = corps({
      h1: d.h1,
      blocs: [
        d.slug === "declaration-cession" ? reperesCession : "",
        blocCerfa(d.slug),
        paragraphes([d.description, d.longDescription]),
        liste("Pièces à fournir", d.documents),
        liste("Comment ça se passe", d.steps),
        d.delai ? `<h2>Délai</h2><p>${echappe(d.delai)}</p>` : "",
        d.prixDescription ? `<h2>Tarif</h2><p>${echappe(d.prixDescription)}</p>` : "",
        d.seoContent ? paragraphes([d.seoContent]) : "",
        faqHtml(d.faqs),
        publicCroise(d.code),
      ],
      pied: piedDeLiens(d.slug),
    });

    await ecrire(
      `/${d.slug}`,
      appliquer(gabarit, {
        titre: d.metaTitle,
        description: d.metaDescription,
        canonical: url,
        schemas: [
          organisation,
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: d.title,
            description: d.description,
            serviceType: "Démarche d'immatriculation",
            provider: { "@type": "Organization", name: "Discount Carte Grise", url: BASE },
            areaServed: { "@type": "Country", name: "France" },
            url,
            termsOfService: `${BASE}/cgv`,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: (d.faqs ?? []).map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
              { "@type": "ListItem", position: 2, name: d.title, item: url },
            ],
          },
        ],
        html,
      })
    );
    ecrites++;
  }

  // Les cent une pages départementales.
  const tableauBareme = (lignes) =>
    `<table><thead><tr><th>Puissance fiscale</th><th>Taxe régionale</th>` +
    `<th>Total des taxes</th><th>Plus de dix ans</th></tr></thead><tbody>` +
    lignes
      .map(
        (l) =>
          `<tr><td>${l.cv} CV</td><td>${euros(l.taxe)}</td>` +
          `<td>${euros(l.total)}</td><td>${euros(l.totalAncien)}</td></tr>`
      )
      .join("") +
    `</tbody></table>`;

  const tableauVoisins = (voisins) =>
    voisins.length === 0
      ? ""
      : `<h2>Les départements limitrophes</h2><table><thead><tr>` +
        `<th>Département</th><th>Cheval fiscal</th><th>Écart sur un 6 CV</th>` +
        `</tr></thead><tbody>` +
        voisins
          .map(
            (v) =>
              `<tr><td><a href="${BASE}${v.chemin}">${echappe(v.nom)} (${echappe(v.code)})</a></td>` +
              `<td>${euros(v.tarif)}</td>` +
              `<td>${v.ecart6cv === 0 ? "aucun" : (v.ecart6cv > 0 ? "+" : "−") + euros(Math.abs(v.ecart6cv))}</td></tr>`
          )
          .join("") +
        `</tbody></table>`;

  for (const c of contenusDepartements) {
    const d = c.departement;
    const html = corps({
      h1: c.h1,
      blocs: [
        paragraphes(c.intro),
        `<h2>Prix d'une carte grise ${echappe(d.dans)} selon la puissance fiscale</h2>` +
          `<p>Taxe régionale de ${euros(c.tarif)} par cheval fiscal, taxe fixe de 11 € et ` +
          `redevance d'acheminement de 2,76 €. La colonne « plus de dix ans » applique ` +
          `l'abattement de moitié sur la taxe régionale.</p>` +
          tableauBareme(c.bareme),
        `<h2>${echappe(d.chefLieu)} ou ailleurs : le même prix</h2>` +
          paragraphes([c.communesTexte, c.memeTarifTexte]),
        tableauVoisins(c.voisins) + paragraphes(c.voisinsTexte),
        `<h2>Véhicule électrique</h2>` + paragraphes([c.electriqueTexte]),
        paragraphes([
          `${c.rangTexte} Le détail des cinq taxes, l'abattement des véhicules de plus de ` +
            `dix ans et le tableau des cent un départements sont réunis sur la page du simulateur.`,
        ]),
        faqHtml(c.faqs),
      ],
      pied: piedDeLiens(null),
    });
    await ecrire(
      c.canonical.replace(BASE, ""),
      appliquer(gabarit, {
        titre: c.title,
        description: c.description,
        canonical: c.canonical,
        schemas: [
          organisation,
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: c.faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
              { "@type": "ListItem", position: 2, name: "Prix de la carte grise", item: `${BASE}/simulateur` },
              { "@type": "ListItem", position: 3, name: `${d.nom} (${d.code})`, item: c.canonical },
            ],
          },
        ],
        html,
      })
    );
    ecrites++;
  }

  // ── Les routes publiques qui n'ont rien à faire dans l'index ──────────────
  //
  // Seize URL publiques n'étaient connues ni de ROUTES_SEO ni du catalogue des
  // démarches : /login, /register, /mon-espace, les étapes du tunnel… Faute de
  // fichier à leur nom, l'hébergeur leur servait la coquille — c'est-à-dire le
  // TITRE DE L'ACCUEIL et un canonique pointant vers l'accueil. Seize adresses
  // différentes se déclaraient donc être la page d'accueil, en « index, follow ».
  //
  // Mesuré dans Search Console le 12/10/2026 : quatorze pages indexées
  // seulement, et quatre « explorées, actuellement non indexées ». Un site qui
  // présente seize sosies de son accueil donne à Google une bonne raison de ne
  // pas indexer le reste.
  //
  // Elles reçoivent désormais un vrai fichier, en noindex, avec leur propre
  // canonique. Rien à gagner en référencement sur une page de connexion : tout
  // à gagner à ce qu'elle cesse de se faire passer pour l'accueil.
  const SANS_INDEX = [
    "/login", "/login-particulier", "/register", "/register-particulier",
    "/forgot-password", "/reset-password", "/confirmation-email", "/complete-profile",
    "/mon-espace", "/recherche-suivi", "/demarche-simple", "/resultat-carte-grise",
    "/coffre-fort", "/coffre-fort-sales", "/maji-concepts", "/prospection",
  ];
  for (const route of SANS_INDEX) {
    await ecrire(
      route,
      appliquer(gabarit, {
        titre: "Discount Carte Grise",
        description: "Service d'immatriculation habilité par l'État.",
        canonical: `${BASE}${route}`,
        noindex: true,
        schemas: [],
        html: "",
      })
    );
    ecrites++;
  }

  // ── /prix-carte-grise : une redirection que les robots voient ─────────────
  //
  // Cette page a été fusionnée avec /simulateur, et l'application la redirige
  // — mais côté navigateur seulement, par <Navigate>. Le HTML servi, lui,
  // restait la coquille : titre de l'accueil, canonique vers l'accueil.
  //
  // Or c'est la DEUXIÈME page du site en impressions : 3 348 sur seize mois,
  // juste derrière l'accueil, pour 2 clics et une position moyenne de 22,5.
  // Google la montrait sur « prix carte grise » avec le titre de l'accueil,
  // qui ne répond pas à la requête — d'où le taux de clic de 0,06 %.
  //
  // Le canonique désigne désormais /simulateur et un rafraîchissement immédiat
  // y conduit : c'est la redirection que l'on peut faire sans accès au serveur,
  // et Google la traite comme une 301. Les signaux accumulés par cette URL
  // rejoignent la page qui porte vraiment le sujet.
  const versSimulateur = appliquer(gabarit, {
    titre: "Prix de la carte grise 2026 | Discount Carte Grise",
    description:
      "Le prix de la carte grise, le tarif du cheval fiscal des 101 départements et le simulateur sont réunis sur une seule page.",
    canonical: `${BASE}/simulateur`,
    schemas: [],
    html:
      `<h1>Prix de la carte grise</h1>` +
      `<p>Cette page a rejoint le <a href="${BASE}/simulateur">simulateur de prix de la carte grise</a>, ` +
      `qui réunit le calcul, le détail des cinq taxes et le tarif du cheval fiscal des 101 départements.</p>`,
  }).replace(
    "</head>",
    `  <meta http-equiv="refresh" content="0; url=/simulateur" />\n  </head>`
  );
  await ecrire("/prix-carte-grise", versSimulateur);
  ecrites++;

  console.log(`[prerender] ${ecrites} pages écrites.`);

  // Le sitemap est RÉÉCRIT à partir de ce qui vient d'être pré-rendu.
  //
  // Il était tenu à la main dans public/sitemap.xml, et ce script se contentait
  // de signaler les écarts dans la console du build — que personne ne lit. Une
  // URL listée mais non pré-rendue retombe sur la coquille vide ; une page
  // pré-rendue mais absente du sitemap n'est jamais soumise. Les deux
  // existaient. Les engendrer ensemble supprime la question.
  try {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const entrees = [
      ...Object.entries(ROUTES_SEO)
        .filter(([, seo]) => !seo.noindex)
        .map(([route]) => ({ loc: route, priorite: route === "/" ? "1.0" : "0.9", frequence: "monthly" })),
      ...demarchesConfig.map((d) => ({ loc: `/${d.slug}`, priorite: "0.9", frequence: "monthly" })),
      // Les départementales sont nombreuses et bougent une fois l'an, quand les
      // régions votent leur tarif : priorité plus basse, fréquence annuelle.
      ...contenusDepartements.map((c) => ({
        loc: c.canonical.replace(BASE, ""),
        priorite: "0.6",
        frequence: "yearly",
      })),
    ];
    const vues = new Set();
    const urls = entrees
      .filter((e) => (vues.has(e.loc) ? false : (vues.add(e.loc), true)))
      .map(
        (e) =>
          `  <url>\n    <loc>${BASE}${e.loc === "/" ? "/" : e.loc}</loc>\n` +
          `    <lastmod>${aujourdhui}</lastmod>\n` +
          `    <changefreq>${e.frequence}</changefreq>\n` +
          `    <priority>${e.priorite}</priority>\n  </url>`
      )
      .join("\n");
    await writeFile(
      path.join(DIST, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      "utf8"
    );
    console.log(`[prerender] sitemap réécrit : ${vues.size} URL.`);
  } catch (e) {
    console.warn("[prerender] sitemap non réécrit :", e?.message ?? e);
  }
}

try {
  await principal();
} catch (e) {
  console.warn("[prerender] ignoré après erreur :", e?.message ?? e);
} finally {
  await rm(TEMP, { recursive: true, force: true }).catch(() => {});
}
