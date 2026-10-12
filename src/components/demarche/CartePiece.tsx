import { ReactNode } from "react";
import { FileText } from "lucide-react";

// Une pièce justificative, une carte.
//
// La liste des pièces alignait le libellé à gauche et la zone de dépôt à
// droite, large de 400 pixels fixes, le tout dans une grande carte « Pièces
// justificatives ». Trois conséquences : sur téléphone il ne restait rien pour
// le nom, qui se cassait à chaque mot ; les pièces n'avaient pas de limite
// visible entre elles ; et le mandat et le non-gage, qui ont leur propre carte
// juste au-dessus, ne ressemblaient pas au reste.
//
// Ce composant reprend exactement la forme de ces deux cartes-là : une icône,
// le nom de la pièce, et le dépôt en dessous sur toute la largeur. C'est la
// même mise en page à toutes les tailles d'écran — ce qui tenait debout sur un
// écran large tenait déjà mal sur un téléphone.
export const CartePiece = ({
  titre,
  mention,
  enErreur = false,
  children,
}: {
  /** Le nom de la pièce, déjà mis en forme (lien Cerfa, astérisque…). */
  titre: ReactNode;
  /** Indication courte alignée à droite du titre : « Cerfa 15776*02 ». */
  mention?: ReactNode;
  enErreur?: boolean;
  children: ReactNode;
}) => (
  <div
    className={`space-y-3 p-4 rounded-lg border-2 ${
      enErreur ? "border-destructive bg-red-50" : "border-border bg-card"
    }`}
  >
    <div className="flex items-start gap-2">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">{titre}</div>
      {mention && (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{mention}</span>
      )}
    </div>
    {children}
  </div>
);
