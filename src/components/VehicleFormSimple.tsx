import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus, Search, Loader2 } from "lucide-react";
import { getVehicleByPlate } from "@/lib/vehicle-api";

interface VehicleFormSimpleProps {
  garageId: string;
  onVehicleSelect: (vehicleId: string, immatriculation: string) => void;
  selectedVehicleId?: string | null;
}

export function VehicleFormSimple({ garageId, onVehicleSelect, selectedVehicleId }: VehicleFormSimpleProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingVehicle, setFetchingVehicle] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [formData, setFormData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    vin: ""
  });

  useEffect(() => {
    loadVehicles();
  }, [garageId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = vehicles.filter(v => 
        v.immatriculation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.marque?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.modele?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVehicles(filtered);
    } else {
      setFilteredVehicles(vehicles);
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

  const handleFetchVehicle = async () => {
    if (!formData.immatriculation.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une immatriculation",
        variant: "destructive"
      });
      return;
    }

    setFetchingVehicle(true);
    try {
      const result = await getVehicleByPlate(formData.immatriculation);

      if (result.success && result.data) {
        setVehicleData(result.data);
        setFormData(prev => ({
          ...prev,
          marque: result.data?.marque || "",
          modele: result.data?.modele || ""
        }));
        toast({
          title: "Véhicule trouvé",
          description: `${result.data.marque} ${result.data.modele}`
        });
      } else {
        toast({
          title: "Véhicule non trouvé",
          description: "Vous pouvez remplir les informations manuellement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur API:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les données du véhicule",
        variant: "destructive"
      });
    } finally {
      setFetchingVehicle(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.immatriculation.trim()) {
      toast({
        title: "Erreur",
        description: "L'immatriculation est obligatoire",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          garage_id: garageId,
          immatriculation: formData.immatriculation.toUpperCase(),
          marque: vehicleData?.marque || null,
          modele: vehicleData?.modele || null,
          vin: vehicleData?.vin || null,
          energie: vehicleData?.energie || null,
          puiss_fisc: vehicleData?.puissance_fiscale || null,
          date_mec: vehicleData?.date_mec || null,
          couleur: vehicleData?.couleur || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Véhicule enregistré, vous pouvez maintenant télécharger vos documents"
      });

      setFormData({
        immatriculation: "",
        marque: "",
        modele: "",
        vin: ""
      });
      setVehicleData(null);
      setShowForm(false);
      await loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le véhicule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      onVehicleSelect(vehicle.id, vehicle.immatriculation);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3">
          <Car className="h-5 w-5" />
          <span>Véhicule</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="ml-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            {showForm ? "Annuler" : "Nouveau"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <div className="space-y-4">
            {!vehicleData ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
                  <p className="font-medium mb-1">Formats d'immatriculation acceptés :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Nouveau format (SIV)</strong> : AA-123-AA</li>
                    <li><strong>Ancien format (FNI)</strong> : 1234 ABC 45</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="immatriculation">Immatriculation *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="immatriculation"
                      placeholder="AA-123-AA ou 1234 ABC 45"
                      value={formData.immatriculation}
                      onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFetchVehicle}
                      disabled={fetchingVehicle || !formData.immatriculation.trim()}
                    >
                      {fetchingVehicle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-green-900 mb-2">Informations du véhicule</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <p><strong>Immatriculation:</strong> {formData.immatriculation}</p>
                    <p><strong>Marque:</strong> {vehicleData.marque}</p>
                    <p><strong>Modèle:</strong> {vehicleData.modele}</p>
                    {vehicleData.date_mec && <p><strong>Date MEC:</strong> {vehicleData.date_mec}</p>}
                    {vehicleData.puissance_fiscale && <p><strong>Puissance fiscale:</strong> {vehicleData.puissance_fiscale} CV</p>}
                    {vehicleData.energie && <p><strong>Énergie:</strong> {vehicleData.energie}</p>}
                    {vehicleData.couleur && <p><strong>Couleur:</strong> {vehicleData.couleur}</p>}
                    {vehicleData.vin && <p><strong>VIN:</strong> {vehicleData.vin}</p>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setVehicleData(null);
                      setFormData({ immatriculation: "", marque: "", modele: "", vin: "" });
                    }}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Enregistrement..." : "Valider"}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barre de recherche améliorée */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Rechercher par immatriculation, marque ou modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Liste des véhicules */}
            {filteredVehicles.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {filteredVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleVehicleSelect(vehicle.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                      selectedVehicleId === vehicle.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-muted rounded-md px-2 py-1 font-mono text-sm font-medium">
                        {vehicle.immatriculation}
                      </div>
                      {vehicle.marque && (
                        <span className="text-sm text-muted-foreground">
                          {vehicle.marque} {vehicle.modele}
                        </span>
                      )}
                    </div>
                    {selectedVehicleId === vehicle.id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            ) : vehicles.length > 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun véhicule trouvé</p>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun véhicule enregistré</p>
                <p className="text-xs mt-1">Cliquez sur "Nouveau" pour en ajouter un</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}