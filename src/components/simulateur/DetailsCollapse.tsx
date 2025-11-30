import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PriceCalculation } from "@/utils/calculatePrice";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface DetailsCollapseProps {
  calculation: PriceCalculation;
}
export const DetailsCollapse = ({
  calculation
}: DetailsCollapseProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {/* Prix taxe régionale */}
              {calculation.prixCVAvantAbattement ? <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxe régionale avant abattement</span>
                    <span className="font-medium">{formatPrice(calculation.prixCVAvantAbattement)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Abattement -50% (véhicule +10 ans)</span>
                    <span className="font-medium">-{formatPrice(calculation.prixCVAvantAbattement * 0.5)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Taxe régionale après abattement</span>
                    <span>{formatPrice(calculation.prixCV)} €</span>
                  </div>
                </> : <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxe régionale</span>
                  <span className="font-medium">{formatPrice(calculation.prixCV)} €</span>
                </div>}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxe de gestion</span>
                <span className="font-medium">{formatPrice(calculation.fraisGestion)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Redevance d'acheminement</span>
                <span className="font-medium">{formatPrice(calculation.fraisAcheminement)} €</span>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total carte grise</span>
                  <span className="text-primary">{formatPrice(calculation.prixTotal)} €</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>;
};