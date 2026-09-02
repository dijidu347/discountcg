import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CgvAcceptanceProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  idPrefix?: string;
}

// Acceptation des CGV, à placer juste au-dessus du bouton de paiement.
//
// Une seule case, décochée par défaut : l'acceptation doit résulter d'un acte
// positif du client (art. 1127-2 du Code civil, « double clic »). Une case
// pré-cochée ne vaudrait pas acceptation.
//
// Le libellé mentionne explicitement le caractère définitif de la commande :
// c'est ce qui permet de soutenir que le client en a été informé avant de payer,
// l'article 10 des CGV n'étant opposable que s'il a été porté à sa connaissance.
//
// Le lien vers les CGV est placé HORS du <Label> : à l'intérieur, un clic dessus
// cocherait aussi la case.
export const CgvAcceptance = ({ checked, onCheckedChange, idPrefix = "cgv" }: CgvAcceptanceProps) => (
  <div className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/30">
    <Checkbox
      id={`${idPrefix}_acceptance`}
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c as boolean)}
      className="mt-0.5"
    />
    <p className="text-sm leading-snug">
      <Label htmlFor={`${idPrefix}_acceptance`} className="font-normal cursor-pointer">
        J'ai lu et j'accepte les{" "}
      </Label>
      <Link
        to="/cgv"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        conditions générales de ventes
      </Link>
      <Label htmlFor={`${idPrefix}_acceptance`} className="font-normal cursor-pointer">
        , dont l'article 10 : ma commande est définitive et ne fera l'objet d'aucun remboursement.
      </Label>
    </p>
  </div>
);
