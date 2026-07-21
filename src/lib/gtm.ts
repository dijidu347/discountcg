// Push de conversion GTM.
// Règle : ne part QUE sur un paiement confirmé en base (guest_orders.paye / demarches.paye),
// jamais sur le simple affichage d'une page de succès.

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// Mémoire de session : survit au démontage des composants et à la navigation SPA.
const pushedTransactions = new Set<string>();

export function pushAchatValide(transactionId: string, value: number) {
  if (typeof window === "undefined") return;
  if (!transactionId || !Number.isFinite(value) || value <= 0) return;
  if (pushedTransactions.has(transactionId)) return;

  window.dataLayer = window.dataLayer || [];

  // Second garde-fou : l'événement est peut-être déjà dans le dataLayer courant
  // (autre montage, autre composant) — on ne repousse pas le même transaction_id.
  const dejaPousse = window.dataLayer.some(
    (entry: any) => entry?.event === "achat_valide" && entry?.transaction_id === transactionId
  );
  pushedTransactions.add(transactionId);
  if (dejaPousse) return;

  window.dataLayer.push({
    event: "achat_valide",
    value: Math.round(value * 100) / 100,
    currency: "EUR",
    transaction_id: transactionId,
  });
}
