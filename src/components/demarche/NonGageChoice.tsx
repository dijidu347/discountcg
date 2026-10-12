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
  // Signale le bloc en rouge quand le choix ou la piece manque au paiement.
  enErreur?: boolean;
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
  enErreur = false,
}: NonGageChoiceProps) => {
  if (!isNonGageRequired(demarcheType)) return null;

  const prix = getNonGagePrice(audience);

  return (
    <div id="bloc-non-gage" className={`space-y-3 rounded-lg border-2 p-3 sm:p-4 scroll-mt-24 ${enErreur ? "border-destructive bg-red-50" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <FileSearch className="w-4 h-4 text-primary" />
        <p className="min-w-0 break-words font-medium">
          {NON_GAGE_LABEL}
          <span className="text-destructive text-base font-bold">&nbsp;*</span>
        </p>
      </div>
      <RadioGroup
        value={value ?? ""}
        onValueChange={(v) => onChange(v as NonGageMode)}
        disabled={disabled}
        className="space-y-2 pt-1"
      >
        <div
          /* Toute la carte choisit, pas seulement le texte. Le garde-fou
             compte doublement ici : `onChange` écrit en base — il pose ou
             retire la ligne de service du non-gage — et sans lui, chaque clic
             dans la zone dépliée déclencherait une écriture. */
          onClick={() => { if (!disabled && value !== "fourni") onChange("fourni"); }}
          className={`cursor-pointer rounded-lg border-2 p-2.5 sm:p-3 transition-colors ${
            value === "fourni"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="fourni" id="non_gage_fourni" className="mt-0.5" />
            {/* `w-full` est ce qui manquait : sans largeur à remplir, le
                conteneur se résumait à son contenu et le `ml-auto` du prix
                n'avait rien à repousser. « Gratuit » collait donc au libellé,
                quand « +2 € » juste en dessous, lui, était bien à droite. */}
            <Label htmlFor="non_gage_fourni" className="w-full cursor-pointer font-normal">
              <span className="flex items-center gap-2 font-medium">
                Je fournis le certificat
                <span className="ml-auto whitespace-nowrap font-semibold text-primary">Gratuit</span>
              </span>
            </Label>
          </div>

          {value === "fourni" && uploadSlot && (
            <div className="mt-3 pt-3 border-t border-border">
              {uploadSlot}
            </div>
          )}
        </div>

        <div
          onClick={() => { if (!disabled && value !== "facture") onChange("facture"); }}
          className={`flex cursor-pointer items-start space-x-3 rounded-lg border-2 p-2.5 sm:p-3 transition-colors ${
            value === "facture"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <RadioGroupItem value="facture" id="non_gage_facture" className="mt-0.5" />
          <Label htmlFor="non_gage_facture" className="cursor-pointer font-normal w-full">
            <span className="font-medium flex items-center gap-2">
              Nous le commandons pour vous
              <span className="ml-auto text-primary font-semibold whitespace-nowrap">+{prix}&nbsp;€</span>
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
