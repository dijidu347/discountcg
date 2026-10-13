// Ouvrir une démarche : la même décision, quel que soit le point de départ.
//
// Elle vivait dans `DemarchePage`, derrière le bouton « Commander maintenant ».
// Le menu du site mène désormais droit au formulaire, et le bouton des pages
// SEO continue d'exister : les deux appellent ce fichier, pour qu'une démarche
// réservée aux pros ou retirée du catalogue soit traitée pareil des deux côtés.

import { supabase } from "@/integrations/supabase/client";
import { EN_TETE_COMMANDE, nouvelIdCommande } from "@/lib/commandeParticulier";
import { DEMARCHES_AVEC_TAXE } from "@/lib/taxeCarteGrise";

/** Réservées aux professionnels : pas de commande ouverte pour un visiteur. */
export const RESERVEES_AUX_PROS = ["DA", "W_GARAGE"];

/** Prix dépendant du véhicule et du département : on passe par le simulateur. */
export const CG_TYPES = [...DEMARCHES_AVEC_TAXE, "CG_DA", "CG_IMPORT"];

export type Destination =
  | { chemin: string }
  | { chemin: string; message: string };

/**
 * Renvoie l'adresse où envoyer la personne, en créant la commande si besoin.
 * Lève si la création échoue ; l'appelant affiche l'erreur.
 */
export async function destinationDeLaDemarche(code: string): Promise<Destination> {
  if (RESERVEES_AUX_PROS.includes(code)) {
    // Un pro déjà connecté n'a rien à faire sur la page d'inscription.
    const { data: { user } } = await supabase.auth.getUser();
    return user
      ? { chemin: `/nouvelle-demarche?type=${code}` }
      : { chemin: "/register" };
  }

  // Le prix comprend la taxe régionale : il faut la plaque et le département
  // avant de pouvoir afficher une commande payable. On passe donc par une page
  // de commande dépouillée, et non par `/simulateur`, qui est une page de prix
  // suivie de quatre sections de contenu.
  if (CG_TYPES.includes(code)) {
    return { chemin: `/commander-carte-grise?type=${code}` };
  }

  const { data: typeData } = await supabase
    .from("guest_demarche_types")
    .select("prix_base, actif")
    .eq("code", code)
    .maybeSingle();

  // Démarche absente du catalogue particulier : un visiteur ne lit que les
  // démarches actives, une démarche désactivée revient donc vide. On n'ouvre
  // pas de commande (elle partirait à 0 € affiché), on oriente vers l'espace pro.
  if (!typeData || typeData.actif === false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { chemin: `/nouvelle-demarche?type=${code}` };
    return {
      chemin: "/register",
      message: "Cette démarche s'effectue depuis un compte professionnel.",
    };
  }

  const nouvelId = nouvelIdCommande();
  const { data, error } = await supabase
    .from("guest_orders")
    .insert({
      id: nouvelId,
      tracking_number: "",
      immatriculation: "",
      email: "",
      telephone: "",
      nom: "",
      prenom: "",
      adresse: "",
      code_postal: "",
      ville: "",
      montant_ht: 0,
      montant_ttc: 0,
      frais_dossier: typeData.prix_base || 30,
      status: "en_attente",
      paye: false,
      demarche_type: code,
    }).setHeader(EN_TETE_COMMANDE, nouvelId)
    .select("id")
    .single();

  if (error) throw error;

  return { chemin: `/demarche-simple?orderId=${data.id}&type=${code}` };
}
