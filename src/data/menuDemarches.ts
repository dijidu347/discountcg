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
  Bike, Sparkles, Wrench, Globe, Truck, ClipboardList, Building2, Undo2, XCircle, Award,
} from "lucide-react";

export interface EntreeMenu {
  libelle: string;
  chemin: string;
  icone: LucideIcon;
}

export interface GroupeMenu {
  titre: string;
  entrees: EntreeMenu[];
}

export const MENU_DEMARCHES: GroupeMenu[] = [
  {
    titre: "Les plus demandées",
    entrees: [
      { libelle: "Carte grise", chemin: "/carte-grise", icone: FileText },
      { libelle: "Déclaration de cession", chemin: "/declaration-cession", icone: Repeat },
      { libelle: "Déclaration d'achat", chemin: "/declaration-achat", icone: ShoppingCart },
    ],
  },
  {
    titre: "Pour les pros de l'auto",
    entrees: [
      { libelle: "Nos services aux garages", chemin: "/carte-grise-professionnel", icone: Building2 },
      { libelle: "Plaque W Garage", chemin: "/premiere-demande-w-garage", icone: Truck },
      { libelle: "Plaque WW provisoire", chemin: "/immatriculation-ww-provisoire", icone: Globe },
      { libelle: "Annuler une cession ou un achat", chemin: "/annuler-declaration-cession", icone: Undo2 },
      { libelle: "Annuler un CPI WW", chemin: "/annulation-cpi-ww", icone: XCircle },
      { libelle: "Habilitation SIV", chemin: "/habilitation-siv", icone: Award },
    ],
  },
  {
    titre: "Autres démarches",
    entrees: [
      { libelle: "Carte grise perdue ou volée", chemin: "/duplicata-carte-grise", icone: KeyRound },
      { libelle: "Déménagement", chemin: "/changement-adresse-carte-grise", icone: Home },
      { libelle: "Après un décès", chemin: "/succession-carte-grise", icone: HeartCrack },
      { libelle: "Ajouter ou retirer un nom", chemin: "/cotitulaire-carte-grise", icone: Users },
      { libelle: "Scooter, cyclomoteur", chemin: "/immatriculation-cyclomoteur", icone: Bike },
      { libelle: "Véhicule neuf", chemin: "/carte-grise-vehicule-neuf", icone: Sparkles },
      { libelle: "Modifier le véhicule", chemin: "/modification-carte-grise", icone: Wrench },
      { libelle: "Certificat 846 A, quitus fiscal", chemin: "/quitus-fiscal", icone: Globe },
      { libelle: "Immatriculation définitive", chemin: "/immatriculation-definitive", icone: Car },
      { libelle: "Véhicule en LOA ou LLD", chemin: "/changement-adresse-locataire-carte-grise", icone: Home },
      { libelle: "Fiche d'identification", chemin: "/fiche-identification-vehicule", icone: ClipboardList },
      { libelle: "Certificat de non-gage", chemin: "/certificat-de-non-gage", icone: ClipboardList },
    ],
  },
];

/** Les deux pages de prix, pour l'onglet « Prix » de la barre. */
export const MENU_PRIX: EntreeMenu[] = [
  { libelle: "Simulateur de prix", chemin: "/simulateur", icone: ClipboardList },
  { libelle: "Prix par département", chemin: "/carte-grise-par-departement", icone: Globe },
];
