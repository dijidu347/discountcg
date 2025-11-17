import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVehicleByPlate, calculateCarteGrisePrice } from "@/lib/vehicle-api";

export const PriceSimulator = () => {
  const [plate, setPlate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [price, setPrice] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!plate || plate.length < 6) {
      toast({
        title: "Plaque invalide",
        description: "Veuillez entrer une plaque d'immatriculation valide",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setVehicleData(null);
    setPrice(null);

    try {
      const result = await getVehicleByPlate(plate);
      
      if (result.success && result.data) {
        setVehicleData(result.data);
        const calculatedPrice = calculateCarteGrisePrice(result.data);
        setPrice(calculatedPrice);
        
        toast({
          title: "Véhicule trouvé",
          description: "Les informations ont été récupérées avec succès",
        });
      } else {
        toast({
          title: "Véhicule non trouvé",
          description: "Impossible de trouver les informations pour cette plaque",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la recherche",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Car className="w-6 h-6" />
          Simulateur de Prix - Carte Grise
        </CardTitle>
        <CardDescription className="text-primary-foreground/90">
          Entrez votre plaque d'immatriculation pour obtenir un devis instantané
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plate" className="text-lg font-semibold">
              Plaque d'immatriculation
            </Label>
            <div className="flex gap-2">
              <Input
                id="plate"
                placeholder="Ex: AB-123-CD"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="text-lg font-mono uppercase h-12"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                size="lg"
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>
          </div>

          {vehicleData && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-semibold text-lg">Informations du véhicule</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {vehicleData.marque && (
                  <div>
                    <span className="text-muted-foreground">Marque:</span>
                    <p className="font-medium">{vehicleData.marque}</p>
                  </div>
                )}
                {vehicleData.modele && (
                  <div>
                    <span className="text-muted-foreground">Modèle:</span>
                    <p className="font-medium">{vehicleData.modele}</p>
                  </div>
                )}
                {vehicleData.couleur && (
                  <div>
                    <span className="text-muted-foreground">Couleur:</span>
                    <p className="font-medium">{vehicleData.couleur}</p>
                  </div>
                )}
                {vehicleData.energie && (
                  <div>
                    <span className="text-muted-foreground">Énergie:</span>
                    <p className="font-medium">{vehicleData.energie}</p>
                  </div>
                )}
                {vehicleData.puissance_fiscale && (
                  <div>
                    <span className="text-muted-foreground">Puissance fiscale:</span>
                    <p className="font-medium">{vehicleData.puissance_fiscale} CV</p>
                  </div>
                )}
                {vehicleData.date_mec && (
                  <div>
                    <span className="text-muted-foreground">Mise en circulation:</span>
                    <p className="font-medium">{vehicleData.date_mec}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {price !== null && (
            <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                  Prix estimé de la carte grise
                </p>
                <p className="text-5xl font-bold text-primary">
                  {price.toFixed(2)} €
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  + 30€ de frais de dossier
                </p>
                <div className="pt-4 border-t border-border mt-4">
                  <p className="text-xl font-bold text-foreground">
                    Total: {(price + 30).toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
