import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentSelect } from "@/components/simulateur/DepartmentSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculatePrice } from "@/utils/calculatePrice";
import { PriceSummary } from "@/components/simulateur/PriceSummary";

interface SimulateurCarteGriseProps {
  onPriceCalculated?: (price: number) => void;
}

export const SimulateurCarteGrise = ({ onPriceCalculated }: SimulateurCarteGriseProps) => {
  const [departement, setDepartement] = useState("");
  const [chevauxFiscaux, setChevauxFiscaux] = useState("");
  const [dateMiseEnCirculation, setDateMiseEnCirculation] = useState("");
  const [calculation, setCalculation] = useState<any>(null);

  const handleCalculate = () => {
    if (!departement || !chevauxFiscaux || !dateMiseEnCirculation) {
      return;
    }

    try {
      const result = calculatePrice(
        departement,
        parseInt(chevauxFiscaux),
        dateMiseEnCirculation
      );
      setCalculation(result);
      if (onPriceCalculated) {
        onPriceCalculated(result.prixTotal);
      }
    } catch (error) {
      console.error("Erreur lors du calcul:", error);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulateur de prix carte grise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DepartmentSelect value={departement} onChange={setDepartement} />
          
          <div className="space-y-2">
            <Label>Chevaux fiscaux</Label>
            <Input
              type="number"
              placeholder="Ex: 5"
              value={chevauxFiscaux}
              onChange={(e) => setChevauxFiscaux(e.target.value)}
              onBlur={handleCalculate}
            />
          </div>

          <div className="space-y-2">
            <Label>Date de mise en circulation</Label>
            <Input
              type="date"
              value={dateMiseEnCirculation}
              onChange={(e) => setDateMiseEnCirculation(e.target.value)}
              onBlur={handleCalculate}
            />
          </div>
        </CardContent>
      </Card>

      {calculation && (
        <PriceSummary calculation={calculation} departement={departement} />
      )}
    </div>
  );
};
