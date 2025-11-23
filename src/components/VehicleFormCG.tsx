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
import { Car, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
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
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departement, setDepartement] = useState("");
  const [fetchingVehicle, setFetchingVehicle] = useState(false);
  const [priceCalculated, setPriceCalculated] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [immatriculation, setImmatriculation] = useState("");
  const [openDepartement, setOpenDepartement] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, [garageId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVehicles(vehicles);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredVehicles(
        vehicles.filter(v => 
          v.immatriculation?.toLowerCase().includes(query) ||
          v.marque?.toLowerCase().includes(query) ||
          v.modele?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, vehicles]);

  const loadVehicles = async () => {
    const { data } = await supabase
      .from('vehicules')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    if (data) {
      setVehicles(data);
      setFilteredVehicles(data);
    }
  };

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

  const handleValidate = async () => {
    if (!vehicleData) return;

    setLoading(true);

    try {
      // Vérifier si le véhicule existe déjà
      const { data: existingVehicle } = await supabase
        .from('vehicules')
        .select('id')
        .eq('garage_id', garageId)
        .eq('immatriculation', immatriculation.toUpperCase())
        .maybeSingle();

      let data;
      let error;

      if (existingVehicle) {
        // Mettre à jour le véhicule existant
        const result = await supabase
          .from('vehicules')
          .update({
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
          })
          .eq('id', existingVehicle.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Insérer un nouveau véhicule
        const result = await supabase
          .from('vehicules')
          .insert({
            garage_id: garageId,
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
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer le véhicule",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Notifier le parent du prix calculé
      if (onPriceCalculated && calculatedPrice > 0) {
        onPriceCalculated(calculatedPrice);
      }

      toast({
        title: "Véhicule validé",
        description: "Le véhicule a été enregistré et le prix ajouté"
      });

      setImmatriculation("");
      setDepartement("");
      setPriceCalculated(false);
      setCalculatedPrice(0);
      setVehicleData(null);
      
      setShowForm(false);
      loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation, data);
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      toast({
        title: "Erreur de validation",
        description: error.message || "Données invalides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      onVehicleSelect(vehicleId, vehicle.immatriculation, vehicle);
      
      // Si le véhicule a déjà un prix calculé, le notifier
      if (vehicle.puiss_fisc && vehicle.date_mec && onPriceCalculated) {
        const { calculatePrice } = require("@/utils/calculatePrice");
        // Utiliser le dernier département connu ou demander
        if (departement) {
          const priceResult = calculatePrice(
            departement,
            vehicle.puiss_fisc,
            vehicle.date_mec
          );
          onPriceCalculated(priceResult.prixTotal);
        }
      }
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Voulez-vous vraiment supprimer ce véhicule de l'historique ?")) {
      return;
    }

    const { error } = await supabase
      .from('vehicules')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le véhicule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Véhicule supprimé",
      description: "Le véhicule a été retiré de l'historique"
    });

    loadVehicles();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Car className="mr-2 h-5 w-5" />
            Véhicule (Carte Grise)
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Annuler" : "Nouveau véhicule"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm && (
          <div className="space-y-2">
            <Label>Sélectionner un véhicule existant</Label>
            <Input
              placeholder="Rechercher par immat, marque ou modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Select value={selectedVehicleId || ""} onValueChange={handleVehicleSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choisir dans l'historique" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {filteredVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.immatriculation} {vehicle.marque && vehicle.modele ? `- ${vehicle.marque} ${vehicle.modele}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVehicleId && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={(e) => handleDeleteVehicle(selectedVehicleId, e)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        )}

        {showForm && (
          <div className="space-y-4">
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
                  disabled={loading}
                  className="flex-1"
                >
                  Modifier
                </Button>
                <Button
                  onClick={handleValidate}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Validation..." : "Valider"}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
