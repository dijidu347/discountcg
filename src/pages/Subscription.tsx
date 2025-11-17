import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    type: 'basic',
    name: 'Basique',
    price: 19.90,
    pricePerDemarche: 8.00,
    features: [
      'Traitement standard',
      'Support par email',
      'Délai normal de traitement',
      '0% de marge personnalisée'
    ]
  },
  {
    type: 'pro',
    name: 'Professionnel',
    price: 39.90,
    pricePerDemarche: 6.50,
    features: [
      'Traitement prioritaire',
      'Support téléphonique',
      'Délai de traitement réduit',
      'Jusqu\'à 15% de marge personnalisée',
      'Statistiques avancées'
    ]
  },
  {
    type: 'gold',
    name: 'Gold',
    price: 79.90,
    pricePerDemarche: 5.00,
    features: [
      'Traitement ultra-prioritaire',
      'Support dédié 24/7',
      'Délai de traitement express',
      'Jusqu\'à 25% de marge personnalisée',
      'Statistiques avancées',
      'Badge vérifié Gold',
      'Accès API'
    ],
    highlighted: true
  }
];

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (garageData) {
      setGarage(garageData);

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('garage_id', garageData.id)
        .eq('status', 'active')
        .single();

      setCurrentSubscription(subData);
    }

    setLoading(false);
  };

  const handleSubscribe = async (planType: string) => {
    if (!garage) return;

    const plan = plans.find(p => p.type === planType);
    if (!plan) return;

    try {
      // Cancel existing subscription if any
      if (currentSubscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', currentSubscription.id);
      }

      // Create new subscription
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          garage_id: garage.id,
          plan_type: planType,
          price_per_demarche: plan.pricePerDemarche,
          margin_percentage: planType === 'gold' ? 25 : planType === 'pro' ? 15 : 0,
          status: 'active'
        });

      if (error) throw error;

      // Update garage Gold status if needed
      if (planType === 'gold') {
        await supabase
          .from('garages')
          .update({ is_gold: true })
          .eq('id', garage.id);
      }

      toast({
        title: "Abonnement activé",
        description: `Vous êtes maintenant abonné au plan ${plan.name}`
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'abonnement",
        variant: "destructive"
      });
    }
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
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choisissez votre abonnement</h1>
          <p className="text-xl text-muted-foreground">
            Bénéficiez de tarifs préférentiels et de fonctionnalités avancées
          </p>
        </div>

        {currentSubscription && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Abonnement actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">
                    Plan {plans.find(p => p.type === currentSubscription.plan_type)?.name}
                  </p>
                  <p className="text-muted-foreground">
                    {currentSubscription.price_per_demarche.toFixed(2)} € par démarche
                  </p>
                </div>
                <Badge variant="default">Actif</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.type} 
              className={`relative ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Crown className="h-3 w-3 mr-1" />
                    Recommandé
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price.toFixed(2)} €</span>
                  <span className="text-muted-foreground">/mois</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold">{plan.pricePerDemarche.toFixed(2)} € par démarche</p>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleSubscribe(plan.type)}
                  disabled={currentSubscription?.plan_type === plan.type}
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {currentSubscription?.plan_type === plan.type ? "Plan actuel" : "Souscrire"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
