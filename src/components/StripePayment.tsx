import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface StripePaymentProps {
  demarcheId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

let stripePromise: any = null;

// Formulaire de paiement qui s'affiche automatiquement
function PaymentForm({ amount, onSuccess, onCancel }: Omit<StripePaymentProps, 'demarcheId'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Erreur",
        description: "Le système de paiement n'est pas prêt",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/mes-demarches`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Erreur de paiement",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Paiement réussi",
          description: "Votre paiement a été effectué avec succès"
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations de paiement */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Lock className="h-4 w-4 text-success" />
          <span className="text-sm font-medium">Paiement sécurisé par Stripe</span>
        </div>

        {/* Payment Element de Stripe - s'affiche automatiquement */}
        <div className="min-h-[200px]">
          <PaymentElement 
            options={{
              layout: 'tabs',
              wallets: {
                applePay: 'auto',
                googlePay: 'auto'
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">Montant à payer</span>
          <span className="text-xl font-bold text-foreground">{amount.toFixed(2)} €</span>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={loading} 
          className="flex-1"
        >
          Annuler
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !stripe} 
          className="flex-1 bg-success hover:bg-success/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Paiement en cours...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Valider le paiement
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Composant principal
export function StripePayment({ demarcheId, amount, onSuccess, onCancel }: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      // 1. Récupérer la clé publique Stripe
      if (!stripePromise) {
        const { data: keyData, error: keyError } = await supabase.functions.invoke('get-stripe-key');
        
        if (keyError || !keyData?.publishableKey) {
          throw new Error("Impossible de charger la clé Stripe");
        }

        stripePromise = loadStripe(keyData.publishableKey);
      }

      // 2. Vérifier la session utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      // 3. Créer le payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
        body: { demarcheId, paymentType: 'full' }
      });

      if (paymentError) {
        console.error('Payment intent error:', paymentError);
        throw new Error(paymentError.message || "Impossible de créer le paiement");
      }

      if (!paymentData?.clientSecret) {
        throw new Error("Client secret non reçu");
      }

      setClientSecret(paymentData.clientSecret);
      setError("");
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setError(error.message || "Erreur d'initialisation du paiement");
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initialiser le paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // État de chargement
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">Initialisation du paiement...</p>
            <p className="text-xs text-muted-foreground">Chargement sécurisé du système Stripe</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // État d'erreur
  if (error || !clientSecret) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">Erreur d'initialisation du paiement</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={initializePayment} variant="outline">
                Réessayer
              </Button>
              <Button onClick={onCancel} variant="ghost">
                Annuler
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Affichage du formulaire de paiement
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Paiement sécurisé
        </CardTitle>
        <CardDescription>
          Complétez votre paiement en renseignant vos informations bancaires
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements 
          stripe={stripePromise} 
          options={{ 
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: 'hsl(var(--primary))',
                colorText: 'hsl(var(--foreground))',
                colorDanger: 'hsl(var(--destructive))',
                fontFamily: 'system-ui, sans-serif',
                borderRadius: '8px',
              }
            }
          }}
        >
          <PaymentForm 
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
