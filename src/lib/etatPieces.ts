// Où en est le contrôle des pièces d'un dossier, pour la file admin.
//
// Sans cette information, un dossier jamais ouvert et un dossier dont le client
// vient de renvoyer une pièce après un refus se ressemblent : même ligne, même
// statut. On les distingue à partir des pièces elles-mêmes.
//
// Les deux parcours n'emploient pas le même mot pour une pièce acceptée
// (« validated » côté pro, « approved » côté particulier) : les deux sont admis.

export interface PieceControlee {
  type_document?: string | null;
  validation_status?: string | null;
  validated_at?: string | null;
  created_at?: string | null;
}

export type EtatPieces =
  | "aucune_piece"      // le client n'a encore rien déposé
  | "jamais_controle"   // des pièces attendent, aucune n'a jamais été contrôlée
  | "nouvelle_piece"    // une pièce est arrivée depuis le dernier contrôle
  | "attente_client"    // des pièces ont été refusées, rien de nouveau depuis
  | "controle";         // tout est contrôlé, rien de nouveau

const ACCEPTEES = ["validated", "approved"];

const tempsDe = (valeur?: string | null) => (valeur ? new Date(valeur).getTime() : 0);

export function etatPieces(pieces: PieceControlee[]): EtatPieces {
  if (pieces.length === 0) return "aucune_piece";

  const dernierControle = Math.max(
    0,
    ...pieces.map((p) => (ACCEPTEES.includes(p.validation_status ?? "") || p.validation_status === "rejected" ? tempsDe(p.validated_at) : 0)),
  );
  if (dernierControle === 0) return "jamais_controle";

  const enAttente = (p: PieceControlee) =>
    !ACCEPTEES.includes(p.validation_status ?? "") && p.validation_status !== "rejected";
  if (pieces.some((p) => enAttente(p) && tempsDe(p.created_at) > dernierControle)) return "nouvelle_piece";

  // Refus encore d'actualité : la DERNIÈRE pièce déposée pour ce type est refusée.
  // Une pièce refusée puis remplacée ne compte plus.
  const derniereParType = new Map<string, PieceControlee>();
  pieces.forEach((p) => {
    const cle = p.type_document ?? "";
    const precedente = derniereParType.get(cle);
    if (!precedente || tempsDe(p.created_at) > tempsDe(precedente.created_at)) derniereParType.set(cle, p);
  });
  for (const p of derniereParType.values()) {
    if (p.validation_status === "rejected") return "attente_client";
  }

  if (pieces.some(enAttente)) return "jamais_controle";
  return "controle";
}

export const LIBELLES_ETAT_PIECES: Record<EtatPieces, { texte: string; aide: string }> = {
  aucune_piece: { texte: "Aucune pièce", aide: "Le client n'a encore déposé aucune pièce." },
  jamais_controle: { texte: "À contrôler", aide: "Des pièces attendent un premier contrôle." },
  nouvelle_piece: { texte: "Nouvelle pièce", aide: "Le client a déposé une pièce depuis votre dernier contrôle." },
  attente_client: { texte: "Attente client", aide: "Des pièces ont été refusées, le client n'a rien redéposé depuis." },
  controle: { texte: "Contrôlé", aide: "Toutes les pièces déposées ont été contrôlées." },
};

// Regroupe les pièces par dossier : une seule requête, un état par dossier.
export function etatsParDossier<T extends PieceControlee & Record<string, unknown>>(
  pieces: T[],
  cle: keyof T,
): Record<string, EtatPieces> {
  const parDossier: Record<string, PieceControlee[]> = {};
  pieces.forEach((p) => {
    const id = String(p[cle] ?? "");
    (parDossier[id] ||= []).push(p);
  });
  const etats: Record<string, EtatPieces> = {};
  Object.entries(parDossier).forEach(([id, liste]) => {
    etats[id] = etatPieces(liste);
  });
  return etats;
}
