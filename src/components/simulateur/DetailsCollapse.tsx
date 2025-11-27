import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PriceCalculation } from "@/utils/calculatePrice";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

interface DetailsCollapseProps {
  calculation: PriceCalculation;
}

export const DetailsCollapse = ({ calculation }: DetailsCollapseProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full">
          Voir les détails du calcul
          {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {/* Prix taxe régionale */}
              {calculation.prixCVAvantAbattement ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxe régionale avant abattement</span>
                    <span className="font-medium">{calculation.prixCVAvantAbattement.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Abattement -50% (véhicule +10 ans)</span>
                    <span className="font-medium">-{(calculation.prixCVAvantAbattement * 0.5).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Taxe régionale après abattement</span>
                    <span>{calculation.prixCV.toFixed(2)} €</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxe régionale</span>
                  <span className="font-medium">{calculation.prixCV.toFixed(2)} €</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxe de gestion</span>
                <span className="font-medium">{calculation.fraisGestion.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Redevance d'acheminement</span>
                <span className="font-medium">{calculation.fraisAcheminement.toFixed(2)} €</span>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total carte grise</span>
                  <span className="text-primary">{calculation.prixTotal.toFixed(2)} €</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Exonéré de TVA (taxe régionale)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
