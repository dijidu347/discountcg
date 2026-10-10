// Un champ de mot de passe qu'on peut relire.
//
// Saisir un mot de passe à l'aveugle fait échouer des connexions pour une
// faute de frappe qu'on ne peut pas voir — et plus encore sur téléphone, où
// l'on tape vite et serré. L'œil ne baisse aucune sécurité : le mot de passe
// est déjà dans le navigateur de la personne qui le tape.
//
// Il reste masqué par défaut, et redevient masqué à chaque affichage de la
// page : on ne garde pas un mot de passe en clair à l'écran d'un dévoilement
// à l'autre.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

type Props = React.ComponentProps<typeof Input>;

export function ChampMotDePasse({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // tabIndex -1 : la tabulation va du mot de passe au bouton de
        // connexion, sans détour par l'œil.
        tabIndex={-1}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
