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
} from "@/lib/expressOption";

interface ExpressOptionCardProps {
  demarcheType?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const ExpressOptionCard = ({ demarcheType, checked, onCheckedChange }: ExpressOptionCardProps) => {
  // Disponibilité horaire (Europe/Paris), purement PRÉSENTATIONNELLE : hors
  // créneau l'option disparaît de la page. Ce composant ne modifie JAMAIS
  // l'état express de lui-même (pas d'auto-décochage), pour ne jamais écrire en
  // base ni changer le prix d'une commande déjà payable.
  // Réévaluée périodiquement pour retirer l'option si la page franchit la fin
  // du créneau. Hooks appelés AVANT tout return conditionnel (Rules of Hooks).
  const [available, setAvailable] = useState(() => isExpressAvailable());
  useEffect(() => {
    const id = setInterval(() => setAvailable(isExpressAvailable()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!isExpressEligible(demarcheType)) return null;

  // Hors créneau, on retire purement et simplement l'option : une case grisée
  // n'apprend rien au client et encombre la page.
  //
  // Sauf si elle est déjà cochée : le client l'a prise pendant le créneau, elle
  // est comptée dans son prix. La faire disparaître lui ferait payer une ligne
  // invisible, sans moyen de revenir dessus.
  if (!available && !checked) return null;

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
        <p className="text-sm text-muted-foreground mt-1">
          {EXPRESS_DESCRIPTION}
        </p>
      </div>
    </div>
  );
};
