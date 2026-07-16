import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Détail du calcul carte grise à afficher. C'est un sous-ensemble STRUCTUREL de
// PriceCalculation (un PriceCalculation est donc directement assignable → parcours
// guest inchangé), mais il peut aussi être alimenté par les colonnes persistées
// via carteGriseDetailFromColumns (parcours pro/client/admin/suivi).
export interface CarteGriseDetail {
  prixCV: number;
  prixCVAvantAbattement?: number | null;
  abattement?: boolean;
  taxeParafiscale?: number;
  fraisGestion: number;       // constante réglementaire (11 €)
  sousTotalArrondi: number;
  fraisAcheminement: number;  // constante réglementaire (2,76 €)
  prixTotal: number;          // total carte grise (= prix_carte_grise stocké)
  // Bloc "infos véhicule" — parcours guest uniquement (non persisté ailleurs).
  chevauxFiscaux?: number;
  tarifDepartement?: number;
  anciennete?: number;
}

// Constantes fixes, identiques à src/utils/calculatePrice.ts. Elles NE dépendent
// PAS du tarif régional : les réutiliser à l'affichage n'introduit aucune dérive.
const FRAIS_GESTION = 11;
const FRAIS_ACHEMINEMENT = 2.76;

// Construit le détail depuis les colonnes persistées (snapshot figé au calcul).
// AUCUN recalcul de la part dépendant du tarif : prix_cv et sous_total_arrondi
// sont lus tels quels. Renvoie null si le snapshot est absent (anciennes
// commandes, DA/DC, branche non-CG) → l'appelant n'affiche alors pas le dépliable.
export const carteGriseDetailFromColumns = (fields: {
  prix_cv?: number | null;
  prix_cv_avant_abattement?: number | null;
  taxe_parafiscale?: number | null;
  sous_total_arrondi?: number | null;
  prix_total?: number | null; // prix_carte_grise (demarches) ou montant_ht (guest CG)
}): CarteGriseDetail | null => {
  if (fields.sous_total_arrondi == null || fields.prix_cv == null) return null;
  const sousTotalArrondi = Number(fields.sous_total_arrondi);
  return {
    prixCV: Number(fields.prix_cv),
    prixCVAvantAbattement: fields.prix_cv_avant_abattement ?? null,
    abattement: fields.prix_cv_avant_abattement != null,
    taxeParafiscale: fields.taxe_parafiscale != null ? Number(fields.taxe_parafiscale) : 0,
    fraisGestion: FRAIS_GESTION,
    sousTotalArrondi,
    fraisAcheminement: FRAIS_ACHEMINEMENT,
    prixTotal: fields.prix_total != null ? Number(fields.prix_total) : sousTotalArrondi + FRAIS_ACHEMINEMENT,
  };
};

interface DetailsCollapseProps {
  detail: CarteGriseDetail;
}

export const DetailsCollapse = ({ detail }: DetailsCollapseProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const showVehicleInfo = detail.tarifDepartement != null && detail.chevauxFiscaux != null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Info className="w-3.5 h-3.5" />
        <span>Détail du calcul carte grise</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
            {/* Informations véhicule (guest uniquement, si disponibles) */}
            {showVehicleInfo && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Chevaux fiscaux</span>
                  <span className="font-medium">{detail.chevauxFiscaux} CV</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarif départemental</span>
                  <span className="font-medium">{formatPrice(detail.tarifDepartement!)} €/CV</span>
                </div>
                {detail.anciennete != null && (
                  <div className="flex justify-between">
                    <span>Ancienneté du véhicule</span>
                    <span className="font-medium">{detail.anciennete} ans</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              {/* Prix taxe régionale avec abattement si applicable */}
              {detail.abattement && detail.prixCVAvantAbattement ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxe régionale avant abattement</span>
                    <span className="font-medium line-through text-muted-foreground">
                      {formatPrice(detail.prixCVAvantAbattement)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      Abattement -50%
                      <Badge variant="secondary" className="text-xs">+10 ans</Badge>
                    </span>
                    <span className="font-medium">-{formatPrice(detail.prixCVAvantAbattement * 0.5)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Taxe régionale après abattement</span>
                    <span>{formatPrice(detail.prixCV)} €</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxe régionale{showVehicleInfo ? ` (${detail.chevauxFiscaux} CV × ${formatPrice(detail.tarifDepartement!)} €)` : ""}</span>
                  <span className="font-medium">{formatPrice(detail.prixCV)} €</span>
                </div>
              )}

              {(detail.taxeParafiscale ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxe parafiscale (Y.2)</span>
                  <span className="font-medium">{formatPrice(detail.taxeParafiscale!)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxe de gestion</span>
                <span className="font-medium">{formatPrice(detail.fraisGestion)} €</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Sous-total arrondi</span>
                <span>{formatPrice(detail.sousTotalArrondi)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Redevance d'acheminement</span>
                <span className="font-medium">{formatPrice(detail.fraisAcheminement)} €</span>
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold">
                  <span>Total carte grise</span>
                  <span className="text-primary">{formatPrice(detail.prixTotal)} €</span>
                </div>
              </div>
            </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
