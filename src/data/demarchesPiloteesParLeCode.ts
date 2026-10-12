// Quelles démarches tirent leur liste de pièces du code, et non de la base.
//
// Deux mécanismes coexistent. Les démarches classiques — carte grise,
// déclaration d'achat, déclaration de cession — lisent `action_documents`, donc
// la page « Gérer les actions rapides » les pilote vraiment. Les quinze
// démarches professionnelles, elles, lisent une liste écrite dans
// `getDocumentsConfig` : leurs lignes en base existent toujours mais ne
// produisent plus rien à l'écran.
//
// Mesure du 12/10/2026 : 4 286 démarches classiques contre 140 démarches pro
// sur douze mois. Brancher le tunnel pro sur la base reviendrait à écrire du
// code pour 3 % du volume ; on garde donc les deux mécanismes, mais l'écran
// d'administration doit dire lequel commande, sinon on y modifie une liste
// sans effet en croyant avoir agi.
//
// Cette liste est importée par les deux écrans concernés. En écrire une copie
// ailleurs recréerait exactement la divergence qu'on cherche à éviter.

export const DEMARCHES_PILOTEES_PAR_LE_CODE = [
  "WW_PROVISOIRE_PRO",
  "W_GARAGE_PRO",
  "QUITUS_FISCAL_PRO",
  "CHANGEMENT_ADRESSE_PRO",
  "DUPLICATA_CG_PRO",
  "FIV_PRO",
  "CG_NEUF_PRO",
  "MODIF_CG_PRO",
  "ANNULATION_CPI_WW_PRO",
  "CHANGEMENT_ADRESSE_LOCATAIRE_PRO",
  "SUCCESSION_HERITAGE_PRO",
  "COTITULAIRE_PRO",
  "ANNULER_CORRIGER_DC_DA_PRO",
  "CYCLO_ANCIEN_PRO",
  "IMMAT_DEFINITIVE_PRO",
];

/** Vrai quand les pièces de cette démarche ne se règlent pas depuis l'administration. */
export function piecesFixeesDansLeCode(code: string | null | undefined): boolean {
  return Boolean(code) && DEMARCHES_PILOTEES_PAR_LE_CODE.includes(code as string);
}
