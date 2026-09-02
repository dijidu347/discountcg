import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import {
  isExpressEligible,
  getExpressSurcharge,
  isExpressAvailable,
  EXPRESS_LABEL,
  EXPRESS_DESCRIPTION,
  EXPRESS_UNAVAILABLE_MESSAGE,
} from "@/lib/expressOption";

interface ExpressOptionCardProps {
  demarcheType?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const ExpressOptionCard = ({ demarcheType, checked, onCheckedChange }: ExpressOptionCardProps) => {
  // Disponibilité horaire (Europe/Paris), purement PRÉSENTATIONNELLE : hors
  // créneau la carte est grisée et la case n'est plus cochable. Ce composant ne
  // modifie JAMAIS l'état express de lui-même (pas d'auto-décochage), pour ne
  // jamais écrire en base ni changer le prix d'une commande déjà payable.
  // Réévaluée périodiquement pour griser la carte si la page franchit la fin du
  // créneau. Hooks appelés AVANT tout return conditionnel (Rules of Hooks).
  const [available, setAvailable] = useState(() => isExpressAvailable());
  useEffect(() => {
    const id = setInterval(() => setAvailable(isExpressAvailable()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!isExpressEligible(demarcheType)) return null;

  return (
    <div
      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
        !available
          ? "border-border bg-muted/40 opacity-60"
          : checked
          ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
          : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <Checkbox
        id="express_option"
        checked={checked}
        disabled={!available && !checked}
        onCheckedChange={(c) => onCheckedChange(c as boolean)}
      />
      <div className="flex-1">
        <Label
          htmlFor="express_option"
          className={`flex items-center gap-2 font-medium ${(!available && !checked) ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <Zap className="w-4 h-4 text-orange-500" />
          {EXPRESS_LABEL}
          <span className="ml-auto text-orange-500 font-semibold whitespace-nowrap">+{getExpressSurcharge(demarcheType)}&nbsp;€</span>
        </Label>
        {!available && (
          <p className="text-xs text-muted-foreground mt-1">({EXPRESS_UNAVAILABLE_MESSAGE})</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          {EXPRESS_DESCRIPTION}
        </p>
      </div>
    </div>
  );
};
