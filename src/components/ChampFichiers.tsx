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
  /**
   * « zone » : une surface pointillée qui occupe la largeur, pour un dépôt
   * attendu. « bouton » : la forme compacte d'origine, pour un formulaire où
   * le fichier n'est qu'un champ parmi d'autres.
   */
  variante?: "zone" | "bouton";
  className?: string;
}

export function ChampFichiers({
  onChoisis,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = false,
  disabled = false,
  libelle,
  vide = "Aucun fichier choisi",
  variante = "bouton",
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

  const champ_natif = (
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
  );

  const intitule = libelle ?? (multiple ? "Choisir des fichiers" : "Choisir un fichier");

  // La surface pointillée dit « déposez ici » d'un seul tenant, au lieu d'un
  // bouton posé à côté d'une phrase grise : deux éléments pour une seule
  // action, qui ne s'alignaient avec rien autour d'eux.
  if (variante === "zone") {
    return (
      <div className={className}>
        {champ_natif}
        <button
          type="button"
          disabled={disabled}
          onClick={() => champ.current?.click()}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{intitule}</span>
            <span className="block truncate text-xs text-muted-foreground">{texte}</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {champ_natif}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => champ.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {intitule}
      </Button>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{texte}</span>
    </div>
  );
}
