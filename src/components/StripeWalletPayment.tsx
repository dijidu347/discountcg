import { useEffect, useState } from "react";
import { PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StripeWalletPaymentProps {
  amount: number;
  onSuccess: () => void;
  onError?: (error: string) => void;
  metadata?: Record<string, string>;
}

export const StripeWalletPayment = ({ amount, onSuccess, onError, metadata }: StripeWalletPaymentProps) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [showNotAvailable, setShowNotAvailable] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  // Create payment intent on mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (isCreatingIntent || clientSecret) return;
      
      setIsCreatingIntent(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: {
            amount: Math.round(amount * 100),
            metadata: metadata || {},
          },
        });

        if (error) throw error;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      } catch (err) {
        console.error("Error creating payment intent for wallet:", err);
      } finally {
        setIsCreatingIntent(false);
      }
    };

    createPaymentIntent();
  }, [amount, metadata]);

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const pr = stripe.paymentRequest({
      country: "FR",
      currency: "eur",
      total: {
        label: "Total",
        amount: Math.round(amount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      } else {
        setShowNotAvailable(true);
      }
    });

    pr.on("paymentmethod", async (e) => {
      try {
        // Confirm the payment with Stripe using the clientSecret
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: e.paymentMethod.id,
          },
          { handleActions: false }
        );

        if (error) {
          // Report to the browser that the payment failed
          e.complete("fail");
          console.error("Payment confirmation error:", error);
          onError?.(error.message || "Erreur lors du paiement");
          return;
        }

        if (paymentIntent?.status === "requires_action") {
          // If additional authentication is required
          const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
          if (confirmError) {
            e.complete("fail");
            console.error("Payment action error:", confirmError);
            onError?.(confirmError.message || "Authentification requise échouée");
            return;
          }
        }

        // Payment succeeded
        e.complete("success");
        console.log("Apple Pay / Google Pay payment succeeded:", paymentIntent?.id);
        onSuccess();
      } catch (err: any) {
        e.complete("fail");
        console.error("Payment error:", err);
        onError?.(err.message || "Erreur lors du paiement");
      }
    });

    return () => {
      // Cleanup - remove event listener
      pr.off("paymentmethod");
    };
  }, [stripe, amount, clientSecret, onSuccess, onError]);

  if (isCreatingIntent) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canMakePayment && showNotAvailable) {
    return (
      <Alert className="bg-muted/50 border-muted">
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Apple Pay / Google Pay n'est pas disponible sur cet appareil ou ce navigateur.
          Veuillez utiliser Safari sur iOS avec Apple Pay configuré, ou Chrome sur Android avec Google Pay.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canMakePayment || !clientSecret) {
    return null;
  }

  return (
    <div className="w-full">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              theme: "dark",
              height: "48px",
              type: "default",
            },
          },
        }}
      />
    </div>
  );
};
