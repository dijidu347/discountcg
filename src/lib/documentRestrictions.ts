// Restriction de format/taille pour les documents de certaines démarches PRO.
//
// Pour ces 9 démarches uniquement, tous les fichiers déposés doivent être au
// format PDF et faire moins de 1 Mo. Les autres démarches (PRO ou invité) ne
// sont pas concernées : elles continuent d'accepter images + PDF sans limite.
//
// ⚠️ Ces codes sont les codes PRO (actions_rapides.code / demarches.type),
// distincts des slugs/codes de src/data/demarchesConfig.ts.
export const PDF_ONLY_PRO_DEMARCHE_CODES = new Set<string>([
  "W_GARAGE_PRO", // premiere-demande-w-garage
  "DUPLICATA_CG_PRO", // duplicata-carte-grise
  "QUITUS_FISCAL_PRO", // quitus-fiscal
  "MODIF_CG_PRO", // modification-carte-grise
  "ANNULATION_CPI_WW_PRO", // annulation-cpi-ww
  "SUCCESSION_HERITAGE_PRO", // succession-carte-grise
  "COTITULAIRE_PRO", // cotitulaire-carte-grise
  "ANNULER_CORRIGER_DC_DA_PRO", // annuler-declaration-cession
  "IMMAT_DEFINITIVE_PRO", // immatriculation-definitive
]);

// 1 Mo
export const MAX_PDF_SIZE_BYTES = 1024 * 1024;

/** Vrai si la démarche (par son code PRO) impose le PDF de moins de 1 Mo. */
export function isPdfOnlyProDemarche(code?: string | null): boolean {
  return !!code && PDF_ONLY_PRO_DEMARCHE_CODES.has(code);
}

/**
 * Valide un fichier pour une démarche restreinte (PDF, < 1 Mo).
 * Retourne un message d'erreur en français si invalide, ou null si valide.
 */
export function validatePdfOnlyFile(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return "Format non autorisé : seuls les fichiers PDF sont acceptés pour cette démarche.";
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    const sizeMo = (file.size / (1024 * 1024)).toFixed(2);
    return `Fichier trop volumineux (${sizeMo} Mo) : le PDF doit faire moins de 1 Mo.`;
  }
  return null;
}
