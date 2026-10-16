// Vérifie, en une commande, que discountcartegrise.fr est en bonne santé.
//
// Écrit pendant la bascule de Lovable vers GitHub Pages (octobre 2026), où
// chaque étape se vérifiait à la main : un dig par ici, un curl par là, et
// l'oubli systématique de celle qu'on venait de corriger. Le script passe
// toutes les vérifications dans l'ordre et dit, en français, ce qui cloche.
//
//     node scripts/verifier-site.mjs
//
// Sortie 0 : tout va bien. Sortie 1 : au moins un point rouge.

import { promises as dns } from "node:dns";
import tls from "node:tls";
import { execSync } from "node:child_process";

const DOMAINE = "discountcartegrise.fr";

// Les quatre adresses de GitHub Pages. GitHub demande les quatre : avec une
// seule, la demande de certificat peut rester coincée en « dns_changed ».
const IP_GITHUB = [
  "185.199.108.153",
  "185.199.109.153",
  "185.199.110.153",
  "185.199.111.153",
];

const CIBLE_WWW = "dijidu347.github.io";

// Les pages qui doivent répondre. Une par famille, pour couvrir les quatre
// façons dont le site fabrique ses URL.
const PAGES = [
  ["/", "l'accueil"],
  ["/blog", "le blog"],
  ["/guides", "les guides"],
  ["/carte-grise", "un guide (page pré-rendue)"],
  ["/demarrer/CG", "une démarche (formulaire)"],
  ["/simulateur", "le simulateur de prix"],
];

const vert = (s) => `\x1b[32m${s}\x1b[0m`;
const rouge = (s) => `\x1b[31m${s}\x1b[0m`;
const orange = (s) => `\x1b[33m${s}\x1b[0m`;

let rouges = 0;
let oranges = 0;

function ok(texte, detail = "") {
  console.log(`  ${vert("OK")}    ${texte}${detail ? `  ${detail}` : ""}`);
}
function ko(texte, detail = "") {
  rouges += 1;
  console.log(`  ${rouge("KO")}    ${texte}${detail ? `  ${detail}` : ""}`);
}
function tiede(texte, detail = "") {
  oranges += 1;
  console.log(`  ${orange("~~")}    ${texte}${detail ? `  ${detail}` : ""}`);
}

function titre(t) {
  console.log(`\n${t}`);
}

/** Le certificat présenté par le domaine, ou null s'il n'y en a pas. */
function certificat(hote) {
  return new Promise((resolve) => {
    const fin = (v) => {
      try { socket.destroy(); } catch { /* déjà fermé */ }
      resolve(v);
    };
    const socket = tls.connect(
      { host: hote, port: 443, servername: hote, timeout: 10000 },
      () => {
        const c = socket.getPeerCertificate();
        fin({ sujet: c?.subject?.CN ?? "?", jusquau: c?.valid_to ?? "?", emetteur: c?.issuer?.O ?? "?" });
      },
    );
    socket.on("error", () => fin(null));
    socket.on("timeout", () => fin(null));
  });
}

async function page(chemin) {
  const t0 = Date.now();
  try {
    const r = await fetch(`https://${DOMAINE}${chemin}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const corps = await r.text();
    return { code: r.status, corps, ms: Date.now() - t0 };
  } catch (e) {
    return { code: 0, corps: "", ms: Date.now() - t0, erreur: e.message };
  }
}

// ---------------------------------------------------------------- 1. DNS

titre("1. Les adresses (DNS)");

let ipsApex = [];
try {
  ipsApex = await dns.resolve4(DOMAINE);
} catch (e) {
  ko(`le domaine ${DOMAINE} ne résout pas`, e.code ?? "");
}

const manquantes = IP_GITHUB.filter((ip) => !ipsApex.includes(ip));
const intruses = ipsApex.filter((ip) => !IP_GITHUB.includes(ip));

if (intruses.length) {
  ko(`${DOMAINE} pointe ailleurs que vers GitHub`, intruses.join(", "));
} else if (manquantes.length === 0) {
  ok(`${DOMAINE} pointe vers les 4 adresses de GitHub`);
} else if (ipsApex.length) {
  tiede(
    `${DOMAINE} n'a que ${ipsApex.length} adresse(s) GitHub sur 4`,
    `il manque ${manquantes.join(", ")}`,
  );
}

try {
  const www = await dns.resolveCname(`www.${DOMAINE}`);
  if (www.some((c) => c.replace(/\.$/, "") === CIBLE_WWW)) ok(`www pointe vers ${CIBLE_WWW}`);
  else ko("www pointe ailleurs", www.join(", "));
} catch {
  ko(`www.${DOMAINE} n'a pas de CNAME`);
}

try {
  const caa = await dns.resolveCaa(DOMAINE);
  const autorites = caa.map((e) => e.issue ?? e.issuewild).filter(Boolean);
  if (!autorites.length) ok("aucun enregistrement CAA ne bloque l'émission du certificat");
  else if (autorites.some((a) => a.includes("letsencrypt.org"))) ok("le CAA autorise Let's Encrypt", autorites.join(", "));
  else ko("le CAA interdit Let's Encrypt — le certificat ne sera jamais émis", autorites.join(", "));
} catch {
  ok("aucun enregistrement CAA ne bloque l'émission du certificat");
}

// Ce que la bascule ne doit surtout pas casser : les mots de passe oubliés
// des 850 comptes garage partent depuis notify.discountcartegrise.fr.
try {
  const ns = await dns.resolveNs(`notify.${DOMAINE}`);
  if (ns.length) ok("notify est toujours délégué (réinitialisation des mots de passe)", ns.join(", "));
  else ko("notify n'est plus délégué — les mots de passe oubliés ne partiront plus");
} catch {
  ko("notify n'est plus délégué — les mots de passe oubliés ne partiront plus");
}

// Et les mails métier, qui partent par Brevo et IONOS.
try {
  const mx = await dns.resolveMx(DOMAINE);
  if (mx.length) ok("les MX sont en place (réception des mails)", mx.map((m) => m.exchange).join(", "));
  else ko("plus aucun MX : le domaine ne reçoit plus de mail");
} catch {
  ko("plus aucun MX : le domaine ne reçoit plus de mail");
}

// ------------------------------------------------------- 2. Le certificat

titre("2. Le certificat (HTTPS)");

const cert = await certificat(DOMAINE);
if (!cert) {
  ko("pas de certificat : le site est inaccessible en https", "les visiteurs voient une erreur");
} else if (cert.sujet === DOMAINE || cert.sujet === `*.${DOMAINE}`) {
  ok(`certificat valide pour ${cert.sujet}`, `délivré par ${cert.emetteur}, jusqu'au ${cert.jusquau}`);
} else {
  ko(`le certificat ne couvre pas ${DOMAINE}`, `il est au nom de ${cert.sujet}`);
}

// ------------------------------------------------------------ 3. Les pages

titre("3. Les pages");

let shaEnLigne = null;
for (const [chemin, nom] of PAGES) {
  const r = await page(chemin);
  // GitHub Pages n'a pas de règle de réécriture : une route qui n'existe pas
  // en fichier est servie via 404.html, avec un vrai code 404. Le routeur de
  // l'application prend le relais et la page s'affiche normalement — mais le
  // code reste 404. C'est sans effet ici : les 133 URL du sitemap sont toutes
  // pré-rendues, donc toutes en 200. Seules les routes non indexées, comme les
  // redirections vers les formulaires, passent par ce chemin.
  const servieParLeRouteur = r.code === 404 && r.corps.includes('id="root"');

  if (r.code === 200 || servieParLeRouteur) {
    if (servieParLeRouteur) ok(`${nom}`, `${chemin}  (servie par le routeur, ${r.ms} ms)`);
    else ok(`${nom}`, `${chemin}  (${r.ms} ms)`);
    if (!shaEnLigne) {
      const m = r.corps.match(/data-commit-sha="([0-9a-f]{7,40})"/);
      if (m) shaEnLigne = m[1];
    }
  } else if (r.code === 0) {
    ko(`${nom} ne répond pas`, `${chemin}  ${r.erreur ?? ""}`);
  } else {
    ko(`${nom} répond ${r.code}`, chemin);
  }
}

// ------------------------------------------------- 4. La version en ligne

titre("4. La version publiée");

if (!shaEnLigne) {
  tiede("aucune page ne porte de marqueur de version", "le pré-rendu n'a peut-être pas tourné");
} else {
  let local = null;
  try {
    local = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch { /* hors dépôt */ }

  if (!local) {
    ok("version en ligne", shaEnLigne);
  } else if (local.startsWith(shaEnLigne) || shaEnLigne.startsWith(local.slice(0, shaEnLigne.length))) {
    ok("le site en ligne est bien le dernier commit", shaEnLigne);
  } else {
    let retard = "";
    try {
      const n = execSync(`git rev-list --count ${shaEnLigne}..HEAD`, { encoding: "utf8" }).trim();
      retard = ` — ${n} commit(s) pas encore publié(s)`;
    } catch { /* commit inconnu en local */ }
    tiede("le site en ligne n'est pas le dernier commit", `en ligne ${shaEnLigne}, local ${local.slice(0, 7)}${retard}`);
  }
}

// ------------------------------------------------------------- Conclusion

console.log("");
if (rouges === 0 && oranges === 0) {
  console.log(vert("Tout est bon."));
  process.exit(0);
}
if (rouges === 0) {
  console.log(orange(`${oranges} point(s) à surveiller, rien de cassé.`));
  process.exit(0);
}
console.log(rouge(`${rouges} point(s) cassé(s)${oranges ? `, ${oranges} à surveiller` : ""}.`));
process.exit(1);
