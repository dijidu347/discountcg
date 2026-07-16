import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { PriceCalculation } from "@/utils/calculatePrice";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DetailsCollapseProps {
  calculation: PriceCalculation;
}

export const DetailsCollapse = ({
  calculation
}: DetailsCollapseProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Info className="w-3.5 h-3.5" />
        <span>Détail du calcul carte grise</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
            {/* Informations véhicule */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Chevaux fiscaux</span>
                <span className="font-medium">{calculation.chevauxFiscaux} CV</span>
              </div>
              <div className="flex justify-between">
                <span>Tarif départemental</span>
                <span className="font-medium">{formatPrice(calculation.tarifDepartement)} €/CV</span>
              </div>
              <div className="flex justify-between">
                <span>Ancienneté du véhicule</span>
                <span className="font-medium">{calculation.anciennete} ans</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              {/* Prix taxe régionale avec abattement si applicable */}
              {calculation.abattement && calculation.prixCVAvantAbattement ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxe régionale avant abattement</span>
                    <span className="font-medium line-through text-muted-foreground">
                      {formatPrice(calculation.prixCVAvantAbattement)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      Abattement -50%
                      <Badge variant="secondary" className="text-xs">+10 ans</Badge>
                    </span>
                    <span className="font-medium">-{formatPrice(calculation.prixCVAvantAbattement * 0.5)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Taxe régionale après abattement</span>
                    <span>{formatPrice(calculation.prixCV)} €</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxe régionale ({calculation.chevauxFiscaux} CV × {formatPrice(calculation.tarifDepartement)} €)</span>
                  <span className="font-medium">{formatPrice(calculation.prixCV)} €</span>
                </div>
              )}
              
              {calculation.taxeParafiscale > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxe parafiscale (Y.2)</span>
                  <span className="font-medium">{formatPrice(calculation.taxeParafiscale)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxe de gestion</span>
                <span className="font-medium">{formatPrice(calculation.fraisGestion)} €</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Sous-total arrondi</span>
                <span>{formatPrice(calculation.sousTotalArrondi)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Redevance d'acheminement</span>
                <span className="font-medium">{formatPrice(calculation.fraisAcheminement)} €</span>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold">
                  <span>Total carte grise</span>
                  <span className="text-primary">{formatPrice(calculation.prixTotal)} €</span>
                </div>
              </div>
            </div>
      </CollapsibleContent>
    </Collapsible>
  );
};