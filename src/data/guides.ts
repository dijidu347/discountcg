// L'index des guides du site, lu par la page /guides et par le prérendu.
//
// Depuis que le menu « Démarches » mène droit au formulaire, les pages de
// contenu ne sont plus liées depuis la barre. Or ce sont elles qui sont
// positionnées sur Google — 1 571 clics sur seize mois — et une page qu'aucun
// lien interne ne pointe est une page que Google explore moins souvent.
//
// Ce fichier ne contient aucune icône : il doit rester chargeable par
// `scripts/prerender.mjs`, qui tourne sous Node sans React.

import { demarchesConfig } from "./demarchesConfig";

export interface Guide {
  libelle: string;
  chemin: string;
  resume: string;
  /** Le délai de traitement, quand l'entrée est une démarche. */
  delai?: string;
}

export interface GroupeGuides {
  titre: string;
  intro: string;
  /** Sert à colorer le groupe ; voir src/pages/Guides.tsx. */
  teinte: "bleu" | "ambre" | "vert" | "rose";
  guides: Guide[];
}

/** Le résumé d'une démarche vient de sa fiche : une seule source. */
function parSlug(slug: string, libelle?: string): Guide {
  const d = demarchesConfig.find((x) => x.slug === slug);
  if (!d) throw new Error(`Guide introuvable : ${slug}`);
  return {
    libelle: libelle || d.shortTitle,
    chemin: `/${d.slug}`,
    resume: d.description,
    delai: d.delai,
  };
}

export const GUIDES: GroupeGuides[] = [
  {
    titre: "Acheter ou vendre un véhicule",
    teinte: "bleu",
    intro:
      "Le vendeur déclare la cession, l'acheteur fait établir la carte grise à son nom dans le mois. Ces cinq pages couvrent la vente d'occasion de bout en bout.",
    guides: [
      parSlug("carte-grise", "Changement de titulaire"),
      parSlug("declaration-cession", "Déclaration de cession"),
      parSlug("declaration-achat", "Déclaration d'achat"),
      parSlug("annuler-declaration-cession", "Annuler une cession ou un achat"),
      {
        libelle: "Certificat de non-gage",
        chemin: "/certificat-de-non-gage",
        resume:
          "Gratuit, délivré par le ministère de l'Intérieur : ce qu'il dit vraiment, et pourquoi lire « Gage » ne veut pas dire que le véhicule l'est.",
      },
    ],
  },
  {
    titre: "Corriger ou mettre à jour une carte grise",
    teinte: "vert",
    intro:
      "Déménagement, mariage, héritage, carte perdue : le certificat d'immatriculation doit refléter la situation réelle, sous peine d'amende au contrôle.",
    guides: [
      parSlug("changement-adresse-carte-grise", "Déménagement"),
      parSlug("cotitulaire-carte-grise", "Ajouter ou retirer un nom"),
      parSlug("duplicata-carte-grise", "Carte grise perdue ou volée"),
      parSlug("succession-carte-grise", "Après un décès"),
      parSlug("modification-carte-grise", "Modifier le véhicule"),
      parSlug("changement-adresse-locataire-carte-grise", "Véhicule en LOA ou LLD"),
    ],
  },
  {
    titre: "Immatriculer un véhicule",
    teinte: "ambre",
    intro:
      "Véhicule neuf, importé, de collection ou deux-roues ancien : chaque cas a ses pièces et son ordre, et le quitus fiscal précède souvent tout le reste.",
    guides: [
      parSlug("carte-grise-vehicule-neuf", "Véhicule neuf"),
      parSlug("quitus-fiscal", "Certificat 846 A, quitus fiscal"),
      parSlug("immatriculation-ww-provisoire", "Plaque WW provisoire"),
      parSlug("annulation-cpi-ww", "Annuler un CPI WW"),
      parSlug("immatriculation-definitive", "Immatriculation définitive"),
      parSlug("immatriculation-cyclomoteur", "Scooter, cyclomoteur"),
      parSlug("fiche-identification-vehicule", "Fiche d'identification"),
    ],
  },
  {
    titre: "Pour les professionnels de l'automobile",
    teinte: "rose",
    intro:
      "Garages, concessions, négociants et loueurs déposent leurs dossiers depuis un compte professionnel, sous notre habilitation n° 285046.",
    guides: [
      {
        libelle: "Notre offre aux garages",
        chemin: "/carte-grise-professionnel",
        resume:
          "Les tarifs professionnels, le fonctionnement du compte et de son solde, et ce que le garage délègue en nous confiant ses immatriculations.",
      },
      {
        libelle: "Faut-il demander son habilitation SIV ?",
        chemin: "/habilitation-siv",
        resume:
          "Ce que coûte et impose une habilitation en propre, et à partir de quel volume elle devient plus intéressante que la délégation.",
      },
      parSlug("premiere-demande-w-garage", "Plaque W Garage"),
    ],
  },
];

/** Toutes les pages de l'index, à plat — pour le prérendu et le décompte. */
export const TOUS_LES_GUIDES: Guide[] = GUIDES.flatMap((g) => g.guides);
