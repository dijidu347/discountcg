import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

interface PaymentMethodsProps {
  amount: number;
  orderId: string;
  trackingNumber?: string;
  onPaymentSuccess: () => void;
}

const StripeCardForm = ({ amount, orderId, onSuccess }: { amount: number; orderId: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: Math.round(amount * 100),
            metadata: {
              order_id: orderId,
              type: "guest_order",
            },
          },
        }
      );

      if (paymentError) throw paymentError;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Élément de carte introuvable");

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent?.status === "succeeded") {
        // Update order
        await supabase
          .from("guest_orders")
          .update({
            paye: true,
            payment_intent_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
            status: "paye",
          })
          .eq("id", orderId);

        toast({
          title: "✅ Paiement accepté !",
          description: "Votre paiement a été validé avec succès.",
          variant: "success" as any,
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "❌ Paiement refusé",
        description: error.message || "Votre paiement n'a pas pu être traité.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-background">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": {
                  color: "hsl(var(--muted-foreground))",
                },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        size="lg"
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Payer {formatPrice(amount)} €
          </>
        )}
      </Button>
    </form>
  );
};

export const PaymentMethods = ({ amount, orderId, trackingNumber, onPaymentSuccess }: PaymentMethodsProps) => {
  const [isPaid, setIsPaid] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initStripe = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-stripe-key');
        if (error) throw error;
        if (data?.publishableKey) {
          // Payment methods component uses Stripe 2 (carte grise fees)
          setStripePromise(loadStripe(data.publishableKey2 || data.publishableKey));
        }
      } catch (error) {
        console.error("Error loading Stripe:", error);
      }
    };
    initStripe();
  }, []);

  const handlePaymentSuccess = async () => {
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

      setIsPaid(true);
      onPaymentSuccess();
      
      toast({
        title: "Paiement réussi",
        description: "Votre commande a été payée avec succès",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la commande",
        variant: "destructive",
      });
    }
  };

  const handleInternalSuccess = () => {
    setIsPaid(true);
    onPaymentSuccess();
  };

  const handleWalletError = (error: string) => {
    toast({
      title: "❌ Paiement refusé",
      description: error,
      variant: "destructive",
    });
  };

  if (isPaid) {
    return (
      <Card className="border-green-500/50 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold text-lg">Paiement accepté ✔</p>
              <p className="text-sm">Merci ! Vous pouvez maintenant déposer vos documents.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {stripePromise && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Paiement rapide</h3>
            <Elements stripe={stripePromise}>
              <StripeWalletPayment
                amount={amount}
                onSuccess={handleInternalSuccess}
                onError={handleWalletError}
                metadata={{ 
                  order_id: orderId, 
                  type: "guest_order",
                  tracking_number: trackingNumber || ""
                }}
              />
            </Elements>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Carte bancaire</h3>
          {!showCardForm ? (
            <Button
              onClick={() => setShowCardForm(true)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Payer par carte ({formatPrice(amount)} €)
            </Button>
          ) : stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripeCardForm 
                amount={amount} 
                orderId={orderId} 
                onSuccess={handleInternalSuccess}
              />
            </Elements>
          ) : (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          🔒 Tous les paiements sont sécurisés et cryptés
        </p>
      </CardContent>
    </Card>
  );
};
