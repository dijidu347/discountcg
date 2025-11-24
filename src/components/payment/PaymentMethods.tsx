import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PayPalButton } from "@/components/PayPalButton";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";

interface PaymentMethodsProps {
  amount: number;
  orderId: string;
  onPaymentSuccess: () => void;
}

const StripeCardForm = ({ clientSecret, amount, onSuccess }: { clientSecret: string; amount: number; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Paiement réussi !");
      onSuccess();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erreur lors du paiement");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || processing} className="w-full">
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Traitement...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Payer {amount.toFixed(2)} €
          </>
        )}
      </Button>
    </form>
  );
};

export function PaymentMethods({ amount, orderId, onPaymentSuccess }: PaymentMethodsProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    initializePayment();
  }, [orderId]);

  const initializePayment = async () => {
    try {
      // Charger la clé Stripe
      const { data: keyData, error: keyError } = await supabase.functions.invoke("get-stripe-key");
      
      if (keyError || !keyData?.publishableKey) {
        throw new Error("Impossible de charger la clé Stripe");
      }

      const stripe = await loadStripe(keyData.publishableKey);
      setStripePromise(stripe);

      // Créer le payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: Math.round(amount * 100),
            metadata: {
              type: 'guest_order',
              order_id: orderId,
            },
          },
        }
      );

      if (paymentError || !paymentData?.clientSecret) {
        throw new Error("Erreur lors de la création du paiement");
      }

      setClientSecret(paymentData.clientSecret);
    } catch (error: any) {
      console.error("Error initializing payment:", error);
      toast.error(error.message || "Erreur lors de l'initialisation du paiement");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async () => {
    try {
      const { error } = await supabase
        .from("guest_orders")
        .update({
          paye: true,
          paid_at: new Date().toISOString(),
          status: "paye",
        })
        .eq("id", orderId);

      if (error) throw error;

      setPaymentSuccess(true);
      onPaymentSuccess();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erreur lors de la mise à jour de la commande");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (paymentSuccess) {
    return (
      <Alert className="border-green-500">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription>
          Paiement effectué avec succès ! Vous pouvez maintenant uploader vos documents.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choisissez votre mode de paiement</CardTitle>
        <CardDescription>
          Montant total : {amount.toFixed(2)} €
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Apple Pay / Google Pay */}
        {stripePromise && (
          <div className="space-y-3">
            <h3 className="font-semibold">Paiement rapide</h3>
            <Elements stripe={stripePromise}>
              <StripeWalletPayment amount={amount} onSuccess={handleSuccess} />
            </Elements>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* PayPal */}
        <div className="space-y-3">
          <h3 className="font-semibold">PayPal (4x sans frais)</h3>
          <PayPalButton
            amount={amount}
            onSuccess={handleSuccess}
            onError={(error) => {
              console.error("PayPal error:", error);
              toast.error("Erreur PayPal");
            }}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* Carte bancaire */}
        {stripePromise && clientSecret && (
          <div className="space-y-3">
            <h3 className="font-semibold">Carte bancaire</h3>
            <Elements stripe={stripePromise}>
              <StripeCardForm clientSecret={clientSecret} amount={amount} onSuccess={handleSuccess} />
            </Elements>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
