// Le texte des cent une pages départementales, calculé une fois pour deux
// lecteurs : le composant React et le script de prérendu.
//
// C'est la règle du dépôt depuis seoRoutes.ts, et elle vaut doublement ici.
// Un contenu qui ne vivrait que dans du JSX serait absent du HTML servi, donc
// invisible pour les robots des assistants ; et s'il était recopié dans le
// script de prérendu, les deux versions divergeraient au premier changement de
// tarif — ce qui porte un nom, le cloaking.
//
// Le défi propre à ces pages : le tarif du cheval fiscal est voté par la
// RÉGION. Douze départements d'Auvergne-Rhône-Alpes partagent le même 43 €.
// Écrire cent une fois le même texte en changeant le nom produirait exactement
// ce que les moteurs appellent une page satellite. Trois choses distinguent
// donc réellement chaque page, et elles viennent de departements.ts :
//
//   - les communes, parce qu'on cherche « carte grise Lyon » avant « carte
//     grise Rhône », et que la réponse — le tarif ne dépend pas de la commune —
//     est une vraie question ;
//   - les départements limitrophes et l'écart de prix avec chacun, seul calcul
//     qui change d'une page à l'autre au sein d'une même région ;
//   - le rang du tarif parmi les dix-huit en vigueur en France.
//
// Les montants sortent de calculatePrice, celle qu'utilise le simulateur : le
// prix annoncé ici est celui qui sera facturé.

import { calculatePrice } from "@/utils/calculatePrice";
import { departementsTarifs } from "@/data/departementsTarifs";
import {
  CHEMIN_DEPARTEMENT,
  DEPARTEMENTS,
  DEPARTEMENT_PAR_CODE,
  DEPARTEMENTS_DE_REGION,
  REGIONS,
  type Departement,
  type Region,
} from "@/data/departements";

const BASE = "https://discountcartegrise.fr";

/** Frais de dossier annoncés pour un changement de titulaire. */
// Réexporté depuis la source unique, pour que les pages départements ne
// puissent plus annoncer un tarif différent du reste du site.
export { FRAIS_CG_PARTICULIER as FRAIS_DOSSIER_CG } from "./tarifsFraisDossier";
import { FRAIS_CG_PARTICULIER as FRAIS_DOSSIER_CG } from "./tarifsFraisDossier";

/**
 * De 3 à 15 CV : la fourchette où se trouve la quasi-totalité du parc
 * particulier. Six lignes ne suffisaient pas — on vient chercher SON chiffre,
 * et un 9 CV ou un 12 CV renvoyé vers le simulateur est une page qui n'a pas
 * répondu.
 */
const PUISSANCES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** Un véhicule de moins de dix ans, et un de plus : les deux colonnes du barème. */
const RECENT = "2020-01-01";
const ANCIEN = "2008-01-01";

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export interface LigneBareme {
  cv: number;
  /** Taxe régionale seule, véhicule de moins de dix ans. */
  taxe: number;
  /** Total officiel : taxe régionale + taxe fixe + redevance d'acheminement. */
  total: number;
  /** Le même total pour un véhicule de plus de dix ans (taxe régionale de moitié). */
  totalAncien: number;
  /** Total réglé chez nous, frais de dossier compris. */
  totalAvecFrais: number;
}

export interface Voisin {
  code: string;
  nom: string;
  /** « l'Ain », « la Loire » : pour écrire une énumération correcte. */
  le: string;
  /** « dans l'Ain », « en Saône-et-Loire » : pour une phrase locative. */
  dans: string;
  chemin: string;
  tarif: number;
  /** Écart sur une carte grise de 6 CV, en euros. Négatif = moins cher à côté. */
  ecart6cv: number;
  memeRegion: boolean;
  region: string;
}

export interface ContenuDepartement {
  departement: Departement;
  region: Region;
  tarif: number;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  intro: string[];
  bareme: LigneBareme[];
  /** Phrase sur les communes : le tarif ne dépend pas d'elles. */
  communesTexte: string;
  voisins: Voisin[];
  voisinsTexte: string[];
  /** Le titre de la section de comparaison : les voisins n'en sont pas pour les DOM. */
  voisinsTitre: string;
  /** Les autres départements de la région, qui partagent le tarif. */
  memeTarif: { code: string; nom: string; chemin: string }[];
  memeTarifTexte: string;
  rangTexte: string;
  electriqueTexte: string;
  faqs: { question: string; answer: string }[];
}

/** Les dix-huit tarifs en vigueur, du plus bas au plus haut, sans doublon. */
const TARIFS_TRIES = [...new Set(Object.values(departementsTarifs))].sort((a, b) => a - b);

const tarifExtreme = (haut: boolean) => {
  const cible = haut ? TARIFS_TRIES[TARIFS_TRIES.length - 1] : TARIFS_TRIES[0];
  const code = DEPARTEMENTS.find((d) => departementsTarifs[d.code] === cible)!;
  return { tarif: cible, region: REGIONS[code.region] };
};

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Ce que la réponse peut dire de propre à ce département : comment il se situe
 * face à ses voisins. C'est la seule comparaison qui change d'une page à
 * l'autre au sein d'une même région.
 */
function c_voisinsResume(voisins: Voisin[], tarif: number, mot = "limitrophes"): string {
  if (voisins.length === 0) return "Le territoire n'a pas de département limitrophe.";
  const moins = voisins.filter((v) => v.tarif < tarif);
  const plus = voisins.filter((v) => v.tarif > tarif);
  if (moins.length === 0 && plus.length === 0)
    return `Les ${voisins.length} départements ${mot} appliquent le même tarif.`;
  const bouts: string[] = [];
  if (moins.length > 0)
    bouts.push(
      `${moins.length} des ${voisins.length} départements ${mot} sont moins chers (${moins
        .map((v) => v.le)
        .join(", ")})`,
    );
  if (plus.length > 0)
    bouts.push(
      `${plus.length} ${plus.length > 1 ? "sont" : "est"} plus cher${plus.length > 1 ? "s" : ""} (${plus
        .map((v) => v.le)
        .join(", ")})`,
    );
  return `${majuscule(bouts.join(", et "))}.`;
}

function liste(mots: string[], liaison = "et"): string {
  if (mots.length === 0) return "";
  if (mots.length === 1) return mots[0];
  return `${mots.slice(0, -1).join(", ")} ${liaison} ${mots[mots.length - 1]}`;
}

export function contenuDepartement(dep: Departement): ContenuDepartement {
  const tarif = departementsTarifs[dep.code];
  const region = REGIONS[dep.region];
  const chemin = CHEMIN_DEPARTEMENT(dep);

  const bareme: LigneBareme[] = PUISSANCES.map((cv) => {
    const recent = calculatePrice(tarif, cv, RECENT, "VP");
    const ancien = calculatePrice(tarif, cv, ANCIEN, "VP");
    return {
      cv,
      taxe: recent.prixCV,
      total: recent.prixTotal,
      totalAncien: ancien.prixTotal,
      totalAvecFrais: recent.prixTotal + FRAIS_DOSSIER_CG,
    };
  });

  const six = bareme.find((l) => l.cv === 6)!;

  // Les voisins, et ce que coûterait la même carte grise de l'autre côté.
  // Les cinq départements d'outre-mer n'ont aucun limitrophe : leur page
  // perdait donc toute la section de comparaison que les quatre-vingt-seize
  // autres possèdent, et ne recevait que trois liens entrants contre huit en
  // moyenne. Or la comparaison qui les intéresse existe, elle n'est simplement
  // pas géographique : entre eux. Le tarif va de 30 € à Mayotte à 60 € à La
  // Réunion, du simple au double — l'écart le plus large de France.
  const DOM = ["971", "972", "973", "974", "976"];
  const aComparer = dep.limitrophes.length > 0
    ? dep.limitrophes
    : DOM.includes(dep.code)
      ? DOM.filter((c) => c !== dep.code)
      : [];

  const motComparaison = dep.limitrophes.length > 0 ? "limitrophes" : "d'outre-mer";
  const voisinsTitre = dep.limitrophes.length > 0
    ? "Les départements limitrophes"
    : "Les autres départements d'outre-mer";

  const voisins: Voisin[] = aComparer
    .map((code) => {
      const v = DEPARTEMENT_PAR_CODE[code];
      const t = departementsTarifs[code];
      return {
        code,
        nom: v.nom,
        le: v.le,
        dans: v.dans,
        chemin: CHEMIN_DEPARTEMENT(v),
        tarif: t,
        ecart6cv: Math.round((t - tarif) * 6 * 100) / 100,
        memeRegion: v.region === dep.region,
        region: REGIONS[v.region].nom,
      };
    })
    .sort((a, b) => a.ecart6cv - b.ecart6cv || a.nom.localeCompare(b.nom, "fr"));

  const memeTarif = DEPARTEMENTS_DE_REGION(dep.region)
    .filter((d) => d.code !== dep.code)
    .map((d) => ({ code: d.code, nom: d.nom, chemin: CHEMIN_DEPARTEMENT(d) }));

  // Rang du tarif parmi les dix-huit en vigueur.
  const rang = TARIFS_TRIES.indexOf(tarif) + 1;
  const bas = tarifExtreme(false);
  const haut = tarifExtreme(true);
  const rangTexte =
    rang === 1
      ? `À ${eur(tarif)} le cheval fiscal, c'est le tarif le plus bas de France. Le plus élevé, celui ${REGIONS.idf.dans.replace("en ", "de l'")}, atteint ${eur(haut.tarif)} — soit ${eur((haut.tarif - tarif) * 6)} de plus sur une carte grise de 6 CV.`
      : rang === TARIFS_TRIES.length
        ? `À ${eur(tarif)} le cheval fiscal, c'est le tarif le plus élevé de France. Le plus bas, ${bas.region.dans}, est à ${eur(bas.tarif)} — soit ${eur((tarif - bas.tarif) * 6)} d'écart sur une carte grise de 6 CV.`
        : `Sur les ${TARIFS_TRIES.length} tarifs en vigueur en France, celui-ci est le ${rang}ᵉ plus bas. Le moins cher est ${bas.region.dans} (${eur(bas.tarif)}), le plus cher ${REGIONS.idf.dans} (${eur(haut.tarif)}).`;

  // L'électrique : la règle de la région, depuis que la loi de finances pour
  // 2025 a remplacé l'exonération nationale par une décision régionale.
  const electriqueTexte =
    region.coefficientElectrique === 1
      ? `Un véhicule électrique ou à hydrogène paie la taxe régionale au même tarif qu'un thermique. L'exonération nationale a pris fin le 1er mai 2025 : l'article 119 de la loi de finances pour 2025 a rendu la décision à chaque région, et ${region.votant} a retenu le plein tarif. Pour 6 CV ${dep.dans}, cela représente ${eur(six.taxe)} de taxe régionale.`
      : `${region.noteElectrique ?? ""} Un véhicule électrique ou à hydrogène immatriculé ${dep.dans} paie donc ${eur(six.taxe * region.coefficientElectrique)} de taxe régionale pour 6 CV, au lieu de ${eur(six.taxe)}.`;

  const communesTexte = `Le tarif dépend du département de domiciliation, jamais de la commune : ${liste(
    dep.communes.slice(0, 5),
  )} paient exactement le même cheval fiscal.`;

  const voisinsPlusCher = voisins.filter((v) => v.ecart6cv > 0);
  const voisinsMoinsCher = voisins.filter((v) => v.ecart6cv < 0);
  const voisinsPareil = voisins.filter((v) => v.ecart6cv === 0);

  const voisinsTexte: string[] = [];
  if (voisins.length > 0) {
    if (voisinsPareil.length === voisins.length) {
      voisinsTexte.push(
        `Tous les départements limitrophes appliquent le même tarif — ${liste(
          voisinsPareil.map((v) => v.le),
        )}. Franchir la limite ne change rien au prix de votre carte grise.`,
      );
    } else {
      if (voisinsPareil.length > 0) {
        voisinsTexte.push(
          `${majuscule(liste(voisinsPareil.map((v) => v.le)))} ${
            voisinsPareil.length > 1 ? "appliquent" : "applique"
          } le même tarif : rien ne change en franchissant la limite.`,
        );
      }
      if (voisinsMoinsCher.length > 0) {
        const m = voisinsMoinsCher[0];
        voisinsTexte.push(
          `${voisinsMoinsCher.length > 1 ? "Plusieurs voisins sont moins chers" : "Un voisin est moins cher"} : ${liste(
            voisinsMoinsCher.map((v) => `${v.le} (${eur(v.tarif)}/CV)`),
          )}. Sur une carte grise de 6 CV, l'écart atteint ${eur(Math.abs(m.ecart6cv))} ${m.dans}.`,
        );
      }
      if (voisinsPlusCher.length > 0) {
        const p = voisinsPlusCher[voisinsPlusCher.length - 1];
        voisinsTexte.push(
          `À l'inverse, ${liste(
            voisinsPlusCher.map((v) => `${v.le} (${eur(v.tarif)}/CV)`),
          )} ${voisinsPlusCher.length > 1 ? "coûtent" : "coûte"} plus cher : ${eur(
            p.ecart6cv,
          )} de plus sur un 6 CV ${p.dans}.`,
        );
      }
    }
    voisinsTexte.push(
      `Ces écarts n'ouvrent aucune option : le département retenu est celui de votre domicile, et une adresse de complaisance expose à l'annulation du titre.`,
    );
  }

  const memeTarifTexte =
    memeTarif.length > 0
      ? `Le tarif est voté par ${region.votant}, et vaut à l'identique dans ses ${
          memeTarif.length + 1
        } départements : ${liste(
          DEPARTEMENTS_DE_REGION(dep.region).map((d) => d.nom),
        )}. Changer de département sans changer de région ne change donc pas le prix.`
      : `Le tarif est voté par ${region.votant} et ne vaut que pour ce territoire.`;

  const title = `Carte grise ${dep.nom} (${dep.code}) : prix ${new Date().getFullYear()}`;
  // Google coupe une description vers 160 caractères, et c'est la fin qui
  // tombe — donc l'appel à l'action. L'ancienne version en faisait 180 pour
  // l'Yonne, et jusqu'à 200 pour les départements au nom long : les 101 pages
  // perdaient leur dernière phrase dans les résultats de recherche.
  //
  // On construit donc la version complète, et on retombe sur une version
  // courte si elle déborde, plutôt que de couper au milieu d'un mot.
  const complete = `Le cheval fiscal coûte ${eur(tarif)} ${dep.dans}. Calculez le prix exact de votre carte grise à ${dep.chefLieu}, taxes comprises. Démarche en ligne sous 24 h.`;
  const courte = `Le cheval fiscal coûte ${eur(tarif)} ${dep.dans}. Calculez le prix exact de votre carte grise, taxes comprises. Démarche en ligne sous 24 h.`;
  const description = complete.length <= 158 ? complete : courte;

  return {
    departement: dep,
    region,
    tarif,
    title,
    description,
    h1: `Carte grise ${dep.dans} (${dep.code}) : prix et démarches`,
    canonical: `${BASE}${chemin}`,
    // Une seule phrase d'ouverture, et elle ne contient que des nombres propres
    // à ce département. Les deux paragraphes qui suivaient — la composition des
    // taxes, l'habilitation — étaient rigoureusement identiques sur les cent une
    // pages : mesurés, ils portaient la similarité entre deux départements d'une
    // même région à 0,93. Ils vivent maintenant au seul endroit qui leur revient,
    // la page du simulateur, vers laquelle chaque page départementale renvoie.
    intro: [
      `${majuscule(dep.dans)}, le cheval fiscal coûte ${eur(
        tarif,
      )} : une voiture de 6 CV de moins de dix ans revient à ${eur(
        six.total,
      )} de taxes, ${eur(six.totalAncien)} si elle a plus de dix ans. À ${dep.chefLieu} comme dans le reste ${dep.de}, c'est le même tarif.`,
    ],
    bareme,
    communesTexte,
    voisins,
    voisinsTitre,
    voisinsTexte,
    memeTarif,
    memeTarifTexte,
    rangTexte,
    electriqueTexte,
    faqs: [
      {
        question: `Quel est le prix du cheval fiscal ${dep.dans} en ${new Date().getFullYear()} ?`,
        answer: `${eur(tarif)}, multiplié par la puissance fiscale lue en case P.6. ${c_voisinsResume(voisins, tarif, motComparaison)}`,
      },
      {
        question: `Combien coûte une carte grise ${dep.dans} pour une voiture de 6 CV ?`,
        answer: `${eur(six.total)} de taxes pour un véhicule de moins de dix ans : ${eur(
          six.taxe,
        )} de taxe régionale, 11 € de taxe fixe et 2,76 € de redevance d'acheminement. Au-delà de dix ans de mise en circulation, l'abattement de 50 % sur la taxe régionale ramène le total à ${eur(
          six.totalAncien,
        )}. Nos frais de dossier de ${FRAIS_DOSSIER_CG} € s'ajoutent à ce montant officiel.`,
      },
      {
        question: `Le prix change-t-il entre ${dep.chefLieu} et le reste du département ?`,
        answer: `Non. Le tarif est régional : ${eur(tarif)} le cheval fiscal à ${dep.chefLieu} comme dans toutes les communes ${dep.de}. Seule l'adresse de votre justificatif de domicile compte, parce que c'est elle qui détermine le département retenu — pas le lieu d'achat, ni celui du garage qui dépose le dossier.`,
      },
      {
        question: `Une voiture électrique est-elle exonérée ${dep.dans} ?`,
        answer: electriqueTexte,
      },
    ],
  };
}

/** Tous les contenus, pour le prérendu et le plan du site. */
export const CONTENUS_DEPARTEMENTS = (): ContenuDepartement[] =>
  DEPARTEMENTS.map((d) => contenuDepartement(d));
