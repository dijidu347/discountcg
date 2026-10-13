// Le contenu du menu « Démarches », en un seul endroit.
//
// L'onglet menait à /carte-grise, une seule page : il promettait une liste et
// livrait une démarche. Les vingt pages du site n'étaient donc atteignables
// que depuis la section « Nos démarches » de l'accueil, et les cent une pages
// départementales depuis nulle part.
//
// Les libellés sont ceux que le visiteur emploie, pas les titres des pages :
// on dit « Carte grise perdue » et non « Duplicata de carte grise », parce que
// c'est ainsi qu'on cherche quand on l'a perdue. Le chemin, lui, ne change pas.

export interface EntreeMenu {
  libelle: string;
  chemin: string;
  /** Une ligne de contexte, montrée sur grand écran seulement. */
  note?: string;
}

export interface ColonneMenu {
  titre: string;
  entrees: EntreeMenu[];
}

export const MENU_DEMARCHES: ColonneMenu[] = [
  {
    titre: "Particuliers",
    entrees: [
      { libelle: "Carte grise", chemin: "/carte-grise", note: "Changement de titulaire après un achat" },
      { libelle: "Déclaration de cession", chemin: "/declaration-cession", note: "Déclarer la vente de son véhicule" },
      { libelle: "Carte grise perdue ou volée", chemin: "/duplicata-carte-grise", note: "Duplicata du certificat" },
      { libelle: "Déménagement", chemin: "/changement-adresse-carte-grise", note: "Changement d'adresse" },
      { libelle: "Après un décès", chemin: "/succession-carte-grise", note: "Succession et héritage" },
      { libelle: "Ajouter ou retirer un nom", chemin: "/cotitulaire-carte-grise", note: "Cotitulaire" },
      { libelle: "Scooter, cyclomoteur", chemin: "/immatriculation-cyclomoteur", note: "50 cm³ et mobylettes" },
      { libelle: "Véhicule neuf", chemin: "/carte-grise-vehicule-neuf", note: "Première immatriculation" },
      { libelle: "Modifier le véhicule", chemin: "/modification-carte-grise", note: "E85, attelage, changement de genre" },
    ],
  },
  {
    titre: "Professionnels",
    entrees: [
      { libelle: "Déclaration d'achat", chemin: "/declaration-achat", note: "La première est offerte" },
      { libelle: "Plaque W Garage", chemin: "/premiere-demande-w-garage", note: "Attribuée à l'entreprise" },
      { libelle: "Nos services aux garages", chemin: "/carte-grise-professionnel", note: "Compte pro et tarifs" },
      { libelle: "Annuler une cession ou un achat", chemin: "/annuler-declaration-cession", note: "Corriger une erreur" },
      { libelle: "Annuler un CPI WW", chemin: "/annulation-cpi-ww" },
      { libelle: "Habilitation SIV", chemin: "/habilitation-siv", note: "Les conditions pour l'obtenir" },
    ],
  },
  {
    titre: "Véhicule importé",
    entrees: [
      { libelle: "Certificat 846 A, quitus fiscal", chemin: "/quitus-fiscal", note: "Lequel vous concerne" },
      { libelle: "Plaque WW provisoire", chemin: "/immatriculation-ww-provisoire", note: "Rouler quatre mois" },
      { libelle: "Immatriculation définitive", chemin: "/immatriculation-definitive", note: "Après le WW" },
      { libelle: "Adresse d'un véhicule en LOA", chemin: "/changement-adresse-locataire-carte-grise", note: "Locataire longue durée" },
    ],
  },
  {
    titre: "Outils et références",
    entrees: [
      { libelle: "Simulateur de prix", chemin: "/simulateur", note: "À partir de la plaque" },
      { libelle: "Carte grise par département", chemin: "/carte-grise-par-departement", note: "Les 101 départements" },
      { libelle: "Certificat de non-gage", chemin: "/certificat-de-non-gage", note: "Gratuit, à exiger avant d'acheter" },
      { libelle: "Fiche d'identification", chemin: "/fiche-identification-vehicule", note: "Quand la carte grise manque" },
    ],
  },
];
