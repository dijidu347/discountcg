// Push de conversion GTM.
//
// Le conteneur GTM fait le relais vers Meta : le pixel n'est pas écrit dans le
// code du site, il vit dans GTM. On peut ainsi changer d'identifiant, ajouter
// un réseau ou brancher un jour le consentement sans redéployer.
//
// Règle historique, qui reste la plus importante : l'achat ne part QUE sur un
// paiement confirmé en base (guest_orders.paye / demarches.paye), jamais sur le
// simple affichage d'une page de succès.
//
// Les trois autres événements sont des signaux intermédiaires. Ils existent
// parce que l'achat seul est trop rare pour que l'algorithme de Meta apprenne :
// il lui faut quelques dizaines de signaux par semaine, ce qu'une conversion
// payante ne fournit pas au démarrage.

import type { Audience } from "@/lib/audienceDemarche";

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// Mémoire de session : survit au démontage des composants et à la navigation
// SPA. Sans elle, un simple retour arrière recompterait la conversion.
const dejaPousses = new Set<string>();

function pousserUneFois(cle: string, charge: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (dejaPousses.has(cle)) return;
  dejaPousses.add(cle);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(charge);
}

function montantValide(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function arrondi(value: number): number {
  return Math.round(value * 100) / 100;
}

// Purchase — paiement confirmé. Inchangé : deux garde-fous, la mémoire de
// session et une relecture du dataLayer courant, parce qu'un même achat peut
// être poussé depuis deux pages différentes.
export function pushAchatValide(transactionId: string, value: number, audience: Audience) {
  if (typeof window === "undefined") return;
  if (!transactionId || !montantValide(value)) return;
  if (dejaPousses.has(`achat:${transactionId}`)) return;

  window.dataLayer = window.dataLayer || [];

  const dejaDansLeDataLayer = window.dataLayer.some(
    (entry: any) => entry?.event === "achat_valide" && entry?.transaction_id === transactionId
  );
  dejaPousses.add(`achat:${transactionId}`);
  if (dejaDansLeDataLayer) return;

  window.dataLayer.push({
    event: "achat_valide",
    value: arrondi(value),
    currency: "EUR",
    transaction_id: transactionId,
    audience,
  });
}

// InitiateCheckout — le client arrive sur le paiement, montant connu. C'est le
// signal qui portera l'optimisation les premières semaines : même ordre de
// grandeur que l'achat, mais plusieurs fois plus fréquent.
export function pushPaiementOuvert(commandeId: string, value: number, audience: Audience) {
  if (!commandeId || !montantValide(value)) return;
  pousserUneFois(`paiement:${commandeId}`, {
    event: "paiement_ouvert",
    value: arrondi(value),
    currency: "EUR",
    transaction_id: commandeId,
    audience,
  });
}

// Lead — une simulation a abouti à un prix. Le visiteur a saisi sa plaque et vu
// un montant : il est qualifié, même s'il ne commande pas aujourd'hui.
export function pushSimulationTerminee(code: string, value?: number) {
  const audience: Audience = "particulier"; // le simulateur est le parcours grand public
  if (!code) return;
  pousserUneFois(`simulation:${code}:${montantValide(value) ? arrondi(value) : "0"}`, {
    event: "simulation_terminee",
    demarche: code,
    audience,
    ...(montantValide(value) ? { value: arrondi(value), currency: "EUR" } : {}),
  });
}

// ViewContent — consultation d'une page démarche. Le plus fréquent des quatre ;
// il sert surtout à constituer les audiences de reciblage.
export function pushVueDemarche(code: string, nom: string, audience: Audience) {
  if (!code) return;
  pousserUneFois(`vue:${code}`, {
    event: "vue_demarche",
    demarche: code,
    demarche_nom: nom,
    audience,
  });
}
