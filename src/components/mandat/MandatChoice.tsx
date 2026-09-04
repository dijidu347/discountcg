import { ReactNode } from "react";
import { FileSignature } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { MandatMode } from "@/lib/mandat";

interface MandatChoiceProps {
  value: MandatMode;
  onChange: (mode: MandatMode) => void;
  // Rendu dans la carte retenue : l'emplacement de dépôt d'un côté, le
  // formulaire de pré-remplissage de l'autre.
  slotUpload?: ReactNode;
  slotGenere?: ReactNode;
  disabled?: boolean;
}

// Comment le client obtient son mandat. Le pré-remplissage est proposé à côté du
// dépôt classique, jamais à sa place : quelqu'un qui arrive avec son Cerfa déjà
// rempli à la main n'a rien à faire d'un formulaire.
export const MandatChoice = ({
  value,
  onChange,
  slotUpload,
  slotGenere,
  disabled = false,
}: MandatChoiceProps) => (
  <div className="space-y-3 p-4 rounded-lg border-2 border-border bg-card">
    <div className="flex items-center gap-2">
      <FileSignature className="w-4 h-4 text-primary" />
      <p className="font-medium">Mandat d'immatriculation</p>
      <span className="ml-auto text-xs text-muted-foreground">Cerfa 13757*03</span>
    </div>

    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as MandatMode)}
      disabled={disabled}
      className="space-y-2 pt-1"
    >
      <div
        className={`p-3 rounded-lg border-2 transition-colors ${
          value === "upload" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
        }`}
      >
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="upload" id="mandat_upload" className="mt-0.5" />
          <Label htmlFor="mandat_upload" className="cursor-pointer font-normal">
            <span className="font-medium">J'ai déjà mon mandat</span>
            <span className="block text-sm text-muted-foreground mt-1">
              Vous le déposez tel quel, rempli et signé de votre main.
            </span>
          </Label>
        </div>
        {value === "upload" && slotUpload && (
          <div className="mt-3 pt-3 border-t border-border">{slotUpload}</div>
        )}
      </div>

      <div
        className={`p-3 rounded-lg border-2 transition-colors ${
          value === "genere" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
        }`}
      >
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="genere" id="mandat_genere" className="mt-0.5" />
          <Label htmlFor="mandat_genere" className="cursor-pointer font-normal">
            <span className="font-medium">Le remplir en ligne</span>
            <span className="block text-sm text-muted-foreground mt-1">
              Nous le pré-remplissons, vous vérifiez et signez à l'écran. Rien à imprimer.
            </span>
          </Label>
        </div>
        {value === "genere" && slotGenere && (
          <div className="mt-3 pt-3 border-t border-border">{slotGenere}</div>
        )}
      </div>
    </RadioGroup>
  </div>
);
