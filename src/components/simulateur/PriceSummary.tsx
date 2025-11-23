import { Card, CardContent } from "@/components/ui/card";
import { PriceCalculation } from "@/utils/calculatePrice";
import { Badge } from "@/components/ui/badge";

interface PriceSummaryProps {
  calculation: PriceCalculation;
  departement: string;
}

export const PriceSummary = ({ calculation, departement }: PriceSummaryProps) => {
  return (
    <Card className="border-primary/20 sticky top-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Votre commande</p>
            <div className="text-3xl font-bold text-primary">
              {calculation.prixTotal.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">TTC</p>
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Département</span>
              <span className="font-medium">{departement}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Chevaux fiscaux</span>
              <span className="font-medium">{calculation.chevauxFiscaux} CV</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ancienneté</span>
              <span className="font-medium">{calculation.anciennete} ans</span>
            </div>
          </div>

          {calculation.abattement && (
            <Badge variant="secondary" className="w-full justify-center py-2 text-xs">
              👉 Abattement -50% appliqué
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
