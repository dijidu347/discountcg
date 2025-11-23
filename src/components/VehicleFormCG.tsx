import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Car, Check, ChevronsUpDown } from "lucide-react";
import { departementsLabels } from "@/data/departementsTarifs";
import { cn } from "@/lib/utils";

interface VehicleFormCGProps {
  garageId: string;
  onVehicleSelect: (vehicleId: string, immatriculation: string, vehicleData?: any) => void;
  selectedVehicleId?: string | null;
  onPriceCalculated?: (price: number) => void;
}

export function VehicleFormCG({ garageId, onVehicleSelect, selectedVehicleId, onPriceCalculated }: VehicleFormCGProps) {
  const { toast } = useToast();
  const [departement, setDepartement] = useState("");
  const [fetchingVehicle, setFetchingVehicle] = useState(false);
  const [priceCalculated, setPriceCalculated] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [immatriculation, setImmatriculation] = useState("");
  const [openDepartement, setOpenDepartement] = useState(false);


  const fetchVehicleDataAndPrice = async () => {
    if (!immatriculation || !departement) return;

    setFetchingVehicle(true);
    try {
      const { getVehicleByPlate } = await import("@/lib/vehicle-api");
      const result = await getVehicleByPlate(immatriculation);

      if (result.success && result.data) {
        const data = result.data;
        setVehicleData(data);

        // Calculer le prix
        if (data.puissance_fiscale && data.date_mec) {
          const { calculatePrice } = await import("@/utils/calculatePrice");
          const priceResult = calculatePrice(
            departement,
            data.puissance_fiscale,
            data.date_mec
          );
          
          setCalculatedPrice(priceResult.prixTotal);
          setPriceCalculated(true);

          toast({
            title: "Prix calculé",
            description: `Prix de la carte grise: ${priceResult.prixTotal.toFixed(2)}€`
          });
        }
      } else {
        toast({
          title: "Véhicule non trouvé",
          description: "Impossible de récupérer les données du véhicule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les données du véhicule",
        variant: "destructive"
      });
    } finally {
      setFetchingVehicle(false);
    }
  };

  const handleModify = () => {
    setPriceCalculated(false);
    setCalculatedPrice(0);
    setVehicleData(null);
  };

  const handleValidate = () => {
    if (!vehicleData) return;

    // Notifier le parent du prix calculé
    if (onPriceCalculated && calculatedPrice > 0) {
      onPriceCalculated(calculatedPrice);
    }

    // Créer un objet véhicule temporaire avec les données
    const tempVehicleData = {
      id: `temp-${Date.now()}`, // ID temporaire
      immatriculation: immatriculation.toUpperCase(),
      marque: vehicleData.marque || null,
      modele: vehicleData.modele || null,
      vin: vehicleData.vin || null,
      date_mec: vehicleData.date_mec || null,
      puiss_fisc: vehicleData.puissance_fiscale || null,
      carrosserie: vehicleData.carrosserie || null,
      genre: vehicleData.genre || null,
      couleur: vehicleData.couleur || null,
      energie: vehicleData.energie || null,
      type: vehicleData.type || null,
      version: vehicleData.version || null,
      numero_formule: vehicleData.numero_formule || null,
      puiss_ch: vehicleData.puissance_ch || null,
      cylindree: vehicleData.cylindree || null,
      co2: vehicleData.co2 || null,
      ptr: vehicleData.ptr || null,
      date_cg: vehicleData.date_cg || null,
    };

    toast({
      title: "Véhicule validé",
      description: "Les informations du véhicule ont été ajoutées"
    });

    // Notifier le parent avec les données du véhicule
    onVehicleSelect(tempVehicleData.id, tempVehicleData.immatriculation, tempVehicleData);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Car className="mr-2 h-5 w-5" />
          Véhicule (Carte Grise)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
          <p className="font-medium mb-1">Formats d'immatriculation acceptés :</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Nouveau format (SIV)</strong> : AA-123-AA</li>
            <li><strong>Ancien format (FNI)</strong> : 1234 ABC 45</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="immatriculation">Immatriculation *</Label>
            <Input
              id="immatriculation"
              placeholder="AA-123-AA ou 1234 ABC 45"
              value={immatriculation}
              onChange={(e) => setImmatriculation(e.target.value.toUpperCase())}
              disabled={priceCalculated}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="departement">Département d'immatriculation *</Label>
            <Popover open={openDepartement} onOpenChange={setOpenDepartement}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDepartement}
                  className="w-full justify-between"
                  disabled={priceCalculated}
                >
                  {departement
                    ? `${departement} - ${departementsLabels[departement]}`
                    : "Sélectionnez le département"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un département..." />
                  <CommandList>
                    <CommandEmpty>Aucun département trouvé.</CommandEmpty>
                    <CommandGroup>
                      {Object.entries(departementsLabels).map(([code, label]) => (
                        <CommandItem
                          key={code}
                          value={`${code} ${label}`}
                          onSelect={() => {
                            setDepartement(code);
                            setOpenDepartement(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              departement === code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {code} - {label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {fetchingVehicle && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Récupération des données du véhicule...</p>
            </div>
          )}

          {priceCalculated && vehicleData && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-semibold text-green-900 mb-2">Informations du véhicule</h4>
              <div className="space-y-1 text-sm text-green-800">
                <p><strong>Marque:</strong> {vehicleData.marque}</p>
                <p><strong>Modèle:</strong> {vehicleData.modele}</p>
                <p><strong>Date MEC:</strong> {vehicleData.date_mec}</p>
                <p><strong>Puissance fiscale:</strong> {vehicleData.puissance_fiscale} CV</p>
                {vehicleData.energie && <p><strong>Énergie:</strong> {vehicleData.energie}</p>}
                {vehicleData.couleur && <p><strong>Couleur:</strong> {vehicleData.couleur}</p>}
                <p className="text-lg font-bold mt-2">Prix: {calculatedPrice.toFixed(2)}€</p>
              </div>
            </div>
          )}
        </div>

        {priceCalculated ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleModify}
              className="flex-1"
            >
              Modifier
            </Button>
            <Button
              onClick={handleValidate}
              className="flex-1"
            >
              Valider
            </Button>
          </div>
        ) : (
          <Button
            onClick={fetchVehicleDataAndPrice}
            disabled={fetchingVehicle || !immatriculation.trim() || !departement}
            className="w-full"
          >
            {fetchingVehicle ? "Calcul en cours..." : "Obtenir le prix"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
