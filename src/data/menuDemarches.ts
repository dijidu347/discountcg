// Le contenu du menu « Démarches ».
//
// Première version : vingt-trois entrées rangées par PUBLIC — particuliers,
// professionnels, véhicule importé, outils — chacune avec une ligne de
// description. Le menu se lisait comme un article, et le visiteur ne savait
// plus où regarder.
//
// On range désormais par FRÉQUENCE, et les chiffres l'imposent. Sur les 90
// derniers jours :
//
//     déclaration d'achat    1 222
//     déclaration de cession   854
//     carte grise              567
//     WW provisoire             58
//     W garage                  37
//     tout le reste       moins de 30 chacune
//
// Trois démarches font 94 % du volume. Les mettre sur le même plan que
// l'annulation d'un CPI WW, faite quatorze fois en trois mois, c'était rendre
// le menu illisible pour servir une symétrie qui n'existe pas.
//
// Et plus de descriptions : le libellé seul, avec une icône. Celui qui cherche
// son duplicata reconnaît « Carte grise perdue ou volée » sans qu'on lui
// explique que c'est un duplicata du certificat.

import type { LucideIcon } from "lucide-react";
import {
  FileText, Repeat, ShoppingCart, Car, KeyRound, Home, HeartCrack, Users,
  Bike, Sparkles, Wrench, Globe, Truck, ClipboardList, Undo2, XCircle
} from "lucide-react";

/** Un lien simple de la barre : les deux pages de prix. */
export interface LienMenu {
  libelle: string;
  chemin: string;
  icone: LucideIcon;
}

export interface EntreeMenu {
  libelle: string;
  /** La page du site : le guide, lu par ceux qui arrivent de Google. */
  chemin: string;
  icone: LucideIcon;
  /**
   * Le code de la démarche. Le menu mène au formulaire et non au guide : qui
   * ouvre le menu est déjà sur le site, il vient commander, pas lire. Le menu
   * ne contient donc QUE des démarches — les pages de service (offre garages,
   * habilitation SIV, non-gage) vivent dans le pied de page et le blog.
   */
  code: string;
}

/** Où mène une entrée du menu : droit au formulaire. */
export function lienDuMenu(e: EntreeMenu): string {
  return `/demarrer/${e.code}`;
}

export interface GroupeMenu {
  titre: string;
  entrees: EntreeMenu[];
  /** Groupe long : sa liste s'étale sur deux colonnes dans le panneau du bureau. */
  large?: boolean;
}

export const MENU_DEMARCHES: GroupeMenu[] = [
  {
    titre: "Les plus demandées",
    entrees: [
      { libelle: "Carte grise", chemin: "/carte-grise", icone: FileText, code: "CG" },
      { libelle: "Déclaration de cession", chemin: "/declaration-cession", icone: Repeat, code: "DC" },
      { libelle: "Déclaration d'achat", chemin: "/declaration-achat", icone: ShoppingCart, code: "DA" },
    ],
  },
  {
    titre: "Pour les pros de l'auto",
    entrees: [
      { libelle: "Plaque W Garage", chemin: "/premiere-demande-w-garage", icone: Truck, code: "W_GARAGE" },
      { libelle: "Plaque WW provisoire", chemin: "/immatriculation-ww-provisoire", icone: Globe, code: "CPI_WW" },
      { libelle: "Annuler une cession ou un achat", chemin: "/annuler-declaration-cession", icone: Undo2, code: "ANNULER_DC_DA" },
      { libelle: "Annuler un CPI WW", chemin: "/annulation-cpi-ww", icone: XCircle, code: "ANNULATION_CPI_WW" },
    ],
  },
  {
    titre: "Autres démarches",
    large: true,
    entrees: [
      { libelle: "Carte grise perdue ou volée", chemin: "/duplicata-carte-grise", icone: KeyRound, code: "DUPLICATA" },
      { libelle: "Déménagement", chemin: "/changement-adresse-carte-grise", icone: Home, code: "CHGT_ADRESSE" },
      { libelle: "Après un décès", chemin: "/succession-carte-grise", icone: HeartCrack, code: "SUCCESSION" },
      { libelle: "Ajouter ou retirer un nom", chemin: "/cotitulaire-carte-grise", icone: Users, code: "COTITULAIRE" },
      { libelle: "Scooter, cyclomoteur", chemin: "/immatriculation-cyclomoteur", icone: Bike, code: "IMMAT_CYCLO_ANCIEN" },
      { libelle: "Véhicule neuf", chemin: "/carte-grise-vehicule-neuf", icone: Sparkles, code: "CG_NEUF" },
      { libelle: "Modifier le véhicule", chemin: "/modification-carte-grise", icone: Wrench, code: "MODIF_CG" },
      { libelle: "Certificat 846 A, quitus fiscal", chemin: "/quitus-fiscal", icone: Globe, code: "QUITUS_FISCAL" },
      { libelle: "Immatriculation définitive", chemin: "/immatriculation-definitive", icone: Car, code: "IMMAT_DEFINITIVE" },
      { libelle: "Véhicule en LOA ou LLD", chemin: "/changement-adresse-locataire-carte-grise", icone: Home, code: "CHANGEMENT_ADRESSE_LOCATAIRE" },
      { libelle: "Fiche d'identification", chemin: "/fiche-identification-vehicule", icone: ClipboardList, code: "FIV" },
    ],
  },
];

/** Les deux pages de prix, pour l'onglet « Prix » de la barre. */
export const MENU_PRIX: LienMenu[] = [
  { libelle: "Simulateur de prix", chemin: "/simulateur", icone: ClipboardList },
  { libelle: "Prix par département", chemin: "/carte-grise-par-departement", icone: Globe },
];
