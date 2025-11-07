import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GarageSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    raison_sociale: "",
    siret: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarage();
    }
  }, [user]);

  const loadGarage = async () => {
    if (!user) return;

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (garageData) {
      setGarage(garageData);
      setFormData({
        raison_sociale: garageData.raison_sociale,
        siret: garageData.siret,
        email: garageData.email,
        telephone: garageData.telephone,
        adresse: garageData.adresse,
        code_postal: garageData.code_postal,
        ville: garageData.ville
      });
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('garages')
      .update({
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        code_postal: formData.code_postal,
        ville: formData.ville
      })
      .eq('id', garage.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les informations",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succès",
        description: "Informations mises à jour avec succès"
      });
      loadGarage();
    }

    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Informations de l'entreprise
            </CardTitle>
            <CardDescription>
              Modifiez les informations de votre garage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="raison_sociale">Raison sociale</Label>
                <Input
                  id="raison_sociale"
                  value={formData.raison_sociale}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Ce champ ne peut pas être modifié
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Ce champ ne peut pas être modifié
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input
                    id="code_postal"
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
