// Noms des options (lignes tracking_services) tels qu'on les affiche.
export const SERVICE_LABELS: Record<string, string> = {
  priority: "Dossier prioritaire",
  dossier_prioritaire: "Dossier prioritaire",
  non_gage: "Certificat de non-gage",
  certificat_non_gage: "Certificat de non-gage",
  email: "Suivi email",
  suivi_email: "Suivi email",
  sms: "Suivi SMS",
  phone: "Suivi SMS",
  suivi_sms: "Suivi SMS",
  complete: "Suivi complet",
  email_phone: "Suivi complet",
  suivi_complet: "Suivi complet",
};

// Nom d'une option tel qu'on l'affiche au client : jamais le code technique
// (« certificat_non_gage »). Un code inconnu est au moins mis en forme.
export function libelleOption(code: string | null | undefined): string {
  if (!code) return "";
  if (SERVICE_LABELS[code]) return SERVICE_LABELS[code];
  const texte = code.replace(/_/g, " ").trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
