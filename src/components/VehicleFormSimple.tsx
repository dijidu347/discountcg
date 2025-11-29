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
          marque: formData.marque || null,
          modele: formData.modele || null,
          vin: formData.vin || null
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

            {vehicleData && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
                <p className="font-medium text-green-900 mb-1">Véhicule identifié :</p>
                <p className="text-green-800">{vehicleData.marque} {vehicleData.modele}</p>
                {vehicleData.energie && <p className="text-green-700 text-xs">Énergie : {vehicleData.energie}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="marque">Marque</Label>
              <Input
                id="marque"
                placeholder="Renault, Peugeot..."
                value={formData.marque}
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modele">Modèle</Label>
              <Input
                id="modele"
                placeholder="Clio, 308..."
                value={formData.modele}
                onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN (optionnel)</Label>
              <Input
                id="vin"
                placeholder="Numéro de série du véhicule"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
              />
            </div>

            <Button type="button" onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Enregistrement..." : "Enregistrer le véhicule"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher un véhicule existant</Label>
              <Input
                id="search"
                placeholder="Immatriculation, marque, modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredVehicles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="vehicle-select">Sélectionner un véhicule</Label>
                <Select
                  value={selectedVehicleId || ""}
                  onValueChange={handleVehicleSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisissez un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.immatriculation}
                        {vehicle.marque && vehicle.modele && ` - ${vehicle.marque} ${vehicle.modele}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredVehicles.length === 0 && vehicles.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule trouvé
              </p>
            )}

            {vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule enregistré. Cliquez sur "Nouveau" pour en ajouter un.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}