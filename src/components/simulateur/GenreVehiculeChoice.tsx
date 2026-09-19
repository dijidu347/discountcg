import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { genreCorrigeable, ressembleUtilitaire } from "@/lib/genreVehicule";

interface GenreVehiculeChoiceProps {
  genre: string | null | undefined;
  modele?: string | null;
  onChange: (genre: "VP" | "CTTE") => void;
  disabled?: boolean;
}

// Type de véhicule (case J.1), prérempli par le fichier des immatriculations et
// corrigeable en un clic : voiture particulière ou utilitaire (+34 € de taxe).
// N'apparaît que pour ces deux genres ; motos, cyclos, etc. ne sont pas concernés.
export const GenreVehiculeChoice = ({ genre, modele, onChange, disabled }: GenreVehiculeChoiceProps) => {
  if (!genreCorrigeable(genre)) return null;
  const valeur = (genre || "").toUpperCase() as "VP" | "CTTE";
  const aVerifier = valeur === "VP" && ressembleUtilitaire(modele);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Type de véhicule (case J.1 de la carte grise)</p>
      <RadioGroup
        value={valeur}
        onValueChange={(v) => onChange(v as "VP" | "CTTE")}
        disabled={disabled}
        className="space-y-2"
      >
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="VP" id="genre-vp" />
          <Label htmlFor="genre-vp" className="cursor-pointer font-normal">
            Voiture particulière (VP)
          </Label>
        </div>
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="CTTE" id="genre-ctte" />
          <Label htmlFor="genre-ctte" className="cursor-pointer font-normal">
            Utilitaire (CTTE) : taxe utilitaire de 34 € ajoutée
          </Label>
        </div>
      </RadioGroup>
      {aVerifier && (
        <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Ce modèle existe souvent en version utilitaire. Vérifiez la case J.1 de la carte grise :
            si elle indique « CTTE », choisissez « Utilitaire ».
          </span>
        </p>
      )}
    </div>
  );
};
