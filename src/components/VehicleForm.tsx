import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus } from "lucide-react";
import { vehicleSchema } from "@/lib/validations";
import { departementsLabels } from "@/data/departementsTarifs";

interface VehicleFormProps {
  garageId: string;
  onVehicleSelect: (vehicleId: string, immatriculation: string, vehicleData?: any) => void;
  selectedVehicleId?: string | null;
  onPriceCalculated?: (price: number) => void;
  useApiMode?: boolean; // true = avec API et département (CG), false = simple (DA)
}

export function VehicleForm({ garageId, onVehicleSelect, selectedVehicleId, onPriceCalculated, useApiMode = false }: VehicleFormProps) {
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
  const [formData, setFormData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    vin: "",
    date_mec: "",
    puiss_fisc: ""
  });

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
    if (!formData.immatriculation || !departement) return;

    setFetchingVehicle(true);
    try {
      const { getVehicleByPlate } = await import("@/lib/vehicle-api");
      const result = await getVehicleByPlate(formData.immatriculation);

      if (result.success && result.data) {
        const data = result.data;
        setVehicleData(data);
        
        setFormData(prev => ({
          ...prev,
          marque: data?.marque || "",
          modele: data?.modele || "",
          date_mec: data?.date_mec || "",
          puiss_fisc: data?.puissance_fiscale?.toString() || ""
        }));

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
    setLoading(true);

    try {
      const validationData = {
        immatriculation: formData.immatriculation.toUpperCase(),
        marque: formData.marque || undefined,
        modele: formData.modele || undefined,
        vin: formData.vin?.toUpperCase() || null
      };

      const validatedData = vehicleSchema.parse(validationData);

      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          garage_id: garageId,
          immatriculation: validatedData.immatriculation,
          marque: validatedData.marque || null,
          modele: validatedData.modele || null,
          vin: validatedData.vin,
          date_mec: formData.date_mec || null,
          puiss_fisc: formData.puiss_fisc ? parseInt(formData.puiss_fisc) : null
        })
        .select()
        .single();

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

      setFormData({
        immatriculation: "",
        marque: "",
        modele: "",
        vin: "",
        date_mec: "",
        puiss_fisc: ""
      });
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
      toast({
        title: "Erreur de validation",
        description: error.message || "Données invalides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const validationData = {
        immatriculation: formData.immatriculation.toUpperCase(),
        marque: formData.marque || undefined,
        modele: formData.modele || undefined,
        vin: formData.vin?.toUpperCase() || null
      };

      const validatedData = vehicleSchema.parse(validationData);

      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          garage_id: garageId,
          immatriculation: validatedData.immatriculation,
          marque: validatedData.marque || null,
          modele: validatedData.modele || null,
          vin: validatedData.vin,
          date_mec: formData.date_mec || null,
          puiss_fisc: formData.puiss_fisc ? parseInt(formData.puiss_fisc) : null
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer le véhicule",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Véhicule enregistré",
        description: "Le véhicule a été ajouté à votre historique"
      });

      setFormData({
        immatriculation: "",
        marque: "",
        modele: "",
        vin: "",
        date_mec: "",
        puiss_fisc: ""
      });
      
      setShowForm(false);
      loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation, data);
      }
    } catch (error: any) {
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
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Car className="mr-2 h-5 w-5" />
            Véhicule
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
            <Select value={selectedVehicleId || ""} onValueChange={handleVehicleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir dans l'historique" />
              </SelectTrigger>
              <SelectContent>
                {filteredVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.immatriculation} {vehicle.marque && vehicle.modele ? `- ${vehicle.marque} ${vehicle.modele}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="immatriculation">Immatriculation *</Label>
                <Input
                  id="immatriculation"
                  placeholder="AA-123-AA ou 1234 ABC 45"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
                  disabled={priceCalculated}
                  required
                />
              </div>

              {useApiMode && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="departement">Département d'immatriculation *</Label>
                  <Select value={departement} onValueChange={setDepartement} disabled={priceCalculated}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le département" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(departementsLabels).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {code} - {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {fetchingVehicle && (
                <div className="md:col-span-2 text-center py-2">
                  <p className="text-sm text-muted-foreground">Récupération des données du véhicule...</p>
                </div>
              )}

              {priceCalculated && vehicleData && (
                <div className="md:col-span-2 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-green-900 mb-2">Informations du véhicule</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <p><strong>Marque:</strong> {vehicleData.marque}</p>
                    <p><strong>Modèle:</strong> {vehicleData.modele}</p>
                    <p><strong>Date MEC:</strong> {vehicleData.date_mec}</p>
                    <p><strong>Puissance fiscale:</strong> {vehicleData.puissance_fiscale} CV</p>
                    <p className="text-lg font-bold mt-2">Prix: {calculatedPrice.toFixed(2)}€</p>
                  </div>
                </div>
              )}

              {!useApiMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="marque">Marque</Label>
                    <Input
                      id="marque"
                      value={formData.marque}
                      onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modele">Modèle</Label>
                    <Input
                      id="modele"
                      value={formData.modele}
                      onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            {useApiMode ? (
              priceCalculated ? (
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
                  disabled={fetchingVehicle || !formData.immatriculation.trim() || !departement}
                  className="w-full"
                >
                  {fetchingVehicle ? "Calcul en cours..." : "Obtenir le prix"}
                </Button>
              )
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.immatriculation.trim()}
                className="w-full"
              >
                {loading ? "Enregistrement..." : "Enregistrer le véhicule"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
