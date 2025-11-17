import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ManageSubscriptions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [garages, setGarages] = useState<any[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>("");
  const [subscription, setSubscription] = useState({
    plan_type: 'basic',
    price_per_demarche: 8.00,
    margin_percentage: 0
  });

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadGarages();
  };

  const loadGarages = async () => {
    const { data } = await supabase
      .from('garages')
      .select(`
        *,
        subscriptions(*)
      `)
      .order('raison_sociale');

    if (data) {
      setGarages(data);
    }
    setLoading(false);
  };

  const loadGarageSubscription = async (garageId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('garage_id', garageId)
      .eq('status', 'active')
      .single();

    if (data) {
      setSubscription({
        plan_type: data.plan_type,
        price_per_demarche: data.price_per_demarche,
        margin_percentage: data.margin_percentage || 0
      });
    } else {
      // Reset to defaults
      setSubscription({
        plan_type: 'basic',
        price_per_demarche: 8.00,
        margin_percentage: 0
      });
    }
  };

  const handleGarageSelect = (garageId: string) => {
    setSelectedGarageId(garageId);
    loadGarageSubscription(garageId);
  };

  const handlePlanChange = (planType: string) => {
    const prices: Record<string, number> = {
      basic: 8.00,
      pro: 6.50,
      gold: 5.00
    };

    const margins: Record<string, number> = {
      basic: 0,
      pro: 15,
      gold: 25
    };

    setSubscription({
      plan_type: planType,
      price_per_demarche: prices[planType] || 8.00,
      margin_percentage: margins[planType] || 0
    });
  };

  const handleSave = async () => {
    if (!selectedGarageId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un garage",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('garage_id', selectedGarageId)
        .eq('status', 'active')
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan_type: subscription.plan_type,
            price_per_demarche: subscription.price_per_demarche,
            margin_percentage: subscription.margin_percentage
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            garage_id: selectedGarageId,
            plan_type: subscription.plan_type,
            price_per_demarche: subscription.price_per_demarche,
            margin_percentage: subscription.margin_percentage,
            status: 'active'
          });

        if (error) throw error;
      }

      // Update garage Gold status if needed
      if (subscription.plan_type === 'gold') {
        await supabase
          .from('garages')
          .update({ is_gold: true })
          .eq('id', selectedGarageId);
      }

      toast({
        title: "Succès",
        description: "Abonnement mis à jour avec succès"
      });

      loadGarages();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'abonnement",
        variant: "destructive"
      });
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Gérer les abonnements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Sélectionner un garage</Label>
              <Select value={selectedGarageId} onValueChange={handleGarageSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un garage" />
                </SelectTrigger>
                <SelectContent>
                  {garages.map((garage) => (
                    <SelectItem key={garage.id} value={garage.id}>
                      {garage.raison_sociale} - {garage.siret}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGarageId && (
              <>
                <div className="space-y-2">
                  <Label>Type d'abonnement</Label>
                  <Select value={subscription.plan_type} onValueChange={handlePlanChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basique</SelectItem>
                      <SelectItem value="pro">Professionnel</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prix par démarche (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={subscription.price_per_demarche}
                    onChange={(e) => setSubscription({
                      ...subscription,
                      price_per_demarche: parseFloat(e.target.value)
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Marge personnalisable (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={subscription.margin_percentage}
                    onChange={(e) => setSubscription({
                      ...subscription,
                      margin_percentage: parseInt(e.target.value)
                    })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Le garage pourra ajouter jusqu'à {subscription.margin_percentage}% de marge sur ses démarches
                  </p>
                </div>

                <Button onClick={handleSave} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer l'abonnement
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
