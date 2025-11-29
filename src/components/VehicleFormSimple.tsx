import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus, Search, Loader2, Edit } from "lucide-react";
import { getVehicleByPlate } from "@/lib/vehicle-api";

interface VehicleFormSimpleProps {
  garageId: string;
  onVehicleSelect: (vehicleId: string, immatriculation: string) => void;
  selectedVehicleId?: string | null;
}

// Convertir une date DD-MM-YYYY en YYYY-MM-DD pour PostgreSQL
function formatDateForDB(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  // Si déjà au format YYYY-MM-DD, retourner tel quel
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convertir DD-MM-YYYY en YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
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
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    vin: ""
  });
  const [plateInput, setPlateInput] = useState("");

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
    const plateToSearch = plateInput.trim();
    if (!plateToSearch) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une immatriculation",
        variant: "destructive"
      });
      return;
    }

    setFetchingVehicle(true);
    try {
      const result = await getVehicleByPlate(plateToSearch);

      if (result.success && result.data) {
        const vehicleWithPlate = {
          ...result.data,
          immatriculation: plateToSearch.toUpperCase()
        };
        setVehicleData(vehicleWithPlate);
        setManualMode(false);
        toast({
          title: "Véhicule trouvé",
          description: `${result.data.marque} ${result.data.modele}`
        });
      } else {
        // Passer en mode manuel si véhicule non trouvé
        setManualMode(true);
        setManualData(prev => ({
          ...prev,
          immatriculation: plateToSearch.toUpperCase()
        }));
        toast({
          title: "Véhicule non trouvé",
          description: "Veuillez saisir les informations manuellement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur API:", error);
      setManualMode(true);
      setManualData(prev => ({
        ...prev,
        immatriculation: plateToSearch.toUpperCase()
      }));
      toast({
        title: "Erreur API",
        description: "Veuillez saisir les informations manuellement",
        variant: "destructive"
      });
    } finally {
      setFetchingVehicle(false);
    }
  };

  const handleSubmitAPI = async () => {
    if (!vehicleData?.immatriculation) {
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
          immatriculation: vehicleData.immatriculation.toUpperCase(),
          marque: vehicleData?.marque || null,
          modele: vehicleData?.modele || null,
          energie: vehicleData?.energie || null,
          puiss_fisc: vehicleData?.puissance_fiscale ? Number(vehicleData.puissance_fiscale) : null,
          date_mec: formatDateForDB(vehicleData?.date_mec),
          couleur: vehicleData?.couleur || null,
          co2: vehicleData?.co2 ? Number(vehicleData.co2) : null,
          vin: vehicleData?.vin || null
        })
        .select()
        .single();

      if (error) {
        console.error("DB Error:", error);
        throw error;
      }

      toast({
        title: "Succès",
        description: "Véhicule enregistré"
      });

      resetForm();
      await loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation);
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'ajouter le véhicule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!manualData.immatriculation.trim()) {
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
          immatriculation: manualData.immatriculation.toUpperCase(),
          marque: manualData.marque.trim() || null,
          modele: manualData.modele.trim() || null,
          vin: manualData.vin.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error("DB Error:", error);
        throw error;
      }

      toast({
        title: "Succès",
        description: "Véhicule enregistré"
      });

      resetForm();
      await loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation);
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'ajouter le véhicule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPlateInput("");
    setVehicleData(null);
    setManualMode(false);
    setManualData({ immatriculation: "", marque: "", modele: "", vin: "" });
    setShowForm(false);
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
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
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
            {/* Étape 1: Recherche par immatriculation */}
            {!vehicleData && !manualMode && (
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
                      value={plateInput}
                      onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFetchVehicle}
                      disabled={fetchingVehicle || !plateInput.trim()}
                    >
                      {fetchingVehicle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualMode(true)}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Saisie manuelle (si véhicule non trouvé)
                </Button>
              </>
            )}

            {/* Affichage données API */}
            {vehicleData && !manualMode && (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-green-900 mb-2">Informations du véhicule</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                    <p><strong>Immatriculation:</strong> {vehicleData.immatriculation}</p>
                    {vehicleData.marque && <p><strong>Marque:</strong> {vehicleData.marque}</p>}
                    {vehicleData.modele && <p><strong>Modèle:</strong> {vehicleData.modele}</p>}
                    {vehicleData.date_mec && <p><strong>Date MEC:</strong> {vehicleData.date_mec}</p>}
                    {vehicleData.puissance_fiscale && <p><strong>Puissance fiscale:</strong> {vehicleData.puissance_fiscale} CV</p>}
                    {vehicleData.energie && <p><strong>Énergie:</strong> {vehicleData.energie}</p>}
                    {vehicleData.couleur && <p><strong>Couleur:</strong> {vehicleData.couleur}</p>}
                    {vehicleData.co2 && <p><strong>CO2:</strong> {vehicleData.co2} g/km</p>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setVehicleData(null);
                      setPlateInput("");
                    }}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitAPI}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Enregistrement..." : "Valider"}
                  </Button>
                </div>
              </>
            )}

            {/* Mode saisie manuelle */}
            {manualMode && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                  <p className="font-medium">Saisie manuelle</p>
                  <p>Renseignez les informations du véhicule.</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="manual-immat">Immatriculation *</Label>
                    <Input
                      id="manual-immat"
                      placeholder="AA-123-AA"
                      value={manualData.immatriculation}
                      onChange={(e) => setManualData({ ...manualData, immatriculation: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="manual-marque">Marque (optionnel)</Label>
                      <Input
                        id="manual-marque"
                        placeholder="RENAULT"
                        value={manualData.marque}
                        onChange={(e) => setManualData({ ...manualData, marque: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-modele">Modèle (optionnel)</Label>
                      <Input
                        id="manual-modele"
                        placeholder="CLIO"
                        value={manualData.modele}
                        onChange={(e) => setManualData({ ...manualData, modele: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-vin">VIN (optionnel)</Label>
                    <Input
                      id="manual-vin"
                      placeholder="VF1ABC123456789"
                      value={manualData.vin}
                      onChange={(e) => setManualData({ ...manualData, vin: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setManualMode(false);
                      setManualData({ immatriculation: "", marque: "", modele: "", vin: "" });
                    }}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitManual}
                    disabled={loading || !manualData.immatriculation.trim()}
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
            {/* Véhicule sélectionné */}
            {selectedVehicleId && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      {(() => {
                        const selected = vehicles.find(v => v.id === selectedVehicleId);
                        return selected ? (
                          <>
                            <p className="font-mono font-semibold">{selected.immatriculation}</p>
                            {selected.marque && (
                              <p className="text-sm text-muted-foreground">{selected.marque} {selected.modele}</p>
                            )}
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onVehicleSelect("", "")}
                  >
                    Changer
                  </Button>
                </div>
              </div>
            )}

            {/* Barre de recherche */}
            {!selectedVehicleId && (
              <>
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
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
