// src/lib/sogecommerce.ts
//
// Bascule globale Stripe <-> Sogecommerce.
//   true  = paiement via Sogecommerce (redirection page hébergée Société Générale)
//   false = retour à l'ancien paiement Stripe (sans redéployer le reste)
// Permet un retour arrière immédiat en cas de souci en production.
export const USE_SOGECOMMERCE = false;

export interface SogecommerceFormData {
  paymentUrl: string;
  method?: string;
  fields: Record<string, string>;
}

// Construit un formulaire POST caché (champs vads_* + signature) et le soumet,
// ce qui redirige le navigateur vers la page de paiement hébergée Société Générale.
// (Transposition React de nos fichiers HTML de test.)
export function redirectToSogecommerce(data: SogecommerceFormData): void {
  if (!data?.paymentUrl || !data?.fields) {
    throw new Error("Données de paiement Sogecommerce invalides");
  }

  const form = document.createElement("form");
  form.method = data.method || "POST";
  form.action = data.paymentUrl;
  form.style.display = "none";

  for (const [name, value] of Object.entries(data.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  // Drapeau lu par les pages ayant un garde-fou beforeunload (ex: ResultatCarteGrise),
  // pour ne pas afficher l'avertissement "quitter la page" lors d'une redirection
  // paiement volontaire.
  (window as any).__sogeRedirecting = true;
  form.submit();
}
