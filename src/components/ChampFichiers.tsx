// Un champ de fichiers en français, dont tout est cliquable.
//
// Deux défauts du champ natif, qui n'en font qu'un.
//
// Son libellé — « Choose Files », « No file chosen » — est écrit par le
// navigateur, dans la langue du système. Aucun attribut ne le traduit : c'est
// du texte que la page ne possède pas. Un garage français lisait donc deux
// mots d'anglais au milieu d'un écran en français.
//
// Et une fois le champ habillé comme les autres champs du site — bordure,
// hauteur, marge intérieure — le bouton que le navigateur dessine à l'intérieur
// ne coïncide plus avec sa propre zone cliquable. On cliquait sur « Choose
// Files » sans que rien ne s'ouvre, et sur « No file chosen » où ça marchait.
//
// D'où ce composant : le champ natif est masqué, et c'est notre bouton qui le
// déclenche. Le texte est à nous, la zone cliquable est entière.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ChampFichiersProps {
  /** Appelé avec les fichiers choisis. Le champ se vide ensuite. */
  onChoisis: (fichiers: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  libelle?: string;
  /** Phrase affichée tant qu'aucun fichier n'est choisi. */
  vide?: string;
  className?: string;
}

export function ChampFichiers({
  onChoisis,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = false,
  disabled = false,
  libelle,
  vide = "Aucun fichier choisi",
  className = "",
}: ChampFichiersProps) {
  const champ = useRef<HTMLInputElement>(null);
  const [derniers, setDerniers] = useState<string[]>([]);

  const texte =
    derniers.length === 0
      ? vide
      : derniers.length === 1
      ? derniers[0]
      : `${derniers.length} fichiers choisis`;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <input
        ref={champ}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const choisis = Array.from(e.target.files ?? []);
          if (!choisis.length) return;
          setDerniers(choisis.map((f) => f.name));
          // Vider le champ permet de redéposer le même fichier juste après,
          // ce qu'un champ natif refuse puisque sa valeur n'aurait pas changé.
          e.target.value = "";
          onChoisis(choisis);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => champ.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {libelle ?? (multiple ? "Choisir des fichiers" : "Choisir un fichier")}
      </Button>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{texte}</span>
    </div>
  );
}
