import { ReactNode } from "react";
import { FileSearch } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  isNonGageRequired,
  getNonGagePrice,
  NON_GAGE_LABEL,
  NonGageMode,
} from "@/lib/nonGage";

interface NonGageChoiceProps {
  demarcheType?: string;
  audience: "pro" | "particulier";
  value: NonGageMode | null;
  onChange: (mode: NonGageMode) => void;
  disabled?: boolean;
  // Emplacement de dépôt du certificat, rendu DANS la carte « Je fournis le
  // certificat » une fois celle-ci sélectionnée. Laissé vide sur les parcours où
  // le dépôt intervient à une étape ultérieure (particulier : après paiement).
  uploadSlot?: ReactNode;
}

// Choix imposé (pas d'option à cocher) : sur CG/DA/DC le certificat de non-gage
// est obligatoire, seule la façon de l'obtenir appartient au client. Tant que
// rien n'est sélectionné, `value` vaut null et l'appelant bloque la suite.
export const NonGageChoice = ({
  demarcheType,
  audience,
  value,
  onChange,
  disabled = false,
  uploadSlot,
}: NonGageChoiceProps) => {
  if (!isNonGageRequired(demarcheType)) return null;

  const prix = getNonGagePrice(audience);

  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-card">
      <div className="flex items-center gap-2">
        <FileSearch className="w-4 h-4 text-blue-500" />
        <p className="font-medium">{NON_GAGE_LABEL}</p>
        <span className="ml-auto text-xs text-muted-foreground">Obligatoire</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Ce certificat atteste qu'aucun gage ni opposition n'empêche le changement de
        titulaire. Il est indispensable au traitement du dossier.
      </p>

      <RadioGroup
        value={value ?? ""}
        onValueChange={(v) => onChange(v as NonGageMode)}
        disabled={disabled}
        className="space-y-2 pt-1"
      >
        <div
          className={`p-3 rounded-lg border-2 transition-colors ${
            value === "fourni"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="fourni" id="non_gage_fourni" className="mt-0.5" />
            <Label htmlFor="non_gage_fourni" className="cursor-pointer font-normal">
              <span className="font-medium">Je fournis le certificat</span>
              <span className="block text-sm text-muted-foreground mt-1">
                {uploadSlot
                  ? "Gratuit. Déposez-le ci-dessous pour continuer."
                  : "Gratuit. Vous devrez le déposer avec les autres pièces du dossier."}
              </span>
            </Label>
          </div>

          {value === "fourni" && uploadSlot && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900">
              {uploadSlot}
            </div>
          )}
        </div>

        <div
          className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-colors ${
            value === "facture"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <RadioGroupItem value="facture" id="non_gage_facture" className="mt-0.5" />
          <Label htmlFor="non_gage_facture" className="cursor-pointer font-normal w-full">
            <span className="font-medium flex items-center gap-2">
              Nous le commandons pour vous
              <span className="ml-auto text-blue-500 font-semibold">+{prix},00 €</span>
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              Nous nous chargeons de l'obtenir, vous n'avez rien à déposer.
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
