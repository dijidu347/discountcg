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
function corps({ h1, blocs }) {
  return `<div style="max-width:52rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#1f2937">
<h1>${echappe(h1)}</h1>
${blocs.filter(Boolean).join("\n")}
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

  out = out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
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
  let tableauDepartements = "";
  try {
    const { departementsTarifs, departementsLabels } = await chargerTs(
      "src/data/departementsTarifs.ts",
      "departements"
    );
    const codes = Object.keys(departementsTarifs).sort();
    const lignes = codes
      .map((c) => {
        const t = Number(departementsTarifs[c]);
        return `<tr><td>${echappe(departementsLabels[c] ?? c)}</td><td>${echappe(c)}</td>` +
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

  // Pages écrites à la main.
  for (const [route, seo] of Object.entries(ROUTES_SEO)) {
    const supplement = route === "/simulateur" ? tableauDepartements : "";
    const html = corps({ h1: seo.h1, blocs: [paragraphes(seo.intro), supplement] });
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
        paragraphes([d.description, d.longDescription]),
        liste("Pièces à fournir", d.documents),
        liste("Comment ça se passe", d.steps),
        d.delai ? `<h2>Délai</h2><p>${echappe(d.delai)}</p>` : "",
        d.prixDescription ? `<h2>Tarif</h2><p>${echappe(d.prixDescription)}</p>` : "",
        d.seoContent ? paragraphes([d.seoContent]) : "",
        faqHtml(d.faqs),
        publicCroise(d.code),
      ],
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

  console.log(`[prerender] ${ecrites} pages écrites.`);

  // Contrôle : une URL du sitemap qui n'est pas pré-rendue retombe sur la
  // coquille, et on ne s'en apercevrait pas autrement.
  try {
    const sitemap = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
    const connues = new Set([
      ...Object.keys(ROUTES_SEO),
      ...demarchesConfig.map((d) => `/${d.slug}`),
    ]);
    const manquantes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname)
      .filter((p) => !connues.has(p));
    if (manquantes.length) {
      console.warn(`[prerender] dans le sitemap mais pas pré-rendues : ${manquantes.join(", ")}`);
    }
  } catch {
    /* pas de sitemap : rien à contrôler */
  }
}

try {
  await principal();
} catch (e) {
  console.warn("[prerender] ignoré après erreur :", e?.message ?? e);
} finally {
  await rm(TEMP, { recursive: true, force: true }).catch(() => {});
}
