import { useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CgvAcceptanceProps {
  // Vrai uniquement quand TOUTES les cases requises sont cochées.
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  // Seconde case, réservée aux consommateurs : demande d'exécution immédiate et
  // renonciation au droit de rétractation (art. L. 221-28, 1° — cf. CGV art. 10.3).
  // Inutile côté professionnel, qui ne dispose pas de ce droit (CGV art. 10.2).
  withRetractationWaiver?: boolean;
  idPrefix?: string;
}

// Acceptations à recueillir juste au-dessus du bouton de paiement.
//
// Les cases sont décochées par défaut et distinctes l'une de l'autre : la
// renonciation au droit de rétractation ne vaut que si elle résulte d'un acte
// positif, spécifique, et séparé de l'acceptation des CGV. Une case pré-cochée,
// ou une case unique mêlant les deux, priverait la renonciation de tout effet.
//
// Les liens vers les CGV sont placés HORS des <Label> : à l'intérieur, un clic
// dessus cocherait aussi la case.
export const CgvAcceptance = ({
  checked,
  onCheckedChange,
  withRetractationWaiver = false,
  idPrefix = "cgv",
}: CgvAcceptanceProps) => {
  const [cgvOk, setCgvOk] = useState(false);
  const [waiverOk, setWaiverOk] = useState(false);

  const emit = (cgv: boolean, waiver: boolean) =>
    onCheckedChange(cgv && (!withRetractationWaiver || waiver));

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/30">
        <Checkbox
          id={`${idPrefix}_acceptance`}
          checked={cgvOk}
          onCheckedChange={(c) => {
            const v = c as boolean;
            setCgvOk(v);
            emit(v, waiverOk);
          }}
          className="mt-0.5"
        />
        <p className="text-sm leading-snug">
          <Label htmlFor={`${idPrefix}_acceptance`} className="font-normal cursor-pointer">
            En finalisant cette démarche, vous acceptez nos{" "}
          </Label>
          <Link
            to="/cgv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            conditions générales de ventes
          </Link>
          .
        </p>
      </div>

      {withRetractationWaiver && (
        <div className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/30">
          <Checkbox
            id={`${idPrefix}_waiver`}
            checked={waiverOk}
            onCheckedChange={(c) => {
              const v = c as boolean;
              setWaiverOk(v);
              emit(cgvOk, v);
            }}
            className="mt-0.5"
          />
          <p className="text-sm leading-snug">
            <Label htmlFor={`${idPrefix}_waiver`} className="font-normal cursor-pointer">
              Je demande expressément que ma démarche soit traitée immédiatement et je renonce à mon droit de
              rétractation : une fois la démarche transmise à l'administration, ma commande est définitive et ne
              pourra plus être remboursée
            </Label>{" "}
            <Link
              to="/cgv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              (article 10)
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
};
