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

  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Discount Carte Grise",
    url: BASE,
  };

  let ecrites = 0;

  // Pages écrites à la main.
  for (const [route, seo] of Object.entries(ROUTES_SEO)) {
    const html = corps({ h1: seo.h1, blocs: [paragraphes(seo.intro)] });
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
        paragraphes([d.description, d.longDescription]),
        liste("Pièces à fournir", d.documents),
        liste("Comment ça se passe", d.steps),
        d.delai ? `<h2>Délai</h2><p>${echappe(d.delai)}</p>` : "",
        d.prixDescription ? `<h2>Tarif</h2><p>${echappe(d.prixDescription)}</p>` : "",
        d.seoContent ? paragraphes([d.seoContent]) : "",
        faqHtml(d.faqs),
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
