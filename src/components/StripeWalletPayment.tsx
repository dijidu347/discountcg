import { useEffect, useState, useRef, useMemo } from "react";
import { PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StripeWalletPaymentProps {
  amount: number;
  onSuccess: () => void;
  onError?: (error: string) => void;
  metadata?: Record<string, string>;
  demarcheId?: string;
}

export const StripeWalletPayment = ({ amount, onSuccess, onError, metadata, demarcheId }: StripeWalletPaymentProps) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [showNotAvailable, setShowNotAvailable] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const hasCreatedIntent = useRef(false);
  const paymentRequestRef = useRef<any>(null);

  // Stable metadata string for dependency
  const metadataString = useMemo(() => JSON.stringify(metadata || {}), [metadata]);
  const amountInCents = useMemo(() => Math.round(amount * 100), [amount]);

  // Create payment intent on mount - only once
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (hasCreatedIntent.current || isCreatingIntent || clientSecret) return;
      
      hasCreatedIntent.current = true;
      setIsCreatingIntent(true);
      
      try {
        console.log("[StripeWallet] Creating payment intent:", { amountInCents, demarcheId, metadata });
        
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: {
            amount: amountInCents,
            metadata: metadata || {},
            demarcheId: demarcheId || undefined,
          },
        });

        if (error) {
          console.error("[StripeWallet] Error creating payment intent:", error);
          throw error;
        }
        
        if (data?.clientSecret) {
          console.log("[StripeWallet] Payment intent created successfully");
          setClientSecret(data.clientSecret);
        } else {
          console.error("[StripeWallet] No client secret returned");
          throw new Error("No client secret returned");
        }
      } catch (err: any) {
        console.error("[StripeWallet] Error creating payment intent:", err);
        hasCreatedIntent.current = false; // Allow retry
        onError?.(err.message || "Erreur lors de la création du paiement");
      } finally {
        setIsCreatingIntent(false);
      }
    };

    createPaymentIntent();
  }, [amountInCents, metadataString, demarcheId]);

  // Setup PaymentRequest when stripe and clientSecret are ready
  useEffect(() => {
    if (!stripe || !clientSecret) return;
    
    // Don't recreate if already exists
    if (paymentRequestRef.current) return;

    console.log("[StripeWallet] Setting up PaymentRequest with amount:", amountInCents);

    const pr = stripe.paymentRequest({
      country: "FR",
      currency: "eur",
      total: {
        label: "Total",
        amount: amountInCents,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    paymentRequestRef.current = pr;

    pr.canMakePayment().then((result) => {
      console.log("[StripeWallet] canMakePayment result:", result);
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      } else {
        setShowNotAvailable(true);
      }
    });

    pr.on("paymentmethod", async (e) => {
      console.log("[StripeWallet] Payment method received:", e.paymentMethod.id);
      
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
          console.error("[StripeWallet] Payment confirmation error:", error);
          e.complete("fail");
          onError?.(error.message || "Erreur lors du paiement");
          return;
        }

        if (paymentIntent?.status === "requires_action") {
          console.log("[StripeWallet] Payment requires action");
          const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
          if (confirmError) {
            console.error("[StripeWallet] Payment action error:", confirmError);
            e.complete("fail");
            onError?.(confirmError.message || "Authentification requise échouée");
            return;
          }
        }

        // Payment succeeded
        e.complete("success");
        console.log("[StripeWallet] Payment succeeded:", paymentIntent?.id);
        onSuccess();
      } catch (err: any) {
        console.error("[StripeWallet] Payment error:", err);
        e.complete("fail");
        onError?.(err.message || "Erreur lors du paiement");
      }
    });

    return () => {
      // Cleanup
      if (paymentRequestRef.current) {
        paymentRequestRef.current.off("paymentmethod");
      }
    };
  }, [stripe, clientSecret, amountInCents, onSuccess, onError]);

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