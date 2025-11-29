import { useEffect, useState, useRef, useMemo } from "react";
import { PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StripeWalletPaymentProps {
  amount: number;
  onSuccess: () => void;
  onError?: (error: string) => void;
  // Either pass clientSecret directly OR pass metadata to create a new payment intent
  clientSecret?: string;
  metadata?: Record<string, string>;
  demarcheId?: string;
}

export const StripeWalletPayment = ({ 
  amount, 
  onSuccess, 
  onError, 
  clientSecret: providedClientSecret,
  metadata, 
  demarcheId 
}: StripeWalletPaymentProps) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [showNotAvailable, setShowNotAvailable] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(providedClientSecret || null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const hasCreatedIntent = useRef(false);
  const paymentRequestRef = useRef<any>(null);

  const amountInCents = useMemo(() => Math.round(amount * 100), [amount]);

  // Create payment intent if not provided
  useEffect(() => {
    // If clientSecret was provided as prop, use it
    if (providedClientSecret) {
      setClientSecret(providedClientSecret);
      return;
    }

    // Don't create if already created or in progress
    if (hasCreatedIntent.current || isCreatingIntent || clientSecret) return;
    
    const createPaymentIntent = async () => {
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
        hasCreatedIntent.current = false;
        onError?.(err.message || "Erreur lors de la création du paiement");
      } finally {
        setIsCreatingIntent(false);
      }
    };

    createPaymentIntent();
  }, [providedClientSecret, amountInCents, metadata, demarcheId, isCreatingIntent, clientSecret, onError]);

  // Setup PaymentRequest when stripe and clientSecret are ready
  useEffect(() => {
    if (!stripe || !clientSecret) {
      console.log("[StripeWallet] Waiting for stripe or clientSecret", { stripe: !!stripe, clientSecret: !!clientSecret });
      return;
    }
    
    // Don't recreate if already exists
    if (paymentRequestRef.current) {
      console.log("[StripeWallet] PaymentRequest already exists");
      return;
    }

    console.log("[StripeWallet] Setting up PaymentRequest with amount:", amountInCents);
    console.log("[StripeWallet] Current origin:", window.location.origin);

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
      console.log("[StripeWallet] Available wallets:", {
        applePay: result?.applePay,
        googlePay: result?.googlePay,
        link: result?.link,
      });
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      } else {
        console.log("[StripeWallet] No payment methods available - this is normal in preview/localhost or if wallets are not configured");
        setShowNotAvailable(true);
      }
    }).catch((err) => {
      console.error("[StripeWallet] canMakePayment error:", err);
      setShowNotAvailable(true);
    });

    pr.on("paymentmethod", async (e) => {
      console.log("[StripeWallet] Payment method received:", e.paymentMethod.id);
      console.log("[StripeWallet] Payment method type:", e.paymentMethod.type);
      console.log("[StripeWallet] Using clientSecret:", clientSecret ? "yes" : "no");
      
      try {
        // Use confirmPayment for wallet payments (Google Pay, Apple Pay)
        // This works with automatic_payment_methods enabled on the payment intent
        const { error, paymentIntent } = await stripe.confirmPayment({
          clientSecret: clientSecret,
          confirmParams: {
            payment_method: e.paymentMethod.id,
            return_url: `${window.location.origin}/paiement-succes`,
          },
          redirect: "if_required",
        });

        if (error) {
          console.error("[StripeWallet] Payment confirmation error:", error);
          console.error("[StripeWallet] Error type:", error.type);
          console.error("[StripeWallet] Error code:", error.code);
          e.complete("fail");
          onError?.(error.message || "Erreur lors du paiement");
          return;
        }

        if (paymentIntent?.status === "requires_action") {
          console.log("[StripeWallet] Payment requires action, handling...");
          e.complete("fail");
          onError?.("Authentification supplémentaire requise. Veuillez utiliser le paiement par carte.");
          return;
        } else if (paymentIntent?.status === "succeeded") {
          e.complete("success");
          console.log("[StripeWallet] Payment succeeded:", paymentIntent.id);
          onSuccess();
        } else {
          console.log("[StripeWallet] Unexpected payment status:", paymentIntent?.status);
          e.complete("fail");
          onError?.("Le paiement n'a pas pu être complété");
        }
      } catch (err: any) {
        console.error("[StripeWallet] Payment error:", err);
        console.error("[StripeWallet] Error details:", JSON.stringify(err));
        e.complete("fail");
        onError?.(err.message || "Erreur lors du paiement");
      }
    });

    return () => {
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
