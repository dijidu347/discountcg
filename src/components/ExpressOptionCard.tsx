import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { isExpressEligible, getExpressSurcharge, EXPRESS_LABEL, EXPRESS_DESCRIPTION } from "@/lib/expressOption";

interface ExpressOptionCardProps {
  demarcheType?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const ExpressOptionCard = ({ demarcheType, checked, onCheckedChange }: ExpressOptionCardProps) => {
  if (!isExpressEligible(demarcheType)) return null;
  return (
    <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
      checked ? "border-orange-500 bg-orange-50 dark:bg-orange-950" : "border-border bg-card hover:bg-accent/50"
    }`}>
      <Checkbox id="express_option" checked={checked} onCheckedChange={(c) => onCheckedChange(c as boolean)} />
      <div className="flex-1">
        <Label htmlFor="express_option" className="cursor-pointer flex items-center gap-2 font-medium">
          <Zap className="w-4 h-4 text-orange-500" />
          {EXPRESS_LABEL}
          <span className="ml-auto text-orange-500 font-semibold">+{getExpressSurcharge(demarcheType)},00 €</span>
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          {EXPRESS_DESCRIPTION}
        </p>
      </div>
    </div>
  );
};
