import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalButton } from "./PayPalButton";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface StripePaymentProps {
  demarcheId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ demarcheId, amount, onSuccess, onCancel }: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"full" | "installments">("full");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/mes-demarches`,
        },
      });

      if (error) {
        toast({
          title: "Erreur de paiement",
          description: error.message,
          variant: "destructive"
        });
      } else {
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
      <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as "full" | "installments")}>
        <div className="flex items-center space-x-2 border rounded-lg p-4">
          <RadioGroupItem value="full" id="full" />
          <Label htmlFor="full" className="flex-1 cursor-pointer">
            <div>
              <p className="font-medium">Paiement en une fois</p>
              <p className="text-sm text-muted-foreground">
                {amount.toFixed(2)} € - Paiement par carte bancaire (Apple Pay & Google Pay acceptés)
              </p>
            </div>
          </Label>
        </div>
        
        <div className="flex items-center space-x-2 border rounded-lg p-4">
          <RadioGroupItem value="installments" id="installments" />
          <Label htmlFor="installments" className="flex-1 cursor-pointer">
            <div>
              <p className="font-medium">Paiement en 4x sans frais</p>
              <p className="text-sm text-muted-foreground">
                4 x {(amount / 4).toFixed(2)} € - Via PayPal
              </p>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {paymentType === "full" ? (
        <>
          <PaymentElement options={{
            wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            }
          }} />

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !stripe} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                `Payer ${amount.toFixed(2)} €`
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <PayPalButton 
            amount={amount}
            onSuccess={onSuccess}
            onError={(error) => {
              toast({
                title: "Erreur PayPal",
                description: error.message || "Une erreur est survenue",
                variant: "destructive"
              });
            }}
          />
          <Button type="button" variant="outline" onClick={onCancel} className="w-full">
            Annuler
          </Button>
        </div>
      )}
    </form>
  );
}

export function StripePayment({ demarcheId, amount, onSuccess, onCancel }: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      // Vérifier que l'utilisateur est authentifié
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Vous devez être connecté pour effectuer un paiement");
      }

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { demarcheId, paymentType: 'full' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error("Client secret non reçu");
      }
    } catch (error: any) {
      console.error('Payment intent error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initialiser le paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">Erreur d'initialisation du paiement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiement sécurisé</CardTitle>
        <CardDescription>Choisissez votre mode de paiement</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm 
            demarcheId={demarcheId}
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
