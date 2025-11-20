import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Calculator } from "lucide-react";

interface PricingConfig {
  id: string;
  config_key: string;
  config_value: number;
  description: string;
}

const ManagePricingConfig = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_config")
        .select("*")
        .order("config_key");

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration des tarifs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const config of configs) {
        const { error } = await supabase
          .from("pricing_config")
          .update({ config_value: config.config_value })
          .eq("id", config.id);

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "Les tarifs ont été mis à jour",
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les tarifs",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setConfigs(
      configs.map((config) =>
        config.id === id
          ? { ...config, config_value: parseFloat(value) || 0 }
          : config
      )
    );
  };

  const getConfigLabel = (key: string) => {
    const labels: Record<string, string> = {
      prix_par_cv: "Prix par CV fiscal (€)",
      taxe_co2_seuil: "Seuil CO2 (g/km)",
      taxe_co2_montant: "Taxe CO2 par g (€)",
      frais_acheminement: "Frais d'acheminement (€)",
      taxe_gestion: "Taxe de gestion (€)",
      frais_dossier: "Frais de dossier (€)",
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Simulateur Particulier</CardTitle>
                <CardDescription>
                  Gérez les tarifs utilisés pour le calcul du prix des cartes grises
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              {configs.map((config) => (
                <div key={config.id} className="space-y-2">
                  <Label htmlFor={config.config_key}>
                    {getConfigLabel(config.config_key)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={config.config_key}
                      type="number"
                      step="0.01"
                      value={config.config_value}
                      onChange={(e) =>
                        handleValueChange(config.id, e.target.value)
                      }
                      className="max-w-xs"
                    />
                    {config.description && (
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Comment sont calculés les prix ?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>• <strong>Prix par CV fiscal :</strong> Multiplié par la puissance fiscale du véhicule</p>
            <p>• <strong>Taxe CO2 :</strong> Si CO2 &gt; seuil, taxe = (CO2 - seuil) × montant par gramme</p>
            <p>• <strong>Frais fixes :</strong> Acheminement + Taxe de gestion (ajoutés systématiquement)</p>
            <p>• <strong>Frais de dossier :</strong> Ajoutés au montant total pour les commandes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagePricingConfig;
