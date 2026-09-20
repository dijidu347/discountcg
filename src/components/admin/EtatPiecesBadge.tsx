import { Badge } from "@/components/ui/badge";
import { EtatPieces, LIBELLES_ETAT_PIECES } from "@/lib/etatPieces";

const COULEURS: Record<EtatPieces, string> = {
  aucune_piece: "bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
  jamais_controle: "bg-blue-500 hover:bg-blue-500",
  nouvelle_piece: "bg-amber-500 hover:bg-amber-500",
  attente_client: "bg-orange-600 hover:bg-orange-600",
  controle: "bg-green-600 hover:bg-green-600",
};

// Où en est le contrôle des pièces du dossier.
export function EtatPiecesBadge({ etat }: { etat?: EtatPieces }) {
  const libelle = etat ? LIBELLES_ETAT_PIECES[etat] : null;
  if (!etat || !libelle) return null;
  return (
    <Badge className={`text-xs ${COULEURS[etat]}`} title={libelle.aide}>
      {libelle.texte}
    </Badge>
  );
}
