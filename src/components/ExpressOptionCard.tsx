import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Clock, Zap } from "lucide-react";
import {
  isExpressEligible,
  getExpressSurcharge,
  dansLesHorairesDeBureau,
  EXPRESS_LABEL,
  EXPRESS_DESCRIPTION,
  EXPRESS_HORS_HORAIRES,
} from "@/lib/expressOption";

interface ExpressOptionCardProps {
  demarcheType?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const ExpressOptionCard = ({ demarcheType, checked, onCheckedChange }: ExpressOptionCardProps) => {
  // L'option est proposée en permanence. Seule la PROMESSE change : « traité
  // en 2h » est faux à 23h un samedi, et le dire autrement vaut mieux que de
  // masquer l'option — une commande du dimanche soir est parfaitement légitime.
  //
  // Ce composant ne modifie JAMAIS l'état express de lui-même : il n'écrit rien
  // en base et ne change jamais le prix d'une commande déjà payable.
  //
  // Réévalué toutes les trente secondes, pour qu'une page restée ouverte à
  // 17h29 dise la vérité à 17h31. Hooks avant tout return conditionnel.
  const [ouvert, setOuvert] = useState(() => dansLesHorairesDeBureau());
  useEffect(() => {
    const id = setInterval(() => setOuvert(dansLesHorairesDeBureau()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!isExpressEligible(demarcheType)) return null;

  return (
    <div
      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
        checked
          ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
          : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <Checkbox
        id="express_option"
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c as boolean)}
      />
      <div className="flex-1">
        <Label htmlFor="express_option" className="flex items-center gap-2 font-medium cursor-pointer">
          <Zap className="w-4 h-4 text-orange-500" />
          {EXPRESS_LABEL}
          <span className="ml-auto text-orange-500 font-semibold whitespace-nowrap">+{getExpressSurcharge(demarcheType)}&nbsp;€</span>
        </Label>
        {/* La promesse change avec l'heure. « Traité en 2h » est faux à 23h un
            samedi : on annonce alors la priorité à la réouverture, plutôt que
            de masquer l'option — une commande du dimanche soir est légitime. */}
        {ouvert ? (
          <p className="text-sm text-muted-foreground mt-1">{EXPRESS_DESCRIPTION}</p>
        ) : (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{EXPRESS_HORS_HORAIRES}</span>
          </p>
        )}
      </div>
    </div>
  );
};
