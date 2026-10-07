import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Le poids total autorisé en charge, demandé aux seuls genres dont la taxe en
// dépend : camion, tracteur routier, VASP. Le fichier des immatriculations ne
// le donne pas, et sans lui le barème officiel ne peut pas être tranché — un
// camion paie 127, 189 ou 285 € de taxe transport selon qu'il fait moins de
// 6 tonnes, moins de 11, ou davantage.
//
// Tant qu'il n'est pas renseigné, c'est la tranche la plus haute qui s'applique.
// L'inverse ne marcherait pas : personne ne remplit un champ qui ferait monter
// le prix, et nous facturerions une taxe que nous paierions plus cher.
//
// Sur 1 142 véhicules identifiés, six sont concernés. La question ne se pose
// donc presque jamais : c'est bien pour cela qu'elle ne s'affiche que là.

interface PtacInputProps {
  valeur: number | null | undefined;
  onChange: (ptacKg: number | null) => void;
  disabled?: boolean;
}

export const PtacInput = ({ valeur, onChange, disabled }: PtacInputProps) => (
  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
    <Label htmlFor="ptac" className="text-sm font-medium">
      Poids total autorisé en charge (case F.2 de la carte grise)
    </Label>
    <div className="flex items-center gap-2">
      <Input
        id="ptac"
        type="number"
        inputMode="numeric"
        min={0}
        step={100}
        placeholder="3500"
        value={valeur ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n > 0 ? n : null);
        }}
        className="w-40"
      />
      <span className="text-sm text-muted-foreground">kg</span>
    </div>
    <p className="flex gap-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Pour ce type de véhicule, la taxe de transport dépend du poids. Tant qu'il n'est pas
        renseigné, nous appliquons la tranche la plus élevée : <strong>le prix baissera</strong>{" "}
        si votre véhicule fait moins de 11 tonnes.
      </span>
    </p>
  </div>
);
