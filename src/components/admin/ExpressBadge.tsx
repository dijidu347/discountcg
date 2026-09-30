import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

// « Prio » plutôt que « Prioritaire » : le mot entier poussait la ligne au-delà
// de la largeur de l'écran dans la file des démarches. L'éclair suffit à le
// faire reconnaître.
export const ExpressBadge = ({ express }: { express?: boolean }) => {
  if (!express) return null;
  return (
    <Badge className="bg-orange-500 text-white hover:bg-orange-600 gap-0.5 px-1.5 py-0 text-[10px]" title="Dossier prioritaire">
      <Zap className="w-3 h-3" />
      Prio
    </Badge>
  );
};
