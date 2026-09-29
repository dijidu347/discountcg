// Libellé de chaque pièce attendue, pour dire au modèle ce qu'il est censé lire.
//
// Les démarches rapides (CG, DA, DC…) nomment leurs pièces `doc_1`, `doc_2`… et
// le libellé vit en base dans `action_documents` : il est résolu à la volée.
// Les démarches pro ont un code explicite et leurs libellés sont écrits ici.
// La même liste existe côté admin (src/pages/admin/DemarcheDetail.tsx) pour
// l'affichage des pièces : toute pièce ajoutée là doit l'être ici aussi.

export const LIBELLES_PRO: Record<string, string> = {
  // WW provisoire
  ww_mandat: "Mandat d'immatriculation signé (Cerfa 13757)",
  ww_assurance: "Attestation d'assurance du véhicule",
  ww_facture: "Facture d'achat du véhicule",
  ww_cession: "Certificat de cession",
  ww_cg_etranger: "Certificat d'immatriculation étranger",
  ww_coc: "Certificat de conformité (COC)",
  ww_controle_technique: "Contrôle technique",
  ww_cerfa_13750: "Demande de certificat d'immatriculation (Cerfa 13750)",
  ww_quitus: "Quitus fiscal",
  ww_contrat_location: "Contrat de location complet",
  ww_mandat_location: "Mandat de la société de location",
  ww_kbis: "Extrait Kbis de moins de 6 mois",
  ww_id_representant: "Pièce d'identité du représentant légal",
  // W garage
  w_cerfa_13752: "Cerfa 13752*02 – Demande W Garage",
  w_kbis: "Extrait Kbis de moins de 6 mois",
  w_id_dirigeant: "Pièce d'identité du dirigeant",
  w_justif_domicile: "Justificatif de domicile du dirigeant",
  w_mandat: "Mandat d'immatriculation signé et tamponné (Cerfa 13757)",
  w_assurance: "Attestation d'assurance W Garage",
  w_attestation_fiscale: "Attestation de régularité fiscale",
  w_declaration_achat: "Déclaration d'achat (Cerfa 13751)",
  w_cession_vente: "Certificat de cession ou justificatif de vente",
  // Quitus fiscal
  qf_formulaire_1993: "Demande de quitus fiscal signée (1993-PRO-D-SD)",
  qf_facture: "Facture d'achat ou certificat de cession",
  qf_cg_etranger: "Certificat d'immatriculation étranger",
  qf_mandat: "Mandat d'immatriculation signé (Cerfa 13757)",
  qf_id_representant: "Pièce d'identité du représentant légal",
  qf_kbis: "Extrait Kbis de moins de 6 mois",
  qf_justif_siege: "Justificatif de domicile du siège social",
  qf_justif_tva: "Justificatif de paiement de la TVA",
  // Changement d'adresse
  ca_id_dirigeant: "Pièce d'identité du dirigeant (recto)",
  ca_id_dirigeant_verso: "Pièce d'identité du dirigeant (verso)",
  ca_certificat_immat: "Certificat d'immatriculation",
  ca_mandat: "Mandat signé et tamponné (Cerfa 13757)",
  ca_cerfa_13750: "Demande d'immatriculation signée et tamponnée (Cerfa 13750)",
  ca_kbis: "Extrait Kbis de moins de 6 mois mis à jour",
  // Duplicata
  dup_kbis: "Extrait Kbis de moins de 6 mois",
  dup_id_dirigeant: "Pièce d'identité du dirigeant (recto)",
  dup_id_dirigeant_verso: "Pièce d'identité du dirigeant (verso)",
  dup_assurance: "Attestation d'assurance",
  dup_mandat: "Mandat signé et tamponné (Cerfa 13757)",
  dup_cerfa_13750: "Demande d'immatriculation signée et tamponnée (Cerfa 13750)",
  dup_cerfa_13753: "Déclaration de perte ou de vol (Cerfa 13753)",
  dup_ct: "Contrôle technique en cours de validité",
  dup_mandat_location: "Mandat de la société de location (LOA/LLD/Crédit-Bail)",
  // Immatriculation définitive
  imd_mandat: "Mandat d'immatriculation signé (Cerfa 13757)",
  imd_cerfa_13750: "Demande de certificat d'immatriculation (Cerfa 13750)",
  imd_ci_etranger: "Certificat d'immatriculation étranger",
  imd_coc: "Certificat de conformité (COC)",
  imd_quitus: "Quitus fiscal",
  imd_assurance: "Attestation d'assurance",
  imd_facture_cession: "Facture d'achat ou certificat de cession",
  imd_kbis_id: "Extrait Kbis et pièce d'identité du dirigeant",
  imd_kbis_id_verso: "Pièce d'identité du dirigeant (verso)",
  imd_ct: "Contrôle technique",
  // Succession
  sh_cerfa_13750_heritier: "Demande d'immatriculation de l'héritier (Cerfa 13750)",
  sh_mandat: "Mandat d'immatriculation signé (Cerfa 13757)",
  sh_permis: "Permis de conduire de l'héritier",
  sh_justif_domicile: "Justificatif de domicile de l'héritier",
  // Annuler / corriger une cession ou une DA
  acd_mandat: "Mandat d'immatriculation signé (Cerfa 13757)",
  acd_id_parties: "Pièces d'identité des parties",
  acd_cg_barree: "Carte grise barrée",
  acd_cerfa_cession: "Certificat de cession (Cerfa 15776)",
  acd_cession_corrigee: "Certificat de cession corrigé",
  acd_attestation_annulation: "Attestation d'annulation",
  acd_justif_domicile: "Justificatif de domicile",
  // Carte grise véhicule neuf
  cgn_kbis: "Extrait Kbis de moins de 6 mois",
  cgn_id_dirigeant: "Pièce d'identité du dirigeant",
  cgn_assurance: "Attestation d'assurance",
};

// Pièces hors liste attendue : le garage les ajoute de lui-même.
const PIECES_LIBRES: Record<string, string> = {
  non_gage: "Certificat de situation administrative (non-gage)",
};

export function libellePiece(
  typeDocument: string,
  libellesDocN: Record<string, string>,
  nomLibre?: string | null,
): string {
  if (typeDocument.startsWith("autre_piece")) {
    return nomLibre || "Pièce complémentaire ajoutée par le garage";
  }
  if (typeDocument.startsWith("correction")) {
    return nomLibre || "Pièce renvoyée après un refus";
  }
  const verso = typeDocument.endsWith("_verso");
  const base = verso ? typeDocument.slice(0, -"_verso".length) : typeDocument;
  const libelle =
    libellesDocN[base] || LIBELLES_PRO[base] || PIECES_LIBRES[base] || base.replace(/_/g, " ");
  return verso ? `${libelle} (verso)` : libelle;
}
